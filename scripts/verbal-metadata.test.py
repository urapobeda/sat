import importlib.util
from pathlib import Path
import sys
import unittest

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("question_pdf", Path(__file__).with_name("extract-question-bank-pdfs.py"))
pdf = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pdf)


class VerbalMetadataTests(unittest.TestCase):
    def test_wrapped_domain_and_skill(self):
        header = "Question ID: deadbeef\nSAT Reading and Writing\nStandard English\nConventions Form, Structur e,\nand Sense Har d\nQuestion\n..."
        self.assertEqual(pdf.parse_metadata(header, "reading-writing"), ("Standard English Conventions", "Form, Structure, and Sense", "hard"))

    def test_wrapped_purpose(self):
        header = "SAT Reading and Writing\nCraft and Structure Text Structure and Pur pose Medium\nQuestion\n..."
        self.assertEqual(pdf.parse_metadata(header, "reading-writing"), ("Craft and Structure", "Text Structure and Purpose", "medium"))

    def test_boundaries_and_unknown_skill(self):
        header = "Standard English Conventions Boundaries Easy\nQuestion\n..."
        self.assertEqual(pdf.parse_metadata(header, "reading-writing"), ("Standard English Conventions", "Boundaries", "easy"))
        self.assertEqual(pdf.parse_metadata("Craft and Structure Unknown skill Easy\nQuestion\n...", "reading-writing"), ("Craft and Structure", None, "easy"))

    def test_official_capitalization(self):
        self.assertEqual(pdf.normalize_topic_title("Cross-text Connections"), "Cross-Text Connections")
        self.assertEqual(pdf.normalize_topic_title("Form Structure and Sense"), "Form, Structure, and Sense")


if __name__ == "__main__":
    unittest.main()
