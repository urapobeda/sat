import argparse
import json
import re
import sys
from pathlib import Path

try:
    import pdfplumber
    from pypdf import PdfReader
except ModuleNotFoundError as error:
    raise SystemExit(
        f"Missing PDF dependency: {error.name}. Install pdfplumber and pypdf, then run again."
    ) from error


DIFFICULTIES = {
    "Easy": "easy",
    "Medium": "medium",
    "Hard": "hard",
}

QUESTION_BANK_STRUCTURE = {
    "reading-writing": {
        "Information and Ideas": [
            "Central Ideas and Details",
            "Inferences",
            "Command of Evidence",
        ],
        "Craft and Structure": [
            "Words in Context",
            "Text Structure and Purpose",
            "Cross-Text Connections",
        ],
        "Expression of Ideas": [
            "Rhetorical Synthesis",
            "Transitions",
        ],
        "Standard English Conventions": [
            "Boundaries",
            "Form, Structure, and Sense",
        ],
    },
    "math": {
        "Algebra": [
            "Linear equations in one variable",
            "Linear functions",
            "Linear equations in two variables",
            "Systems of two linear equations in two variables",
            "Linear inequalities in one or two variables",
        ],
        "Advanced Math": [
            "Equivalent expressions",
            "Nonlinear equations in one variable",
            "Systems of equations in two variables",
            "Nonlinear functions",
        ],
        "Problem-Solving and Data Analysis": [
            "Ratios, rates, proportional relationships, and units",
            "Percentages",
            "One-variable data: distributions and measures of center and spread",
            "Two-variable data: models and scatterplots",
            "Probability and conditional probability",
            "Inference from sample statistics and margin of error",
            "Evaluating statistical claims: observational studies and experiments",
        ],
        "Geometry and Trigonometry": [
            "Area and volume",
            "Lines, angles, and triangles",
            "Right triangles and trigonometry",
            "Circles",
        ],
    },
}

TEXT_FIXES = {
    "Corr ect": "Correct",
    "A nswer": "Answer",
    "Har d": "Hard",
    "M edium": "Medium",
    "E asy": "Easy",
    "SA T": "SAT",
    "W riting": "Writing",
    "Algebr a": "Algebra",
}


def main() -> None:
    args = parse_args()
    all_questions = []

    if args.math_pdf:
        all_questions.extend(
            extract_pdf(
                Path(args.math_pdf),
                "math",
                args.engine,
                args.limit,
                args.max_pages,
                args.render_question_images,
                args.asset_output,
            )
        )

    if args.wr_pdf:
        all_questions.extend(
            extract_pdf(
                Path(args.wr_pdf),
                "reading-writing",
                args.engine,
                args.limit,
                args.max_pages,
                False,
                args.asset_output,
            )
        )

    all_questions = all_questions[: args.limit] if args.limit else all_questions
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(all_questions, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Wrote {len(all_questions)} questions to {args.output}")
    print_quality_report(all_questions)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract SAT Question Bank PDF exports into JSON import rows."
    )
    parser.add_argument("--math-pdf", help="Path to the Math Question Bank PDF.")
    parser.add_argument("--wr-pdf", help="Path to the Reading/Writing Question Bank PDF.")
    parser.add_argument(
        "--output",
        default=Path("data/question-bank-import.generated.json"),
        type=Path,
        help="Output JSON path.",
    )
    parser.add_argument(
        "--engine",
        choices=["pypdf", "pdfplumber"],
        default="pypdf",
        help="pypdf is faster; pdfplumber usually has cleaner text but is slower.",
    )
    parser.add_argument("--limit", type=int, help="Stop after this many questions.")
    parser.add_argument("--max-pages", type=int, help="Read only the first N pages.")
    parser.add_argument(
        "--render-question-images",
        action="store_true",
        help="Render Math question prompts as PNG crops for formula/graph fallback.",
    )
    parser.add_argument(
        "--asset-output",
        default=Path("data/question-assets"),
        type=Path,
        help="Folder for rendered question images.",
    )
    parsed = parser.parse_args()

    if not parsed.math_pdf and not parsed.wr_pdf:
        parser.error("Provide --math-pdf, --wr-pdf, or both.")

    return parsed


def extract_pdf(
    path: Path,
    section: str,
    engine: str,
    limit: int | None,
    max_pages: int | None,
    render_question_images: bool,
    asset_output: Path,
) -> list[dict]:
    records = split_question_records(path, engine, limit, max_pages)
    questions = []

    pdf = pdfplumber.open(path) if render_question_images else None

    try:
        for text, start_page, end_page in records:
            question = parse_question(text, section, path.stem, start_page, end_page)

            if not question:
                continue

            if render_question_images:
                image_files = render_question_images_for_record(
                    pdf,
                    question["source_question_id"],
                    start_page,
                    end_page,
                    asset_output / section,
                )
                question["image_files"] = image_files
                question["image_urls"] = []

            questions.append(question)
    finally:
        if pdf:
            pdf.close()

    return questions


def split_question_records(
    path: Path,
    engine: str,
    limit: int | None,
    max_pages: int | None,
) -> list[tuple[str, int, int]]:
    records = []
    current: list[str] = []
    start_page = 1
    total_pages = get_page_count(path, engine)
    page_limit = min(total_pages, max_pages) if max_pages else total_pages

    for page_number, text in iter_pdf_text(path, engine, page_limit):
        if page_number % 100 == 0:
            print(f"{path.name}: processed {page_number}/{page_limit} pages", file=sys.stderr)

        parts = re.split(r"(?=Question ID:\s*[A-Za-z0-9]+)", text)

        for part in parts:
            if not part.strip():
                continue

            if part.lstrip().startswith("Question ID:"):
                if current:
                    records.append(("\n".join(current), start_page, page_number - 1))

                    if limit and len(records) >= limit:
                        return records

                current = [part.strip()]
                start_page = page_number
            elif current:
                current.append(part.strip())

    if current and (not limit or len(records) < limit):
        records.append(("\n".join(current), start_page, page_limit))

    return records


def get_page_count(path: Path, engine: str) -> int:
    if engine == "pdfplumber":
        with pdfplumber.open(path) as pdf:
            return len(pdf.pages)

    return len(PdfReader(str(path)).pages)


def iter_pdf_text(path: Path, engine: str, page_limit: int):
    if engine == "pdfplumber":
        with pdfplumber.open(path) as pdf:
            for index, page in enumerate(pdf.pages[:page_limit], start=1):
                yield index, fix_text(page.extract_text(x_tolerance=1, y_tolerance=3) or "")
        return

    reader = PdfReader(str(path))
    for index, page in enumerate(reader.pages[:page_limit], start=1):
        yield index, fix_text(page.extract_text() or "")


def parse_question(
    text: str,
    section: str,
    source_name: str,
    source_page_start: int,
    source_page_end: int,
) -> dict | None:
    id_match = re.search(r"Question ID:\s*([A-Za-z0-9]+)", text)

    if not id_match:
        return None

    category, topic, difficulty = parse_metadata(text, section)
    question_text = parse_between(text, "Question\n", "\nAnswer\n")

    if not question_text:
        question_text = parse_between(text, "Question\n", "\nCorrect Answer:")

    choices = parse_choices(parse_between(text, "\nAnswer\n", "\nCorrect Answer:"))
    raw_correct_answer = clean_text(first_match(text, r"Correct Answer:\s*([^\n]+)"))
    correct_answer = resolve_correct_answer(raw_correct_answer, choices)
    explanation = clean_text(parse_after(text, "\nRationale\n"))

    return {
        "source_question_id": id_match.group(1),
        "source_name": source_name,
        "section": section,
        "category": category or "",
        "topic": normalize_topic_title(topic or category or "Uncategorized"),
        "difficulty": difficulty or "medium",
        "question": clean_text(question_text),
        "choices": choices,
        "correct_answer": correct_answer,
        "explanation": explanation,
        "image_files": [],
        "image_urls": [],
        "is_bluebook": True,
        "question_type": "multiple-choice" if choices else "student-produced-response",
        "source_page_start": source_page_start,
        "source_page_end": source_page_end,
    }


def parse_metadata(text: str, section: str) -> tuple[str | None, str | None, str | None]:
    header = re.split(r"\nQuestion\n", text, maxsplit=1)[0]
    difficulty = next(
        (value for label, value in DIFFICULTIES.items() if re.search(rf"\b{label}\b", header)),
        None,
    )

    category = next(
        (title for title in QUESTION_BANK_STRUCTURE[section] if title in header),
        None,
    )

    if not category:
        return None, None, difficulty

    known_topics = QUESTION_BANK_STRUCTURE[section][category]
    normalized_header = normalize_space(header).lower()
    topic = next(
        (title for title in known_topics if title.lower() in normalized_header),
        None,
    )

    return category, topic, difficulty


def parse_choices(answer_block: str) -> list[dict]:
    matches = list(re.finditer(r"(?m)^([A-D])\.\s*", answer_block or ""))
    choices = []

    for index, match in enumerate(matches):
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(answer_block)
        text = clean_text(answer_block[start:end])

        if text:
            choices.append({"label": match.group(1), "text": text})

    return choices


def render_question_images_for_record(
    pdf,
    source_question_id: str,
    source_page_start: int,
    source_page_end: int,
    output_dir: Path,
) -> list[str]:
    output_dir.mkdir(parents=True, exist_ok=True)
    image_files = []

    for page_number in range(source_page_start, source_page_end + 1):
        page = pdf.pages[page_number - 1]
        top = get_question_crop_top(page) if page_number == source_page_start else 0
        bottom = get_question_crop_bottom(page) if page_number == source_page_end else page.height

        top = max(0, top)
        bottom = min(page.height, bottom)

        if bottom <= top + 8:
            continue

        output_path = output_dir / f"{source_question_id}-{page_number}.png"
        crop = page.crop((0, top, page.width, bottom))
        crop.to_image(resolution=160, antialias=True).save(output_path)
        image_files.append(output_path.as_posix())

    return image_files


def get_question_crop_top(page) -> float:
    hits = page.search("Question")

    if len(hits) >= 2:
        return hits[1]["top"] - 10

    if hits:
        return hits[0]["top"] - 10

    return 0


def get_question_crop_bottom(page) -> float:
    correct_hits = page.search("Correct Answer:")

    if correct_hits:
        return correct_hits[0]["top"] - 10

    rationale_hits = page.search("Rationale")

    if rationale_hits:
        return rationale_hits[0]["top"] - 10

    return page.height


def resolve_correct_answer(raw_answer: str, choices: list[dict]) -> str:
    if not raw_answer or not choices:
        return raw_answer

    normalized_answer = raw_answer.strip().upper().rstrip(".")

    for choice in choices:
        if choice["label"].upper() == normalized_answer:
            return choice["text"]

    return raw_answer


def parse_between(text: str, start: str, end: str) -> str:
    if start not in text:
        return ""

    tail = text.split(start, 1)[1]
    return tail.split(end, 1)[0] if end in tail else ""


def parse_after(text: str, marker: str) -> str:
    return text.split(marker, 1)[1] if marker in text else ""


def first_match(text: str, pattern: str) -> str:
    match = re.search(pattern, text)
    return match.group(1) if match else ""


def fix_text(text: str) -> str:
    for source, replacement in TEXT_FIXES.items():
        text = text.replace(source, replacement)

    return text


def clean_text(text: str) -> str:
    return normalize_space(fix_text(text))


def normalize_space(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def normalize_topic_title(text: str) -> str:
    text = clean_text(text)

    if not text:
        return "Uncategorized"

    words = {"and", "in", "of", "or", "the", "to"}
    return " ".join(
        word if word in words else word[:1].upper() + word[1:]
        for word in text.lower().split()
    )


def print_quality_report(questions: list[dict]) -> None:
    checks = {
        "missing question text": lambda item: not item["question"],
        "missing choices": lambda item: not item["choices"],
        "missing correct answer": lambda item: not item["correct_answer"],
        "missing explanation": lambda item: not item["explanation"],
        "uncategorized": lambda item: not item["category"],
    }

    for label, predicate in checks.items():
        count = sum(1 for question in questions if predicate(question))
        print(f"{label}: {count}")


if __name__ == "__main__":
    main()
