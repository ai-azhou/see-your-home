#!/usr/bin/env bash
set -euo pipefail
# Main regression is offline; optional uv smoke checks may fetch Python 3.14 and dependencies.
# PYTHON can name an existing Python interpreter that already has NumPy and Pillow.
work=''
finish() {
  result=$?
  if [ -n "$work" ] && [ -d "$work" ]; then rm -rf -- "$work"; fi
  if [ "$result" -eq 0 ]; then echo 'PASS: isolated Skill selftest'; else echo "FAIL: selftest (exit $result)" >&2; fi
}
trap finish EXIT
command -v node >/dev/null 2>&1 || { echo 'Missing runtime: Node.js 20+' >&2; exit 1; }
node -e 'if (+process.versions.node.split(".")[0] < 20) { console.error("Missing runtime: Node.js 20+"); process.exit(1) }'
py="${PYTHON:-python3}"
command -v "$py" >/dev/null 2>&1 || { echo 'Missing runtime: Python 3 (set PYTHON)' >&2; exit 1; }
PYTHONDONTWRITEBYTECODE=1 "$py" -c 'import PIL, numpy' >/dev/null 2>&1 || { echo 'Missing runtime: NumPy and Pillow in selected Python; nothing was installed' >&2; exit 1; }
repo="$(cd -- "$(dirname -- "$0")/.." && pwd)"
work="$(mktemp -d "${TMPDIR:-/tmp}/floorplan-selftest.XXXXXX")"
cp -R "$repo/skill/see-your-home" "$work/skill"
if command -v uv >/dev/null 2>&1; then
  export UV_CACHE_DIR="${UV_CACHE_DIR:-$repo/.cache/uv}"
  for script in "$work/skill/scripts/"*.py; do
    uv run --python 3.14 --no-project --with pillow --with numpy python "$script" --help >/dev/null
    echo "Python 3.14 --help: $(basename "$script") PASS"
  done
else
  echo 'SKIP: uv unavailable; Python 3.14 --help smoke checks skipped'
fi
PYTHON="$py" node "$repo/scripts/regression-o5.mjs" "$work/skill"
node "$repo/scripts/regression-o7.mjs" "$work/skill"
PYTHONDONTWRITEBYTECODE=1 "$py" "$repo/scripts/regression-o8.py" "$work/skill"
PYTHONDONTWRITEBYTECODE=1 "$py" "$repo/scripts/regression-rectify.py" "$work/skill"
cp "$repo/examples/two-bed/input.png" "$repo/examples/two-bed/plan.json" "$work/"
cd "$work"
node skill/scripts/plan-cli.mjs validate plan.json > validate.json
echo 'validate: valid'
PYTHONDONTWRITEBYTECODE=1 "$py" skill/scripts/overlay.py input.png plan.json overlay.png > overlay.txt
echo 'overlay: created'
node skill/scripts/plan-cli.mjs stats plan.json > stats.json
echo 'stats: created'
# 问题卡状态（v1.2）：questions 列卡；answer 记用户原话；resolve 写回复；状态不对时拒绝且不写文件
cp plan.json q.json
node skill/scripts/plan-cli.mjs questions q.json --status open > q-open.json
node -e "const q=require('./q-open.json'); if (q.length !== 3 || q.some(x => x.status !== 'open')) throw new Error('questions --status open: ' + q.length)"
before=$(shasum q.json)
if node skill/scripts/plan-cli.mjs resolve q.json q-kitchen --outcome changed --reply x 2> q-err.txt; then echo 'resolve on open card should fail' >&2; exit 1; fi
grep -q '错误：问题卡 q-kitchen' q-err.txt
test "$before" = "$(shasum q.json)"
node skill/scripts/plan-cli.mjs answer q.json q-kitchen --text '只是门洞' --at 2026-10-30 > /dev/null
node skill/scripts/plan-cli.mjs resolve q.json q-kitchen --outcome changed --changed o-k --reply '厨房门改成门洞，不装门。' --at 2026-10-30 > /dev/null
node skill/scripts/plan-cli.mjs validate q.json > /dev/null
node -e "const p=require('./q.json'), q=p.questions.find(x => x.id === 'q-kitchen'); if (q.status !== 'resolved' || q.reply.outcome !== 'changed' || q.reply.changed[0] !== 'o-k' || q.answer !== '只是门洞') throw new Error(JSON.stringify(q))"
node skill/scripts/plan-cli.mjs stats q.json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const q=JSON.parse(s).questions; if (q.open !== 2 || q.resolved !== 2 || q.answered !== 0) throw new Error(JSON.stringify(q))})"
echo 'questions / answer / resolve: PASS'
node skill/scripts/plan-cli.mjs cameras plan.json --json > cameras.json
echo 'cameras: created'
node skill/scripts/plan-cli.mjs export plan.json model.glb
node skill/scripts/check-glb.mjs model.glb > glb-validation.json
node skill/scripts/plan-cli.mjs export plan.json renovated.glb --state renovated
node skill/scripts/check-glb.mjs renovated.glb > glb-validation-renovated.json
node skill/scripts/plan-cli.mjs render plan.json images --size 480x320
node skill/scripts/plan-cli.mjs render plan.json images --size 480x320 --transparent
node skill/scripts/plan-cli.mjs render plan.json kit --camera room:r-living --size 160x100 --passes clay,depth,lines,seg,openings
node skill/scripts/plan-cli.mjs render plan.json replay --camera kit/room_r-living-white.camera.json
PYTHONDONTWRITEBYTECODE=1 "$py" - <<'PY'
from pathlib import Path
from PIL import Image
import json
assert json.loads(Path('validate.json').read_text())['valid']
assert json.loads(Path('stats.json').read_text())['walls'] > 0
report=json.loads(Path('glb-validation.json').read_text())
assert report['issues']['numErrors']==0, report['issues']
print('glTF validator: 0 errors')
with Image.open('overlay.png') as im:
    im.verify()
for view in ('iso-sw','iso-ne','top'):
    for bg in ('white','transparent'):
        p=Path('images')/f'{view}-{bg}.png'
        with Image.open(p) as im:
            im.load(); assert im.size==(480,320), (p,im.size)
            assert im.mode=='RGBA'
            lo,hi=im.getchannel('A').getextrema()
            assert hi==255 and lo==(0 if bg=='transparent' else 255)
print('PNG: 6 files, 480x320, decoded and alpha checked')
assert Path('model.glb').stat().st_size>20
assert json.loads(Path('plan.json').read_text())['version']==3
assert json.loads(Path('glb-validation-renovated.json').read_text())['issues']['numErrors']==0
assert Path('model.glb').read_bytes()!=Path('renovated.glb').read_bytes()
choices=json.loads(Path('cameras.json').read_text())
assert {'iso-sw','iso-ne','iso-se','iso-nw','top','room:r-living'} <= {c['id'] for c in choices}
camera=json.loads(Path('kit/room_r-living-white.camera.json').read_text())
assert camera['unit']=='mm' and camera['intrinsics']['fx']>0 and camera['openings']
for f in Path('kit').glob('*.png'):
    assert f.read_bytes()==(Path('replay')/f.name).read_bytes(), f.name
    with Image.open(f) as im: im.load(); assert im.size==(160,100)
with Image.open('kit/room_r-living-white.depth16.png') as im:
    assert im.mode in ('I;16','I') and im.getextrema()[1]>1000
for opening in camera['openings']:
    with Image.open(Path('kit')/opening['mask']) as im:
        mask=im.convert('L'); b=mask.getbbox(); assert b
        assert [b[0],b[1],b[2]-1,b[3]-1]==opening['bbox_xyxy']
        assert mask.histogram()[255]==opening['visible_px']
print('v3 / cameras / renovated GLB / 16-bit depth / opening bbox / all-pass replay: PASS')
PY

node skill/scripts/plan-cli.mjs render plan.json generation --camera room:r-living --size 960x540 --passes clay,depth,lines,seg,openings
PYTHONDONTWRITEBYTECODE=1 "$py" "$repo/scripts/regression-g1.py" "$work/skill" "$work/generation"
