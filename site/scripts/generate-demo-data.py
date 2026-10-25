"""Generate the starter questions and the demo (mock) answers for the frontend.

Reads, without modifying them:
  - CLAUDE.md          (repository root): the four starter questions, copied exactly.
  - dataset_rag.csv    (repository root): the real corpus rows used as demo sources.

Writes:
  - site/src/app/core/starters.ts
  - site/src/app/core/demo-data.ts

Every Yorùbá string is copied programmatically from those files, so tone marks are
never retyped. Run from anywhere:  python3 site/scripts/generate-demo-data.py
"""

from __future__ import annotations

import csv
import json
import re
import sys
import unicodedata
from pathlib import Path

SITE = Path(__file__).resolve().parents[1]
REPO = SITE.parent
CLAUDE_MD = REPO / "CLAUDE.md"
CSV_PATH = REPO / "dataset_rag.csv"
OUT_STARTERS = SITE / "src" / "app" / "core" / "starters.ts"
OUT_DEMO = SITE / "src" / "app" / "core" / "demo-data.ts"

# Related rows shown as sources 2 and 3 for each starter, found by a unique
# substring of their search_context. Source 1 is always the starter's own row.
RELATED = [
    ["Melissa bought 4 packs of tennis balls", "Brian has twice as many tennis balls as Frodo"],
    ["find the value of a in 6a = 72", "value of y in the equation y/4 = 8"],
    ["shift to the right in the demand curve for orange juice", "increase in the demand for ice cream cones"],
    ["men extend their fence", "Who delivered the statement regarding the US troops"],
]


def nfc(text: str) -> str:
    return unicodedata.normalize("NFC", text)


def ts_string(value: str) -> str:
    """A TypeScript string literal. Visible characters stay as UTF-8; invisible ones are escaped."""
    out = []
    for ch in json.dumps(value, ensure_ascii=False):
        if unicodedata.category(ch) in ("Cf", "Zl", "Zp") or ch == " ":
            out.append(f"\\u{ord(ch):04x}")
        else:
            out.append(ch)
    return "".join(out)


def read_starters() -> list[dict[str, str]]:
    pattern = re.compile(r'^\s+(\d)\. (.+?): "(.+?)" \((.+?)\) Verified answer: (.+)$')
    starters = []
    for line in CLAUDE_MD.read_text(encoding="utf-8").splitlines():
        match = pattern.match(line)
        if match:
            _, subject, yo, en, _answer = match.groups()
            starters.append({"subject": subject, "yo": yo, "en": en})
    if len(starters) != 4:
        sys.exit(f"Expected 4 starter questions in CLAUDE.md, found {len(starters)}")
    return starters


def read_rows() -> list[dict[str, str]]:
    with CSV_PATH.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def find_row(rows: list[dict[str, str]], needle: str) -> dict[str, str]:
    matches = [row for row in rows if nfc(needle) in nfc(row["search_context"])]
    if len(matches) != 1:
        sys.exit(f"Expected exactly one row for {needle!r}, found {len(matches)}")
    return matches[0]


def labelled(answer: str) -> dict[str, str]:
    """Map '[Label]: value' and '- Key: value' lines of a pedagogical_answer to their values."""
    fields: dict[str, str] = {}
    for line in answer.splitlines():
        match = re.match(r"^\[(.+?)\]:\s?(.*)$", line) or re.match(r"^- (.+?): (.*)$", line)
        if match:
            fields[match.group(1)] = match.group(2).strip()
    return fields


def options(value: str) -> list[str]:
    return [part.strip() for part in value.split(" | ")]


def sentences(text: str) -> list[str]:
    return [part.strip() for part in re.split(r"(?<=\.)\s+", text) if part.strip()]


def sentence_with(text: str, needle: str) -> str:
    found = [s for s in sentences(text) if needle in s]
    if len(found) != 1:
        sys.exit(f"Expected one sentence containing {needle!r}")
    return found[0]


def context_parts(row: dict[str, str]) -> list[str]:
    return [part.strip() for part in row["search_context"].split("|")]


def answer_afrimgsm_train(row: dict[str, str]) -> str:
    f = labelled(row["pedagogical_answer"])
    yo_question = context_parts(row)[0]
    steps_label, steps_text = f["Yorùbá Step-by-Step"].split(": ", 1)
    steps = sentences(steps_text)
    numbered = "\n".join(f"{i}. {s}" for i, s in enumerate(steps[:-1], start=1))
    return (
        f"### Yorùbá\n\n**{yo_question}**\n\n{steps_label}:\n\n{numbered}\n\n**{steps[-1]}**\n\n"
        f"### English summary\n\n{f['Verified Translation']}\n\n"
        "1. Roger starts with 5 tennis balls.\n"
        "2. 2 cans of 3 tennis balls each make 6 tennis balls.\n"
        f"3. {f['Math Equation']}\n\n"
        f"Exact final answer: **{f['Exact Final Answer']}**\n"
    )


def option_list(values: list[str]) -> str:
    return "\n".join(f"- {v}" for v in values)


def answer_afrimmlu(row: dict[str, str], steps: str = "") -> str:
    f = labelled(row["pedagogical_answer"])
    yo_options = options(f["Options (Yorùbá)"])
    en_options = options(f["Options (English)"])
    same = yo_options == en_options
    yo_block = f"**{f['Yorùbá Question']}**\n\n"
    if not same:
        yo_block += option_list(yo_options) + "\n\n"
    yo_block += f"**{f['Verified Answer (Yorùbá)']}**\n\n"
    return (
        f"### Yorùbá\n\n{yo_block}"
        + (f"### Step by step\n\n{steps}\n\n" if steps else "")
        + f"### English summary\n\n{f['English Question']}\n\n{option_list(en_options)}\n\n"
        f"Verified answer: **{f['Verified Answer (English)']}**\n"
    )


def answer_belebele(row: dict[str, str]) -> str:
    f = labelled(row["pedagogical_answer"])
    yo_question, en_question = context_parts(row)[:2]
    yo_quote = sentence_with(f["Reading Passage (Yorùbá)"], "ọkùnrin Stark")
    en_quote = sentence_with(f["Reading Passage (English)"], "Stark's men took positions")
    return (
        f"### Yorùbá\n\n**{yo_question}**\n\n> {yo_quote}\n\n**{f['Verified Answer (Yorùbá)']}**\n\n"
        f"### English summary\n\n{en_question}\n\n> {en_quote}\n\n"
        f"Verified answer: **{f['Verified Answer (English)']}**\n"
    )


def source(row: dict[str, str], rank: int) -> str:
    return (
        "      {\n"
        f"        rank: {rank},\n"
        f"        source_dataset: {ts_string(row['source_dataset'])},\n"
        f"        search_context: {ts_string(row['search_context'])},\n"
        f"        pedagogical_answer: {ts_string(row['pedagogical_answer'])},\n"
        "      }"
    )


def main() -> None:
    starters = read_starters()
    rows = read_rows()

    own_rows = [find_row(rows, s["yo"]) for s in starters]
    answers = [
        answer_afrimgsm_train(own_rows[0]),
        answer_afrimmlu(own_rows[1], steps="1. 24 = 2p\n2. 24 ÷ 2 = 2p ÷ 2\n3. 12 = p, so p = 12"),
        answer_afrimmlu(own_rows[2]),
        answer_belebele(own_rows[3]),
    ]

    header = (
        "// GENERATED by site/scripts/generate-demo-data.py from {}. Do not edit by hand:\n"
        "// change the script and run it again, so Yorùbá text is always copied, never retyped.\n"
    )

    starter_items = "\n".join(
        "  {\n"
        f"    subject: {ts_string(s['subject'])},\n"
        f"    yo: {ts_string(s['yo'])},\n"
        f"    en: {ts_string(s['en'])},\n"
        "  },"
        for s in starters
    )
    OUT_STARTERS.write_text(
        header.format("CLAUDE.md")
        + "\n/** The four real corpus questions shown on the welcome screen (CLAUDE.md, Features 2). */\n"
        "export interface Starter {\n  readonly subject: string;\n  readonly yo: string;\n  readonly en: string;\n}\n\n"
        f"export const STARTERS: readonly Starter[] = [\n{starter_items}\n];\n",
        encoding="utf-8",
    )

    entries = []
    for starter, own, answer, related in zip(starters, own_rows, answers, RELATED):
        source_rows = [own] + [find_row(rows, needle) for needle in related]
        sources = ",\n".join(source(r, i) for i, r in enumerate(source_rows, start=1))
        entries.append(
            "  {\n"
            f"    question: {ts_string(starter['yo'])},\n"
            f"    answer: {ts_string(answer)},\n"
            f"    sources: [\n{sources},\n    ],\n"
            "  },"
        )
    OUT_DEMO.write_text(
        header.format("CLAUDE.md and dataset_rag.csv")
        + "\nimport { CorpusSource } from './models';\n\n"
        "/** A prepared demo answer: built from real corpus rows, never generated by a model. */\n"
        "export interface DemoAnswer {\n  readonly question: string;\n  readonly answer: string;\n"
        "  readonly sources: readonly CorpusSource[];\n}\n\n"
        "/** Demo data for the four starter questions. Sources are copied exactly from dataset_rag.csv. */\n"
        f"export const DEMO_ANSWERS: readonly DemoAnswer[] = [\n" + "\n".join(entries) + "\n];\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUT_STARTERS.relative_to(REPO)} and {OUT_DEMO.relative_to(REPO)}")


if __name__ == "__main__":
    main()
