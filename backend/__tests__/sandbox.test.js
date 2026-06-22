import { jest } from '@jest/globals'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { setupTestEnvironment, cleanupTestEnvironment } from './helpers/testEnv.pg.js'

let env

beforeAll(async () => {
  env = await setupTestEnvironment()
  jest.resetModules()
})

afterAll(async () => {
  await cleanupTestEnvironment(env.tmpDir)
  if (typeof db !== 'undefined' && db && db.end) await db.end();
})

describe('codeSandbox - runSql', () => {
  let runSql

  beforeAll(async () => {
    const mod = await import('../services/codeSandbox.js')
    runSql = mod.runSql
  })

  test('executes a simple SELECT', async () => {
    const result = await runSql('SELECT 1 AS val')
    expect(result.success).toBe(true)
    expect(result.output).toContain('val')
    expect(result.output).toContain('1')
  })

  test('executes CREATE TABLE and SELECT in one call', async () => {
    const result = await runSql("CREATE TABLE test (id INT, name TEXT); INSERT INTO test VALUES (1, 'Alice'); SELECT * FROM test")
    expect(result.success).toBe(true)
    expect(result.output).toContain('Alice')
  })

  test('returns error for invalid SQL', async () => {
    const result = await runSql('SELECT FROM nowhere')
    expect(result.success).toBe(false)
    expect(result.error).toContain('SQL Error')
  })

  test('returns empty result for SELECT with no rows', async () => {
    const result = await runSql('CREATE TABLE empty_test (id INT); SELECT * FROM empty_test')
    expect(result.success).toBe(true)
    expect(result.output).toBe('(no results)')
  })

  test('handles multiple statements', async () => {
    const result = await runSql("CREATE TABLE multi (x INT); INSERT INTO multi VALUES (42); SELECT * FROM multi")
    expect(result.success).toBe(true)
    expect(result.output).toContain('42')
  })

  test('executes DROP TABLE statement', async () => {
    const result = await runSql('CREATE TABLE drop_test (id INT); INSERT INTO drop_test VALUES (1); DROP TABLE drop_test')
    expect(result.success).toBe(true)
    expect(result.output).toContain('Statement executed successfully')
  })

  test('returns column names in output', async () => {
    const result = await runSql('SELECT 1 AS first_col, 2 AS second_col')
    expect(result.success).toBe(true)
    expect(result.output).toContain('first_col')
    expect(result.output).toContain('second_col')
  })

  test('handles empty string', async () => {
    const result = await runSql('')
    expect(result.success).toBe(true)
    expect(result.output).toBe('')
  })
})

describe('codeSandbox - runDatasetChallenge security', () => {
  let runDatasetChallenge

  beforeAll(async () => {
    const mod = await import('../services/codeSandbox.js')
    runDatasetChallenge = mod.runDatasetChallenge
  })

  test('blocks import os', async () => {
    const result = await runDatasetChallenge('import os\nprint("hack")', null, null, '', 'anon', null)
    expect(result.blocked).toBe(true)
    expect(result.error).toContain('Security violation')
  })

  test('blocks import sys', async () => {
    const result = await runDatasetChallenge('import sys\nprint("hack")', null, null, '', 'anon', null)
    expect(result.blocked).toBe(true)
  })

  test('blocks eval(', async () => {
    const result = await runDatasetChallenge('eval("1+1")', null, null, '', 'anon', null)
    expect(result.blocked).toBe(true)
  })

  test('blocks open(', async () => {
    const result = await runDatasetChallenge('open("/etc/passwd")', null, null, '', 'anon', null)
    expect(result.blocked).toBe(true)
  })

  test('blocks os.', async () => {
    const result = await runDatasetChallenge('os.system("ls")', null, null, '', 'anon', null)
    expect(result.blocked).toBe(true)
  })
})

describe('codeSandbox - temp file cleanup', () => {
  let runDatasetChallenge

  beforeAll(async () => {
    const mod = await import('../services/codeSandbox.js')
    runDatasetChallenge = mod.runDatasetChallenge
  })

  test('cleans up temp files after security violation (no file created)', async () => {
    const beforeCount = fs.readdirSync(os.tmpdir()).filter(f => f.startsWith('dc_challenge_')).length
    runDatasetChallenge('import os', null, null, '', 'anon', null)
    const afterCount = fs.readdirSync(os.tmpdir()).filter(f => f.startsWith('dc_challenge_')).length
    expect(afterCount).toBe(beforeCount)
  })

  test('cleans up temp files after runOnly execution', async () => {
    const beforeFiles = new Set(fs.readdirSync(os.tmpdir()).filter(f => f.startsWith('dc_challenge_')))
    const result = await runDatasetChallenge('x = 1', null, null, os.tmpdir(), 'anon', null)
    const afterFiles = new Set(fs.readdirSync(os.tmpdir()).filter(f => f.startsWith('dc_challenge_')))
    const newFiles = [...afterFiles].filter(f => !beforeFiles.has(f))
    expect(newFiles.length).toBe(0)
  })
})

describe('codeSandbox - runOnly mode', () => {
  let runDatasetChallenge

  beforeAll(async () => {
    const mod = await import('../services/codeSandbox.js')
    runDatasetChallenge = mod.runDatasetChallenge
  })

  test('runs code and returns variables', async () => {
    const result = await runDatasetChallenge('x = 42\ny = [1,2,3]', null, null, os.tmpdir(), 'anon', 'test', { runOnly: true })
    expect(result.stdout).toBeDefined()
  })
})

describe('codeSandbox - "undefined" never appears regression', () => {
  let runDatasetChallenge

  beforeAll(async () => {
    const mod = await import('../services/codeSandbox.js')
    runDatasetChallenge = mod.runDatasetChallenge
  })

  test('runOnly output does not contain literal "undefined" string', async () => {
    const code = `
import pandas as pd
import numpy as np
df = pd.DataFrame({'a': [1]})
print("hello world")
`
    const result = await runDatasetChallenge(code, null, null, os.tmpdir(), 'anon', 'undef-test', { runOnly: true })
    const combined = (result.stdout || '') + ' ' + (result.stderr || '')
    const clean = combined.replace(/undefined/g, '')
    expect(clean).toEqual(combined)
  })
})

describe('codeSandbox - runCode (Python)', () => {
  let runCode

  beforeAll(async () => {
    const mod = await import('../services/codeSandbox.js')
    runCode = mod.runCode
  })

  test('runPython with a valid Python snippet', async () => {
    const result = await runCode('x = 1 + 1\nprint(x)', [])
    expect(result.success).toBe(true)
    expect(result.output).toContain('2')
  })

  test('runPython with a syntax error', async () => {
    const result = await runCode('if True\n  print("bad")', [])
    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })

  test('Python with import statement (non-blocked)', async () => {
    const result = await runCode('import json\ndata = json.dumps({"a": 1})\nprint(data)', [])
    expect(result.success).toBe(true)
    expect(result.output).toContain('{"a": 1}')
  })

  test('output captures print() statements', async () => {
    const result = await runCode('print("hello from python")\nprint("second line")', [])
    expect(result.success).toBe(true)
    expect(result.output).toContain('hello from python')
    expect(result.output).toContain('second line')
  })
})
