"""
FINA Degree of Difficulty (DD) Calculator

Implements the official World Aquatics (FINA) DD calculation for springboard diving
(1m and 3m) according to FINA Competition Regulations APPENDIX 8.

DD = A + B + C + D + E

Where:
- A = Somersaults component
- B = Flight Position component
- C = Twists component
- D = Approach component
- E = Unnatural Entry component
"""

from .calculator import calculate_dd, parse_dive_code, DDResult

__all__ = ['calculate_dd', 'parse_dive_code', 'DDResult']
