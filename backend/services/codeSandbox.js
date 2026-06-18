import config from '../config.js'
import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const BLOCKED_TERMS = [
  'import os', 'import sys', 'import subprocess',
  'import socket', '__import__', 'exec(', 'eval(',
  'open(', 'os.', 'sys.', 'subprocess.',
  'shutil', 'pathlib', 'import glob', 'from glob'
]

function checkSecurity(code) {
  if (typeof code !== 'string') return null
  for (const blockedTerm of BLOCKED_TERMS) {
    if (code.includes(blockedTerm)) {
      return {
        success: false,
        output: '',
        error: 'Security violation: ' + blockedTerm + ' is not allowed',
        blocked: true
      }
    }
  }
  return null
}

export function runSql(code) {
  // SQL Sandbox using an in-memory SQLite database
  const db = new Database(':memory:')
  try {
    // Split statements by semicolon and run them
    const statements = code.split(';').map(s => s.trim()).filter(s => s.length > 0)
    let lastOutput = ''
    let lastResult = null

    for (const stmt of statements) {
      if (stmt.toLowerCase().startsWith('select')) {
        const rows = db.prepare(stmt).all()
        lastResult = rows
        if (rows.length > 0) {
          const keys = Object.keys(rows[0])
          const header = keys.join(' | ')
          const data = rows.map(r => keys.map(k => r[k]).join(' | ')).join('\n')
          lastOutput = header + '\n' + data
        } else {
          lastOutput = '(no results)'
        }
      } else {
        db.prepare(stmt).run()
        lastOutput = 'Statement executed successfully.'
      }
    }

    return {
      success: true,
      output: lastOutput.trim(),
      error: null,
      vars: {} // SQL variables not yet supported in side-panel
    }
  } catch (err) {
    return {
      success: false,
      output: '',
      error: 'SQL Error: ' + err.message,
      vars: {}
    }
  } finally {
    db.close()
  }
}

export function runDatasetChallenge(solutionCode, preLoadedData, validationRules, datasetsAbsolutePath, userId, challengeId) {
  const securityViolation = checkSecurity(solutionCode)
  if (securityViolation) return securityViolation

  let setupCode = ''
  if (preLoadedData) {
    for (const [key, value] of Object.entries(preLoadedData)) {
      const absPath = value.path ? path.join(datasetsAbsolutePath, value.path) : ''
      
      if (value.type === 'csv' && value.path) {
        setupCode += `_df = pd.read_csv(r'${absPath}', skipinitialspace=True)\n`
        setupCode += `_df.columns = _df.columns.str.strip()\n`
        setupCode += `${key} = _df\n`
      } else if (value.type === 'csv_column' && value.path && value.column) {
        setupCode += `_df = pd.read_csv(r'${absPath}', skipinitialspace=True)\n`
        setupCode += `_df.columns = _df.columns.str.strip()\n`
        setupCode += `${key} = _df[${JSON.stringify(value.column)}].values\n`
      } else if (value.type === 'csv_list' && value.path && value.column) {
        setupCode += `_df = pd.read_csv(r'${absPath}', skipinitialspace=True)\n`
        setupCode += `_df.columns = _df.columns.str.strip()\n`
        setupCode += `${key} = _df[${JSON.stringify(value.column)}].tolist()\n`
      } else if (value.type === 'pickle' && value.path) {
        setupCode += `${key} = pd.read_pickle(r'${absPath}')\n`
      } else if (value.type === 'sqlite' && value.path) {
        setupCode += `${key} = sqlite3.connect(r'${absPath}')\n`
      } else if (value.type === 'dataframe' && value.data) {
        setupCode += `${key} = pd.DataFrame(${JSON.stringify(value.data)})\n`
      } else if (value.type === 'value') {
        setupCode += `${key} = ${JSON.stringify(value.data)}\n`
      }
    }
  }

  let validationCode = ''
  if (validationRules && Array.isArray(validationRules)) {
    for (const rule of validationRules) {
      validationCode += `
try:
    _check = bool(${rule.check})
    _results.append({"rule": ${JSON.stringify(rule.message)}, "passed": _check, "message": ${JSON.stringify(rule.message)}})
except Exception as e:
    _results.append({"rule": ${JSON.stringify(rule.message)}, "passed": False, "message": f"Error: {str(e)}"})
`
    }
  }

  const scriptContent = `
# === AUTO-GENERATED CHALLENGE SANDBOX ===
import pandas as pd
import numpy as np
import sqlite3, os, json, sys

# --- PRE-LOADED VARIABLES ---
${setupCode}

# --- USER SOLUTION ---
${solutionCode}

# --- VALIDATION ---
_results = []
${validationCode}
print(json.dumps(_results))
`

  const tmpPath = path.join(os.tmpdir(), `dc_challenge_${userId}_${challengeId}_${Date.now()}.py`)
  fs.writeFileSync(tmpPath, scriptContent)

  const venvPython = path.resolve(__dirname, '../../venv/bin/python3')
  const pythonExe = fs.existsSync(venvPython) ? venvPython : (config.PYTHON_PATH)

  const startTime = Date.now()
  let stdout = ''
  let stderr = ''
  let results = []
  let success = false
  let passed = 0
  let total = validationRules ? validationRules.length : 0

  try {
    const result = spawnSync(pythonExe, [tmpPath], {
      timeout: config.CHALLENGE_TIMEOUT_MS,
      encoding: 'utf-8',
      cwd: datasetsAbsolutePath,
      env: { PATH: process.env.PATH }
    })

    stdout = result.stdout || ''
    stderr = result.stderr || ''

    if (result.error) {
      if (result.error.code === 'ETIMEDOUT') {
        stderr = 'Execution timed out.'
      } else {
        stderr = result.error.message
      }
    } else if (result.status !== 0) {
      // Script failed
    } else {
      // Try parsing stdout for JSON results
      const lines = stdout.trim().split('\n')
      if (lines.length > 0) {
        try {
          const lastLine = lines[lines.length - 1]
          results = JSON.parse(lastLine)
          if (Array.isArray(results)) {
            passed = results.filter(r => r.passed).length
            success = passed === total
          }
        } catch (e) {
          stderr += '\nFailed to parse validation results: ' + e.message
        }
      }
    }

  } catch (err) {
    stderr = err.message
  } finally {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath)
    } catch (e) {}
  }

  const executionTime = Date.now() - startTime

  return {
    success,
    passed,
    total,
    results,
    stdout,
    stderr,
    executionTime
  }
}

export function runCode(code, datasetPaths) {
  // Legacy code sandbox - keep it for other components if needed, or remove if unused.
  const securityViolation = checkSecurity(code)
  if (securityViolation) return securityViolation

  let tmpDir;
  try {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-sandbox-'))
  } catch (err) {
    return { success: false, output: '', error: 'Failed to create sandbox environment.' }
  }

  try {
    for (const datasetPath of datasetPaths) {
      if (fs.existsSync(datasetPath)) {
        const fileName = path.basename(datasetPath)
        fs.copyFileSync(datasetPath, path.join(tmpDir, fileName))
      }
    }

    const safeTmpDir = JSON.stringify(tmpDir)
    const scriptContent = `
import pandas as pd
import numpy as np
import warnings
warnings.filterwarnings('ignore')
import os
os.chdir(${safeTmpDir})

if os.path.exists('baseball.csv'):
    df_baseball = pd.read_csv('baseball.csv')
    np_heights = df_baseball['Height'].values
    np_weights = df_baseball['Weight'].values
    pos_cats = df_baseball['PosCategory'].tolist()

if os.path.exists('football.csv'):
    df_football = pd.read_csv('football.csv', skipinitialspace=True)
    df_football.columns = df_football.columns.str.strip()
    np_ratings = df_football['rating'].values
    np_paces = pd.to_numeric(df_football['pace'], errors='coerce').fillna(0).values
    np_shootings = pd.to_numeric(df_football['shooting'], errors='coerce').fillna(0).values

${code}

import json
try:
    user_vars = {}
    for k, v in list(globals().items()):
        if k.startswith('_') or k in ['pd', 'np', 'warnings', 'os', 'json', 'user_vars', 'k', 'v', 'scriptContent', 'scriptPath', 'expected_code', 'solution_code', 'datasetFile', 'datasetPath', 'fileName']:
            continue
        try:
            if hasattr(v, 'shape'):
                val_str = f"{type(v).__name__} of shape {v.shape}"
            else:
                val_str = repr(v)
                if len(val_str) > 80:
                    val_str = val_str[:77] + '...'
            type_str = type(v).__name__
            user_vars[k] = {'type': type_str, 'value': val_str}
        except:
            pass
    print("__DC_VARS_START__" + json.dumps(user_vars) + "__DC_VARS_END__")
except:
    pass
`
    const scriptPath = path.join(tmpDir, 'solution.py')
    fs.writeFileSync(scriptPath, scriptContent)

    const venvPython = path.resolve(__dirname, '../../venv/bin/python3')
    const pythonExe = fs.existsSync(venvPython) ? venvPython : (config.PYTHON_PATH)
    
    // We use child_process.spawnSync here instead of execSync for consistency
    const result = spawnSync(pythonExe, [scriptPath], {
        timeout: 10000,
        encoding: 'utf-8',
        env: { PATH: process.env.PATH }
    })

    let outputStr = result.stdout || ''
    if (result.error && result.error.code === 'ETIMEDOUT') {
        throw new Error("Code timed out after 10 seconds.")
    } else if (result.stderr) {
        throw new Error(result.stderr)
    }

    let vars = {}
    const varsMatch = outputStr.match(/__DC_VARS_START__(.*?)__DC_VARS_END__/)
    if (varsMatch) {
      try {
        vars = JSON.parse(varsMatch[1])
      } catch (e) {}
      outputStr = outputStr.replace(/__DC_VARS_START__(.*?)__DC_VARS_END__/, '')
    }

    return { success: true, output: outputStr.trim(), error: null, vars }
  } catch (err) {
    let errorText = err.message
    errorText = errorText.replace(new RegExp(tmpDir + '/solution.py', 'g'), 'script.py')
    return { success: false, output: '', error: errorText, vars: {} }
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true }) } catch(e) {}
  }
}

export function runShellCommand(historyCode, command, preLoadedData, datasetsAbsolutePath, userId, challengeId) {
  const securityViolation = checkSecurity(command) || checkSecurity(historyCode)
  if (securityViolation) return securityViolation

  let setupCode = ''
  if (preLoadedData) {
    for (const [key, value] of Object.entries(preLoadedData)) {
      const absPath = value.path ? path.join(datasetsAbsolutePath, value.path) : ''
      
      if (value.type === 'csv' && value.path) {
        setupCode += `_df = pd.read_csv(r'${absPath}', skipinitialspace=True)\n`
        setupCode += `_df.columns = _df.columns.str.strip()\n`
        setupCode += `${key} = _df\n`
      } else if (value.type === 'csv_column' && value.path && value.column) {
        setupCode += `_df = pd.read_csv(r'${absPath}', skipinitialspace=True)\n`
        setupCode += `_df.columns = _df.columns.str.strip()\n`
        setupCode += `${key} = _df[${JSON.stringify(value.column)}].values\n`
      } else if (value.type === 'csv_list' && value.path && value.column) {
        setupCode += `_df = pd.read_csv(r'${absPath}', skipinitialspace=True)\n`
        setupCode += `_df.columns = _df.columns.str.strip()\n`
        setupCode += `${key} = _df[${JSON.stringify(value.column)}].tolist()\n`
      } else if (value.type === 'pickle' && value.path) {
        setupCode += `${key} = pd.read_pickle(r'${absPath}')\n`
      } else if (value.type === 'sqlite' && value.path) {
        setupCode += `${key} = sqlite3.connect(r'${absPath}')\n`
      } else if (value.type === 'dataframe' && value.data) {
        setupCode += `${key} = pd.DataFrame(${JSON.stringify(value.data)})\n`
      } else if (value.type === 'value') {
        setupCode += `${key} = ${JSON.stringify(value.data)}\n`
      }
    }
  }

  const scriptContent = `
# === AUTO-GENERATED SHELL SANDBOX ===
import pandas as pd
import numpy as np
import sqlite3, os, json, sys

# --- PRE-LOADED VARIABLES ---
${setupCode}

# --- HISTORY ---
${historyCode}

# --- COMMAND ---
${command}

import json
try:
    user_vars = {}
    for k, v in list(globals().items()):
        if k.startswith('_') or k in ['pd', 'np', 'os', 'json', 'sys', 'user_vars', 'k', 'v']:
            continue
        try:
            if hasattr(v, 'shape'):
                val_str = f"{type(v).__name__} of shape {v.shape}"
            else:
                val_str = repr(v)
                if len(val_str) > 80:
                    val_str = val_str[:77] + '...'
            type_str = type(v).__name__
            user_vars[k] = {'type': type_str, 'value': val_str}
        except:
            pass
    print("__DC_VARS_START__" + json.dumps(user_vars) + "__DC_VARS_END__")
except:
    pass
`

  const tmpPath = path.join(os.tmpdir(), `dc_shell_${userId}_${challengeId}_${Date.now()}.py`)
  fs.writeFileSync(tmpPath, scriptContent)

  const venvPython = path.resolve(__dirname, '../../venv/bin/python3')
  const pythonExe = fs.existsSync(venvPython) ? venvPython : (config.PYTHON_PATH)

  try {
    const result = spawnSync(pythonExe, [tmpPath], {
      timeout: config.CHALLENGE_TIMEOUT_MS,
      encoding: 'utf-8',
      cwd: datasetsAbsolutePath,
      env: { PATH: process.env.PATH }
    })

    let outputStr = result.stdout || ''
    let errorStr = result.stderr || ''

    if (result.error && result.error.code === 'ETIMEDOUT') {
        errorStr = "Execution timed out."
    }

    let vars = {}
    const varsMatch = outputStr.match(/__DC_VARS_START__(.*?)__DC_VARS_END__/)
    if (varsMatch) {
      try {
        vars = JSON.parse(varsMatch[1])
      } catch (e) {}
      outputStr = outputStr.replace(/__DC_VARS_START__(.*?)__DC_VARS_END__/, '')
    }

    return { 
      success: result.status === 0 && !errorStr, 
      output: outputStr.trim(), 
      error: errorStr.trim() || null, 
      vars 
    }
  } catch (err) {
    return { success: false, output: '', error: err.message, vars: {} }
  } finally {
    try { fs.unlinkSync(tmpPath) } catch (e) {}
  }
}

