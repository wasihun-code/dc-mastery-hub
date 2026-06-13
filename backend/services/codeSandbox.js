import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

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

export function runCode(code, datasetPaths) {
  const securityViolation = checkSecurity(code)
  if (securityViolation) return securityViolation

  // Create a temp directory
  let tmpDir;
  try {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-sandbox-'))
  } catch (err) {
    return {
      success: false,
      output: '',
      error: 'Failed to create sandbox environment.'
    }
  }

  try {
    // Copy dataset files into temp directory
    for (const datasetPath of datasetPaths) {
      if (fs.existsSync(datasetPath)) {
        const fileName = path.basename(datasetPath)
        fs.copyFileSync(datasetPath, path.join(tmpDir, fileName))
      }
    }

    // Build wrapper Python script
    const safeTmpDir = JSON.stringify(tmpDir)
    const scriptContent = `
import pandas as pd
import numpy as np
import warnings
warnings.filterwarnings('ignore')
import os
os.chdir(${safeTmpDir})

# Preload baseball dataset variables
if os.path.exists('baseball.csv'):
    df_baseball = pd.read_csv('baseball.csv')
    np_heights = df_baseball['Height'].values
    np_weights = df_baseball['Weight'].values
    pos_cats = df_baseball['PosCategory'].tolist()

# Preload football dataset variables
if os.path.exists('football.csv'):
    df_football = pd.read_csv('football.csv', skipinitialspace=True)
    df_football.columns = df_football.columns.str.strip()
    np_ratings = df_football['rating'].values
    np_paces = pd.to_numeric(df_football['pace'], errors='coerce').fillna(0).values
    np_shootings = pd.to_numeric(df_football['shooting'], errors='coerce').fillna(0).values

${code}

# Inspect variables at the end
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

    // Execute the script
    const venvPython = path.resolve(__dirname, '../../venv/bin/python3')
    const pythonExe = fs.existsSync(venvPython) ? venvPython : (process.env.PYTHON_EXECUTABLE || 'python3')
    
    const output = execSync(
      `"${pythonExe}" "${scriptPath}"`,
      {
        timeout: 10000,
        maxBuffer: 1024 * 1024,
        env: { PATH: process.env.PATH }
      }
    )
    
    let outputStr = output.toString()
    let vars = {}
    const varsMatch = outputStr.match(/__DC_VARS_START__(.*?)__DC_VARS_END__/)
    if (varsMatch) {
      try {
        vars = JSON.parse(varsMatch[1])
      } catch (e) {}
      outputStr = outputStr.replace(/__DC_VARS_START__(.*?)__DC_VARS_END__/, '')
    }

    return {
      success: true,
      output: outputStr.trim(),
      error: null,
      vars
    }
  } catch (err) {
    let errorText = err.stderr ? err.stderr.toString().trim() : err.message
    // Sanitize the traceback to hide the internal server temp path and wrapper script name
    errorText = errorText.replace(new RegExp(tmpDir + '/solution.py', 'g'), 'script.py')
    
    return {
      success: false, 
      output: '',
      error: errorText,
      vars: {}
    }
  } finally {
    // Clean up temp directory
    try { 
      fs.rmSync(tmpDir, { recursive: true }) 
    } catch(e) {}
  }
}

export function runShellCommand(historyCode, command, datasetPaths) {
  const securityViolation = checkSecurity(command)
  if (securityViolation) return securityViolation

  // Create a temp directory
  let tmpDir;
  try {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-sandbox-'))
  } catch (err) {
    return {
      success: false,
      output: '',
      error: 'Failed to create sandbox environment.'
    }
  }

  try {
    // Copy dataset files into temp directory
    for (const datasetPath of datasetPaths) {
      if (fs.existsSync(datasetPath)) {
        const fileName = path.basename(datasetPath)
        fs.copyFileSync(datasetPath, path.join(tmpDir, fileName))
      }
    }

    // Build wrapper Python script for shell execution
    const safeTmpDir = JSON.stringify(tmpDir)
    const scriptContent = `
import pandas as pd
import numpy as np
import warnings
warnings.filterwarnings('ignore')
import os
os.chdir(${safeTmpDir})

# Preload baseball dataset variables
if os.path.exists('baseball.csv'):
    df_baseball = pd.read_csv('baseball.csv')
    np_heights = df_baseball['Height'].values
    np_weights = df_baseball['Weight'].values
    pos_cats = df_baseball['PosCategory'].tolist()

# Preload football dataset variables
if os.path.exists('football.csv'):
    df_football = pd.read_csv('football.csv', skipinitialspace=True)
    df_football.columns = df_football.columns.str.strip()
    np_ratings = df_football['rating'].values
    np_paces = pd.to_numeric(df_football['pace'], errors='coerce').fillna(0).values
    np_shootings = pd.to_numeric(df_football['shooting'], errors='coerce').fillna(0).values

# Run history code
history_code = ${JSON.stringify(historyCode)}
if history_code:
    exec(history_code, globals())

# Run shell command
cmd = ${JSON.stringify(command)}
if cmd:
    try:
        res = eval(cmd, globals())
        if res is not None:
            print(repr(res))
    except SyntaxError:
        exec(cmd, globals())

# Inspect variables at the end
import json
try:
    user_vars = {}
    for k, v in list(globals().items()):
        if k.startswith('_') or k in ['pd', 'np', 'warnings', 'os', 'history_code', 'cmd', 'res', 'json', 'user_vars', 'k', 'v', 'scriptContent', 'scriptPath', 'expected_code', 'solution_code', 'datasetFile', 'datasetPath', 'fileName']:
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
    const scriptPath = path.join(tmpDir, 'shell_cmd.py')
    fs.writeFileSync(scriptPath, scriptContent)

    // Execute the script
    const venvPython = path.resolve(__dirname, '../../venv/bin/python3')
    const pythonExe = fs.existsSync(venvPython) ? venvPython : (process.env.PYTHON_EXECUTABLE || 'python3')
    
    const output = execSync(
      `"${pythonExe}" "${scriptPath}"`,
      {
        timeout: 5000,
        maxBuffer: 1024 * 1024,
        env: { PATH: process.env.PATH }
      }
    )
    
    let outputStr = output.toString()
    let vars = {}
    const varsMatch = outputStr.match(/__DC_VARS_START__(.*?)__DC_VARS_END__/)
    if (varsMatch) {
      try {
        vars = JSON.parse(varsMatch[1])
      } catch (e) {}
      outputStr = outputStr.replace(/__DC_VARS_START__(.*?)__DC_VARS_END__/, '')
    }

    return {
      success: true,
      output: outputStr.trim(),
      error: null,
      vars
    }
  } catch (err) {
    let errorText = err.stderr ? err.stderr.toString().trim() : err.message
    errorText = errorText.replace(new RegExp(tmpDir + '/shell_cmd.py', 'g'), 'shell.py')
    
    return {
      success: false, 
      output: '',
      error: errorText,
      vars: {}
    }
  } finally {
    // Clean up temp directory
    try { 
      fs.rmSync(tmpDir, { recursive: true }) 
    } catch(e) {}
  }
}
