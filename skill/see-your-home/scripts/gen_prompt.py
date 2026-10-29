#!/usr/bin/env python3
"""Offline prompt filling from a render --passes camera JSON (standard library only)."""
import argparse
import json
import math
from pathlib import Path


def fill(camera, style, template='结构参考', floor_y_mm=0, white_only=False):
    if camera.get('projection', 'perspective') != 'perspective':
        raise ValueError('生图提示词需要室内透视机位，不支持正交俯视')
    w, h = camera['width'], camera['height']
    pos, target = camera['pos'], camera['target']
    scale = 1000 if camera.get('unit') == 'mm' else 1
    eye = (pos[1] - floor_y_mm * scale / 1000) / scale
    hfov = math.degrees(2 * math.atan(w / (2 * camera['intrinsics']['fx'])))
    vfov = math.degrees(2 * math.atan(h / (2 * camera['intrinsics']['fy'])))
    dx, dz = target[0] - pos[0], target[2] - pos[2]
    direction = ('东' if dx > 0 else '西') if abs(dx) > abs(dz) else ('南' if dz > 0 else '北')
    room = camera.get('description') or camera.get('name') or camera.get('room') or camera.get('id', '未命名房间')
    pitch = math.degrees(math.atan2(target[1] - pos[1], math.hypot(dx, dz)))
    cam = (f'人眼高度约 {eye:.2f} m（相对楼面标高 {floor_y_mm:g} mm），水平视角约 {hfov:.1f}°、'
           f'竖向视角约 {vfov:.1f}°；站位说明：{room}。视线主要朝{direction}面墙，'
           f'仰俯角 {pitch:.1f}°（正为仰视）。')
    scene, locked = [], []
    for o in camera['openings']:
        if not o.get('visible_px', 0):
            continue
        x0, _, x1, _ = o['bbox_xyxy']
        left, right = max(0, x0) / w * 100, min(w, x1 + 1) / w * 100
        side = '左侧' if (left + right) / 2 < 40 else '右侧' if (left + right) / 2 > 60 else '中部'
        name = o.get('name') or o['kind']
        sill = o.get('sill_mm', o.get('sill_m', 0) * 1000) / 1000
        head = o.get('head_mm', o.get('head_m', 0) * 1000) / 1000
        scene.append(f'- 画面{side}约 {left:.0f}%–{right:.0f}% 宽是一樘{name}：约 {o["width_mm"] / 1000:g} m 宽、{head-sill:g} m 高；洞底离地 {sill:g} m，洞顶离地 {head:g} m。')
        locked.append(f'{name}（{o["id"]}）的数量、位置、宽高、洞底高度和分格')
    scene.append(f'- 画面可见门窗共 {len(locked)} 个；画外或被完全遮挡的洞口不在此清单。')
    locked.append('梁、墙角线以及图中已有家具的外轮廓、位置和大小')
    text = (Path(__file__).resolve().parents[1] / 'assets/prompts' / f'{template}.txt').read_text()
    if white_only:
        photo = template == '风格照片'
        old_head = ('四张附图。图1、图2、图3 是同一个房间、同一个相机的结构信息：' if photo else '三张附图是同一个房间、同一个相机的三种结构信息：') + '图1 白模渲染；图2 深度图（越白离相机越近，越黑越远）；图3 线稿（这个 3D 模型的真实边线：墙角线、窗框、门洞边、梁、家具轮廓）。'
        pairs = [(old_head, ('两张附图。' if photo else '') + '图1 是这个房间的 3D 白模渲染：墙、门、窗、梁的位置和大小都按户型图做出，是真实结构。'),
                 ('都必须和图3的线稿重合；远近关系按图2；', '都必须和图1 的位置重合；'),
                 ('线稿里没有的窗和门一律不能出现；不得删除或合并线稿里的窗和门', '图1 里没有的窗和门一律不能出现；不得删除或合并图1 里的窗和门')]
        if photo:
            pairs.append(('房间的几何只看图1、图2、图3；', '房间的几何只看图1；'))
        for old, new in pairs:
            if text.count(old) != 1:
                raise ValueError('只白模模板文字不匹配：' + old[:16])
            text = text.replace(old, new)
        if photo:
            text = text.replace('图4', '图2')
    return text.format(CAMERA=cam, SCENE='\n'.join(scene), LOCKED='；'.join(locked)+'。',
                       STYLE=style.rstrip('。')+'。', ASPECT=f'{w}:{h}，{w}×{h} 像素')


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('camera', type=Path)
    p.add_argument('--style', required=True, help='材料、颜色和光照描述')
    p.add_argument('--template', choices=['结构参考', '风格照片'], default='结构参考')
    p.add_argument('--white-only', action='store_true', help='只给白模一张结构图；风格照片模板另附图2 风格照片')
    p.add_argument('--floor-y-mm', type=float, default=0, help='当前楼面绝对标高，默认首层 0；多层必须指定')
    p.add_argument('-o', '--output', type=Path, help='默认写 stdout')
    a = p.parse_args()
    try:
        result = fill(json.loads(a.camera.read_text()), a.style, a.template, a.floor_y_mm, a.white_only)
    except (ValueError, KeyError) as e:
        p.error(str(e))
    if a.output:
        a.output.write_text(result)
    else:
        print(result, end='')


if __name__ == '__main__':
    main()
