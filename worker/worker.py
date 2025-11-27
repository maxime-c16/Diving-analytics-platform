"""
Diving Analytics Worker Service
Handles PDF OCR processing and text extraction for diving competition results.
"""

import os
import re
import json
import time
import logging
import tempfile
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, asdict
from io import BytesIO

import redis
import requests
from celery import Celery
from PIL import Image
import pytesseract
from pdf2image import convert_from_bytes, convert_from_path

# Import OCR correction utilities
from ocr_corrections import (
    EXTENDED_OCR_CORRECTIONS,
    correct_dive_code,
    correct_french_decimal,
    correct_difficulty_ocr,
    correct_judge_score_ocr,
    apply_all_corrections
)

# Import validation utilities
from validation import (
    validate_dive_code,
    validate_judge_score,
    validate_judge_scores,
    validate_difficulty,
    validate_final_score,
    calculate_dive_score
)

# Configure logging
logging.basicConfig(
	level=logging.INFO,
	format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Redis and Celery configuration
REDIS_URL = os.getenv('REDIS_URL', 'redis://redis:6379/0')
API_BASE_URL = os.getenv('API_BASE_URL', 'http://api-service:3000')

# Initialize Celery
celery_app = Celery('diving_worker', broker=REDIS_URL, backend=REDIS_URL)
celery_app.conf.update(
	task_serializer='json',
	accept_content=['json'],
	result_serializer='json',
	timezone='UTC',
	enable_utc=True,
	task_track_started=True,
	task_time_limit=300,  # 5 minutes max per task
)

# Initialize Redis client
redis_client = redis.from_url(REDIS_URL)


def normalize_athlete_name(name: str) -> str:
	"""Normalize athlete name handling French accents consistently.
	
	Preserves French accents (é, è, ê, à, ô, etc.) while normalizing format.
	
	Args:
		name: Raw athlete name
	
	Returns:
		Normalized name in "Firstname Lastname" format
	
	Examples:
		>>> normalize_athlete_name("THÉRY Amélie")
		"Amélie Théry"
		>>> normalize_athlete_name("amélie THÉRY")
		"Amélie Théry"
	"""
	if not name:
		return name
	
	# Split and normalize each part
	parts = name.strip().split()
	normalized_parts = []
	
	for part in parts:
		if not part:
			continue
		# Check if all uppercase (likely lastname)
		if part.isupper():
			# Title case but preserve accents
			normalized = part[0].upper() + part[1:].lower()
		else:
			# Already mixed case, just ensure first letter is uppercase
			normalized = part[0].upper() + part[1:]
		normalized_parts.append(normalized)
	
	return ' '.join(normalized_parts)


@dataclass
class ExtractedDive:
	"""Represents a single dive extracted from PDF"""
	athlete_name: str
	dive_code: str
	round_number: int = 1
	judge_scores: List[float] = None
	difficulty: Optional[float] = None
	final_score: Optional[float] = None
	rank: Optional[int] = None
	country: Optional[str] = None
	event_name: Optional[str] = None  # Event within competition (e.g., "Elite - Dames - 3m")
	height: Optional[str] = None  # Detected height (1m, 3m, 5m, 7.5m, 10m)


def extract_height_from_event(event_name: Optional[str]) -> Optional[str]:
	"""Extract diving height from event name string.
	
	Examples:
	- "Elite - Dames - 3m" -> "3m"
	- "Jeunes - Garçons Minimes B - 1m" -> "1m"
	- "Elite - Messieurs - HV" -> "10m" (Haut Vol = Platform)
	- "10m Platform" -> "10m"
	"""
	if not event_name:
		return None
	
	# Look for explicit height patterns
	height_match = re.search(r'\b(1m|3m|5m|7\.5m|10m)\b', event_name, re.IGNORECASE)
	if height_match:
		return height_match.group(1).lower()
	
	# HV = Haut Vol = High platform (typically 10m)
	if re.search(r'\bHV\b|\bhaut[\s-]*vol\b', event_name, re.IGNORECASE):
		return '10m'
	
	# Platform generally means 10m
	if re.search(r'\bplatform\b|\bplateforme\b', event_name, re.IGNORECASE):
		return '10m'
	
	# Tremplin/Springboard - try to determine 1m or 3m from context
	if re.search(r'\btremplin\b|\bspringboard\b', event_name, re.IGNORECASE):
		if '1' in event_name:
			return '1m'
		return '3m'  # Default springboard to 3m
	
	return None


@dataclass
class ExtractionResult:
	"""Result of PDF text extraction"""
	success: bool
	competition_name: Optional[str] = None
	event_type: Optional[str] = None
	date: Optional[str] = None
	location: Optional[str] = None
	dives: List[ExtractedDive] = None
	raw_text: str = ""
	errors: List[str] = None
	confidence: float = 0.0


class DivingPDFParser:
	"""Parser for extracting diving competition results from OCR text.
	
	Supports multiple PDF formats including:
	- FINA/World Aquatics official result sheets
	- French Federation (FFN) competition results
	- European competition formats
	- Generic tabular diving results
	"""
	
	# Common diving result patterns
	# Diving code pattern - matches valid dive codes like 101A, 5211A, etc.
	# Structure: 3-4 digits (group + somersaults + twists) followed by position letter A-D
	# Also need to handle OCR errors where A is read as 4 (e.g., 5211A -> 52114)
	# Valid patterns: XYZ[A-D] or XYZW[A-D] where X is 1-6
	DIVE_CODE_PATTERN = r'\b([1-6]\d{2,3}[A-Da-d])\b'
	
	# OCR error pattern for cases where trailing A is read as 4
	# Matches 4-5 digit codes that end in a digit (potential OCR error)
	DIVE_CODE_PATTERN_OCR_ERROR = r'\b([1-6]\d{2,3}[1-4])\b'
	
	# Map of OCR error corrections for dive code endings
	OCR_ERROR_CORRECTIONS = {
		'1': 'A',  # 1 often misread as A
		'2': 'B',  # 2 sometimes misread as B  
		'3': 'C',  # 3 sometimes misread as C
		'4': 'A',  # 4 often misread as A (especially 5211A -> 52114)
		'8': 'B',  # 8 often misread as B (e.g., 101B -> 1018)
		'0': 'D',  # 0 sometimes misread as D
		'%': '½',  # Percent sign misread as half symbol (for judge scores)
	}
	
	# Trailing artifacts to strip from dive codes
	TRAILING_ARTIFACTS = ['_', '.', ',', '-', '—', '–', "'", '"', '`', ' ']
	
	def _correct_dive_code_ocr(self, code: str) -> str:
		"""Correct common OCR errors in dive codes.
		
		Dive codes have format: 3-4 digits followed by A, B, C, or D
		E.g., 101A, 5211A, 301B, 403C, 612B
		First digit must be 1-6 (dive group)
		
		Common OCR errors:
		- 5211A -> 52114 (A looks like 4)
		- 101B -> 1018 (B looks like 8)
		- 101A -> 1014
		- 101C_ -> 101C (trailing artifacts)
		"""
		if not code:
			return code
		
		# Use the new correction module for comprehensive handling
		corrected, was_corrected, description = correct_dive_code(code)
		if was_corrected:
			logger.debug(f"OCR correction: {code} -> {corrected} ({description})")
		return corrected
	
	def _correct_dive_code_ocr_legacy(self, code: str) -> str:
		"""Legacy OCR correction method - kept for reference.
		
		This is the original implementation before using the ocr_corrections module.
		"""
		if not code:
			return code
		
		code = code.upper().strip()
		
		# Strip trailing artifacts
		for artifact in self.TRAILING_ARTIFACTS:
			if code.endswith(artifact):
				code = code[:-1]
		
		# First digit must be a valid dive group (1-6)
		if not code[0] in '123456':
			return code
		
		# If already ends with valid letter, return as-is
		if code[-1] in 'ABCD':
			return code
		
		# Check if it's a 5-digit code ending in digit (OCR error)
		# Valid dive codes are 3-4 digits, so 5 digits means the last is actually a letter
		if len(code) == 5 and code[-1] in '12348':
			# This is likely an OCR error - last digit should be a letter
			prefix = code[:-1]  # 4 digits
			suffix_digit = code[-1]
			corrected_letter = self.OCR_ERROR_CORRECTIONS.get(suffix_digit, 'A')
			return prefix + corrected_letter
		
		# 4-digit code ending in digit - could be 3-digit + OCR'd letter
		# e.g., 1014 might be 101A, 1018 might be 101B
		# But be careful not to match years like 1994, 2003, etc.
		if len(code) == 4 and code[-1] in '12348':
			# Check if this looks like a valid dive code pattern
			# Years typically start with 19 or 20, dive codes with first digit (group) 1-6
			# Exclude patterns that look like years
			if code[:2] in ('19', '20'):
				return code  # This is likely a year, not a dive code
			
			# Correct based on the last digit
			prefix = code[:-1]  # 3 digits
			suffix_digit = code[-1]
			corrected_letter = self.OCR_ERROR_CORRECTIONS.get(suffix_digit, suffix_digit)
			if corrected_letter in 'ABCD':
				return prefix + corrected_letter
		
		return code
	SCORE_PATTERN = r'\b(\d+\.?\d?)\b'
	# Updated to handle French names with accents and various formats
	ATHLETE_NAME_PATTERN = r'([A-ZÀ-ÿ][a-zà-ÿ]+(?:[-\s][A-ZÀ-ÿ][a-zà-ÿ]+)*)'
	COUNTRY_PATTERN = r'\b([A-Z]{3})\b'
	HEIGHT_PATTERN = r'\b(1m|3m|5m|7\.5m|10m|1M|3M|5M|10M|HV|hv)\b'
	
	# French club patterns (common French diving club names)
	FRENCH_CLUB_PATTERNS = [
		r'(?:CN|CSM|ASM|AC|SC|RC|US|SN|EN|ASPTT|ACBB|CNP|CNM)\s+[A-ZÀ-ÿa-zà-ÿ\s]+',
		r'(?:Plongeon|Natation|Aquatique|Club)\s+[A-ZÀ-ÿa-zà-ÿ\s]+',
		r'[A-ZÀ-ÿ][a-zà-ÿ]+\s+(?:Plongeon|Natation)',
	]
	
	# Competition header patterns (English and French)
	COMPETITION_PATTERNS = [
		r'(?:World|European|National|Olympic|Championship|Cup|Grand Prix)',
		r'(?:Diving|Platform|Springboard)',
		r'(?:Competition|Championships|Games|Event)',
		# French patterns
		r'(?:Championnat|Championnats)',
		r'(?:Coupe|Trophée|Meeting)',
		r'(?:Régional|National|Interrégional|IDF|Île-de-France)',
		r'(?:Hiver|Été|Printemps|Automne)',
		r'(?:Résultats|Classement)',
	]
	
	# French month names for date extraction
	FRENCH_MONTHS = {
		'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04',
		'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08',
		'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12'
	}
	
	# Dive code validation regex - matches valid dive codes
	# Format: Group (1-6) + Somersaults (0-4) + [Twists (0-4)] + [Extra (1-4)] + Position (A-D)
	DIVE_CODE_VALIDATION_REGEX = re.compile(r'^[1-6]\d{2,3}[A-D]$', re.IGNORECASE)
	
	@staticmethod
	def _parse_french_decimal(value: str) -> float:
		"""Parse French decimal format (comma as decimal separator) to float.
		
		French numbers use comma instead of period for decimals:
		- "6,5" → 6.5
		- "42,00" → 42.0
		- "1,5" → 1.5
		
		Args:
			value: String that may contain French decimal format
		
		Returns:
			Parsed float value, or 0.0 if parsing fails
		"""
		if not value:
			return 0.0
		
		value_str = str(value).strip()
		
		# Replace French comma with period
		value_str = value_str.replace(',', '.')
		
		try:
			return float(value_str)
		except ValueError:
			return 0.0
	
	def _validate_dive_code_format(self, code: str) -> bool:
		"""Validate that a dive code matches the expected format.
		
		Valid dive codes:
		- Start with digit 1-6 (dive group)
		- 2-3 more digits (somersaults, twists, extra)
		- End with A, B, C, or D (position)
		
		Examples: 101A, 5231D, 301B, 612B
		
		Args:
			code: Dive code to validate
		
		Returns:
			True if valid, False otherwise
		"""
		if not code:
			return False
		
		code = code.upper().strip()
		return bool(self.DIVE_CODE_VALIDATION_REGEX.match(code))
	
	def __init__(self):
		self.errors = []
		self.athlete_cache = {}  # Cache for athlete names across lines
	
	def parse_text(self, text: str) -> ExtractionResult:
		"""Parse OCR text and extract structured diving data"""
		self.errors = []
		self.athlete_cache = {}
		
		if not text or len(text.strip()) < 50:
			return ExtractionResult(
				success=False,
				errors=["Insufficient text extracted from PDF"],
				raw_text=text
			)
		
		# Extract competition metadata
		competition_name = self._extract_competition_name(text)
		event_type = self._extract_event_type(text)
		date = self._extract_date(text)
		location = self._extract_location(text)
		
		# First pass: identify athlete blocks
		self._identify_athletes(text)
		
		# Extract dives using multiple strategies
		dives = self._extract_dives_multi_strategy(text)
		
		# Post-process: clean up and validate dives
		dives = self._post_process_dives(dives)
		
		# Calculate confidence score
		confidence = self._calculate_confidence(competition_name, event_type, dives)
		
		return ExtractionResult(
			success=len(dives) > 0,
			competition_name=competition_name,
			event_type=event_type,
			date=date,
			location=location,
			dives=dives,
			raw_text=text[:5000],  # Limit raw text size
			errors=self.errors if self.errors else None,
			confidence=confidence
		)
	
	def _identify_athletes(self, text: str):
		"""Pre-scan text to identify athlete names and their associated data"""
		lines = text.split('\n')
		
		# Pattern for French-style result lines: "1 LASTNAME Firstname Club 123.45"
		# Also handles: "1. LASTNAME Firstname (2005) Club Name"
		athlete_line_pattern = re.compile(
			r'^\s*(\d{1,2})[\.\s]+([A-ZÀ-Ÿ]{2,}(?:[-\s][A-ZÀ-Ÿ]+)*)\s+([A-ZÀ-ÿ][a-zà-ÿ]+(?:[-\s][A-ZÀ-ÿ][a-zà-ÿ]+)*)',
			re.UNICODE
		)
		
		for i, line in enumerate(lines):
			line = line.strip()
			match = athlete_line_pattern.match(line)
			if match:
				rank = int(match.group(1))
				lastname = match.group(2).title()  # DUPONT -> Dupont
				firstname = match.group(3)
				full_name = f"{firstname} {lastname}"
				
				# Store in cache with line number
				self.athlete_cache[i] = {
					'name': full_name,
					'rank': rank,
					'raw_line': line
				}
	
	def _extract_competition_name(self, text: str) -> Optional[str]:
		"""Extract competition name from text (supports English and French)"""
		lines = text.split('\n')[:30]  # Check first 30 lines
		
		for line in lines:
			line = line.strip()
			if len(line) < 5:
				continue
				
			# Look for common competition keywords
			for pattern in self.COMPETITION_PATTERNS:
				if re.search(pattern, line, re.IGNORECASE):
					# Clean up the line
					cleaned = re.sub(r'[^\w\s\-àâäéèêëïîôùûüç]', '', line, flags=re.UNICODE).strip()
					if len(cleaned) > 10:
						return cleaned[:150]
		
		# Try to find title-like lines (often in caps at the beginning)
		for line in lines[:10]:
			line = line.strip()
			# Check if line is mostly uppercase (title)
			if len(line) > 15 and sum(1 for c in line if c.isupper()) > len(line) * 0.5:
				cleaned = re.sub(r'[^\w\s\-àâäéèêëïîôùûüç]', '', line, flags=re.UNICODE).strip()
				if len(cleaned) > 10:
					return cleaned[:150]
		
		return None
	
	def _extract_event_type(self, text: str) -> Optional[str]:
		"""Extract event type (1m, 3m, 10m, HV, etc.)"""
		# Look for height pattern
		match = re.search(self.HEIGHT_PATTERN, text, re.IGNORECASE)
		if match:
			height = match.group(1).lower()
			# Normalize to standard format
			if height in ['1m', '3m', '5m', '10m']:
				return height
			elif height == '7.5m':
				return '7.5m'
			elif height == 'hv':
				# Haut Vol (HV) indicates a mixed platform event (5m, 7.5m and 10m)
				return 'HV (5m/7.5m/10m)'
		
		# Check for French platform indicators
		if re.search(r'haut[\s-]*vol|plateforme|platform', text, re.IGNORECASE):
			return '10m'
		if re.search(r'tremplin|springboard', text, re.IGNORECASE):
			# Try to determine 1m or 3m
			if re.search(r'\b1\s*m(?:etre|ètre)?\b', text, re.IGNORECASE):
				return '1m'
			return '3m'  # Default springboard to 3m
		
		return '3m'  # Default to 3m springboard
	
	def _extract_date(self, text: str) -> Optional[str]:
		"""Extract competition date (supports English and French formats)"""
		# French date patterns
		french_date_patterns = [
			r'(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})',
			r'(\d{1,2})\s+(janv|févr?|mars|avr|mai|juin|juil|août|sept?|oct|nov|déc)\.?\s+(\d{4})',
		]
		
		for pattern in french_date_patterns:
			match = re.search(pattern, text, re.IGNORECASE)
			if match:
				day = match.group(1)
				month = match.group(2).lower()
				year = match.group(3)
				# Return in readable format
				return f"{day} {month} {year}"
		
		# English/standard date patterns
		date_patterns = [
			r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
			r'(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})',
			r'((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})',
		]
		
		for pattern in date_patterns:
			match = re.search(pattern, text, re.IGNORECASE)
			if match:
				return match.group(1)
		
		return None
	
	def _extract_location(self, text: str) -> Optional[str]:
		"""Extract competition location"""
		lines = text.split('\n')[:20]
		
		# Common location indicators (English and French)
		location_keywords = [
			'venue', 'location', 'pool', 'aquatic', 'center', 'centre',
			'piscine', 'stade', 'complexe', 'lieu'
		]
		
		# French city patterns
		french_cities = [
			'paris', 'lyon', 'marseille', 'toulouse', 'nice', 'nantes',
			'montpellier', 'strasbourg', 'bordeaux', 'lille', 'rennes',
			'montreuil', 'saint-denis', "saint-maur-des-fossés"
		]
		
		for line in lines:
			line_lower = line.lower()
			
			# Check for location keywords
			for keyword in location_keywords:
				if keyword in line_lower:
					cleaned = re.sub(r'[^\w\s,\-àâäéèêëïîôùûüç]', '', line, flags=re.UNICODE).strip()
					if len(cleaned) > 5:
						return cleaned[:100]
			
			# Check for known French cities
			for city in french_cities:
				if city in line_lower:
					cleaned = re.sub(r'[^\w\s,\-àâäéèêëïîôùûüç]', '', line, flags=re.UNICODE).strip()
					if len(cleaned) > 5:
						return cleaned[:100]
		
		return None
	
	def _extract_dives_multi_strategy(self, text: str) -> List[ExtractedDive]:
		"""Extract dives using multiple parsing strategies"""
		all_dives = []
		
		# Strategy 1: Parse FFN (French Federation) block format
		ffn_dives = self._parse_ffn_block_format(text)
		if ffn_dives:
			all_dives.extend(ffn_dives)
		
		# Strategy 2: Parse French-style tabular format
		if not ffn_dives:
			french_dives = self._parse_french_format(text)
			all_dives.extend(french_dives)
		
		# Strategy 3: Parse standard line-by-line format
		if not all_dives:
			standard_dives = self._extract_dives_standard(text)
			all_dives.extend(standard_dives)
		
		# Strategy 4: Parse table structure (for scanned tables)
		if len(all_dives) < 5:
			table_dives = self._parse_table_structure(text)
			# Only add if we found significantly more dives
			if len(table_dives) > len(all_dives):
				all_dives = table_dives
		
		return all_dives
	
	def _parse_ffn_block_format(self, text: str) -> List[ExtractedDive]:
		"""Parse FFN (French Federation of Swimming) diving result format.
		
		FFN PDFs typically have this structure:
		
		Rank. LASTNAME Firstname (Year) Club Name             Total Points
		
		Round 1:
		DiveCode  DD  Description              J1  J2  J3  J4  J5  Pts  Pen
		101B      1.3 plongeon ordinaire avant 6.5 7.0 6.5 7.0 6.5 26.00
		...
		
		Round 2:
		...
		"""
		dives = []
		lines = text.split('\n')
		
		current_athlete = None
		current_rank = None
		current_club = None
		current_round = 1
		current_event = None  # Track current event (e.g., "Elite - Dames - 3m")
		athlete_dive_count = 0  # Track dive number per athlete
		
		# French dive description words to filter out
		french_dive_words = {
			'plongeon', 'ordinaire', 'avant', 'arrière', 'retourné', 
			'renversé', 'tire-bouchon', 'équilibre', 'vrille', 'vrilles',
			'avec', 'sans', 'élan', 'carpé', 'groupé', 'tendu',
			'droit', 'position', 'libre', 'saut', 'périlleux'
		}
		
		# Pattern for event headers (category lines)
		# Examples: "Elite - Dames - 3m", "Jeunes - Garçons Minimes B - 3m", "Elite - Messieurs - HV"
		event_pattern = re.compile(
			r'^((?:Elite|Jeunes|Junior|Senior|Master|Catégorie|Open)[\s\-]+(?:[A-Za-zÀ-ÿ\s\-]+)[\s\-]+(?:3m|1m|HV|10m|Tremplin|Haut-Vol|Synchro))',
			re.IGNORECASE | re.UNICODE
		)
		
		# Pattern for athlete line in FFN/DiveRecorder format:
		# Format 1: "1 Camille ROUFFIAC (2011) -- Kingfisher Club Plongeon Montr"
		# Format 2: "1. DUPONT Marie (2005) CN Paris 245.30"
		# Format 3: "LASTNAME Firstname (2005) - Club Name"
		athlete_patterns = [
			# NEW: "1 Firstname LASTNAME (2005) -- Club Name" (DiveRecorder format)
			re.compile(
				r'^\s*(\d{1,2})\s+([A-ZÀ-ÿ][a-zà-ÿ]+(?:[-\s][A-ZÀ-ÿ][a-zà-ÿ]+)*)\s+([A-ZÀ-Ÿ]{2,}(?:[-\s][A-ZÀ-Ÿ]+)*)\s*\((\d{4})\)\s*[-–]+\s*(.+?)\s*$',
				re.UNICODE
			),
			# "1. LASTNAME Firstname (2005) Club Name 245.30"
			re.compile(
				r'^\s*(\d{1,2})[\.\s]+([A-ZÀ-Ÿ]{2,}(?:[-\s][A-ZÀ-Ÿ]+)*)\s+([A-ZÀ-ÿ][a-zà-ÿ]+(?:[-\s][A-ZÀ-ÿ][a-zà-ÿ]+)*)\s*(?:\((\d{4})\))?\s*(.+?)?\s*(\d+[\.,]\d+)?\s*$',
				re.UNICODE
			),
			# "LASTNAME Firstname (2005) - Club Name"
			re.compile(
				r'^\s*([A-ZÀ-Ÿ]{2,}(?:[-\s][A-ZÀ-Ÿ]+)*)\s+([A-ZÀ-ÿ][a-zà-ÿ]+(?:[-\s][A-ZÀ-ÿ][a-zà-ÿ]+)*)\s*(?:\((\d{4})\))?\s*[-–]?\s*(.+)?$',
				re.UNICODE
			),
		]
		
		# Pattern for dive line:
		# "101B 1.3 plongeon ordinaire avant 6.5 7.0 6.5 7.0 6.5 26.00"
		# The key is: DiveCode DD (optional description) Scores... FinalScore
		
		for i, line in enumerate(lines):
			line = line.strip()
			if not line or len(line) < 5:
				continue
			
			# Skip lines that are just dive descriptions
			line_words = set(line.lower().split())
			if line_words.issubset(french_dive_words) or len(line_words.intersection(french_dive_words)) > 2:
				if not re.search(r'\d{3,4}[A-Da-d]', line):
					continue
			
			# Check for event header (e.g., "Elite - Dames - 3m", "Jeunes - Garçons Minimes B - 3m")
			event_match = event_pattern.match(line)
			if event_match:
				current_event = event_match.group(1).strip()
				current_round = 1
				athlete_dive_count = 0
				current_athlete = None  # Reset athlete for new event
				continue
			
			# Check for round/tour indicator - be careful not to match "Plongeon N" (dive number in listing)
			# Valid patterns: "Tour 1", "Round 1", "Manche 1", "1er Tour", "2ème Tour"
			round_match = re.search(r'(?:Round|Rd\.?|Tour|Manche)\s*[:\s]*(\d+)', line, re.IGNORECASE)
			if round_match:
				potential_round = int(round_match.group(1))
				# Rounds are typically 1-6, not higher
				if potential_round <= 10:
					current_round = potential_round
					continue
			
			# Also check for French ordinal round format: "1er Tour", "2ème Tour"
			ordinal_match = re.search(r'(\d+)(?:er|ère|ème|e)\s*(?:Tour|Manche)', line, re.IGNORECASE)
			if ordinal_match:
				current_round = int(ordinal_match.group(1))
				continue
			
			# Also check for "Série" or category headers (fallback for event detection)
			if re.search(r'^(Série|Catégorie|Épreuve|Finale|Demi-finale|Préliminaire)', line, re.IGNORECASE):
				current_round = 1  # Reset round for new event
				athlete_dive_count = 0  # Reset dive count for new event
				continue
			
			# Try to match athlete header
			for pattern_idx, pattern in enumerate(athlete_patterns):
				match = pattern.match(line)
				if match:
					groups = match.groups()
					if len(groups) >= 3:
						# Check if first group is a rank number
						if groups[0] and groups[0].isdigit():
							current_rank = int(groups[0])
							
							# Pattern 0 (DiveRecorder): "1 Firstname LASTNAME (2005) -- Club"
							# Pattern 1 (FFN): "1. LASTNAME Firstname (2005) Club"
							if pattern_idx == 0:
								# DiveRecorder: groups[1]=firstname, groups[2]=lastname
								firstname = groups[1] if groups[1] else None
								lastname = groups[2].title() if groups[2] else None
							else:
								# FFN: groups[1]=lastname, groups[2]=firstname
								lastname = groups[1].title() if groups[1] else None
								firstname = groups[2] if groups[2] else None
							
							if firstname and lastname:
								current_athlete = f"{firstname} {lastname}"
								athlete_dive_count = 0  # Reset dive count for new athlete
							
							# Club in groups[4]
							if len(groups) > 4 and groups[4]:
								current_club = groups[4].strip()[:50]
						else:
							# No rank, first two groups are name parts (LASTNAME Firstname)
							lastname = groups[0].title() if groups[0] else None
							firstname = groups[1] if groups[1] else None
							if firstname and lastname:
								current_athlete = f"{firstname} {lastname}"
								athlete_dive_count = 0  # Reset dive count for new athlete
							if len(groups) > 3 and groups[3]:
								current_club = groups[3].strip()[:50]
					break
			
			# Try to extract dive from line
			dive = self._parse_ffn_dive_line(line, current_round, current_athlete, current_rank, current_club, french_dive_words, athlete_dive_count, current_event)
			if dive:
				dives.append(dive)
				athlete_dive_count += 1  # Increment dive count for this athlete
				# Keep the current athlete for subsequent dives
		
		return dives
	
	def _parse_ffn_dive_line(
		self, 
		line: str, 
		round_number: int, 
		current_athlete: Optional[str],
		current_rank: Optional[int],
		current_club: Optional[str],
		french_dive_words: set,
		athlete_dive_count: int = 0,
		current_event: Optional[str] = None
	) -> Optional[ExtractedDive]:
		"""Parse a single FFN dive line.
		
		Format: "101B 1.3 plongeon ordinaire avant 6.5 7.0 6.5 7.0 6.5 26.00"
		Or: "101B 1.3 6.5 7.0 6.5 7.0 6.5 26.00"
		"""
		# Must have a dive code - try normal pattern first, then OCR error pattern
		dive_match = re.search(self.DIVE_CODE_PATTERN, line)
		if not dive_match:
			# Try OCR error pattern (e.g., 52114 instead of 5211A)
			dive_match = re.search(self.DIVE_CODE_PATTERN_OCR_ERROR, line)
		if not dive_match:
			return None
		
		dive_code = dive_match.group(1).upper()
		# Correct common OCR errors (e.g., 52114 -> 5211A)
		dive_code = self._correct_dive_code_ocr(dive_code)
		
		# Validate dive code format after correction
		if not self._validate_dive_code_format(dive_code):
			logger.debug(f"Invalid dive code format after correction: {dive_code}")
			return None
		
		# Get everything after the dive code
		post_dive = line[dive_match.end():].strip()
		
		# Remove French dive description words
		cleaned_post = post_dive
		for word in french_dive_words:
			cleaned_post = re.sub(rf'\b{word}\b', '', cleaned_post, flags=re.IGNORECASE)
		
		# Extract all numbers using French decimal parser
		numbers = re.findall(r'(\d+[\.,]?\d*)', cleaned_post)
		numbers = [self._parse_french_decimal(n) for n in numbers if n]
		
		if not numbers:
			return None
		
		# PDF format: Height Coef J1 J2 J3 J4 J5 J6 J7 Cumul Points Points [Pen]
		# Example: 3 1,5 5,0 4,5 4,5 4,0 5,5 14,0 21,00 21,00
		# Heights are: 1, 3, 5, 7.5, 10 (whole numbers or 7.5)
		# DD (Coef) is: 1.0-4.5 range with 0.1 precision
		
		difficulty = None
		judge_scores = []
		final_score = None
		parsed_height = None
		
		def is_valid_judge_score_local(n: float) -> bool:
			"""Judge scores must be 0-10 in 0.5 increments - using validation module"""
			is_valid, _ = validate_judge_score(n)
			return is_valid
		
		def is_diving_height(n: float) -> bool:
			"""Diving heights are 1, 3, 5, 7.5, or 10"""
			return n in [1, 1.0, 3, 3.0, 5, 5.0, 7.5, 10, 10.0]
		
		def is_likely_difficulty_local(n: float) -> bool:
			"""DD is typically 1.0-4.5 range - using validation module"""
			is_valid, _ = validate_difficulty(n)
			return is_valid
		
		def is_likely_final_score(n: float) -> bool:
			"""Final scores are typically > 10 and < 200"""
			is_valid, _ = validate_final_score(n)
			return is_valid and n > 10
		
		# Parse the number sequence:
		# First number could be height (1, 3, 5, 7.5, 10) or DD
		# If first number is a diving height, second number is DD
		remaining_numbers = numbers.copy()
		
		if len(numbers) >= 2:
			first_num = numbers[0]
			second_num = numbers[1]
			
			# Check if first number is a diving height
			if is_diving_height(first_num):
				parsed_height = first_num
				# Second number should be DD
				if is_likely_difficulty_local(second_num):
					difficulty = second_num
					remaining_numbers = numbers[2:]
				else:
					remaining_numbers = numbers[1:]
			elif is_likely_difficulty_local(first_num):
				# First number is DD (no height column in this format)
				difficulty = first_num
				remaining_numbers = numbers[1:]
		elif len(numbers) == 1:
			# Single number - could be DD or final score
			if is_likely_difficulty_local(numbers[0]):
				difficulty = numbers[0]
				remaining_numbers = []
			elif is_likely_final_score(numbers[0]):
				final_score = numbers[0]
				remaining_numbers = []
		
		# Separate judge scores (valid 0.5 increments) from final score (>10)
		for n in remaining_numbers:
			if is_valid_judge_score_local(n):
				judge_scores.append(n)
			elif is_likely_final_score(n) and final_score is None:
				final_score = n
		
		# Need at least some scores
		if not judge_scores and not final_score:
			return None
		
		# Validate judge scores using validation module
		if judge_scores:
			scores_valid, validation_errors = validate_judge_scores(judge_scores)
			if not scores_valid or len(judge_scores) not in [5, 7]:
				# Invalid judge scores or count - likely OCR error, discard
				logger.debug(f"Invalid judge scores for dive {dive_code}: {validation_errors}")
				judge_scores = []
		
		# Validate difficulty using validation module
		if difficulty is not None:
			dd_valid, dd_error = validate_difficulty(difficulty)
			if not dd_valid:
				logger.debug(f"Invalid difficulty {difficulty} for dive {dive_code}: {dd_error}")
				# Try to correct using OCR module
				corrected_dd, _, _ = correct_difficulty_ocr(str(difficulty))
				if corrected_dd > 0:
					difficulty = corrected_dd
		
		# Limit to max 7 judges (safety check)
		if len(judge_scores) > 7:
			judge_scores = judge_scores[:7]
		
		# Determine round number:
		# In diving, "round" typically means which dive number in the athlete's list
		# Use athlete_dive_count + 1 (first dive = dive 1, second = dive 2, etc.)
		# Only use explicit round_number if it was explicitly detected from text (not default)
		effective_round = athlete_dive_count + 1
		
		# Extract height from event name
		detected_height = extract_height_from_event(current_event)
		
		return ExtractedDive(
			athlete_name=current_athlete or "Unknown Athlete",
			dive_code=dive_code,
			round_number=effective_round,
			judge_scores=judge_scores if judge_scores else None,
			difficulty=difficulty,
			final_score=final_score,
			rank=current_rank,
			country=current_club,
			event_name=current_event,
			height=detected_height
		)
	
	def _extract_dives_standard(self, text: str) -> List[ExtractedDive]:
		"""Extract individual dive records using standard format"""
		dives = []
		lines = text.split('\n')
		
		current_round = 1
		
		for i, line in enumerate(lines):
			line = line.strip()
			if not line:
				continue
			
			# Check for round indicators
			round_match = re.search(r'(?:Round|Rd\.?|Tour|Manche)\s*(\d+)', line, re.IGNORECASE)
			if round_match:
				current_round = int(round_match.group(1))
				continue
			
			# Try to extract dive data from line
			dive = self._parse_dive_line(line, current_round)
			if dive:
				dives.append(dive)
		
		return dives
	
	def _parse_table_structure(self, text: str) -> List[ExtractedDive]:
		"""Parse table-structured results (for scanned result tables)"""
		dives = []
		lines = text.split('\n')
		
		current_round = 1
		
		for line in lines:
			line = line.strip()
			if not line:
				continue
			
			# Look for lines with dive codes - try correct pattern first, then OCR error pattern
			dive_codes = re.findall(self.DIVE_CODE_PATTERN, line)
			if not dive_codes:
				# Try OCR error pattern (digit at end instead of letter)
				dive_codes = re.findall(self.DIVE_CODE_PATTERN_OCR_ERROR, line)
			if not dive_codes:
				continue
			
			# Extract all numbers from the line
			all_numbers = re.findall(r'(\d+\.?\d*)', line)
			all_numbers = [float(n) for n in all_numbers if n]
			
			for dive_code in dive_codes:
				dive_code = dive_code.upper()
				# Correct common OCR errors (e.g., '4' -> 'A')
				dive_code = self._correct_dive_code_ocr(dive_code)
				
				# Find numbers that could be judge scores (0-10)
				potential_scores = [n for n in all_numbers if 0 <= n <= 10]
				
				# Find potential difficulty (1.0-4.5)
				potential_dd = [n for n in all_numbers if 1.0 <= n <= 4.5]
				
				# Find potential final score (>10)
				potential_final = [n for n in all_numbers if n > 10 and n < 200]
				
				# Build dive record
				judge_scores = potential_scores[:7] if potential_scores else None
				difficulty = potential_dd[0] if potential_dd else None
				final_score = potential_final[0] if potential_final else None
				
				# Try to extract athlete name from beginning of line
				athlete_name = "Unknown Athlete"
				name_match = re.match(r'^(\d+\.?\s*)?([A-ZÀ-ÿ][a-zà-ÿ]+(?:[-\s][A-ZÀ-ÿ][a-zà-ÿ]+)+)', line)
				if name_match:
					athlete_name = name_match.group(2).strip()
				
				dive = ExtractedDive(
					athlete_name=athlete_name,
					dive_code=dive_code,
					round_number=current_round,
					judge_scores=judge_scores,
					difficulty=difficulty,
					final_score=final_score,
					rank=None,
					country=None
				)
				dives.append(dive)
		
		return dives
	
	def _parse_dive_line(self, line: str, round_number: int) -> Optional[ExtractedDive]:
		"""Parse a single line to extract dive information"""
		# Look for dive code
		dive_match = re.search(self.DIVE_CODE_PATTERN, line)
		if not dive_match:
			return None
		
		dive_code = dive_match.group(1).upper()
		# Correct common OCR errors
		dive_code = self._correct_dive_code_ocr(dive_code)
		
		# Extract all numbers from line
		numbers = re.findall(r'(\d+\.?\d*)', line)
		numbers = [float(n) for n in numbers if n]
		
		# Try to identify components
		athlete_name = None
		country = None
		judge_scores = []
		difficulty = None
		final_score = None
		rank = None
		
		# Look for athlete name (text before dive code) - updated for French names
		pre_dive = line[:dive_match.start()].strip()
		
		# Try French format: "1 DUPONT Marie" or "DUPONT Marie"
		name_patterns = [
			r'^(\d+)[\.\s]+([A-ZÀ-Ÿ]{2,}(?:[-\s][A-ZÀ-Ÿ]+)*)\s+([A-ZÀ-ÿ][a-zà-ÿ]+)',  # "1 DUPONT Marie"
			r'^(\d+)[\.\s]+([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-ÿ][a-zà-ÿ]+)+)',  # "1 Marie Dupont"
			r'^([A-ZÀ-Ÿ]{2,}(?:[-\s][A-ZÀ-Ÿ]+)*)\s+([A-ZÀ-ÿ][a-zà-ÿ]+)',  # "DUPONT Marie"
		]
		
		for pattern in name_patterns:
			name_match = re.match(pattern, pre_dive, re.UNICODE)
			if name_match:
				groups = name_match.groups()
				if len(groups) == 3:  # Has rank
					try:
						rank = int(groups[0])
					except:
						pass
					if groups[1].isupper():  # LASTNAME Firstname
						athlete_name = f"{groups[2]} {groups[1].title()}"
					else:
						athlete_name = f"{groups[1]} {groups[2]}"
				elif len(groups) == 2:
					if groups[0].isupper():  # LASTNAME Firstname
						athlete_name = f"{groups[1]} {groups[0].title()}"
					else:
						athlete_name = f"{groups[0]} {groups[1]}"
				break
		
		# Look for country code or French club
		country_match = re.search(self.COUNTRY_PATTERN, line)
		if country_match:
			country = country_match.group(1)
		else:
			# Try to find French club
			for club_pattern in self.FRENCH_CLUB_PATTERNS:
				club_match = re.search(club_pattern, line, re.IGNORECASE)
				if club_match:
					country = club_match.group(0).strip()[:50]
					break
		
		# Process numbers after dive code
		post_dive = line[dive_match.end():]
		post_numbers = re.findall(r'(\d+[\.,]?\d*)', post_dive)
		post_numbers = [float(n.replace(',', '.')) for n in post_numbers if n]
		
		if post_numbers:
			# PDF format: Height Coef J1 J2 J3 J4 J5 J6 J7 Cumul Points Points [Pen]
			# Heights are: 1, 3, 5, 7.5, 10
			# DD (Coef) is: 1.0-4.5 range
			
			def is_valid_judge_score(n: float) -> bool:
				if n < 0 or n > 10:
					return False
				return (n * 2) == int(n * 2)
			
			def is_diving_height(n: float) -> bool:
				return n in [1, 1.0, 3, 3.0, 5, 5.0, 7.5, 10, 10.0]
			
			def is_likely_difficulty(n: float) -> bool:
				return 1.0 <= n <= 4.5
			
			# Check if first number is height, second is DD
			remaining = post_numbers.copy()
			if len(post_numbers) >= 2:
				if is_diving_height(post_numbers[0]):
					# First is height, skip it
					if is_likely_difficulty(post_numbers[1]):
						difficulty = post_numbers[1]
						remaining = post_numbers[2:]
					else:
						remaining = post_numbers[1:]
				elif is_likely_difficulty(post_numbers[0]):
					difficulty = post_numbers[0]
					remaining = post_numbers[1:]
			
			# Extract judge scores and final score from remaining
			potential_scores = [n for n in remaining if is_valid_judge_score(n)]
			
			if len(potential_scores) >= 3:
				judge_scores = potential_scores[:7]
				# Look for final score in remaining numbers
				for n in remaining:
					if n > 10 and n < 200 and final_score is None:
						final_score = n
			elif len(potential_scores) > 0:
				# Fewer valid scores - last big number might be total
				for n in remaining:
					if n > 10 and n < 200:
						final_score = n
						break
				judge_scores = potential_scores[:7]
		
		# Validate judge scores - must have exactly 5 or 7 judges (standard panel sizes)
		if judge_scores and len(judge_scores) not in [5, 7]:
			judge_scores = []  # Invalid count, discard
		
		# Need at least a dive code and some scores to be valid
		if not judge_scores and not final_score:
			return None
		
		return ExtractedDive(
			athlete_name=athlete_name or "Unknown Athlete",
			dive_code=dive_code,
			round_number=round_number,
			judge_scores=judge_scores if judge_scores else None,
			difficulty=difficulty,
			final_score=final_score,
			rank=rank,
			country=country
		)
	
	def _post_process_dives(self, dives: List[ExtractedDive]) -> List[ExtractedDive]:
		"""Clean up and validate extracted dives"""
		processed = []
		
		# French dive descriptions that should NOT be captured as country/club
		french_dive_terms = {
			'plongeon', 'ordinaire', 'avant', 'arrière', 'arriere', 'retourné', 'retourne',
			'renversé', 'renverse', 'tire-bouchon', 'tirebouchon', 'équilibre', 'equilibre',
			'vrille', 'vrilles', 'avec', 'sans', 'élan', 'elan', 'carpé', 'carpe',
			'groupé', 'groupe', 'tendu', 'droit', 'position', 'libre', 'saut',
			'périlleux', 'perilleux', '1/2', '3/2', '2/2', '1', '2', '3',
			'salto', 'twist', 'somersault', 'pike', 'tuck', 'straight', 'free',
			'forward', 'back', 'reverse', 'inward', 'armstand', 'twisting'
		}
		
		def is_dive_description(text: str) -> bool:
			"""Check if text looks like a dive description rather than a club/country"""
			if not text:
				return False
			text_lower = text.lower().strip()
			words = set(text_lower.split())
			# If more than half the words are dive terms, it's probably a description
			dive_word_count = len(words.intersection(french_dive_terms))
			if dive_word_count >= 2:
				return True
			# Check for patterns like "1 1/2 vrille"
			if re.search(r'\d+\s*\/\s*\d+\s*(vrille|twist|salto)', text_lower):
				return True
			return False
		
		for dive in dives:
			# Validate dive code format
			if not re.match(r'^\d{3,4}[A-D]$', dive.dive_code, re.IGNORECASE):
				continue
			
			# Clean up athlete name
			if dive.athlete_name:
				# Remove any numbers or special characters
				name = re.sub(r'[0-9\(\)\[\]]', '', dive.athlete_name).strip()
				# Ensure proper capitalization
				name = ' '.join(word.capitalize() for word in name.split())
				dive.athlete_name = name if name else "Unknown Athlete"
			
			# Filter out dive descriptions captured as country/club
			if dive.country and is_dive_description(dive.country):
				dive.country = None
			
			# Validate judge scores
			if dive.judge_scores:
				# Filter out invalid scores
				valid_scores = [s for s in dive.judge_scores if 0 <= s <= 10]
				dive.judge_scores = valid_scores if valid_scores else None
			
			# Validate difficulty
			if dive.difficulty and not (1.0 <= dive.difficulty <= 4.5):
				dive.difficulty = None
			
			# Validate final score
			if dive.final_score and not (0 < dive.final_score < 200):
				dive.final_score = None
			
			processed.append(dive)
		
		return processed
	
	def _associate_dives_with_athletes(
		self,
		dives: List[ExtractedDive],
		athlete_positions: Dict[str, List[int]]
	) -> List[ExtractedDive]:
		"""Associate extracted dives with correct athletes based on document position.
		
		Uses athlete positions detected from headers to link dives to athletes
		when athlete name is not directly embedded in dive row.
		
		Args:
			dives: List of extracted dives (may have Unknown Athlete)
			athlete_positions: Dict mapping athlete names to line positions in document
		
		Returns:
			Updated dives with athlete associations fixed
		"""
		if not athlete_positions:
			return dives
		
		# Sort athletes by position (ascending line numbers)
		sorted_athletes = sorted(
			[(name, min(positions)) for name, positions in athlete_positions.items()],
			key=lambda x: x[1]
		)
		
		# Track round numbers per athlete
		athlete_round_counts = {name: 0 for name, _ in sorted_athletes}
		
		for dive in dives:
			# Skip if dive already has a valid athlete name
			if dive.athlete_name and dive.athlete_name != "Unknown Athlete":
				# Normalize the name
				dive.athlete_name = normalize_athlete_name(dive.athlete_name)
				# Update round count
				if dive.athlete_name in athlete_round_counts:
					athlete_round_counts[dive.athlete_name] += 1
					# Adjust round number based on actual count
					if dive.round_number == 1:
						dive.round_number = athlete_round_counts[dive.athlete_name]
				continue
			
			# For unknown athletes, try to infer from document position
			# This is a fallback - ideally athlete should be detected from headers
			logger.debug(f"Dive with unknown athlete: {dive.dive_code}")
		
		return dives
	
	def _group_dives_by_event(
		self,
		dives: List[ExtractedDive]
	) -> Dict[str, List[ExtractedDive]]:
		"""Group dives by event name for multi-event PDFs.
		
		Args:
			dives: All extracted dives
		
		Returns:
			Dict mapping event names to lists of dives
		"""
		events = {}
		unknown_event_dives = []
		
		for dive in dives:
			event_name = dive.event_name or "Unknown Event"
			if event_name == "Unknown Event":
				unknown_event_dives.append(dive)
			else:
				if event_name not in events:
					events[event_name] = []
				events[event_name].append(dive)
		
		# If all dives are in unknown event, return them under a default key
		if unknown_event_dives and not events:
			events["Competition"] = unknown_event_dives
		elif unknown_event_dives:
			# Assign unknown dives to the most recent event or first event
			if events:
				first_event = list(events.keys())[0]
				events[first_event].extend(unknown_event_dives)
		
		return events
	
	def _calculate_confidence(
		self, 
		competition_name: Optional[str], 
		event_type: Optional[str], 
		dives: List[ExtractedDive]
	) -> float:
		"""Calculate confidence score for extraction (0.0 - 1.0)
		
		Confidence is based on:
		- Metadata completeness (competition name, event type)
		- Number of dives extracted
		- Quality of dive data (validation pass rates)
		- Completeness of dive fields
		"""
		score = 0.0
		
		# Competition name found (15%)
		if competition_name:
			score += 0.15
		
		# Event type found (10%)
		if event_type:
			score += 0.1
		
		# Dives extracted (up to 75%)
		if dives:
			# Base score for having dives (25%)
			score += 0.25
			
			# Bonus for number of dives (up to 10%)
			dive_count_bonus = min(len(dives) / 50, 0.1)  # Max 0.1 for 50+ dives
			score += dive_count_bonus
			
			# Validation pass rates (up to 40%)
			valid_dive_codes = 0
			valid_judge_scores = 0
			valid_difficulties = 0
			complete_dives = 0
			
			for dive in dives:
				# Validate dive code format
				if dive.dive_code and self._validate_dive_code_format(dive.dive_code):
					valid_dive_codes += 1
				
				# Validate judge scores
				if dive.judge_scores and len(dive.judge_scores) >= 5:
					scores_valid, _ = validate_judge_scores(dive.judge_scores)
					if scores_valid:
						valid_judge_scores += 1
				
				# Validate difficulty
				if dive.difficulty:
					dd_valid, _ = validate_difficulty(dive.difficulty)
					if dd_valid:
						valid_difficulties += 1
				
				# Check completeness
				if (dive.dive_code and dive.athlete_name != "Unknown Athlete" and
					dive.difficulty and (dive.judge_scores or dive.final_score)):
					complete_dives += 1
			
			# Calculate validation rates
			total_dives = len(dives)
			dive_code_rate = valid_dive_codes / total_dives if total_dives > 0 else 0
			judge_score_rate = valid_judge_scores / total_dives if total_dives > 0 else 0
			difficulty_rate = valid_difficulties / total_dives if total_dives > 0 else 0
			completeness_rate = complete_dives / total_dives if total_dives > 0 else 0
			
			# Weight the validation scores
			validation_score = (
				dive_code_rate * 0.1 +
				judge_score_rate * 0.1 +
				difficulty_rate * 0.1 +
				completeness_rate * 0.1
			)
			score += validation_score
			
			# Log confidence breakdown for debugging
			logger.debug(
				f"Confidence breakdown: competition={bool(competition_name)}, "
				f"event={bool(event_type)}, dives={total_dives}, "
				f"dive_codes={dive_code_rate:.2f}, judge_scores={judge_score_rate:.2f}, "
				f"difficulty={difficulty_rate:.2f}, complete={completeness_rate:.2f}"
			)
		
		return min(score, 1.0)


class PDFOCRProcessor:
	"""Handles PDF to text conversion using OCR"""
	
	def __init__(self, dpi: int = 300, lang: str = 'eng+fra'):
		self.dpi = dpi
		self.lang = lang  # Use both English and French by default
		self.parser = DivingPDFParser()
	
	def process_pdf_bytes(self, pdf_bytes: bytes) -> ExtractionResult:
		"""Process PDF from bytes and extract diving data"""
		try:
			start_time = time.time()
			
			# Convert PDF to images
			logger.info("Converting PDF to images...")
			pdf_convert_start = time.time()
			images = convert_from_bytes(
				pdf_bytes,
				dpi=self.dpi,
				fmt='png',
				thread_count=2
			)
			pdf_convert_time = time.time() - pdf_convert_start
			
			if not images:
				return ExtractionResult(
					success=False,
					errors=["Failed to convert PDF to images"]
				)
			
			logger.info(f"Converted {len(images)} pages in {pdf_convert_time:.2f}s")
			
			# Extract text from each page
			all_text = []
			ocr_total_time = 0
			for i, image in enumerate(images):
				page_start = time.time()
				logger.info(f"Processing page {i + 1}/{len(images)}...")
				
				# Preprocess image for better OCR
				processed_image = self._preprocess_image(image)
				
				# Run OCR
				text = pytesseract.image_to_string(
					processed_image,
					lang=self.lang,
					config='--psm 6'  # Assume uniform block of text
				)
				
				page_time = time.time() - page_start
				ocr_total_time += page_time
				logger.info(f"Page {i + 1} OCR completed in {page_time:.2f}s ({len(text)} chars)")
				
				all_text.append(f"--- PAGE {i + 1} ---\n{text}")
			
			combined_text = '\n\n'.join(all_text)
			logger.info(f"Total OCR time: {ocr_total_time:.2f}s for {len(combined_text)} characters")
			
			# Parse the extracted text
			parse_start = time.time()
			result = self.parser.parse_text(combined_text)
			parse_time = time.time() - parse_start
			
			total_time = time.time() - start_time
			
			# Log performance summary
			logger.info(
				f"PDF processing complete - Total: {total_time:.2f}s | "
				f"PDF→Image: {pdf_convert_time:.2f}s | "
				f"OCR: {ocr_total_time:.2f}s | "
				f"Parse: {parse_time:.2f}s | "
				f"Pages: {len(images)} | "
				f"Dives: {len(result.dives) if result.dives else 0}"
			)
			
			return result
			
		except Exception as e:
			logger.error(f"PDF processing error: {str(e)}")
			return ExtractionResult(
				success=False,
				errors=[f"PDF processing error: {str(e)}"]
			)
	
	def process_pdf_file(self, file_path: str) -> ExtractionResult:
		"""Process PDF from file path"""
		try:
			with open(file_path, 'rb') as f:
				pdf_bytes = f.read()
			return self.process_pdf_bytes(pdf_bytes)
		except Exception as e:
			return ExtractionResult(
				success=False,
				errors=[f"Failed to read PDF file: {str(e)}"]
			)
	
	def _preprocess_image(self, image: Image.Image) -> Image.Image:
		"""Preprocess image to improve OCR accuracy"""
		# Skip preprocessing for now - it seems to cause more OCR errors than it fixes
		# The unprocessed images are producing more accurate results
		return image
		
		# Original preprocessing code (disabled):
		# # Convert to grayscale
		# if image.mode != 'L':
		# 	image = image.convert('L')
		# 
		# # Increase contrast
		# from PIL import ImageEnhance
		# enhancer = ImageEnhance.Contrast(image)
		# image = enhancer.enhance(1.5)
		# 
		# # Sharpen
		# enhancer = ImageEnhance.Sharpness(image)
		# image = enhancer.enhance(2.0)
		# 
		# return image


# Celery Tasks
@celery_app.task(bind=True, name='process_pdf')
def process_pdf_task(self, job_id: str, pdf_bytes_b64: str, metadata: dict):
	"""Celery task to process PDF and extract diving data"""
	import base64
	
	logger.info(f"Starting PDF processing for job {job_id}")
	
	try:
		# Update job status
		update_job_status(job_id, 'processing', {'message': 'Starting OCR processing'})
		
		# Decode PDF bytes
		pdf_bytes = base64.b64decode(pdf_bytes_b64)
		
		# Process PDF
		processor = PDFOCRProcessor()
		result = processor.process_pdf_bytes(pdf_bytes)
		
		# Convert result to dict
		result_dict = {
			'success': result.success,
			'competition_name': result.competition_name,
			'event_type': result.event_type,
			'date': result.date,
			'location': result.location,
			'dives': [asdict(d) for d in result.dives] if result.dives else [],
			'errors': result.errors,
			'confidence': result.confidence,
			'raw_text_length': len(result.raw_text) if result.raw_text else 0
		}
		
		# Extract detected heights from dives
		detected_heights = set()
		events_detected = set()
		for dive in (result.dives or []):
			if dive.height:
				detected_heights.add(dive.height)
			if dive.event_name:
				events_detected.add(dive.event_name)
		
		result_dict['detected_heights'] = sorted(list(detected_heights))
		result_dict['events_detected'] = sorted(list(events_detected))
		result_dict['has_multiple_heights'] = len(detected_heights) > 1
		
		# Update job status
		if result.success:
			update_job_status(job_id, 'completed', result_dict)
			logger.info(f"Job {job_id} completed: {len(result.dives)} dives extracted")
		else:
			update_job_status(job_id, 'failed', result_dict)
			logger.warning(f"Job {job_id} failed: {result.errors}")
		
		return result_dict
		
	except Exception as e:
		error_msg = str(e)
		logger.error(f"Job {job_id} error: {error_msg}")
		update_job_status(job_id, 'failed', {'error': error_msg})
		raise


def update_job_status(job_id: str, status: str, data: dict):
	"""Update job status in Redis"""
	try:
		redis_client.hset(f"pdf_job:{job_id}", mapping={
			'status': status,
			'data': json.dumps(data),
			'updated_at': time.time()
		})
		redis_client.expire(f"pdf_job:{job_id}", 3600 * 24)  # 24 hour TTL
	except Exception as e:
		logger.error(f"Failed to update job status: {e}")


def get_job_status(job_id: str) -> Optional[dict]:
	"""Get job status from Redis"""
	try:
		result = redis_client.hgetall(f"pdf_job:{job_id}")
		if result:
			return {
				'status': result.get(b'status', b'unknown').decode(),
				'data': json.loads(result.get(b'data', b'{}').decode()),
				'updated_at': float(result.get(b'updated_at', 0))
			}
	except Exception as e:
		logger.error(f"Failed to get job status: {e}")
	return None


# REST API for direct processing (non-Celery)
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
import cgi
import uuid
import base64


class OCRHandler(BaseHTTPRequestHandler):
	"""Simple HTTP handler for OCR requests"""
	
	def do_GET(self):
		if self.path == '/health':
			self.send_response(200)
			self.send_header('Content-Type', 'application/json')
			self.end_headers()
			self.wfile.write(json.dumps({
				'status': 'healthy',
				'service': 'worker-ocr',
				'tesseract_available': True
			}).encode())
		elif self.path.startswith('/job/'):
			job_id = self.path.split('/')[-1]
			status = get_job_status(job_id)
			if status:
				self.send_response(200)
				self.send_header('Content-Type', 'application/json')
				self.end_headers()
				self.wfile.write(json.dumps(status).encode())
			else:
				self.send_response(404)
				self.end_headers()
		else:
			self.send_response(404)
			self.end_headers()
	
	def do_POST(self):
		if self.path == '/process-pdf':
			# Handle multipart form data file upload
			try:
				content_type = self.headers.get('Content-Type', '')
				
				if 'multipart/form-data' in content_type:
					# Parse multipart form data
					form = cgi.FieldStorage(
						fp=self.rfile,
						headers=self.headers,
						environ={'REQUEST_METHOD': 'POST',
								 'CONTENT_TYPE': content_type}
					)
					
					# Get the file
					if 'file' in form:
						file_item = form['file']
						if file_item.file:
							pdf_bytes = file_item.file.read()
							filename = file_item.filename
							
							# Process directly (synchronous for testing)
							logger.info(f"Processing PDF: {filename} ({len(pdf_bytes)} bytes)")
							
							processor = PDFOCRProcessor()
							result = processor.process_pdf_bytes(pdf_bytes)
							
							# Convert to JSON-serializable format
							response = {
								'success': result.success,
								'competition_name': result.competition_name,
								'event_type': result.event_type,
								'date': result.date,
								'location': result.location,
								'confidence': result.confidence,
								'errors': result.errors or [],
								'dive_count': len(result.dives) if result.dives else 0,
								'dives': [asdict(d) for d in result.dives] if result.dives else [],  # All dives
							}
							
							# Add summary statistics
							if result.dives:
								unique_codes = set(d.dive_code for d in result.dives)
								unique_athletes = set(d.athlete_name for d in result.dives if d.athlete_name != "Unknown Athlete")
								round_numbers = set(d.round_number for d in result.dives)
								response['summary'] = {
									'total_dives': len(result.dives),
									'unique_dive_codes': list(unique_codes),
									'unique_athletes': list(unique_athletes)[:10],  # First 10
									'athletes_found': len(unique_athletes),
									'unknown_athletes': sum(1 for d in result.dives if d.athlete_name == "Unknown Athlete"),
									'round_numbers': sorted(list(round_numbers)),
									'events': list(set(d.event_name for d in result.dives if d.event_name)),
								}
							
							self.send_response(200)
							self.send_header('Content-Type', 'application/json')
							self.end_headers()
							self.wfile.write(json.dumps(response, indent=2).encode())
							return
					
					self.send_response(400)
					self.send_header('Content-Type', 'application/json')
					self.end_headers()
					self.wfile.write(json.dumps({'error': 'No file provided'}).encode())
					return
				else:
					self.send_response(400)
					self.send_header('Content-Type', 'application/json')
					self.end_headers()
					self.wfile.write(json.dumps({'error': 'Expected multipart/form-data'}).encode())
					return
					
			except Exception as e:
				logger.error(f"Error processing PDF: {e}")
				import traceback
				traceback.print_exc()
				self.send_response(500)
				self.send_header('Content-Type', 'application/json')
				self.end_headers()
				self.wfile.write(json.dumps({'error': str(e)}).encode())
				return
				
		elif self.path == '/process':
			content_length = int(self.headers.get('Content-Length', 0))
			body = self.rfile.read(content_length)
			
			try:
				data = json.loads(body.decode())
				job_id = data.get('job_id')
				pdf_bytes_b64 = data.get('pdf_bytes')
				metadata = data.get('metadata', {})
				
				if not job_id or not pdf_bytes_b64:
					self.send_response(400)
					self.send_header('Content-Type', 'application/json')
					self.end_headers()
					self.wfile.write(json.dumps({'error': 'Missing job_id or pdf_bytes'}).encode())
					return
				
				# Queue the task
				process_pdf_task.delay(job_id, pdf_bytes_b64, metadata)
				
				self.send_response(202)
				self.send_header('Content-Type', 'application/json')
				self.end_headers()
				self.wfile.write(json.dumps({
					'job_id': job_id,
					'status': 'queued'
				}).encode())
				
			except Exception as e:
				self.send_response(500)
				self.send_header('Content-Type', 'application/json')
				self.end_headers()
				self.wfile.write(json.dumps({'error': str(e)}).encode())
		
		elif self.path == '/debug-ocr':
			# Debug endpoint: return raw OCR text from PDF
			try:
				content_type = self.headers.get('Content-Type', '')
				
				if 'multipart/form-data' in content_type:
					form = cgi.FieldStorage(
						fp=self.rfile,
						headers=self.headers,
						environ={'REQUEST_METHOD': 'POST',
								 'CONTENT_TYPE': content_type}
					)
					
					if 'file' in form:
						file_item = form['file']
						if file_item.file:
							pdf_bytes = file_item.file.read()
							
							# Convert PDF to images and extract text
							from pdf2image import convert_from_bytes
							images = convert_from_bytes(pdf_bytes, dpi=300, fmt='png', thread_count=2)
							
							all_text = []
							for i, image in enumerate(images[:3]):  # First 3 pages only
								text = pytesseract.image_to_string(image, lang='eng+fra', config='--psm 6')
								all_text.append(f"=== PAGE {i + 1} ===\n{text}")
							
							combined_text = '\n\n'.join(all_text)
							
							self.send_response(200)
							self.send_header('Content-Type', 'text/plain; charset=utf-8')
							self.end_headers()
							self.wfile.write(combined_text.encode('utf-8'))
							return
					
					self.send_response(400)
					self.end_headers()
					return
					
			except Exception as e:
				logger.error(f"Debug OCR error: {e}")
				self.send_response(500)
				self.send_header('Content-Type', 'text/plain')
				self.end_headers()
				self.wfile.write(str(e).encode())
		else:
			self.send_response(404)
			self.end_headers()
	
	def log_message(self, format, *args):
		logger.info(f"HTTP: {args[0]}")


def run_http_server(port: int = 8080):
	"""Run the HTTP server for direct OCR requests"""
	server = HTTPServer(('0.0.0.0', port), OCRHandler)
	logger.info(f"Starting HTTP server on port {port}")
	server.serve_forever()


def main():
	"""Main entry point for the worker service"""
	logger.info("=" * 50)
	logger.info("Diving Analytics Worker Service")
	logger.info("=" * 50)
	
	# Test Tesseract availability
	try:
		version = pytesseract.get_tesseract_version()
		logger.info(f"Tesseract version: {version}")
	except Exception as e:
		logger.error(f"Tesseract not available: {e}")
	
	# Start HTTP server in a thread
	http_thread = threading.Thread(target=run_http_server, daemon=True)
	http_thread.start()
	
	# Run Celery worker
	logger.info("Starting Celery worker...")
	celery_app.worker_main(['worker', '-l', 'INFO', '-c', '2'])


if __name__ == "__main__":
	main()
