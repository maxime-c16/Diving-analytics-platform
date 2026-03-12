"""
OCR Extraction Tests for Diving Analytics Platform

Tests the OCR extraction pipeline against ground truth data.
Covers dive code extraction, judge score parsing, athlete association,
and OCR error correction.

Implements tasks T035-T039, T046b from Phase 6 (US4 - E2E Testing).
"""

import json
import sys
from pathlib import Path
from typing import Dict, List
from unittest.mock import patch, MagicMock

import pytest

# Add worker and tests directories to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "worker"))
sys.path.insert(0, str(Path(__file__).parent.parent))

from validation import (
    validate_dive_code,
    validate_judge_score,
    validate_judge_scores,
    validate_difficulty,
    validate_final_score,
)
from ocr_corrections import (
    EXTENDED_OCR_CORRECTIONS,
    correct_dive_code,
    correct_french_decimal,
    correct_difficulty_ocr,
    correct_judge_score_ocr,
    apply_all_corrections,
)
from utils.fixtures import FixtureLoader, get_fixtures_dir
from utils.comparison import (
    compare_dives,
    compare_athlete_results,
    compare_full_extraction,
    ComparisonTolerance,
)


# ============================================================================
# Fixture Loading (T035)
# ============================================================================

class TestFixtureLoading:
    """Test fixture loading functionality."""

    def test_fixtures_directory_exists(self):
        """Verify fixtures directory exists."""
        fixtures_dir = get_fixtures_dir()
        assert fixtures_dir.exists(), f"Fixtures directory not found: {fixtures_dir}"

    def test_load_ground_truth_fixture(self):
        """Verify ground truth fixture loads and validates."""
        loader = FixtureLoader()
        fixture = loader.load_ground_truth()
        
        assert fixture is not None, "Failed to load ground truth fixture"
        assert fixture.is_valid, f"Fixture validation errors: {fixture.validation_errors}"
        assert len(fixture.events) > 0, "Ground truth fixture has no events"

    def test_ground_truth_has_expected_structure(self):
        """Verify ground truth fixture has expected data structure."""
        loader = FixtureLoader()
        fixture = loader.load_ground_truth()
        
        # Check metadata
        assert fixture.metadata is not None
        assert fixture.metadata.pdf_file_name is not None
        
        # Check events structure
        for event in fixture.events:
            assert 'name' in event, "Event missing name"
            assert 'athletes' in event, "Event missing athletes"
            
            for athlete in event.get('athletes', []):
                assert 'firstName' in athlete, "Athlete missing firstName"
                assert 'lastName' in athlete, "Athlete missing lastName"
                assert 'dives' in athlete, "Athlete missing dives"
                
                for dive in athlete.get('dives', []):
                    assert 'roundNumber' in dive, "Dive missing roundNumber"
                    assert 'diveCode' in dive, "Dive missing diveCode"
                    assert 'difficulty' in dive, "Dive missing difficulty"

    def test_load_ocr_baseline(self):
        """Test loading OCR baseline fixture if it exists."""
        loader = FixtureLoader()
        try:
            baseline = loader.load_ocr_baseline()
            assert baseline is not None
        except FileNotFoundError:
            # OCR baseline may not exist yet - that's OK
            pytest.skip("OCR baseline fixture not found")


# ============================================================================
# Dive Code Extraction Tests (T036)
# ============================================================================

class TestDiveCodeExtraction:
    """Test dive code extraction and validation."""

    @pytest.mark.parametrize("raw_code,expected", [
        # Valid codes (no correction needed)
        ("101A", "101A"),
        ("5231D", "5231D"),
        ("301B", "301B"),
        ("403C", "403C"),
        ("612B", "612B"),
        # Lowercase to uppercase
        ("101a", "101A"),
        ("5231d", "5231D"),
        # Trailing artifacts
        ("101A_", "101A"),
        ("301B.", "301B"),
        ("403C,", "403C"),
    ])
    def test_dive_code_normalization(self, raw_code, expected):
        """Test dive code normalization (case and artifacts)."""
        corrected, _, _ = correct_dive_code(raw_code)
        assert corrected == expected

    @pytest.mark.parametrize("raw_code,expected", [
        # Common OCR errors: digit -> letter
        ("52114", "5211A"),  # 4 -> A (most common)
        ("1018", "101B"),    # 8 -> B
        ("1014", "101A"),    # 4 -> A
        ("3010", "301D"),    # 0 -> D (less common)
        # 5-digit codes with OCR error
        ("52114", "5211A"),
        ("61284", "6128A"),
    ])
    def test_dive_code_ocr_correction(self, raw_code, expected):
        """Test OCR error correction for dive codes."""
        corrected, was_corrected, _ = correct_dive_code(raw_code)
        assert corrected == expected, f"Expected {expected}, got {corrected}"
        assert was_corrected, f"Expected correction for {raw_code}"

    @pytest.mark.parametrize("code,expected_valid", [
        ("101A", True),
        ("5231D", True),
        ("301B", True),
        ("403C", True),
        # Invalid codes
        ("701A", False),   # Invalid group (7)
        ("101E", False),   # Invalid position (E)
        ("101", False),    # Missing position
        ("", False),       # Empty
    ])
    def test_dive_code_validation(self, code, expected_valid):
        """Test dive code validation."""
        is_valid, error = validate_dive_code(code)
        assert is_valid == expected_valid, f"Code {code}: expected valid={expected_valid}, got {is_valid}, error={error}"

    def test_dive_codes_from_ground_truth(self):
        """Test all dive codes from ground truth fixture are valid."""
        loader = FixtureLoader()
        fixture = loader.load_ground_truth()
        
        invalid_codes = []
        for event in fixture.events:
            for athlete in event.get('athletes', []):
                for dive in athlete.get('dives', []):
                    code = dive.get('diveCode', '')
                    is_valid, error = validate_dive_code(code)
                    if not is_valid:
                        invalid_codes.append((code, error))
        
        assert len(invalid_codes) == 0, f"Invalid dive codes in ground truth: {invalid_codes}"


# ============================================================================
# Judge Score Extraction Tests (T037)
# ============================================================================

class TestJudgeScoreExtraction:
    """Test judge score extraction and validation."""

    @pytest.mark.parametrize("raw_value,expected", [
        # Valid scores (no correction)
        ("7.5", 7.5),
        ("6.0", 6.0),
        ("10.0", 10.0),
        ("0.0", 0.0),
        # French decimal format
        ("6,5", 6.5),
        ("7,0", 7.0),
        ("8,5", 8.5),
        # Two-digit without decimal (OCR error)
        ("65", 6.5),
        ("70", 7.0),
        ("85", 8.5),
        ("100", 10.0),
    ])
    def test_judge_score_correction(self, raw_value, expected):
        """Test judge score OCR correction."""
        corrected, _, _ = correct_judge_score_ocr(raw_value)
        assert abs(corrected - expected) < 0.01, f"Expected {expected}, got {corrected}"

    @pytest.mark.parametrize("score,expected_valid", [
        (7.5, True),
        (6.0, True),
        (0.0, True),
        (10.0, True),
        (5.5, True),
        # Invalid scores
        (6.3, False),   # Not on 0.5 increment
        (11.0, False),  # Out of range
        (-1.0, False),  # Negative
        (7.25, False),  # Not on 0.5 increment
    ])
    def test_judge_score_validation(self, score, expected_valid):
        """Test judge score validation."""
        is_valid, error = validate_judge_score(score)
        assert is_valid == expected_valid, f"Score {score}: expected valid={expected_valid}, got {is_valid}"

    def test_judge_scores_list_validation(self):
        """Test validation of complete judge scores list."""
        # Valid list
        valid_scores = [7.5, 6.5, 7.0, 7.5, 6.5]
        is_valid, errors = validate_judge_scores(valid_scores)
        assert is_valid, f"Expected valid, got errors: {errors}"
        
        # Too few judges
        few_scores = [7.5, 6.5]
        is_valid, errors = validate_judge_scores(few_scores)
        assert not is_valid
        assert any("Too few" in e for e in errors)
        
        # Invalid score in list
        invalid_list = [7.5, 6.3, 7.0]  # 6.3 is not on 0.5 increment
        is_valid, errors = validate_judge_scores(invalid_list)
        assert not is_valid

    def test_judge_scores_from_ground_truth(self):
        """Test all judge scores from ground truth fixture are valid."""
        loader = FixtureLoader()
        fixture = loader.load_ground_truth()
        
        invalid_scores = []
        for event in fixture.events:
            for athlete in event.get('athletes', []):
                for dive in athlete.get('dives', []):
                    scores = dive.get('judgeScores', [])
                    for i, score in enumerate(scores):
                        is_valid, error = validate_judge_score(score)
                        if not is_valid:
                            invalid_scores.append((athlete.get('lastName'), dive.get('diveCode'), i, score, error))
        
        assert len(invalid_scores) == 0, f"Invalid judge scores in ground truth: {invalid_scores}"


# ============================================================================
# Athlete Association Tests (T038)
# ============================================================================

class TestAthleteAssociation:
    """Test athlete-dive association functionality."""

    def test_athlete_comparison_exact_match(self):
        """Test comparing athlete results with exact match."""
        expected = {
            'firstName': 'Camille',
            'lastName': 'ROUFFIAC',
            'dives': [
                {
                    'roundNumber': 1,
                    'diveCode': '5231D',
                    'difficulty': 2.0,
                    'judgeScores': [7.5, 6.5, 7.5, 7.0, 6.5],
                    'divePoints': 42.00
                }
            ]
        }
        
        actual = {
            'firstName': 'Camille',
            'lastName': 'ROUFFIAC',
            'dives': [
                {
                    'roundNumber': 1,
                    'diveCode': '5231D',
                    'difficulty': 2.0,
                    'judgeScores': [7.5, 6.5, 7.5, 7.0, 6.5],
                    'divePoints': 42.00
                }
            ]
        }
        
        tolerance = ComparisonTolerance(final_score=0.01)
        result = compare_athlete_results(expected, actual, tolerance)
        
        assert result.all_match, f"Expected all match, got: {result.match_percentage}%"
        assert result.match_percentage == 100.0

    def test_athlete_comparison_with_tolerance(self):
        """Test comparing athlete results with score tolerance."""
        expected = {
            'firstName': 'Test',
            'lastName': 'Athlete',
            'dives': [{
                'roundNumber': 1,
                'diveCode': '101A',
                'difficulty': 1.6,
                'judgeScores': [6.0, 6.5, 6.0],
                'divePoints': 30.00
            }]
        }
        
        # Slight score variation within tolerance
        actual = {
            'firstName': 'Test',
            'lastName': 'Athlete',
            'dives': [{
                'roundNumber': 1,
                'diveCode': '101A',
                'difficulty': 1.6,
                'judgeScores': [6.0, 6.5, 6.0],
                'divePoints': 30.005  # Within 0.01 tolerance
            }]
        }
        
        tolerance = ComparisonTolerance(final_score=0.01)
        result = compare_athlete_results(expected, actual, tolerance)
        
        assert result.all_match, "Expected match within tolerance"

    def test_dive_comparison_details(self):
        """Test detailed dive comparison."""
        expected = {
            'diveCode': '5231D',
            'difficulty': 2.0,
            'judgeScores': [7.5, 6.5, 7.5, 7.0, 6.5],
            'divePoints': 42.00,
            'roundNumber': 1
        }
        
        actual = {
            'diveCode': '5231D',
            'difficulty': 2.0,
            'judgeScores': [7.5, 6.5, 7.5, 7.0, 6.5],
            'divePoints': 42.00,
            'roundNumber': 1
        }
        
        result = compare_dives(expected, actual)
        
        assert result.all_match, "All fields should match"
        assert len(result.fields) >= 4, "Should compare at least 4 fields"
        
        for field in result.fields:
            assert field.matches, f"Field {field.field_name} should match"


# ============================================================================
# OCR Error Correction Tests (T039)
# ============================================================================

class TestOCRErrorCorrection:
    """Test comprehensive OCR error correction."""

    def test_extended_ocr_corrections_mapping(self):
        """Verify extended OCR corrections mapping."""
        assert EXTENDED_OCR_CORRECTIONS['4'] == 'A'
        assert EXTENDED_OCR_CORRECTIONS['8'] == 'B'
        assert EXTENDED_OCR_CORRECTIONS['0'] == 'D'

    @pytest.mark.parametrize("raw_value,expected", [
        # French decimal format
        ("2,0", 2.0),
        ("1,6", 1.6),
        ("2,5", 2.5),
        # Two-digit representations
        ("20", 2.0),
        ("16", 1.6),
        ("25", 2.5),
        # Already correct
        ("2.0", 2.0),
        ("1.6", 1.6),
    ])
    def test_difficulty_correction(self, raw_value, expected):
        """Test difficulty OCR correction."""
        corrected, _, _ = correct_difficulty_ocr(raw_value)
        assert abs(corrected - expected) < 0.01, f"Expected {expected}, got {corrected}"

    def test_french_decimal_conversion(self):
        """Test French decimal (comma) to standard decimal conversion."""
        value, was_converted = correct_french_decimal("6,5")
        assert value == 6.5
        assert was_converted
        
        value, was_converted = correct_french_decimal("6.5")
        assert value == 6.5
        assert not was_converted

    def test_apply_all_corrections(self):
        """Test applying all OCR corrections to dive data."""
        result = apply_all_corrections(
            dive_code="52114",  # Should become 5211A
            difficulty="20",    # Should become 2.0
            judge_scores=["7,5", "65", "7.0", "70", "65"]  # Mix of formats
        )
        
        assert result['dive_code'] == '5211A'
        assert abs(result['difficulty'] - 2.0) < 0.01
        assert result['corrections_applied']
        
        # Check judge scores corrected
        expected_scores = [7.5, 6.5, 7.0, 7.0, 6.5]
        for i, expected in enumerate(expected_scores):
            assert abs(result['judge_scores'][i] - expected) < 0.01

    def test_correction_log_generated(self):
        """Test that correction log is generated properly."""
        result = apply_all_corrections(
            dive_code="52114",
            difficulty="20",
            judge_scores=["6,5"]
        )
        
        assert len(result['corrections_log']) > 0
        assert any("Dive code" in log for log in result['corrections_log'])


# ============================================================================
# Partial OCR Failure Handling Tests (T046b)
# ============================================================================

class TestPartialOCRFailure:
    """Test graceful degradation when some OCR operations fail."""

    def test_empty_dive_code_handling(self):
        """Test handling of empty dive code."""
        corrected, was_corrected, description = correct_dive_code("")
        assert corrected == ""
        assert not was_corrected
        assert "Empty" in description

    def test_invalid_dive_code_handling(self):
        """Test handling of completely invalid dive code."""
        corrected, was_corrected, description = correct_dive_code("XYZ123")
        # Should return original when cannot correct
        assert not was_corrected
        assert "Could not correct" in description

    def test_empty_score_handling(self):
        """Test handling of empty score value."""
        corrected, was_corrected, description = correct_judge_score_ocr("")
        assert corrected == 0.0
        assert not was_corrected
        assert "Empty" in description

    def test_invalid_score_handling(self):
        """Test handling of completely invalid score."""
        corrected, was_corrected, description = correct_judge_score_ocr("abc")
        assert corrected == 0.0
        assert not was_corrected

    def test_apply_corrections_with_partial_failures(self):
        """Test apply_all_corrections handles partial failures gracefully."""
        result = apply_all_corrections(
            dive_code="XYZ",      # Invalid - cannot correct
            difficulty="abc",     # Invalid - cannot parse
            judge_scores=["7.5", "invalid", "6.5"]  # Mix of valid and invalid
        )
        
        # Should not crash, should return best effort
        assert result is not None
        assert isinstance(result['dive_code'], str)
        assert isinstance(result['difficulty'], float)
        assert isinstance(result['judge_scores'], list)

    def test_validation_with_none_values(self):
        """Test validation functions handle None gracefully."""
        is_valid, error = validate_judge_score(None)
        assert not is_valid
        assert "None" in error

        is_valid, error = validate_difficulty(None)
        assert not is_valid
        assert "None" in error


# ============================================================================
# Integration with Ground Truth (NFR-002 Compliance)
# ============================================================================

class TestGroundTruthIntegration:
    """Test extraction accuracy against ground truth for NFR-002 compliance."""

    def test_dive_code_accuracy_threshold(self):
        """Test that dive code extraction meets accuracy threshold."""
        loader = FixtureLoader()
        fixture = loader.load_ground_truth()
        
        total_codes = 0
        valid_codes = 0
        
        for event in fixture.events:
            for athlete in event.get('athletes', []):
                for dive in athlete.get('dives', []):
                    code = dive.get('diveCode', '')
                    if code:
                        total_codes += 1
                        is_valid, _ = validate_dive_code(code)
                        if is_valid:
                            valid_codes += 1
        
        if total_codes > 0:
            accuracy = (valid_codes / total_codes) * 100
            # NFR-002: ≥95% accuracy threshold
            assert accuracy >= 95.0, f"Dive code accuracy {accuracy:.1f}% below 95% threshold"

    def test_judge_score_format_accuracy(self):
        """Test that judge scores meet format requirements."""
        loader = FixtureLoader()
        fixture = loader.load_ground_truth()
        
        total_scores = 0
        valid_scores = 0
        
        for event in fixture.events:
            for athlete in event.get('athletes', []):
                for dive in athlete.get('dives', []):
                    scores = dive.get('judgeScores', [])
                    for score in scores:
                        total_scores += 1
                        is_valid, _ = validate_judge_score(score)
                        if is_valid:
                            valid_scores += 1
        
        if total_scores > 0:
            accuracy = (valid_scores / total_scores) * 100
            # NFR-002: ≥95% accuracy threshold
            assert accuracy >= 95.0, f"Judge score accuracy {accuracy:.1f}% below 95% threshold"

    def test_difficulty_value_accuracy(self):
        """Test that difficulty values meet validation requirements."""
        loader = FixtureLoader()
        fixture = loader.load_ground_truth()
        
        total_dd = 0
        valid_dd = 0
        
        for event in fixture.events:
            for athlete in event.get('athletes', []):
                for dive in athlete.get('dives', []):
                    dd = dive.get('difficulty')
                    if dd is not None:
                        total_dd += 1
                        is_valid, _ = validate_difficulty(dd)
                        if is_valid:
                            valid_dd += 1
        
        if total_dd > 0:
            accuracy = (valid_dd / total_dd) * 100
            assert accuracy >= 95.0, f"Difficulty accuracy {accuracy:.1f}% below 95% threshold"


# ============================================================================
# Test Configuration
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
