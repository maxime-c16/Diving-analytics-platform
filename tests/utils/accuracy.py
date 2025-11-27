"""
Accuracy Measurement Script for Diving Analytics Platform

Calculates NFR-002 compliance (% dives with all fields matching within tolerance)
for OCR extraction results against ground truth data.

Implements task T046a from Phase 6 (US4 - E2E Testing).
"""

import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

# Import comparison utilities
from comparison import (
    compare_dives,
    compare_athlete_results,
    compare_full_extraction,
    ComparisonTolerance,
    FullComparison,
)
from fixtures import FixtureLoader, LoadedFixture


@dataclass
class AccuracyMetrics:
    """Metrics for measuring extraction accuracy."""
    total_dives: int = 0
    fully_matching_dives: int = 0
    accuracy_percentage: float = 0.0
    
    # Field-level metrics
    dive_code_accuracy: float = 0.0
    difficulty_accuracy: float = 0.0
    judge_scores_accuracy: float = 0.0
    final_score_accuracy: float = 0.0
    round_number_accuracy: float = 0.0
    
    # NFR-002 compliance
    nfr_002_compliant: bool = False
    nfr_002_threshold: float = 95.0
    
    # Detailed breakdown
    field_accuracies: Dict[str, float] = None
    errors: List[str] = None


def calculate_accuracy(
    expected: Dict,
    actual: Dict,
    tolerance: ComparisonTolerance = None
) -> AccuracyMetrics:
    """
    Calculate extraction accuracy against ground truth.
    
    Args:
        expected: Ground truth data (from fixture)
        actual: Extracted data (from OCR)
        tolerance: Tolerance configuration for comparisons
    
    Returns:
        AccuracyMetrics with detailed accuracy breakdown
    """
    if tolerance is None:
        tolerance = ComparisonTolerance()
    
    # Use comparison utilities to get detailed results
    comparison = compare_full_extraction(expected, actual, tolerance)
    
    # Calculate accuracy metrics
    metrics = AccuracyMetrics(
        total_dives=comparison.total_dives,
        fully_matching_dives=comparison.matching_dives,
        accuracy_percentage=comparison.overall_match_percentage,
        field_accuracies=comparison.field_accuracies,
        errors=[]
    )
    
    # Extract field-level accuracies
    metrics.dive_code_accuracy = comparison.field_accuracies.get('diveCode', 0.0)
    metrics.difficulty_accuracy = comparison.field_accuracies.get('difficulty', 0.0)
    metrics.judge_scores_accuracy = comparison.field_accuracies.get('judgeScores', 0.0)
    metrics.final_score_accuracy = comparison.field_accuracies.get('finalScore', 0.0)
    metrics.round_number_accuracy = comparison.field_accuracies.get('roundNumber', 0.0)
    
    # Check NFR-002 compliance (≥95% accuracy)
    metrics.nfr_002_threshold = 95.0
    metrics.nfr_002_compliant = metrics.accuracy_percentage >= metrics.nfr_002_threshold
    
    # Collect errors from athlete comparisons
    for athlete_comp in comparison.athlete_comparisons:
        for dive_comp in athlete_comp.dive_comparisons:
            if not dive_comp.all_match:
                for field in dive_comp.fields:
                    if not field.matches:
                        error_msg = f"{athlete_comp.athlete_name} R{dive_comp.round_number}: {field.field_name} - {field.error_message or f'Expected {field.expected}, got {field.actual}'}"
                        metrics.errors.append(error_msg)
    
    return metrics


def generate_accuracy_report(metrics: AccuracyMetrics) -> str:
    """
    Generate a human-readable accuracy report.
    
    Args:
        metrics: Calculated accuracy metrics
    
    Returns:
        Formatted report string
    """
    report = []
    report.append("=" * 60)
    report.append("DIVING ANALYTICS OCR ACCURACY REPORT")
    report.append("=" * 60)
    report.append("")
    
    # Overall accuracy
    report.append(f"Overall Accuracy: {metrics.accuracy_percentage:.1f}%")
    report.append(f"Matching Dives: {metrics.fully_matching_dives}/{metrics.total_dives}")
    report.append("")
    
    # NFR-002 Compliance
    compliance_status = "✅ PASS" if metrics.nfr_002_compliant else "❌ FAIL"
    report.append(f"NFR-002 Compliance (≥{metrics.nfr_002_threshold}%): {compliance_status}")
    report.append("")
    
    # Field-level breakdown
    report.append("Field-Level Accuracy:")
    report.append("-" * 40)
    report.append(f"  Dive Code:     {metrics.dive_code_accuracy:.1f}%")
    report.append(f"  Difficulty:    {metrics.difficulty_accuracy:.1f}%")
    report.append(f"  Judge Scores:  {metrics.judge_scores_accuracy:.1f}%")
    report.append(f"  Final Score:   {metrics.final_score_accuracy:.1f}%")
    report.append(f"  Round Number:  {metrics.round_number_accuracy:.1f}%")
    report.append("")
    
    # Errors (first 10)
    if metrics.errors:
        report.append(f"Errors ({len(metrics.errors)} total, showing first 10):")
        report.append("-" * 40)
        for error in metrics.errors[:10]:
            report.append(f"  • {error}")
        if len(metrics.errors) > 10:
            report.append(f"  ... and {len(metrics.errors) - 10} more")
    else:
        report.append("No errors found - perfect extraction!")
    
    report.append("")
    report.append("=" * 60)
    
    return "\n".join(report)


def measure_extraction_accuracy(
    extraction_file: Optional[str] = None,
    ground_truth_file: Optional[str] = None,
    output_report: bool = True
) -> Tuple[AccuracyMetrics, str]:
    """
    Measure extraction accuracy against ground truth.
    
    Args:
        extraction_file: Path to extraction results JSON (or None for mock)
        ground_truth_file: Path to ground truth JSON (or None for default)
        output_report: Whether to print the report
    
    Returns:
        Tuple of (AccuracyMetrics, report_string)
    """
    # Load ground truth
    loader = FixtureLoader()
    
    if ground_truth_file:
        fixture = loader.load_ground_truth(ground_truth_file)
    else:
        fixture = loader.load_ground_truth()
    
    if not fixture.is_valid:
        raise ValueError(f"Ground truth validation errors: {fixture.validation_errors}")
    
    # Load extraction results
    if extraction_file:
        with open(extraction_file, 'r', encoding='utf-8') as f:
            extraction = json.load(f)
    else:
        # Use ground truth as extraction for testing
        # In real use, this would be actual OCR output
        extraction = fixture.raw_data
    
    # Calculate accuracy
    tolerance = ComparisonTolerance(
        final_score=fixture.tolerances.get('finalScore', 0.01),
        difficulty=fixture.tolerances.get('difficulty', 0.0),
        judge_score=fixture.tolerances.get('judgeScores', 0.0),
    )
    
    metrics = calculate_accuracy(fixture.raw_data, extraction, tolerance)
    
    # Generate report
    report = generate_accuracy_report(metrics)
    
    if output_report:
        print(report)
    
    return metrics, report


def validate_nfr_002_compliance(
    extraction_results: Dict,
    ground_truth: LoadedFixture
) -> Tuple[bool, AccuracyMetrics]:
    """
    Validate that extraction meets NFR-002 accuracy requirements.
    
    NFR-002 requires ≥95% of dives to have all fields matching
    within tolerance.
    
    Args:
        extraction_results: Extracted data from OCR
        ground_truth: Loaded ground truth fixture
    
    Returns:
        Tuple of (is_compliant, metrics)
    """
    tolerance = ComparisonTolerance(
        final_score=ground_truth.tolerances.get('finalScore', 0.01),
        difficulty=ground_truth.tolerances.get('difficulty', 0.0),
        judge_score=ground_truth.tolerances.get('judgeScores', 0.0),
    )
    
    metrics = calculate_accuracy(ground_truth.raw_data, extraction_results, tolerance)
    
    return metrics.nfr_002_compliant, metrics


# CLI entry point
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Calculate OCR extraction accuracy against ground truth"
    )
    parser.add_argument(
        "--extraction", "-e",
        help="Path to extraction results JSON file",
        default=None
    )
    parser.add_argument(
        "--ground-truth", "-g",
        help="Path to ground truth JSON file",
        default=None
    )
    parser.add_argument(
        "--json-output", "-j",
        help="Output results as JSON instead of report",
        action="store_true"
    )
    
    args = parser.parse_args()
    
    try:
        metrics, report = measure_extraction_accuracy(
            extraction_file=args.extraction,
            ground_truth_file=args.ground_truth,
            output_report=not args.json_output
        )
        
        if args.json_output:
            # Output as JSON
            output = {
                "total_dives": metrics.total_dives,
                "matching_dives": metrics.fully_matching_dives,
                "accuracy_percentage": metrics.accuracy_percentage,
                "nfr_002_compliant": metrics.nfr_002_compliant,
                "field_accuracies": metrics.field_accuracies,
                "error_count": len(metrics.errors) if metrics.errors else 0,
            }
            print(json.dumps(output, indent=2))
        
        # Exit with code based on NFR-002 compliance
        exit(0 if metrics.nfr_002_compliant else 1)
        
    except Exception as e:
        print(f"Error: {e}")
        exit(2)
