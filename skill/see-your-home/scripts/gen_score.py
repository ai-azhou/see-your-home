#!/usr/bin/env python3
"""Offline structure scoring. Runtime dependencies: numpy, Pillow only.

S is chance-corrected edge recall relative to clay (not a probability; may exceed 1).
S* uses the research coarse/fine uniform-scale + translation search, no rotation.
Opening scores are geometric frame evidence, NOT semantic recognition.
"""
import argparse
import json
import math
from pathlib import Path
try:
    import numpy as np
except ModuleNotFoundError as error:
    if error.name != 'numpy':
        raise
    import sys
    print('需要 NumPy。用途是计算结构边缘和门窗的吻合分数。装好后再试；Skill 不会自己安装', file=sys.stderr)
    raise SystemExit(2) from None
try:
    from PIL import Image
except ModuleNotFoundError as error:
    if error.name != 'PIL':
        raise
    import sys
    print('需要 Pillow。用途是读取图片和输出检查三联图。装好后再试；Skill 不会自己安装', file=sys.stderr)
    raise SystemExit(2) from None

W, H, TOL = 960, 540, 4


def morph(a, iterations=1, erode=False):
    a = a.astype(bool)
    for _ in range(iterations):
        p = np.pad(a, 1)
        neighbors = [p[1:-1, 1:-1], p[:-2, 1:-1], p[2:, 1:-1], p[1:-1, :-2], p[1:-1, 2:]]
        a = np.logical_and.reduce(neighbors) if erode else np.logical_or.reduce(neighbors)
    return a


def correlate(a, weights, axis):
    radius = len(weights) // 2
    pads = [(0, 0)] * a.ndim
    pads[axis] = (radius, radius)
    padded = np.pad(a, pads, mode='symmetric')
    out = np.zeros_like(a, dtype=float)
    for i, weight in enumerate(weights):
        sl = [slice(None)] * a.ndim
        sl[axis] = slice(i, i + a.shape[axis])
        out += weight * padded[tuple(sl)]
    return out


def gaussian(a, sigma):
    radius = int(4 * sigma + .5)
    x = np.arange(-radius, radius + 1)
    weights = np.exp(-x*x / (2*sigma*sigma)); weights /= weights.sum()
    return correlate(correlate(a, weights, 0), weights, 1)


def hysteresis(weak, strong):
    # Exact 8-connected flood fill, equivalent to retaining labelled weak components
    # containing at least one strong pixel; no scipy dependency.
    h, w = weak.shape
    todo = list(np.flatnonzero(weak & strong))
    seen = (weak & strong).ravel().copy()
    weak = weak.ravel()
    while todo:
        i = todo.pop(); y, x = divmod(int(i), w)
        for yy in range(max(0, y-1), min(h, y+2)):
            for xx in range(max(0, x-1), min(w, x+2)):
                j = yy*w+xx
                if weak[j] and not seen[j]:
                    seen[j] = True; todo.append(j)
    return seen.reshape(h, w)


def edt(a):
    """Exact separable squared Euclidean distance via parabola lower envelopes.
    Each column builds its own envelope in parallel. True = foreground.
    """
    if np.all(a):
        return np.full(a.shape, np.inf)
    def transform(f):
        n, m = f.shape; cols = np.arange(m)
        v = np.zeros((n, m), dtype=np.int32)
        z = np.full((n + 1, m), np.inf); z[0] = -np.inf
        k = np.zeros(m, dtype=np.int32)
        for q in range(1, n):
            vk = v[k, cols]
            s = ((f[q] + q*q) - (f[vk, cols] + vk.astype(float)**2)) / (2*(q-vk))
            active = s <= z[k, cols]
            while active.any():
                k[active] -= 1
                vk = v[k, cols]
                s = ((f[q] + q*q) - (f[vk, cols] + vk.astype(float)**2)) / (2*(q-vk))
                active = s <= z[k, cols]
            k += 1; v[k, cols] = q; z[k, cols] = s; z[k+1, cols] = np.inf
        k.fill(0); out = np.empty_like(f)
        for q in range(n):
            active = z[k+1, cols] < q
            while active.any():
                k[active] += 1; active = z[k+1, cols] < q
            vk = v[k, cols]
            out[q] = (q-vk).astype(float)**2 + f[vk, cols]
        return out
    f = np.where(a, 1e12, 0.)
    return np.sqrt(transform(transform(f).T).T)


class _ImageOps:
    binary_dilation = staticmethod(morph)
    binary_erosion = staticmethod(lambda a, iterations=1: morph(a, iterations, True))
    gaussian_filter = staticmethod(gaussian)
    sobel = staticmethod(lambda a, axis: correlate(correlate(a, [-1, 0, 1], axis), [1, 2, 1], 1-axis))
    distance_transform_edt = staticmethod(edt)


ndimage = _ImageOps()


def load_rgb(p, crop169=True):
    im = Image.open(p).convert('RGB'); w, h = im.size; note = None
    if crop169 and abs(w / h - W / H) > 0.01:
        if w / h > W / H: nw = round(h * W / H); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
        else: nh = round(w * H / W); im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
        note = f'原图 {w}×{h} 居中裁切到输入机位比例'
    return im.resize((W, H), Image.LANCZOS), (w, h), note


def canny(rgb, q=88):
    g = np.asarray(rgb.convert('L'), dtype=float)
    g = ndimage.gaussian_filter(g, 1.4)
    gx, gy = ndimage.sobel(g, 1), ndimage.sobel(g, 0)
    mag = np.hypot(gx, gy); ang = (np.rad2deg(np.arctan2(gy, gx)) + 180) % 180
    nms = np.zeros_like(mag)
    P = np.pad(mag, 1)
    for a0, (dy, dx) in [(0, (0, 1)), (45, (1, 1)), (90, (1, 0)), (135, (1, -1))]:
        sel = (np.abs(ang - a0) < 22.5) | (np.abs(ang - a0 - 180) < 22.5) if a0 == 0 else (np.abs(ang - a0) < 22.5)
        n1 = P[1 + dy:1 + dy + H, 1 + dx:1 + dx + W]; n2 = P[1 - dy:1 - dy + H, 1 - dx:1 - dx + W]
        keep = sel & (mag >= n1) & (mag >= n2)
        nms[keep] = mag[keep]
    hi = np.percentile(mag, q); lo = hi * 0.5
    weak = nms > lo
    return hysteresis(weak, nms > hi)


def recall(dt, mask, tol=TOL):
    pts = mask.sum()
    return float((dt[mask] <= tol).sum() / pts) if pts else float('nan')


def chance(dt, mask, tol=TOL):
    """随机放线的命中率：真值线周围 12px 带里，离某条结果边缘 ≤tol 的像素比例。边缘越密（纹理多）这个越高"""
    reg = ndimage.binary_dilation(mask, iterations=12)
    return float((dt[reg] <= tol).mean()) if reg.any() else float('nan')


def kappa(r, c):
    return (r - c) / (1 - c) if c < 1 else float('nan')


def warp_points(mask, s, dx, dy):
    ys, xs = np.nonzero(mask)
    cx, cy = W / 2, H / 2
    X = np.round((xs - cx) * s + cx + dx).astype(int); Y = np.round((ys - cy) * s + cy + dy).astype(int)
    ok = (X >= 0) & (X < W) & (Y >= 0) & (Y < H)
    return X, Y, ok


def aligned(dt, G):
    """搜相似变换（GT 点 → 结果图），最大化结构线保留率。先粗后细。"""
    best = (-1, 1.0, 0, 0)
    ys, xs = np.nonzero(G['struct'])
    xx, yy = xs - W / 2, ys - H / 2
    count = len(xs)
    def ev(s, dx, dy):
        X = np.round(xx * s + W / 2 + dx).astype(int)
        Y = np.round(yy * s + H / 2 + dy).astype(int)
        ok = (X >= 0) & (X < W) & (Y >= 0) & (Y < H)
        return float((dt[Y[ok], X[ok]] <= TOL).sum() / count) if count else 0.0
    for s in np.arange(0.90, 1.101, 0.02):
        for dx in range(-96, 97, 12):
            for dy in range(-round(H * .1), round(H * .1) + 1, 9):
                r = ev(s, dx, dy)
                if r > best[0]: best = (r, s, dx, dy)
    _, s0, dx0, dy0 = best
    for s in np.arange(s0 - 0.02, s0 + 0.021, 0.005):
        for dx in range(dx0 - 12, dx0 + 13, 3):
            for dy in range(dy0 - 9, dy0 + 10, 3):
                r = ev(s, dx, dy)
                if r > best[0]: best = (r, s, dx, dy)
    r, s, dx, dy = best
    def rec(mask):
        X, Y, ok = warp_points(mask, s, dx, dy)
        return float((dt[Y[ok], X[ok]] <= TOL).sum() / mask.sum()) if mask.sum() else float('nan')
    return {'Rs*': rec(G['struct']), 'Ro*': rec(G['open']), 'Rf*': rec(G['furn']), 'scale': round(float(s), 3), 'dx_px': int(dx), 'dy_px': int(dy)}


def score_image(rgb, G):
    e = canny(rgb)
    dt = ndimage.distance_transform_edt(~e)
    out = {'Rs': recall(dt, G['struct']), 'Ro': recall(dt, G['open']), 'Rf': recall(dt, G['furn']),
           'C': float(np.minimum(dt[G['struct']], 40).mean()), 'edge_density': float(e.mean())}
    for k, m in [('s', 'struct'), ('o', 'open'), ('f', 'furn')]:
        out['c' + k] = chance(dt, G[m]); out['K' + k] = kappa(out['R' + k], out['c' + k])
    # 每个洞口单独的线保留率
    per = {}
    for o in G['meta']['openings']:
        m = G['gt'] & ndimage.binary_dilation(G['ids'] == o['idx'], iterations=3)
        per[o['id']] = recall(dt, m)
    out['per_opening'] = per
    out.update(aligned(dt, G))
    for k in 'sof': out[f'K{k}*'] = kappa(out[f'R{k}*'], out['c' + k])
    return out, e, dt


def overlay(rgb, G, dt):
    a = np.asarray(rgb.convert('L'), dtype=float) * 0.55 + 255 * 0.2
    img = np.stack([a, a, a], -1).astype(np.uint8)
    m = G['struct'] | G['open']
    hit = m & (dt <= TOL); miss = m & (dt > TOL)
    big = lambda x: ndimage.binary_dilation(x, iterations=1)
    img[big(hit)] = (40, 200, 60); img[big(miss)] = (235, 30, 30)
    return Image.fromarray(img)



def rgb2lab(rgb):
    rgb = np.asarray(rgb, dtype=float)
    linear = np.where(rgb > .04045, ((rgb + .055) / 1.055)**2.4, rgb / 12.92)
    xyz = linear @ np.array([[.412453, .357580, .180423], [.212671, .715160, .072169], [.019334, .119193, .950227]]).T
    xyz /= np.array([.95047, 1., 1.08883])
    f = np.where(xyz > .008856, np.cbrt(xyz), 7.787 * xyz + 16/116)
    return np.stack([116*f[..., 1]-16, 500*(f[..., 0]-f[..., 1]), 200*(f[..., 1]-f[..., 2])], -1)


def deltaE_ciede2000(lab1, lab2):
    """CIEDE2000, unit parametric weights; vectorized over leading dimensions."""
    l1, a1, b1 = np.moveaxis(np.asarray(lab1, float), -1, 0)
    l2, a2, b2 = np.moveaxis(np.asarray(lab2, float), -1, 0)
    cbar = (np.hypot(a1,b1) + np.hypot(a2,b2)) / 2
    g = .5 * (1 - np.sqrt(cbar**7 / (cbar**7 + 25**7)))
    ap1, ap2 = (1+g)*a1, (1+g)*a2
    c1, c2 = np.hypot(ap1,b1), np.hypot(ap2,b2)
    h1 = np.degrees(np.arctan2(b1,ap1)) % 360
    h2 = np.degrees(np.arctan2(b2,ap2)) % 360
    dl, dc = l2-l1, c2-c1
    dh = h2-h1
    dh = np.where(dh > 180, dh-360, np.where(dh < -180, dh+360, dh))
    dh = np.where(c1*c2 == 0, 0, dh)
    dH = 2*np.sqrt(c1*c2)*np.sin(np.radians(dh/2))
    lm, cm = (l1+l2)/2, (c1+c2)/2
    hm = np.where(np.abs(h1-h2) <= 180, (h1+h2)/2,
                  np.where(h1+h2 < 360, (h1+h2+360)/2, (h1+h2-360)/2))
    hm = np.where(c1*c2 == 0, h1+h2, hm)
    cos = lambda x: np.cos(np.radians(x))
    t = 1-.17*cos(hm-30)+.24*cos(2*hm)+.32*cos(3*hm+6)-.20*cos(4*hm-63)
    sl = 1+.015*(lm-50)**2 / np.sqrt(20+(lm-50)**2)
    sc, sh = 1+.045*cm, 1+.015*cm*t
    rt = -2*np.sqrt(cm**7/(cm**7+25**7))*np.sin(np.radians(60*np.exp(-((hm-275)/25)**2)))
    return np.sqrt(np.maximum(0, (dl/sl)**2+(dc/sc)**2+(dH/sh)**2+rt*(dc/sc)*(dH/sh)))


def bilinear(arr, yy, xx):
    h, w = arr.shape
    x = np.clip(xx, 0, w-1); y = np.clip(yy, 0, h-1)
    x0, y0 = np.floor(x).astype(int), np.floor(y).astype(int)
    x1, y1 = np.minimum(x0+1, w-1), np.minimum(y0+1, h-1)
    fx, fy = x-x0, y-y0
    result = (arr[y0,x0]*(1-fx)+arr[y0,x1]*fx)*(1-fy)+(arr[y1,x0]*(1-fx)+arr[y1,x1]*fx)*fy
    return np.where((xx>=0)&(xx<=w-1)&(yy>=0)&(yy<=h-1), result, 0)


def palette(rgb):
    """最多均匀抽样 20000 像素；固定种子，最大簇优先，返回 Lab 与占比。"""
    pixels = np.asarray(rgb).reshape(-1, 3)
    pixels = pixels[np.linspace(0, len(pixels) - 1, min(len(pixels), 20000), dtype=int)]
    lab = rgb2lab(pixels.astype(float) / 255)
    rng = np.random.default_rng(0)
    centers = [lab[rng.integers(len(lab))]]
    for _ in range(2):
        dist = np.min(((lab[:, None] - centers) ** 2).sum(2), axis=1)
        centers.append(lab[rng.choice(len(lab), p=dist / dist.sum())] if dist.sum() else centers[0])
    centers = np.array(centers)
    for _ in range(100):
        labels = ((lab[:, None] - centers) ** 2).sum(2).argmin(1)
        new = np.array([lab[labels == i].mean(0) if np.any(labels == i) else centers[i] for i in range(3)])
        if np.max(np.abs(new - centers)) < 1e-5:
            centers = new
            break
        centers = new
    labels = ((lab[:, None] - centers) ** 2).sum(2).argmin(1)
    counts = np.bincount(labels, minlength=3)
    return [{'lab': centers[i].tolist(), 'weight': float(counts[i] / len(lab))}
            for i in np.argsort(-counts, kind='stable') if counts[i]]


def reference_palette(path):
    with Image.open(path) as im:
        im = im.convert('RGB')
        im.thumbnail((512, 512))  # 保留整图和宽高比，不裁切
        return palette(im)


def score_style(rgb, gt, alignment, reference):
    """把结果图双线性采样到 GT 坐标；越界剔除，遮罩内缩 3px。"""
    arr = np.asarray(rgb)
    h, w = arr.shape[:2]
    yy, xx = np.indices((h, w), dtype=float)
    xx = (xx - w / 2) * alignment['scale'] + w / 2 + alignment['dx_px']
    yy = (yy - h / 2) * alignment['scale'] + h / 2 + alignment['dy_px']
    valid = (xx >= 0) & (xx <= w - 1) & (yy >= 0) & (yy <= h - 1)
    aligned = np.stack([bilinear(arr[..., i].astype(float), yy, xx) for i in range(3)], axis=-1)
    result = {}
    for name in ('wall', 'floor'):
        mask = (gt['seg'] == gt['meta']['segClasses'][name]).all(2)
        mask = ndimage.binary_erosion(mask, iterations=3) & valid
        n = int(mask.sum())
        if not n:
            result[name] = {'pixels': 0, 'delta_e2000': None, 'reason': 'no_valid_pixels'}
            continue
        dominant = palette(aligned[mask])[0]
        reference_lab = np.array([p['lab'] for p in reference])
        distances = deltaE_ciede2000(np.broadcast_to(dominant['lab'], reference_lab.shape), reference_lab)
        idx = int(np.argmin(distances))
        result[name] = {'pixels': n, 'dominant_lab': dominant['lab'], 'dominant_weight': dominant['weight'],
                        'palette_index': idx, 'delta_e2000': float(distances[idx])}
    values = [result[n]['delta_e2000'] for n in ('wall', 'floor')]
    result['mean_delta_e2000'] = float(np.mean(values)) if all(v is not None for v in values) else None
    return result


def gt_for(camera_path, lines=None, openings=None, seg=None, clay=None):
    global W, H
    meta = json.loads(camera_path.read_text())
    W, H = 960, round(960 * meta['height'] / meta['width'])
    if not 120 <= H <= 3840:
        raise ValueError('机位画幅比例超出支持范围（1:4 到 8:1）')
    prefix = camera_path.name.removesuffix('.camera.json')
    def path(override, suffix):
        return Path(override) if override else camera_path.parent / (prefix + suffix)
    def resized(p, method=Image.Resampling.NEAREST, mode=None):
        im = Image.open(p)
        if im.size != (meta['width'], meta['height']):
            raise ValueError(f'{p.name}: 素材尺寸与 camera 不一致')
        if mode:
            im = im.convert(mode)
        return np.asarray(im.resize((W,H), method))
    # BOX pooling retains subpixel thin lines when reducing, including the research
    # 1920x1080 one-pixel PNG ground truth. Never load a .npy file.
    line_image = Image.open(path(lines, '.lines.png')).convert('L')
    if line_image.size != (meta['width'], meta['height']):
        raise ValueError('线稿尺寸与 camera 不一致')
    ink = Image.fromarray(np.where(np.asarray(line_image) < 200, 0, 255).astype(np.uint8))
    gt = np.asarray(ink.resize((W,H), Image.Resampling.BOX)) < 255
    op = resized(path(openings, '.openings.png'))
    if op.ndim == 3:  # research RGB instance mask, for published compatibility fixtures
        ids = np.where(op[...,1] == 255, np.round(op[...,0]/10), 0).astype(int)
    else:
        ids = op.astype(int)
    seg_path = path(seg, '.seg.png')
    segmentation = resized(seg_path, mode='RGB') if seg_path.exists() else None
    furniture = np.zeros_like(gt)
    # 研究素材用单一的 furniture 类；render 画了装修层时，家具和柜体按 segDecorClasses 列出的 ADE20K 类合并。
    classes = meta.get('segClasses', {})
    if segmentation is not None:
        for name in ['furniture', *meta.get('segDecorClasses', [])]:
            if name in classes:
                furniture |= (segmentation == classes[name]).all(2)
    m_open = gt & morph(ids>0, 3)
    m_furn = gt & morph(furniture, erode=True) & ~m_open
    if not gt.any():
        raise ValueError('线稿没有有效结构线')
    for o in meta['openings']:
        if o.get('visible_px', 0) > 0 and not (ids == o['idx']).any():
            raise ValueError(f'可见洞口 {o["id"]} 在遮罩内缺失')
    return {'gt':gt, 'struct':gt & ~m_furn, 'open':m_open, 'furn':m_furn,
            'ids':ids, 'meta':meta, 'seg':segmentation}, path(clay, '.png')


def normalized(sc, baseline, G, star=''):
    keys = ['s'] + (['o'] if G['open'].any() else [])
    values = []
    for key in keys:
        b, v = baseline[f'K{key}{star}'], sc[f'K{key}{star}']
        if not math.isfinite(b) or b <= 1e-8 or not math.isfinite(v):
            return None
        values.append(v/b)
    return sum(values)/len(values)


def opening_scores(dt, base_dt, G):
    out = {}
    for o in G['meta']['openings']:
        if not o.get('visible_px', 0):
            continue
        region = G['ids'] == o['idx']
        # Score frame lines inside each visible aperture plus a 3px boundary band.
        frame = G['gt'] & morph(region, 3)
        r, b = recall(dt, frame), recall(base_dt, frame)
        out[o['id']] = {'score': float(np.clip(r/b, 0, 1)) if math.isfinite(b) and b > 0 else None,
                        'frame_recall': r, 'baseline_recall': b, 'frame_pixels': int(frame.sum())}
    return out


def clean_json(value):
    if isinstance(value, dict): return {k:clean_json(v) for k,v in value.items()}
    if isinstance(value, (list, tuple)): return [clean_json(v) for v in value]
    if isinstance(value, (float, np.floating)): return float(value) if math.isfinite(value) else None
    return value


def evaluate(rgb, G, baseline, base_dt, threshold=.6, opening_threshold=.6, reference=None):
    sc, _, dt = score_image(rgb, G)
    sc['S'], sc['S*'] = normalized(sc, baseline, G), normalized(sc, baseline, G, '*')
    per = opening_scores(dt, base_dt, G)
    valid = [v['score'] for v in per.values()]
    op = min(valid) if valid and all(v is not None for v in valid) else None
    opening_pass = (not per) or (op is not None and op >= opening_threshold)
    passed = sc['S'] is not None and sc['S'] >= threshold and opening_pass
    if sc['S'] is None:
        conclusion = '白模边缘不足以标定，请人工核对素材'
    elif sc['S'] < threshold:
        conclusion = '整张取景可能发生平移缩放，建议重出' if sc['S*'] is not None and sc['S*'] >= threshold else '整张重新构图，建议重出'
    elif not opening_pass:
        conclusion = '窗户位置可能被改，请人工看'
    else:
        conclusion = '结构边缘检查过关，门窗语义和最终效果仍请人工看'
    sc.update({'opening_score':op, 'openings':per, 'pass':passed, 'conclusion':conclusion,
               'thresholds':{'S':threshold,'opening_score':opening_threshold},
               'opening_rule':'每扇可见洞口线保留率 / 白模自身保留率，截到 0–1；总分取最小值，无可见洞口则不参与门槛；非语义识别',
               'style':None})
    if reference:
        if G['seg'] is None or not {'wall','floor'} <= G['meta'].get('segClasses',{}).keys():
            sc['style'] = {'mean_delta_e2000':None,'reason':'missing_wall_floor_segmentation'}
        else:
            sc['style'] = score_style(rgb, G, sc, reference)
    return clean_json(sc), dt


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('images', nargs='+', type=Path)
    p.add_argument('--camera', required=True, type=Path)
    for name in ('lines','openings','seg','clay'):
        p.add_argument('--'+name, type=Path, help='默认同名前缀 render --passes 文件')
    p.add_argument('--style-photo', type=Path)
    p.add_argument('--threshold', type=float, default=.6)
    p.add_argument('--opening-threshold', type=float, default=.6)
    p.add_argument('--triptych-dir', type=Path)
    p.add_argument('-o','--output', type=Path)
    a = p.parse_args()
    if not 0 <= a.opening_threshold <= 1:
        p.error('--opening-threshold 必须为 0–1')
    try:
        G, clay_path = gt_for(a.camera, a.lines, a.openings, a.seg, a.clay)
        clay, _, _ = load_rgb(clay_path)
        baseline, _, base_dt = score_image(clay, G)
        reference = reference_palette(a.style_photo) if a.style_photo else None
        rows = []
        for idx, f in enumerate(a.images, 1):
            rgb, size, note = load_rgb(f)
            sc, dt = evaluate(rgb, G, baseline, base_dt, a.threshold, a.opening_threshold, reference)
            sc.update({'image': f.name, 'original_size': size, 'crop_note': note})
            if a.triptych_dir:
                a.triptych_dir.mkdir(parents=True, exist_ok=True)
                sheet = Image.new('RGB',(W*3,H),'white')
                for i, im in enumerate((clay,rgb,overlay(rgb,G,dt))): sheet.paste(im,(W*i,0))
                target = a.triptych_dir / f'{idx:03d}-{f.stem}.jpg'
                sheet.save(target, quality=85); sc['triptych'] = target.name
            rows.append(sc)
        result = json.dumps({'scoring_size':[W,H], 'style_palette':reference, 'images':rows}, ensure_ascii=False, indent=2, allow_nan=False)+'\n'
        if a.output: a.output.write_text(result)
        else: print(result, end='')
    except (ValueError, OSError, KeyError) as e:
        p.error(str(e))


if __name__ == '__main__':
    main()
