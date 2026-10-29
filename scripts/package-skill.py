#!/usr/bin/env python3
"""Build the upload zip offline, with one top-level skill folder; includes the small assets/example input pair, no app.

Before zipping, the Agent manual chapters are copied into skill/see-your-home/references/.
The manual is maintained in the tool repository (app/docs/agent手册). Pass its folder with
--manual <dir> or FLOORPLAN_AGENT_MANUAL; a sibling ../../app/docs/agent手册 is used when present.
Without a manual source the committed references are zipped as they are.
"""
import argparse
import os
import re
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED, ZipInfo

# Chapters that ship with the Skill (1 格式, 2 读图, 3 改造, 4 工具连接, 5 命令 + 附篇, 6 交付, 8 生图).
# 7 装修 is still a placeholder and does not ship; shipped chapters must not link to it.
MANUAL_FILES = ['格式.md', '读图.md', '改造.md', '工具连接.md', '命令.md', '相机与素材通道.md', '交付.md', '生图.md']
# Older references whose content now lives in the manual; removed so there is only one version.
SUPERSEDED = ['制图惯例.md', '比例.md', '问题卡.md']
HEADER = '<!-- 来源：app/docs/agent手册/{name}，勿手改；改手册后重新打包 -->\n'

root = Path(__file__).resolve().parents[1]
skill = root / 'skill' / 'see-your-home'
assert (skill / 'SKILL.md').is_file()
parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
parser.add_argument('--manual', help='Agent 手册目录（app/docs/agent手册）')
args = parser.parse_args()
candidates = [args.manual, os.environ.get('FLOORPLAN_AGENT_MANUAL'), root.parent.parent / 'app' / 'docs' / 'agent手册']
manual = next((Path(c) for c in candidates if c and (Path(c) / MANUAL_FILES[0]).is_file()), None)
if args.manual and manual != Path(args.manual):
    raise SystemExit(f'找不到手册：{args.manual}')

references = skill / 'references'
if manual:
    for name in MANUAL_FILES:
        text = (manual / name).read_text(encoding='utf-8')
        (references / name).write_text(HEADER.format(name=name) + text, encoding='utf-8')
    for name in SUPERSEDED:
        (references / name).unlink(missing_ok=True)
    print(f'Synced {len(MANUAL_FILES)} manual chapters into skill/see-your-home/references/')
else:
    print('Manual source not found; zipping the committed references as they are')

# Links inside shipped chapters may only point at other shipped chapters or the schema (so never at 装修.md).
allowed = set(MANUAL_FILES) | {'plan.schema.json'}
for name in MANUAL_FILES:
    text = (references / name).read_text(encoding='utf-8')
    if not text.startswith('<!-- 来源：app/docs/agent手册/'):
        raise SystemExit(f'references/{name} 不是从手册同步的')
    for link in re.findall(r'\]\(([^)#]+)(?:#[^)]*)?\)', text):
        if not link.startswith(('http://', 'https://')) and link not in allowed:
            raise SystemExit(f'references/{name} 链接到不随 Skill 发布的文件：{link}')
stale = sorted(p.name for p in references.glob('*.md') if p.name not in MANUAL_FILES)
if stale:
    raise SystemExit('references 里有不属于手册的旧文件：' + '、'.join(stale))

target = root / 'dist' / 'see-your-home-skill.zip'
target.parent.mkdir(exist_ok=True)
with ZipFile(target, 'w', ZIP_DEFLATED, compresslevel=9) as archive:
    for source in sorted(skill.rglob('*')):
        if not source.is_file() or source.name == '.DS_Store' or '__pycache__' in source.parts:
            continue
        info = ZipInfo(source.relative_to(skill.parent).as_posix(), (2026, 1, 1, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, source.read_bytes())
print('Created dist/see-your-home-skill.zip')
