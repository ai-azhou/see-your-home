"""翻拍校正、左右翻转：只读写本地文件，不上传。

校正：python rectify.py 原图 输出图 --points "x,y;x,y;x,y;x,y" --world "X,Y;X,Y;X,Y;X,Y" [--mm-per-px 7.5]
翻转：python rectify.py 原图 输出图 --flip-x（或 --flip-y）

--points 是图上四个点的像素坐标，--world 是这四个点的平面坐标 mm，顺序一一对应。四点要在同一平面、尽量撑满图，
比如尺寸链轴线的四个交点。--mm-per-px 缺省按四条边估。输出图是下面 underlay 要用的图，同时写 输出图.rect.json
（比例、原点、四点、变换矩阵），终端打印 mmPerPx 和 origin。这份 JSON 不是方案，不要用工具打开。

翻转和校正分两步：家和图是镜像时先翻转，在翻转后的图上量点，再校正。手机照片按 EXIF 方向转正后再处理，
像素坐标以转正后的图为准；输出图不带 EXIF（照片里的拍摄地点等不会留下）。
"""
import argparse
import json
import math
from pathlib import Path
try:
    from PIL import Image, ImageOps
except ModuleNotFoundError as error:
    if error.name != 'PIL':
        raise
    import sys
    print('需要 Pillow。用途是校正、翻转户型图。装好后再试；Skill 不会自己安装', file=sys.stderr)
    raise SystemExit(2) from None

MAX_SIDE = 8192


def parse_points(text, flag):
    try:
        points = [tuple(float(v) for v in part.split(',')) for part in text.split(';')]
    except ValueError:
        raise SystemExit(f'{flag} 要写成 "x,y;x,y;x,y;x,y"：{text}') from None
    if len(points) != 4 or any(len(p) != 2 or not all(map(math.isfinite, p)) for p in points):
        raise SystemExit(f'{flag} 要正好四个点，每个点两个数：{text}')
    return points


def signed_area(points):
    return sum(points[i][0] * points[(i + 1) % 4][1] - points[(i + 1) % 4][0] * points[i][1] for i in range(4)) / 2


def check_quad(points, flag):
    """四点要成凸四边形：不能三点共线，也不能交叉。"""
    size = max(math.hypot(a[0] - b[0], a[1] - b[1]) for a in points for b in points)
    signs = []
    for i in range(4):
        a, b, c = points[i], points[(i + 1) % 4], points[(i + 2) % 4]
        cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])
        if size == 0 or abs(cross) < 1e-3 * size * size:
            raise SystemExit(f'{flag} 有点重合或三点共线，选四个撑得开的点')
        signs.append(cross > 0)
    if len(set(signs)) > 1:
        raise SystemExit(f'{flag} 四个点要按绕一圈的顺序写（比如左上、右上、右下、左下）')


def solve(matrix, values):
    n = len(values)
    rows = [row[:] + [value] for row, value in zip(matrix, values)]
    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(rows[r][col]))
        if abs(rows[pivot][col]) < 1e-12:
            raise SystemExit('四个点算不出变换，换四个撑得开的点')
        rows[col], rows[pivot] = rows[pivot], rows[col]
        for r in range(n):
            if r != col and rows[r][col]:
                factor = rows[r][col] / rows[col][col]
                rows[r] = [x - factor * y for x, y in zip(rows[r], rows[col])]
    return [rows[i][n] / rows[i][i] for i in range(n)]


def homography(src, dst):
    """3×3 单应矩阵（h33 = 1）：src 的点变到 dst。"""
    a, b = [], []
    for (x, y), (u, v) in zip(src, dst):
        a.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.append(u)
        a.append([0, 0, 0, x, y, 1, -v * x, -v * y]); b.append(v)
    h = solve(a, b)
    return [h[:3], h[3:6], [h[6], h[7], 1.0]]


def apply(h, p):
    w = h[2][0] * p[0] + h[2][1] * p[1] + h[2][2]
    return (h[0][0] * p[0] + h[0][1] * p[1] + h[0][2]) / w, (h[1][0] * p[0] + h[1][1] * p[1] + h[1][2]) / w


def multiply(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3)] for i in range(3)]


def estimate_scale(points, world):
    ratios = [math.hypot(world[i][0] - world[(i + 1) % 4][0], world[i][1] - world[(i + 1) % 4][1])
              / math.hypot(points[i][0] - points[(i + 1) % 4][0], points[i][1] - points[(i + 1) % 4][1]) for i in range(4)]
    return round(sum(ratios) / 4, 2)


def rectify(image, points, world, scale=None):
    """返回（校正后的图, 比例, 原点, 原图到 mm 的矩阵）。整张原图都保留，图外补白。"""
    check_quad(points, '--points'); check_quad(world, '--world')
    # 图的 y 向下，平面的 Y 也向下：绕行方向相反说明点的顺序对不上，或者图其实是镜像的
    if signed_area(points) * signed_area(world) < 0:
        raise SystemExit('--points 和 --world 绕行方向相反：对应关系错了，或者图和平面是镜像的（镜像先用 --flip-x 翻转）')
    scale = scale or estimate_scale(points, world)
    if scale <= 0:
        raise SystemExit('--mm-per-px 要大于 0')
    to_mm = homography(points, world)
    w, h = image.size
    corners = [(0, 0), (w, 0), (w, h), (0, h)]
    if any(to_mm[2][0] * x + to_mm[2][1] * y + 1 <= 0 for x, y in corners):
        raise SystemExit('四个点推算出的透视太强，图的边缘超出了可校正范围：检查点和坐标有没有写错，或者请用户给正拍图')
    mapped = [apply(to_mm, p) for p in corners]
    ox = math.ceil(-min(p[0] for p in mapped) / scale)
    oy = math.ceil(-min(p[1] for p in mapped) / scale)
    width = math.ceil(max(p[0] for p in mapped) / scale) + ox
    height = math.ceil(max(p[1] for p in mapped) / scale) + oy
    if max(width, height) > MAX_SIDE:
        raise SystemExit(f'输出图 {width}×{height} 太大（单边上限 {MAX_SIDE}）：检查点和坐标，或者调大 --mm-per-px')
    # 输出像素 → 平面 mm → 原图像素（Pillow 要的是这个方向）
    to_image = homography(world, points)
    out_to_image = multiply(to_image, [[scale, 0, -ox * scale], [0, scale, -oy * scale], [0, 0, 1]])
    k = out_to_image[2][2]
    coeffs = [out_to_image[i][j] / k for i in range(3) for j in range(3)][:8]
    out = image.transform((width, height), Image.Transform.PERSPECTIVE, coeffs, Image.Resampling.BICUBIC, fillcolor=(255, 255, 255))
    return out, scale, [ox, oy], to_mm


def save(image, path):
    # JPEG 显式写质量；不传 exif，输出图不带拍摄信息
    image.save(path, **({'quality': 95} if path.suffix.lower() in ('.jpg', '.jpeg') else {}))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('image'); ap.add_argument('output')
    ap.add_argument('--points', help='图上四个点的像素坐标')
    ap.add_argument('--world', help='这四个点的平面坐标 mm，顺序和 --points 一一对应')
    ap.add_argument('--mm-per-px', type=float, help='输出图的比例，缺省按四条边估')
    ap.add_argument('--flip-x', action='store_true', help='左右翻转')
    ap.add_argument('--flip-y', action='store_true', help='上下翻转')
    a = ap.parse_args()
    flip = a.flip_x or a.flip_y
    if flip and (a.points or a.world):
        raise SystemExit('翻转和校正分两步：先翻转，在翻转后的图上量点，再校正')
    if not flip and not (a.points and a.world):
        raise SystemExit('要么给 --points 和 --world 做校正，要么给 --flip-x / --flip-y 做翻转')
    source, output = Path(a.image), Path(a.output)
    if source.resolve() == output.resolve():
        raise SystemExit('输出图不能覆盖原图')
    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened).convert('RGB')
    if flip:
        if a.flip_x: image = ImageOps.mirror(image)
        if a.flip_y: image = ImageOps.flip(image)
        save(image, output)
        print(f'已翻转：{output}（{image.width}×{image.height}）。在这张图上量点、读结构；文字是反的，尺寸数字和房间名看原图')
        return
    points, world = parse_points(a.points, '--points'), parse_points(a.world, '--world')
    out, scale, origin, to_mm = rectify(image, points, world, a.mm_per_px)
    save(out, output)
    sidecar = output.with_name(output.name + '.rect.json')
    sidecar.write_text(json.dumps({'source': source.name, 'output': output.name, 'size': list(out.size), 'mmPerPx': scale, 'origin': origin,
                                   'points': points, 'world': world, 'H_img2mm': to_mm}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'已校正：{output}（{out.width}×{out.height}）')
    print(f'underlay 用这张图：mmPerPx {scale}，origin {origin}')
    print(f'校正参数：{sidecar}（不是方案，不要用工具打开）。在校正后的图上重新量尺寸链，按读图 2.2 核对')


if __name__ == '__main__':
    main()
