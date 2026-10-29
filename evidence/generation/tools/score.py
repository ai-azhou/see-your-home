"""跑位打分 + 拼图。不调用任何生成服务。
用法（在 research/生图跑位 下）：
  uv run --no-project --with numpy --with pillow --with scipy python tools/score.py              # 给 runs/（Lovart + 本地）打分
  uv run --no-project --with numpy --with pillow --with scipy --with scikit-image python tools/score.py pack <执行包目录>   # 给外部执行包（如 libtv-包/）打分
真值 = 导出的模型线稿（inputs/<机位>/furnished/lines-gt.npy，1px）+ 分割遮罩 + 洞口实例遮罩。
在 960×540 上算（结果图先按 16:9 缩放；非 16:9 的先居中裁成 16:9 再缩，记在 scores.json）。

指标（都在 0–1，越高越好）：
  Rs  结构线保留率：墙 / 顶 / 地 / 梁这类非家具真值线像素里，4px（≈0.4% 画宽）内有结果图边缘的比例
  Ro  洞口线保留率：窗、门洞范围内（含边框外扩 3px）的真值线保留率——窗挪了、变形、没了，这一项先掉
  Rf  家具线保留率
  Rs*/Ro*  先找最佳相似变换（缩放 0.90–1.10、平移 ±10%）对齐后的同一指标；*与原值差得多 = 主要是机位 / 取景漂了，几何本身没大变
  C   结构线倒角距离（px，960 宽下，封顶 40）：真值线到最近结果边缘的平均距离，越小越好
边缘检测：自写 Canny（σ=1.4，高阈值 = 梯度幅值 88 分位，低阈值 = 高阈值 × 0.5）。
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

R = Path(__file__).resolve().parents[1]
W, H = 960, 540
TOL = 4


def load_rgb(p, crop169=True):
    im = Image.open(p).convert('RGB'); w, h = im.size; note = None
    if crop169 and abs(w / h - 16 / 9) > 0.01:
        if w / h > 16 / 9: nw = round(h * 16 / 9); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
        else: nh = round(w * 9 / 16); im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
        note = f'原图 {w}×{h} 非 16:9，居中裁成 16:9'
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
    lab, n = ndimage.label(weak, np.ones((3, 3)))
    strong_ids = np.unique(lab[(nms > hi) & weak])
    return np.isin(lab, strong_ids[strong_ids > 0])


def gt_for(shot):
    d = R / f'inputs/{shot}/furnished'
    g = np.load(d / 'lines-gt.npy')
    gt = g.reshape(H, 2, W, 2).any(axis=(1, 3))
    seg = np.asarray(Image.open(d / 'seg.png').convert('RGB').resize((W, H), Image.NEAREST))
    op = np.asarray(Image.open(d / 'openings.png').convert('RGB').resize((W, H), Image.NEAREST))
    meta = json.loads((d / 'camera.json').read_text())
    furn = (seg == np.array(meta['segClasses']['furniture'])).all(2)
    ids = np.where(op[..., 1] == 255, np.round(op[..., 0] / 10), 0).astype(int)
    open_any = ndimage.binary_dilation(ids > 0, iterations=3)
    # 线落在家具上：3×3 邻域全是家具；落在洞口上：洞口遮罩外扩 3px 之内
    furn_core = ndimage.binary_erosion(furn, iterations=1)
    m_open = gt & open_any
    m_furn = gt & furn_core & ~m_open
    m_struct = gt & ~m_furn
    return {'gt': gt, 'struct': m_struct, 'open': m_open, 'furn': m_furn, 'ids': ids, 'meta': meta, 'seg': seg}


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
    def ev(s, dx, dy):
        X, Y, ok = warp_points(G['struct'], s, dx, dy)
        return float((dt[Y[ok], X[ok]] <= TOL).sum() / G['struct'].sum())
    for s in np.arange(0.90, 1.101, 0.02):
        for dx in range(-96, 97, 12):
            for dy in range(-54, 55, 9):
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


def main():
    runs = sorted(p for p in (R / 'runs').glob('*/summary.json'))
    Gs = {s: gt_for(s) for s in ['living', 'master']}
    results = {}
    # 标定：输入白模本身（上限）、白模平移 3% / 放大 5%（取景漂了）、另一机位（完全不对）
    calib = {}
    for shot, G in Gs.items():
        clay, _, _ = load_rgb(R / f'inputs/{shot}/furnished/clay.png')
        sc, _, _ = score_image(clay, G); calib[f'{shot}/白模自身'] = sc
        sh = Image.new('RGB', (W, H), 'white'); sh.paste(clay, (29, 0)); calib[f'{shot}/白模右移3%'] = score_image(sh, G)[0]
        z = clay.resize((round(W * 1.05), round(H * 1.05))).crop((round(W * .025), round(H * .025), round(W * .025) + W, round(H * .025) + H)); calib[f'{shot}/白模放大5%'] = score_image(z, G)[0]
        other = 'master' if shot == 'living' else 'living'
        oc, _, _ = load_rgb(R / f'inputs/{other}/furnished/clay.png'); calib[f'{shot}/另一机位白模'] = score_image(oc, G)[0]
    for sf in runs:
        s = json.loads(sf.read_text())
        if not s.get('files'): results[s['id']] = {'id': s['id'], 'missing': True, 'status': s.get('final_status')}; continue
        f = Path(s['files'][0]); f = f if f.is_absolute() else R / f
        rgb, size, note = load_rgb(f)
        G = Gs[s['shot']]
        sc, e, dt = score_image(rgb, G)
        # 模型核对：Lovart 结果 JSON 和 result / status 接口都不返回实际调用的工具名，文件里也没有 C2PA 等出处元数据；
        # 只能用「failures 为空 + Agent 自述 + 输出格式与尺寸指纹」核对。指纹对不上的标 model_ok=False，不进该格分数
        FP = {'nbp': ('.png', (1376, 768)), 'seedream': ('.jpeg', (2560, 1440)), 'qwen': ('.png', (2048, 1152)), 'local': ('.png', (960, 544))}
        fp = (f.suffix.lower().replace('.jpg', '.jpeg'), tuple(size))
        sc['fingerprint'] = list(fp); sc['model_ok'] = (fp == FP.get(s['model'])) and not s.get('failures')
        # Seedream 在提示词没写画幅时会出 2048×2048 方图（主卧 M0 两张）：格式仍是 JPEG、尺寸是 Seedream 的 2K 档，判为同一模型、画幅被改
        if s['model'] == 'seedream' and fp[0] == '.jpeg' and max(fp[1]) == 2048 and not s.get('failures'):
            sc['model_ok'] = True; sc['aspect_changed'] = True
        sc.update({'id': s['id'], 'shot': s['shot'], 'method': s['method'], 'model': s['model'], 'rep': s['rep'], 'file': str(f.relative_to(R)), 'size': size, 'note': note})
        results[s['id']] = sc
        ov = overlay(rgb, G, dt)
        (R / 'runs' / s['id'] / 'check').mkdir(exist_ok=True)
        rgb.save(R / 'runs' / s['id'] / 'check/result-960.png'); ov.save(R / 'runs' / s['id'] / 'check/overlay.png')
    for v in results.values():
        if v.get('missing'): continue
        cs = calib[f"{v['shot']}/白模自身"]
        v['S'] = 0.5 * v['Ks'] / cs['Ks'] + 0.5 * v['Ko'] / cs['Ko']
        v['S*'] = 0.5 * v['Ks*'] / cs['Ks*'] + 0.5 * v['Ko*'] / cs['Ko*']
    (R / 'scores.json').write_text(json.dumps({'calibration': calib, 'runs': results}, ensure_ascii=False, indent=1, default=float))
    sheets(results, Gs)
    for k, v in calib.items(): print('标定', k, {x: round(v[x], 3) for x in ['Rs', 'Ro', 'Ks', 'Ko', 'Ks*', 'Ko*', 'cs', 'co']}, v['scale'], v['dx_px'], v['dy_px'])
    for k, v in results.items():
        if v.get('missing'): print(k, '无结果', v.get('status')); continue
        print(k, {x: round(v[x], 3) for x in ['S', 'S*', 'Ks', 'Ko', 'Kf', 'Ks*', 'Ko*', 'cs', 'co', 'C']}, 'align', v['scale'], v['dx_px'], v['dy_px'], v['size'], 'model_ok', v['model_ok'])


def sheets(results, Gs):
    cw, ch = 400, 225
    from run_lovart import CELLS  # noqa
    for shot in ['living', 'master']:
        rows = [('INPUT', None)] + [(f'{m}-{md}', (m, md)) for m, md in CELLS + [('L', 'local')]]
        S = Image.new('RGB', (cw * 4 + 10, (ch + 18) * len(rows)), 'white'); d = ImageDraw.Draw(S)
        for ri, (lab, cell) in enumerate(rows):
            y = ri * (ch + 18)
            if cell is None:
                base = R / f'inputs/{shot}/furnished'
                for ci, n in enumerate(['clay.png', 'depth.png', 'lines.png', 'seg.png']):
                    S.paste(Image.open(base / n).convert('RGB').resize((cw, ch)), (ci * cw, y + 18))
                d.text((4, y + 3), f'{shot} INPUT: clay | depth | lines | seg', fill='black'); continue
            for rep in [1, 2]:
                jid = f'{shot}-{cell[0]}-{cell[1]}-{rep}'; v = results.get(jid)
                x = (rep - 1) * 2 * cw
                if not v or v.get('missing'):
                    d.text((x + 4, y + 3), f'{jid}: no result', fill='red'); continue
                S.paste(Image.open(R / 'runs' / jid / 'check/result-960.png').resize((cw, ch)), (x, y + 18))
                S.paste(Image.open(R / 'runs' / jid / 'check/overlay.png').resize((cw, ch)), (x + cw, y + 18))
                d.text((x + 4, y + 3), f"{jid}  S={v['S']:.2f} (Ks={v['Ks']:.2f} Ko={v['Ko']:.2f}) | S*={v['S*']:.2f} s={v['scale']} d=({v['dx_px']},{v['dy_px']})", fill='black')
        S.save(R / f'拼图-{shot}.png')
        S.resize((S.width // 2, S.height // 2)).save(R / f'拼图-{shot}-小.png')


def score_pack(pack):
    """给外部执行包（如 libtv-包/）打分：读 <pack>/cells.json、results.jsonl、outputs/，
    结构真值用本目录 inputs/<机位>/furnished/ 的线稿和洞口遮罩；结果写 <pack>/scores.json 和 <pack>/拼图-<机位>.png。
    results.jsonl 每次调用一行；status=ok 且 output_file 存在的都打分（同一格多次重试各算一行）。"""
    pack = Path(pack).resolve()
    cells = {c['id']: c for c in json.loads((pack / 'cells.json').read_text())}
    rows = [json.loads(l) for l in (pack / 'results.jsonl').read_text().splitlines() if l.strip()] if (pack / 'results.jsonl').exists() else []
    shots = sorted({c['shot'] for c in cells.values() if c['shot'] is not None})
    style_refs = [pack / 'inputs' / f'style-photo.{ext}' for ext in ('png', 'jpg', 'jpeg')]
    style_file = next((p for p in style_refs if p.is_file()), None)
    # 若尚未复制 inputs，仍可展示 S0 的最后一次成功输出。
    display_style = style_file
    if display_style is None:
        display_style = next((pack / r['output_file'] for r in reversed(rows)
                              if cells.get(r.get('cell_id'), {}).get('group') == 'S0'
                              and r.get('status') == 'ok' and r.get('output_file')
                              and (pack / r['output_file']).is_file()), None)
    reference = None
    if style_file:
        from style_score import reference_palette, score_style
        reference = reference_palette(style_file)
    def has_style(c):
        return any(Path(i.get('file', '')).stem == 'style-photo' for i in c.get('images', []))
    style_pairs = {(c['shot'], c['model']) for c in cells.values() if has_style(c)}
    Gs = {s: gt_for(s) for s in shots}
    selfc = {}
    check = {}
    for shot in shots:
        clay, _, _ = load_rgb(R / f'inputs/{shot}/furnished/clay.png')
        selfc[shot] = score_image(clay, Gs[shot])[0]
        # 执行包里的白模必须和真值同一机位：逐像素比对（不同就说明包里的输入换过，分数不可信）
        pc = pack / f'inputs/{shot}/clay.png'
        if pc.exists():
            a = np.asarray(Image.open(pc).convert('RGB').resize((W, H)), dtype=float); b = np.asarray(clay, dtype=float)
            check[shot] = {'pack_clay_mean_abs_diff': round(float(np.abs(a - b).mean()), 3), 'same_view': bool(np.abs(a - b).mean() < 2)}
    (pack / '_check').mkdir(exist_ok=True)
    out = []
    for r in rows:
        cid = r.get('cell_id'); c = cells.get(cid)
        rec = {'style': None, 'cell_id': cid, 'attempt': r.get('attempt'), 'status': r.get('status'), 'model_id': r.get('model_id'), 'model_name': r.get('model_name')}
        if not c: rec['error'] = 'cells.json 里没有这一格'; out.append(rec); continue
        rec.update({'shot': c['shot'], 'method': c['method'], 'model': c['model'], 'sample': c.get('sample'), 'phase': c.get('phase')})
        f = pack / (r.get('output_file') or '')
        if r.get('status') != 'ok' or not r.get('output_file') or not f.is_file():
            rec['scored'] = False; out.append(rec); continue
        if c['shot'] is None:
            rec.update({'scored': False, 'skip_reason': 'shot_null', 'output_file': r['output_file']})
            out.append(rec)
            continue
        rgb, size, note = load_rgb(f)
        sc, e, dt = score_image(rgb, Gs[c['shot']])
        is_baseline = c['method'] == 'M3b' and (c['shot'], c['model']) in style_pairs
        if has_style(c) or is_baseline:
            rec['style'] = {'role': 'baseline' if is_baseline else 'reference',
                            'reference_file': str(style_file.relative_to(pack)) if style_file else None}
            if reference:
                rec['style'].update(score_style(rgb, Gs[c['shot']], sc, reference))
            else:
                rec['style']['reason'] = 'missing_style_photo'
        cs = selfc[c['shot']]
        sc['S'] = 0.5 * sc['Ks'] / cs['Ks'] + 0.5 * sc['Ko'] / cs['Ko']
        sc['S*'] = 0.5 * sc['Ks*'] / cs['Ks*'] + 0.5 * sc['Ko*'] / cs['Ko*']
        tag = f"{cid}-a{r.get('attempt')}"
        rgb.save(pack / '_check' / f'{tag}-result.png'); overlay(rgb, Gs[c['shot']], dt).save(pack / '_check' / f'{tag}-overlay.png')
        rec.update({'scored': True, 'size': size, 'note': note, 'auto_pass': sc['S'] >= 0.6, **{k: v for k, v in sc.items()}})
        out.append(rec)
    res = {'rule': '见 research/生图跑位/实验.md §3；S = ½·Ks/Ks(白模) + ½·Ko/Ko(白模)，自动过关线 S ≥ 0.6；跑位率以目视为准',
           'style_palette': reference,
           'style_rule': 'Lab D65 k=3 dominant wall/floor; nearest reference palette color CIEDE2000; mean of wall/floor; lower is closer',
           'self_calibration': {k: {x: selfc[k][x] for x in ['Ks', 'Ko', 'Ks*', 'Ko*']} for k in shots}, 'input_check': check, 'rows': out}
    (pack / 'scores.json').write_text(json.dumps(res, ensure_ascii=False, indent=1, default=float))
    # 每个机位一张低分辨率拼图：首行输入；之后每格一行（样本 1：结果 | 叠图，样本 2：结果 | 叠图），同格重试取最后一次
    cw, ch = 320, 180
    header = 34
    style_rows = int(display_style is not None)
    for shot in shots:
        keys = []
        for c in cells.values():
            if c['shot'] == shot and (c['method'], c['model']) not in keys: keys.append((c['method'], c['model']))
        S = Image.new('RGB', (cw * 4, (ch + header) * (len(keys) + 1 + style_rows)), 'white'); d = ImageDraw.Draw(S)
        if display_style:
            from PIL import ImageOps
            with Image.open(display_style) as im:
                thumb = ImageOps.contain(im.convert('RGB'), (cw * 2, ch))
            S.paste(thumb, (0, header))
            d.text((4, 2), 'STYLE PHOTO (whole image; no geometry score)', fill='black')
        input_y = style_rows * (ch + header)
        for ci, n in enumerate(['clay.png', 'depth.png', 'lines.png', 'seg.png']):
            S.paste(Image.open(R / f'inputs/{shot}/furnished/{n}').convert('RGB').resize((cw, ch)), (ci * cw, input_y + header))
        d.text((4, input_y + 2), f'{shot} INPUT: clay | depth | lines | seg', fill='black')
        for ri, (m, md) in enumerate(keys, 1):
            y = (ri + style_rows) * (ch + header)
            for si, cid in enumerate([c['id'] for c in cells.values() if c['shot'] == shot and c['method'] == m and c['model'] == md][:2]):
                x = si * 2 * cw
                got = [o for o in out if o['cell_id'] == cid and o.get('scored')]
                if not got: d.text((x + 4, y + 2), f'{cid}: no result', fill='red'); continue
                o = got[-1]; tag = f"{cid}-a{o['attempt']}"
                S.paste(Image.open(pack / '_check' / f'{tag}-result.png').resize((cw, ch)), (x, y + header))
                S.paste(Image.open(pack / '_check' / f'{tag}-overlay.png').resize((cw, ch)), (x + cw, y + header))
                d.text((x + 4, y + 2), f"{cid} [{o.get('model_id') or '?'}] S={o['S']:.2f} Ks={o['Ks']:.2f} Ko={o['Ko']:.2f} S*={o['S*']:.2f}", fill='black')
                st = o.get('style')
                if st:
                    def fmt(v): return f'{v:.2f}' if v is not None else 'N/A'
                    label = 'dE2000 ' + st['role']
                    label += ' wall=' + fmt(st.get('wall', {}).get('delta_e2000'))
                    label += ' floor=' + fmt(st.get('floor', {}).get('delta_e2000'))
                    label += ' mean=' + fmt(st.get('mean_delta_e2000'))
                    d.text((x + 4, y + 18), label, fill='black')
        S.save(pack / f'拼图-{shot}.png')
    n_ok = sum(1 for o in out if o.get('scored'))
    print(f'{pack.name}: {len(rows)} 行，打分 {n_ok} 张；输入核对 {check}')
    for o in out:
        if o.get('scored'): print(o['cell_id'], o['attempt'], o.get('model_id'), f"S={o['S']:.2f} Ks={o['Ks']:.2f} Ko={o['Ko']:.2f} S*={o['S*']:.2f} 自动过关={o['auto_pass']}")


if __name__ == '__main__':
    import sys; sys.path.insert(0, str(Path(__file__).parent))
    if len(sys.argv) > 2 and sys.argv[1] == 'pack':
        score_pack(sys.argv[2])
    else:
        main()
