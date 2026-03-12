#!/usr/bin/env python3
"""
Extract structured diving results from PDF text layers.

This keeps the existing dive-code correction and validation utilities but
replaces the service-era parser with a simpler line parser over
`pdftotext -layout`, which is much more reliable for the PDFs in this repo.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

from ocr_corrections import correct_difficulty_ocr, correct_dive_code, correct_judge_score_ocr


ATHLETE_PATTERN = re.compile(r"^\s*(\d+)\s+(.+?)\s+\((\d{4})\)\s+--\s+(.+)$")
ATHLETE_CONTINUATION_PATTERN = re.compile(r"^\s+(.+?)\s+\((\d{4})\)\s+--\s+(.+)$")
DIVE_PATTERN = re.compile(r"^\s*([1-6]\d{2,3}[A-Da-d0-9])\s+(.+)$")


def run_pdftotext(pdf_path: Path, layout: bool = True) -> str:
    if not shutil.which("pdftotext"):
        return ""

    command = ["pdftotext"]
    if layout:
        command.append("-layout")
    command.extend([str(pdf_path), "-"])
    result = subprocess.run(command, check=False, capture_output=True, text=True)
    if result.returncode != 0:
        return ""
    return result.stdout


def clean_line(line: str) -> str:
    cleaned = line.replace("\x0c", "").rstrip()
    cleaned = re.sub(r"\s+\d+\.\d+\.\d+\.\d+$", "", cleaned)
    return cleaned


def parse_decimal(value: str) -> float | None:
    if not value:
        return None
    value = value.strip()
    difficulty, _, _ = correct_difficulty_ocr(value)
    if difficulty and 0.9 <= difficulty <= 4.5:
        return difficulty
    judge, _, _ = correct_judge_score_ocr(value)
    if judge or value in {"0", "0,0", "0.0", "0,00", "0.00"}:
        return judge
    try:
        return float(value.replace(",", "."))
    except ValueError:
        return None


def is_event_header(line: str, next_lines: list[str]) -> bool:
    stripped = line.strip()
    if not stripped:
        return False
    if stripped.startswith("http") or stripped.startswith("Penalty codes"):
        return False
    if re.search(r"Page \d+ / \d+", stripped):
        return False
    if ATHLETE_PATTERN.match(stripped) or DIVE_PATTERN.match(stripped):
        return False
    preview = " ".join(x.strip() for x in next_lines[:3])
    return "HauteurCoef" in preview or "Height DD" in preview


def split_columns(payload: str) -> list[str]:
    return [part.strip() for part in re.split(r"\s{2,}", payload.strip()) if part.strip()]


def is_synchro_event(event_name: str | None) -> bool:
    return bool(event_name and "synchro" in event_name.lower())


def parse_dive_line(line: str, entry: dict, event_name: str | None) -> dict | None:
    match = DIVE_PATTERN.match(line)
    if not match:
        return None

    raw_code, remainder = match.groups()
    dive_code, _, _ = correct_dive_code(raw_code.upper())
    columns = split_columns(remainder)
    if len(columns) < 5:
        return None

    first_numeric_index = next(
        (index for index, column in enumerate(columns) if parse_decimal(column) is not None),
        None,
    )
    if first_numeric_index is None:
        return None

    description_parts = columns[:first_numeric_index]
    numeric_columns = columns[first_numeric_index:]
    if len(numeric_columns) < 5:
        return None

    penalty = None
    if len(numeric_columns) >= 6 and re.fullmatch(r"\d+", numeric_columns[-1]):
        penalty = int(numeric_columns[-1])
        numeric_columns = numeric_columns[:-1]

    if len(numeric_columns) < 5:
        return None

    height_raw = numeric_columns[0]
    difficulty_raw = numeric_columns[1] if len(numeric_columns) > 1 else None
    score_columns = numeric_columns[2:-3]
    total_raw, points_raw, cumulative_raw = numeric_columns[-3:]

    execution_scores = []
    synchronization_scores = []
    if is_synchro_event(event_name) and len(score_columns) >= 5:
        synchronization_raw = score_columns[-5:]
        execution_raw = score_columns[:-5]
        for item in execution_raw:
            score = parse_decimal(item)
            if score is not None:
                execution_scores.append(score)
        for item in synchronization_raw:
            score = parse_decimal(item)
            if score is not None:
                synchronization_scores.append(score)
    else:
        for item in score_columns:
            score = parse_decimal(item)
            if score is not None:
                execution_scores.append(score)

    height = parse_decimal(height_raw)
    difficulty = parse_decimal(difficulty_raw) if difficulty_raw else None
    judge_scores = execution_scores + synchronization_scores

    return {
        "athlete_name": entry["primary_name"],
        "entry_key": entry["key"],
        "entry_name": entry["entry_name"],
        "participant_names": [participant["name"] for participant in entry["participants"]],
        "rank": entry["rank"],
        "event_name": event_name,
        "event_type": entry["event_type"],
        "dive_code": dive_code,
        "description": " ".join(description_parts) if description_parts else None,
        "height": f"{height:g}m" if height is not None else None,
        "difficulty": difficulty,
        "judge_scores": judge_scores,
        "execution_scores": execution_scores,
        "synchronization_scores": synchronization_scores,
        "total": parse_decimal(total_raw),
        "final_score": parse_decimal(points_raw),
        "cumulative_score": parse_decimal(cumulative_raw),
        "penalty": penalty,
    }


def extract_metadata(lines: list[str]) -> dict:
    meaningful = [
        line.strip()
        for line in lines
        if line.strip()
        and not re.fullmatch(r"\d+\.\d+\.\d+\.\d+", line.strip())
        and "Detailed Results" not in line
        and "Résultats détaillés" not in line
    ]
    title = meaningful[0] if meaningful else None
    date_index = None

    for index, line in enumerate(meaningful[1:8], start=1):
        lower = line.lower()
        if any(
            token in lower
            for token in [
                "lundi",
                "mardi",
                "mercredi",
                "jeudi",
                "vendredi",
                "samedi",
                "dimanche",
                "maandag",
                "dinsdag",
                "woensdag",
                "donderdag",
                "vrijdag",
                "zaterdag",
                "zondag",
                "janvier",
                "février",
                "mars",
                "avril",
                "mai",
                "juin",
                "juillet",
                "août",
                "septembre",
                "octobre",
                "novembre",
                "décembre",
                "march",
            ]
        ) or re.search(r"\b20\d{2}\b", line):
            if any(char.isalpha() for char in line):
                date_index = index
                break

    date = meaningful[date_index] if date_index is not None else None
    location_parts = []
    for line in meaningful[1 : date_index if date_index is not None else 4]:
        if re.fullmatch(r"20\d{2}", line):
            continue
        location_parts.append(line)
    location = ", ".join(location_parts) if location_parts else None
    return {
        "competition_name": title,
        "location": location,
        "date": date,
    }


def parse_layout_text(text: str) -> dict:
    lines = [clean_line(line) for line in text.splitlines()]
    metadata = extract_metadata(lines)

    current_event = None
    current_entry = None
    dives: list[dict] = []
    events: list[str] = []
    athletes: dict[str, dict] = {}
    entries: dict[str, dict] = {}

    for index, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("https://www.diverecorder.co.uk"):
            continue
        if stripped.startswith("Penalty codes") or stripped.startswith("Codes des pénalités"):
            continue
        if stripped.startswith("Detailed Results") or stripped.startswith("Résultats détaillés"):
            continue

        next_lines = lines[index + 1:index + 4]
        if is_event_header(line, next_lines):
            current_event = stripped
            events.append(stripped)
            current_entry = None
            continue

        athlete_match = ATHLETE_PATTERN.match(line)
        if athlete_match:
            rank, athlete_name, birth_year, club = athlete_match.groups()
            event_type = "synchro" if is_synchro_event(current_event) else "individual"
            member = {
                "name": athlete_name.strip(),
                "birth_year": birth_year,
                "club": club.strip(),
            }
            current_entry = {
                "key": f"{current_event or 'unknown'}::{rank}::{athlete_name.strip()}",
                "rank": int(rank),
                "event_name": current_event,
                "event_type": event_type,
                "entry_name": athlete_name.strip(),
                "primary_name": athlete_name.strip(),
                "participants": [member],
            }
            entries[current_entry["key"]] = current_entry
            athlete_key = f"{member['name']}::{member['birth_year']}::{member['club']}"
            athletes[athlete_key] = {
                "name": member["name"],
                "birth_year": member["birth_year"],
                "club": member["club"],
                "events": set(),
            }
            if current_event:
                athletes[athlete_key]["events"].add(current_event)
            continue

        continuation_match = ATHLETE_CONTINUATION_PATTERN.match(line)
        if (
            continuation_match
            and current_entry
            and current_entry["event_type"] == "synchro"
            and len(current_entry["participants"]) == 1
        ):
            athlete_name, birth_year, club = continuation_match.groups()
            member = {
                "name": athlete_name.strip(),
                "birth_year": birth_year,
                "club": club.strip(),
            }
            current_entry["participants"].append(member)
            current_entry["entry_name"] = " / ".join(
                participant["name"] for participant in current_entry["participants"]
            )
            athlete_key = f"{member['name']}::{member['birth_year']}::{member['club']}"
            athletes[athlete_key] = {
                "name": member["name"],
                "birth_year": member["birth_year"],
                "club": member["club"],
                "events": set(),
            }
            if current_event:
                athletes[athlete_key]["events"].add(current_event)
            continue

        if not current_entry:
            continue

        dive = parse_dive_line(line, current_entry, current_event)
        if not dive:
            continue
        dives.append(dive)
        for participant in current_entry["participants"]:
            athlete_key = f"{participant['name']}::{participant['birth_year']}::{participant['club']}"
            athletes[athlete_key]["events"].add(current_event)

    athlete_list = []
    for athlete in athletes.values():
        athlete_list.append(
            {
                "name": athlete["name"],
                "birth_year": athlete["birth_year"],
                "club": athlete["club"],
                "events": sorted(event for event in athlete["events"] if event),
            }
        )

    entry_list = []
    for entry in entries.values():
        entry_list.append(
            {
                "key": entry["key"],
                "entry_name": entry["entry_name"],
                "primary_name": entry["primary_name"],
                "rank": entry["rank"],
                "event_name": entry["event_name"],
                "event_type": entry["event_type"],
                "participants": entry["participants"],
            }
        )

    return {
        "success": len(dives) > 0,
        "competition_name": metadata["competition_name"],
        "location": metadata["location"],
        "date": metadata["date"],
        "event_type": None,
        "confidence": 0.94 if dives else 0.0,
        "errors": [] if dives else ["No dives extracted from PDF text layer"],
        "summary": {
            "total_dives": len(dives),
            "total_athletes": len(athlete_list),
            "total_events": len(set(events)),
            "events": sorted(set(events)),
        },
        "athletes": athlete_list,
        "entries": entry_list,
        "dives": dives,
    }


def run_extraction(pdf_path: Path) -> dict:
    text = run_pdftotext(pdf_path, layout=True)
    if not text.strip():
        text = run_pdftotext(pdf_path, layout=False)
    result = parse_layout_text(text)
    result["method"] = "pdf-text"
    result["raw_text_length"] = len(text)
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf_path")
    parser.add_argument("--pretty", action="store_true")
    args = parser.parse_args()

    pdf_path = Path(args.pdf_path)
    if not pdf_path.exists():
        print(json.dumps({"success": False, "errors": [f"File not found: {pdf_path}"]}))
        return 1

    result = run_extraction(pdf_path)
    if args.pretty:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print(json.dumps(result, ensure_ascii=False))

    return 0 if result.get("success") else 2


if __name__ == "__main__":
    sys.exit(main())
