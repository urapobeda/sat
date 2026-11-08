import base64
import copy
import importlib.util
import json
from pathlib import Path
import struct
import sys
import tempfile
import unittest

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("flashsat", Path(__file__).with_name("prepare-flashsat-math.py"))
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)


class ConversionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.output = Path(self.temp.name)

    def render(self, source):
        return module.Renderer(source, "sample", "stem", self.output).render()

    def test_mathml_keeps_fraction_root_powers_and_fence_separators(self):
        text = self.render('<math><mfrac><msup><mi>x</mi><mn>2</mn></msup><msqrt><mn>3</mn></msqrt></mfrac><mo>≤</mo><mfenced><mn>1</mn><mn>2</mn></mfenced></math>')
        self.assertIn(r'\frac{{x}^{2}}{\sqrt{3}}', text)
        self.assertIn(r'\leq', text)
        self.assertIn('1,2', text)

    def test_units_and_overlines_are_not_lost(self):
        self.assertIn(r'\text{square inches}', self.render('<math><mtext>square&nbsp;inches</mtext></math>'))
        self.assertIn(r'\overline{AB}', self.render('<math><mover><mrow><mi>A</mi><mi>B</mi></mrow><mo>¯</mo></mover></math>'))

    def test_embedded_png_is_preserved_without_ocr(self):
        payload = base64.b64encode(b'\x89PNG\r\n\x1a\n' + b'\0' * 8 + struct.pack('>II', 35, 22)).decode()
        renderer = module.Renderer(f'<img src="data:image/png;base64,{payload}">', 'sample', 'stem', self.output)
        result = renderer.render()
        name, file = next(iter(renderer.inline_assets.items()))
        self.assertEqual(result, f'[[asset:35:22:{name}]]')
        self.assertEqual(Path(file).read_bytes(), base64.b64decode(payload))
        self.assertNotIn(payload, result)
        with self.assertRaises(ValueError): self.render('<img src="https://example.com/image.png">')

    def test_tables_preserve_caption_spans_and_literal_pipes(self):
        text = self.render('<table><caption>Counts</caption><tr><th rowspan="2">x | y</th><th colspan="2">Year</th></tr><tr><td>1</td><td>2</td></tr><tr></tr></table>')
        data = json.loads(base64.b64decode(text[len('[[table:'):-2]))
        self.assertEqual(data['caption'], 'Counts')
        self.assertEqual(data['rows'][0][0]['rowspan'], 2)
        self.assertEqual(data['rows'][0][1]['colspan'], 2)
        self.assertEqual(data['rows'][0][0]['text'], 'x | y')
        self.assertEqual(len(data['rows']), 2)

    def fixture(self):
        pdf = {'sample': {'source_question_id': 'sample', 'category': 'Algebra', 'topic': 'Linear Functions', 'difficulty': 'easy', 'source_page_start': 1, 'source_page_end': 1, 'question_type': 'multiple-choice', 'pdf_correct_answer': 'C'}}
        row = {'metadata': {'questionId': 'sample', 'difficulty': 'E'}, 'question': {'type': 'mcq', 'stem': '<p>Find x.</p>', 'rationale': '<p>C is correct.</p>', 'keys': ['id-2'], 'correct_answer': ['C'], 'answerOptions': [{'id': f'id-{i}', 'content': f'<p>{i}</p>'} for i in range(4)]}}
        return row, pdf

    def test_answer_uuid_and_letter_both_map_to_site_labels(self):
        row, pdf = self.fixture()
        self.assertEqual(module.build(row, pdf, self.output)[0]['correct_answer'], 'C')
        row['question']['keys'] = ['C']
        self.assertEqual(module.build(row, pdf, self.output)[0]['correct_answer'], 'C')
        bad = copy.deepcopy(row)
        bad['question']['keys'] = ['B']
        with self.assertRaises(ValueError): module.build(bad, pdf, self.output)
        pdf['sample']['pdf_correct_answer'] = 'A'
        with self.assertRaises(ValueError): module.build(row, pdf, self.output)

    def test_grid_in_keeps_all_source_rounding_variants(self):
        row, pdf = self.fixture()
        pdf['sample'].update(question_type='student-produced-response', pdf_correct_answer='3/17')
        row['question'].update(type='spr', answerOptions=[], keys=['.1764', '.1765', '3/17'], correct_answer=['.1764', '.1765', '3/17'])
        record, _ = module.build(row, pdf, self.output)
        self.assertEqual(record['scoring_metadata']['accepted_answers'], ['.1764', '.1765', '3/17'])
        self.assertEqual(record['choices'], [])

    def test_graph_keeps_its_position_and_unknown_content_fails(self):
        text = self.render('<p>Before</p><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0L10 10"/></svg><p>After</p>')
        self.assertLess(text.index('Before'), text.index('[[img:0]]'))
        self.assertLess(text.index('[[img:0]]'), text.index('After'))
        asset = self.output / 'assets/sample/stem-0.svg'
        self.assertIn('viewBox', asset.read_text())
        self.assertEqual(self.render('<p>Question</p><div class="sr-only">Hidden graph description</div>'), 'Question')
        with self.assertRaises(ValueError): self.render('<script>alert(1)</script>')
        with self.assertRaises(ValueError): self.render('<math><unknown>x</unknown></math>')


if __name__ == '__main__':
    unittest.main()
