import pino from 'pino'
import { trace } from '@opentelemetry/api'

const otelEnabled = process.env.OTEL_ENABLED === 'true'

// Always print to stdout (fd 1, not the POSIX-only '/dev/stdout' path — this
// runs on Windows too); additionally ship to Loki via OTLP when instrumentation
// is on. Two separate worker-thread targets, same log object fanned out to both.
const targets = [{ target: 'pino/file', level: process.env.LOG_LEVEL || 'info', options: { destination: 1 } }]
if (otelEnabled) {
  targets.push({
    target: 'pino-opentelemetry-transport',
    level: process.env.LOG_LEVEL || 'info',
    options: {
      loggerName: process.env.OTEL_SERVICE_NAME || 'smartbuy-api',
      resourceAttributes: { 'service.name': process.env.OTEL_SERVICE_NAME || 'smartbuy-api' },
    },
  })
}

// Stamps every log line with the active span's trace_id/span_id (when OTel
// instrumentation is running) so a log line and a Tempo trace are one click
// apart in Grafana. A no-op when OTEL_ENABLED isn't set — trace.getActiveSpan()
// just returns undefined.
//
// trace_flags is required too, not just trace_id/span_id: pino-opentelemetry-transport's
// loadContext() (lib/otlp-logger-shim.js) only promotes these into the emitted
// LogRecord's native trace context if all three are present — otherwise it
// silently drops them instead of falling back to plain attributes (confirmed
// by reading its source after seeing trace_id missing entirely from Loki).
export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    mixin() {
      const spanContext = trace.getActiveSpan()?.spanContext()
      if (!spanContext) return {}
      return { trace_id: spanContext.traceId, span_id: spanContext.spanId, trace_flags: spanContext.traceFlags }
    },
  },
  pino.transport({ targets }),
)
