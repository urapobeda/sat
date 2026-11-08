"""
Step 1 of the Math import: cut the College Board Question Bank PDF into pieces.

For every question it writes:
  - question.png   the whole question (stem + answer choices), for the AI step
  - rationale.png  the official rationale, for the AI step
  - fig-N.png      every graph / diagram / table found in the stem or in a choice,
                   cropped on its own so the site can show it as a picture

and one JSON record with the metadata that the PDF text layer gives reliably
(ID, domain, skill, difficulty, correct answer, where each figure belongs).

Formulas in this PDF are drawn as vector outlines, so the text layer has gaps
where the math was. That is why step 2 (convert-math-questions.mjs) reads the
pictures with an AI model and writes the math back as LaTeX.

Usage:
  python scripts/extract-math-questions.py --pdf path/to/math.pdf
  python scripts/extract-math-questions.py --pdf math.pdf --first-page 1 --last-page 60
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

try:
    import pdfplumber
    import pypdfium2 as pdfium
    from PIL import Image
except ModuleNotFoundError as error:
    raise SystemExit(
        f"Missing dependency: {error.name}. Run: pip install pdfplumber pypdfium2 pillow"
    )

LEFT_LABEL_MAX_X = 22  # section labels ("Question", "Answer", "A.") sit at x ~ 18
PAGE_LEFT = 14
PAGE_RIGHT = 598
FIGURE_GAP = 3  # pt; vector pieces closer than this belong to one drawing
FIGURE_PAD = 4  # pt of white space kept around a cropped figure
CHOICE_LABELS = ["A.", "B.", "C.", "D."]


@dataclass
class Mark:
    page: int  # 0-based page index
    top: float
    bottom: float


@dataclass
class Record:
    start_page: int
    pages: list[int] = field(default_factory=list)
    text: str = ""
    labels: dict[str, Mark] = field(default_factory=dict)
    page_bottoms: dict[int, float] = field(default_factory=dict)
    header: dict[str, str] = field(default_factory=dict)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--pdf", required=True, help="Math Question Bank PDF")
    parser.add_argument("--out", default="data/math", help="Output folder (default: data/math)")
    parser.add_argument("--first-page", type=int, default=1)
    parser.add_argument("--last-page", type=int, default=None)
    parser.add_argument("--dpi", type=int, default=200, help="Render resolution for crops")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    out_dir = Path(args.out)
    asset_dir = out_dir / "assets"
    asset_dir.mkdir(parents=True, exist_ok=True)

    plumber = pdfplumber.open(args.pdf)
    renderer = pdfium.PdfDocument(args.pdf)
    last_page = min(args.last_page or len(plumber.pages), len(plumber.pages))
    first_index = max(args.first_page, 1) - 1

    records = collect_records(plumber, first_index, last_page)
    print(f"Found {len(records)} questions on pages {first_index + 1}-{last_page}", file=sys.stderr)

    page_cache: dict[int, Image.Image] = {}
    results = []
    problems = []

    for number, record in enumerate(records, start=1):
        try:
            item = build_item(record, plumber, renderer, page_cache, asset_dir, args.dpi)
        except Exception as error:  # keep going; report at the end
            problems.append({"page": record.start_page + 1, "error": str(error)})
            continue

        results.append(item)
        trim_cache(page_cache, record.pages)

        if number % 50 == 0:
            print(f"  {number}/{len(records)}", file=sys.stderr)

    output_path = out_dir / "math-extract.json"
    output_path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print_report(results, problems, output_path)


def collect_records(plumber, first_index: int, last_page: int) -> list[Record]:
    records: list[Record] = []
    current: Record | None = None

    for index in range(first_index, last_page):
        page = plumber.pages[index]
        words = page.extract_words(keep_blank_chars=False, use_text_flow=True)
        page_text = page.extract_text() or ""

        if page_text.startswith("Question ID:"):
            current = Record(start_page=index)
            records.append(current)

        if current is None:
            page.close()
            continue  # pages before the first question

        if not current.pages:
            current.header = parse_header(words)

        current.pages.append(index)
        current.text += page_text + "\n"
        current.page_bottoms[index] = content_bottom(page)
        find_labels(words, index, current.labels)
        page.close()  # pdfplumber keeps every parsed page in memory otherwise

        if (index + 1) % 200 == 0:
            print(f"  scanned {index + 1} pages", file=sys.stderr)

    return records


def parse_header(words: list[dict]) -> dict[str, str]:
    """Read the Assessment/Test/Domain/Skill/Difficulty table by column positions."""
    titles = {w["text"]: w for w in words if w["text"] in ("Domain", "Skill", "Difficulty") and w["top"] < 90}
    if len(titles) < 3:
        return {}
    row_top = titles["Domain"]["bottom"] + 4
    row_words = [w for w in words if row_top <= w["top"] < row_top + 45]
    columns = {}
    edges = [("domain", titles["Domain"]["x0"] - 2, titles["Skill"]["x0"] - 2),
             ("skill", titles["Skill"]["x0"] - 2, titles["Difficulty"]["x0"] - 2),
             ("difficulty", titles["Difficulty"]["x0"] - 2, 10_000)]
    for name, left, right in edges:
        cell = sorted((w for w in row_words if left <= w["x0"] < right), key=lambda w: (round(w["top"]), w["x0"]))
        columns[name] = " ".join(w["text"] for w in cell)
    return columns


def find_labels(words: list[dict], page_index: int, labels: dict[str, Mark]) -> None:
    left = [w for w in words if w["x0"] < LEFT_LABEL_MAX_X]

    for i, word in enumerate(left):
        text = word["text"]
        mark = Mark(page_index, word["top"], word["bottom"])

        if text == "Question" and "question_id" not in labels:
            labels["question_id"] = mark
        elif text == "Question" and "question" not in labels:
            labels["question"] = mark
        elif text == "Answer" and "question" in labels and "answer" not in labels and "correct" not in labels:
            labels["answer"] = mark
        elif text in CHOICE_LABELS and "answer" in labels and "correct" not in labels and text not in labels:
            labels[text] = mark
        elif text == "Correct" and "question" in labels and "correct" not in labels:
            labels["correct"] = mark
        elif text == "Rationale" and "question" in labels and "rationale" not in labels:
            labels["rationale"] = mark


def content_bottom(page) -> float:
    bottoms = [c["bottom"] for c in page.chars]
    bottoms += [o["bottom"] for o in page.curves + page.lines + page.rects]
    return max(bottoms) if bottoms else page.height


def build_item(record, plumber, renderer, page_cache, asset_dir: Path, dpi: int) -> dict:
    meta = parse_metadata(record.text, record.header)
    labels = record.labels
    if "correct" not in labels and "rationale" in labels:
        # some older items have no "Correct Answer:" line; the answer is only in the rationale
        labels["correct"] = labels["rationale"]

    missing = [name for name in ("question", "rationale") if name not in labels]

    if missing:
        raise ValueError(f"{meta['source_question_id']}: missing labels {missing}")

    question_dir = asset_dir / meta["source_question_id"]
    question_dir.mkdir(parents=True, exist_ok=True)

    q_start = labels["question"]
    q_end = labels["correct"]
    r_start = labels["rationale"]
    r_end = Mark(record.pages[-1], record.page_bottoms[record.pages[-1]], record.page_bottoms[record.pages[-1]])

    # 1) whole question (stem + choices) and rationale, for the AI step
    question_png = question_dir / "question.png"
    stack_region(record, renderer, page_cache, dpi, q_start.top - 2, q_start.page, q_end.top - 4, q_end.page).save(question_png)
    rationale_png = question_dir / "rationale.png"
    stack_region(record, renderer, page_cache, dpi, r_start.bottom + 2, r_start.page, r_end.top + 4, r_end.page).save(rationale_png)

    # 2) figures anywhere between "Question" and "Correct Answer", then decide
    #    whether each one belongs to the stem or to a choice A-D
    figures = []

    for page_index in pages_between(record.pages, q_start.page, q_end.page):
        top = q_start.bottom if page_index == q_start.page else 0
        bottom = q_end.top if page_index == q_end.page else record.page_bottoms[page_index] + 1
        page = plumber.pages[page_index]

        boxes = find_figures(page, top, bottom)
        page.close()

        for box in boxes:
            path = question_dir / f"fig-{len(figures) + 1}.png"
            crop_box(renderer, page_cache, page_index, box, dpi).save(path)
            figures.append(
                {
                    "id": f"F{len(figures) + 1}",
                    "location": figure_location(labels, page_index, box),
                    "file": path.as_posix(),
                    "width_pt": round(box[2] - box[0], 1),
                    "height_pt": round(box[3] - box[1], 1),
                }
            )

    # choices come in order, so when exactly one drawing was found per choice,
    # assign them A, B, C, D top to bottom (robust to labels above or below the drawing)
    choice_figures = [f for f in figures if f["location"] != "stem"]
    if len(choice_figures) == len(CHOICE_LABELS):
        for figure, label in zip(choice_figures, CHOICE_LABELS):
            figure["location"] = label[0]

    has_choices = all(label in labels for label in CHOICE_LABELS)
    meta.update(
        {
            "question_type": "multiple-choice" if has_choices else "student-produced-response",
            "question_image": question_png.as_posix(),
            "rationale_image": rationale_png.as_posix(),
            "figures": figures,
            "source_page_start": record.pages[0] + 1,
            "source_page_end": record.pages[-1] + 1,
        }
    )
    return meta


def figure_location(labels: dict[str, Mark], page_index: int, box: list[float]) -> str:
    """'stem', or 'A'-'D' when the drawing sits next to that choice label."""
    answer = labels.get("answer")

    if answer is None or (page_index, box[3]) <= (answer.page, answer.top + 2):
        return "stem"

    choice_marks = [(label[0], labels[label]) for label in CHOICE_LABELS if label in labels]

    # the label lies inside the drawing's vertical span (a table next to "A."),
    # or on the baseline just under it (a graph choice with "A." at its bottom-left)
    for letter, mark in choice_marks:
        if mark.page == page_index and box[1] - 8 <= mark.top <= box[3] + 24:
            return letter

    # otherwise: the closest label above the drawing
    above = [(letter, mark) for letter, mark in choice_marks if (mark.page, mark.top) <= (page_index, box[1] + 2)]
    return above[-1][0] if above else "stem"


def pages_between(pages: list[int], first: int, last: int) -> list[int]:
    return [p for p in pages if first <= p <= last]


def find_figures(page, top: float, bottom: float) -> list[list[float]]:
    pieces = [
        [o["x0"], o["top"], o["x1"], o["bottom"]]
        for o in page.curves + page.lines + page.rects
        if o["top"] >= top - 1 and o["bottom"] <= bottom + 1
    ]
    clusters = []
    for cluster in merge_boxes(pieces):
        clusters.extend(split_stacked(cluster, pieces))
    big, small = [], []

    for box in clusters:
        width, height = box[2] - box[0], box[3] - box[1]
        # inline formulas are short; drawings and tables are tall, or wide and fairly tall
        if (height >= 45 and width >= 30) or (height >= 28 and width >= 120):
            big.append(box)
        else:
            small.append(box)

    # this PDF reports glyph boxes about 1pt tall, so rebuild word height from font size
    words = [
        [w["x0"], w["top"] - 1, w["x1"], w["top"] + max(w["bottom"] - w["top"], w.get("size", 9) * 0.9, 8)]
        for w in page.extract_words(extra_attrs=["size"])
        if w["top"] >= top - 1 and w["top"] <= bottom and w["x0"] > LEFT_LABEL_MAX_X
    ]
    figures = [absorb_labels(box, small, words, [other for other in big if other is not box]) for box in big]
    return sorted(merge_overlapping(figures), key=lambda b: (b[1], b[0]))


def split_stacked(cluster: list[float], pieces: list[list[float]]) -> list[list[float]]:
    """
    Two drawings stacked almost touching (e.g. graph choices A and B) merge into
    one cluster. Split a tall cluster wherever no vector piece covers a horizontal
    strip of it.
    """
    if cluster[3] - cluster[1] < 150:
        return [cluster]

    members = sorted((p for p in pieces if inside(p, cluster)), key=lambda p: p[1])
    groups: list[list[list[float]]] = []
    reach = None

    for piece in members:
        if reach is None or piece[1] > reach + 1.5:
            groups.append([])
        groups[-1].append(piece)
        reach = piece[3] if reach is None or piece[1] > reach + 1.5 else max(reach, piece[3])

    if len(groups) == 1:
        return [cluster]

    return [[min(p[0] for p in g), min(p[1] for p in g), max(p[2] for p in g), max(p[3] for p in g)] for g in groups]


def merge_overlapping(boxes: list[list[float]]) -> list[list[float]]:
    """Merge boxes that really overlap (no gap allowed), keeping neighbours apart."""
    result: list[list[float]] = []
    for box in sorted(boxes, key=lambda b: b[1]):
        for other in result:
            if box[0] < other[2] and box[2] > other[0] and box[1] < other[3] and box[3] > other[1]:
                other[:] = [min(other[0], box[0]), min(other[1], box[1]), max(other[2], box[2]), max(other[3], box[3])]
                break
        else:
            result.append(box[:])
    return result


def absorb_labels(
    box: list[float], small: list[list[float]], words: list[list[float]], others: list[list[float]]
) -> list[float]:
    """
    Grow a drawing's box to take in its axis titles, tick labels and notes,
    but never a line of the surrounding paragraph. An item is taken only when
    everything on its text line fits within the drawing's width.
    """
    grown = box[:]
    items = small + words

    for _ in range(4):
        changed = False
        reach = [grown[0] - 22, grown[1] - 16, grown[2] + 22, grown[3] + 16]

        for item in items:
            if inside(item, grown) or not overlaps(item, reach, 0):
                continue

            # a label between two drawings belongs to the nearer one
            if any(distance(item, other) < distance(item, box) for other in others):
                continue

            line = [other for other in items if other[1] < item[3] - 2 and other[3] > item[1] + 2]
            if all(reach[0] <= other[0] and other[2] <= reach[2] for other in line):
                grown = [min(grown[0], item[0]), min(grown[1], item[1]), max(grown[2], item[2]), max(grown[3], item[3])]
                changed = True

        if not changed:
            break

    return grown


def distance(item: list[float], box: list[float]) -> float:
    dx = max(box[0] - item[2], item[0] - box[2], 0)
    dy = max(box[1] - item[3], item[1] - box[3], 0)
    return (dx * dx + dy * dy) ** 0.5


def inside(item: list[float], box: list[float]) -> bool:
    return box[0] <= item[0] and item[2] <= box[2] and box[1] <= item[1] and item[3] <= box[3]


def merge_boxes(boxes: list[list[float]]) -> list[list[float]]:
    boxes = sorted((b[:] for b in boxes), key=lambda b: b[1])
    merged = True

    while merged:
        merged = False
        result: list[list[float]] = []

        for box in boxes:
            for other in result:
                if overlaps(box, other, FIGURE_GAP):
                    other[0] = min(other[0], box[0])
                    other[1] = min(other[1], box[1])
                    other[2] = max(other[2], box[2])
                    other[3] = max(other[3], box[3])
                    merged = True
                    break
            else:
                result.append(box)

        boxes = result

    return boxes


def overlaps(a: list[float], b: list[float], gap: float) -> bool:
    return a[0] <= b[2] + gap and a[2] >= b[0] - gap and a[1] <= b[3] + gap and a[3] >= b[1] - gap


def render_page(renderer, page_cache: dict, page_index: int, dpi: int) -> Image.Image:
    if page_index not in page_cache:
        page = renderer[page_index]
        page_cache[page_index] = page.render(scale=dpi / 72).to_pil().convert("RGB")
    return page_cache[page_index]


def trim_cache(page_cache: dict, keep: list[int]) -> None:
    for page_index in list(page_cache):
        if page_index < min(keep):
            del page_cache[page_index]


def crop_box(renderer, page_cache, page_index: int, box: list[float], dpi: int) -> Image.Image:
    image = render_page(renderer, page_cache, page_index, dpi)
    scale = dpi / 72
    left = max(PAGE_LEFT, box[0] - FIGURE_PAD) * scale
    top = max(0, box[1] - FIGURE_PAD) * scale
    right = min(PAGE_RIGHT, box[2] + FIGURE_PAD) * scale
    bottom = min(image.height / scale, box[3] + 1.5) * scale  # keep the next text line out
    return image.crop((int(left), int(top), int(right), int(bottom)))


def stack_region(record, renderer, page_cache, dpi, top, top_page, bottom, bottom_page) -> Image.Image:
    scale = dpi / 72
    parts = []

    for page_index in pages_between(record.pages, top_page, bottom_page):
        image = render_page(renderer, page_cache, page_index, dpi)
        part_top = top if page_index == top_page else 20
        part_bottom = bottom if page_index == bottom_page else record.page_bottoms[page_index] + 4

        if part_bottom - part_top < 4:
            continue

        parts.append(image.crop((int(PAGE_LEFT * scale), int(max(0, part_top) * scale), int(PAGE_RIGHT * scale), int(part_bottom * scale))))

    if not parts:
        return Image.new("RGB", (int((PAGE_RIGHT - PAGE_LEFT) * scale), 10), "white")

    width = max(p.width for p in parts)
    height = sum(p.height for p in parts)
    sheet = Image.new("RGB", (width, height), "white")
    y = 0

    for part in parts:
        sheet.paste(part, (0, y))
        y += part.height

    return sheet


def parse_metadata(text: str, header: dict[str, str]) -> dict:
    question_id = first(r"Question ID:\s*([A-Za-z0-9]+)", text)
    domain = header.get("domain", "")
    skill = header.get("skill", "")
    difficulty = header.get("difficulty", "").strip().lower()
    if difficulty not in ("easy", "medium", "hard"):
        difficulty = "medium"

    correct_raw = first(r"Correct Answer:\s*([^\n]*)", text).strip()
    # "Note that 3/2 and 1.5 are examples of ways to enter a correct answer."
    examples = first(r"Note that (.+?) (?:is an example|are examples) of ways? to enter a correct answer", " ".join(text.split()))
    entry_examples = [e.strip() for e in re.split(r",\s*(?:and\s+)?|\s+and\s+", examples) if e.strip()] if examples else []

    return {
        "source_question_id": question_id,
        "source_name": "College Board SAT Suite Question Bank — Math",
        "section": "math",
        "category": domain,
        "topic": normalize_skill(skill),
        "difficulty": difficulty,
        "pdf_correct_answer": correct_raw,
        "pdf_entry_examples": entry_examples,
        "is_bluebook": True,
    }


def normalize_skill(skill: str) -> str:
    """Use the topic names the site already knows (see README 'Supported Question Bank topics')."""
    known = {
        "linear equations in one variable": "Linear Equations in One Variable",
        "linear functions": "Linear Functions",
        "linear equations in two variables": "Linear Equations in Two Variables",
        "systems of two linear equations in two variables": "Systems of Two Linear Equations in Two Variables",
        "linear inequalities in one or two variables": "Linear Inequalities in One or Two Variables",
        "equivalent expressions": "Equivalent Expressions",
        "nonlinear equations in one variable and systems of equations in two variables": "Nonlinear Equations in One Variable",
        "nonlinear functions": "Nonlinear Functions",
        "ratios, rates, proportional relationships, and units": "Ratios, Rates, Proportional Relationships, and Units",
        "percentages": "Percentages",
        "one-variable data: distributions and measures of center and spread": "One-Variable Data: Distributions and Measures of Center and Spread",
        "two-variable data: models and scatterplots": "Two-Variable Data: Models and Scatterplots",
        "probability and conditional probability": "Probability and Conditional Probability",
        "inference from sample statistics and margin of error": "Inference from Sample Statistics and Margin of Error",
        "evaluating statistical claims: observational studies and experiments": "Evaluating Statistical Claims: Observational Studies and Experiments",
        "area and volume": "Area and Volume",
        "lines, angles, and triangles": "Lines, Angles, and Triangles",
        "right triangles and trigonometry": "Right Triangles and Trigonometry",
        "circles": "Circles",
    }
    return known.get(skill.lower().strip(), skill.strip() or "Uncategorized")


def first(pattern: str, text: str, flags: int = 0) -> str:
    match = re.search(pattern, text, flags)
    return match.group(1) if match else ""


def print_report(results: list[dict], problems: list[dict], output_path: Path) -> None:
    from collections import Counter

    print(f"\nWrote {len(results)} questions to {output_path}")
    print("Types:", dict(Counter(r["question_type"] for r in results)))
    print("Difficulty:", dict(Counter(r["difficulty"] for r in results)))
    print("Figures by location:", dict(Counter(f["location"] for r in results for f in r["figures"])))
    no_topic = [r["source_question_id"] for r in results if r["topic"] == "Uncategorized"]
    no_answer = [r["source_question_id"] for r in results if not r["pdf_correct_answer"] and not r["pdf_entry_examples"]]
    print(f"Missing topic: {len(no_topic)} {no_topic[:10]}")
    print(f"Correct answer not readable from text (AI will read it, flagged for review): {len(no_answer)}")
    if problems:
        print(f"Skipped {len(problems)} questions:")
        for problem in problems[:20]:
            print("  ", problem)


if __name__ == "__main__":
    main()
