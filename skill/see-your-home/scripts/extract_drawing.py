"""从「干净的电子示意图」里抠结构：粗黑块=墙，细线=窗/轮廓，浅灰块=家具，纯色块=待确认。
只适合横平竖直、墙涂实心黑的图。照片、手绘走视觉模型那条路。

用法：python extract_drawing.py 图.png 输出.json；先确认 numpy/Pillow 已有，缺失须经用户同意安装。
"""
import json, sys
import numpy as np
from PIL import Image


def rects_from_mask(m, min_side=3, min_area=30):
    """把二值图拆成横平竖直的矩形：按行取连续段，上下行同一段合并。"""
    h, w = m.shape
    open_ = {}  # (x0,x1) -> y0
    out = []
    for y in range(h + 1):
        runs = set()
        if y < h:
            row = m[y]
            x = 0
            while x < w:
                if row[x]:
                    x0 = x
                    while x < w and row[x]:
                        x += 1
                    runs.add((x0, x))
                else:
                    x += 1
        for k in list(open_):
            if k not in runs:
                y0 = open_.pop(k)
                x0, x1 = k
                if min(x1 - x0, y - y0) >= min_side and (x1 - x0) * (y - y0) >= min_area:
                    out.append([x0, y0, x1, y])
        for k in runs:
            open_.setdefault(k, y)
    return out


def merge_close(rects, tol=2):
    """抗锯齿会把一面墙切成几条宽度差 1px 的矩形，合并相邻且几乎同宽的。"""
    changed = True
    while changed:
        changed = False
        for i in range(len(rects)):
            for j in range(i + 1, len(rects)):
                a, b = rects[i], rects[j]
                # 竖向接上
                if abs(a[0] - b[0]) <= tol and abs(a[2] - b[2]) <= tol and (abs(a[3] - b[1]) <= tol or abs(b[3] - a[1]) <= tol):
                    rects[i] = [min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3])]
                # 横向接上
                elif abs(a[1] - b[1]) <= tol and abs(a[3] - b[3]) <= tol and (abs(a[2] - b[0]) <= tol or abs(b[2] - a[0]) <= tol):
                    rects[i] = [min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3])]
                else:
                    continue
                rects.pop(j)
                changed = True
                break
            if changed:
                break
    return rects


def thin_segments(m, thick, min_len=12):
    """细线：深色、但不属于粗墙的像素，取横线和竖线段。"""
    t = m & ~thick
    segs = []
    h, w = t.shape
    for y in range(h):
        row = t[y]; x = 0
        while x < w:
            if row[x]:
                x0 = x
                while x < w and row[x]:
                    x += 1
                if x - x0 >= min_len:
                    segs.append(['h', y, x0, x])
            else:
                x += 1
    for x in range(w):
        col = t[:, x]; y = 0
        while y < h:
            if col[y]:
                y0 = y
                while y < h and col[y]:
                    y += 1
                if y - y0 >= min_len:
                    segs.append(['v', x, y0, y])
            else:
                y += 1
    # 相邻 1px 的平行线合并（抗锯齿）
    segs.sort()
    out = []
    for s in segs:
        if out and out[-1][0] == s[0] and s[1] - out[-1][1] <= 1 and abs(out[-1][2] - s[2]) <= 2 and abs(out[-1][3] - s[3]) <= 2:
            continue
        out.append(s)
    return out


def main(src, dst):
    im = np.asarray(Image.open(src).convert('RGB')).astype(int)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    dark = (r < 90) & (g < 90) & (b < 90)
    # 粗墙：开运算去掉 1–3px 的细线
    k = 5
    from numpy.lib.stride_tricks import sliding_window_view as swv
    pad = np.pad(dark, k // 2)
    er = swv(pad, (k, k)).all(axis=(2, 3))
    pad2 = np.pad(er, k // 2)
    thick = swv(pad2, (k, k)).any(axis=(2, 3)) & dark
    walls = merge_close(rects_from_mask(thick, min_side=6, min_area=60))

    linemask = (r < 160) & (g < 160) & (b < 160)
    segs = thin_segments(linemask, thick)

    gray = (abs(r - g) < 6) & (abs(g - b) < 6) & (r > 225) & (r < 248)
    furn = merge_close(rects_from_mask(gray, min_side=8, min_area=200))

    red = (r > 200) & (g < 60) & (b < 60)
    green = (g > 200) & (r < 60) & (b < 60)
    color = {'red': merge_close(rects_from_mask(red, 8, 200)), 'green': merge_close(rects_from_mask(green, 8, 200))}

    json.dump({'size': [im.shape[1], im.shape[0]], 'walls': walls, 'thin': segs, 'gray': furn, 'color': color},
              open(dst, 'w'), ensure_ascii=False)
    print(f'walls {len(walls)}  thin {len(segs)}  gray {len(furn)}  red {len(color["red"])}  green {len(color["green"])}')


if __name__ == '__main__':
    import argparse
    from pathlib import Path
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('image'); parser.add_argument('output')
    args = parser.parse_args()
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    main(args.image, args.output)
