import { runRegex } from './logic'

interface Req {
  id: number
  pattern: string
  flags: string
  text: string
}

const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<Req>) => void) | null
  postMessage: (msg: unknown) => void
}

ctx.onmessage = (e) => {
  const { id, pattern, flags, text } = e.data
  ctx.postMessage({ id, result: runRegex(pattern, flags, text) })
}
