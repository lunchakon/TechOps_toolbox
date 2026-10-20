import { Braces, Clock, Dices, FileCode2, KeyRound, Link2, CalendarClock, Regex, type LucideIcon } from 'lucide-react'

export interface ToolMeta {
  id: string
  path: string
  title: string
  short: string
  description: string
  icon: LucideIcon
}

export const TOOLS: ToolMeta[] = [
  {
    id: 'json-xml',
    path: '/json-xml',
    title: 'JSON / XML Formatter',
    short: 'JSON / XML',
    description: 'Format, minify and validate JSON and XML with line and column errors.',
    icon: Braces,
  },
  {
    id: 'timestamp',
    path: '/timestamp',
    title: 'Timestamp & Timezone',
    short: 'Timestamp',
    description: 'Convert Unix seconds/milliseconds, ISO 8601 and timezones with DST awareness.',
    icon: Clock,
  },
  {
    id: 'regex',
    path: '/regex',
    title: 'Regex Tester',
    short: 'Regex',
    description: 'Test patterns, highlight matches and inspect capture groups safely.',
    icon: Regex,
  },
  {
    id: 'base64',
    path: '/base64',
    title: 'Base64 Encoder / Decoder',
    short: 'Base64',
    description: 'Encode and decode UTF-8 text, standard or URL-safe.',
    icon: FileCode2,
  },
  {
    id: 'url',
    path: '/url',
    title: 'URL Encoder / Decoder',
    short: 'URL',
    description: 'Percent-encode components, full URLs and form query values.',
    icon: Link2,
  },
  {
    id: 'jwt',
    path: '/jwt',
    title: 'JWT Decoder',
    short: 'JWT',
    description: 'Inspect JWT headers, claims and expiry locally. Signatures are not verified.',
    icon: KeyRound,
  },
  {
    id: 'password',
    path: '/password',
    title: 'Password Generator',
    short: 'Password',
    description: 'Generate strong random passwords with a secure RNG. Nothing is stored or sent.',
    icon: Dices,
  },
  {
    id: 'cron',
    path: '/cron',
    title: 'Cron Visualizer',
    short: 'Cron',
    description: 'Validate five-field cron, explain it in English and preview the next runs.',
    icon: CalendarClock,
  },
]
