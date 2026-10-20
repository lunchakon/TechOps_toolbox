import { runRegex, type RegexResult } from './logic'

export const REGEX_TIMEOUT_MS = 1500

const TIMEOUT_ERROR =
  'The pattern took too long and was stopped. It probably suffers from catastrophic backtracking (nested quantifiers such as (a+)+). Simplify the pattern or make alternatives mutually exclusive.'

/**
 * Executes the regex in a Web Worker and terminates it after a timeout, so a pathological pattern
 * cannot freeze the page. Falls back to inline execution only when Workers are unavailable (e.g. tests).
 */
export class RegexRunner {
  private worker: Worker | null = null
  private seq = 0

  run(pattern: string, flags: string, text: string): Promise<RegexResult> {
    if (typeof Worker === 'undefined') return Promise.resolve(runRegex(pattern, flags, text))

    this.cancel()
    const id = ++this.seq
    const worker = new Worker(new URL('./regex.worker.ts', import.meta.url), { type: 'module' })
    this.worker = worker

    return new Promise<RegexResult>((resolve) => {
      const done = (result: RegexResult) => {
        window.clearTimeout(timer)
        worker.terminate()
        if (this.worker === worker) this.worker = null
        resolve(result)
      }
      const timer = window.setTimeout(() => done({ ok: false, error: TIMEOUT_ERROR }), REGEX_TIMEOUT_MS)
      worker.onmessage = (e: MessageEvent<{ id: number; result: RegexResult }>) => {
        if (e.data.id === id) done(e.data.result)
      }
      worker.onerror = () => done({ ok: false, error: 'The regex worker failed to run.' })
      worker.postMessage({ id, pattern, flags, text })
    })
  }

  cancel() {
    this.worker?.terminate()
    this.worker = null
  }
}
