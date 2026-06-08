import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function runCode(code, datasetPaths) {
  // 1. Security check
  const blocked = [
    'import os', 'import sys', 'import subprocess',
    'import socket', '__import__', 'exec(', 'eval(',
    'open(', 'os.', 'sys.', 'subprocess.',
    'shutil', 'pathlib', 'glob'
  ]
  
  for (const blockedTerm of blocked) {
    if (code.includes(blockedTerm)) {
      return {
        success: false,
        output: '',
        error: 'Security violation: ' + blockedTerm + ' is not allowed',
        blocked: true
      }
    }
  }

  // 2. Create a temp directory
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
    // 3. Copy dataset files into temp directory
    console.log('datasetPaths:', datasetPaths)
    for (const datasetPath of datasetPaths) {
      console.log('Checking datasetPath:', datasetPath, fs.existsSync(datasetPath))
      if (fs.existsSync(datasetPath)) {
        const fileName = path.basename(datasetPath)
        fs.copyFileSync(datasetPath, path.join(tmpDir, fileName))
        console.log('Copied to:', path.join(tmpDir, fileName))
      } else {
        console.log('Dataset path does not exist:', datasetPath)
      }
    }

    // 4. Build wrapper Python script
    const safeTmpDir = JSON.stringify(tmpDir)
    const scriptContent = `
import pandas as pd
import numpy as np
import warnings
warnings.filterwarnings('ignore')
import os
os.chdir(${safeTmpDir})

${code}
`
    const scriptPath = path.join(tmpDir, 'solution.py')
    fs.writeFileSync(scriptPath, scriptContent)

    // 5. Execute the script
    const pythonExe = process.env.PYTHON_EXECUTABLE || 'python3'
    
    const output = execSync(
      `"${pythonExe}" "${scriptPath}"`,
      {
        timeout: 10000,
        maxBuffer: 1024 * 1024,
        env: { PATH: process.env.PATH }
      }
    )
    
    return {
      success: true,
      output: output.toString().trim(),
      error: null
    }
  } catch (err) {
    let errorText = err.stderr ? err.stderr.toString().trim() : err.message
    // Sanitize the traceback to hide the internal server temp path and wrapper script name
    errorText = errorText.replace(new RegExp(tmpDir + '/solution.py', 'g'), 'script.py')
    
    return {
      success: false, 
      output: '',
      error: errorText
    }
  } finally {
    // Clean up temp directory
    try { 
      fs.rmSync(tmpDir, { recursive: true }) 
    } catch(e) {}
  }
}
