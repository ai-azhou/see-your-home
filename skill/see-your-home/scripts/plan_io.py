"""Delegate plan file boundaries to the shared Node CLI (v2/legacy -> v3)."""
import json
import subprocess
from pathlib import Path
CLI = Path(__file__).with_name('plan-cli.mjs')
def convert(source, text=None):
    result = subprocess.run(['node', str(CLI), 'convert', str(source), '-'], input=text, text=True, capture_output=True)
    if result.returncode:
        raise ValueError(result.stderr)
    return result.stdout
def read_plan(path):
    return json.loads(convert(path))
def write_plan(path, plan):
    Path(path).write_text(convert('-', json.dumps(plan, ensure_ascii=False)), encoding='utf-8')
