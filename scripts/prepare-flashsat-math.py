"""Deterministic FlashSAT HTML/MathML -> SAT Hub import. No OCR or network calls."""
import argparse
import base64
import json
import re
import struct
import hashlib
from dataclasses import dataclass, field
from fractions import Fraction
from html.parser import HTMLParser
from pathlib import Path


@dataclass
class Node:
    tag: str
    attrs: dict = field(default_factory=dict)
    children: list = field(default_factory=list)
    start: int = 0
    end: int = 0


class Tree(HTMLParser):
    VOID = {"img", "br", "hr", "col", "input", "meta", "link", "wbr"}

    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.source = source
        self.lines = [0]
        for match in re.finditer("\n", source):
            self.lines.append(match.end())
        self.root = Node("root")
        self.stack = [self.root]
        self.feed(source)
        self.close()
        if len(self.stack) != 1:
            raise ValueError(f"Unclosed HTML element: {self.stack[-1].tag}")

    def source_offset(self):
        line, column = self.getpos()
        return self.lines[line - 1] + column

    def handle_starttag(self, tag, attrs):
        node = Node(tag, dict(attrs), start=self.source_offset())
        node.end = node.start + len(self.get_starttag_text())
        self.stack[-1].children.append(node)
        if tag not in self.VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in self.VOID:
            self.stack.pop()

    def handle_endtag(self, tag):
        if tag in self.VOID:
            return
        if len(self.stack) == 1 or self.stack[-1].tag != tag:
            raise ValueError(f"Unbalanced HTML: </{tag}>")
        node = self.stack.pop()
        node.end = self.source.find(">", self.source_offset()) + 1

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def plain(node):
    return node if isinstance(node, str) else "".join(plain(c) for c in node.children)


def escape_tex(text):
    return "".join({"\\": r"\backslash ", "{": r"\{", "}": r"\}", "$": r"\$", "%": r"\%", "#": r"\#", "&": r"\&", "_": r"\_", "^": r"\textasciicircum{}", "~": r"\textasciitilde{}"}.get(c, c) for c in text)


SYMBOLS = {"−": "-", "≥": r"\geq ", "≤": r"\leq ", "·": r"\cdot ", "×": r"\times ", "÷": r"\div ", "±": r"\pm ", "≈": r"\approx ", "∠": r"\angle ", "△": r"\triangle ", "∆": r"\triangle ", "π": r"\pi ", "°": r"{}^{\circ}", "∘": r"\circ ", "¯": r"\bar{}", "\u2062": "", "\xa0": r"\,", "\u200a": r"\,", "𝓁": r"\ell "}
SYMBOLS["–"] = "-"


def math(node):
    if isinstance(node, str):
        return "" if not node.strip() else escape_tex(node)
    tag = node.tag
    children = [c for c in node.children if not isinstance(c, str) or c.strip()]
    parts = [math(c) for c in children]
    body = "".join(parts)
    if tag in {"math", "mrow", "mstyle"}:
        return body
    if tag in {"mi", "mn", "mo"}:
        text = plain(node)
        if tag == "mi" and text in {"sin", "cos", "tan"}:
            return "\\" + text + " "
        if tag == "mi" and len(text) > 1 and text.isascii():
            return r"\mathrm{" + escape_tex(text) + "}"
        return "".join(SYMBOLS.get(c, escape_tex(c)) for c in text)
    if tag == "mtext":
        return r"\text{" + escape_tex(plain(node).replace("\xa0", " ")) + "}"
    if tag in {"mfrac", "msup", "msub", "mroot", "mover"}:
        if len(parts) != 2:
            raise ValueError(f"{tag} must have two operands")
        a, b = parts
        if tag == "mfrac": return rf"\frac{{{a}}}{{{b}}}"
        if tag == "msup": return rf"{{{a}}}^{{{b}}}"
        if tag == "msub": return rf"{{{a}}}_{{{b}}}"
        if tag == "mroot": return rf"\sqrt[{b}]{{{a}}}"
        if plain(children[1]).strip() == "¯": return rf"\overline{{{a}}}"
        raise ValueError(f"Unsupported mover accent: {plain(children[1])!r}")
    if tag == "msqrt": return rf"\sqrt{{{body}}}"
    if tag == "menclose" and node.attrs.get("notation") == "top":
        return rf"\overline{{{body}}}"
    if tag == "mfenced":
        opening, closing = node.attrs.get("open", "("), node.attrs.get("close", ")")
        delimiters = {"{": r"\{", "}": r"\}", "": "."}
        separators = node.attrs.get("separators", ",").replace(" ", "")
        joined = parts[0] if parts else ""
        for i, part in enumerate(parts[1:]):
            joined += (separators[min(i, len(separators) - 1)] if separators else "") + part
        return r"\left" + delimiters.get(opening, opening) + " " + joined + r"\right" + delimiters.get(closing, closing) + " "
    raise ValueError(f"Unsupported MathML element: {tag}")


class Renderer:
    def __init__(self, source, question_id, location, output):
        self.tree = Tree(source)
        self.id, self.location, self.output = question_id, location, output
        self.images = []
        self.inline_assets = {}
        self.formula_images = 0
        self.math_count = 0

    def render(self):
        result = self.node(self.tree.root)
        return re.sub(r"\n[ \t]+", "\n", re.sub(r"\n{3,}", "\n\n", result)).strip()

    def node(self, node):
        if isinstance(node, str):
            return re.sub(r"\s+", " ", node)
        tag = node.tag
        # Graph long descriptions are accessibility text, not visible question text.
        # The complete original, including these descriptions, stays in math-raw.json.
        if "sr-only" in node.attrs.get("class", "").split():
            return ""
        if tag == "math" or tag in {"mo", "mi", "mn"}:
            self.math_count += 1
            tex = math(node).strip()
            return r"\(" + tex + r"\)"
        if tag == "svg":
            raw = self.tree.source[node.start:node.end]
            if re.search(r"<(?:script|foreignObject)\b|\bon\w+\s*=|(?:href|url)\s*[=(]\s*[\"']?https?", raw, re.I):
                raise ValueError("Unexpected executable/external SVG content")
            asset = self.output / "assets" / self.id / f"{self.location}-{len(self.images)}.svg"
            asset.parent.mkdir(parents=True, exist_ok=True)
            asset.write_text(raw, encoding="utf-8")
            self.images.append(str(asset.with_suffix(".png").as_posix()))
            return f"\n\n[[img:{len(self.images) - 1}]]\n\n"
        if tag == "img":
            src = node.attrs.get("src", "")
            if not src.startswith("data:image/png;base64,"):
                raise ValueError("Only embedded PNG images are supported")
            payload = src.split(",", 1)[1]
            data = base64.b64decode(payload, validate=True)
            if data[:8] != b"\x89PNG\r\n\x1a\n":
                raise ValueError("Invalid PNG signature")
            width, height = struct.unpack(">II", data[16:24])
            if not (0 < width <= 10000 and 0 < height <= 10000):
                raise ValueError("Invalid image dimensions")
            self.formula_images += 1
            # Binary data belongs in Storage, not in an indexed question column.
            name = "inline-" + hashlib.sha256(data).hexdigest()[:24] + ".png"
            asset = self.output / "assets" / self.id / name
            asset.parent.mkdir(parents=True, exist_ok=True)
            asset.write_bytes(data)
            self.inline_assets[name] = asset.as_posix()
            return f"[[asset:{width}:{height}:{name}]]"
        if tag in {"style", "script"}:
            raise ValueError(f"Unexpected HTML outside SVG: {tag}")
        if tag == "table":
            rows, captions = [], []
            def visit(n):
                if isinstance(n, str): return
                if n.tag == "tr":
                    cells = []
                    for c in n.children:
                        if isinstance(c, str) or c.tag not in {"td", "th"}: continue
                        colspan, rowspan = int(c.attrs.get("colspan", 1)), int(c.attrs.get("rowspan", 1))
                        if not (1 <= colspan <= 100 and 1 <= rowspan <= 100):
                            raise ValueError("Invalid table cell spans")
                        cells.append({"text": self.node(c).strip(), "header": c.tag == "th", "colspan": colspan, "rowspan": rowspan})
                    if cells: rows.append(cells)
                elif n.tag == "caption":
                    captions.append(self.node(n).strip())
                else:
                    for c in n.children: visit(c)
            visit(node)
            if not rows:
                raise ValueError("Empty HTML table")
            payload = base64.b64encode(json.dumps({"rows": rows, "caption": " ".join(captions)}, ensure_ascii=False).encode()).decode()
            return "\n\n[[table:" + payload + "]]\n\n"
        body = "".join(self.node(c) for c in node.children)
        if tag in {"em", "i"} and body.strip() and "\\(" not in body and "[[" not in body:
            return "*" + body.strip() + "*"
        if tag in {"root", "span", "em", "i", "strong", "u", "cite", "itembody", "td", "th"}: return body
        if tag in {"p", "div", "figure", "ul", "ol", "caption"}: return "\n\n" + body.strip() + "\n\n"
        if tag == "li": return "\n• " + body.strip() + "\n"
        if tag == "br": return "\n"
        if tag in {"sup", "sub"}:
            return r"\({}" + ("^" if tag == "sup" else "_") + "{" + escape_tex(plain(node).replace("–", "-").replace("−", "-")) + r"}\)"
        raise ValueError(f"Unsupported HTML element: {tag}")


def number(value):
    try:
        return Fraction(str(value).strip().replace(",", "").replace("−", "-"))
    except (ValueError, ZeroDivisionError):
        return None


def build(row, pdf, output):
    metadata, q = row["metadata"], row["question"]
    question_id = metadata["questionId"]
    original = pdf.get(question_id)
    if not original:
        raise ValueError("Question id missing from PDF metadata")
    if q.get("stimulus"):
        raise ValueError("Non-empty stimulus requires manual review")
    is_mcq = q["type"] == "mcq"
    if q["type"] not in {"mcq", "spr"}:
        raise ValueError("Unknown question type")
    record = {k: original[k] for k in ["source_question_id", "category", "topic", "difficulty", "source_page_start", "source_page_end"]}
    record.update(source_name="College Board SAT Question Bank via FlashSAT", section="math", is_bluebook=False,
                  question_type="multiple-choice" if is_mcq else "student-produced-response")
    if original["question_type"] != record["question_type"]:
        raise ValueError("Question type disagrees with PDF")
    if {"E": "easy", "M": "medium", "H": "hard"}.get(metadata["difficulty"]) != record["difficulty"]:
        raise ValueError("Difficulty disagrees with PDF")
    renderers = []
    def render(html, location):
        renderer = Renderer(html, question_id, location, output)
        result = renderer.render()
        renderers.append(renderer)
        return result, renderer.images
    record["question"], record["image_files"] = render(q["stem"], "stem")
    record["explanation"], explanation_images = render(q["rationale"], "rationale")
    if explanation_images:
        raise ValueError("Explanation has graph: needs a separate image mapping")
    choices = []
    options = q.get("answerOptions", [])
    for i, option in enumerate(options):
        text, images = render(option["content"], f"choice-{i}")
        if len(images) > 1:
            raise ValueError("More than one graph in a choice")
        choice = {"label": "ABCD"[i], "text": re.sub(r"\[\[img:\d+\]\]", "", text).strip()}
        if images:
            # Current choice component places a graph before text.
            if not text.lstrip().startswith("[[img:"):
                raise ValueError("Choice graph follows text: manual layout review required")
            choice["image_file"] = images[0]
        choices.append(choice)
    record["choices"] = choices
    source_answers = [str(a).strip() for a in q["correct_answer"]]
    if is_mcq:
        if len(options) != 4 or len(q["keys"]) != 1:
            raise ValueError("Invalid MCQ options/keys")
        key = q["keys"][0]
        if key in "ABCD" and len(key) == 1:
            answer = key
        else:
            answer = next(("ABCD"[i] for i, o in enumerate(options) if o["id"] == key), None)
        if source_answers != [answer]:
            raise ValueError("Answer key disagrees with source answer letter")
        if original["pdf_correct_answer"] and original["pdf_correct_answer"].strip() != answer:
            raise ValueError("Answer disagrees with PDF")
        record.update(correct_answer=answer, scoring_metadata=None)
    else:
        if options or any(number(a) is None for a in source_answers):
            raise ValueError("Invalid student-produced answers")
        if set(map(str, q["keys"])) != set(source_answers):
            raise ValueError("Grid-in keys disagree with source answers")
        pdf_answers = [s.strip() for s in re.split(r",\s*|\s+or\s+", original["pdf_correct_answer"]) if s.strip()]
        for a in pdf_answers:
            if number(a) is not None and not any(number(a) == number(b) for b in source_answers):
                raise ValueError(f"Answer {a} disagrees with PDF")
        # Keep source rounding variants, e.g. 3/17, .1764 and .1765.
        record.update(correct_answer=source_answers[0], scoring_metadata={"accepted_answers": source_answers})
    if not record["question"] or not record["explanation"] or not record["correct_answer"]:
        raise ValueError("Missing content/answer/explanation")
    record["inline_image_files"] = dict(pair for r in renderers for pair in r.inline_assets.items())
    return record, {"mathml": sum(r.math_count for r in renderers), "embedded_png": sum(r.formula_images for r in renderers)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", default="data/math/flashsat/math-raw.json")
    parser.add_argument("--pdf-metadata", default="data/math/math-extract.json")
    parser.add_argument("--out-dir", default="data/math/flashsat/prepared")
    parser.add_argument("--limit", type=int)
    args = parser.parse_args()
    output = Path(args.out_dir)
    output.mkdir(parents=True, exist_ok=True)
    rows = json.loads(Path(args.input).read_text(encoding="utf-8-sig"))
    pdf = {r["source_question_id"]: r for r in json.loads(Path(args.pdf_metadata).read_text(encoding="utf-8-sig"))}
    records, review, stats = [], [], {"mathml": 0, "embedded_png": 0}
    seen = set()
    for row in rows[:args.limit]:
        question_id = row["metadata"]["questionId"]
        if question_id in seen:
            raise ValueError(f"Duplicate source id: {question_id}")
        seen.add(question_id)
        try:
            record, counts = build(row, pdf, output)
            records.append(record)
            for key, value in counts.items(): stats[key] += value
        except (ValueError, KeyError, IndexError) as error:
            review.append({"source_question_id": question_id, "problems": [str(error)]})
    for name, value in [("pending.json", records), ("math-review.json", review), ("conversion-stats.json", stats)]:
        (output / name).write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Converted {len(records)}; review {len(review)}", flush=True)


if __name__ == "__main__":
    main()
