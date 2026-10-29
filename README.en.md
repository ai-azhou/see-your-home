<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/logo/see-lockup-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="assets/logo/see-lockup-light.svg">
  <img src="assets/logo/see-lockup-light.svg" alt="see-your-home · 看见你的家" width="360">
</picture>

# see-your-home

Give your Agent a floor-plan drawing and it reads the structure of the home, then hands back a white model you can orbit and a few white-model images. Use it to check your own ideas and talk with a designer. It is not a construction drawing.

**Three ways to start:**

- **You have an Agent** that runs code on your machine (Claude Code, Codex): install this Skill. It reads the drawing, validates its own work, renders a white model and images, tries renovations and can make mood images. See *Install* and *Use* below.
- **You only have a web chat** (browser or mobile app): no install. Use the prompts in [`chat/`](chat/guide.md) (Chinese): the chat reads the drawing into a plan, and you check it and view 3D in the offline tool try-your-home. With browsing, one sentence starts it: “Please first read https://raw.githubusercontent.com/ai-azhou/see-your-home/main/chat/read-prompt.md and follow it for my uploaded floor plan; if it fails, read https://raw.giteeusercontent.com/gevoll/see-your-home/main/chat/read-prompt.md ”. Without browsing, paste the prompt or attach it as a file.
- **You want to draw by hand**: use [try-your-home](https://github.com/ai-azhou/try-your-home), a double-click offline web page ([guide](https://github.com/ai-azhou/try-your-home/blob/main/docs/USAGE.md)).

Flow: read → check (overlay, 3–5 questions) → 3D → renovate → mood image → renovation PDF (exported from try-your-home). Each reply starts with a route map (first time) and ends with “what you can do next”.

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

Needs Node.js 20+, plus Python 3 (supported and tested: 3.12 and 3.14) with Pillow for overlays (and NumPy for scoring mood images). Nothing is installed automatically.

Get the repository with `git clone https://github.com/ai-azhou/see-your-home.git` (or Code → Download ZIP on [GitHub](https://github.com/ai-azhou/see-your-home)), then copy `skill/see-your-home/` to `~/.claude/skills/` (Claude Code, [docs](https://code.claude.com/docs/en/skills)) or `~/.agents/skills/` (Codex, [docs](https://learn.chatgpt.com/docs/build-skills)); project-level folders are `.claude/skills/` and `.agents/skills/`. For claude.ai, run `python3 scripts/package-skill.py` and upload `dist/see-your-home-skill.zip` under Customize → Skills with code execution on ([guide](https://support.claude.com/en/articles/12512198-how-to-create-custom-skills)).

Choose one copy target (Claude Code below; replace `.claude` with `.agents` for Codex). Run from the folder containing the downloaded repository.

User-level, for all your projects:

```sh
mkdir -p ~/.claude/skills
cp -R see-your-home/skill/see-your-home ~/.claude/skills/
```

Project-level, for the folder holding your drawing:

```sh
mkdir -p home-project/.claude/skills
cp -R see-your-home/skill/see-your-home home-project/.claude/skills/
```

After installing, start a new Agent session **in the folder holding the drawing** (`cd home-project` for the project example). Ask “Do you have the see-your-home Skill?” and have the Agent read its SKILL.md path to verify the installation.

Not tested yet: whether the claude.ai cloud environment can run Node 20 and Pillow, and other Agents' skill folders.

## Use

> Use see-your-home to read this floor plan, check its scale and structure, give me the white model and images, and list what I need to confirm.

Start a new Agent session in a folder that holds the drawing after installing. Then, for example: “Show me the bay window in the master bedroom”, “Remove this wall and show me the result”, or “Make a mood image of the living room in light oak and cream”.

To edit by hand, download `try-your-home.html` (“Download raw file” on its [GitHub file page](https://github.com/ai-azhou/try-your-home/blob/main/try-your-home.html)), open `交付/方案.json` in it, export the plan JSON when done and tell the Agent “I'm done” with the file location. “Hand to Agent / 交给 Agent” text from the tool can be pasted straight back to the Agent.

## Mood images (v1.1, optional)

The Agent hands the white-model render to an image model of your choice, after telling you that the images go to that service. Recipe: white model + depth + line drawing first; if the automatic structure check fails, white model only; at most two retries, then a human looks. It is an impression only; dimensions follow the plan and elevations. A style photo sets the mood only; colours tend to be exaggerated. Only this standard tier ships; masked or local open-model “structure-locked” generation is not validated. Experiment records: [evidence/generation/](evidence/generation/README.md).

## What it is not

Not a construction drawing. Load-bearing, demolition and construction decisions rest with on-site checks and qualified professionals. No furniture or materials. Narrow rooms such as bathrooms do not make good eye-level views; the camera note says so.

## Privacy

The bundled scripts only read and write local files: no network, uploads or telemetry. Sending a drawing to a cloud Agent (including claude.ai) hands it to that provider; the Skill does not forward it anywhere else.

## Developers

Commands, the v3 plan format (millimetres), cameras and render passes are documented in [README.md](README.md#给开发者) and in `skill/see-your-home/references/`, the Agent manual (Chinese), which is synced from the companion tool by `scripts/package-skill.py`. Run `bash scripts/selftest.sh` for an isolated check (uv, when available, also runs Python 3.14 help checks and may fetch its runtime and dependencies). The companion tool is [try-your-home](https://github.com/ai-azhou/try-your-home).

## License

Code: [PolyForm Noncommercial 1.0.0](LICENSE). Docs, examples and images: [CC BY-NC-SA 4.0](LICENSE-docs.md). Third-party notices: [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

Author: 你的AI阿舟. Under the Notices section of PolyForm Noncommercial 1.0.0, anyone who distributes any part of this software must include this line (also in [NOTICE](NOTICE), with a copy inside the Skill folder):

```text
Required Notice: Copyright 你的AI阿舟
```

Commercial use needs a separate written license: see [COMMERCIAL.md](COMMERCIAL.md). Contact: email azhou.ai@proton.me; WeChat (mainland China) ai_azhou; Xiaohongshu @你的AI阿舟 (ID azhou_ai); Douyin @你的AI阿舟 (ID azhou.ai).

Issues are welcome; external code contributions are not accepted for now. See [CONTRIBUTING.md](CONTRIBUTING.md).
