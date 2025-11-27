# Diving Analytics Worker Service

The Worker Service is responsible for PDF OCR processing and text extraction for diving competition results.

## Overview

This service processes PDF files containing diving competition results using OCR (Optical Character Recognition) and extracts structured data including:

- Competition metadata (name, date, location)
- Athlete information
- Dive codes and descriptions
- Judge scores
- Difficulty values
- Final scores

## Technology Stack

- **Python 3.11+**
- **Tesseract OCR** for text extraction
- **pdf2image** for PDF to image conversion
- **Celery** for distributed task processing
- **Redis** for job queue management

## Installation

### Prerequisites

```bash
# Install Tesseract OCR
sudo apt-get update
sudo apt-get install -y tesseract-ocr tesseract-ocr-fra

# Install Python dependencies
pip install -r requirements.txt
```

### Requirements

```
redis>=4.5.0
celery>=5.3.0
requests>=2.31.0
pytesseract>=0.3.10
pdf2image>=1.16.0
Pillow>=10.0.0
python-dateutil>=2.8.0
regex>=2023.0.0
pytest>=7.4.0
pytest-asyncio>=0.21.0
pytest-cov>=4.1.0
```

## Usage

### Starting the Worker

```bash
# Start the worker service
python worker.py
```

The worker starts both:
- An HTTP server on port 8080 for direct OCR requests
- A Celery worker for distributed task processing

### API Endpoints

#### Health Check
```
GET /health
```

#### Process PDF
```
POST /process-pdf
Content-Type: multipart/form-data

file: <PDF file>
```

#### Debug OCR (Raw Text)
```
POST /debug-ocr
Content-Type: multipart/form-data

file: <PDF file>
```

#### Queue PDF Processing
```
POST /process
Content-Type: application/json

{
  "job_id": "string",
  "pdf_bytes": "base64-encoded-pdf",
  "metadata": {}
}
```

## OCR Error Correction

The worker includes comprehensive OCR error correction for common misrecognition patterns in dive codes and scores.

### Dive Code Corrections

Dive codes follow the pattern: `[1-6]XX[X][A-D]` where the last letter indicates dive position:
- A = Straight
- B = Pike
- C = Tuck
- D = Free

Common OCR errors and corrections:

| OCR Error | Correction | Example |
|-----------|------------|---------|
| 4 → A | Digit 4 misread as letter A | `52114` → `5211A` |
| 8 → B | Digit 8 misread as letter B | `1018` → `101B` |
| 0 → D | Digit 0 misread as letter D | `3010` → `301D` |
| Trailing artifacts | Strip `_`, `.`, `,`, `-` | `101A_` → `101A` |
| Lowercase | Convert to uppercase | `101b` → `101B` |

### Score Corrections

#### French Decimal Format
French PDFs use comma as decimal separator:
- `6,5` → `6.5`
- `42,00` → `42.0`

#### Merged Digits
OCR sometimes merges digit pairs:
- `65` → `6.5` (for judge scores)
- `20` → `2.0` (for difficulty)

### Using the Correction Modules

```python
from ocr_corrections import (
    correct_dive_code,
    correct_french_decimal,
    correct_difficulty_ocr,
    correct_judge_score_ocr,
    apply_all_corrections,
)

# Correct dive code
corrected, was_corrected, desc = correct_dive_code("52114")
# Returns: ("5211A", True, "Corrected trailing 4→A")

# Correct difficulty
dd, was_corrected, desc = correct_difficulty_ocr("2,5")
# Returns: (2.5, True, "Converted French decimal 2,5→2.5")

# Apply all corrections to dive data
result = apply_all_corrections(
    dive_code="52114",
    difficulty="20",
    judge_scores=["7,5", "65", "7.0"]
)
```

### Validation Module

```python
from validation import (
    validate_dive_code,
    validate_judge_score,
    validate_difficulty,
    calculate_dive_score,
)

# Validate dive code
is_valid, error = validate_dive_code("101B")
# Returns: (True, None)

# Validate judge score
is_valid, error = validate_judge_score(7.5)
# Returns: (True, None)

# Calculate dive score
score = calculate_dive_score([7.5, 6.5, 7.0, 7.5, 6.5], 2.0)
# Returns: 42.0
```

## Supported PDF Formats

The worker supports multiple PDF formats:

1. **FINA/World Aquatics** - Official result sheets
2. **FFN (French Federation)** - French competition results
3. **DiveRecorder** - Competition management software exports
4. **Generic** - Tabular diving results

### Athlete Name Formats

The parser handles various name formats:
- `LASTNAME Firstname` (FFN format)
- `Firstname LASTNAME` (DiveRecorder format)
- Names with French accents (é, è, à, ô, etc.)

### Event Detection

The parser automatically detects:
- Event names (e.g., "Elite - Dames - 3m")
- Height/platform (1m, 3m, 5m, 7.5m, 10m)
- HV (Haut Vol) events

## Testing

```bash
# Run all tests
cd tests/worker
python -m pytest test_ocr_extraction.py -v

# Run with coverage
python -m pytest test_ocr_extraction.py --cov=../../worker --cov-report=term-missing
```

## Confidence Scoring

The worker calculates a confidence score (0.0-1.0) for each extraction based on:

- Competition metadata completeness (25%)
- Number of dives extracted (35%)
- Dive code validation pass rate (10%)
- Judge score validation pass rate (10%)
- Difficulty validation pass rate (10%)
- Completeness of dive fields (10%)

A confidence score ≥0.85 indicates high-quality extraction.

## Known Limitations

1. **Scanned PDFs** - Quality depends on scan resolution (300 DPI recommended)
2. **Multi-column layouts** - Complex layouts may require manual verification
3. **Handwritten annotations** - Not supported
4. **Non-Latin characters** - Limited support outside French/English

## Troubleshooting

### Common Issues

1. **"Could not correct dive code"**
   - The OCR output doesn't match any known dive code pattern
   - Verify the PDF is clear and text is readable

2. **"Invalid dive code format"**
   - After correction, the code still doesn't match the pattern
   - Check if the dive code is valid according to FINA rules

3. **"Could not parse difficulty"**
   - The difficulty value couldn't be extracted
   - May need manual entry

### Debug Mode

Use the `/debug-ocr` endpoint to see raw OCR text output for debugging.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   PDF Upload    │────▶│  Worker HTTP    │
│   (API)         │     │  Server :8080   │
└─────────────────┘     └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  PDF to Image   │
                        │  (pdf2image)    │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Tesseract OCR  │
                        │  (pytesseract)  │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Text Parser    │
                        │  + Corrections  │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Structured     │
                        │  JSON Output    │
                        └─────────────────┘
```

## Contributing

When adding new OCR corrections:

1. Add the correction pattern to `ocr_corrections.py`
2. Add test cases to `tests/worker/test_ocr_extraction.py`
3. Update this documentation

## License

MIT License
