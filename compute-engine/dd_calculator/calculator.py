"""
FINA Degree of Difficulty (DD) Calculator

Main calculation module implementing the official DD formula:
DD = A + B + C + D + E

Reference: FINA Competition Regulations APPENDIX 8 - Springboard
"""

import re
from dataclasses import dataclass
from typing import Optional, Tuple

from .tables import (
    SOMERSAULTS_TABLE,
    POSITION_TABLE,
    TWISTS_TABLE,
    APPROACH_TABLE,
    UNNATURAL_ENTRY_TABLE,
    get_somersault_range,
    get_twist_somersault_category,
    get_approach_somersault_category,
    get_entry_direction_group,
)


@dataclass
class ParsedDive:
    """Represents a parsed dive code."""
    code: str
    direction: str
    half_somersaults: float
    half_twists: float
    position: str
    is_twisting_dive: bool


@dataclass
class DDResult:
    """Result of DD calculation with component breakdown."""
    dd: float
    components: dict
    dive: ParsedDive
    height: str
    error: Optional[str] = None


def parse_dive_code(code: str) -> Optional[ParsedDive]:
    """
    Parse a dive code into its components.
    
    Dive code format:
    - Non-twisting dives: XYZ[P] where X=direction, YZ=half-somersaults, P=position
      Examples: 101C, 201B, 307C
    - Twisting dives: 5XYZ[P] where X=direction, Y=half-somersaults, Z=half-twists, P=position
      Examples: 5132D, 5253B, 5355B
    
    Direction codes:
    - 1=Forward, 2=Back, 3=Reverse, 4=Inward
    - For twist dives (5xxx): second digit indicates direction
    
    Position codes:
    - A=Straight, B=Pike, C=Tuck, D=Free
    
    Args:
        code: The dive code string (e.g., "207B", "5253B")
        
    Returns:
        ParsedDive object or None if invalid code
    """
    code = code.strip().upper()
    
    # Match patterns: 3 digits + position letter OR 4 digits + position letter
    match = re.match(r'^(\d{3,4})([ABCD])$', code)
    if not match:
        return None
    
    number_part = match.group(1)
    position = match.group(2)
    
    direction_map = {1: 'forward', 2: 'back', 3: 'reverse', 4: 'inward'}
    
    if number_part.startswith('5'):
        # Twisting dive: 5XYZ where X=direction, Y=half-somersaults, Z=half-twists
        if len(number_part) != 4:
            return None
        
        twist_direction = int(number_part[1])
        if twist_direction not in direction_map:
            return None
        
        direction = direction_map[twist_direction]
        half_somersaults = float(number_part[2])
        half_twists = float(number_part[3])
        
        # Convert single digit to half values (e.g., 3 -> 1.5 somersaults)
        half_somersaults = half_somersaults / 2.0
        
        return ParsedDive(
            code=code,
            direction=direction,
            half_somersaults=half_somersaults,
            half_twists=half_twists,
            position=position,
            is_twisting_dive=True
        )
    else:
        # Non-twisting dive: XYZ where X=direction, Y=type modifier, Z=half-somersaults
        # E.g., 207 = direction 2 (back), type 0, 7 half-somersaults = 3.5 somersaults
        # E.g., 313 = direction 3 (reverse), type 1 (flying), 3 half-somersaults = 1.5 somersaults
        if len(number_part) != 3:
            return None
        
        first_digit = int(number_part[0])
        if first_digit not in direction_map:
            return None
        
        direction = direction_map[first_digit]
        # The third digit represents the number of half-somersaults
        half_somersaults_count = int(number_part[2])
        half_somersaults = half_somersaults_count / 2.0
        
        return ParsedDive(
            code=code,
            direction=direction,
            half_somersaults=half_somersaults,
            half_twists=0.0,
            position=position,
            is_twisting_dive=False
        )


def validate_position_rules(dive: ParsedDive) -> Optional[str]:
    """
    Validate position rules for twisting dives.
    
    Rules:
    - Dives with 0.5 somersault and twists: only A, B, or C positions
    - Dives with 1 or 1.5 somersaults and twists: only D position
    - Dives with 2+ somersaults and twists: only B or C positions
    
    Args:
        dive: ParsedDive object
        
    Returns:
        Error message if invalid, None if valid
    """
    if not dive.is_twisting_dive or dive.half_twists == 0:
        return None
    
    somersaults = dive.half_somersaults
    position = dive.position
    
    if somersaults == 0.5:
        if position not in ['A', 'B', 'C']:
            return f"Dives with ½ somersault and twists can only use positions A, B, or C"
    elif somersaults in [1.0, 1.5]:
        if position != 'D':
            return f"Dives with 1 or 1½ somersaults and twists must use position D"
    elif somersaults >= 2.0:
        if position not in ['B', 'C']:
            return f"Dives with 2+ somersaults and twists can only use positions B or C"
    
    return None


def calculate_component_a(height: str, half_somersaults: float) -> Optional[float]:
    """
    Calculate Component A (Somersaults).
    
    Args:
        height: Board height ('1m' or '3m')
        half_somersaults: Number of half-somersaults
        
    Returns:
        Component A value or None if invalid
    """
    if height not in SOMERSAULTS_TABLE:
        return None
    
    return SOMERSAULTS_TABLE[height].get(half_somersaults)


def calculate_component_b(dive: ParsedDive) -> Tuple[Optional[float], Optional[str]]:
    """
    Calculate Component B (Flight Position).
    
    Args:
        dive: ParsedDive object
        
    Returns:
        Tuple of (component B value, error message)
    """
    somersault_range = get_somersault_range(dive.half_somersaults)
    position = dive.position
    direction = dive.direction
    
    if somersault_range not in POSITION_TABLE:
        return None, f"Invalid somersault range: {somersault_range}"
    
    if position not in POSITION_TABLE[somersault_range]:
        return None, f"Invalid position: {position}"
    
    if direction not in POSITION_TABLE[somersault_range][position]:
        return None, f"Invalid direction: {direction}"
    
    value = POSITION_TABLE[somersault_range][position][direction]
    
    if value is None:
        return None, f"Impossible combination: {position} position with {direction} direction at {dive.half_somersaults} somersaults"
    
    return value, None


def calculate_component_c(dive: ParsedDive) -> Tuple[float, Optional[str]]:
    """
    Calculate Component C (Twists).
    
    Args:
        dive: ParsedDive object
        
    Returns:
        Tuple of (component C value, error message)
    """
    if dive.half_twists == 0:
        return 0.0, None
    
    half_twists = dive.half_twists
    
    if half_twists not in TWISTS_TABLE:
        return 0.0, f"Invalid twist count: {half_twists} half-twists"
    
    category = get_twist_somersault_category(dive.half_somersaults, half_twists)
    twist_data = TWISTS_TABLE[half_twists]
    
    if category not in twist_data:
        # Try 'all' category as fallback
        if 'all' in twist_data:
            category = 'all'
        else:
            return 0.0, f"Invalid somersault category for twist lookup: {category}"
    
    if dive.direction not in twist_data[category]:
        return 0.0, f"Invalid direction for twist: {dive.direction}"
    
    return twist_data[category][dive.direction], None


def calculate_component_d(height: str, dive: ParsedDive) -> Optional[float]:
    """
    Calculate Component D (Approach).
    
    Args:
        height: Board height ('1m' or '3m')
        dive: ParsedDive object
        
    Returns:
        Component D value or None if invalid
    """
    if height not in APPROACH_TABLE:
        return None
    
    if dive.direction not in APPROACH_TABLE[height]:
        return None
    
    category = get_approach_somersault_category(dive.direction, dive.half_somersaults)
    
    return APPROACH_TABLE[height][dive.direction].get(category)


def calculate_component_e(dive: ParsedDive) -> float:
    """
    Calculate Component E (Unnatural Entry).
    
    Does NOT apply to twisting dives.
    
    Args:
        dive: ParsedDive object
        
    Returns:
        Component E value (0.0 if not applicable)
    """
    # Component E does not apply to twisting dives
    if dive.is_twisting_dive and dive.half_twists > 0:
        return 0.0
    
    direction_group = get_entry_direction_group(dive.direction)
    
    entry_value = UNNATURAL_ENTRY_TABLE[direction_group].get(dive.half_somersaults)
    
    # None means diver sees water (no penalty)
    if entry_value is None:
        return 0.0
    
    return entry_value


def calculate_dd(dive_code: str, height: str = '3m', position: Optional[str] = None) -> DDResult:
    """
    Calculate the Degree of Difficulty (DD) for a dive.
    
    DD = A + B + C + D + E
    
    Args:
        dive_code: The dive code (e.g., "207B", "5253B")
                   Can include position letter or pass separately
        height: Board height ('1m' or '3m'), defaults to '3m'
        position: Optional position override if not in dive_code
        
    Returns:
        DDResult with DD value, component breakdown, and any errors
    """
    # Normalize height
    height = height.lower()
    if height not in ['1m', '3m']:
        return DDResult(
            dd=0.0,
            components={},
            dive=None,
            height=height,
            error=f"Invalid height: {height}. Must be '1m' or '3m'"
        )
    
    # If position passed separately, append to code
    if position and not dive_code[-1].upper() in 'ABCD':
        dive_code = dive_code + position
    
    # Parse the dive code
    dive = parse_dive_code(dive_code)
    if not dive:
        return DDResult(
            dd=0.0,
            components={},
            dive=None,
            height=height,
            error=f"Invalid dive code: {dive_code}"
        )
    
    # Validate position rules for twisting dives
    position_error = validate_position_rules(dive)
    if position_error:
        return DDResult(
            dd=0.0,
            components={},
            dive=dive,
            height=height,
            error=position_error
        )
    
    # Calculate each component
    components = {}
    
    # A. Somersaults
    comp_a = calculate_component_a(height, dive.half_somersaults)
    if comp_a is None:
        return DDResult(
            dd=0.0,
            components={},
            dive=dive,
            height=height,
            error=f"Invalid somersault count for height {height}: {dive.half_somersaults}"
        )
    components['A'] = comp_a
    
    # B. Flight Position
    comp_b, error_b = calculate_component_b(dive)
    if error_b:
        return DDResult(
            dd=0.0,
            components=components,
            dive=dive,
            height=height,
            error=error_b
        )
    components['B'] = comp_b
    
    # C. Twists
    comp_c, error_c = calculate_component_c(dive)
    if error_c:
        return DDResult(
            dd=0.0,
            components=components,
            dive=dive,
            height=height,
            error=error_c
        )
    components['C'] = comp_c
    
    # D. Approach
    comp_d = calculate_component_d(height, dive)
    if comp_d is None:
        return DDResult(
            dd=0.0,
            components=components,
            dive=dive,
            height=height,
            error=f"Could not calculate approach component"
        )
    components['D'] = comp_d
    
    # E. Unnatural Entry
    comp_e = calculate_component_e(dive)
    components['E'] = comp_e
    
    # Calculate total DD
    dd = round(comp_a + comp_b + comp_c + comp_d + comp_e, 1)
    
    return DDResult(
        dd=dd,
        components=components,
        dive=dive,
        height=height
    )
