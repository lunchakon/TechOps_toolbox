import {
  Activity,
  BookOpen,
  Box,
  Bug,
  Cloud,
  Cpu,
  Database,
  ExternalLink,
  FileText,
  GitBranch,
  Globe,
  HardDrive,
  KeyRound,
  LifeBuoy,
  Link,
  Mail,
  Monitor,
  Network,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Terminal,
  Ticket,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

/** Where the operator-managed list of external tools is served from (mounted file, see README). */
export const CUSTOM_TOOLS_URL = '/config/custom-tools.json'

/** Icon names accepted in custom-tools.json. Unknown names fall back to "external-link". */
export const ICONS: Record<string, LucideIcon> = {
  'external-link': ExternalLink,
  link: Link,
  globe: Globe,
  search: Search,
  server: Server,
  database: Database,
  terminal: Terminal,
  wrench: Wrench,
  book: BookOpen,
  shield: ShieldCheck,
  activity: Activity,
  cloud: Cloud,
  bug: Bug,
  file: FileText,
  key: KeyRound,
  mail: Mail,
  settings: Settings,
  box: Box,
  monitor: Monitor,
  network: Network,
  users: Users,
  ticket: Ticket,
  disk: HardDrive,
  cpu: Cpu,
  git: GitBranch,
  support: LifeBuoy,
}

export interface CustomTool {
  name: string
  description?: string
  url: string
  /** host[:port] shown on the card so users can see where the link goes. */
  host: string
  icon: LucideIcon
}

export interface CustomSection {
  title: string
  tools: CustomTool[]
}

export interface CustomToolsResult {
  sections: CustomSection[]
  /** Problems found in the file. Invalid entries are skipped and reported, never silently accepted. */
  warnings: string[]
}

const MAX_NAME = 60
const MAX_TITLE = 60
const MAX_DESCRIPTION = 200
const MAX_URL = 2000

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function parseTool(raw: unknown, where: string, warnings: string[]): CustomTool | null {
  if (!isRecord(raw)) {
    warnings.push(`${where}: must be an object with "name" and "url".`)
    return null
  }
  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  const label = name ? `${where} ("${name}")` : where
  if (!name || name.length > MAX_NAME) {
    warnings.push(`${label}: "name" is required (max ${MAX_NAME} characters).`)
    return null
  }
  if (typeof raw.url !== 'string' || !raw.url.trim() || raw.url.length > MAX_URL) {
    warnings.push(`${label}: "url" is required.`)
    return null
  }
  let url: URL
  try {
    url = new URL(raw.url.trim())
  } catch {
    warnings.push(`${label}: "${raw.url}" is not a valid absolute URL (include http:// or https://).`)
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    warnings.push(`${label}: only http:// and https:// links are allowed (got ${url.protocol}).`)
    return null
  }
  if (url.username || url.password) {
    warnings.push(`${label}: URLs must not contain embedded credentials.`)
    return null
  }
  const description = typeof raw.description === 'string' ? raw.description.trim().slice(0, MAX_DESCRIPTION) : undefined
  const icon = (typeof raw.icon === 'string' && ICONS[raw.icon.trim().toLowerCase()]) || ExternalLink
  return { name, description: description || undefined, url: url.href, host: url.host, icon }
}

/** Validate the parsed contents of custom-tools.json. */
export function parseCustomTools(data: unknown): CustomToolsResult {
  const warnings: string[] = []
  if (!isRecord(data) || !Array.isArray(data.sections)) {
    return { sections: [], warnings: ['custom-tools.json must be an object with a "sections" array.'] }
  }
  const sections: CustomSection[] = []
  data.sections.forEach((rawSection: unknown, si: number) => {
    const where = `Section ${si + 1}`
    if (!isRecord(rawSection) || !Array.isArray(rawSection.tools)) {
      warnings.push(`${where}: must be an object with a "tools" array.`)
      return
    }
    const title = typeof rawSection.title === 'string' && rawSection.title.trim() ? rawSection.title.trim().slice(0, MAX_TITLE) : 'Custom tools'
    const tools = rawSection.tools
      .map((t: unknown, ti: number) => parseTool(t, `${where} "${title}", entry ${ti + 1}`, warnings))
      .filter((t: CustomTool | null): t is CustomTool => t !== null)
    if (tools.length > 0) sections.push({ title, tools })
  })
  return { sections, warnings }
}

/** Fetch and validate the operator-managed config. A missing file simply means "no custom tools". */
export async function loadCustomTools(signal?: AbortSignal): Promise<CustomToolsResult> {
  const none: CustomToolsResult = { sections: [], warnings: [] }
  try {
    const res = await fetch(CUSTOM_TOOLS_URL, { cache: 'no-store', signal })
    if (res.status === 404) return none
    if (!res.ok) return { sections: [], warnings: [`Could not load custom-tools.json (HTTP ${res.status}).`] }
    const text = await res.text()
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch (e) {
      // A dev server may answer a missing file with index.html; treat that as "no file".
      if (text.trimStart().startsWith('<')) return none
      return { sections: [], warnings: [`custom-tools.json is not valid JSON: ${e instanceof Error ? e.message : 'parse error'}`] }
    }
    return parseCustomTools(data)
  } catch {
    return none // offline, aborted, or no fetch available: the built-in tools still work
  }
}
