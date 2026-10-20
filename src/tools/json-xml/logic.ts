import { XMLBuilder, XMLParser, XMLValidator } from 'fast-xml-parser'
import { offsetToLineCol } from '@/lib/utils'

export interface FormatError {
  message: string
  line?: number
  column?: number
}

export type FormatResult = { ok: true; output: string } | { ok: false; error: FormatError }

const EMPTY = { ok: false, error: { message: 'Input is empty.' } } as const

/**
 * Strict JSON scanner used only to locate a syntax error when the engine's message carries no position
 * (newer V8 reports e.g. `Unexpected token 'o', "..." is not valid JSON`). Returns the offset or null if valid.
 */
function findJsonErrorOffset(s: string): number | null {
  let i = 0
  const fail = (): never => {
    throw i
  }
  const ws = () => {
    while (i < s.length && ' \t\n\r'.includes(s[i])) i++
  }
  const str = () => {
    i++
    while (i < s.length) {
      const c = s[i]
      if (c === '"') {
        i++
        return
      }
      if (c === '\\') {
        i++
        if (s[i] === 'u') {
          if (!/^[0-9a-fA-F]{4}$/.test(s.slice(i + 1, i + 5))) fail()
          i += 5
        } else if ('"\\/bfnrt'.includes(s[i] ?? 'x')) i++
        else fail()
      } else if (c < ' ') fail()
      else i++
    }
    fail()
  }
  const num = () => {
    const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(s.slice(i))
    if (!m) fail()
    i += m![0].length
  }
  const value = (): void => {
    ws()
    const c = s[i]
    if (c === '{') {
      i++
      ws()
      if (s[i] === '}') return void i++
      for (;;) {
        ws()
        if (s[i] !== '"') fail()
        str()
        ws()
        if (s[i] !== ':') fail()
        i++
        value()
        ws()
        if (s[i] === ',') {
          i++
          continue
        }
        if (s[i] === '}') return void i++
        fail()
      }
    }
    if (c === '[') {
      i++
      ws()
      if (s[i] === ']') return void i++
      for (;;) {
        value()
        ws()
        if (s[i] === ',') {
          i++
          continue
        }
        if (s[i] === ']') return void i++
        fail()
      }
    }
    if (c === '"') return str()
    if (c === '-' || (c >= '0' && c <= '9')) return num()
    for (const lit of ['true', 'false', 'null']) {
      if (s.startsWith(lit, i)) return void (i += lit.length)
    }
    fail()
  }
  try {
    value()
    ws()
    if (i < s.length) fail()
    return null
  } catch (e) {
    return typeof e === 'number' ? e : null
  }
}

/** Extract line/column from the differing wording of V8, SpiderMonkey and JavaScriptCore JSON errors. */
export function jsonErrorLocation(message: string, text: string): { line?: number; column?: number } {
  const lineCol = /line (\d+) column (\d+)/i.exec(message)
  if (lineCol) return { line: Number(lineCol[1]), column: Number(lineCol[2]) }
  const pos = /position (\d+)/i.exec(message)
  if (pos) return offsetToLineCol(text, Number(pos[1]))
  if (/end of (json )?(input|data)/i.test(message)) return offsetToLineCol(text, text.length)
  return {}
}

function parseJson(input: string): { ok: true; value: unknown } | { ok: false; error: FormatError } {
  if (!input.trim()) return EMPTY
  try {
    return { ok: true, value: JSON.parse(input) }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Invalid JSON'
    let loc = jsonErrorLocation(message, input)
    if (loc.line === undefined) {
      const offset = findJsonErrorOffset(input)
      if (offset !== null) loc = offsetToLineCol(input, offset)
    }
    return { ok: false, error: { message, ...loc } }
  }
}

export function formatJson(input: string, indent: number | '\t' = 2): FormatResult {
  const parsed = parseJson(input)
  if (!parsed.ok) return parsed
  return { ok: true, output: JSON.stringify(parsed.value, null, indent) }
}

export function minifyJson(input: string): FormatResult {
  const parsed = parseJson(input)
  if (!parsed.ok) return parsed
  return { ok: true, output: JSON.stringify(parsed.value) }
}

export function validateJson(input: string): FormatResult {
  const parsed = parseJson(input)
  return parsed.ok ? { ok: true, output: 'Valid JSON' } : parsed
}

export function parseJsonValue(input: string): { ok: true; value: unknown } | { ok: false; error: FormatError } {
  return parseJson(input)
}

// ---------- XML ----------

const parserOptions = {
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  commentPropName: '#comment',
  cdataPropName: '#cdata',
  trimValues: true,
  parseTagValue: false,
  parseAttributeValue: false,
  processEntities: false,
  allowBooleanAttributes: true,
} as const

export function validateXml(input: string): FormatResult {
  if (!input.trim()) return EMPTY
  const result = XMLValidator.validate(input, { allowBooleanAttributes: true })
  if (result === true) return { ok: true, output: 'Valid XML' }
  return { ok: false, error: { message: result.err.msg, line: result.err.line, column: result.err.col } }
}

function rebuildXml(input: string, format: boolean, indent: string): FormatResult {
  const valid = validateXml(input)
  if (!valid.ok) return valid
  try {
    const tree = new XMLParser(parserOptions).parse(input)
    const builder = new XMLBuilder({
      ...parserOptions,
      format,
      indentBy: indent,
      suppressEmptyNode: true,
      suppressBooleanAttributes: false,
    })
    const out = String(builder.build(tree)).trim()
    return { ok: true, output: out }
  } catch (e) {
    return { ok: false, error: { message: e instanceof Error ? e.message : 'Could not process XML' } }
  }
}

export function formatXml(input: string, indent = '  '): FormatResult {
  return rebuildXml(input, true, indent)
}

export function minifyXml(input: string): FormatResult {
  return rebuildXml(input, false, '')
}

/** Heuristic: guess the format from the first non-whitespace character. */
export function detectFormat(input: string): 'json' | 'xml' {
  return input.trimStart().startsWith('<') ? 'xml' : 'json'
}
