"""翻拍校正和翻转：合成一张已知透视的图，校正后标记要落回预期位置（离线）。"""
import json
from pathlib import Path
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw

repo = Path(__file__).resolve().parents[1]
skill = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else repo / 'skill/see-your-home'
script = skill / 'scripts/rectify.py'
sys.path.insert(0, str(skill / 'scripts'))
import rectify

MARKS = {(0, 0): (220, 0, 0), (6000, 0): (0, 160, 0), (6000, 4000): (0, 0, 220), (0, 4000): (220, 160, 0), (3000, 2000): (160, 0, 200)}
SCALE = 5.0
CORNERS = [(0, 0), (6000, 0), (6000, 4000), (0, 4000)]
PHOTO = [(180.0, 130.0), (1420.0, 90.0), (1500.0, 960.0), (120.0, 1000.0)]


def run(*args, ok=True):
    r = subprocess.run([sys.executable, str(script), *map(str, args)], capture_output=True, text=True)
    assert (r.returncode == 0) == ok, (args, r.stdout, r.stderr)
    return r.stdout + r.stderr


def centroid(image, color):
    pixels = image.load()
    xs, ys = [], []
    for y in range(image.height):
        for x in range(image.width):
            if all(abs(pixels[x, y][i] - color[i]) < 40 for i in range(3)):
                xs.append(x); ys.append(y)
    assert xs, color
    return sum(xs) / len(xs), sum(ys) / len(ys)


# 平面图（5 mm/px，四周留白）→ 按已知透视拍成「翻拍图」
margin = 100
plan = Image.new('RGB', (6000 // 5 + margin * 2, 4000 // 5 + margin * 2), 'white')
d = ImageDraw.Draw(plan)
for (x, y), color in MARKS.items():
    cx, cy = x / SCALE + margin, y / SCALE + margin
    d.rectangle((cx - 12, cy - 12, cx + 12, cy + 12), fill=color)
photo_to_plan = rectify.homography(PHOTO, [(x / SCALE + margin, y / SCALE + margin) for x, y in CORNERS])
photo = plan.transform((1600, 1100), Image.Transform.PERSPECTIVE, [v for row in photo_to_plan for v in row][:8], Image.Resampling.BICUBIC, fillcolor=(255, 255, 255))

with tempfile.TemporaryDirectory(prefix='floorplan-rectify-') as temp:
    work = Path(temp)
    src, out = work / 'photo.png', work / 'out.png'
    photo.save(src)
    points = ';'.join(f'{x},{y}' for x, y in PHOTO)
    world = ';'.join(f'{x},{y}' for x, y in CORNERS)
    run(src, out, '--points', points, '--world', world, '--mm-per-px', SCALE)
    meta = json.loads((work / 'out.png.rect.json').read_text(encoding='utf-8'))
    assert meta['mmPerPx'] == SCALE and meta['source'] == 'photo.png'
    with Image.open(out) as result:
        result = result.convert('RGB')
        for (x, y), color in MARKS.items():
            cx, cy = centroid(result, color)
            ex, ey = x / SCALE + meta['origin'][0], y / SCALE + meta['origin'][1]
            assert abs(cx - ex) < 1.5 and abs(cy - ey) < 1.5, ((x, y), (cx, cy), (ex, ey))
    # 比例缺省按四条边估，和真值差不到 15%
    run(src, work / 'auto.png', '--points', points, '--world', world)
    auto = json.loads((work / 'auto.png.rect.json').read_text(encoding='utf-8'))['mmPerPx']
    assert 0.85 * SCALE < auto < 1.15 * SCALE, auto

    # 翻转：左右互换；不写 rect.json；翻转和校正不能混在一步
    flipped = work / 'flip.png'
    assert '已翻转' in run(src, flipped, '--flip-x')
    with Image.open(flipped) as im:
        assert im.size == photo.size and im.convert('RGB').getpixel((1599, 0)) == photo.getpixel((0, 0))
    assert not (work / 'flip.png.rect.json').exists()
    assert '分两步' in run(src, work / 'x.png', '--flip-x', '--points', points, '--world', world, ok=False)

    # EXIF 方向：像素坐标按转正后的图算；输出不带 EXIF
    exif = Image.Exif(); exif[0x0112] = 6
    tilted = photo.rotate(90, expand=True)
    tilted.save(work / 'tilted.jpg', exif=exif, quality=95)
    run(work / 'tilted.jpg', work / 'upright.jpg', '--flip-y')
    with Image.open(work / 'upright.jpg') as im:
        assert im.size == photo.size and not im.getexif()

    # 拦错：三点共线、顺序交叉、绕行方向相反（镜像）、覆盖原图、没给参数
    assert '共线' in run(src, work / 'x.png', '--points', '0,0;500,0;1000,0;0,500', '--world', world, ok=False)
    assert '绕一圈' in run(src, work / 'x.png', '--points', ';'.join(f'{x},{y}' for x, y in [PHOTO[0], PHOTO[2], PHOTO[1], PHOTO[3]]), '--world', world, ok=False)
    mirrored = ';'.join(f'{x},{y}' for x, y in [PHOTO[1], PHOTO[0], PHOTO[3], PHOTO[2]])
    assert '镜像' in run(src, work / 'x.png', '--points', mirrored, '--world', world, ok=False)
    assert '不能覆盖' in run(src, src, '--flip-x', ok=False)
    assert '要么' in run(src, work / 'x.png', ok=False)
print('PASS: rectify perspective / flip / EXIF / bad-input regression')
