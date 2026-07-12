// Load test: sustained run at the NFR-derived target rate.
//
// Default target is today's expected steady-state TPS (5, per NFR intake).
// Re-run the identical script at the future-projected rate with:
//   k6 run -e PERF_TARGET_TPS=10 perf/load.js
// Stage durations default to a realistic ramp/hold/ramp-down shape; override
// via PERF_RAMP/PERF_HOLD/PERF_RAMPDOWN for a shorter validation run.
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/3.0.4/dist/bundle.js'
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js'
import { buildOptions } from './options.js'
import { browse, checkout, authFlow } from './scenarios.js'
import { RUN_ID } from './lib/http.js'

const TARGET_TPS = Number(__ENV.PERF_TARGET_TPS || 5)
const stages = {
  ramp: __ENV.PERF_RAMP || '1m',
  hold: __ENV.PERF_HOLD || '3m',
  rampDown: __ENV.PERF_RAMPDOWN || '30s',
}

export const options = buildOptions(TARGET_TPS, stages)

export { browse, checkout }
export function auth() {
  authFlow()
}

export function handleSummary(data) {
  return {
    [`perf/results/load-report-${RUN_ID}.html`]: htmlReport(data),
    [`perf/results/load-summary-${RUN_ID}.json`]: JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  }
}
