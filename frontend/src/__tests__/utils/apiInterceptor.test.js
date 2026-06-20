import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We will inject the script in a fresh environment to test it
describe('apiInterceptor.js', () => {
  let originalWarn
  let originalFetch
  let mockFetch

  beforeEach(() => {
    vi.resetModules()
    originalWarn = console.warn
    console.warn = vi.fn()

    originalFetch = window.fetch
    mockFetch = vi.fn()
    window.fetch = mockFetch
  })

  afterEach(() => {
    console.warn = originalWarn
    window.fetch = originalFetch
  })

  async function loadInterceptor() {
    await import('../../utils/apiInterceptor.js?ts=' + Date.now())
  }

  it('coerces 1/0 to true/false for all 14 known fields in a /api/ request', async () => {
    await loadInterceptor()
    
    const mockData = {
      is_admin: 1,
      is_deleted: 0,
      is_archived: 1,
      has_pdf: 0,
      has_glossary: 1,
      notes_taken: 0,
      was_correct: 1
    }

    mockFetch.mockResolvedValue({
      clone: () => ({ json: async () => JSON.parse(JSON.stringify(mockData)) })
    })

    const response = await window.fetch('/api/test')
    const data = await response.json()

    expect(data).toEqual({
      is_admin: true,
      is_deleted: false,
      is_archived: true,
      has_pdf: false,
      has_glossary: true,
      notes_taken: false,
      was_correct: true
    })
  })

  it('passes through natively true/false values unchanged and issues a warning', async () => {
    await loadInterceptor()
    
    const mockData = {
      is_admin: true,
      is_deleted: false
    }

    mockFetch.mockResolvedValue({
      clone: () => ({ json: async () => JSON.parse(JSON.stringify(mockData)) })
    })

    const response = await window.fetch('/api/test')
    const data = await response.json()

    expect(data.is_admin).toBe(true)
    expect(data.is_deleted).toBe(false)
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("encountered native boolean for 'is_admin'"))
  })

  it('coerces nested arrays and objects', async () => {
    await loadInterceptor()
    
    const mockData = {
      nested: {
        list: [
          { has_pdf: 1 },
          { has_glossary: 0 }
        ]
      }
    }

    mockFetch.mockResolvedValue({
      clone: () => ({ json: async () => JSON.parse(JSON.stringify(mockData)) })
    })

    const response = await window.fetch('/api/test')
    const data = await response.json()

    expect(data.nested.list[0].has_pdf).toBe(true)
    expect(data.nested.list[1].has_glossary).toBe(false)
  })

  it('passes through completely untouched for URLs not matching /api/', async () => {
    await loadInterceptor()
    
    const mockData = { is_admin: 1 }
    // Non-api URL
    mockFetch.mockResolvedValue({
      clone: () => ({ json: async () => JSON.parse(JSON.stringify(mockData)) }),
      json: async () => JSON.parse(JSON.stringify(mockData))
    })

    const response = await window.fetch('https://external.com/data')
    const data = await response.json()

    expect(data.is_admin).toBe(1)
  })

  it('leaves matching field names with non-1/0 values untouched', async () => {
    await loadInterceptor()
    
    const mockData = { was_correct: "yes" }
    mockFetch.mockResolvedValue({
      clone: () => ({ json: async () => JSON.parse(JSON.stringify(mockData)) })
    })

    const response = await window.fetch('/api/test')
    const data = await response.json()

    expect(data.was_correct).toBe("yes")
  })

  it('does not crash if response is not JSON-parseable or .json() is not called', async () => {
    await loadInterceptor()
    
    mockFetch.mockResolvedValue({
      clone: () => ({ json: async () => { throw new Error('Not JSON') } }),
      text: async () => "Not JSON"
    })

    const response = await window.fetch('/api/test')
    const text = await response.text()
    
    expect(text).toBe("Not JSON")
  })
})
