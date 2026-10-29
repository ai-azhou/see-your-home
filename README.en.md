# see-your-home

Give your Agent a floor-plan drawing and it reads the structure of the home, then hands back a white model you can orbit and a few white-model images. Use it to check your own ideas and talk with a designer. It is not a construction drawing.

Source available, free for noncommercial use. [中文](README.md)

| Your drawing | Structure read by the Agent, overlaid for checking |
| --- | --- |
| ![Fictional drawing](examples/two-bed/input.png) | ![Overlay](examples/two-bed/overlay.png) |

| Oblique white model | Living room at eye level |
| --- | --- |
| ![Oblique](examples/two-bed/iso-sw-white.png) | ![Living room](examples/two-bed/kit-living/room_r-living-white.png) |

The example is a fictional two-bedroom flat; all outputs are in [examples/](examples/README.md).

## What you get

- A plan JSON (walls, doors, windows, beams, columns, shafts, stairs, ceiling heights, rooms, levels), each element marked as seen, inferred or unknown.
- An overlay of that structure on your drawing.
- A `.glb` white model (glTF 2.0). Any viewer or 3D application that supports glTF can open it; Blender, for example, ships a glTF importer.
- White-model images: obliques, a 1.2 m top cut, and eye-level views of the rooms you ask for.
- 3–5 questions about things the drawing cannot settle but that change the structure.
- Optionally: renovation previews (the Agent asks before touching load-bearing or exterior walls), and depth, line, segmentation and per-opening mask images for your own image generation.

## Install

Needs Node.js 20+, plus Python 3 with Pillow for overlays. Nothing is installed automatically.

Get the repository with `git clone https://github.com/ai-azhou/see-your-home.git` (or Code → Download ZIP on [GitHub](https://github.com/ai-azhou/see-your-home)), then copy `skill/see-your-home/` to `~/.claude/skills/` (Claude Code, [docs](https://code.claude.com/docs/en/skills)) or `~/.agents/skills/` (Codex, [docs](https://learn.chatgpt.com/docs/build-skills)); project-level folders are `.claude/skills/` and `.agents/skills/`. For claude.ai, run `python3 scripts/package-skill.py` and upload `dist/see-your-home-skill.zip` under Customize → Skills with code execution on ([guide](https://support.claude.com/en/articles/12512198-how-to-create-custom-skills)).

Not tested yet: whether the claude.ai cloud environment can run Node 20 and Pillow, and other Agents' skill folders.

## Use

> Use see-your-home to read this floor plan, check its scale and structure, give me the white model and images, and list what I need to confirm.

Then, for example: “Show me the bay window in the master bedroom”, or “Give me depth and line images of the living room for image generation.”

## What it is not

Not a construction drawing. Load-bearing, demolition and construction decisions rest with on-site checks and qualified professionals. No furniture or materials. Narrow rooms such as bathrooms do not make good eye-level views; the camera note says so.

## Privacy

The bundled scripts only read and write local files: no network, uploads or telemetry. Sending a drawing to a cloud Agent (including claude.ai) hands it to that provider; the Skill does not forward it anywhere else.

## Developers

Commands, the v3 plan format (millimetres), cameras and render passes are documented in [README.md](README.md#给开发者) and in `skill/see-your-home/references/`, the Agent manual (Chinese), which is synced from the companion tool by `scripts/package-skill.py`. Run `bash scripts/selftest.sh` for an isolated offline check. The tool viewer will be released separately later.

## License

Code: [PolyForm Noncommercial 1.0.0](LICENSE). Docs, examples and images: [CC BY-NC-SA 4.0](LICENSE-docs.md). Third-party notices: [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

Author: 你的AI阿舟. Under the Notices section of PolyForm Noncommercial 1.0.0, anyone who distributes any part of this software must include this line (also in [NOTICE](NOTICE), with a copy inside the Skill folder):

```text
Required Notice: Copyright 你的AI阿舟
```

Commercial use needs a separate written license: see [COMMERCIAL.md](COMMERCIAL.md). Contact: email azhou.ai@proton.me; WeChat (mainland China) ai_azhou; Xiaohongshu @你的AI阿舟 (ID azhou_ai); Douyin @你的AI阿舟 (ID azhou.ai).

Issues are welcome; external code contributions are not accepted for now. See [CONTRIBUTING.md](CONTRIBUTING.md).
