# 生图跑位实验：公开证据

实验比较：同一白模机位，改变提示词、参考图组合或模型后，墙角、梁、门窗是否保持位置。输入是自行渲染的客厅、主卧白模；照片效果不代表施工结果。首轮、LibTV 执行包 1、执行包 2 合并记录在 [records.jsonl](records.jsonl) 和 [records.csv](records.csv)。

每种“机位 × 办法 × 模型”通常只有 **2 张**，只能看方向，不能据此给出稳定成功率。S0 是单张风格参考例外。87 条记录：首轮 36 条（26 张、10 条限流未出图）、LibTV 包 1 共 26 条（18 张、8 条能力不支持而跳过）、包 2 共 25 张。共有 69 张生成图，其中 68 张可计算结构分，另 1 张为 AI 生成风格照片；不包含未交付的连通性试跑。

所有产图均为 **AI 生成，平台：Lovart / LibTV，模型见 records**；另有本地 SD1.5 + ControlNet 的 4 张对照。`E-`、`T1-`、`T2-` 分别标识首轮、LibTV 包 1、包 2，避免同名格子覆盖。模型记录保持实验当时的名称和证据强度：

| 平台 | 模型与核对依据 |
| --- | --- |
| Lovart | Nano Banana Pro、Seedream 4.5、Qwen Image 3；实际工具名没有返回，只能通过失败记录、Agent 自述和文件指纹交叉核对，不能视为供应商认证 |
| LibTV | `nebula-ultra`（General image Pro）、`seedream-4.5`、`qwen-edit`、`lib-image-2.5-s`（Lib Image 2.5 Pro）；执行记录回读节点参数。底层别名映射沿用原实验说明，未独立验证 |
| 本地 | SD1.5 + ControlNet v1.1 lineart / depth，MPS 运行 |

`outputs/` 有 69 张产图，`overlays/` 有 68 张叠图，`sheets/` 有 6 张拼图。全部长边 1024，JPEG quality 85，去除原图元数据；文件名含格子编号，拼图按来源与机位编号。原图 SHA256 和公开副本 SHA256 在 records；叠图、拼图原图 SHA256 在 [artifacts.json](artifacts.json)。**记录分数基于原图，不是压缩后的公开 JPEG**。拼图缩小后文字较小，应结合 CSV 阅读。

`inputs/` 保留自行渲染的白模、深度、线稿、分割、洞口遮罩、相机及材料卡。`lines.png` 是给模型看的加粗线稿；`lines-truth.png` 是原渲染的 1 px 真值，与研究评分的 `.npy` 逐像素一致，公开包不需要 `.npy`。风格照片不是实拍用户住宅，是 T2 的 S0 生成图；公开输入引用其 JPEG，原图校验值记录在 S0 行。

`prompts/` 包含每条记录的实际全文以及 P0–P7 模板、slots。历史提示词保留当时的模型约束，用于查证；安装 Skill 的两份通用模板不含模型名。未生成记录保留原计划提示词，不计入评分。LibTV 逐格目视备注是 G1 查看原始拼图的补充判读，细小分格未判；不把自动分当作目视结论。T1 主卧 M3 Seedream 第 1 张线位接近但窗呈柜门状，标为需复核，不据此夸大“结构完全守住”。

## 离线复现打分

研究版 [score.py](tools/score.py) 与 [style_score.py](tools/style_score.py) 原样存档；其运行依赖是 NumPy、Pillow、SciPy，配色研究脚本另需 scikit-image。它们是证据审查用代码，不进入 Skill zip。安装版 `gen_score.py` 只需要 NumPy 和 Pillow。

在本目录、已有相应依赖的 Python 环境下运行：

```sh
PYTHONDONTWRITEBYTECODE=1 python3 tools/replay.py --output replay-scores.json
```

此命令只读公开 JPEG 和 PNG 真值，用研究版核心重新计算 S / S*，不调用生成服务。JPEG 压缩和缩小会改变边缘，结果不应与 records 作严格一致性断言。如持有原图，可把它们按记录 id 命名并通过 `--originals ORIGINAL_DIR` 提供，程序先核对原图 SHA256 再打分。未提供原图时不能从 SHA256 恢复原图。

研究口径：统一 960×540，非 16:9 先居中裁切；Canny、4px 容差、12px 随机命中带；S = 结构及洞口 K 相对白模标定的等权平均。S 可小于 0 或大于 1；S* 使用缩放和平移配准，不能用来替代原始取景是否跑位的判断。详情见研究脚本及 [结论](结论.md)。新旧版本以原始 68 张逐图核对，S / S* 最大绝对偏差均为 0，见 [一致性结果](score-parity.json)。

模型生成过程无法保证逐像素重现：平台无 seed 或只提供有限参数，平台/模型也可能变化。本包提供提示词、输入、模型、原图散列和观察结果，不附凭证、项目/线程信息、画布链接或任何自动生成调用。
