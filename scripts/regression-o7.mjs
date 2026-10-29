import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const skill = resolve(process.argv[2]), cli = join(skill, 'scripts/plan-cli.mjs')
const work = mkdtempSync(join(tmpdir(), 'floorplan-o7-release-'))
const run = args => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', cwd: work })
try {
  const sample = JSON.parse(readFileSync(join(skill, 'assets/example/plan.json'), 'utf8'))
  for (const key of ['walls', 'openings', 'beams', 'rooms', 'columns', 'shafts', 'stairs']) for (const item of sample[key] ?? []) {
    if (item.evidence?.certainty !== 'seen') continue
    assert(item.evidence.basis && item.evidence.pixelBox?.length === 4, item.id)
  }
  for (const src of ['data:image/svg+xml;charset=utf-8,%3Csvg%2F%3E', 'data:image/svg+xml;base64,PHN2Zy8+']) {
    sample.underlay.src = src
    writeFileSync(join(work, 'svg.json'), JSON.stringify(sample))
    assert.equal(run(['validate', 'svg.json']).status, 0)
  }
  sample.underlay.src = 'https://example.test/image.svg'
  writeFileSync(join(work, 'remote.json'), JSON.stringify(sample))
  assert.equal(run(['validate', 'remote.json']).status, 1)
  const good = readFileSync(join(skill, 'assets/example/plan.json'))
  writeFileSync(join(work, 'out.json'), good)
  const bad = JSON.parse(good); bad.walls[0].b = bad.walls[0].a
  const blank = { format: 'floorplan-structure', version: 3, title: 'blank', ceiling: 2800, walls: [], rooms: [], openings: [], beams: [], questions: [], changes: [] }
  for (const value of [bad, blank]) {
    writeFileSync(join(work, 'in.json'), JSON.stringify(value))
    assert.equal(run(['convert', 'in.json', 'out.json']).status, 1)
    assert.deepEqual(readFileSync(join(work, 'out.json')), good)
  }
  const help = run([])
  assert.equal(help.status, 1)
  assert(help.stderr.includes('node "$SKILL/scripts/plan-cli.mjs"'))
  assert(help.stderr.includes('"$WORK/方案.json"'))
  console.log('O7: SVG round-trip boundary / safe convert / full-path help / seen evidence: PASS')
} finally { rmSync(work, { recursive: true, force: true }) }
