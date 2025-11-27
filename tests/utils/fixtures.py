"""
Fixture Loading Utilities for Diving Analytics Platform

Provides functions to load and validate ground truth fixtures
for E2E pipeline testing.
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from dataclasses import dataclass


@dataclass
class FixtureMetadata:
    """Metadata about a loaded fixture."""
    pdf_file_name: str
    description: str
    extracted_date: str
    verification_notes: Optional[str] = None


@dataclass
class LoadedFixture:
    """A loaded and validated fixture."""
    metadata: FixtureMetadata
    events: List[Dict]
    tolerances: Dict[str, Any]
    raw_data: Dict
    is_valid: bool
    validation_errors: List[str]


# Default fixture paths relative to tests/fixtures/
DEFAULT_GROUND_TRUTH_PATH = "ground-truth-expected.json"
DEFAULT_OCR_BASELINE_PATH = "ocr-output-baseline.json"


def get_fixtures_dir() -> Path:
    """Get the path to the fixtures directory."""
    # Try to find fixtures directory relative to this file
    current_file = Path(__file__).resolve()
    
    # Go up to tests/utils/ then to tests/fixtures/
    fixtures_dir = current_file.parent.parent / "fixtures"
    
    if not fixtures_dir.exists():
        # Try from project root
        project_root = current_file.parent.parent.parent
        fixtures_dir = project_root / "tests" / "fixtures"
    
    return fixtures_dir


def load_json_file(filepath: str | Path) -> Dict:
    """
    Load a JSON file.
    
    Args:
        filepath: Path to JSON file
    
    Returns:
        Parsed JSON data
    
    Raises:
        FileNotFoundError: If file doesn't exist
        json.JSONDecodeError: If JSON is invalid
    """
    filepath = Path(filepath)
    
    if not filepath.exists():
        raise FileNotFoundError(f"Fixture file not found: {filepath}")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def validate_fixture_structure(data: Dict) -> List[str]:
    """
    Validate the structure of a ground truth fixture.
    
    Args:
        data: Parsed fixture data
    
    Returns:
        List of validation errors (empty if valid)
    """
    errors = []
    
    # Check required top-level fields
    required_fields = ['metadata', 'events']
    for field in required_fields:
        if field not in data:
            errors.append(f"Missing required field: {field}")
    
    # Validate metadata
    if 'metadata' in data:
        metadata = data['metadata']
        if not isinstance(metadata, dict):
            errors.append("'metadata' must be an object")
        else:
            if 'pdfFileName' not in metadata:
                errors.append("metadata.pdfFileName is required")
    
    # Validate events
    if 'events' in data:
        events = data['events']
        if not isinstance(events, list):
            errors.append("'events' must be an array")
        else:
            for i, event in enumerate(events):
                if not isinstance(event, dict):
                    errors.append(f"events[{i}] must be an object")
                    continue
                
                if 'name' not in event:
                    errors.append(f"events[{i}].name is required")
                
                if 'athletes' not in event:
                    errors.append(f"events[{i}].athletes is required")
                elif not isinstance(event['athletes'], list):
                    errors.append(f"events[{i}].athletes must be an array")
                else:
                    # Validate athletes
                    for j, athlete in enumerate(event['athletes']):
                        athlete_errors = validate_athlete_structure(athlete, f"events[{i}].athletes[{j}]")
                        errors.extend(athlete_errors)
    
    return errors


def validate_athlete_structure(athlete: Dict, path: str) -> List[str]:
    """
    Validate an athlete's data structure.
    
    Args:
        athlete: Athlete data
        path: JSON path for error messages
    
    Returns:
        List of validation errors
    """
    errors = []
    
    # Check required fields
    required_fields = ['firstName', 'lastName']
    for field in required_fields:
        if field not in athlete:
            errors.append(f"{path}.{field} is required")
    
    # Validate dives
    if 'dives' in athlete:
        if not isinstance(athlete['dives'], list):
            errors.append(f"{path}.dives must be an array")
        else:
            for k, dive in enumerate(athlete['dives']):
                dive_errors = validate_dive_structure(dive, f"{path}.dives[{k}]")
                errors.extend(dive_errors)
    
    return errors


def validate_dive_structure(dive: Dict, path: str) -> List[str]:
    """
    Validate a dive's data structure.
    
    Args:
        dive: Dive data
        path: JSON path for error messages
    
    Returns:
        List of validation errors
    """
    errors = []
    
    # Check required fields
    required_fields = ['roundNumber', 'diveCode', 'difficulty']
    for field in required_fields:
        if field not in dive:
            errors.append(f"{path}.{field} is required")
    
    # Validate dive code format
    if 'diveCode' in dive:
        code = dive['diveCode']
        if not isinstance(code, str) or len(code) < 4:
            errors.append(f"{path}.diveCode must be a string of at least 4 characters")
    
    # Validate judge scores
    if 'judgeScores' in dive:
        scores = dive['judgeScores']
        if not isinstance(scores, list):
            errors.append(f"{path}.judgeScores must be an array")
        elif len(scores) < 3:
            errors.append(f"{path}.judgeScores must have at least 3 scores")
        else:
            for score in scores:
                if not isinstance(score, (int, float)):
                    errors.append(f"{path}.judgeScores must contain numbers")
                    break
                if score < 0 or score > 10:
                    errors.append(f"{path}.judgeScores must be between 0-10")
                    break
    
    # Validate difficulty
    if 'difficulty' in dive:
        dd = dive['difficulty']
        if not isinstance(dd, (int, float)):
            errors.append(f"{path}.difficulty must be a number")
        elif dd < 1.0 or dd > 4.5:
            errors.append(f"{path}.difficulty must be between 1.0-4.5")
    
    return errors


def load_ground_truth(
    filepath: Optional[str | Path] = None
) -> LoadedFixture:
    """
    Load and validate ground truth fixture.
    
    Args:
        filepath: Path to fixture file, or None for default
    
    Returns:
        LoadedFixture with validation results
    """
    if filepath is None:
        filepath = get_fixtures_dir() / DEFAULT_GROUND_TRUTH_PATH
    else:
        filepath = Path(filepath)
    
    try:
        data = load_json_file(filepath)
    except FileNotFoundError as e:
        return LoadedFixture(
            metadata=FixtureMetadata("", "", ""),
            events=[],
            tolerances={},
            raw_data={},
            is_valid=False,
            validation_errors=[str(e)]
        )
    except json.JSONDecodeError as e:
        return LoadedFixture(
            metadata=FixtureMetadata("", "", ""),
            events=[],
            tolerances={},
            raw_data={},
            is_valid=False,
            validation_errors=[f"Invalid JSON: {e}"]
        )
    
    # Validate structure
    validation_errors = validate_fixture_structure(data)
    
    # Extract metadata
    metadata_raw = data.get('metadata', {})
    metadata = FixtureMetadata(
        pdf_file_name=metadata_raw.get('pdfFileName', ''),
        description=metadata_raw.get('description', ''),
        extracted_date=metadata_raw.get('extractedDate', ''),
        verification_notes=metadata_raw.get('verificationNotes')
    )
    
    # Extract tolerances (use defaults if not specified)
    tolerances = data.get('tolerances', {
        'finalScore': 0.01,
        'difficulty': 0,
        'judgeScores': 0,
        'diveCode': 'exact'
    })
    
    return LoadedFixture(
        metadata=metadata,
        events=data.get('events', []),
        tolerances=tolerances,
        raw_data=data,
        is_valid=len(validation_errors) == 0,
        validation_errors=validation_errors
    )


def load_ocr_baseline(
    filepath: Optional[str | Path] = None
) -> Dict:
    """
    Load OCR baseline extraction output.
    
    Args:
        filepath: Path to baseline file, or None for default
    
    Returns:
        Parsed OCR output data
    """
    if filepath is None:
        filepath = get_fixtures_dir() / DEFAULT_OCR_BASELINE_PATH
    
    return load_json_file(filepath)


class FixtureLoader:
    """
    Helper class for loading test fixtures.
    
    Provides a convenient interface for loading and accessing
    ground truth and baseline fixture data.
    """
    
    def __init__(self, fixtures_dir: Optional[Path] = None):
        """
        Initialize fixture loader.
        
        Args:
            fixtures_dir: Optional path to fixtures directory
        """
        self.fixtures_dir = fixtures_dir or get_fixtures_dir()
    
    def load_ground_truth(self, filepath: Optional[str | Path] = None) -> LoadedFixture:
        """
        Load ground truth fixture.
        
        Args:
            filepath: Optional path to fixture file
        
        Returns:
            LoadedFixture with validation results
        """
        if filepath is None:
            filepath = self.fixtures_dir / DEFAULT_GROUND_TRUTH_PATH
        return load_ground_truth(filepath)
    
    def load_ocr_baseline(self, filepath: Optional[str | Path] = None) -> Dict:
        """
        Load OCR baseline fixture.
        
        Args:
            filepath: Optional path to baseline file
        
        Returns:
            Parsed OCR output data
        """
        if filepath is None:
            filepath = self.fixtures_dir / DEFAULT_OCR_BASELINE_PATH
        return load_ocr_baseline(filepath)
    
    def get_expected_dives(self, fixture: Optional[LoadedFixture] = None) -> List[Dict]:
        """
        Get all expected dives from ground truth.
        
        Args:
            fixture: Optional pre-loaded fixture, or load default
        
        Returns:
            List of dive dicts with context
        """
        if fixture is None:
            fixture = self.load_ground_truth()
        return get_all_expected_dives(fixture)
    
    def get_fixture_stats(self, fixture: Optional[LoadedFixture] = None) -> Dict[str, int]:
        """
        Get statistics about fixture.
        
        Args:
            fixture: Optional pre-loaded fixture, or load default
        
        Returns:
            Dictionary with counts
        """
        if fixture is None:
            fixture = self.load_ground_truth()
        return count_fixture_stats(fixture)


def get_all_expected_dives(fixture: LoadedFixture) -> List[Dict]:
    """
    Extract all expected dives from a fixture as a flat list.
    
    Args:
        fixture: Loaded ground truth fixture
    
    Returns:
        List of dive dicts with athlete and event context
    """
    dives = []
    
    for event in fixture.events:
        event_name = event.get('name', 'Unknown')
        height = event.get('height', '')
        
        for athlete in event.get('athletes', []):
            athlete_name = f"{athlete.get('firstName', '')} {athlete.get('lastName', '')}"
            club = athlete.get('club', '')
            
            for dive in athlete.get('dives', []):
                dives.append({
                    **dive,
                    'athleteName': athlete_name,
                    'athleteClub': club,
                    'eventName': event_name,
                    'eventHeight': height
                })
    
    return dives


def count_fixture_stats(fixture: LoadedFixture) -> Dict[str, int]:
    """
    Count statistics about a loaded fixture.
    
    Args:
        fixture: Loaded ground truth fixture
    
    Returns:
        Dictionary with counts
    """
    total_events = len(fixture.events)
    total_athletes = sum(len(e.get('athletes', [])) for e in fixture.events)
    total_dives = len(get_all_expected_dives(fixture))
    
    return {
        'events': total_events,
        'athletes': total_athletes,
        'dives': total_dives
    }
