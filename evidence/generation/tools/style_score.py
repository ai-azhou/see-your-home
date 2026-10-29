"""配色距离：sRGB/D65 Lab、确定性 k-means(k=3)、CIEDE2000。"""
import numpy as np
from PIL import Image
from scipy import ndimage
from skimage.color import rgb2lab, deltaE_ciede2000


def palette(rgb):
    """最多均匀抽样 20000 像素；固定种子，最大簇优先，返回 Lab 与占比。"""
    pixels = np.asarray(rgb).reshape(-1, 3)
    pixels = pixels[np.linspace(0, len(pixels) - 1, min(len(pixels), 20000), dtype=int)]
    lab = rgb2lab(pixels.astype(float) / 255)
    rng = np.random.default_rng(0)
    centers = [lab[rng.integers(len(lab))]]
    for _ in range(2):
        dist = np.min(((lab[:, None] - centers) ** 2).sum(2), axis=1)
        centers.append(lab[rng.choice(len(lab), p=dist / dist.sum())] if dist.sum() else centers[0])
    centers = np.array(centers)
    for _ in range(100):
        labels = ((lab[:, None] - centers) ** 2).sum(2).argmin(1)
        new = np.array([lab[labels == i].mean(0) if np.any(labels == i) else centers[i] for i in range(3)])
        if np.max(np.abs(new - centers)) < 1e-5:
            centers = new
            break
        centers = new
    labels = ((lab[:, None] - centers) ** 2).sum(2).argmin(1)
    counts = np.bincount(labels, minlength=3)
    return [{'lab': centers[i].tolist(), 'weight': float(counts[i] / len(lab))}
            for i in np.argsort(-counts, kind='stable') if counts[i]]


def reference_palette(path):
    with Image.open(path) as im:
        im = im.convert('RGB')
        im.thumbnail((512, 512))  # 保留整图和宽高比，不裁切
        return palette(im)


def score_style(rgb, gt, alignment, reference):
    """把结果图双线性采样到 GT 坐标；越界剔除，遮罩内缩 3px。"""
    arr = np.asarray(rgb)
    h, w = arr.shape[:2]
    yy, xx = np.indices((h, w), dtype=float)
    xx = (xx - w / 2) * alignment['scale'] + w / 2 + alignment['dx_px']
    yy = (yy - h / 2) * alignment['scale'] + h / 2 + alignment['dy_px']
    valid = (xx >= 0) & (xx <= w - 1) & (yy >= 0) & (yy <= h - 1)
    aligned = np.stack([ndimage.map_coordinates(arr[..., i].astype(float), [yy, xx], order=1,
                                               mode='constant', cval=0) for i in range(3)], axis=-1)
    result = {}
    for name in ('wall', 'floor'):
        mask = (gt['seg'] == gt['meta']['segClasses'][name]).all(2)
        mask = ndimage.binary_erosion(mask, iterations=3) & valid
        n = int(mask.sum())
        if not n:
            result[name] = {'pixels': 0, 'delta_e2000': None, 'reason': 'no_valid_pixels'}
            continue
        dominant = palette(aligned[mask])[0]
        reference_lab = np.array([p['lab'] for p in reference])
        distances = deltaE_ciede2000(np.broadcast_to(dominant['lab'], reference_lab.shape), reference_lab)
        idx = int(np.argmin(distances))
        result[name] = {'pixels': n, 'dominant_lab': dominant['lab'], 'dominant_weight': dominant['weight'],
                        'palette_index': idx, 'delta_e2000': float(distances[idx])}
    values = [result[n]['delta_e2000'] for n in ('wall', 'floor')]
    result['mean_delta_e2000'] = float(np.mean(values)) if all(v is not None for v in values) else None
    return result
