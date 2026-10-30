# 虚构两室：主示例与产物

主示例为 [two-bed/](two-bed/)，从虚构的工具导出方案制作。文件 v3、全部长度 mm；装修层已去除，5 条改造和 4 张问题卡保留。底图为原始 1200×1120 PNG，mmPerPx=10、origin=[120,120]，右下角保留「虚构户型 · 仅供演示」。

4 条 confirmed 改造参与改造后导出；c5 的承重墙开洞提议保持 pending，`apply.json` 中 needsConfirm=true 是预期结果，未替用户确认。所有渲染为 2400×1600，素材通道与客餐厅白模共用相机。

| 文件 | 内容 |
| --- | --- |
| [input.png](two-bed/input.png) / [plan.json](two-bed/plan.json) | 虚构底图、v3 结构方案 |
| [validate.json](two-bed/validate.json) / [stats.json](two-bed/stats.json) | 校验与面积、数量统计 |
| [overlay.png](two-bed/overlay.png) / [overlay.txt](two-bed/overlay.txt) | 原图加外侧图例栏的叠图及面积文字 |
| [apply.json](two-bed/apply.json) | 改造逐条检查，c5 待确认 |
| [model-original.glb](two-bed/model-original.glb) / [model-renovated.glb](two-bed/model-renovated.glb) | 原始、已确认改造白模 |
| [glb-validation-original.json](two-bed/glb-validation-original.json) / [glb-validation-renovated.json](two-bed/glb-validation-renovated.json) | 两份 Khronos 校验 |
| [cameras.json](two-bed/cameras.json) | 五个预设、房间机位及朝墙变体 |
| [iso-sw-white.png](two-bed/iso-sw-white.png) / [iso-ne-white.png](two-bed/iso-ne-white.png) | 原始西南、东北斜视 |
| [top-white.png](two-bed/top-white.png) | 1200 mm 俯视剖切 |
| [renovated/iso-sw-white.png](two-bed/renovated/iso-sw-white.png) | 改造后西南斜视 |
| [room_r-master-white.png](two-bed/room_r-master-white.png) | 主卧平视 |
| [kit-living/room_r-living-white.png](two-bed/kit-living/room_r-living-white.png) | 客餐厅平视白模 |
| [客餐厅相机](two-bed/kit-living/room_r-living-white.camera.json) | 内外参、全部实例和可见门窗 bbox |
| [逆深度](two-bed/kit-living/room_r-living-white.depth-inv.png) / [16 位毫米深度](two-bed/kit-living/room_r-living-white.depth16.png) | 生图参考与精确深度 |
| [线稿](two-bed/kit-living/room_r-living-white.lines.png) / [反色线稿](two-bed/kit-living/room_r-living-white.lines-inv.png) | 合并共面接缝的轮廓 |
| [ADE20K 分割](two-bed/kit-living/room_r-living-white.seg-ade20k.png) / [实例编号](two-bed/kit-living/room_r-living-white.openings.png) | 语义与实例通道 |
| `kit-living/room_r-living-white.opening-001.png` 至 `012.png` | 每扇门窗遮罩；画面外或被挡住的全黑 |
| 每张白模同名 `.camera.json` | 可直接交给 render --camera 复现 |
| [SHA256SUMS](two-bed/SHA256SUMS) | 所有输入及产物哈希 |

在 two-bed/ 内运行（Node 20+、Python 3 + Pillow）：

```sh
node ../../skill/see-your-home/scripts/plan-cli.mjs validate plan.json > validate.json
python3 ../../skill/see-your-home/scripts/overlay.py input.png plan.json overlay.png --labels "次卧=10.5,卫生间=4.2,主卧=12.3,厨房=4.8,客餐厅=29.0,阳台=5.0" > overlay.txt
node ../../skill/see-your-home/scripts/plan-cli.mjs stats plan.json > stats.json
node ../../skill/see-your-home/scripts/plan-cli.mjs cameras plan.json --all --json > cameras.json
# c5 是 pending 承重开洞，apply 预期 exit 1；其他退出码仍失败。
node ../../skill/see-your-home/scripts/plan-cli.mjs apply plan.json > apply.json || test "$?" -eq 1
node ../../skill/see-your-home/scripts/plan-cli.mjs export plan.json model-original.glb
node ../../skill/see-your-home/scripts/plan-cli.mjs export plan.json model-renovated.glb --state renovated
node ../../skill/see-your-home/scripts/check-glb.mjs model-original.glb > glb-validation-original.json
node ../../skill/see-your-home/scripts/check-glb.mjs model-renovated.glb > glb-validation-renovated.json
node ../../skill/see-your-home/scripts/plan-cli.mjs render plan.json . --views iso-sw,iso-ne,top
node ../../skill/see-your-home/scripts/plan-cli.mjs render plan.json renovated --camera iso-sw --state renovated
node ../../skill/see-your-home/scripts/plan-cli.mjs render plan.json . --camera room:r-master
node ../../skill/see-your-home/scripts/plan-cli.mjs render plan.json kit-living --camera room:r-living --passes clay,depth,lines,seg,openings
python3 - <<'PYHASH'
from pathlib import Path
import hashlib
files = sorted(p for p in Path('.').rglob('*') if p.is_file() and p.name != 'SHA256SUMS')
Path('SHA256SUMS').write_text(''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.as_posix()}\n' for p in files))
PYHASH
```

原来的简单 v2 示例移到 [tests/fixtures/simple-two-bed](../tests/fixtures/simple-two-bed/)，用于旧格式兼容回归，不是主示例。白模使用本地 GLB 查看器打开；图片用于理解结构，不是施工依据。
