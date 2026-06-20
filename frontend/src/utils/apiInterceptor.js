// TEMPORARY: normalizes legacy SQLite integer booleans (0/1) to
// real booleans during the Postgres migration. Remove this once
// all backend routes are converted to Postgres (Stage 3-8) and
// confirmed to return native booleans for all 14 fields listed
// in context/DEPLOYMENT.md's boolean checklist.

const booleanFields = new Set([
  'is_admin', 'is_deleted', 'is_archived', 'has_pdf', 'has_glossary',
  'notes_taken', 'was_correct'
])

let hasWarnedActive = false

function coerceNode(node) {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      coerceNode(node[i])
    }
  } else if (node && typeof node === 'object') {
    for (const key of Object.keys(node)) {
      if (booleanFields.has(key)) {
        if (node[key] === 1) {
          node[key] = true
        } else if (node[key] === 0) {
          node[key] = false
        } else if (typeof node[key] === 'boolean') {
          console.warn(`apiInterceptor.js: encountered native boolean for '${key}'. If all backend routes are converted, this bridge is safe to remove.`)
        }
      }
      coerceNode(node[key])
    }
  }
}

if (typeof window !== 'undefined' && window.fetch) {
  const originalFetch = window.fetch

  window.fetch = async function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || ''
    
    const response = await originalFetch.apply(this, args)
    
    if (url.startsWith('/api/')) {
      if (!hasWarnedActive) {
        console.warn("apiInterceptor.js: temporary boolean-coercion bridge is active. Remove once all backend routes return native Postgres booleans (see context/DEPLOYMENT.md, Stage 3-8 completion).")
        hasWarnedActive = true
      }

      const clonedResponse = response.clone()
      
      response.json = async function() {
        const data = await clonedResponse.json()
        coerceNode(data)
        return data
      }
    }
    
    return response
  }
}
