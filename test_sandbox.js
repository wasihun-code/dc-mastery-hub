import { runCode } from './backend/services/codeSandbox.js'
import path from 'path'

const code = `
import numpy as np
np_heights_m = np_heights * 100
print("Heights length:", len(np_heights_m))
`
const datasetPath = path.resolve('./content/tracks/associate-data-scientist-python/introduction-to-python/datasets/baseball.csv')

console.log('Running code...')
const result = runCode(code, [datasetPath])
console.log('Result:', result)
