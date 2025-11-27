# OCR Error Patterns for Diving Competition PDFs

## Overview

This document catalogs common Tesseract OCR error patterns encountered when processing diving competition result PDFs, specifically French Federation (FFN) and DiveRecorder format documents. It includes recommended fixes and configuration optimizations.

**Last Updated**: November 2025

---

## Table of Contents

1. [Character Confusion Errors](#1-character-confusion-errors)
2. [Diving-Specific OCR Errors](#2-diving-specific-ocr-errors)
3. [French Language OCR Issues](#3-french-language-ocr-issues)
4. [Numerical Value Parsing](#4-numerical-value-parsing)
5. [Name Parsing Issues](#5-name-parsing-issues)
6. [Tesseract Configuration Recommendations](#6-tesseract-configuration-recommendations)
7. [Post-Processing Patterns](#7-post-processing-patterns)
8. [Validation Rules](#8-validation-rules)
9. [Implementation Status](#9-implementation-status)

---

## 1. Character Confusion Errors

### 1.1 Letters vs Numbers Confusion

| OCR Read | Actual | Context | Frequency | Example |
|----------|--------|---------|-----------|---------|
| `4` | `A` | Dive position code | **Very High** | `52114` → `5211A` |
| `1` | `I` or `l` | Names, text | High | `LAURENT` → `LIURENT` |
| `0` | `O` | Names, codes | High | `OTTO` → `OTT0` |
| `%` | `½` | Dive description | High | `avec ½ vrille` → `avec % vrille` |
| `O` | `0` | Scores, numbers | High | `10.0` → `1O.O` |
| `8` | `B` | Position codes | Medium | `101B` → `1018` |
| `B` | `8` | Numbers | Medium | `8.5` → `B.5` |
| `5` | `S` | Text | Medium | `SOUSSE` → `5OUSSE` |
| `S` | `5` | Numbers | Medium | `5.0` → `S.0` |
| `6` | `G` | Names | Low | `GALLIOT` → `6ALLIOT` |
| `2` | `Z` | Text | Low | `GONZALEZ` → `GON2ALEZ` |
| `9` | `g` or `q` | Text | Low | |

### 1.2 Similar Shape Confusions

| OCR Read | Actual | Frequency | Notes |
|----------|--------|-----------|-------|
| `rn` | `m` | High | Kerning issues |
| `cl` | `d` | Medium | Font dependent |
| `vv` | `w` | Low | |
| `l` | `|` (pipe) | Medium | In table borders |
| `)` | `J` | Low | |
| `(` | `C` | Low | |

### 1.3 Thin/Narrow Character Issues

Characters that are particularly problematic:

| Character | Common Misreads | Notes |
|-----------|-----------------|-------|
| `1` | `l`, `I`, `|`, `` | Very narrow glyph |
| `l` | `1`, `I`, `|` | Often confused with digit 1 |
| `.` | `,`, omitted | Small glyph, easily missed |
| `,` | `.`, omitted | French decimal separator |
| `-` | `_`, omitted | Dash in names/clubs |
| `'` | `` ` ``, omitted | Apostrophes in French names |

---

## 2. Diving-Specific OCR Errors

### 2.1 Dive Code Position Letters

The most critical OCR error in diving PDFs is the position letter at the end of dive codes.

**Dive Code Structure**: `[Group][Somersaults][Twists][Position]`
- Groups: 1-6 (first digit)
- Position letters: A, B, C, D

| OCR Error | Correction | Explanation |
|-----------|------------|-------------|
| `52114` | `5211A` | `4` misread as `A` (most common) |
| `1014` | `101A` | `4` looks like `A` |
| `1011` | `101A` | `1` misread as `A` |
| `1018` | `101B` | `8` misread as `B` |
| `101C_` | `101C` | Trailing underscore artifact |
| `101c` | `101C` | Lowercase (normalize to uppercase) |

**Current Implementation** (in `worker.py`):
```python
OCR_ERROR_CORRECTIONS = {
    '1': 'A',  # 1 often misread as A
    '2': 'B',  # 2 sometimes misread as B  
    '3': 'C',  # 3 sometimes misread as C
    '4': 'A',  # 4 often misread as A (especially 5211A -> 52114)
}
```

**Recommended Additional Corrections**:
```python
# Extended dive code corrections
DIVE_POSITION_OCR_FIXES = {
    '4': 'A',  # Most common: 4 looks like A
    '8': 'B',  # 8 looks like B
    '1': 'A',  # 1 can look like A in some fonts
    '0': 'D',  # 0 can look like D (rare)
}

# Also handle lowercase
DIVE_CODE_NORMALIZE = str.upper

# Remove trailing artifacts
DIVE_CODE_CLEANUP = re.compile(r'[_\-\.\s]+$')
```

### 2.2 Score Value Parsing

| OCR Error | Actual | Context |
|-----------|--------|---------|
| `6,5` | `6.5` | French decimal comma |
| `65` | `6.5` | Missing decimal separator |
| `1170` | `11.70` | Merged numbers |
| `00` | `0.0` | Leading zero dropped |
| `O.5` | `0.5` | O instead of 0 |
| `1O.O` | `10.0` | O instead of 0 |
| `S.5` | `5.5` | S instead of 5 |

**Judge Score Constraints**:
- Range: 0.0 to 10.0
- Valid increments: 0.5 (0, 0.5, 1.0, 1.5, ..., 10.0)
- Failed dive indicator: All zeros

### 2.3 Difficulty (DD/Coefficient) Parsing

| OCR Error | Actual | Context |
|-----------|--------|---------|
| `1,5` | `1.5` | French decimal |
| `15` | `1.5` | Missing decimal |
| `21` | `2.1` | Missing decimal |
| `l.5` | `1.5` | lowercase L instead of 1 |

**DD Constraints**:
- Range: 1.0 to 4.5
- Precision: 0.1 increments
- Common values: 1.3, 1.5, 1.6, 1.8, 2.0, 2.1, 2.4, 2.5, 2.7, 3.0, 3.2, 3.4

### 2.4 Height Column Issues

For HV (Haut Vol) events, the height varies per dive:

| OCR Error | Actual | Context |
|-----------|--------|---------|
| `75` | `7.5` | 7.5m platform height |
| `7,5` | `7.5` | French decimal |
| `lO` | `10` | lowercase L and O |
| `S` | `5` | 5m platform |

**Valid Heights**: 1, 3, 5, 7.5, 10 (meters)

---

## 3. French Language OCR Issues

### 3.1 Accented Character Errors

French diving PDFs contain many accented characters in names, descriptions, and locations.

| OCR Read | Actual | Example |
|----------|--------|---------|
| `e` | `é` | `Leonie` → `Léonie` |
| `e` | `è` | `Helene` → `Hélène` |
| `e` | `ê` | `Jeróme` → `Jérôme` |
| `a` | `à` | `la` → `là` |
| `a` | `â` | `chateau` → `château` |
| `c` | `ç` | `Francois` → `François` |
| `i` | `î` | `ile` → `île` |
| `o` | `ô` | `hotel` → `hôtel` |
| `u` | `ù` | `ou` → `où` |
| `u` | `û` | `sur` → `sûr` |
| `oe` | `œ` | `coeur` → `cœur` |

**Common French Diving Terms with Accents**:
- `périlleux` (somersault)
- `renversé` (reverse)
- `retourné` (inward)
- `équilibre` (armstand)
- `carpé` (pike)
- `groupé` (tuck)
- `tendu` (straight)
- `Île-de-France` (region)

### 3.2 French Month Names

| OCR Error | Actual | Notes |
|----------|--------|-------|
| `fevrier` | `février` | Accent lost |
| `aout` | `août` | Accent on û |
| `decembre` | `décembre` | Accent lost |

**Current Implementation**: Month lookup handles both accented and non-accented.

### 3.3 French Punctuation

| OCR Read | Actual | Context |
|----------|--------|---------|
| `6.5` | `6,5` | French uses comma as decimal |
| `"` | `«` or `»` | French quotation marks |
| `-` | `–` | En-dash in ranges |
| `--` | `–` | Double hyphen for em-dash |

---

## 4. Numerical Value Parsing

### 4.1 Decimal Separator Handling

**French Convention**: Comma (`,`) as decimal separator
**English Convention**: Period (`.`) as decimal separator

```python
# Recommended normalization
def normalize_decimal(value: str) -> float:
    """Convert French or English decimal to float."""
    # Replace comma with period
    normalized = value.replace(',', '.')
    # Handle merged numbers (e.g., "65" → "6.5" for scores)
    return float(normalized)
```

### 4.2 Merged Number Detection

OCR sometimes merges numbers that should be separate:

| OCR Read | Likely Values | Context |
|----------|--------------|---------|
| `65` | `6.5` or `6 5` | Judge score |
| `75` | `7.5` or `7 5` | Height or score |
| `1170` | `11.70` | Dive points |
| `4200` | `42.00` | Dive points |
| `19960` | `199.60` | Total points |

**Detection Strategy**:
```python
def split_merged_numbers(text: str, context: str) -> List[float]:
    """Split merged numbers based on context."""
    if context == 'judge_score':
        # Judge scores are 0-10 in 0.5 increments
        # "65" → 6.5, "75" → 7.5, "100" → 10.0
        pass
    elif context == 'dive_points':
        # Points typically have 2 decimal places
        # "1170" → 11.70, "4200" → 42.00
        pass
```

### 4.3 Zero Confusion

| OCR Read | Actual | Notes |
|----------|--------|-------|
| `O` | `0` | Capital O vs zero |
| `o` | `0` | Lowercase o vs zero |
| `Ø` | `0` | Slashed O (rare) |
| `0,0` | `0.0` | French format |
| `00` | `0.0` | Missing decimal |

---

## 5. Name Parsing Issues

### 5.1 Case Mixing

DiveRecorder format uses: `Firstname LASTNAME`
FFN format may use: `LASTNAME Firstname`

| OCR Error | Actual | Issue |
|----------|--------|-------|
| `ROUFFIAC` | `ROUFFIAC` | Correct (all caps) |
| `Rouffiac` | `ROUFFIAC` | Title case vs uppercase |
| `rouffiac` | `ROUFFIAC` | All lowercase |
| `ROUFFlAC` | `ROUFFIAC` | `l` instead of `I` |

### 5.2 Hyphenated Names

French names often contain hyphens:

| OCR Read | Actual |
|----------|--------|
| `VIET TRIEM TONG` | `VIET-TRIEM-TONG` |
| `Saint Maur` | `Saint-Maur` |
| `Ile de France` | `Île-de-France` |

### 5.3 Club Name Truncation

Club names are often truncated in PDFs:

| OCR Read | Actual |
|----------|--------|
| `Kingfisher Club Plongeon Montr` | `Kingfisher Club Plongeon Montreuil` |
| `H2024 Plongeon & Natation CAO` | Full name |

---

## 6. Tesseract Configuration Recommendations

### 6.1 Current Configuration

```python
# Current worker.py settings
pytesseract.image_to_string(
    image,
    lang='eng+fra',  # English + French
    config='--psm 6'  # Assume uniform block of text
)
```

### 6.2 PSM Mode Options

| PSM | Description | Best For |
|-----|-------------|----------|
| 3 | Fully automatic page segmentation (default) | General documents |
| 4 | Single column of text | Result lists |
| **6** | **Uniform block of text** | **Tables (current)** |
| 11 | Sparse text, find as much text as possible | Mixed layouts |
| 12 | Sparse text with OSD | Complex layouts |

**Recommendation**: PSM 6 is appropriate for diving result tables. Consider PSM 4 as fallback for single-column results.

### 6.3 Recommended Additional Configuration

```python
# Enhanced configuration for diving PDFs
TESSERACT_CONFIG = ' '.join([
    '--psm 6',                           # Uniform block of text
    '--oem 1',                           # LSTM neural network engine
    '-c preserve_interword_spaces=1',    # Preserve table spacing
    '-c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,- ',  # Limit charset
])

# For French text specifically
TESSERACT_CONFIG_FRENCH = ' '.join([
    '--psm 6',
    '--oem 1',
    '-c preserve_interword_spaces=1',
])
```

### 6.4 Language Priority

```python
# Primary: French (for names, descriptions, locations)
# Secondary: English (for common words, fallback)
lang = 'fra+eng'  # French first for better accent handling
```

### 6.5 DPI Recommendations

- **Minimum**: 150 DPI (current)
- **Recommended**: 300 DPI for better accuracy
- **Trade-off**: Higher DPI = better accuracy but slower processing

```python
# In pdf2image conversion
images = convert_from_bytes(
    pdf_bytes,
    dpi=300,  # Upgrade from 150 for better accuracy
    fmt='png'
)
```

### 6.6 Image Preprocessing Options

Current preprocessing is disabled (causing more errors than it fixes). Consider selective preprocessing:

```python
def preprocess_for_ocr(image: Image.Image) -> Image.Image:
    """Selective preprocessing based on image characteristics."""
    
    # 1. Ensure minimum DPI (upscale if needed)
    # 2. Convert to grayscale only if color adds noise
    # 3. Adaptive binarization for uneven backgrounds
    # 4. Deskew if rotation detected
    
    # Currently disabled - raw images work better
    return image
```

---

## 7. Post-Processing Patterns

### 7.1 Dive Code Correction

```python
import re

def correct_dive_code(code: str) -> str:
    """Correct common OCR errors in dive codes."""
    if not code:
        return code
    
    code = code.upper().strip()
    
    # Remove trailing artifacts (_, -, .)
    code = re.sub(r'[_\-\.\s]+$', '', code)
    
    # Validate first digit is dive group (1-6)
    if not code or code[0] not in '123456':
        return code
    
    # If already ends with valid position letter, return
    if code[-1] in 'ABCD':
        return code
    
    # Correct digit->letter errors
    digit_to_letter = {'4': 'A', '8': 'B', '1': 'A', '3': 'C'}
    
    # 5-digit code ending in digit = 4-digit + OCR'd letter
    if len(code) == 5 and code[-1].isdigit():
        return code[:-1] + digit_to_letter.get(code[-1], 'A')
    
    # 4-digit code ending in 4 (common A misread)
    if len(code) == 4 and code[-1] == '4' and code[:2] not in ('19', '20'):
        return code[:-1] + 'A'
    
    return code
```

### 7.2 Score Normalization

```python
def normalize_score(value: str, context: str = 'judge') -> Optional[float]:
    """Normalize OCR'd score values."""
    if not value:
        return None
    
    # Replace French decimal comma
    value = value.replace(',', '.')
    
    # Replace O with 0
    value = re.sub(r'[Oo]', '0', value)
    
    # Replace S with 5
    value = re.sub(r'[Ss]', '5', value)
    
    try:
        score = float(value)
    except ValueError:
        return None
    
    # Validate based on context
    if context == 'judge':
        # Judge scores: 0-10 in 0.5 increments
        if 0 <= score <= 10 and (score * 2) == int(score * 2):
            return score
        # Try to fix merged numbers (e.g., "65" → 6.5)
        if 10 < score < 100:
            score = score / 10
            if 0 <= score <= 10 and (score * 2) == int(score * 2):
                return score
    elif context == 'difficulty':
        # DD: 1.0-4.5 in 0.1 increments
        if 1.0 <= score <= 4.5:
            return round(score, 1)
        # Try to fix (e.g., "15" → 1.5)
        if 10 <= score <= 45:
            return round(score / 10, 1)
    elif context == 'total':
        # Total scores: typically 10-600
        if 0 < score < 700:
            return round(score, 2)
    
    return None
```

### 7.3 Name Cleanup

```python
def clean_athlete_name(name: str) -> str:
    """Clean and normalize athlete names."""
    if not name:
        return name
    
    # Fix common OCR errors
    replacements = {
        '0': 'O',  # Zero to O in names
        '1': 'I',  # One to I in names (context-dependent)
        '|': 'I',  # Pipe to I
    }
    
    # Only apply number->letter fixes in the name portion
    # (be careful not to fix birth years)
    
    # Normalize whitespace
    name = ' '.join(name.split())
    
    # Fix hyphen variants
    name = re.sub(r'\s*[-–—]\s*', '-', name)
    
    return name
```

### 7.4 French Text Accent Recovery

```python
# Common French diving terms - map unaccented to accented
FRENCH_ACCENT_MAP = {
    'perilleux': 'périlleux',
    'renverse': 'renversé',
    'retourne': 'retourné',
    'equilibre': 'équilibre',
    'carpe': 'carpé',
    'groupe': 'groupé',
    'ile-de-france': 'Île-de-France',
    'fevrier': 'février',
    'aout': 'août',
    'decembre': 'décembre',
}

def restore_french_accents(text: str) -> str:
    """Attempt to restore French accents lost in OCR."""
    text_lower = text.lower()
    for unaccented, accented in FRENCH_ACCENT_MAP.items():
        if unaccented in text_lower:
            # Case-preserving replacement
            text = re.sub(
                re.escape(unaccented),
                accented,
                text,
                flags=re.IGNORECASE
            )
    return text
```

---

## 8. Validation Rules

### 8.1 Dive Code Validation

```python
def is_valid_dive_code(code: str) -> bool:
    """Validate dive code format and structure."""
    if not code or len(code) < 4 or len(code) > 5:
        return False
    
    code = code.upper()
    
    # Must end with position letter A-D
    if code[-1] not in 'ABCD':
        return False
    
    # First digit must be dive group 1-6
    if code[0] not in '123456':
        return False
    
    # Middle digits must be numeric
    if not code[1:-1].isdigit():
        return False
    
    # Additional structural validation
    group = int(code[0])
    digits = code[1:-1]
    
    # Group 5 (twist) dives have 4 digits total
    if group == 5:
        if len(digits) < 2 or len(digits) > 3:
            return False
    # Groups 1-4, 6 have 3 digits total
    else:
        if len(digits) != 2:
            return False
    
    return True
```

### 8.2 Judge Score Validation

```python
def is_valid_judge_score(score: float) -> bool:
    """Validate judge score is in valid range and increment."""
    if score < 0 or score > 10:
        return False
    # Must be 0.5 increment: 0, 0.5, 1.0, 1.5, ..., 10.0
    return (score * 2) == int(score * 2)
```

### 8.3 Difficulty Validation

```python
def is_valid_difficulty(dd: float) -> bool:
    """Validate degree of difficulty."""
    # DD range for competitive diving
    return 1.0 <= dd <= 4.5
```

### 8.4 Panel Size Validation

```python
def is_valid_panel_size(judge_count: int) -> bool:
    """Validate number of judges."""
    # Standard panel sizes
    return judge_count in [5, 7]
```

### 8.5 Score Calculation Validation

```python
def validate_dive_calculation(
    judge_scores: List[float],
    difficulty: float,
    final_score: float,
    tolerance: float = 0.1
) -> bool:
    """Validate that final score matches calculation."""
    if not judge_scores or not difficulty or not final_score:
        return True  # Can't validate without all values
    
    # Calculate expected score
    if len(judge_scores) == 5:
        # Remove highest and lowest, sum middle 3
        sorted_scores = sorted(judge_scores)
        cumul = sum(sorted_scores[1:-1])
    elif len(judge_scores) == 7:
        # Remove 2 highest and 2 lowest, sum middle 5
        sorted_scores = sorted(judge_scores)
        cumul = sum(sorted_scores[2:-2])
    else:
        return True  # Invalid panel size
    
    expected = cumul * difficulty
    
    return abs(expected - final_score) <= tolerance
```

---

## 9. Implementation Status

### 9.1 Currently Implemented (in `worker.py`)

| Feature | Status | Notes |
|---------|--------|-------|
| Dive code A→4 correction | ✅ Implemented | `_correct_dive_code_ocr()` |
| French decimal comma handling | ✅ Implemented | `replace(',', '.')` |
| PSM 6 configuration | ✅ Implemented | Table recognition mode |
| Multi-language (eng+fra) | ✅ Implemented | |
| Judge score validation | ✅ Implemented | 0-10, 0.5 increments |
| DD range validation | ✅ Implemented | 1.0-4.5 range |
| Panel size validation | ✅ Implemented | 5 or 7 judges |

### 9.2 Recommended Additions

| Feature | Priority | Complexity |
|---------|----------|------------|
| Extended dive code corrections (8→B) | High | Low |
| Score calculation validation | High | Medium |
| Name O→0 reversal | Medium | Low |
| French accent recovery | Low | Medium |
| DPI upgrade to 300 | Medium | Low |
| Preserve interword spaces | Medium | Low |
| Merged number detection | High | Medium |

### 9.3 Testing Recommendations

1. **Create test fixtures** with known OCR errors
2. **Unit tests** for each correction function
3. **Integration tests** with sample PDFs
4. **Regression tests** when updating OCR config

---

## Appendix A: Quick Reference Regex Patterns

```python
# Dive code patterns
DIVE_CODE_VALID = r'\b([1-6]\d{2,3}[A-Da-d])\b'
DIVE_CODE_OCR_ERROR = r'\b([1-6]\d{2,3}[1-4])\b'

# Score patterns
SCORE_FRENCH = r'(\d+[,\.]\d+)'
SCORE_INTEGER = r'\b(\d+)\b'

# Name patterns (French)
NAME_UPPERCASE = r'([A-ZÀ-Ÿ]{2,}(?:[-\s][A-ZÀ-Ÿ]+)*)'
NAME_TITLECASE = r'([A-ZÀ-ÿ][a-zà-ÿ]+(?:[-\s][A-ZÀ-ÿ][a-zà-ÿ]+)*)'

# French date
DATE_FRENCH = r'(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})'

# Height pattern
HEIGHT = r'\b(1m|3m|5m|7\.5m|10m|HV)\b'
```

## Appendix B: Tesseract Configuration Cheatsheet

```bash
# Optimal configuration for diving PDFs
tesseract input.png output \
    -l fra+eng \
    --psm 6 \
    --oem 1 \
    -c preserve_interword_spaces=1

# Debug configuration (save processed image)
tesseract input.png output \
    -l fra+eng \
    --psm 6 \
    -c tessedit_write_images=true

# Character whitelist (numbers and position letters only)
tesseract input.png output \
    -l eng \
    --psm 7 \
    -c tessedit_char_whitelist=0123456789ABCD
```

## Appendix C: Common OCR Error Examples from Real PDFs

### Example 1: Dive Code Error
```
OCR Output: 5231D saut périlleux et demi arrière avec % vrille 3 20 75 65 75 70 6,5 210 42,00 199,60
Parsed:     5231D (correct)
```

### Example 2: Failed Dive Detection
```
OCR Output: 5132D saut périlleux et demi avant avec 1 vrille 3 21 0,0 00 00 00 0,0 00 0,00 148,20 1
Parsed:     All zeros indicate failed dive, penalty code 1
```

### Example 3: Merged Score
```
OCR Output: 101C_ plongeon ordinaire avant 3 14 6,0 45 50 50 5,0 15,0 21,00 21,00
Issues:     - Trailing underscore on dive code
            - "45" should be "4.5" (judge score)
            - "50" should be "5.0" (judge score)
Corrected:  101C, scores [6.0, 4.5, 5.0, 5.0, 5.0]
```

### Example 4: Height Column in HV Event
```
OCR Output: 612B équilibre avant 10 21 65 60 70 60 5,5 185 38,85 38,85
Parsed:     Height=10 (10m platform), DD=2.1, Judge scores need decimal fix
```
