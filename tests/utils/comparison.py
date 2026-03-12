"""
Test Comparison Utilities for Diving Analytics Platform

Provides functions to compare extracted diving data against ground truth,
using configurable tolerance values for different field types.
"""

from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass


@dataclass
class ComparisonTolerance:
    """Tolerance configuration for field comparisons."""
    final_score: float = 0.01      # ±0.01 for final scores
    difficulty: float = 0.0        # Exact match for difficulty
    judge_score: float = 0.0       # Exact match for judge scores
    dive_code: str = "exact"       # Exact match for dive codes
    round_number: int = 0          # Exact match for round numbers


@dataclass
class FieldComparison:
    """Result of comparing a single field."""
    field_name: str
    expected: Any
    actual: Any
    matches: bool
    difference: Optional[float] = None
    error_message: Optional[str] = None


@dataclass
class DiveComparison:
    """Result of comparing a single dive."""
    athlete_name: str
    round_number: int
    fields: List[FieldComparison]
    all_match: bool
    match_percentage: float


@dataclass
class AthleteComparison:
    """Result of comparing an athlete's results."""
    athlete_name: str
    event_name: str
    dive_comparisons: List[DiveComparison]
    all_match: bool
    match_percentage: float
    total_dives: int
    matching_dives: int


@dataclass
class FullComparison:
    """Result of comparing full extraction against ground truth."""
    athlete_comparisons: List[AthleteComparison]
    overall_match_percentage: float
    total_dives: int
    matching_dives: int
    field_accuracies: Dict[str, float]
    summary: str


def compare_numeric(
    expected: float,
    actual: float,
    tolerance: float = 0.0
) -> Tuple[bool, Optional[float]]:
    """
    Compare two numeric values with tolerance.
    
    Args:
        expected: Expected value
        actual: Actual value
        tolerance: Allowed difference
    
    Returns:
        Tuple of (matches, difference)
    """
    if expected is None or actual is None:
        return expected == actual, None
    
    difference = abs(expected - actual)
    matches = difference <= tolerance
    return matches, difference


def compare_string(
    expected: str,
    actual: str,
    case_sensitive: bool = False
) -> Tuple[bool, Optional[str]]:
    """
    Compare two string values.
    
    Args:
        expected: Expected value
        actual: Actual value
        case_sensitive: Whether comparison is case sensitive
    
    Returns:
        Tuple of (matches, error_message)
    """
    if expected is None or actual is None:
        return expected == actual, None if expected == actual else "One value is None"
    
    if case_sensitive:
        matches = expected == actual
    else:
        matches = expected.upper() == actual.upper()
    
    if matches:
        return True, None
    
    return False, f"Expected '{expected}', got '{actual}'"


def compare_list(
    expected: List,
    actual: List,
    element_tolerance: float = 0.0
) -> Tuple[bool, List[str]]:
    """
    Compare two lists of numeric values.
    
    Args:
        expected: Expected list
        actual: Actual list
        element_tolerance: Tolerance for each element
    
    Returns:
        Tuple of (all_match, list_of_errors)
    """
    errors = []
    
    if expected is None or actual is None:
        if expected != actual:
            errors.append("One list is None")
        return len(errors) == 0, errors
    
    if len(expected) != len(actual):
        errors.append(f"Length mismatch: expected {len(expected)}, got {len(actual)}")
        return False, errors
    
    for i, (exp, act) in enumerate(zip(expected, actual)):
        matches, diff = compare_numeric(exp, act, element_tolerance)
        if not matches:
            errors.append(f"Element {i}: expected {exp}, got {act} (diff: {diff})")
    
    return len(errors) == 0, errors


def compare_dives(
    expected_dive: Dict,
    actual_dive: Dict,
    tolerance: ComparisonTolerance = None
) -> DiveComparison:
    """
    Compare an expected dive against actual extracted dive.
    
    Args:
        expected_dive: Ground truth dive data
        actual_dive: Extracted dive data
        tolerance: Tolerance configuration
    
    Returns:
        DiveComparison with detailed field results
    """
    if tolerance is None:
        tolerance = ComparisonTolerance()
    
    fields = []
    
    # Compare dive code (exact match)
    exp_code = expected_dive.get('diveCode', expected_dive.get('dive_code', ''))
    act_code = actual_dive.get('diveCode', actual_dive.get('dive_code', ''))
    code_match, code_error = compare_string(exp_code, act_code, case_sensitive=False)
    fields.append(FieldComparison(
        field_name='diveCode',
        expected=exp_code,
        actual=act_code,
        matches=code_match,
        error_message=code_error
    ))
    
    # Compare difficulty
    exp_dd = expected_dive.get('difficulty', 0)
    act_dd = actual_dive.get('difficulty', 0)
    dd_match, dd_diff = compare_numeric(exp_dd, act_dd, tolerance.difficulty)
    fields.append(FieldComparison(
        field_name='difficulty',
        expected=exp_dd,
        actual=act_dd,
        matches=dd_match,
        difference=dd_diff
    ))
    
    # Compare final score
    exp_score = expected_dive.get('finalScore', expected_dive.get('final_score', 
                expected_dive.get('divePoints', expected_dive.get('dive_points', 0))))
    act_score = actual_dive.get('finalScore', actual_dive.get('final_score',
                actual_dive.get('divePoints', actual_dive.get('dive_points', 0))))
    score_match, score_diff = compare_numeric(exp_score, act_score, tolerance.final_score)
    fields.append(FieldComparison(
        field_name='finalScore',
        expected=exp_score,
        actual=act_score,
        matches=score_match,
        difference=score_diff
    ))
    
    # Compare judge scores
    exp_scores = expected_dive.get('judgeScores', expected_dive.get('judge_scores', []))
    act_scores = actual_dive.get('judgeScores', actual_dive.get('judge_scores', []))
    scores_match, scores_errors = compare_list(exp_scores, act_scores, tolerance.judge_score)
    fields.append(FieldComparison(
        field_name='judgeScores',
        expected=exp_scores,
        actual=act_scores,
        matches=scores_match,
        error_message="; ".join(scores_errors) if scores_errors else None
    ))
    
    # Compare round number
    exp_round = expected_dive.get('roundNumber', expected_dive.get('round_number', 0))
    act_round = actual_dive.get('roundNumber', actual_dive.get('round_number', 0))
    round_match, round_diff = compare_numeric(exp_round, act_round, tolerance.round_number)
    fields.append(FieldComparison(
        field_name='roundNumber',
        expected=exp_round,
        actual=act_round,
        matches=round_match,
        difference=round_diff
    ))
    
    # Calculate overall match
    matching_fields = sum(1 for f in fields if f.matches)
    all_match = matching_fields == len(fields)
    match_percentage = (matching_fields / len(fields)) * 100 if fields else 0
    
    return DiveComparison(
        athlete_name=expected_dive.get('athleteName', expected_dive.get('athlete_name', 'Unknown')),
        round_number=exp_round,
        fields=fields,
        all_match=all_match,
        match_percentage=match_percentage
    )


def compare_athlete_results(
    expected_athlete: Dict,
    actual_athlete: Dict,
    tolerance: ComparisonTolerance = None
) -> AthleteComparison:
    """
    Compare an expected athlete's results against actual extraction.
    
    Args:
        expected_athlete: Ground truth athlete data
        actual_athlete: Extracted athlete data
        tolerance: Tolerance configuration
    
    Returns:
        AthleteComparison with detailed dive results
    """
    if tolerance is None:
        tolerance = ComparisonTolerance()
    
    athlete_name = expected_athlete.get('firstName', '') + ' ' + expected_athlete.get('lastName', '')
    event_name = expected_athlete.get('event', expected_athlete.get('eventName', 'Unknown'))
    
    expected_dives = expected_athlete.get('dives', [])
    actual_dives = actual_athlete.get('dives', [])
    
    dive_comparisons = []
    
    # Match dives by round number
    for exp_dive in expected_dives:
        exp_round = exp_dive.get('roundNumber', exp_dive.get('round_number', 0))
        
        # Find matching dive in actual
        matching_actual = None
        for act_dive in actual_dives:
            act_round = act_dive.get('roundNumber', act_dive.get('round_number', 0))
            if act_round == exp_round:
                matching_actual = act_dive
                break
        
        if matching_actual:
            comparison = compare_dives(exp_dive, matching_actual, tolerance)
            comparison.athlete_name = athlete_name
            dive_comparisons.append(comparison)
        else:
            # Create failed comparison for missing dive
            dive_comparisons.append(DiveComparison(
                athlete_name=athlete_name,
                round_number=exp_round,
                fields=[FieldComparison(
                    field_name='dive',
                    expected=exp_dive,
                    actual=None,
                    matches=False,
                    error_message=f"Missing dive for round {exp_round}"
                )],
                all_match=False,
                match_percentage=0.0
            ))
    
    # Calculate overall match
    matching_dives = sum(1 for d in dive_comparisons if d.all_match)
    total_dives = len(dive_comparisons)
    all_match = matching_dives == total_dives
    match_percentage = (matching_dives / total_dives) * 100 if total_dives > 0 else 0
    
    return AthleteComparison(
        athlete_name=athlete_name,
        event_name=event_name,
        dive_comparisons=dive_comparisons,
        all_match=all_match,
        match_percentage=match_percentage,
        total_dives=total_dives,
        matching_dives=matching_dives
    )


def compare_full_extraction(
    expected: Dict,
    actual: Dict,
    tolerance: ComparisonTolerance = None
) -> FullComparison:
    """
    Compare full extraction result against ground truth.
    
    Args:
        expected: Ground truth data (from fixture)
        actual: Extracted data (from OCR)
        tolerance: Tolerance configuration
    
    Returns:
        FullComparison with comprehensive results
    """
    if tolerance is None:
        tolerance = ComparisonTolerance()
    
    athlete_comparisons = []
    field_match_counts = {
        'diveCode': {'matched': 0, 'total': 0},
        'difficulty': {'matched': 0, 'total': 0},
        'finalScore': {'matched': 0, 'total': 0},
        'judgeScores': {'matched': 0, 'total': 0},
        'roundNumber': {'matched': 0, 'total': 0},
    }
    
    # Get events from expected data
    expected_events = expected.get('events', [])
    actual_events = actual.get('events', actual.get('dives', []))
    
    total_dives = 0
    matching_dives = 0
    
    for exp_event in expected_events:
        event_name = exp_event.get('name', 'Unknown')
        exp_athletes = exp_event.get('athletes', [])
        
        for exp_athlete in exp_athletes:
            athlete_name = exp_athlete.get('firstName', '') + ' ' + exp_athlete.get('lastName', '')
            
            # Find matching athlete in actual
            actual_athlete = None
            if isinstance(actual_events, list) and actual_events and isinstance(actual_events[0], dict):
                # Check if actual is structured by events or flat
                if 'athletes' in actual_events[0]:
                    for act_event in actual_events:
                        for act_ath in act_event.get('athletes', []):
                            act_name = act_ath.get('firstName', '') + ' ' + act_ath.get('lastName', '')
                            if act_name.upper() == athlete_name.upper():
                                actual_athlete = act_ath
                                break
                else:
                    # Flat structure - search by name in dives
                    actual_athlete = {'dives': [
                        d for d in actual_events 
                        if (d.get('athleteName', d.get('athlete_name', '')).upper() == 
                            athlete_name.upper())
                    ]}
            
            if actual_athlete:
                comparison = compare_athlete_results(exp_athlete, actual_athlete, tolerance)
            else:
                comparison = AthleteComparison(
                    athlete_name=athlete_name,
                    event_name=event_name,
                    dive_comparisons=[],
                    all_match=False,
                    match_percentage=0.0,
                    total_dives=len(exp_athlete.get('dives', [])),
                    matching_dives=0
                )
            
            comparison.event_name = event_name
            athlete_comparisons.append(comparison)
            
            total_dives += comparison.total_dives
            matching_dives += comparison.matching_dives
            
            # Aggregate field match counts
            for dive_comp in comparison.dive_comparisons:
                for field in dive_comp.fields:
                    if field.field_name in field_match_counts:
                        field_match_counts[field.field_name]['total'] += 1
                        if field.matches:
                            field_match_counts[field.field_name]['matched'] += 1
    
    # Calculate field accuracies
    field_accuracies = {}
    for field_name, counts in field_match_counts.items():
        if counts['total'] > 0:
            field_accuracies[field_name] = (counts['matched'] / counts['total']) * 100
        else:
            field_accuracies[field_name] = 0.0
    
    # Calculate overall match percentage
    overall_match = (matching_dives / total_dives) * 100 if total_dives > 0 else 0
    
    # Generate summary
    summary = (
        f"Extraction Accuracy: {overall_match:.1f}% ({matching_dives}/{total_dives} dives)\n"
        f"Field Accuracies:\n"
    )
    for field, accuracy in field_accuracies.items():
        summary += f"  - {field}: {accuracy:.1f}%\n"
    
    return FullComparison(
        athlete_comparisons=athlete_comparisons,
        overall_match_percentage=overall_match,
        total_dives=total_dives,
        matching_dives=matching_dives,
        field_accuracies=field_accuracies,
        summary=summary
    )
