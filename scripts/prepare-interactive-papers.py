"""Convert the organized paper archive into ordered interactive questions and private keys."""
import argparse
import hashlib
import json
import re
import uuid
from datetime import date
from pathlib import Path
from zipfile import ZipFile

import pypdfium2 as pdf


def render_question(document, pages, output, prefix, talim):
    paths = []
    for part, number in enumerate(pages, 1):
        filename = f"{prefix}-{part}.webp"
        destination = output / filename
        destination.parent.mkdir(parents=True, exist_ok=True)
        if not destination.is_file():
            page = document[number - 1]
            scale = 1440 / page.get_width()
            image = page.render(scale=scale).to_pil().convert("RGB")
            top = round(83 * scale) if talim else 0
            bottom = image.height - round((40 if talim else 12) * scale)
            content = image.crop((0, top, image.width, bottom))
            bounds = content.convert("L").point(lambda value: 255 if value < 155 else 0).getbbox()
            if bounds:
                left, upper, right, lower = bounds
                content = content.crop((max(0, left - 20), max(0, upper - 20),
                                        min(content.width, right + 20), min(content.height, lower + 20)))
            content.save(destination, format="WEBP", quality=86, method=0)
            page.close()
        paths.append(filename)
    return paths


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--d7-dir", type=Path, required=True)
    parser.add_argument("--d7-keys", type=Path, required=True)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--offset", type=int, default=0)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    keys = json.loads(args.d7_keys.read_text(encoding="utf-8"))
    papers = []
    with ZipFile(args.archive) as archive:
        catalog = json.loads(archive.read("sat-practice-tests-index.json"))["tests"]
        march_v2 = dict(next(test for test in catalog if test["id"] == "2026-03-int-a"))
        march_v2.update(id="2026-03-d7-v2", version="V2", region="D7SAT")
        catalog.append(march_v2)
        for test in catalog[args.offset:args.offset + args.limit if args.limit else None]:
            slug = "pdf-" + test["id"]
            document_keys = None
            d7 = None
            if test["date"] in ("2026-03", "2026-05", "2026-06"):
                version = 2 if test["id"] == "2026-03-d7-v2" else ord(test["version"]) - ord("A") + 1
                month = date.fromisoformat(test["date"] + "-01").strftime("%B")
                d7 = args.d7_dir / f"SAT {month} 2026 V{version} Full.pdf"
                document_keys = keys[f"{month}-V{version}"]
                payload = d7.read_bytes()
            else:
                payload = archive.read(test["files"]["questions"])
            paper = {
                "slug": slug,
                "title": f"{date.fromisoformat(test['date'] + '-01'):%B %Y} · {test['region']} {test['version']} · {test['label']}",
                "description": test["label"] + ". Timed practice paper with saved answers and results.",
                "year": int(test["date"][:4]), "source_name": "D7SAT" if d7 else "TalimSAT",
                "paper_type": "reading-writing" if test["label"] == "Verbal only" else "full-length",
                "source_sha256": hashlib.sha256(payload).hexdigest(), "modules": []
            }
            with pdf.PdfDocument(payload) as document:
                page_cursor = 3 if d7 and test["date"] == "2026-06" else 1
                for ordinal, entry in enumerate(test["modules"], 1):
                    part = {"section": entry["section"], "module_number": entry["module"],
                            "question_count": entry["question_count"], "sort_order": ordinal,
                            "duration_seconds": 1920 if entry["section"] == "reading-writing" else 2100, "items": []}
                    starts = entry["question_pages"]["questions"]
                    for position in range(1, entry["question_count"] + 1):
                        if d7:
                            # Two scanned source questions have a second page of charts/choices.
                            extra = (test["date"] == "2026-05" and
                                     ((test["version"] == "A" and ordinal == 2 and position == 13) or
                                      (test["version"] == "C" and ordinal == 4 and position == 20)))
                            pages = [page_cursor, page_cursor + 1] if extra else [page_cursor]
                            page_cursor += len(pages)
                            accepted = document_keys[ordinal - 1][position - 1]
                            body = ""
                        else:
                            first = starts[str(position)]
                            next_page = starts.get(str(position + 1))
                            if next_page is None:
                                later = [page for item in test["modules"] for page in item["question_pages"]["questions"].values() if page > first]
                                next_page = min(later) - 1 if later else len(document) + 1
                            pages = list(range(first, next_page))
                            texts = []
                            for page_number in pages:
                                page = document[page_number - 1]
                                text_page = page.get_textpage()
                                text = text_page.get_text_bounded()
                                if re.search(r"^.*\bAnswer key\s*$", text, re.M | re.I):
                                    pages = pages[:pages.index(page_number)]
                                    text_page.close()
                                    page.close()
                                    break
                                header = re.search(r"Question \d+ of \d+", text)
                                texts.append(text[header.end():].strip() if header else "")
                                text_page.close()
                                page.close()
                            body = "\n".join(texts)
                            accepted = re.split(r"\s+or\s+", entry["answers"][str(position)]["answer"])
                        if not pages or not accepted:
                            raise ValueError(f"Missing content or key in {slug}, {ordinal}, {position}")
                        for value in accepted:
                            if not re.fullmatch(r"[A-D]|-?(?:\d*\.)?\d+(?:/\d+)?", value):
                                raise ValueError(f"Unrecognized answer in {slug}: {value}")
                        image_paths = render_question(document, pages, args.output,
                            f"{slug}/{part['section']}-{part['module_number']}/{position}", not d7)
                        part["items"].append({
                            "id": str(uuid.uuid5(uuid.NAMESPACE_URL, f"sat-hub:{slug}:{part['section']}:{part['module_number']}:{position}")),
                            "position": position,
                            "question_type": "multiple-choice" if all(re.fullmatch(r"[A-D]", a) for a in accepted) else "student-produced-response",
                            "text": body, "image_paths": image_paths, "accepted_answers": accepted,
                            "source_pages": pages
                        })
                    paper["modules"].append(part)
                    if d7 and test["date"] == "2026-06" and ordinal < 4:
                        page_cursor += 1
                if d7:
                    expected_end = len(document) - (3 if test["date"] == "2026-06" else 4) + 1
                    if page_cursor != expected_end:
                        raise ValueError(f"Source page coverage mismatch: {slug}: {page_cursor} != {expected_end}")
            papers.append(paper)
            print(f"Prepared {slug}: {sum(len(part['items']) for part in paper['modules'])} questions", flush=True)
    manifest = args.output / (f"interactive-papers-{args.offset}.json" if args.limit else "interactive-papers.json")
    manifest.write_text(json.dumps(papers, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved {len(papers)} papers to {manifest}")


if __name__ == "__main__":
    main()
