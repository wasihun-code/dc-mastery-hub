import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import React from 'react';

global.fetch = vi.fn();

const localStorageMock = (() => {
  let store = {}
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = String(value) }),
    removeItem: vi.fn((key) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    get length() { return Object.keys(store).length },
    key: vi.fn((i) => Object.keys(store)[i] ?? null),
  }
})()
Object.defineProperty(global, 'localStorage', { value: localStorageMock })

Element.prototype.scrollIntoView = vi.fn()
Element.prototype.scrollBy = vi.fn()

vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange }) => (
    React.createElement('textarea', {
      'data-testid': 'monaco-editor',
      value,
      onChange: (e) => onChange?.(e.target.value)
    })
  )
}));

global.ResizeObserver = class {
  constructor(callback) { this.callback = callback }
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

window.AudioContext = vi.fn().mockImplementation(() => ({
  createOscillator: vi.fn().mockReturnValue({
    connect: vi.fn(), start: vi.fn(), stop: vi.fn(),
    frequency: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }
  }),
  createGain: vi.fn().mockReturnValue({
    connect: vi.fn(),
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }
  }),
  destination: {},
  currentTime: 0,
  close: vi.fn()
}))
window.webkitAudioContext = window.AudioContext
