<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/logo/see-lockup-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="assets/logo/see-lockup-light.svg">
  <img src="assets/logo/see-lockup-light.svg" alt="看见你的家 · see-your-home" width="360">
</picture>

# see-your-home · 看见你的家

给 AI 一张户型图，它帮你读出家的结构，交回一个能转着看的白模和几张白模图；还可以试拆墙、看装好大概什么感觉。用来自己确认想法、和设计师沟通，不是施工图。

**三种用法，选一种开始：**

- **有 Agent**（Claude Code、Codex 这类能在你电脑上跑程序的 AI）：装这个 Skill。它读图、自己校验、出 3D 白模和白模图，还能试改造、出效果示意图。照下面「[Agent 版：从零走一遍](#agent-版从零走一遍)」做。
- **只有网页 Chat**（网页版或手机 App）：不用装东西。用 `chat/` 里的提示词让 Chat 读图，再把方案粘进「改改你的家」核对、看 3D。Chat 能联网时发一句话就能启动，不能联网就整段粘贴或当附件上传。照「[网页 Chat 使用说明](chat/guide.md)」做。
- **想直接手动画**：用 [try-your-home · 改改你的家](https://github.com/ai-azhou/try-your-home)，一个双击就能打开的离线网页，导入户型图当底图自己描墙、试改造、出改造清单 PDF（[用法](https://github.com/ai-azhou/try-your-home/blob/main/docs/USAGE.md)）。

源码公开，非商业免费使用。[English](README.en.md)

## 全流程

| 步骤 | 在哪做 | Agent 版 | 网页 Chat 版 |
| --- | --- | --- | --- |
| 1 读图 | Agent / Chat | 说一句话，Agent 定比例、读结构，写成 `方案.json` | 一句话启动或粘贴[读图提示词](chat/read-prompt.md)，Chat 给出一大段方案代码 |
| 2 核对 | Agent；工具 | Agent 自己校验、出叠图，问你 3–5 个图上读不出来的问题 | 在「改改你的家」点「粘贴方案」看叠图、校验；对不上点「复制问题给 Chat」贴回去 |
| 3 3D | Agent；工具 | Agent 出 `白模.glb`、斜视俯视和房间平视的白模图 | 在工具里切到 3D 转着看 |
| 4 改造 | Agent；工具 | 说「把这面墙拆掉看看」；或在工具里改完交回给 Agent | 在工具里选中墙或门窗点「交给 Agent」，把复制的文字贴给 Chat |
| 5 看感觉 | 生图服务 | Agent 出素材、写提示词、自动打分，不过就换输入重出（第 9 步） | 工具「导出图片」导出白模图，配[生图提示词](chat/image-prompt.md)发给能生成图片的 Chat |
| 6 导出清单 | 工具 | 用工具打开 `交付/方案.json`，「导出」→「改造清单 PDF」 | 同左 |

两条路的每一次回复都会先讲路线（第一次），末尾给「下一步你可以」，照着选就能往下走。

## 网页 Chat 版：两种启动方式

先新开一个对话，上传户型图，然后二选一：

- **Chat 能联网读网页**：同一条消息里发这一句：

  ```text
  请先读取 https://raw.githubusercontent.com/ai-azhou/see-your-home/main/chat/read-prompt.md ，按里面的说明处理我上传的户型图；打不开就读 https://raw.giteeusercontent.com/gevoll/see-your-home/raw/main/chat/read-prompt.md
  ```

- **Chat 不能联网**：打开[读图提示词](chat/read-prompt.md)，点「Copy raw file」整段复制粘进对话框；粘不下（约 2 万字，有的 Chat 单条消息有长度上限）就点「Download raw file」把它当附件上传，再发一句「按附件里的说明处理这张户型图」。

网页 Chat 没有沙盒，跑不了程序，所以校验、叠图和 3D 都靠「改改你的家」。三份文件：

| 文件 | 给谁 | 用途 |
| --- | --- | --- |
| [网页 Chat 使用说明](chat/guide.md)（`chat/guide.md`） | 你 | 从读图到改造、生图、导出清单，一步步怎么做 |
| [读图提示词](chat/read-prompt.md)（`chat/read-prompt.md`） | Chat | 读图规矩和方案格式，第 1 步用 |
| [生图提示词](chat/image-prompt.md)（`chat/image-prompt.md`） | 生图的 Chat | 两个模板，想看装好的感觉时用 |

| 你给的户型图 | Agent 读出的结构，叠回原图核对 |
| --- | --- |
| ![虚构户型图](examples/two-bed/input.png) | ![叠图](examples/two-bed/overlay.png) |

| 白模斜视 | 1.2 m 高俯视剖切 |
| --- | --- |
| ![白模斜视](examples/two-bed/iso-sw-white.png) | ![俯视剖切](examples/two-bed/top-white.png) |

| 客厅平视（看电视墙） | 主卧平视（床头墙和飘窗） |
| --- | --- |
| ![客厅平视](examples/two-bed/kit-living/room_r-living-white.png) | ![主卧平视](examples/two-bed/room_r-master-white.png) |

示例是虚构的两室户型，全部产物在 [examples/](examples/README.md)。

## 你会拿到

- **方案 JSON**：墙、门窗、梁、柱、管井、楼梯、层高、房间，复式按楼层分开。每个构件都记着是看到的、推断的还是不知道。
- **叠图**：读出的墙和门窗画回原图上，对不对一眼能看出来。
- **`.glb` 白模**：glTF 2.0 标准的三维文件，支持 glTF 的查看器和建模软件都能打开，比如 Blender 自带 glTF 导入。
- **白模图**：斜视、俯视剖切，以及你想看的房间平视。
- **要你确认的问题**：图上读不出来、又会改动结构的地方，第一轮一般 3–5 个。
- 想试改造（拆墙、开洞）的，另出改造后的模型和图；拆承重墙、外墙之前 Agent 会先问你。
- 想看装好大概什么感觉的，另出效果示意图（v1.1）；想自己拿去生图的，同一个机位还能出深度图、线稿、分割图和每扇门窗的遮罩。
- 每次交付末尾有「下一步你可以」，包括怎么用「改改你的家」自己动手、改完怎么交回。

## Agent 版：从零走一遍

### 1. 准备环境

需要 Node.js 20 以上；叠图要 Python 3（支持并实测 3.12、3.14）和 Pillow；生图后的自动打分另要 NumPy（不出效果图可以不装）。Skill 不会自己装这些：缺什么，Agent 会先告诉你用途，你同意才装。

### 2. 装上 Skill

把仓库下载到本机，再把 `skill/see-your-home/` 整个文件夹复制到 Agent 的 Skill 目录。下面两种位置选一种（Claude Code 示例；Codex 将 `.claude` 换成 `.agents`）。先下载仓库，然后复制。

用户级，给自己的所有项目用：

```sh
git clone https://github.com/ai-azhou/see-your-home.git
mkdir -p ~/.claude/skills
cp -R see-your-home/skill/see-your-home ~/.claude/skills/
```

项目级，只给放户型图的 `我的户型/` 用（在下载仓库的同一目录执行）：

```sh
mkdir -p 我的户型/.claude/skills
cp -R see-your-home/skill/see-your-home 我的户型/.claude/skills/
```

不用 git 的话，在 [GitHub 页面](https://github.com/ai-azhou/see-your-home) 点 Code → Download ZIP，解压后照样复制。GitHub 打不开可以用 Gitee 镜像 https://gitee.com/gevoll/see-your-home 。

| 在哪用 | 只给自己用 | 只给某个项目用 | 依据 |
| --- | --- | --- | --- |
| Claude Code | `~/.claude/skills/see-your-home/` | 项目里的 `.claude/skills/see-your-home/` | [Claude Code Skills 文档](https://code.claude.com/docs/en/skills) |
| Codex | `~/.agents/skills/see-your-home/` | 项目里的 `.agents/skills/see-your-home/` | [OpenAI Build skills 文档](https://learn.chatgpt.com/docs/build-skills) |
| claude.ai | 在 Customize → Skills 上传 zip，并打开代码执行 | — | [Anthropic 上传说明](https://support.claude.com/en/articles/12512198-how-to-create-custom-skills) |

装好以后，**在放户型图的文件夹里新开一个 Agent 会话**（项目级示例先 `cd 我的户型`），Skill 才会被认出来。claude.ai 用的 zip 在仓库根目录运行 `python3 scripts/package-skill.py` 生成，产物是 `dist/see-your-home-skill.zip`，顶层是 `see-your-home/` 文件夹。

**确认装好了**：在新会话问「你有 see-your-home 这个 Skill 吗」，请 Agent 读出它的 SKILL.md 路径；项目级应是当前项目的 `.claude/skills/see-your-home/SKILL.md`（Codex 用 `.agents`）。

**还没实测的**：claude.ai 云端环境能不能跑 Node 20 和 Pillow，我们没有上传试过。其他支持 Skill 的 Agent，请按它自己的文档放目录，也没有实测。

### 3. 说一句话

建一个文件夹，把户型图放进去（比如 `我的户型/户型图.png`），在这个文件夹里新开 Agent 会话（Claude Code 就是在终端 `cd 我的户型`，再运行 `claude`），然后说：

> 用 see-your-home 读户型图.png，核对比例和结构，给我白模和几张白模图，再列出要我确认的问题。

接下来会这样：

1. Agent 先用几句话说这是什么图、打算怎么读，给出**路线图**：它会做哪几步、你随时可以选什么（只要结构、要 3D 图、试拆墙、看装好的感觉、出改造清单）。同时查你电脑上有没有 Node 和 Pillow，缺了先问你。
2. 它读图、校验、出叠图，改到对为止，再出白模和白模图。一次渲染可能要几十秒。
3. 东西都放在 `我的户型/交付/` 里：`交付说明.md` 一屏讲清拿到了什么、怎么打开、要你确认的 3–5 个问题；还有 `方案.json`、`叠图.png`、`白模.glb`、`白模图/`、`房间平视/`。
4. 说明最后是「**下一步你可以**」，照着选。

### 4. 接着说

> 次卧和客厅之间那面是承重墙，层高 2.75 米。（回答问题，Agent 改方案、重出图）

> 我想看主卧飘窗那边。

> 把次卧和客厅之间这面墙拆掉，看看改完的样子。（承重墙、外墙、承重不明的墙，Agent 会先问你一次）

> 给客厅出一张奶油原木风的效果示意图。（也可以发一张你喜欢的室内照片；见下面「效果示意图」）

### 5. 想自己动手

下载「改改你的家」：在 GitHub 打开 [try-your-home.html 的文件页](https://github.com/ai-azhou/try-your-home/blob/main/try-your-home.html)，点「Download raw file」，双击打开，不联网、不用装。把 `交付/方案.json` 拖进去，就能看叠图和 3D、拖墙试改造、试装修，顶栏「导出」出改造清单 PDF。完整用法见 [USAGE.md](https://github.com/ai-azhou/try-your-home/blob/main/docs/USAGE.md)。

- 改完在「导出」里存一份方案文件 JSON，回来跟 Agent 说「我改好了」，告诉它文件在哪，它重新校验、重新出图。
- 在工具里选中墙或门窗，点「交给 Agent」写一句话，把复制的文字贴给 Agent，它照你说的改。
- 你本机有 try-your-home 的仓库、装了 Node，可以让 Agent 开本地服务模式：它改文件，页面自动刷新。

## 效果示意图（v1.1，可选）

想看「装好大概什么感觉」，Agent 会把白模图交给一个能生成图片的模型，换上材质、颜色和光，结构尽量不动：

- 先问你要什么感觉（用自己的话说材料和颜色，或发一张喜欢的室内照片），并说清图会发给生图服务、发不发由你定。Agent 自己没法出图时，它把图片和提示词准备好，你拿去生图，再把结果交回给它检查。
- 先给模型白模、深度、线稿三张图；自动检查发现墙窗跑位，就退到只给白模一张再试；最多重试 2 次，还不过就交给你看。不同模型适合的输入不一样，这个顺序对哪类模型都适用。
- 自动检查看的是墙角线和门窗框线有没有对上；窗被画成柜门、加了窗帘这类，它会再自己看一遍，也请你对着白模图看一眼。
- 出来的是**效果示意，尺寸以平面和立面为准**。照片只取氛围，颜色常被放大，具体颜色以你说的材料为准。
- 只有这一档（普通档）。用遮罩、本地开源模型锁住门窗的「保结构档」还没验证。

这套做法来自三批实验，提示词全文、输入、产图和分数都公开在 [evidence/generation/](evidence/generation/README.md)。每种组合只有两张图，只能看方向。网页 Chat 版用 [生图提示词](chat/image-prompt.md)，没有自动检查。

## 它不是什么

- 不是施工图。能不能拆、哪面是承重墙，以现场和专业人员的结论为准，不以这个结果为准。
- 不画家具、不配材质。白模只表现结构。
- 尺寸来自图上的标注和比例推算。图上没写、又推不出来的，会写进问题里问你，不会编一个数。
- 房间平视是自动挑的机位。很窄的房间（比如卫生间）平视看不全，机位说明里会照实写，配俯视或斜视看。

## 隐私

随附的脚本只读写你电脑上的文件，不联网、不上传、不收集使用数据。

但户型图发给云端 Agent（包括 claude.ai）时，图片本身会交给那个服务处理，这一步不是离线的，用不用由你决定。Skill 不会再把图转给任何其他服务。出效果示意图时，白模图（和你给的风格照片）要发给生图服务，Agent 会先问你；户型原图不发。网页 Chat 版：户型图会发给你用的那个 Chat 服务，见[使用说明的隐私一节](chat/guide.md#隐私)。

## 给开发者

### 命令

下面在 Skill 目录里运行，输入输出可以用绝对路径。Agent 用的写法是在用户工作目录里运行、脚本写全路径，见[命令](skill/see-your-home/references/命令.md)：

```sh
node scripts/plan-cli.mjs validate 方案.json          # 校验，不能有 error
python3 scripts/overlay.py 原图.png 方案.json 叠图.png  # 叠图 + 逐间面积
node scripts/plan-cli.mjs stats 方案.json             # 数量和面积
node scripts/plan-cli.mjs export 方案.json 白模.glb    # GLB，加 --state renovated 出改造后
node scripts/plan-cli.mjs render 方案.json 图          # 西南、东北斜视和俯视剖切，2400×1600
node scripts/plan-cli.mjs cameras 方案.json           # 列出全部机位和中文说明
node scripts/plan-cli.mjs render 方案.json 图 --camera room:r-master:w-n
node scripts/plan-cli.mjs render 方案.json 素材 --camera room:r-living --passes clay,depth,lines,seg,openings
node scripts/plan-cli.mjs schema                      # 在当前目录写出 schema/plan.schema.json
```

`render` 还有 `--level`、`--section`、`--size`、`--transparent`、`--state`；每张图旁边有同名 `.camera.json`，交回给 `--camera` 能逐字节复现。

### 格式

- Skill 的 `references/` 是写给 Agent 的手册：[格式](skill/see-your-home/references/格式.md)、[读图](skill/see-your-home/references/读图.md)、[改造](skill/see-your-home/references/改造.md)、[工具连接](skill/see-your-home/references/工具连接.md)、[命令](skill/see-your-home/references/命令.md)、[相机与素材通道](skill/see-your-home/references/相机与素材通道.md)、[交付](skill/see-your-home/references/交付.md)、[生图](skill/see-your-home/references/生图.md)。这些文件由打包脚本从配套工具的手册同步过来，不在这里手改。
- 方案 JSON 是 v3，长度一律毫米，面积平方米：字段见[格式](skill/see-your-home/references/格式.md)，机器校验用 [plan.schema.json](skill/see-your-home/references/plan.schema.json)。
- 相机、坐标系和素材通道（16 位深度、ADE20K 色板分割、门窗实例遮罩）：[相机与素材通道.md](skill/see-your-home/references/相机与素材通道.md)。
- GLB 用米，Y 轴朝上；按构件类型合并成网格，构件 ID 记在节点名和 primitive 的 extras 里。普通查看器一般按类型整组选中，不能逐面墙单独选。玻璃是半透明材质。
- 改造记录写在 `changes` 里，原始结构不动；改造后的导出只重放 `confirmed`，`pending` 不生效，重放失败直接报错。

### 目录

| 路径 | 内容 |
| --- | --- |
| `skill/see-your-home/` | 要安装的 Skill：SKILL.md、references、scripts（打包好的 CLI、叠图脚本、离线 glTF 校验器） |
| `chat/` | 网页 Chat 版：[读图提示词](chat/read-prompt.md)、[生图提示词](chat/image-prompt.md)、[使用说明](chat/guide.md)；读图提示词由手册浓缩，手册更新时人工同步 |
| `examples/two-bed/` | 主示例：输入、方案、全部产物和 SHA256SUMS |
| `tests/fixtures/` | 旧格式兼容回归用的样例 |
| `scripts/selftest.sh` | 隔离自测：复制 Skill 和示例到临时目录；有 uv 时另跑 Python 3.14 帮助检查，可能下载解释器与依赖；无 uv 时明确跳过 |
| `scripts/package-skill.py` | 生成 claude.ai 用的 zip；有手册源时先把手册同步进 `references/` |
| `VERSION` / `CHANGELOG.md` | v1.1.0 版本号与变更清单 |
| `skill/see-your-home/scripts/gen_prompt.py` | 按相机和门窗自动填生图提示词 |
| `skill/see-your-home/scripts/gen_score.py` | 离线结构、门窗与可选风格色差检查（NumPy + Pillow） |
| `skill/see-your-home/assets/prompts/` | 结构参考、风格照片两份通用模板 |
| `scripts/regression-g1.py` | 提示词、结构漂移、色差离线回归 |
| `evidence/generation/` | 三批实验的记录、全文提示词、输入、AI 产图、散列与研究打分脚本 |

自测：`bash scripts/selftest.sh`，可以用 `PYTHON=/path/to/python` 指定装了 Pillow 和 NumPy 的解释器；uv 缓存可用 `UV_CACHE_DIR` 指定（默认仓库 `.cache/uv`）。

### 已知局限

- 渲染是纯 Node 的软件光栅化：近似环境光遮蔽和软阴影，没有光线追踪、反射和折射；玻璃只透一层。
- 多层户型的斜视按实际标高叠放，上层会挡住下层；看单层用 `--level`。
- 方向名按图纸坐标，不按 `north` 旋转。
- 房间平视的自动选位是打分挑出来的，不保证每间都好看；拍不好的会在说明里写明。

配套的户型工具「改改你的家」：https://github.com/ai-azhou/try-your-home 。

## 许可

- 源码公开，非商业免费使用。自有代码按 [PolyForm Noncommercial 1.0.0](LICENSE)；文档、示例和图片按 [CC BY-NC-SA 4.0](LICENSE-docs.md)。
- 作者：你的AI阿舟。按 PolyForm Noncommercial 1.0.0 的 Notices 条款，分发本软件的任何部分时须同时附上下面这行（原文也在 [NOTICE](NOTICE) 文件里，Skill 文件夹里有同样一份）：

  ```text
  Required Notice: Copyright 你的AI阿舟
  ```

- 商用需要另行书面授权，见 [COMMERCIAL.md](COMMERCIAL.md)。联系方式：邮箱 azhou.ai@proton.me；微信（中国大陆）ai_azhou；小红书 @你的AI阿舟（小红书号 azhou_ai）；抖音 @你的AI阿舟（抖音号 azhou.ai）。
- 欢迎提 issue，暂不接受外部代码贡献，见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 第三方声明

打包进 CLI 的第三方包、版本、许可和版权写在 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)，许可全文照录。随附的 Khronos glTF 校验器保留自己的 LICENSE 和 NOTICES。Pillow 运行时需要，不随附。第三方组件仍受各自原许可约束。
