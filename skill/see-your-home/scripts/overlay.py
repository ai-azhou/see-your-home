"""把 v2/v3 方案叠回原图，用来自查读得对不对；只读写本地文件，不上传。

用法：python overlay.py 原图 方案.json 输出.png [--font 中文字体路径] [--scale 倍数] [--labels "客餐厅=29.0,主卧=12.3"]

画面：墙按类型半透明上色，门窗是墙上的粗线段，房间是虚线轮廓；图内用编号小圆点，名称与数值在图外图例栏，
柱是实心块，管道井是斜线块，楼梯是踏步线加上行箭头，挑空是虚线框加交叉线，未答问题是红框，已答问题是灰色虚线框。
有 levelUnderlays 时，每层用自己的比例和原点画在同一张原图上，并在该层左上角标层名。
终端打印每个房间的计算面积，方便和图上标注对照；问题框过大时警告。
"""
import argparse
import json
from plan_io import read_plan, write_plan
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

WALL_COLORS = {
    'exterior': (40, 70, 200, 120), 'bearing': (210, 40, 40, 120), 'partition': (20, 150, 80, 120),
    'glass': (0, 180, 220, 120), 'half': (230, 140, 0, 120), 'half-glass': (230, 140, 0, 120),
}
OPENING_MARK = {
    'door': ('D', (255, 120, 0)), 'sliding': ('S', (255, 120, 0)), 'doorway': ('O', (160, 90, 0)),
    'window': ('W', (0, 200, 230)), 'floor-window': ('F', (0, 200, 230)),
    'bay-window': ('B', (130, 60, 220)), 'open-balcony': ('R', (130, 60, 220)),
}
COLUMN_COLORS = {'bearing': (170, 20, 20, 230), 'decorative': (110, 110, 110, 220)}
SHAFT_COLOR = (120, 60, 20)
STAIR_COLOR = (0, 110, 160)
VOID_COLOR = (90, 90, 90)
ROOM_COLOR = (60, 40, 120)
Q_COLOR = (230, 0, 0)
ANSWERED_COLOR = (110, 110, 110)
INFERRED_ANSWERS = ('不确定', '不知道', '不清楚', '按最可能', '最可能的', '按图上最可能', '按图推断', '你看着办')


def question_style(q):
    answer = str(q.get('answer') or '').strip()
    if not answer:
        return '未答', Q_COLOR, False
    inferred = any(word in answer for word in INFERRED_ANSWERS)
    return '已答，仍是推断' if inferred else '已答', ANSWERED_COLOR, True

FONT_CANDIDATES = ['/System/Library/Fonts/Hiragino Sans GB.ttc', '/System/Library/Fonts/PingFang.ttc',
                   '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 'C:/Windows/Fonts/msyh.ttc']


def wall_path(w):
    """中心线点列；弧墙按矢高离散（法向 n = (-dy, dx)/L，bulge > 0 朝 n 鼓起）。"""
    (ax, ay), (bx, by) = w['a'], w['b']
    s = float(w.get('bulge') or 0)
    L = math.hypot(bx - ax, by - ay)
    if L == 0 or abs(s) < 1e-3:
        return [(ax, ay), (bx, by)]
    nx, ny = -(by - ay) / L, (bx - ax) / L
    mx, my = (ax + bx) / 2, (ay + by) / 2
    c = s / 2 - L * L / (8 * s)
    cx, cy = mx + nx * c, my + ny * c
    r = math.hypot(ax - cx, ay - cy)
    a0, a1 = math.atan2(ay - cy, ax - cx), math.atan2(by - cy, bx - cx)
    apex = math.atan2(my + ny * s - cy, mx + nx * s - cx)

    def between(t, lo, hi):
        return (t - lo) % (2 * math.pi) <= (hi - lo) % (2 * math.pi)
    sweep = (a1 - a0) % (2 * math.pi)
    if not between(apex, a0, a1):
        sweep -= 2 * math.pi
    n = max(2, math.ceil(abs(sweep) * r / 50))
    return [(cx + r * math.cos(a0 + sweep * i / n), cy + r * math.sin(a0 + sweep * i / n)) for i in range(n + 1)]


def sub_path(path, s0, s1):
    """沿折线按长度截取 [s0, s1] 段（弧墙上的洞口按弧长定位）。"""
    out, acc = [], 0.0
    for p, q in zip(path, path[1:]):
        seg = math.dist(p, q)
        if seg == 0:
            continue
        lo, hi = max(s0, acc), min(s1, acc + seg)
        if lo <= hi:
            t0, t1 = (lo - acc) / seg, (hi - acc) / seg
            a = (p[0] + (q[0] - p[0]) * t0, p[1] + (q[1] - p[1]) * t0)
            b = (p[0] + (q[0] - p[0]) * t1, p[1] + (q[1] - p[1]) * t1)
            if not out:
                out.append(a)
            out.append(b)
        acc += seg
    return out


def path_length(path):
    return sum(math.dist(p, q) for p, q in zip(path, path[1:]))


def strip(path, t):
    """沿折线两侧各偏 t/2，得到墙体多边形。"""
    left, right = [], []
    for i, (x, y) in enumerate(path):
        p0, p1 = path[max(i - 1, 0)], path[min(i + 1, len(path) - 1)]
        dx, dy = p1[0] - p0[0], p1[1] - p0[1]
        L = math.hypot(dx, dy) or 1
        nx, ny = -dy / L * t / 2, dx / L * t / 2
        left.append((x + nx, y + ny)); right.append((x - nx, y - ny))
    return left + right[::-1]


def area(poly):
    return abs(sum(p[0] * q[1] - q[0] * p[1] for p, q in zip(poly, poly[1:] + poly[:1]))) / 2


def bbox(points):
    xs = [p[0] for p in points]; ys = [p[1] for p in points]
    return min(xs), min(ys), max(xs), max(ys)


def dashed(d, pts, color, width=1, dash=8, gap=4, closed=True):
    seq = list(zip(pts, pts[1:] + pts[:1])) if closed else list(zip(pts, pts[1:]))
    for p, q in seq:
        dist = math.dist(p, q)
        if dist == 0:
            continue
        i = 0.0
        while i < dist:
            t0, t1 = i / dist, min(i + dash, dist) / dist
            d.line([(p[0] + (q[0] - p[0]) * t0, p[1] + (q[1] - p[1]) * t0),
                    (p[0] + (q[0] - p[0]) * t1, p[1] + (q[1] - p[1]) * t1)], fill=color, width=width)
            i += dash + gap


def hatch(im, poly, color, step, cross=False, width=1):
    """在多边形内画斜线（cross=True 再画反向斜线），用遮罩裁到多边形里。"""
    x0, y0, x1, y1 = [int(v) for v in bbox(poly)]
    x0 -= 2; y0 -= 2; x1 += 2; y1 += 2
    if x1 <= x0 or y1 <= y0:
        return
    layer = Image.new('RGBA', (x1 - x0, y1 - y0), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    w, h = layer.size
    for k in range(-h, w + h, max(2, int(step))):
        ld.line([(k, 0), (k + h, h)], fill=color, width=width)
        if cross:
            ld.line([(k + h, 0), (k, h)], fill=color, width=width)
    mask = Image.new('L', layer.size, 0)
    ImageDraw.Draw(mask).polygon([(x - x0, y - y0) for x, y in poly], fill=255)
    clipped = Image.new('RGBA', layer.size, (0, 0, 0, 0))
    clipped.paste(layer, (0, 0), mask)
    im.paste(clipped, (x0, y0), clipped)


def check_underlay(u, label):
    sx = float(u.get('mmPerPx') or 0); sy = float(u.get('mmPerPxY') or sx)
    if not (math.isfinite(sx) and sx > 0 and math.isfinite(sy) and sy > 0):
        raise SystemExit(f'{label} 缺少 mmPerPx（必须是正数），无法叠图')
    if u.get('flipX') or u.get('flipY') or u.get('rotation'):
        print(f'注意：{label} 有镜像或旋转，叠图按原图方向画，位置会对不上')
    ox, oy = u.get('origin', [0, 0])
    return sx, sy, float(ox), float(oy)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('image'); ap.add_argument('plan'); ap.add_argument('output')
    ap.add_argument('--font', help='中文字体路径；缺省自动找系统字体')
    ap.add_argument('--scale', type=float, help='输出放大倍数；缺省小图放大到约 1600px 宽')
    ap.add_argument('--labels', default='', help='原图标注面积（㎡）：名称或 id=面积，逗号分隔；偏差超过 5% 标出')
    a = ap.parse_args()
    labels = {}
    for pair in a.labels.replace('，', ',').split(','):
        if not pair.strip():
            continue
        name, sep, value = pair.partition('=')
        try:
            area_value = float(value)
        except ValueError:
            ap.error(f'--labels 的面积无效：{pair}')
        if not sep or not name.strip() or not math.isfinite(area_value) or area_value <= 0:
            ap.error(f'--labels 需要 名称=正数面积：{pair}')
        if name.strip() in labels:
            ap.error(f'--labels 名称重复：{name.strip()}（同名房间请用 id）')
        labels[name.strip()] = area_value
    plan = read_plan(a.plan)
    known = {r['id'] for r in plan['rooms']} | {r['name'] for r in plan['rooms']}
    if labels.keys() - known:
        ap.error('--labels 找不到房间：' + '、'.join(sorted(labels.keys() - known)))

    levels = plan.get('levels') or [{'id': None, 'name': ''}]
    level_ids = [lv['id'] for lv in levels]
    level_name = {lv['id']: lv.get('name') or lv['id'] for lv in levels}
    first = level_ids[0]
    per_level = plan.get('levelUnderlays') or {}
    base_u = plan.get('underlay')
    tf = {}
    for lv in level_ids:
        u = per_level.get(lv) if lv is not None else None
        if u is None:
            if not base_u:
                raise SystemExit(f'楼层 {lv} 没有 levelUnderlays，方案也没有 underlay，无法叠图')
            u, label = base_u, 'underlay'
        else:
            label = f'levelUnderlays.{lv}'
        tf[lv] = check_underlay(u, label)

    im0 = Image.open(a.image).convert('RGBA')
    k = a.scale or (max(1.0, round(1600 / im0.width)) if im0.width < 1200 else 1.0)
    if k != 1:
        im0 = im0.resize((round(im0.width * k), round(im0.height * k)), Image.LANCZOS)
    im = Image.blend(Image.new('RGBA', im0.size, 'white'), im0, .55).convert('RGB')  # RGB 底，RGBA 画笔才会半透明混合
    d = ImageDraw.Draw(im, 'RGBA')
    font_path = a.font or next((f for f in FONT_CANDIDATES if Path(f).exists()), None)
    fs = lambda n: ImageFont.truetype(font_path, max(8, int(n * k))) if font_path else ImageFont.load_default()
    font, small, font_lv = fs(12), fs(10), fs(18)
    markers = []
    def marker(pos, text, color):
        markers.append((pos, text, color[:3]))


    def lv_of(el):
        lv = el.get('level', first)
        if lv not in tf:
            print(f"构件 {el.get('id')} 的楼层 {lv} 不存在，按第一层画")
            return first
        return lv

    def P(lv):
        sx, sy, ox, oy = tf[lv]
        return lambda x, y: ((x / sx + ox) * k, (y / sy + oy) * k)

    def mm_px(lv, v):
        return v / tf[lv][0] * k

    walls = {w['id']: w for w in plan.get('walls', [])}
    level_pts = {lv: [] for lv in level_ids}
    level_mm = {lv: [] for lv in level_ids}

    # 挑空垫底
    for v in plan.get('voids', []):
        lv = lv_of(v); pt = P(lv)
        poly = [pt(*p) for p in v['poly']]
        d.polygon(poly, fill=VOID_COLOR + (40,))
        hatch(im, poly, VOID_COLOR + (120,), 12 * k, cross=True)
        dashed(d, poly, VOID_COLOR + (230,), width=2)
        x0, y0, x1, y1 = bbox(poly)
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        marker((poly[0][0] + 12*k, poly[0][1] + 12*k), v.get('name') or '挑空', VOID_COLOR)

    print('房间面积（按方案多边形计算，和图上标注对照）：')
    totals = {}
    for r in plan.get('rooms', []):
        lv = lv_of(r); pt = P(lv)
        poly = [pt(*p) for p in r['poly']]
        level_pts[lv] += poly; level_mm[lv] += r['poly']
        dashed(d, poly, ROOM_COLOR + (220,))
        m2 = area(r['poly']) / 1e6
        cx = sum(p[0] for p in poly) / len(poly); cy = sum(p[1] for p in poly) / len(poly)
        reference = labels.get(r['id'], labels.get(r['name']))
        comparison = ''
        if reference is not None:
            deviation = (m2 - reference) / reference * 100
            comparison = f'；标注 {reference:.2f} ㎡，偏差 {deviation:+.2f}%' + ('【超过 5%】' if abs(deviation) > 5 else '')
        elif labels:
            comparison = '；未提供标注面积'
        marker((poly[0][0] + 12*k, poly[0][1] + 12*k), f"{r['name']} {m2:.2f} ㎡{comparison}", ROOM_COLOR)
        counted = r.get('counted', True)
        if counted:
            totals[lv] = totals.get(lv, 0) + m2
        prefix = f'[{level_name[lv]}] ' if len(level_ids) > 1 else ''
        print(f"  {prefix}{r['id']} {r['name']}: {m2:.2f} ㎡{'' if counted else '（不计入）'}{comparison}")
    for lv in level_ids:
        if lv in totals:
            print(f"  {('[' + level_name[lv] + '] ') if len(level_ids) > 1 else ''}计入合计 {totals[lv]:.2f} ㎡")

    for w in walls.values():
        lv = lv_of(w); pt = P(lv)
        mm = strip(wall_path(w), float(w['thickness']))
        poly = [pt(*p) for p in mm]
        level_pts[lv] += poly; level_mm[lv] += mm
        d.polygon(poly, fill=WALL_COLORS.get(w['kind'], (120, 120, 120, 120)), outline=(0, 0, 0, 160))

    for o in plan.get('openings', []):
        w = walls.get(o['wall'])
        if not w:
            print(f"洞口 {o['id']} 的宿主墙 {o['wall']} 不存在"); continue
        lv = lv_of(w); pt = P(lv)
        path = wall_path(w)
        s0, s1 = float(o['offset']), float(o['offset']) + float(o['width'])
        if s1 > path_length(path) + 1:
            print(f"洞口 {o['id']} 超出宿主墙 {w['id']} 的长度")
        seg = [pt(*p) for p in sub_path(path, s0, s1)]
        if len(seg) < 2:
            continue
        mark, color = OPENING_MARK.get(o['kind'], ('?', (0, 0, 0)))
        d.line(seg, fill=color + (235,), width=max(3, int(mm_px(lv, float(w['thickness'])) * .8)), joint='curve')
        mid = seg[len(seg) // 2] if len(seg) > 2 else ((seg[0][0] + seg[1][0]) / 2, (seg[0][1] + seg[1][1]) / 2)
        marker((mid[0] + 10*k, mid[1] + 10*k), f"{mark} {o.get('name') or o['id']}，宽 {o['width']:g} mm", color)

    for c in plan.get('columns', []):
        lv = lv_of(c); pt = P(lv)
        (cx, cy), (sw, sd) = c['center'], c['size']
        color = COLUMN_COLORS.get(c.get('kind'), COLUMN_COLORS['bearing'])
        if c.get('shape') == 'round':
            r = sw / 2
            p0, p1 = pt(cx - r, cy - r), pt(cx + r, cy + r)
            d.ellipse((*p0, *p1), fill=color, outline=(0, 0, 0, 255))
        else:
            t = math.radians(float(c.get('rotation') or 0))
            cs, sn = math.cos(t), math.sin(t)
            corners = [(cx + dx * cs - dy * sn, cy + dx * sn + dy * cs)
                       for dx, dy in ((-sw / 2, -sd / 2), (sw / 2, -sd / 2), (sw / 2, sd / 2), (-sw / 2, sd / 2))]
            d.polygon([pt(*p) for p in corners], fill=color, outline=(0, 0, 0, 255))
        level_mm[lv].append((cx, cy))

    for s in plan.get('shafts', []):
        lv = lv_of(s); pt = P(lv)
        poly = [pt(*p) for p in s['poly']]
        d.polygon(poly, fill=SHAFT_COLOR + (50,), outline=SHAFT_COLOR + (255,))
        hatch(im, poly, SHAFT_COLOR + (220,), 4 * k, cross=True)
        d.polygon(poly, outline=SHAFT_COLOR + (255,))

    for st in plan.get('stairs', []):
        lv = lv_of(st); pt = P(lv)
        poly = [pt(*p) for p in st['poly']]
        d.polygon(poly, fill=STAIR_COLOR + (35,), outline=STAIR_COLOR + (255,))
        path = st['path']; half = float(st['width']) / 2
        acc, step = 0.0, 260.0
        for p, q in zip(path, path[1:]):
            L = math.dist(p, q)
            if L == 0:
                continue
            ux, uy = (q[0] - p[0]) / L, (q[1] - p[1]) / L
            nx, ny = -uy, ux
            s = (step - acc % step) % step
            while s <= L:
                x, y = p[0] + ux * s, p[1] + uy * s
                d.line([pt(x + nx * half, y + ny * half), pt(x - nx * half, y - ny * half)],
                       fill=STAIR_COLOR + (200,), width=1)
                s += step
            acc += L
        line = [pt(*p) for p in path]
        d.line(line, fill=STAIR_COLOR + (255,), width=max(2, int(2 * k)))
        (x0, y0), (x1, y1) = line[-2], line[-1]
        ang = math.atan2(y1 - y0, x1 - x0); h = 8 * k
        d.polygon([(x1, y1), (x1 - h * math.cos(ang - .45), y1 - h * math.sin(ang - .45)),
                   (x1 - h * math.cos(ang + .45), y1 - h * math.sin(ang + .45))], fill=STAIR_COLOR + (255,))
        to = level_name.get(st.get('to'), st.get('to'))
        marker((line[0][0] + 10*k, line[0][1]), f'楼梯 上→{to}', STAIR_COLOR)

    # 问题：整层面积按该层墙和房间的外包框算
    level_area = {}
    for lv in level_ids:
        if level_mm[lv]:
            x0, y0, x1, y1 = bbox(level_mm[lv])
            level_area[lv] = (x1 - x0) * (y1 - y0)
    owner = {}
    for key in ('walls', 'rooms', 'beams', 'columns', 'shafts', 'stairs', 'voids'):
        for el in plan.get(key, []):
            owner[el['id']] = el.get('level', first)
    for o in plan.get('openings', []):
        if o['wall'] in walls:
            owner[o['id']] = walls[o['wall']].get('level', first)

    big = 0
    for i, q in enumerate(plan.get('questions', []), 1):
        status, color, answered = question_style(q)
        tag = f'Q{i}【{status}】'
        lv = q.get('level') or next((owner[t] for t in q.get('targets') or [] if t in owner), first)
        lv = lv if lv in tf else first
        b = q.get('bbox')
        if not b:
            marker(None, f"{tag} {q['text']}（无框）", color)
            print(f"  {tag} 无框（{len(q.get('targets') or [])} 个 targets）：{q['text'][:30]}")
            continue
        pt = P(lv)
        x0, y0 = pt(b[0], b[1]); x1, y1 = pt(b[2], b[3])
        ratio = (b[2] - b[0]) * (b[3] - b[1]) / level_area[lv] if level_area.get(lv) else 0
        if ratio > .25:
            big += 1
            print(f"警告：{tag} 的框占整层 {ratio:.0%}，超过 1/4，只画角标。框住有歧义的构件即可，整屋问题去掉 bbox、改用 targets")
            L = 14 * k
            for cx, cy, sx_, sy_ in ((x0, y0, 1, 1), (x1, y0, -1, 1), (x0, y1, 1, -1), (x1, y1, -1, -1)):
                pts = [(cx, cy + sy_ * L), (cx, cy), (cx + sx_ * L, cy)]
                if answered:
                    dashed(d, pts, color + (255,), width=2, closed=False)
                else:
                    d.line(pts, fill=color + (255,), width=2)
        elif answered:
            dashed(d, [(x0, y0), (x1, y0), (x1, y1), (x0, y1)], color + (255,), width=2)
        else:
            d.rectangle((x0, y0, x1, y1), outline=color + (255,), width=2)
        marker((x0 + 10*k, y0 + 10*k), f"{tag} {q['text']}", color)
    if big:
        print(f'共 {big} 个问题框过大')

    if len(level_ids) > 1 or per_level:
        for lv in level_ids:
            if not level_pts[lv]:
                continue
            x0, y0, _, _ = bbox(level_pts[lv])
            name = level_name[lv]
            marker((x0, y0 - 12*k), str(name), (0, 0, 0))

    # Keep all prose outside the source image; only compact numbered dots remain in the drawing.
    legend = [('外墙', WALL_COLORS['exterior']), ('承重', WALL_COLORS['bearing']),
              ('内墙（类型待核）', WALL_COLORS['partition']), ('玻璃', WALL_COLORS['glass']),
              ('矮墙 / 半墙玻璃', WALL_COLORS['half']), ('柱', COLUMN_COLORS['bearing']),
              ('管道井 / 烟道（斜线块）', SHAFT_COLOR), ('楼梯（踏步与箭头）', STAIR_COLOR),
              ('挑空（灰虚线交叉）', VOID_COLOR), ('未答（红框 / 红角标）', Q_COLOR), ('已答（灰虚线框 / 角标）', ANSWERED_COLOR)]
    panel_w = max(300, round(380*k)); padding = max(12, round(16*k)); row = max(16, round(20*k))
    def wrap(text, limit):
        lines, line = [], ''
        for char in text:
            if line and d.textlength(line + char, font=font) > limit:
                lines.append(line); line = ''
            line += char
        return lines + [line]
    entries = [(str(i), wrap(text, panel_w - 3*padding), color) for i, (_, text, color) in enumerate(markers, 1)]
    panel_h = padding*2 + row*(len(legend)+2) + sum(row*len(lines)+padding//2 for _, lines, _ in entries)
    source_w = im.width
    canvas = Image.new('RGB', (source_w + panel_w, max(im.height, panel_h)), 'white')
    canvas.paste(im, (0, 0)); im = canvas; d = ImageDraw.Draw(im, 'RGBA')
    radius = max(7, round(8*k))
    for i, (pos, _, color) in enumerate(markers, 1):
        if pos is None: continue
        x = max(radius, min(source_w-radius-1, pos[0])); y = max(radius, min(im0.height-radius-1, pos[1]))
        d.ellipse((x-radius, y-radius, x+radius, y+radius), fill=(255,255,255,240), outline=color+(255,), width=max(1, round(k)))
        d.text((x,y), str(i), font=small, fill=color+(255,), anchor='mm')
    x = source_w + padding; y = padding
    d.line([(source_w,0),(source_w,im.height)], fill=(210,210,210,255))
    d.text((x,y), '构件与面积对照', font=font, fill=(0,0,0,255)); y += row*2
    for name, color in legend:
        d.rectangle((x,y+3,x+10,y+13), fill=color[:3]+(255,))
        d.text((x+padding,y), name, font=font, fill=(0,0,0,255)); y += row
    for number, lines, color in entries:
        d.text((x,y), number, font=font, fill=color+(255,))
        for line in lines:
            d.text((x+padding*1.5,y), line, font=font, fill=(0,0,0,255)); y += row
        y += padding//2

    out = Path(a.output); out.parent.mkdir(parents=True, exist_ok=True)
    im.convert('RGB').save(out)
    print(f'已保存叠图：{out}（{im.width}×{im.height}）')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, KeyError, TypeError) as error:
        raise SystemExit(f'无法生成叠图：{error}') from None
