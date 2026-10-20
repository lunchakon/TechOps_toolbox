import { describe, expect, it } from 'vitest'
import { formatJson, formatXml, jsonErrorLocation, minifyJson, minifyXml, validateJson, validateXml } from '@/tools/json-xml/logic'

describe('JSON', () => {
  it('formats with the requested indent', () => {
    const r = formatJson('{"a":1,"b":[1,2]}', 2)
    expect(r).toEqual({ ok: true, output: '{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ]\n}' })
  })
  it('formats with tabs', () => {
    expect(formatJson('{"a":1}', '\t')).toEqual({ ok: true, output: '{\n\t"a": 1\n}' })
  })
  it('minifies', () => {
    expect(minifyJson('{\n "a": 1,\n "b": [1, 2]\n}')).toEqual({ ok: true, output: '{"a":1,"b":[1,2]}' })
  })
  it('keeps unicode intact', () => {
    expect(minifyJson('{"t": "สวัสดี 🌏"}')).toEqual({ ok: true, output: '{"t":"สวัสดี 🌏"}' })
  })
  it('reports an error for invalid JSON with a message', () => {
    const r = validateJson('{"a": 1,}')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.message.length).toBeGreaterThan(0)
  })
  it('reports line and column for multi-line errors', () => {
    const r = formatJson('{\n  "a": 1,\n  "b": oops\n}')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.line).toBe(3)
      expect(r.error.column).toBeGreaterThan(0)
    }
  })
  it('handles empty input', () => {
    const r = formatJson('   ')
    expect(r).toEqual({ ok: false, error: { message: 'Input is empty.' } })
  })
  it('validates valid JSON', () => {
    expect(validateJson('[1,2,3]')).toEqual({ ok: true, output: 'Valid JSON' })
  })
  it('derives location from the different engine message styles', () => {
    expect(jsonErrorLocation('Unexpected token } in JSON at position 4', 'ab\ncd}')).toEqual({ line: 2, column: 2 })
    expect(jsonErrorLocation('... (line 2 column 5)', '')).toEqual({ line: 2, column: 5 })
    expect(jsonErrorLocation('Unexpected end of JSON input', 'a\nbc')).toEqual({ line: 2, column: 3 })
    expect(jsonErrorLocation('something else', 'x')).toEqual({})
  })
})

describe('XML', () => {
  it('validates well-formed XML', () => {
    expect(validateXml('<a><b>x</b></a>')).toEqual({ ok: true, output: 'Valid XML' })
  })
  it('reports line and column for mismatched tags', () => {
    const r = validateXml('<a>\n  <b>x</c>\n</a>')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.line).toBe(2)
      expect(r.error.message).toMatch(/b|c/)
    }
  })
  it('rejects unclosed tags', () => {
    expect(validateXml('<order><item></order>').ok).toBe(false)
  })
  it('formats with indentation', () => {
    const r = formatXml('<a><b>x</b><c id="1"/></a>')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.output).toContain('\n  <b>x</b>')
      expect(r.output).toContain('id="1"')
    }
  })
  it('preserves the declaration, attributes and entities', () => {
    const r = formatXml('<?xml version="1.0"?><a t="x &amp; y"><b>1 &lt; 2</b></a>')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.output.startsWith('<?xml version="1.0"?>')).toBe(true)
      expect(r.output).toContain('t="x &amp; y"')
      expect(r.output).toContain('1 &lt; 2')
      expect(r.output).not.toContain('&amp;amp;')
    }
  })
  it('minifies and strips inter-tag whitespace', () => {
    const r = minifyXml('<a>\n  <b>x</b>\n  <c/>\n</a>')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.output).not.toContain('\n')
      expect(r.output).toContain('<b>x</b>')
    }
  })
  it('does not execute or reinterpret markup: script content stays text', () => {
    const r = formatXml('<a><![CDATA[<script>alert(1)</script>]]></a>')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.output).toContain('<![CDATA[<script>alert(1)</script>]]>')
  })
  it('handles empty input', () => {
    expect(validateXml('')).toEqual({ ok: false, error: { message: 'Input is empty.' } })
  })
})
