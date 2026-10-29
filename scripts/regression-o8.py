"""O8: answered question overlays retain labels and dashed boxes (offline)."""
import contextlib
import io
import json
from pathlib import Path
import sys
import tempfile
from unittest.mock import patch

repo = Path(__file__).resolve().parents[1]
skill = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else repo / 'skill/see-your-home'
sys.path.insert(0, str(skill / 'scripts'))
import overlay
from PIL import Image, ImageDraw

for answer, expected in [('', '未答'), ('  ', '未答'), ('是普通隔墙', '已答'),
                         ('不确定，你按图上最可能的理解来', '已答，仍是推断'),
                         ('按最可能理解', '已答，仍是推断'), ('不知道', '已答，仍是推断')]:
    assert overlay.question_style({'answer': answer})[0] == expected

with tempfile.TemporaryDirectory(prefix='floorplan-o8-') as temp:
    work = Path(temp)
    plan = json.loads((skill / 'assets/example/plan.json').read_text())
    plan['questions'] = [
        {'id': 'q-pending', 'text': '未答的小框', 'category': 'original', 'bbox': [100, 100, 700, 700]},
        {'id': 'q-answered', 'text': '已确认的小框', 'category': 'original', 'bbox': [1000, 100, 1700, 700], 'answer': '确定是门洞'},
        {'id': 'q-inferred', 'text': '仍待核的无框问题', 'category': 'original', 'answer': '不确定，按最可能理解'},
        {'id': 'q-big', 'text': '已答的大框', 'category': 'original', 'bbox': [0, 0, 9600, 7200], 'answer': '不知道'},
    ]
    texts, strokes = [], []
    draw_text, draw_dash = ImageDraw.ImageDraw.text, overlay.dashed
    def text(self, xy, value, *args, **kwargs):
        texts.append(value)
        return draw_text(self, xy, value, *args, **kwargs)
    def dashed(draw, points, color, *args, **kwargs):
        strokes.append((points, color))
        return draw_dash(draw, points, color, *args, **kwargs)
    source = work / 'plan.json'
    source.write_text(json.dumps(plan, ensure_ascii=False))
    output = work / 'overlay.png'
    argv = ['overlay.py', str(skill / 'assets/example/input.png'), str(source), str(output)]
    with patch.object(sys, 'argv', argv), patch.object(ImageDraw.ImageDraw, 'text', text), patch.object(overlay, 'dashed', dashed), contextlib.redirect_stdout(io.StringIO()):
        overlay.main()
    prose = ''.join(texts)
    for expected in ['Q1【未答】', 'Q2【已答】', 'Q3【已答，仍是推断】', 'Q4【已答，仍是推断】']:
        assert expected in prose, expected
    # One ordinary rectangle plus four corner markers for an oversized answered box.
    assert sum(color[:3] == overlay.ANSWERED_COLOR for _, color in strokes) == 5
    with Image.open(output) as im:
        im.load()
        assert im.width > 1200 and im.height >= 1120
        assert im.convert('RGB').getpixel((220, 130)) == overlay.ANSWERED_COLOR
print('PASS: O8 unanswered / answered / inferred / no-box / oversized-box overlay regression')
