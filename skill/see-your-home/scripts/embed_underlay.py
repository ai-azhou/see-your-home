"""把原图以 data URL 写进方案的底图 src，方案文件自带底图、双击打开的工具也能显示。只改本地文件。

用法：python embed_underlay.py 方案.json 原图 [--level 楼层id]

有 levelUnderlays 时：不带 --level 就写进每一层（一张图并排画几层的情况）；带 --level 只写那一层。
没有 levelUnderlays 时写进 underlay。
"""
import argparse
import base64
import json
from plan_io import read_plan, write_plan
import mimetypes
from pathlib import Path

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument('plan'); ap.add_argument('image'); ap.add_argument('--level')
a = ap.parse_args()
plan_path, image_path = Path(a.plan), Path(a.image)
plan = read_plan(plan_path)
mime = mimetypes.guess_type(image_path.name)[0] or 'image/png'
src = f'data:{mime};base64,' + base64.b64encode(image_path.read_bytes()).decode()
per_level = plan.get('levelUnderlays') or {}
if a.level:
    if a.level not in per_level:
        raise SystemExit(f'levelUnderlays 里没有楼层 {a.level}，先写好这一层的比例和原点')
    targets = [a.level]
elif per_level:
    targets = list(per_level)
else:
    targets = []
for lv in targets:
    per_level[lv]['src'] = src
if not targets:
    u = plan.setdefault('underlay', {'mmPerPx': 1, 'origin': [0, 0], 'opacity': 50, 'visible': True})
    u['src'] = src
write_plan(plan_path, plan)
where = '、'.join(targets) if targets else 'underlay'
print(f'已嵌入底图：{image_path.name}（{image_path.stat().st_size // 1024} KB）→ {where}')
