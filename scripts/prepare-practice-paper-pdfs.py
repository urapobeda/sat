"""Stage question PDFs and private source files for the SAT Hub paper importer."""
import argparse
import json
import re
from datetime import date
from pathlib import Path
from zipfile import ZipFile

import pypdfium2 as pdf


def stage_questions(payload, destination, last_question_page):
    with pdf.PdfDocument(payload) as source:
        end = len(source)
        if not 1 <= last_question_page <= end:
            raise ValueError(f"Invalid last question page for {destination}")
        for i in range(last_question_page - 1, end):
            page = source[i]
            text = page.get_textpage()
            contents = text.get_text_bounded()
            text.close()
            page.close()
            if re.search(r"^.*\bAnswer key\s*$", contents, re.M | re.I):
                if i < last_question_page:
                    raise ValueError(f"Answer key shares a question page in {destination}")
                end = i
                break
        if end == len(source):
            destination.write_bytes(payload)
        else:
            with pdf.PdfDocument.new() as clean:
                clean.import_pages(source, list(range(end)))
                clean.save(destination)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--d7-dir", type=Path)
    args = parser.parse_args()
    output = args.output
    output.mkdir(parents=True, exist_ok=True)
    manifest = []
    with ZipFile(args.archive) as archive:
        source = json.loads(archive.read("sat-practice-tests-index.json"))
        for test in source["tests"]:
            if not re.fullmatch(r"\d{4}-\d{2}-(int|us)-[a-z]", test["id"]):
                raise ValueError(f"Unexpected test ID: {test['id']}")
            slug = "pdf-" + test["id"]
            directory = output / slug
            directory.mkdir(exist_ok=True)
            modules = test["modules"]
            if any(m["missing_question_pages"] for m in modules):
                raise ValueError(f"Missing question pages for {slug}")
            last_page = max(page for m in modules for page in m["question_pages"]["questions"].values())
            stage_questions(archive.read(test["files"]["questions"]), directory / "questions.pdf", last_page)
            private_files = []
            if answer_file := test["files"].get("with_answers"):
                (directory / "answers.pdf").write_bytes(archive.read(answer_file))
                private_files.append("answers.pdf")
            if args.d7_dir and not private_files:
                year, month, _, version = test["id"].split("-")
                month_name = date(int(year), int(month), 1).strftime("%B")
                version_number = ord(version) - ord("a") + 1
                d7 = args.d7_dir / f"SAT {month_name} {year} V{version_number} Full.pdf"
                if d7.is_file():
                    (directory / "answer-reference.pdf").write_bytes(d7.read_bytes())
                    private_files.append("answer-reference.pdf")
            label = test["label"]
            manifest.append({
                "slug": slug,
                "title": f"{date.fromisoformat(test['date'] + '-01'):%B %Y} · {test['region']} {test['version']} · {label}",
                "description": f"{label}. Practice test PDF.",
                "year": int(test["date"][:4]),
                "source_name": "TalimSAT",
                "paper_type": "reading-writing" if label == "Verbal only" else "full-length",
                "private_files": private_files,
                "modules": [{
                    "section": m["section"],
                    "module_number": m["module"],
                    "question_count": m["question_count"],
                    "duration_seconds": 1920 if m["section"] == "reading-writing" else 2100,
                    "sort_order": i,
                } for i,m in enumerate(modules, 1)],
            })
    if args.d7_dir:
        extra = args.d7_dir / "SAT March 2026 V2 Full.pdf"
        with pdf.PdfDocument(extra) as source_pdf:
            if len(source_pdf) != 102:
                raise ValueError("Unexpected page count for March 2026 V2")
            slug = "pdf-2026-03-d7-v2"
            directory = output / slug
            directory.mkdir(exist_ok=True)
            with pdf.PdfDocument.new() as clean:
                clean.import_pages(source_pdf, list(range(98)))
                clean.save(directory / "questions.pdf")
        (directory / "answers.pdf").write_bytes(extra.read_bytes())
        manifest.append({
            "slug": slug, "title": "March 2026 · D7SAT V2 · Math + Verbal",
            "description": "Math + Verbal. Practice test PDF.", "year": 2026,
            "source_name": "D7SAT", "paper_type": "full-length", "private_files": ["answers.pdf"],
            "modules": [
                {"section": section, "module_number": number, "question_count": count,
                 "duration_seconds": seconds, "sort_order": index}
                for index, (section, number, count, seconds) in enumerate(
                    [("reading-writing", 1, 27, 1920), ("reading-writing", 2, 27, 1920),
                     ("math", 1, 22, 2100), ("math", 2, 22, 2100)], 1)
            ],
        })
    (output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Prepared {len(manifest)} paper PDFs and {sum(len(p['modules']) for p in manifest)} modules")


if __name__ == "__main__":
    main()
