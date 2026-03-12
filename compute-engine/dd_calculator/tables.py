"""
FINA DD Lookup Tables

Contains all lookup tables for Degree of Difficulty calculation as per
FINA Competition Regulations APPENDIX 8 - Springboard.

Reference: https://resources.fina.org/fina/document/2025/07/01/ed3110a4-2291-411d-8526-6f641bd9237a/Competition-Regulations_June-2025_Clean-updated-01.07.2025-.pdf
"""

from typing import Optional, Dict, Tuple

# Direction codes
DIRECTION_FORWARD = 'forward'
DIRECTION_BACK = 'back'
DIRECTION_REVERSE = 'reverse'
DIRECTION_INWARD = 'inward'

# Position codes
POSITION_STRAIGHT = 'A'
POSITION_PIKE = 'B'
POSITION_TUCK = 'C'
POSITION_FREE = 'D'
POSITION_FLY = 'E'

# ============================================
# A. SOMERSAULTS TABLE
# Based on height (1m/3m) and number of half-somersaults
# ============================================
SOMERSAULTS_TABLE: Dict[str, Dict[float, float]] = {
    '1m': {
        0.0: 0.9,
        0.5: 1.1,
        1.0: 1.2,
        1.5: 1.6,
        2.0: 2.0,
        2.5: 2.4,
        3.0: 2.7,
        3.5: 3.0,
        4.0: 3.3,
        4.5: 3.8,
    },
    '3m': {
        0.0: 1.0,
        0.5: 1.3,
        1.0: 1.3,
        1.5: 1.5,
        2.0: 1.8,
        2.5: 2.2,
        3.0: 2.3,
        3.5: 2.8,
        4.0: 2.9,
        4.5: 3.5,
    }
}

# ============================================
# B. FLIGHT POSITION TABLE
# Based on position, direction, and somersault ranges
# Positions: C=Tuck, B=Pike, A=Straight, D=Free, E=Fly
# None indicates impossible combination
# ============================================

# Structure: POSITION_TABLE[somersault_range][position][direction]
POSITION_TABLE: Dict[str, Dict[str, Dict[str, Optional[float]]]] = {
    # 0-1 Somersaults (0, 0.5, 1.0)
    '0-1': {
        'C': {'forward': 0.1, 'back': 0.1, 'reverse': 0.1, 'inward': -0.3},
        'B': {'forward': 0.2, 'back': 0.2, 'reverse': 0.2, 'inward': -0.2},
        'A': {'forward': 0.3, 'back': 0.3, 'reverse': 0.3, 'inward': 0.1},
        'D': {'forward': 0.1, 'back': 0.1, 'reverse': 0.1, 'inward': -0.1},
        'E': {'forward': 0.2, 'back': 0.1, 'reverse': 0.1, 'inward': 0.4},
    },
    # 1.5-2 Somersaults (1.5, 2.0)
    '1.5-2': {
        'C': {'forward': 0.0, 'back': 0.0, 'reverse': 0.0, 'inward': 0.1},
        'B': {'forward': 0.1, 'back': 0.3, 'reverse': 0.3, 'inward': 0.3},
        'A': {'forward': 0.4, 'back': 0.5, 'reverse': 0.6, 'inward': 0.8},
        'D': {'forward': 0.0, 'back': -0.1, 'reverse': -0.1, 'inward': 0.2},
        'E': {'forward': 0.2, 'back': 0.2, 'reverse': 0.2, 'inward': 0.5},
    },
    # 2.5 Somersaults
    '2.5': {
        'C': {'forward': 0.0, 'back': 0.1, 'reverse': 0.0, 'inward': 0.2},
        'B': {'forward': 0.2, 'back': 0.3, 'reverse': 0.2, 'inward': 0.5},
        'A': {'forward': 0.6, 'back': 0.7, 'reverse': 0.6, 'inward': None},
        'D': {'forward': 0.0, 'back': -0.1, 'reverse': -0.2, 'inward': 0.4},
        'E': {'forward': 0.3, 'back': 0.3, 'reverse': 0.3, 'inward': 0.7},
    },
    # 3-3.5 Somersaults (3.0, 3.5)
    '3-3.5': {
        'C': {'forward': 0.0, 'back': 0.0, 'reverse': 0.0, 'inward': 0.3},
        'B': {'forward': 0.3, 'back': 0.3, 'reverse': 0.3, 'inward': 0.6},
        'A': {'forward': None, 'back': None, 'reverse': None, 'inward': None},
        'D': {'forward': 0.0, 'back': 0.0, 'reverse': 0.0, 'inward': None},
        'E': {'forward': 0.4, 'back': None, 'reverse': None, 'inward': None},
    },
    # 4-4.5 Somersaults (4.0, 4.5)
    '4-4.5': {
        'C': {'forward': 0.0, 'back': 0.1, 'reverse': 0.2, 'inward': 0.4},
        'B': {'forward': 0.4, 'back': 0.4, 'reverse': 0.5, 'inward': 0.8},
        'A': {'forward': None, 'back': None, 'reverse': None, 'inward': None},
        'D': {'forward': None, 'back': None, 'reverse': None, 'inward': None},
        'E': {'forward': None, 'back': None, 'reverse': None, 'inward': None},
    },
}


def get_somersault_range(half_somersaults: float) -> str:
    """Get the somersault range key for position lookup."""
    if half_somersaults <= 1.0:
        return '0-1'
    elif half_somersaults <= 2.0:
        return '1.5-2'
    elif half_somersaults == 2.5:
        return '2.5'
    elif half_somersaults <= 3.5:
        return '3-3.5'
    else:
        return '4-4.5'


# ============================================
# C. TWISTS TABLE
# Values based on twist count, somersault ranges, and direction
# ============================================

# Structure: TWISTS_TABLE[half_twists][somersault_category][direction]
# Categories: 'half-1' (0.5-1 som), '1.5-2' (1.5-2 som), '2.5' (2.5 som), '3-3.5' (3-3.5 som), '4-4.5' (4-4.5 som)
TWISTS_TABLE: Dict[float, Dict[str, Dict[str, float]]] = {
    # Half twist (1 half-twist)
    1.0: {
        'half-1': {'forward': 0.4, 'back': 0.2, 'reverse': 0.2, 'inward': 0.2},
        '1.5-2': {'forward': 0.4, 'back': 0.4, 'reverse': 0.4, 'inward': 0.4},
        '2.5': {'forward': 0.4, 'back': 0.0, 'reverse': 0.0, 'inward': 0.2},
        '3-3.5': {'forward': 0.4, 'back': 0.0, 'reverse': 0.0, 'inward': 0.4},
    },
    # 1 twist (2 half-twists)
    2.0: {
        'all': {'forward': 0.6, 'back': 0.4, 'reverse': 0.4, 'inward': 0.4},
    },
    # 1.5 twists (3 half-twists)
    3.0: {
        'half-2': {'forward': 0.8, 'back': 0.8, 'reverse': 0.8, 'inward': 0.8},
        '2.5-3.5': {'forward': 0.8, 'back': 0.7, 'reverse': 0.6, 'inward': 0.8},
    },
    # 2 twists (4 half-twists)
    4.0: {
        'all': {'forward': 1.0, 'back': 0.8, 'reverse': 0.8, 'inward': 0.8},
    },
    # 2.5 twists (5 half-twists)
    5.0: {
        'half-2': {'forward': 1.2, 'back': 1.2, 'reverse': 1.2, 'inward': 1.2},
        '2.5-3.5': {'forward': 1.2, 'back': 1.1, 'reverse': 1.0, 'inward': 1.2},
    },
    # 3 twists (6 half-twists)
    6.0: {
        'all': {'forward': 1.5, 'back': 1.4, 'reverse': 1.4, 'inward': 1.5},
    },
    # 3.5 twists (7 half-twists)
    7.0: {
        'all': {'forward': 1.6, 'back': 1.7, 'reverse': 1.8, 'inward': 1.6},
    },
    # 4 twists (8 half-twists)
    8.0: {
        'all': {'forward': 1.9, 'back': 1.8, 'reverse': 1.8, 'inward': 1.9},
    },
    # 4.5 twists (9 half-twists)
    9.0: {
        'all': {'forward': 2.0, 'back': 2.1, 'reverse': 2.1, 'inward': 2.0},
    },
}


def get_twist_somersault_category(half_somersaults: float, half_twists: float) -> str:
    """Get the somersault category for twist value lookup."""
    # For 1 twist (2 half-twists), 2 twists (4 half-twists), 3+ twists: use 'all' category
    if half_twists in [2.0, 4.0, 6.0, 7.0, 8.0, 9.0]:
        return 'all'
    
    # For half twist (1 half-twist)
    if half_twists == 1.0:
        if half_somersaults <= 1.0:
            return 'half-1'
        elif half_somersaults <= 2.0:
            return '1.5-2'
        elif half_somersaults == 2.5:
            return '2.5'
        else:
            return '3-3.5'
    
    # For 1.5 twists (3 half-twists) and 2.5 twists (5 half-twists)
    if half_twists in [3.0, 5.0]:
        if half_somersaults <= 2.0:
            return 'half-2'
        else:
            return '2.5-3.5'
    
    return 'all'


# ============================================
# D. APPROACH TABLE
# Values based on height, direction, and somersault ranges
# ============================================

# Structure: APPROACH_TABLE[height][direction][somersault_category]
APPROACH_TABLE: Dict[str, Dict[str, Dict[str, float]]] = {
    '1m': {
        'forward': {'half-3.5': 0.0, '4-4.5': 0.5},
        'back': {'half-3': 0.2, '3.5-4.5': 0.6},
        'reverse': {'half-3': 0.3, '3.5-4.5': 0.5},
        'inward': {'half-1': 0.6, '1.5-4.5': 0.5},
    },
    '3m': {
        'forward': {'half-3.5': 0.0, '4-4.5': 0.3},
        'back': {'half-3': 0.2, '3.5-4.5': 0.4},
        'reverse': {'half-3': 0.3, '3.5-4.5': 0.3},
        'inward': {'half-1': 0.3, '1.5-4.5': 0.3},
    },
}


def get_approach_somersault_category(direction: str, half_somersaults: float) -> str:
    """Get the somersault category for approach value lookup."""
    if direction == 'forward':
        if half_somersaults >= 4.0:
            return '4-4.5'
        return 'half-3.5'
    elif direction == 'back':
        if half_somersaults >= 3.5:
            return '3.5-4.5'
        return 'half-3'
    elif direction == 'reverse':
        if half_somersaults >= 3.5:
            return '3.5-4.5'
        return 'half-3'
    else:  # inward
        if half_somersaults <= 1.0:
            return 'half-1'
        return '1.5-4.5'


# ============================================
# E. UNNATURAL ENTRY TABLE
# Values when diver does not see water before entry
# Does NOT apply to twisting dives
# ============================================

# Structure: UNNATURAL_ENTRY_TABLE[direction_group][half_somersaults]
# None = diver sees water before entry (no penalty applies)
UNNATURAL_ENTRY_TABLE: Dict[str, Dict[float, Optional[float]]] = {
    'forward_inward': {
        0.5: None,  # sees water
        1.0: 0.1,
        1.5: None,  # sees water
        2.0: 0.2,
        2.5: None,  # sees water
        3.0: 0.2,
        3.5: None,  # sees water
        4.0: 0.2,
        4.5: None,  # sees water
    },
    'back_reverse': {
        0.5: 0.1,
        1.0: None,  # sees water
        1.5: 0.2,
        2.0: None,  # sees water
        2.5: 0.3,
        3.0: None,  # sees water
        3.5: 0.4,
        4.0: None,  # sees water
        4.5: 0.4,
    },
}


def get_entry_direction_group(direction: str) -> str:
    """Get the direction group for unnatural entry lookup."""
    if direction in ['forward', 'inward']:
        return 'forward_inward'
    return 'back_reverse'
