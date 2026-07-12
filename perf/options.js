// Builds k6 `options` (scenarios + thresholds) from a single overall TPS
// target, so the exact same shape runs at today's NFR and the
// future-projected NFR by changing one number (PERF_TARGET_TPS).
//
// Journey mix (per SKILL.md Step 3 / user NFR intake for this app):
//   70% browse, 20% auth, 10% checkout — checkout is over-represented
//   relative to its real share of raw traffic because it's the
//   business-critical write path (stock decrement + order creation).
//
// Rough average iteration duration per journey, used only to size the VU
// pool generously (Little's Law: concurrent VUs ~= rate x duration) — not
// a correctness-critical number, just needs to not undersize maxVUs.
const AVG_ITERATION_SECONDS = { browse: 1.5, auth: 0.4, checkout: 0.6 }
const JOURNEY_WEIGHTS = { browse: 0.7, auth: 0.2, checkout: 0.1 }

function vuSizing(ratePerSecond, avgIterationSeconds) {
  const concurrentEstimate = Math.max(1, ratePerSecond * avgIterationSeconds)
  return {
    preAllocatedVUs: Math.max(2, Math.ceil(concurrentEstimate * 2)),
    maxVUs: Math.max(5, Math.ceil(concurrentEstimate * 4)),
  }
}

// stages: { ramp, hold, rampDown } as k6 duration strings, e.g. '1m', '30s'.
export function buildOptions(targetTps, stages) {
  const scenarios = {}
  for (const [journey, weight] of Object.entries(JOURNEY_WEIGHTS)) {
    const ratePerMinute = Math.max(1, Math.round(targetTps * weight * 60))
    const ratePerSecond = ratePerMinute / 60
    const { preAllocatedVUs, maxVUs } = vuSizing(ratePerSecond, AVG_ITERATION_SECONDS[journey])
    scenarios[journey] = {
      executor: 'ramping-arrival-rate',
      exec: journey,
      startRate: 0,
      timeUnit: '1m',
      preAllocatedVUs,
      maxVUs,
      stages: [
        { target: ratePerMinute, duration: stages.ramp },
        { target: ratePerMinute, duration: stages.hold },
        { target: 0, duration: stages.rampDown },
      ],
      tags: { journey },
    }
  }

  const thresholds = {
    'http_req_duration{scenario:browse}': ['p(95)<300', 'p(99)<800'],
    'http_req_duration{scenario:auth}': ['p(95)<300', 'p(99)<800'],
    'http_req_duration{scenario:checkout}': ['p(95)<600', 'p(99)<1500'],
    'http_req_failed{scenario:browse}': ['rate<0.01'],
    'http_req_failed{scenario:auth}': ['rate<0.01'],
    'http_req_failed{scenario:checkout}': ['rate<0.01'],
    dropped_iterations: ['rate<0.01'],
  }

  return { scenarios, thresholds }
}
