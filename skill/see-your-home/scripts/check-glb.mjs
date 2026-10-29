// Offline Khronos validation. No external-resource resolver or network requests.
import { readFileSync } from 'node:fs'
import validator from './vendor/gltf-validator/index.js'
try {
  if (!process.argv[2]) throw new Error('Usage: node check-glb.mjs model.glb')
  const result = await validator.validateBytes(new Uint8Array(readFileSync(process.argv[2])))
  console.log(JSON.stringify(result, null, 2))
  if (result.issues.numErrors) process.exitCode = 1
} catch (error) { console.error(String(error)); process.exitCode = 1 }
