import React from 'react'
import { render } from '@testing-library/react'
import RootLayout, { metadata } from '@/app/layout'

// Mock globals.css import to avoid CSS parse issues
jest.mock('@/app/globals.css', () => ({}))

// Suppress React DEV warning about <html> nesting inside <div> — expected for layout tests
const originalConsoleError = console.error
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : ''
    if (
      msg.includes('<html> cannot be a child of <div>') ||
      msg.includes('cannot be a child of')
    ) {
      return
    }
    originalConsoleError(...args)
  }
})
afterAll(() => {
  console.error = originalConsoleError
})

describe('RootLayout', () => {
  it('renders children inside the document body', () => {
    render(
      <RootLayout>
        <div data-testid="child">Hello</div>
      </RootLayout>,
    )

    // React 19 hoists <html>/<body> to the document singleton,
    // so children appear in document.body
    const child = document.querySelector('[data-testid="child"]')
    expect(child).toBeTruthy()
    expect(child?.textContent).toBe('Hello')
  })

  it('sets lang="en" on the document html element', () => {
    render(
      <RootLayout>
        <p>content</p>
      </RootLayout>,
    )

    // The <html lang="en"> gets applied to the document's html element
    expect(document.documentElement.getAttribute('lang')).toBe('en')
  })

  it('renders content inside the body element', () => {
    render(
      <RootLayout>
        <p>body content</p>
      </RootLayout>,
    )

    expect(document.body).toBeTruthy()
    expect(document.body.textContent).toContain('body content')
  })

  it('renders multiple children', () => {
    render(
      <RootLayout>
        <div data-testid="first">First</div>
        <div data-testid="second">Second</div>
      </RootLayout>,
    )

    expect(document.querySelector('[data-testid="first"]')).toBeTruthy()
    expect(document.querySelector('[data-testid="second"]')).toBeTruthy()
  })
})

describe('metadata', () => {
  it('has the correct title', () => {
    expect(metadata.title).toBe('Danish Weather')
  })

  it('has the correct description', () => {
    expect(metadata.description).toBe(
      'Real-time weather comparison from YR.no and DMI',
    )
  })

  it('has an icon defined', () => {
    expect(metadata.icons).toBeDefined()
    const icons = metadata.icons as { icon: string }
    expect(icons.icon).toContain('data:image/svg+xml')
    expect(icons.icon).toContain('⛅')
  })
})
