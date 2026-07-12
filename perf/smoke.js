// Smoke test: short, low-rate sanity check that the scenarios and app
// wiring work end to end. Not sized to any NFR — just fast confirmation
// before committing to a full load run. Safe to run often.
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/3.0.4/dist/bundle.js'
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js'
import { buildOptions } from './options.js'
import { browse, authFlow, checkout } from './scenarios.js'
import { RUN_ID } from './lib/http.js'

const SMOKE_TPS = 1
const stages = {
  ramp: __ENV.PERF_RAMP || '5s',
  hold: __ENV.PERF_HOLD || '15s',
  rampDown: __ENV.PERF_RAMPDOWN || '5s',
}

export const options = buildOptions(SMOKE_TPS, stages)
// Smoke is a wiring sanity check, not an NFR gate — a handful of iterations
// against a cold Neon connection/serverless wake-up is expected to be
// slower than the sustained-load thresholds load.js gates on. Only fail
// smoke on outright breakage (errors/dropped iterations), not on latency.
options.thresholds = {
  http_req_failed: ['rate<0.05'],
  dropped_iterations: ['rate<0.05'],
}

export { browse, checkout }
export function auth() {
  authFlow()
}

export function handleSummary(data) {
  return {
    [`perf/results/smoke-report-${RUN_ID}.html`]: htmlReport(data),
    [`perf/results/smoke-summary-${RUN_ID}.json`]: JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  }
}
