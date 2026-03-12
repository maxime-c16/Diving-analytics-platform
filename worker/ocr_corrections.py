"""
OCR Error Correction Module for Diving Analytics Platform

Provides corrections for common OCR misrecognition patterns in dive codes,
specifically for Tesseract processing of diving competition PDFs.

Based on research analysis of DiveRecorder format PDFs.
"""

import re
from typing import Optional, Tuple


# Extended OCR corrections for dive code letter positions
# Maps commonly misread digits back to correct letters
EXTENDED_OCR_CORRECTIONS = {
    # High confidence corrections (very common)
    '4': 'A',  # 4 often misread as A (e.g., 5211A → 52114)
    '8': 'B',  # 8 sometimes misread as B (e.g., 101B → 1018)
    '%': '½',  # Percent sign misread as half symbol (for judge scores)
    
    # Medium confidence corrections (less common)
    '0': 'D',  # 0 sometimes misread as D
    '(': 'C',  # Parenthesis misread as C
    
    # Low confidence - context dependent
    # These are only applied with additional validation
}

# Reverse mapping for potential digit confusion
DIGIT_CONFUSION = {
    'A': '4',
    'B': '8',
    'D': '0',
    'O': '0',
}

# Common trailing artifacts to strip from dive codes
TRAILING_ARTIFACTS = ['_', '.', ',', '-', '—', '–', "'", '"', '`']

# Dive code validation pattern
DIVE_CODE_PATTERN = re.compile(r'^[1-6]\d{2,3}[A-D]$', re.IGNORECASE)


def correct_dive_code(raw_code: str, confidence: Optional[float] = None) -> Tuple[str, bool, str]:
    """
    Correct OCR errors in a dive code.
    
    Args:
        raw_code: The raw OCR-extracted dive code
        confidence: Optional OCR confidence score (0.0-1.0)
    
    Returns:
        Tuple of (corrected_code, was_corrected, correction_description)
    
    Examples:
        >>> correct_dive_code("52114")
        ('5211A', True, 'Corrected trailing 4→A')
        >>> correct_dive_code("1018")
        ('101B', True, 'Corrected trailing 8→B')
        >>> correct_dive_code("101C_")
        ('101C', True, 'Stripped trailing artifact _')
        >>> correct_dive_code("101B")
        ('101B', False, 'No correction needed')
    """
    if not raw_code:
        return raw_code, False, "Empty input"
    
    original = raw_code
    code = raw_code.strip()
    corrections = []
    
    # Step 1: Strip trailing artifacts
    for artifact in TRAILING_ARTIFACTS:
        if code.endswith(artifact):
            code = code[:-1]
            corrections.append(f"Stripped trailing artifact {artifact}")
    
    # Step 2: Convert to uppercase
    if code != code.upper():
        code = code.upper()
        corrections.append("Converted to uppercase")
    
    # Step 3: Check if already valid
    if DIVE_CODE_PATTERN.match(code):
        if corrections:
            return code, True, "; ".join(corrections)
        return code, False, "No correction needed"
    
    # Step 4: Handle codes ending with digits that should be letters
    # This is the most common OCR error pattern
    if len(code) >= 4 and code[-1].isdigit():
        last_digit = code[-1]
        
        if last_digit in EXTENDED_OCR_CORRECTIONS:
            corrected_letter = EXTENDED_OCR_CORRECTIONS[last_digit]
            code = code[:-1] + corrected_letter
            corrections.append(f"Corrected trailing {last_digit}→{corrected_letter}")
    
    # Step 5: Handle 3-digit codes with OCR'd suffix that makes them 4-digit
    # e.g., "1018" should become "101B" (not "1018" → invalid)
    if len(code) == 4 and code[-1].isdigit():
        # Check if removing last digit gives valid 3-digit code
        potential_code = code[:3]
        if potential_code[0] in '123456' and potential_code[1:].isdigit():
            last_digit = code[-1]
            if last_digit in EXTENDED_OCR_CORRECTIONS:
                corrected_letter = EXTENDED_OCR_CORRECTIONS[last_digit]
                code = potential_code + corrected_letter
                corrections.append(f"Corrected 3-digit+suffix {code[-1]}→{corrected_letter}")
    
    # Step 6: Handle 5-digit codes (4-digit dive + OCR'd letter)
    if len(code) == 5 and code[-1].isdigit():
        last_digit = code[-1]
        if last_digit in EXTENDED_OCR_CORRECTIONS:
            corrected_letter = EXTENDED_OCR_CORRECTIONS[last_digit]
            code = code[:-1] + corrected_letter
            corrections.append(f"Corrected 5-digit trailing {last_digit}→{corrected_letter}")
    
    # Step 7: Final validation
    if DIVE_CODE_PATTERN.match(code):
        return code, bool(corrections), "; ".join(corrections) if corrections else "No correction needed"
    
    # Could not correct to valid format
    return original, False, f"Could not correct '{original}' to valid dive code"


def correct_french_decimal(value: str) -> Tuple[float, bool]:
    """
    Convert French decimal format (comma) to standard float.
    
    Args:
        value: String that may contain French decimal format
    
    Returns:
        Tuple of (converted_value, was_converted)
    
    Examples:
        >>> correct_french_decimal("6,5")
        (6.5, True)
        >>> correct_french_decimal("42,00")
        (42.0, True)
        >>> correct_french_decimal("6.5")
        (6.5, False)
    """
    if not value:
        return 0.0, False
    
    value_str = str(value).strip()
    
    # Check for French comma decimal
    if ',' in value_str:
        value_str = value_str.replace(',', '.')
        try:
            return float(value_str), True
        except ValueError:
            return 0.0, False
    
    try:
        return float(value_str), False
    except ValueError:
        return 0.0, False


def correct_difficulty_ocr(raw_value: str) -> Tuple[float, bool, str]:
    """
    Correct OCR errors in difficulty (DD) values.
    
    French PDFs may show difficulty as:
    - "20" meaning 2.0
    - "2,0" meaning 2.0
    - "15" meaning 1.5
    
    Args:
        raw_value: The raw OCR-extracted difficulty string
    
    Returns:
        Tuple of (corrected_value, was_corrected, correction_description)
    """
    if not raw_value:
        return 0.0, False, "Empty input"
    
    value_str = str(raw_value).strip()
    
    # Try French decimal first
    value, was_french = correct_french_decimal(value_str)
    if was_french and 1.0 <= value <= 4.5:
        return value, True, f"Converted French decimal {raw_value}→{value}"
    
    # If already a valid float in range
    try:
        value = float(value_str)
        if 1.0 <= value <= 4.5:
            return value, False, "No correction needed"
        
        # Check if it's a 2-digit representation (e.g., "20" = 2.0)
        if 10 <= value <= 45:
            corrected = value / 10.0
            if 1.0 <= corrected <= 4.5:
                return corrected, True, f"Divided by 10: {raw_value}→{corrected}"
    except ValueError:
        pass
    
    return 0.0, False, f"Could not parse difficulty from '{raw_value}'"


def correct_judge_score_ocr(raw_value: str) -> Tuple[float, bool, str]:
    """
    Correct OCR errors in judge score values.
    
    Common issues:
    - French decimal: "6,5" → 6.5
    - Merged scores: "65" → 6.5 (for scores < 10)
    - Missing decimal: "75" → 7.5
    
    Args:
        raw_value: The raw OCR-extracted judge score string
    
    Returns:
        Tuple of (corrected_value, was_corrected, correction_description)
    """
    if not raw_value:
        return 0.0, False, "Empty input"
    
    value_str = str(raw_value).strip()
    
    # Try French decimal first
    value, was_french = correct_french_decimal(value_str)
    if was_french and 0.0 <= value <= 10.0:
        return value, True, f"Converted French decimal {raw_value}→{value}"
    
    # If already a valid float in range
    try:
        value = float(value_str)
        if 0.0 <= value <= 10.0:
            # Check if it's on 0.5 increment
            if (value * 2) == int(value * 2):
                return value, False, "No correction needed"
        
        # Check if it's a 2-digit representation (e.g., "65" = 6.5)
        if 10 <= value <= 100 and value == int(value):
            corrected = value / 10.0
            if 0.0 <= corrected <= 10.0 and (corrected * 2) == int(corrected * 2):
                return corrected, True, f"Divided by 10: {raw_value}→{corrected}"
    except ValueError:
        pass
    
    return 0.0, False, f"Could not parse judge score from '{raw_value}'"


def apply_all_corrections(
    dive_code: str,
    difficulty: str,
    judge_scores: list,
) -> dict:
    """
    Apply all OCR corrections to extracted dive data.
    
    Args:
        dive_code: Raw dive code
        difficulty: Raw difficulty string
        judge_scores: List of raw judge score strings
    
    Returns:
        Dictionary with corrected values and correction log
    """
    corrections_log = []
    
    # Correct dive code
    corrected_code, code_corrected, code_desc = correct_dive_code(dive_code)
    if code_corrected:
        corrections_log.append(f"Dive code: {code_desc}")
    
    # Correct difficulty
    corrected_dd, dd_corrected, dd_desc = correct_difficulty_ocr(difficulty)
    if dd_corrected:
        corrections_log.append(f"Difficulty: {dd_desc}")
    
    # Correct judge scores
    corrected_scores = []
    for i, score in enumerate(judge_scores):
        corrected_score, score_corrected, score_desc = correct_judge_score_ocr(str(score))
        corrected_scores.append(corrected_score)
        if score_corrected:
            corrections_log.append(f"Judge {i+1} score: {score_desc}")
    
    return {
        'dive_code': corrected_code,
        'difficulty': corrected_dd,
        'judge_scores': corrected_scores,
        'corrections_applied': len(corrections_log) > 0,
        'corrections_log': corrections_log
    }
