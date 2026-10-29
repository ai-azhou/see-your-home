#!/usr/bin/env python3
"""Offline re-score using unchanged research score.py and thin PNG truth.
Needs numpy, Pillow, scipy. Published JPEG scores may differ from original records.
"""
import argparse
import json
from pathlib import Path
import numpy as np
from PIL import Image
import score


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',required=True,type=Path)
    parser.add_argument('--originals',type=Path,help='optional <record-id> originals directory; SHA256 verified')
    args=parser.parse_args()
    root=Path(__file__).resolve().parents[1]
    contexts={}
    for shot in ('living','master'):
        d=root/'inputs'/shot/'furnished'
        raw=np.asarray(Image.open(d/'lines-truth.png').convert('L'))<200
        gt=raw.reshape(540,2,960,2).any(axis=(1,3))
        seg=np.asarray(Image.open(d/'seg.png').convert('RGB').resize((960,540),Image.Resampling.NEAREST))
        op=np.asarray(Image.open(d/'openings.png').convert('RGB').resize((960,540),Image.Resampling.NEAREST))
        meta=json.loads((d/'camera.json').read_text())
        ids=np.where(op[...,1]==255,np.round(op[...,0]/10),0).astype(int)
        opening=gt & score.ndimage.binary_dilation(ids>0,iterations=3)
        furn=gt & score.ndimage.binary_erosion((seg==meta['segClasses']['furniture']).all(2),iterations=1) & ~opening
        G={'gt':gt,'struct':gt & ~furn,'open':opening,'furn':furn,'ids':ids,'seg':seg,'meta':meta}
        baseline=score.score_image(score.load_rgb(d/'clay.png')[0],G)[0]
        contexts[shot]=(G,baseline)
    results=[]
    for rec in map(json.loads,(root/'records.jsonl').read_text().splitlines()):
        if rec['status']!='ok' or rec['shot'] is None:continue
        image=root/rec['output']
        if args.originals:
            import hashlib
            matches=list(args.originals.glob(rec['id']+'.*'))
            if len(matches)!=1:raise ValueError('exactly one original required: '+rec['id'])
            image=matches[0]
            if hashlib.sha256(image.read_bytes()).hexdigest()!=rec['original_sha256']:
                raise ValueError('original SHA256 mismatch: '+rec['id'])
        G,b=contexts[rec['shot']]
        v=score.score_image(score.load_rgb(image)[0],G)[0]
        results.append({'id':rec['id'],'source':'original' if args.originals else 'published JPEG',
            'S':.5*v['Ks']/b['Ks']+.5*v['Ko']/b['Ko'],
            'S*':.5*v['Ks*']/b['Ks*']+.5*v['Ko*']/b['Ko*'],
            'recorded_original_S':rec['scores']['S'],'recorded_original_S*':rec['scores']['S*']})
    args.output.write_text(json.dumps(results,ensure_ascii=False,indent=2,allow_nan=False)+'\n')


if __name__=='__main__':main()
