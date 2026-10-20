import parser from 'cron-parser'
import cronstrue from 'cronstrue'
import { DateTime } from 'luxon'

export interface FieldDef {
  key: 'minute' | 'hour' | 'dayOfMonth' | 'month' | 'dayOfWeek'
  label: string
  min: number
  max: number
  unit: string
  names?: string[]
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

export const FIELDS: FieldDef[] = [
  { key: 'minute', label: 'Minute', min: 0, max: 59, unit: 'minute' },
  { key: 'hour', label: 'Hour', min: 0, max: 23, unit: 'hour' },
  { key: 'dayOfMonth', label: 'Day of month', min: 1, max: 31, unit: 'day' },
  { key: 'month', label: 'Month', min: 1, max: 12, unit: 'month', names: MONTHS },
  { key: 'dayOfWeek', label: 'Day of week', min: 0, max: 7, unit: 'weekday', names: DAYS },
]

export const PRESETS = [
  { label: 'Every minute', expr: '* * * * *' },
  { label: 'Every 15 minutes', expr: '*/15 * * * *' },
  { label: 'Hourly', expr: '0 * * * *' },
  { label: 'Daily at 02:30', expr: '30 2 * * *' },
  { label: 'Weekdays at 09:00', expr: '0 9 * * 1-5' },
  { label: 'Weekly (Sun 00:00)', expr: '0 0 * * 0' },
  { label: 'Monthly (1st 00:00)', expr: '0 0 1 * *' },
]

const MACROS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
}

export type ValidateResult = { ok: true; fields: string[]; normalized: string } | { ok: false; error: string }

export function validateCron(expr: string): ValidateResult {
  const trimmed = expr.trim()
  if (!trimmed) return { ok: false, error: 'Enter a cron expression with five fields, e.g. */5 * * * *.' }

  if (trimmed.startsWith('@')) {
    const equiv = MACROS[trimmed.toLowerCase()]
    return {
      ok: false,
      error: equiv
        ? `Macro "${trimmed}" is not supported. Use its five-field equivalent: ${equiv}`
        : `Macro "${trimmed}" is not supported. Supported input is the standard five-field form (@reboot has no schedule).`,
    }
  }

  const fields = trimmed.split(/\s+/)
  if (fields.length === 6 || fields.length === 7) {
    return {
      ok: false,
      error: `${fields.length} fields found. This tool supports only the standard 5-field Unix format (minute hour day-of-month month day-of-week). Quartz/Spring expressions have a leading seconds field (and optional year) and are not supported.`,
    }
  }
  if (fields.length !== 5) {
    return { ok: false, error: `Expected 5 fields (minute hour day-of-month month day-of-week), found ${fields.length}.` }
  }

  for (let i = 0; i < 5; i++) {
    const def = FIELDS[i]
    const value = fields[i]
    const special = /[?LW#]/i.exec(value.replace(namesPattern(def), ''))
    if (special || value.includes('?') || /#/.test(value)) {
      const ch = value.includes('?') ? '?' : value.includes('#') ? '#' : special![0].toUpperCase()
      return {
        ok: false,
        error: `${def.label} field "${value}": "${ch}" is a Quartz-only extension (L, W, #, ?) and is not valid in 5-field Unix cron. Rewrite it with plain numbers, ranges, lists and steps.`,
      }
    }
    const letters = value.match(/[A-Za-z]+/g) ?? []
    for (const word of letters) {
      if (!def.names || !def.names.includes(word.toUpperCase())) {
        return {
          ok: false,
          error: def.names
            ? `${def.label} field "${value}": unknown name "${word}". Use ${def.names.join(', ')} or numbers.`
            : `${def.label} field "${value}": letters are not allowed here, only numbers and * , - /.`,
        }
      }
    }
    if (/[^A-Za-z0-9*/,-]/.test(value)) {
      return { ok: false, error: `${def.label} field "${value}" contains an unsupported character. Allowed: digits, * , - / (and month/day names where applicable).` }
    }
  }

  try {
    parser.parseExpression(fields.join(' '))
  } catch (e) {
    return { ok: false, error: `Invalid expression: ${e instanceof Error ? e.message : String(e)}` }
  }
  return { ok: true, fields, normalized: fields.join(' ') }
}

function namesPattern(def: FieldDef): RegExp {
  return def.names ? new RegExp(`\\b(${def.names.join('|')})\\b`, 'gi') : /$^/g
}

export function describeCron(expr: string): string | null {
  try {
    return cronstrue.toString(expr.trim(), { use24HourTimeFormat: true, throwExceptionOnParseError: true })
  } catch {
    return null
  }
}

export interface FieldExplanation {
  label: string
  value: string
  allowed: string
  meaning: string
}

function nameOf(def: FieldDef, token: string): string {
  if (/^\d+$/.test(token)) {
    const n = Number(token)
    if (def.key === 'month') return MONTHS[n - 1] ?? token
    if (def.key === 'dayOfWeek') return DAYS[n % 7] ?? token
    return token
  }
  return token.toUpperCase()
}

function explainTerm(def: FieldDef, term: string): string {
  const [rangePart, step] = term.split('/')
  const unit = def.unit
  const plural = (n: string) => (n === '1' ? unit : `${unit}s`)
  if (rangePart === '*') return step ? `every ${step} ${plural(step)}` : `every ${unit}`
  if (rangePart.includes('-')) {
    const [a, b] = rangePart.split('-')
    const base = `${nameOf(def, a)} through ${nameOf(def, b)}`
    return step ? `every ${step} ${plural(step)} from ${base}` : base
  }
  return step ? `every ${step} ${plural(step)} starting at ${nameOf(def, rangePart)}` : nameOf(def, rangePart)
}

export function explainFields(fields: string[]): FieldExplanation[] {
  return FIELDS.map((def, i) => ({
    label: def.label,
    value: fields[i],
    allowed: def.names ? `${def.min}-${def.max} or ${def.names[0]}-${def.names[def.names.length - 1]}${def.key === 'dayOfWeek' ? ' (0 and 7 = Sunday)' : ''}` : `${def.min}-${def.max}`,
    meaning: fields[i].split(',').map((t) => explainTerm(def, t)).join(', and '),
  }))
}

export interface RunTime {
  local: string
  offset: string
  utc: string
  weekday: string
  isDst: boolean
}

export type RunsResult = { ok: true; runs: RunTime[] } | { ok: false; error: string }

/** Next `count` scheduled executions strictly after `from`, evaluated in IANA timezone `tz`. */
export function nextRuns(expr: string, tz: string, count = 10, from: Date = new Date()): RunsResult {
  const valid = validateCron(expr)
  if (!valid.ok) return valid
  if (!DateTime.local().setZone(tz).isValid) return { ok: false, error: `Unknown timezone: ${tz}` }
  try {
    const it = parser.parseExpression(valid.normalized, { currentDate: from, tz })
    const runs: RunTime[] = []
    for (let i = 0; i < count; i++) {
      const d = DateTime.fromJSDate(it.next().toDate(), { zone: tz })
      runs.push({
        local: d.toFormat('yyyy-MM-dd HH:mm'),
        offset: d.toFormat('ZZ'),
        utc: d.toUTC().toFormat("yyyy-MM-dd HH:mm 'UTC'"),
        weekday: d.toFormat('ccc'),
        isDst: d.isInDST,
      })
    }
    return { ok: true, runs }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: /out of range|not found|Invalid explicit/i.test(msg) ? 'This expression never fires (for example, February 30th).' : msg }
  }
}
