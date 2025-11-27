"""
Validation Utilities for Diving Analytics Platform

Provides validation functions for dive codes, judge scores, and difficulty values.
Based on FINA regulations and diving competition rules.
"""

import re
from typing import List, Optional, Tuple


# Dive code pattern: Group (1-6), Somersaults (0-4), [Twists (0-4)], [Extra (1-4)], Position (A-D)
DIVE_CODE_PATTERN = re.compile(r'^[1-6]\d{2,3}[A-D]$', re.IGNORECASE)

# Judge score constraints
MIN_JUDGE_SCORE = 0.0
MAX_JUDGE_SCORE = 10.0
JUDGE_SCORE_INCREMENT = 0.5

# Difficulty (DD) constraints
MIN_DIFFICULTY = 1.0
MAX_DIFFICULTY = 4.5

# Position descriptions
POSITIONS = {
    'A': 'Straight',
    'B': 'Pike',
    'C': 'Tuck',
    'D': 'Free'
}

# Group descriptions
GROUPS = {
    1: 'Forward',
    2: 'Back',
    3: 'Reverse',
    4: 'Inward',
    5: 'Twist',
    6: 'Armstand'
}


def validate_dive_code(code: str, height: Optional[str] = None) -> Tuple[bool, Optional[str]]:
    """
    Validate dive code format and constraints.
    
    Args:
        code: Dive code string (e.g., "101A", "5231D")
        height: Optional height context ("3m", "10m", etc.) for group 6 validation
    
    Returns:
        Tuple of (is_valid, error_message)
    
    Examples:
        >>> validate_dive_code("101A")
        (True, None)
        >>> validate_dive_code("701A")  # Invalid group
        (False, "Invalid group: 7. Must be 1-6.")
        >>> validate_dive_code("101E")  # Invalid position
        (False, "Invalid position: E. Must be A-D.")
    """
    if not code:
        return False, "Empty dive code"
    
    # Normalize to uppercase
    code = code.upper().strip()
    
    # Check basic format
    if not DIVE_CODE_PATTERN.match(code):
        return False, f"Invalid dive code format: {code}. Expected pattern: [1-6]XX[X][A-D]"
    
    # Extract components
    group = int(code[0])
    position = code[-1]
    
    # Validate group
    if group not in GROUPS:
        return False, f"Invalid group: {group}. Must be 1-6."
    
    # Validate position
    if position not in POSITIONS:
        return False, f"Invalid position: {position}. Must be A-D."
    
    # Group 6 (armstand) only valid for platform diving
    if group == 6 and height:
        if height.lower() in ['1m', '3m']:
            return False, f"Armstand dives (group 6) not valid for springboard ({height})"
    
    # Position D (free) only valid for twist dives (group 5) or armstand (group 6)
    if position == 'D' and group not in [5, 6]:
        return False, f"Free position (D) only valid for twist (5) or armstand (6) dives"
    
    return True, None


def validate_judge_score(score: float) -> Tuple[bool, Optional[str]]:
    """
    Validate judge score according to diving competition rules.
    
    Judge scores must be:
    - Between 0.0 and 10.0 (inclusive)
    - In 0.5 increments (0, 0.5, 1.0, 1.5, ..., 10.0)
    
    Args:
        score: The judge score to validate
    
    Returns:
        Tuple of (is_valid, error_message)
    
    Examples:
        >>> validate_judge_score(7.5)
        (True, None)
        >>> validate_judge_score(6.3)  # Not on 0.5 increment
        (False, "Score 6.3 not on 0.5 increment")
        >>> validate_judge_score(11.0)  # Out of range
        (False, "Score 11.0 out of range (0-10)")
    """
    if score is None:
        return False, "Score is None"
    
    # Check range
    if not MIN_JUDGE_SCORE <= score <= MAX_JUDGE_SCORE:
        return False, f"Score {score} out of range ({MIN_JUDGE_SCORE}-{MAX_JUDGE_SCORE})"
    
    # Check 0.5 increment
    if (score * 2) != int(score * 2):
        return False, f"Score {score} not on {JUDGE_SCORE_INCREMENT} increment"
    
    return True, None


def validate_judge_scores(scores: List[float]) -> Tuple[bool, List[str]]:
    """
    Validate a list of judge scores (typically 5-7 judges).
    
    Args:
        scores: List of judge scores
    
    Returns:
        Tuple of (all_valid, list_of_errors)
    """
    errors = []
    
    if not scores:
        return False, ["Empty scores list"]
    
    if len(scores) < 3:
        errors.append(f"Too few judges: {len(scores)}. Minimum 3 required.")
    
    if len(scores) > 7:
        errors.append(f"Too many judges: {len(scores)}. Maximum 7 expected.")
    
    for i, score in enumerate(scores):
        is_valid, error = validate_judge_score(score)
        if not is_valid:
            errors.append(f"Judge {i+1}: {error}")
    
    return len(errors) == 0, errors


def validate_difficulty(difficulty: float) -> Tuple[bool, Optional[str]]:
    """
    Validate dive difficulty (DD) value.
    
    Difficulty values must be:
    - Between 1.0 and 4.5 (inclusive)
    - In 0.1 increments
    
    Args:
        difficulty: The difficulty value to validate
    
    Returns:
        Tuple of (is_valid, error_message)
    
    Examples:
        >>> validate_difficulty(2.0)
        (True, None)
        >>> validate_difficulty(5.0)  # Too high
        (False, "Difficulty 5.0 out of range (1.0-4.5)")
        >>> validate_difficulty(2.05)  # Not on 0.1 increment
        (False, "Difficulty 2.05 not on 0.1 increment")
    """
    if difficulty is None:
        return False, "Difficulty is None"
    
    # Check range
    if not MIN_DIFFICULTY <= difficulty <= MAX_DIFFICULTY:
        return False, f"Difficulty {difficulty} out of range ({MIN_DIFFICULTY}-{MAX_DIFFICULTY})"
    
    # Check 0.1 increment (with floating point tolerance)
    if abs(round(difficulty * 10) - (difficulty * 10)) > 0.001:
        return False, f"Difficulty {difficulty} not on 0.1 increment"
    
    return True, None


def validate_final_score(score: float, max_score: float = 200.0) -> Tuple[bool, Optional[str]]:
    """
    Validate final/dive points score.
    
    Args:
        score: The final score to validate
        max_score: Maximum expected score (default 200 for single dive)
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    if score is None:
        return False, "Score is None"
    
    if score < 0:
        return False, f"Score {score} cannot be negative"
    
    if score > max_score:
        return False, f"Score {score} exceeds maximum expected ({max_score})"
    
    return True, None


def validate_round_number(round_num: int, max_rounds: int = 10) -> Tuple[bool, Optional[str]]:
    """
    Validate round number.
    
    Args:
        round_num: The round number to validate
        max_rounds: Maximum number of rounds expected (default 10)
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    if round_num is None:
        return False, "Round number is None"
    
    if round_num < 1:
        return False, f"Round number {round_num} must be >= 1"
    
    if round_num > max_rounds:
        return False, f"Round number {round_num} exceeds maximum ({max_rounds})"
    
    return True, None


def parse_dive_code(code: str) -> Optional[dict]:
    """
    Parse a dive code into its components.
    
    Args:
        code: Dive code string (e.g., "5231D")
    
    Returns:
        Dictionary with parsed components, or None if invalid
    
    Examples:
        >>> parse_dive_code("5231D")
        {'group': 5, 'somersaults': 2, 'twists': 3, 'extra': 1, 'position': 'D', 
         'group_name': 'Twist', 'position_name': 'Free'}
    """
    is_valid, error = validate_dive_code(code)
    if not is_valid:
        return None
    
    code = code.upper().strip()
    group = int(code[0])
    position = code[-1]
    
    # Parse numeric portion
    numeric_part = code[1:-1]
    somersaults = int(numeric_part[0]) if len(numeric_part) >= 1 else 0
    twists = int(numeric_part[1]) if len(numeric_part) >= 2 else 0
    extra = int(numeric_part[2]) if len(numeric_part) >= 3 else None
    
    return {
        'group': group,
        'somersaults': somersaults,
        'twists': twists,
        'extra': extra,
        'position': position,
        'group_name': GROUPS.get(group, 'Unknown'),
        'position_name': POSITIONS.get(position, 'Unknown')
    }


def calculate_dive_score(
    judge_scores: List[float],
    difficulty: float
) -> Optional[float]:
    """
    Calculate dive score from judge scores and difficulty.
    
    The calculation follows FINA rules:
    1. Drop the highest and lowest scores
    2. Sum the remaining scores
    3. Multiply by the difficulty
    
    Args:
        judge_scores: List of judge scores (must be at least 3)
        difficulty: Dive difficulty (DD)
    
    Returns:
        Calculated dive score, or None if inputs invalid
    """
    # Validate inputs
    scores_valid, _ = validate_judge_scores(judge_scores)
    dd_valid, _ = validate_difficulty(difficulty)
    
    if not scores_valid or not dd_valid:
        return None
    
    if len(judge_scores) < 3:
        return None
    
    # Sort and drop high/low
    sorted_scores = sorted(judge_scores)
    effective_scores = sorted_scores[1:-1]  # Drop first (lowest) and last (highest)
    
    # Calculate final score
    score_sum = sum(effective_scores)
    final_score = score_sum * difficulty
    
    # Round to 2 decimal places
    return round(final_score, 2)
