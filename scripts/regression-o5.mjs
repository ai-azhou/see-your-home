// Offline release-boundary regressions; all inputs and outputs live in a temporary directory.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const skill = process.argv[2] ? resolve(process.argv[2]) : resolve(dirname(fileURLToPath(import.meta.url)), '../skill/see-your-home')
const cli = join(skill, 'scripts/plan-cli.mjs'), work = mkdtempSync(join(tmpdir(), 'floorplan-o5-'))
const sample = JSON.parse(readFileSync(join(skill, 'assets/example/plan.json'), 'utf8'))
const base = { format: 'floorplan-structure', version: 3, title: 'Release regression', ceiling: 2800, walls: [{ id: 'w', a: [0, 0], b: [4000, 0], thickness: 240, kind: 'bearing' }], rooms: [], openings: [], beams: [], questions: [], changes: [] }
const write = (name, data) => { const file = join(work, name + '.json'); writeFileSync(file, JSON.stringify(data)); return file }
const run = (args, exit = 0) => {
  const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' })
  assert.equal(result.status, exit, `${args.join(' ')}\n${result.stderr}\n${result.stdout}`)
  return result
}
try {
  for (const data of [{ b: [1, 0] }, { thickness: .001 }, { height: 1 }, { kind: 'partition' }]) {
    const plan = structuredClone(base); plan.changes = [{ id: 'protected-update', op: 'update', type: 'wall', target: 'w', data, by: 'agent', status: 'confirmed' }]
    const input = write('protected', plan)
    assert.equal(JSON.parse(run(['apply', input], 1).stdout).results[0].needsConfirm, true)
    assert.match(run(['export', input, join(work, 'blocked.glb'), '--state', 'renovated'], 1).stderr, /protected-update/)
    assert(!existsSync(join(work, 'blocked.glb')))
    plan.changes[0].confirm = { by: 'owner' }; run(['apply', write('confirmed', plan)])
  }
  const invalid = structuredClone(sample)
  invalid.changes = [{ id: 'self-crossing-change', op: 'update', type: 'room', target: 'r-living', data: { poly: [[0, 0], [4000, 4000], [0, 4000], [4000, 0]] }, by: 'agent', status: 'confirmed' }]
  const invalidFile = write('invalid', invalid)
  for (const command of ['apply', 'export', 'render', 'cameras']) {
    const args = [command, invalidFile]
    if (command === 'export' || command === 'render') args.push(join(work, 'invalid-out'))
    if (command !== 'apply') args.push('--state', 'renovated')
    const result = run(args, 1); assert.match(result.stdout + result.stderr, /self-crossing-change/); assert.match(result.stdout + result.stderr, /room-self-intersection/)
  }
  assert(!existsSync(join(work, 'invalid-out')) || readdirSync(join(work, 'invalid-out')).length === 0)
  for (const mutate of [
    p => { p.walls[0].heigth = 1000 }, p => { p.questions = [{ id: 'q', category: 'original' }] },
    p => { p.walls[0].evidence = { certainty: 'seen', pixelBox: [1, 2] } },
    p => { p.underlay.calibrations = [{ p1: [0, 0], p2: [1, 0], length: '3000m' }] },
    p => { p.changes = [{ id: 'bad-patch', op: 'update', type: 'wall', target: 'w-n', data: { heigth: 1000 }, by: 'agent', status: 'confirmed' }] },
  ]) {
    const plan = structuredClone(sample); mutate(plan)
    const report = JSON.parse(run(['validate', write('schema-invalid', plan)], 1).stdout)
    assert.equal(report.valid, false); assert(report.issues.some(i => i.code === 'schema'))
  }
  const forged = structuredClone(sample); forged.legacy = { __structureReplayFrame: { x0: 0, x1: 10000, y0: 0, y1: 10000 } }
  const forgedFile = write('forged', forged)
  run(['export', forgedFile, join(work, 'original.glb')]); run(['export', forgedFile, join(work, 'renovated.glb'), '--state', 'renovated'])
  assert.notDeepEqual(readFileSync(join(work, 'original.glb')), readFileSync(join(work, 'renovated.glb')))
  const input = write('sample', sample)
  for (const command of ['cameras', 'render']) {
    const args = [command, input]; if (command === 'render') args.push(join(work, 'unknown'))
    assert.match(run([...args, '--level', 'absent'], 1).stderr, /未知楼层/)
  }
  const choices = JSON.parse(run(['cameras', input, '--json']).stdout)
  const brief = run(['cameras', input]).stdout.trim().split('\n'); assert.equal(brief.length, choices.length); assert(brief.every(s => !s.includes('projection')))
  run(['render', input, join(work, 'batch'), '--camera', 'iso-sw', '--camera', 'top', '--size', '80x60'])
  run(['render', input, join(work, 'list'), '--cameras', write('cameras', ['iso-sw', 'top']), '--size', '80x60'])
  for (const view of ['iso-sw', 'top']) assert.deepEqual(readFileSync(join(work, 'batch', view + '-white.png')), readFileSync(join(work, 'list', view + '-white.png')))
  run(['render', input, join(work, 'replay'), '--camera', join(work, 'batch/iso-sw-white.camera.json')])
  assert.deepEqual(readFileSync(join(work, 'batch/iso-sw-white.png')), readFileSync(join(work, 'replay/iso-sw-white.png')))
  const missingText = structuredClone(sample); missingText.questions = [{ id: 'q', category: 'original' }]
  const python = process.env.PYTHON ?? 'python3'
  const overlay = args => spawnSync(python, [join(skill, 'scripts/overlay.py'), join(skill, 'assets/example/input.png'), ...args], { encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } })
  const bad = overlay([write('missing-text', missingText), join(work, 'bad.png')]); assert.equal(bad.status, 1); assert.match(bad.stderr, /questions\/0\/text/); assert(!bad.stderr.includes('Traceback'))
  const labels = overlay([input, join(work, 'labels.png'), '--labels', '主卧=10,客餐厅=29']); assert.equal(labels.status, 0, labels.stderr); assert.match(labels.stdout, /超过 5%/); assert.match(labels.stdout, /偏差/)
  console.log('O5: protection / final geometry / schema / replay marker / levels / batch cameras / overlay: PASS')
} finally { rmSync(work, { recursive: true, force: true }) }
