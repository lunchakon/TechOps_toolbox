import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import { TOOLS } from '@/lib/tools'

const renderAt = (path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

describe('navigation', () => {
  it('shows a dashboard with a card for each of the seven tools', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { level: 1, name: 'TechOps Toolbox' })).toBeInTheDocument()
    expect(TOOLS).toHaveLength(7)
    const main = screen.getByRole('main')
    for (const t of TOOLS) {
      expect(within(main).getByRole('link', { name: new RegExp(t.title, 'i') })).toHaveAttribute('href', t.path)
    }
  })

  it('navigates from a dashboard card to the tool page and back via the sidebar', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(within(screen.getByRole('main')).getByRole('link', { name: /Base64 Encoder/i }))
    expect(screen.getByRole('heading', { level: 1, name: /Base64 Encoder/i })).toBeInTheDocument()
    const nav = screen.getAllByRole('navigation', { name: 'Tools' })[0]
    await user.click(within(nav).getByRole('link', { name: 'Dashboard' }))
    expect(screen.getByRole('heading', { level: 1, name: 'TechOps Toolbox' })).toBeInTheDocument()
  })

  it.each(TOOLS.map((t) => [t.title, t.path] as const))('renders the %s page at %s', (title, path) => {
    renderAt(path)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(title.length).toBeGreaterThan(0)
  })

  it('shows a not-found page for unknown routes', () => {
    renderAt('/nope')
    expect(screen.getByText('Page not found')).toBeInTheDocument()
  })

  it('opens and closes the mobile menu', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(document.getElementById('mobile-nav')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(document.getElementById('mobile-nav')).not.toBeInTheDocument()
  })
})

describe('custom tools from config', () => {
  afterEach(() => vi.unstubAllGlobals())
  const stubConfig = (body: unknown, status = 200) =>
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })))

  it('shows configured sections on the dashboard and in the sidebar, opening in a new tab safely', async () => {
    stubConfig({ sections: [{ title: 'Internal apps', tools: [{ name: 'ExampleApp', description: 'Lookup tool', url: 'http://app.example.local:9001/', icon: 'search' }] }] })
    renderAt('/')
    const card = await within(screen.getByRole('main')).findByRole('link', { name: /ExampleApp/ })
    expect(card).toHaveAttribute('href', 'http://app.example.local:9001/')
    expect(card).toHaveAttribute('target', '_blank')
    expect(card).toHaveAttribute('rel', 'noopener noreferrer')
    expect(card).toHaveTextContent('app.example.local:9001')
    expect(card).toHaveTextContent('(opens in new tab)')
    expect(screen.getByRole('heading', { level: 2, name: 'Internal apps' })).toBeInTheDocument()
    const side = within(screen.getAllByRole('navigation', { name: 'Tools' })[0]).getByRole('link', { name: /ExampleApp/ })
    expect(side).toHaveAttribute('href', 'http://app.example.local:9001/')
    expect(side).toHaveAttribute('target', '_blank')
  })

  it('lists ignored entries instead of silently dropping them', async () => {
    stubConfig({ sections: [{ title: 'S', tools: [{ name: 'evil', url: 'javascript:alert(1)' }, { name: 'good', url: 'https://good.example' }] }] })
    renderAt('/')
    expect(await screen.findByText('Some custom tool entries were ignored')).toBeInTheDocument()
    expect(screen.getByText(/only http:\/\/ and https:\/\/ links are allowed/)).toBeInTheDocument()
    expect(within(screen.getByRole('main')).getByRole('link', { name: /good/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /evil/ })).not.toBeInTheDocument()
  })

  it('shows only the built-in tools when there is no config file', async () => {
    stubConfig('Not found', 404)
    renderAt('/')
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
    expect(within(screen.getByRole('main')).getAllByRole('link')).toHaveLength(TOOLS.length)
  })
})

describe('theme', () => {
  it('cycles themes, applies the dark class and remembers the choice', async () => {
    const user = userEvent.setup()
    renderAt('/')
    const toggle = () => screen.getAllByRole('button', { name: /^Theme:/ })[0]
    await user.click(toggle()) // system -> light
    await user.click(toggle()) // light -> dark
    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem('techops.theme')).toBe('dark')
  })
})

describe('Base64 page', () => {
  it('encodes as you type, then swaps direction', async () => {
    const user = userEvent.setup()
    renderAt('/base64')
    await user.type(screen.getByRole('textbox', { name: 'Input' }), 'Hello')
    expect(screen.getByRole('textbox', { name: 'Output' })).toHaveValue('SGVsbG8=')
    expect(screen.getByText(/Base64 is encoding, not encryption/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Swap/ }))
    expect(screen.getByRole('textbox', { name: 'Input' })).toHaveValue('SGVsbG8=')
    expect(screen.getByRole('textbox', { name: 'Output' })).toHaveValue('Hello')
  })

  it('shows an error for malformed Base64 and clears', async () => {
    const user = userEvent.setup()
    renderAt('/base64')
    await user.click(screen.getByRole('button', { name: 'Decode' }))
    await user.type(screen.getByRole('textbox', { name: 'Input' }), 'abc$')
    expect(screen.getByRole('alert')).toHaveTextContent(/Invalid character/)
    await user.click(screen.getByRole('button', { name: /Clear/ }))
    expect(screen.getByRole('textbox', { name: 'Input' })).toHaveValue('')
  })
})

describe('JSON / XML page', () => {
  it('formats JSON and reports errors', async () => {
    const user = userEvent.setup()
    renderAt('/json-xml')
    const input = screen.getByRole('textbox', { name: 'Input' })
    await user.click(input)
    await user.paste('{"a":1}')
    await user.click(screen.getByRole('button', { name: 'Format' }))
    expect(screen.getByRole('textbox', { name: 'Output' })).toHaveValue('{\n  "a": 1\n}')

    await user.clear(input)
    await user.click(input)
    await user.paste('{"a":')
    await user.click(screen.getByRole('button', { name: 'Validate' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid input')
  })

  it('validates XML in XML mode', async () => {
    const user = userEvent.setup()
    renderAt('/json-xml')
    await user.click(screen.getByRole('button', { name: 'XML' }))
    await user.click(screen.getByRole('textbox', { name: 'Input' }))
    await user.paste('<a><b></a>')
    await user.click(screen.getByRole('button', { name: 'Validate' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/Line 1/)
  })
})

describe('JWT page', () => {
  it('decodes a token, states that the signature is not verified, and flags expiry', async () => {
    const user = userEvent.setup()
    renderAt('/jwt')
    expect(screen.getByText('Decoding is not verification')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Sample \(expired\)/ }))
    expect(screen.getByText('Expired')).toBeInTheDocument()
    expect(screen.getByText('https://auth.example.com')).toBeInTheDocument()
    expect(screen.getByText('Signature (not verified)')).toBeInTheDocument()
  })

  it('does not persist the token anywhere', async () => {
    const user = userEvent.setup()
    renderAt('/jwt')
    await user.click(screen.getByRole('button', { name: /Sample \(expired\)/ }))
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
  })

  it('shows a clear error for malformed tokens', async () => {
    const user = userEvent.setup()
    renderAt('/jwt')
    await user.click(screen.getByRole('button', { name: 'Malformed' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/3 dot-separated parts/)
  })
})

describe('Cron page', () => {
  it('shows an explanation and ten upcoming runs', () => {
    renderAt('/cron')
    expect(screen.getByRole('textbox', { name: 'Cron expression' })).toHaveValue('*/15 9-17 * * 1-5')
    expect(screen.getByText('Next 10 runs (Asia/Bangkok)')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').filter((li) => li.closest('ol'))).toHaveLength(10)
  })

  it('rejects unsupported Quartz syntax with an error', async () => {
    const user = userEvent.setup()
    renderAt('/cron')
    const input = screen.getByRole('textbox', { name: 'Cron expression' })
    await user.clear(input)
    await user.type(input, '0 0 12 * * ?')
    expect(screen.getByRole('alert')).toHaveTextContent(/Quartz/)
  })

  it('applies a preset and changing timezone persists the preference', async () => {
    const user = userEvent.setup()
    renderAt('/cron')
    await user.click(screen.getByRole('button', { name: 'Hourly' }))
    expect(screen.getByRole('textbox', { name: 'Cron expression' })).toHaveValue('0 * * * *')
    await user.selectOptions(screen.getByLabelText('Timezone'), 'America/New_York')
    expect(screen.getByText('Next 10 runs (America/New_York)')).toBeInTheDocument()
    expect(localStorage.getItem('techops.timezone')).toBe('America/New_York')
  })
})

describe('Timestamp page', () => {
  it('converts a timestamp and labels the interpreted unit', async () => {
    const user = userEvent.setup()
    renderAt('/timestamp')
    await user.type(screen.getByLabelText('Unix timestamp'), '1700000000000')
    expect(screen.getByText(/Interpreted as/)).toHaveTextContent('milliseconds')
    expect(screen.getAllByText('2023-11-14T22:13:20.000Z').length).toBeGreaterThan(0)
  })
})

describe('Timestamp page: flags and multi-timezone comparison', () => {
  it('shows a flag and the country name beside each zone', async () => {
    const user = userEvent.setup()
    renderAt('/timestamp')
    await user.type(screen.getByLabelText('Unix timestamp'), '1700000000')
    const table = screen.getAllByRole('table')[0]
    expect(within(table).getByText('Thailand')).toBeInTheDocument()
    await waitFor(() => expect(table.querySelector('img[src^="data:image/svg+xml"]')).toBeTruthy())
  })

  it('adds timezones via search, shows them in the results and persists the choice', async () => {
    const user = userEvent.setup()
    renderAt('/timestamp')
    await user.type(screen.getByLabelText('Unix timestamp'), '1700000000')
    await user.click(screen.getByRole('button', { name: /Add timezones/ }))
    await user.type(screen.getByRole('textbox', { name: 'Search timezones' }), 'japan')
    await user.click(within(screen.getByRole('list', { name: 'Timezone results' })).getByRole('checkbox'))
    const table = screen.getAllByRole('table')[0]
    const tokyo = within(table).getByText('Asia/Tokyo').closest('tr')!
    expect(tokyo).toHaveTextContent('Japan')
    expect(tokyo).toHaveTextContent('UTC+09:00')
    expect(tokyo).toHaveTextContent('Wed, 15 Nov 2023 07:13:20') // 22:13:20Z on the 14th + 9h
    expect(localStorage.getItem('techops.compareZones')).toBe('Asia/Tokyo')
  })

  it('supports quick add and removing a compared zone', async () => {
    const user = userEvent.setup()
    renderAt('/timestamp')
    await user.type(screen.getByLabelText('Unix timestamp'), '1700000000')
    await user.click(within(screen.getByLabelText('Quick add')).getByRole('button', { name: /London/ }))
    const table = screen.getAllByRole('table')[0]
    expect(within(table).getByText('Europe/London')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove Europe/London' }))
    expect(within(table).queryByText('Europe/London')).not.toBeInTheDocument()
  })

  it('compares several zones at once and keeps UTC and Bangkok', async () => {
    const user = userEvent.setup()
    renderAt('/timestamp')
    await user.type(screen.getByLabelText('Unix timestamp'), '1700000000')
    for (const city of ['Tokyo', 'Sydney', 'York']) {
      await user.click(within(screen.getByLabelText('Quick add')).getByRole('button', { name: new RegExp(city) }))
    }
    const table = screen.getAllByRole('table')[0]
    expect(within(table).getAllByRole('row')).toHaveLength(1 + 2 + 3) // header + UTC/Bangkok + three compared
    expect(within(table).getByText('Asia/Bangkok')).toBeInTheDocument()
    expect(within(table).getByText('UTC')).toBeInTheDocument()
  })
})

describe('Regex page', () => {
  it('highlights matches for an example and lists capture groups', async () => {
    const user = userEvent.setup()
    renderAt('/regex')
    await user.click(screen.getByRole('button', { name: 'ISO date' }))
    const highlighted = await screen.findByLabelText('Highlighted text')
    expect(within(highlighted).getAllByText(/2025-0[34]-0[19]/)).toHaveLength(2)
    expect(await screen.findByText('Match details')).toBeInTheDocument()
  })

  it('shows an error for an invalid expression', async () => {
    const user = userEvent.setup()
    renderAt('/regex')
    await user.type(screen.getByRole('textbox', { name: 'Regular expression' }), '(')
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid expression')
  })
})

describe('URL page', () => {
  it('encodes and shows a malformed-encoding explanation when decoding', async () => {
    const user = userEvent.setup()
    renderAt('/url')
    await user.type(screen.getByRole('textbox', { name: 'Input' }), 'a b&c')
    expect(screen.getByRole('textbox', { name: 'Output' })).toHaveValue('a%20b%26c')
    await user.click(screen.getByRole('button', { name: 'Decode' }))
    await user.clear(screen.getByRole('textbox', { name: 'Input' }))
    await user.type(screen.getByRole('textbox', { name: 'Input' }), '50% off')
    expect(screen.getByRole('alert')).toHaveTextContent(/two hex digits/)
  })
})
