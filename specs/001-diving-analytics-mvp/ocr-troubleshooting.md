# OCR Troubleshooting Guide

This guide helps diagnose and resolve common issues with the OCR PDF parsing pipeline.

## Common Issues

### 1. Empty or No Dives Extracted

**Symptoms:**
- `divesExtracted: 0` in job status
- `success: false` in extraction result

**Causes and Solutions:**

| Cause | Solution |
|-------|----------|
| PDF is image-only (scanned) without text layer | OCR should handle this - check Tesseract is installed |
| PDF is password-protected | Request unprotected PDF |
| PDF uses unusual encoding | Convert to standard PDF/A format |
| Text too small or blurry | Request higher resolution scan (300+ DPI) |

**Diagnostic Steps:**
```bash
# Check raw OCR output
curl -X POST http://localhost:8080/debug-ocr \
  -F "file=@problem.pdf" > raw-ocr.txt

# Check if text was extracted
cat raw-ocr.txt | head -100

# If empty, check Tesseract
docker exec worker-service tesseract --version
```

---

### 2. Dive Codes Not Recognized

**Symptoms:**
- Dives extracted but with garbled codes like "52114" or "1018"
- `Invalid dive code format` errors

**Causes and Solutions:**

The OCR often misreads the position letter:
- `A` → `4` (most common)
- `B` → `8`
- `D` → `0`

**The system automatically corrects these.** If still failing:

1. Check the raw OCR output for patterns
2. Add new corrections to `worker/ocr_corrections.py`:

```python
EXTENDED_OCR_CORRECTIONS = {
    '4': 'A',  # Already included
    '8': 'B',  # Already included
    # Add new patterns here if discovered
}
```

---

### 3. Athlete Names Missing or Wrong

**Symptoms:**
- `athleteName: "Unknown Athlete"` for all dives
- Names truncated or garbled

**Causes and Solutions:**

| Cause | Solution |
|-------|----------|
| Non-standard name format | Check if PDF uses different format than expected |
| French accents corrupted | Verify Tesseract has French language pack (`tesseract-ocr-fra`) |
| Name line not matching regex | Check athlete line patterns in `worker/worker.py` |

**Diagnostic Steps:**
```bash
# Check raw text for athlete lines
grep -E '^\d+\s+[A-Z]' raw-ocr.txt
```

**Expected Patterns:**
- FFN: `1. DUPONT Marie (2005) Club Name`
- DiveRecorder: `1 Marie DUPONT (2005) -- Club Name`

---

### 4. Judge Scores Incorrect

**Symptoms:**
- Scores like `65` instead of `6.5`
- Missing scores
- Scores outside 0-10 range

**Causes and Solutions:**

| Cause | Solution |
|-------|----------|
| French decimal format | Auto-corrected: `6,5` → `6.5` |
| Merged digits | Auto-corrected: `65` → `6.5` (when in judge context) |
| Wrong number count | Check PDF layout - columns may be misaligned |

**Validation Rules:**
- Judge scores must be 0-10
- Must be in 0.5 increments
- Must have 5-7 judges

---

### 5. Round Numbers All Show as 1

**Symptoms:**
- All dives have `roundNumber: 1`
- Round progression not detected

**Causes and Solutions:**

Round detection looks for:
- `Tour 1`, `Tour 2`, etc.
- `Round 1`, `Round 2`, etc.
- `Manche 1`, `Manche 2`, etc.

If PDF uses different format:
1. Check raw OCR for round indicators
2. Add pattern to `_parse_ffn_block_format()` in `worker/worker.py`

**Current Algorithm:**
The system counts dives per athlete and assigns round numbers sequentially (dive 1 = round 1, dive 2 = round 2, etc.) when explicit round markers aren't found.

---

### 6. Events Not Detected

**Symptoms:**
- `eventName: null` for all dives
- All dives grouped into single event

**Causes and Solutions:**

Event detection looks for patterns like:
- `Elite - Dames - 3m`
- `Jeunes - Garçons - HV`

**Add Detection:**
```python
# In worker/worker.py, update event_pattern
event_pattern = re.compile(
    r'^((?:Elite|Jeunes|Junior|Senior|Master|Your-Category)[\s\-]+...',
    re.IGNORECASE | re.UNICODE
)
```

---

### 7. Low Confidence Score

**Symptoms:**
- `confidence: 0.3` or similar low value
- Partial data extraction

**Confidence Factors:**
- Competition name found: +15%
- Event type found: +10%
- Any dives extracted: +25%
- Number of dives: up to +10%
- Valid dive codes: up to +10%
- Valid judge scores: up to +10%
- Valid difficulties: up to +10%
- Complete dive records: up to +10%

**Improving Confidence:**
1. Ensure PDF is clear and high-resolution
2. Check that competition metadata is present on first pages
3. Verify dive codes are in standard format

---

### 8. Performance Issues

**Symptoms:**
- Processing takes > 2 minutes
- Timeouts during OCR

**Causes and Solutions:**

| Cause | Solution |
|-------|----------|
| Large PDF (50+ pages) | Expected - async processing handles this |
| High DPI setting | Reduce to 300 DPI |
| Complex images | Disable preprocessing (currently disabled) |
| Multiple simultaneous jobs | Scale worker containers |

**Performance Logging:**
Check worker logs for timing breakdown:
```
PDF processing complete - Total: 45.2s | PDF→Image: 8.1s | OCR: 35.4s | Parse: 1.7s
```

---

## Debug Endpoints

### Get Raw OCR Text
```bash
curl -X POST http://localhost:8080/debug-ocr \
  -F "file=@competition.pdf" \
  > raw-ocr-output.txt
```

### Check Worker Health
```bash
curl http://localhost:8080/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "worker-ocr",
  "tesseract_available": true
}
```

### Process PDF with Full Details
```bash
curl -X POST http://localhost:8080/process-pdf \
  -F "file=@competition.pdf" \
  | jq '.summary'
```

---

## Log Analysis

### Finding Errors in Logs

```bash
# Docker logs
docker logs worker-service 2>&1 | grep -i error

# Look for specific issues
docker logs worker-service 2>&1 | grep "Invalid dive code"
docker logs worker-service 2>&1 | grep "Could not parse"
```

### Understanding Log Messages

| Log Message | Meaning |
|-------------|---------|
| `OCR correction: 52114 -> 5211A` | Auto-corrected dive code |
| `Invalid dive code format after correction` | Code couldn't be fixed |
| `Invalid judge scores for dive` | Scores failed validation |
| `Dive with unknown athlete` | Athlete name not detected |

---

## Escalation Path

If troubleshooting doesn't resolve the issue:

1. **Collect Information:**
   - Raw OCR output (`/debug-ocr`)
   - Worker logs
   - Original PDF (if shareable)

2. **Check Known Issues:**
   - Review `specs/001-diving-analytics-mvp/research.md` (see section R6)
   - Check GitHub issues

3. **Manual Data Entry:**
   - If OCR fails completely, use CSV import as fallback
   - Format: `athlete_name,dive_code,judge_scores,difficulty`

---

## Quick Reference

### Valid Dive Code Format
```
[1-6][0-9][0-9]([0-9])?[A-D]

Examples: 101A, 5231D, 301B, 612B
```

### Valid Judge Score
```
0.0 to 10.0 in 0.5 increments
Examples: 6.5, 7.0, 8.5
```

### Valid Difficulty
```
1.0 to 4.5 in 0.1 increments
Examples: 1.6, 2.0, 3.4
```

### Event Name Pattern
```
{Category} - {Gender/Age} - {Height}
Examples: 
- Elite - Dames - 3m
- Jeunes - Garçons Minimes B - 1m
- Elite - Messieurs - HV
```
