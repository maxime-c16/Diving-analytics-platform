# Checklist: OCR Pipeline Error Handling & Data Triage

**Feature**: OCR PDF Parsing Bug Fix and E2E Pipeline Testing  
**Branch**: `001-diving-analytics-mvp`  
**Created**: 27 November 2025  
**Audience**: Author/Reviewer (implementation + code review)

---

## Overview

This checklist covers error handling strategies for the OCR pipeline, including:
- Error detection and classification
- Data interpolation and recovery strategies
- Confidence thresholds and triage rules
- Partial import behavior
- Logging and observability requirements

---

## 1. Error Detection & Classification

### 1.1 OCR Extraction Errors

- [ ] **Dive code format validation**
  - Verify dive codes match pattern `^[1-6]\d{2,3}[A-D]$`
  - Flag codes that fail pattern after OCR corrections
  - Log original OCR text and corrected version

- [ ] **Judge score validation**
  - Verify scores are in range 0.0-10.0
  - Verify scores are in 0.5 increments
  - Verify panel size is 5 or 7 judges
  - Flag scores that don't meet constraints

- [ ] **Difficulty (DD) validation**
  - Verify DD is in range 1.0-4.5
  - Cross-reference DD against FINA dive tables when possible
  - Flag mismatches between OCR'd DD and lookup DD

- [ ] **Final score validation**
  - Calculate expected score: `(sum of middle scores) × DD`
  - Compare calculated vs OCR'd final score
  - Flag discrepancies > 0.5 points

- [ ] **Athlete name validation**
  - Check for "Unknown Athlete" fallback
  - Verify name doesn't contain obvious OCR artifacts (digits in name portion)
  - Flag names shorter than 3 characters

### 1.2 Structural Errors

- [ ] **Round number consistency**
  - Verify each athlete has sequential rounds (1, 2, 3... not gaps)
  - Flag athletes with unexpected dive counts (typically 5-6 per event)
  - Verify round numbers don't exceed expected maximum

- [ ] **Event grouping**
  - Verify event names follow expected patterns (Elite, Jeunes, etc.)
  - Flag dives without event association in multi-event PDFs
  - Check for event header detection failures

- [ ] **Athlete-dive association**
  - Verify no "orphan" dives without athlete
  - Verify no duplicate dives (same athlete, round, code)
  - Flag sudden athlete name changes mid-dive-sequence

---

## 2. Error Classification Levels

### 2.1 Define Severity Levels

- [ ] **CRITICAL** - Data cannot be imported
  - Invalid dive code format (even after corrections)
  - Zero valid dives extracted from PDF
  - Competition name undetectable

- [ ] **ERROR** - Individual record rejected, continue processing
  - Judge score out of range
  - Missing athlete name
  - Invalid DD value

- [ ] **WARNING** - Data imported with flag, needs review
  - Final score mismatch vs calculation
  - DD mismatch vs FINA tables
  - Low OCR confidence on value

- [ ] **INFO** - Logged for debugging
  - OCR correction applied (A→4 fix)
  - French decimal comma converted
  - Trailing artifact removed

### 2.2 Implementation Checklist

- [ ] Add `severity` field to error objects
- [ ] Create enum/constant for severity levels
- [ ] Update logging to include severity in messages
- [ ] Filter errors by severity in UI error display

---

## 3. Data Interpolation & Recovery Strategies

### 3.1 Dive Code Recovery

- [ ] **OCR correction chain** (already partially implemented)
  ```
  Raw OCR → Uppercase → Strip artifacts → Digit-to-letter fix → Validate
  ```
  - [ ] Add `8→B` correction to existing `4→A` mapping
  - [ ] Add `0→D` correction for rare cases
  - [ ] Log all corrections applied

- [ ] **Fuzzy matching for known codes**
  - [ ] Build list of valid dive codes from FINA tables
  - [ ] If corrected code is invalid, find closest valid code
  - [ ] Only apply if Levenshtein distance ≤ 1
  - [ ] Flag as WARNING when fuzzy match applied

### 3.2 Judge Score Recovery

- [ ] **Merged number detection**
  - If score > 10 and < 100, try dividing by 10
  - Example: `65` → `6.5`, `75` → `7.5`
  - Validate result is valid 0.5 increment

- [ ] **Missing score interpolation**
  - If 4 of 5 scores present, interpolate 5th as median
  - If 6 of 7 scores present, interpolate 7th as median
  - Flag interpolated scores with `isInterpolated: true`
  - Never interpolate more than 1 score per dive

- [ ] **Zero score handling**
  - All zeros = failed dive (valid, keep)
  - Single zero among valid scores = likely OCR error
  - Check if `O` (letter) misread as `0` (zero)

### 3.3 Difficulty Recovery

- [ ] **FINA table lookup**
  - If DD is missing or invalid, look up from dive code + height
  - Store lookup source: `ddSource: 'ocr' | 'lookup' | 'interpolated'`
  
- [ ] **Merged number detection for DD**
  - `15` → `1.5`, `21` → `2.1`, `32` → `3.2`
  - Only apply if result is in valid 1.0-4.5 range

- [ ] **Cross-validation**
  - Compare OCR'd DD vs FINA lookup
  - If mismatch, prefer FINA lookup, log WARNING

### 3.4 Final Score Recovery

- [ ] **Calculate from components**
  - If final score missing but judge scores and DD present:
    ```
    finalScore = calculateScore(judgeScores, dd)
    ```
  - Mark as `isCalculated: true`

- [ ] **Back-calculate DD**
  - If DD missing but final score and judge scores present:
    ```
    dd = finalScore / sumOfEffectiveScores
    ```
  - Validate result against FINA tables
  - Only use if validates correctly

### 3.5 Athlete Name Recovery

- [ ] **Context-based inference**
  - If dive follows known athlete's dive sequence, assign to that athlete
  - Use round number continuity as hint
  - Example: Round 3 dive following athlete's Round 2 → same athlete

- [ ] **Club/country as fallback identifier**
  - If name unclear but club matches previous athlete, consider same person
  - Flag for manual review

---

## 4. Confidence Thresholds

### 4.1 OCR Confidence Scoring

- [ ] **Extract Tesseract confidence per word**
  ```python
  data = pytesseract.image_to_data(image, output_type=Output.DICT)
  confidences = data['conf']  # Per-word confidence 0-100
  ```

- [ ] **Define threshold levels**
  | Confidence | Action |
  |------------|--------|
  | ≥ 80% | Accept as-is |
  | 60-79% | Accept with WARNING flag |
  | 40-59% | Apply corrections, flag for review |
  | < 40% | Reject, log as ERROR |

- [ ] **Store confidence in extracted data**
  ```python
  @dataclass
  class ExtractedDive:
      # ... existing fields ...
      confidence: float = 1.0  # Overall dive confidence
      field_confidences: Dict[str, float] = None  # Per-field
  ```

### 4.2 Composite Confidence Calculation

- [ ] **Calculate per-dive confidence**
  ```python
  def calculate_dive_confidence(dive: ExtractedDive) -> float:
      weights = {
          'dive_code': 0.3,
          'athlete_name': 0.2,
          'judge_scores': 0.3,
          'difficulty': 0.1,
          'final_score': 0.1,
      }
      # Weighted average of field confidences
  ```

- [ ] **Calculate extraction result confidence**
  - Average of all dive confidences
  - Penalize for high error count
  - Penalize for missing expected data

### 4.3 Threshold Configuration

- [ ] **Make thresholds configurable**
  ```python
  OCR_CONFIG = {
      'min_word_confidence': 60,
      'min_dive_confidence': 0.7,
      'max_interpolated_fields': 2,
      'max_error_rate': 0.1,  # 10% errors allowed
  }
  ```

- [ ] **Environment-based overrides**
  - Development: Lower thresholds for testing
  - Production: Stricter thresholds

---

## 5. Partial Import Behavior

### 5.1 Import Decision Logic

- [ ] **Define import modes**
  | Mode | Behavior |
  |------|----------|
  | `strict` | Reject entire import if any critical errors |
  | `lenient` | Import valid records, reject invalid |
  | `review` | Import all, flag uncertain for review |

- [ ] **Implement mode selection**
  - Default to `lenient` for PDF imports
  - Allow user to specify mode in upload request

### 5.2 Partial Import Handling

- [ ] **Track import statistics**
  ```typescript
  interface ImportResult {
      totalExtracted: number;
      imported: number;
      rejected: number;
      flaggedForReview: number;
      errors: RowError[];
  }
  ```

- [ ] **Quarantine uncertain records**
  - Create separate table/status for flagged dives
  - Allow manual review and approval
  - Provide UI to view quarantined records

- [ ] **Rollback support**
  - If import fails mid-way, rollback all changes
  - Use database transactions

### 5.3 Status Reporting

- [ ] **Update ingestion log with details**
  - Total rows attempted
  - Successful imports
  - Failed imports (with reasons)
  - Warnings generated

- [ ] **Return detailed response**
  ```json
  {
    "status": "partial",
    "imported": 45,
    "rejected": 3,
    "flagged": 2,
    "errors": [...],
    "warnings": [...]
  }
  ```

---

## 6. Logging & Observability

### 6.1 Structured Logging

- [ ] **Log all OCR corrections**
  ```python
  logger.info("OCR correction applied", extra={
      "original": "52114",
      "corrected": "5211A",
      "rule": "digit_to_letter",
      "confidence": 0.85
  })
  ```

- [ ] **Log validation failures**
  ```python
  logger.warning("Validation failed", extra={
      "field": "judge_scores",
      "value": [6.5, 7.0, 11.0, 6.5, 7.0],
      "error": "Score 11.0 out of range",
      "dive_code": "101B",
      "athlete": "John Doe"
  })
  ```

- [ ] **Log interpolation events**
  ```python
  logger.info("Value interpolated", extra={
      "field": "difficulty",
      "interpolated_value": 2.4,
      "source": "fina_lookup",
      "dive_code": "405C",
      "height": "3m"
  })
  ```

### 6.2 Metrics Collection

- [ ] **Track OCR accuracy metrics**
  - Correction rate per field type
  - Validation failure rate
  - Interpolation frequency

- [ ] **Track pipeline health**
  - Processing time per page
  - Memory usage during OCR
  - Error rate trends

### 6.3 Debug Output

- [ ] **Provide raw OCR debug endpoint**
  - `/debug-ocr` returns raw Tesseract output
  - Include page images if requested
  - Useful for diagnosing extraction issues

- [ ] **Include extraction trace in results**
  - Show which corrections were applied
  - Show which validations passed/failed
  - Enable for debugging mode only (large payload)

---

## 7. Triage Decision Tree

### 7.1 Dive Code Triage

```
OCR'd Code → Is format valid?
    ├── YES → Accept
    └── NO → Apply corrections
              ├── Is corrected format valid?
              │   ├── YES → Accept with WARNING
              │   └── NO → Fuzzy match against FINA codes
              │             ├── Match found (distance ≤ 1)?
              │             │   ├── YES → Accept with WARNING
              │             │   └── NO → REJECT (ERROR)
```

- [ ] Implement this decision tree in `_correct_dive_code_ocr()`
- [ ] Add fuzzy matching function
- [ ] Log decisions at each branch

### 7.2 Judge Score Triage

```
OCR'd Scores → Is count valid (5-7)?
    ├── YES → Are all scores in range?
    │         ├── YES → Accept
    │         └── NO → Try corrections (O→0, S→5, merge splits)
    │                   ├── Valid after correction? Accept with WARNING
    │                   └── Still invalid? REJECT individual scores
    └── NO → Is count 4 or 6?
              ├── YES → Interpolate missing score
              │         ├── Accept with WARNING + isInterpolated flag
              └── NO → REJECT (ERROR)
```

- [ ] Implement score triage in `_parse_ffn_dive_line()`
- [ ] Add interpolation function
- [ ] Track interpolated scores

### 7.3 Difficulty Triage

```
OCR'd DD → Is value valid (1.0-4.5)?
    ├── YES → Cross-check against FINA lookup
    │         ├── Match? Accept
    │         └── Mismatch? Accept OCR value with WARNING
    └── NO → Try corrections (15→1.5, etc.)
              ├── Valid after correction?
              │   ├── YES → Accept with WARNING
              │   └── NO → Use FINA lookup
              │             ├── Found? Accept lookup with WARNING
              │             └── Not found? REJECT (ERROR)
```

- [ ] Add FINA DD lookup function
- [ ] Implement DD triage
- [ ] Log source of final DD value

### 7.4 Complete Dive Triage

```
Extracted Dive → Has valid dive code?
    ├── NO → REJECT
    └── YES → Has athlete name (not "Unknown")?
              ├── NO → Can infer from context?
              │        ├── YES → Accept with WARNING
              │        └── NO → Accept with WARNING (allow unknown)
              └── YES → Has valid scores OR final score?
                        ├── NO → REJECT (ERROR)
                        └── YES → Calculate confidence
                                  ├── ≥ 0.7 → Accept
                                  ├── 0.5-0.7 → Accept with WARNING
                                  └── < 0.5 → FLAG for review
```

- [ ] Implement `triage_dive()` function
- [ ] Return triage decision with reason
- [ ] Collect triage statistics

---

## 8. Review Queue (Optional Enhancement)

### 8.1 Flagged Record Storage

- [ ] **Create review queue table**
  ```sql
  CREATE TABLE dive_review_queue (
      id SERIAL PRIMARY KEY,
      ingestion_id UUID REFERENCES ingestion_logs(id),
      dive_data JSONB,
      confidence FLOAT,
      flags TEXT[],
      status VARCHAR(20) DEFAULT 'pending',
      reviewed_by VARCHAR(100),
      reviewed_at TIMESTAMP,
      resolution VARCHAR(20),  -- 'approved', 'rejected', 'edited'
      created_at TIMESTAMP DEFAULT NOW()
  );
  ```

- [ ] **Implement queue API**
  - `GET /api/review-queue` - List pending reviews
  - `POST /api/review-queue/:id/approve` - Approve and import
  - `POST /api/review-queue/:id/reject` - Reject record
  - `PUT /api/review-queue/:id` - Edit and approve

### 8.2 Review UI (Future)

- [ ] **Design review interface**
  - Show original OCR text alongside extracted values
  - Highlight uncertain fields
  - Allow inline editing
  - Bulk approve/reject

---

## 9. Testing Checklist

### 9.1 Unit Tests

- [ ] Test each correction function with known OCR errors
- [ ] Test validation functions with edge cases
- [ ] Test interpolation with missing data scenarios
- [ ] Test confidence calculation

### 9.2 Integration Tests

- [ ] Test full triage pipeline with sample PDFs
- [ ] Test partial import behavior
- [ ] Test rollback on failure

### 9.3 Ground Truth Validation

- [ ] Compare extraction results against manual transcription
- [ ] Calculate accuracy metrics per field type
- [ ] Identify systematic OCR errors for targeted fixes

---

## 10. Implementation Priority

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| P1 | Add `8→B` dive code correction | Low | High |
| P1 | Implement score validation with merged number fix | Medium | High |
| P1 | Add FINA DD lookup | Medium | High |
| P2 | Implement confidence scoring | Medium | Medium |
| P2 | Add structured logging | Low | Medium |
| P2 | Create partial import response | Low | Medium |
| P3 | Build review queue | High | Medium |
| P3 | Implement fuzzy dive code matching | Medium | Low |

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Author | | | |
| Reviewer | | | |
| QA | | | |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-27 | Generated | Initial checklist |
