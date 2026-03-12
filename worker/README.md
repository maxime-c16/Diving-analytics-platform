# Worker Extraction Notes

The active OCR and PDF extraction path for the current app is [`extract_pdf.py`](extract_pdf.py).

This directory still contains older worker-era code, but the current product uses the extractor as a local subprocess from the Bun API rather than as a queue-driven service.

## Current Role
- parse competition PDFs
- prefer text-layer extraction when available
- reuse OCR correction logic when needed
- emit structured JSON for import into SQLite

The Bun API calls it from:
- [`apps/api/src/index.ts`](../apps/api/src/index.ts)

## Run Manually
```bash
python3 worker/extract_pdf.py /path/to/results.pdf
```

The script prints JSON to stdout.

## Local Requirements
```bash
pip install -r worker/requirements.txt
```

If OCR fallback is needed, install Tesseract:
```bash
sudo apt-get update
sudo apt-get install -y tesseract-ocr tesseract-ocr-fra
```

## What The Extractor Produces
- competition metadata
- event list
- athletes
- entries
- dives
- confidence and extraction method

Important current behaviors:
- synchro parsing preserves both diver names where available
- split judging is retained for synchro:
  - `execution_scores`
  - `synchronization_scores`
- dates and clubs are normalized later in the API layer before presentation

## Validation
```bash
python3 -m py_compile worker/extract_pdf.py
```

The main browser smoke flow also exercises the PDF ingestion route after the API calls this script.

## Historical Note
`worker.py` and the Redis/Celery-oriented service model in this directory are legacy migration artifacts. They are not the primary local development path for the current app.
