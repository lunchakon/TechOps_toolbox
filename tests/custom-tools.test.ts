import { afterEach, describe, expect, it, vi } from 'vitest'
import { ICONS, loadCustomTools, parseCustomTools } from '@/lib/custom-tools'

const valid = { sections: [{ title: 'Internal apps', tools: [{ name: 'ExampleApp', description: 'Lookup', url: 'http://app.example.local:9001/', icon: 'search' }] }] }

describe('parseCustomTools', () => {
  it('accepts a valid entry and derives the host', () => {
    const r = parseCustomTools(valid)
    expect(r.warnings).toEqual([])
    expect(r.sections).toHaveLength(1)
    expect(r.sections[0].title).toBe('Internal apps')
    const t = r.sections[0].tools[0]
    expect(t).toMatchObject({ name: 'ExampleApp', description: 'Lookup', url: 'http://app.example.local:9001/', host: 'app.example.local:9001' })
    expect(t.icon).toBe(ICONS.search)
  })

  it('supports multiple sections and entries, preserving order', () => {
    const r = parseCustomTools({
      sections: [
        { title: 'A', tools: [{ name: 'one', url: 'https://a.example' }, { name: 'two', url: 'https://b.example/x?y=1' }] },
        { title: 'B', tools: [{ name: 'three', url: 'http://c.local:8080' }] },
      ],
    })
    expect(r.sections.map((s) => s.title)).toEqual(['A', 'B'])
    expect(r.sections[0].tools.map((t) => t.name)).toEqual(['one', 'two'])
  })

  it('defaults the section title and the icon, trims text', () => {
    const r = parseCustomTools({ sections: [{ tools: [{ name: '  Wiki ', url: ' https://wiki.local ', icon: 'nonsense', description: '  hi  ' }] }] })
    expect(r.sections[0].title).toBe('Custom tools')
    const t = r.sections[0].tools[0]
    expect(t.name).toBe('Wiki')
    expect(t.description).toBe('hi')
    expect(t.icon).toBe(ICONS['external-link'])
  })

  it.each([
    ['javascript:', 'javascript:alert(1)'],
    ['data:', 'data:text/html,<script>alert(1)</script>'],
    ['file:', 'file:///etc/passwd'],
    ['ftp:', 'ftp://host/x'],
  ])('rejects %s links', (_label, url) => {
    const r = parseCustomTools({ sections: [{ title: 'S', tools: [{ name: 'bad', url }] }] })
    expect(r.sections).toEqual([])
    expect(r.warnings.join(' ')).toMatch(/http|valid absolute URL/)
  })

  it('rejects relative URLs, missing URLs and embedded credentials', () => {
    const r = parseCustomTools({
      sections: [{ title: 'S', tools: [{ name: 'rel', url: '/foo' }, { name: 'nourl' }, { name: 'cred', url: 'http://user:pw@host/' }, { name: 'ok', url: 'http://ok/' }] }],
    })
    expect(r.sections[0].tools.map((t) => t.name)).toEqual(['ok'])
    expect(r.warnings).toHaveLength(3)
    expect(r.warnings.some((w) => /credentials/.test(w))).toBe(true)
  })

  it('reports entries without a name or of the wrong type', () => {
    const r = parseCustomTools({ sections: [{ title: 'S', tools: [{ url: 'http://x/' }, 'nope', 42, { name: 'ok', url: 'http://x/' }] }] })
    expect(r.sections[0].tools).toHaveLength(1)
    expect(r.warnings).toHaveLength(3)
  })

  it('drops sections left without valid tools and reports malformed sections', () => {
    const r = parseCustomTools({ sections: [{ title: 'Empty', tools: [] }, { title: 'Broken' }, 'x'] })
    expect(r.sections).toEqual([])
    expect(r.warnings).toHaveLength(2)
  })

  it.each([null, [], 'text', 5, {}, { sections: 'no' }])('rejects a malformed root: %j', (root) => {
    const r = parseCustomTools(root)
    expect(r.sections).toEqual([])
    expect(r.warnings).toHaveLength(1)
  })

  it('never renders the same link as HTML: names stay plain strings', () => {
    const r = parseCustomTools({ sections: [{ title: '<b>S</b>', tools: [{ name: '<img src=x onerror=alert(1)>', url: 'http://x/' }] }] })
    expect(r.sections[0].tools[0].name).toBe('<img src=x onerror=alert(1)>') // kept as text; React escapes it on render
  })
})

describe('loadCustomTools', () => {
  afterEach(() => vi.unstubAllGlobals())
  const respond = (body: string, status = 200) => vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status })))

  it('loads and validates the file without caching', async () => {
    respond(JSON.stringify(valid))
    const r = await loadCustomTools()
    expect(r.sections[0].tools[0].name).toBe('ExampleApp')
    expect(fetch).toHaveBeenCalledWith('/config/custom-tools.json', expect.objectContaining({ cache: 'no-store' }))
  })
  it('treats a missing file (404) as no custom tools, without warnings', async () => {
    respond('Not found', 404)
    expect(await loadCustomTools()).toEqual({ sections: [], warnings: [] })
  })
  it('treats an HTML fallback page as no file', async () => {
    respond('<!doctype html><html></html>')
    expect(await loadCustomTools()).toEqual({ sections: [], warnings: [] })
  })
  it('warns about invalid JSON', async () => {
    respond('{ "sections": [ ')
    const r = await loadCustomTools()
    expect(r.sections).toEqual([])
    expect(r.warnings[0]).toMatch(/not valid JSON/)
  })
  it('warns about server errors', async () => {
    respond('boom', 500)
    expect((await loadCustomTools()).warnings[0]).toMatch(/HTTP 500/)
  })
  it('survives network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    expect(await loadCustomTools()).toEqual({ sections: [], warnings: [] })
  })
})
