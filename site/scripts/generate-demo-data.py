"""Generate the starter questions, the demo (mock) answers and the practice quiz bank.

Reads, without modifying them:
  - CLAUDE.md          (repository root): the four starter questions and the answer labels
                       (section headings and final-answer lines), copied exactly.
  - dataset_rag.csv    (repository root): the real corpus rows used as demo sources and quiz items.

Writes:
  - site/src/app/core/starters.ts
  - site/src/app/core/demo-data.ts
  - site/src/app/core/quiz-bank.ts

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
OUT_QUIZ = SITE / "src" / "app" / "core" / "quiz-bank.ts"

# Practice quiz bank (CLAUDE.md, Features 6): about 5 AfriMMLU rows per subject.
QUIZ_SUBJECTS = [
    "elementary_mathematics",
    "high_school_geography",
    "high_school_microeconomics",
    "international_law",
    "global_facts",
]
QUIZ_PER_SUBJECT = 5
# Short enough for four option buttons (at most two lines each) and a question on a 375 px screen.
QUIZ_MAX_OPTION = 56
QUIZ_MAX_QUESTION = 220
# Questions that point to a table, figure or passage the row does not include.
QUIZ_NEEDS_CONTEXT = re.compile(r"\b(table|graph|figure|diagram|chart|map|passage|shown|below|above)\b", re.I)
# Options such as "I and II only" refer to numbered statements the row does not include.
QUIZ_STATEMENT_OPTION = re.compile(r"\b(I|II|III|IV)\b(,| and| only)")
# Fractions that a spreadsheet turned into dates in the source data, for example "18-Jan".
QUIZ_DATE_ARTIFACT = re.compile(r"^\d{1,2}-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$")

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


def read_answer_labels() -> dict[str, str]:
    """The section headings and final-answer lines of a real answer (CLAUDE.md, Features 7)."""
    text = CLAUDE_MD.read_text(encoding="utf-8")
    sections = re.search(r'The sections under "(.+?)" and "(.+?)" are shown', text)
    finals = re.search(r"The final-answer line \(`(\*\*.+?\*\*)`, `\*\*.+?\*\*`, `(\*\*.+?\*\*)`\)", text)
    if not (sections and finals):
        sys.exit("Could not find the answer labels (Features 7) in CLAUDE.md")
    return {
        "yo_heading": sections.group(1),
        "en_heading": sections.group(2),
        "yo_final": finals.group(1),
        "en_final": finals.group(2),
    }


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


# Demo answers follow the shape of a real Twins for Change answer (the backend's tutor prompt):
# a Yorùbá section, "---", an English section, each ending with its final-answer line written
# right after the last step, with no blank line (the case the answer callout must handle).


def two_sections(labels: dict[str, str], yo_body: str, yo_answer: str, en_body: str, en_answer: str) -> str:
    return (
        f"### {labels['yo_heading']}\n{yo_body}\n{labels['yo_final']} {yo_answer}\n\n---\n\n"
        f"### {labels['en_heading']}\n{en_body}\n{labels['en_final']} {en_answer}\n"
    )


def answer_afrimgsm_train(row: dict[str, str], labels: dict[str, str]) -> str:
    f = labelled(row["pedagogical_answer"])
    steps_label, steps_text = f["Yorùbá Step-by-Step"].split(": ", 1)
    # The last sentence restates the answer, which the final-answer line already gives.
    steps = sentences(steps_text)[:-1]
    numbered = "\n".join(f"{i}. {s}" for i, s in enumerate(steps, start=1))
    en_steps = (
        "1. Roger starts with 5 tennis balls.\n"
        "2. 2 cans of 3 tennis balls each make 6 tennis balls.\n"
        f"3. {f['Math Equation']}"
    )
    return two_sections(
        labels,
        f"{steps_label}:\n\n{numbered}",
        f["Exact Final Answer"],
        f"{f['Verified Translation']}\n\n{en_steps}",
        f["Exact Final Answer"],
    )


def option_list(values: list[str]) -> str:
    return "\n".join(f"- {v}" for v in values)


def answer_afrimmlu(row: dict[str, str], labels: dict[str, str], steps: str = "") -> str:
    f = labelled(row["pedagogical_answer"])
    yo_options = options(f["Options (Yorùbá)"])
    en_options = options(f["Options (English)"])
    yo_body = f["Yorùbá Question"]
    if yo_options != en_options:
        yo_body += "\n\n" + option_list(yo_options)
    en_body = f"{f['English Question']}\n\n{option_list(en_options)}"
    if steps:
        yo_body += f"\n\n{steps}"
        en_body += f"\n\n{steps}"
    return two_sections(
        labels, yo_body, f["Verified Answer (Yorùbá)"], en_body, f["Verified Answer (English)"]
    )


def answer_belebele(row: dict[str, str], labels: dict[str, str]) -> str:
    f = labelled(row["pedagogical_answer"])
    yo_question, en_question = context_parts(row)[:2]
    yo_quote = sentence_with(f["Reading Passage (Yorùbá)"], "ọkùnrin Stark")
    en_quote = sentence_with(f["Reading Passage (English)"], "Stark's men took positions")
    return two_sections(
        labels,
        f"{yo_question}\n\n> {yo_quote}\n",
        f["Verified Answer (Yorùbá)"],
        f"{en_question}\n\n> {en_quote}\n",
        f["Verified Answer (English)"],
    )


def quiz_options(value: str) -> list[str] | None:
    """'A) x | B) y | C) z | D) w' -> ['x', 'y', 'z', 'w'], or None unless exactly A to D."""
    parts = [part.strip() for part in value.split(" | ")]
    if len(parts) != 4 or any(not part.startswith(f"{letter}) ") for letter, part in zip("ABCD", parts)):
        return None
    values = [part[3:].strip() for part in parts]
    return values if all(values) else None


def digits(text: str) -> list[str]:
    return sorted(re.findall(r"\d+", text))


def quiz_item(index: int, row: dict[str, str], skip: set[str]) -> dict | None:
    """One AfriMMLU row as a quiz item, or None if it does not parse or would not work as a quiz."""
    subject = re.match(r"^\[Subject: (.+?) \|", row["pedagogical_answer"])
    f = labelled(row["pedagogical_answer"])
    yo, en = f.get("Yorùbá Question", ""), f.get("English Question", "")
    yo_options = quiz_options(f.get("Options (Yorùbá)", ""))
    en_options = quiz_options(f.get("Options (English)", ""))
    answer = re.match(r"^([A-D])\) (.+)$", f.get("Verified Answer (English)", ""))
    yo_answer = re.match(r"^([A-D])\) (.+)$", f.get("Verified Answer (Yorùbá)", ""))
    if not (subject and yo and en and yo_options and en_options and answer and yo_answer):
        return None
    letter = answer.group(1)
    pick = "ABCD".index(letter)
    checks = [
        nfc(yo) not in skip,
        # Both verified answers agree with the options they point to.
        yo_answer.group(1) == letter,
        yo_answer.group(2).strip() == yo_options[pick],
        answer.group(2).strip() == en_options[pick],
        # Four different options in each language (some translations merge two of them).
        len({nfc(o) for o in yo_options}) == 4,
        len({nfc(o) for o in en_options}) == 4,
        # The Yorùbá and English versions carry the same numbers.
        digits(yo) == digits(en),
        all(digits(y) == digits(e) for y, e in zip(yo_options, en_options)),
        # Some rows have invisible format characters (U+200C) where tone marks should be.
        not any(unicodedata.category(ch) == "Cf" for ch in yo + "".join(yo_options)),
        not QUIZ_NEEDS_CONTEXT.search(en),
        not any(QUIZ_STATEMENT_OPTION.search(option) for option in en_options),
        not any(QUIZ_DATE_ARTIFACT.match(option) for option in yo_options + en_options),
        max(len(o) for o in yo_options + en_options) <= QUIZ_MAX_OPTION,
        max(len(yo), len(en)) <= QUIZ_MAX_QUESTION,
    ]
    if not all(checks):
        return None
    return {
        "id": f"{row['source_dataset']}-{index}",
        "source_dataset": row["source_dataset"],
        "subject": subject.group(1),
        "yo": yo,
        "en": en,
        "options_yo": yo_options,
        "options_en": en_options,
        "answer": letter,
    }


def quiz_bank(rows: list[dict[str, str]], starters: list[dict[str, str]]) -> list[dict]:
    """About 5 items per subject, picked evenly across the corpus order: deterministic, no randomness."""
    skip = {nfc(s["yo"]) for s in starters}  # keep the starter questions fresh for the A/B demo
    by_subject: dict[str, list[dict]] = {s: [] for s in QUIZ_SUBJECTS}
    seen: set[str] = set()
    for index, row in enumerate(rows):
        if not row["source_dataset"].startswith("afrimmlu"):
            continue
        item = quiz_item(index, row, skip)
        if item and item["subject"] in by_subject and nfc(item["yo"]) not in seen:
            seen.add(nfc(item["yo"]))
            by_subject[item["subject"]].append(item)
    picked = []
    for subject, items in by_subject.items():
        if len(items) < QUIZ_PER_SUBJECT:
            sys.exit(f"Only {len(items)} quiz candidates for {subject}")
        # The middle of each of 5 equal slices of the candidates.
        picked.append([items[(2 * i + 1) * len(items) // (2 * QUIZ_PER_SUBJECT)] for i in range(QUIZ_PER_SUBJECT)])
    # Interleave the subjects, so "Next question" moves from subject to subject.
    return [item for group in zip(*picked) for item in group]


def quiz_entry(item: dict) -> str:
    def string_list(values: list[str]) -> str:
        return "[" + ", ".join(ts_string(v) for v in values) + "]"

    return (
        "  {\n"
        f"    id: {ts_string(item['id'])},\n"
        f"    source_dataset: {ts_string(item['source_dataset'])},\n"
        f"    subject: {ts_string(item['subject'])},\n"
        f"    yo: {ts_string(item['yo'])},\n"
        f"    en: {ts_string(item['en'])},\n"
        f"    options: {{\n      yo: {string_list(item['options_yo'])},\n"
        f"      en: {string_list(item['options_en'])},\n    }},\n"
        f"    answer: {ts_string(item['answer'])},\n"
        "  },"
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
    labels = read_answer_labels()
    rows = read_rows()

    own_rows = [find_row(rows, s["yo"]) for s in starters]
    answers = [
        answer_afrimgsm_train(own_rows[0], labels),
        answer_afrimmlu(own_rows[1], labels, steps="1. 24 = 2p\n2. 24 ÷ 2 = 2p ÷ 2\n3. p = 12"),
        answer_afrimmlu(own_rows[2], labels),
        answer_belebele(own_rows[3], labels),
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

    quiz = quiz_bank(rows, starters)
    OUT_QUIZ.write_text(
        header.format("dataset_rag.csv (AfriMMLU rows)")
        + "\n/** A multiple-choice question for Practice (CLAUDE.md, Features 6), copied from a real row. */\n"
        "export interface QuizItem {\n"
        "  /** The row's source_dataset and its position in dataset_rag.csv. */\n"
        "  readonly id: string;\n"
        "  readonly source_dataset: string;\n"
        "  /** AfriMMLU subject id, for example \"global_facts\". */\n"
        "  readonly subject: string;\n"
        "  readonly yo: string;\n"
        "  readonly en: string;\n"
        "  /** Options A to D in each language, without their \"A) \" prefix. */\n"
        "  readonly options: { readonly yo: readonly string[]; readonly en: readonly string[] };\n"
        "  /** Letter of the verified answer. */\n"
        "  readonly answer: 'A' | 'B' | 'C' | 'D';\n"
        "}\n\n"
        f"/** {len(quiz)} questions, {QUIZ_PER_SUBJECT} per subject, without the two AfriMMLU starter questions. */\n"
        "export const QUIZ_BANK: readonly QuizItem[] = [\n" + "\n".join(quiz_entry(i) for i in quiz) + "\n];\n",
        encoding="utf-8",
    )
    print(
        f"Wrote {OUT_STARTERS.relative_to(REPO)}, {OUT_DEMO.relative_to(REPO)} "
        f"and {OUT_QUIZ.relative_to(REPO)} ({len(quiz)} quiz items)"
    )


if __name__ == "__main__":
    main()
