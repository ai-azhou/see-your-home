"""Delegate plan file boundaries to the shared Node CLI (v2/legacy -> v3)."""
import json
import subprocess
from pathlib import Path
CLI = Path(__file__).with_name('plan-cli.mjs')
class PlanValidationError(ValueError):
    """The CLI confirmed invalid plan data, rather than an environment failure."""

def convert(source, text=None):
    result = subprocess.run(['node', str(CLI), 'convert', str(source), '-'], input=text, text=True, capture_output=True)
    if result.returncode:
        check = subprocess.run(['node', str(CLI), 'validate', str(source)], input=text,
                               text=True, capture_output=True)
        try:
            report = json.loads(check.stdout)
        except ValueError:
            report = {}
        if report.get('valid') is False:
            raise PlanValidationError(result.stderr.strip())
        raise ValueError(result.stderr.strip() or f'Node CLI exited {result.returncode}')
    return result.stdout
def read_plan(path):
    return json.loads(convert(path))
def write_plan(path, plan):
    Path(path).write_text(convert('-', json.dumps(plan, ensure_ascii=False)), encoding='utf-8')
