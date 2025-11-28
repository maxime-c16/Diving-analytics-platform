"""
Debug extraction runner for Diving Analytics Platform

Usage:
  python worker/debug_extraction.py --pdf path/to/file.pdf --out debug-output

This script will:
 - Render PDF pages to images
 - Run Tesseract OCR per page and save raw text and tsv data
 - Run the parser's `parse_text` on the concatenated OCR and save ExtractionResult
 - Run simple regex candidate extraction for dive codes and save candidates
 - Save JSON artifacts in the output directory for inspection

Note: Run this on the host where Tesseract and pdf2image dependencies are available.
"""

import argparse
import json
import logging
import os
from pathlib import Path
import sys
import importlib.util

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from pdf2image import convert_from_path
import pytesseract
from pytesseract import Output

# Import fixtures helper to locate ground-truth PDF if not provided
try:
    from tests.utils.fixtures import FixtureLoader
except Exception:
    FixtureLoader = None

# Dynamic import of worker module to avoid package issues
WORKER_PY = Path(__file__).resolve().parent / "worker.py"
spec = importlib.util.spec_from_file_location("worker_module", str(WORKER_PY))
worker_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker_module)

# Import ocr_corrections and validation for extra checks
OCR_CORR_PY = Path(__file__).resolve().parent / "ocr_corrections.py"
spec2 = importlib.util.spec_from_file_location("ocr_corr_module", str(OCR_CORR_PY))
ocr_corr = importlib.util.module_from_spec(spec2)
spec2.loader.exec_module(ocr_corr)

VALIDATION_PY = Path(__file__).resolve().parent / "validation.py"
spec3 = importlib.util.spec_from_file_location("validation_module", str(VALIDATION_PY))
validation = importlib.util.module_from_spec(spec3)
spec3.loader.exec_module(validation)

logger = logging.getLogger("debug_extraction")
logging.basicConfig(level=logging.INFO)


def save_text(path: Path, text: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def save_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def extract_candidates(text: str):
    """Run regexes to extract potential dive code candidates and numeric sequences."""
    import re
    candidates = {}
    # Use parser patterns if available
    try:
        parser_cls = worker_module.DivingPDFParser
        pattern_str = parser_cls.DIVE_CODE_PATTERN
        if isinstance(pattern_str, str):
            code_re = re.compile(pattern_str)
        else:
            code_re = pattern_str
    except Exception:
        # Fallback simple pattern: 3-4 digits followed by A-D or trailing digits
        code_re = re.compile(r"\b[1-6]\d{2,3}[A-Db-d0-9]\b")

    found = code_re.findall(text)
    candidates['codes'] = list(dict.fromkeys(found))  # unique preserve order

    # Extract numeric-looking tokens that might be difficulties or scores
    import re
    numeric_tokens = re.findall(r"\b\d+[\.,]?\d*\b", text)
    candidates['numeric_tokens_sample'] = numeric_tokens[:200]
    return candidates


def run(pdf_path: Path, out_dir: Path, dpi: int = 300, max_pages: int = None):
    logger.info(f"Rendering PDF: {pdf_path}")
    images = convert_from_path(str(pdf_path), dpi=dpi)
    if max_pages:
        images = images[:max_pages]

    per_page_text = []
    per_page_data = []

    for i, img in enumerate(images, start=1):
        logger.info(f"OCR page {i}/{len(images)}")
        # Run basic OCR with PSM 6 (uniform block of text) for better table detection
        ocr_config = '--psm 6'
        text = pytesseract.image_to_string(img, lang='fra+eng', config=ocr_config)
        data = pytesseract.image_to_data(img, output_type=Output.DICT, lang='fra+eng', config=ocr_config)

        per_page_text.append(text)
        per_page_data.append(data)

        # Save per-page artifacts
        save_text(out_dir / f"page_{i:03d}.txt", text)
        save_json(out_dir / f"page_{i:03d}_ocr_data.json", data)

    full_text = "\n\n---PAGE_BREAK---\n\n".join(per_page_text)

    # Save full raw OCR
    save_text(out_dir / "raw_ocr_full.txt", full_text)
    save_json(out_dir / "ocr_per_page_summary.json", {
        'pages': len(images),
        'per_page_chars': [len(t) for t in per_page_text]
    })

    # Run parser on the concatenated OCR text
    logger.info("Running parser.parse_text on full OCR text")
    parser = worker_module.DivingPDFParser()
    result = parser.parse_text(full_text)

    # Convert result to JSON-serializable form
    def result_to_dict(res):
        out = {
            'success': bool(res.success),
            'competition_name': res.competition_name,
            'event_type': res.event_type,
            'date': res.date,
            'location': res.location,
            'confidence': res.confidence,
            'errors': res.errors,
            'raw_text_snippet': res.raw_text[:4000]
        }
        dives = []
        athlete_names = set()
        event_names = set()
        if res.dives:
            for d in res.dives:
                athlete = getattr(d, 'athlete_name', getattr(d, 'athleteName', None))
                event = getattr(d, 'event_name', None)
                if athlete:
                    athlete_names.add(athlete)
                if event:
                    event_names.add(event)
                dives.append({
                    'athlete_name': athlete,
                    'dive_code': getattr(d, 'dive_code', getattr(d, 'diveCode', None)),
                    'round_number': getattr(d, 'round_number', getattr(d, 'roundNumber', None)),
                    'difficulty': getattr(d, 'difficulty', getattr(d, 'dd', None)),
                    'judge_scores': getattr(d, 'judge_scores', getattr(d, 'judgeScores', None)),
                    'final_score': getattr(d, 'final_score', getattr(d, 'finalScore', None)),
                    'cumulative_score': getattr(d, 'cumulative_score', getattr(d, 'cumulativeScore', None)),
                    'rank': getattr(d, 'rank', None),
                    'event_name': event,
                })
        out['dives'] = dives
        out['athletes'] = sorted(list(athlete_names))
        out['events'] = sorted(list(event_names))
        out['athlete_count'] = len(athlete_names)
        out['event_count'] = len(event_names)
        return out

    parsed = result_to_dict(result)
    save_json(out_dir / "parsed_result.json", parsed)

    # Save candidates
    candidates = extract_candidates(full_text)
    save_json(out_dir / "pre_candidates.json", candidates)

    # For each candidate, apply corrections and validation
    detailed = []
    for code in candidates.get('codes', [])[:500]:
        corrected, was_corrected, desc = ocr_corr.correct_dive_code(code)
        is_valid, err = validation.validate_dive_code(corrected)
        detailed.append({
            'raw': code,
            'corrected': corrected,
            'was_corrected': was_corrected,
            'correction_desc': desc,
            'valid_after_correction': is_valid,
            'validation_error': err
        })
    save_json(out_dir / "candidates_corrections.json", detailed)

    logger.info(f"Debug output saved to: {out_dir}")
    return out_dir


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--pdf", type=str, help="Path to PDF file")
    p.add_argument("--out", type=str, default="worker/debug-output", help="Output folder")
    p.add_argument("--dpi", type=int, default=300, help="PDF render DPI")
    p.add_argument("--max-pages", type=int, default=5, help="Max pages to process (for speed)")
    args = p.parse_args()

    if not args.pdf:
        # Try to locate PDF from fixtures
        if FixtureLoader:
            try:
                loader = FixtureLoader()
                fixture = loader.load_ground_truth()
                pdf_name = fixture.metadata.pdf_file_name
                pdf_path = PROJECT_ROOT / pdf_name
                if not pdf_path.exists():
                    logger.error(f"Ground truth PDF not found at {pdf_path}. Please provide --pdf")
                    return
                logger.info(f"Using ground-truth PDF: {pdf_path}")
            except Exception as e:
                logger.error("Could not auto-locate ground truth PDF. Provide --pdf argument.")
                return
        else:
            logger.error("No PDF provided and FixtureLoader unavailable. Provide --pdf argument.")
            return
    else:
        pdf_path = Path(args.pdf)
        if not pdf_path.exists():
            logger.error(f"PDF not found: {pdf_path}")
            return

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    run(pdf_path, out_dir, dpi=args.dpi, max_pages=args.max_pages)


if __name__ == '__main__':
    main()
