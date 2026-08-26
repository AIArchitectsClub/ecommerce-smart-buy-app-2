// Loaded before any other module via `node --import ./server/instrumentation.js`
// (see the `dev`/`start` scripts in package.json). This ordering is required:
// auto-instrumentation patches express/pg/http by hooking `require`, which
// only works if it runs before those modules are first imported anywhere.
import 'dotenv/config'

if (process.env.OTEL_ENABLED === 'true') {
  // Without this, export failures (bad auth, unreachable endpoint, rejected
  // requests) fail COMPLETELY SILENTLY — reproduced locally by pointing this
  // at the real Grafana Cloud OTLP endpoint with a deliberately invalid auth
  // header: zero output, even after real traffic. Default level is 'error'
  // so this stays quiet in normal operation; override with OTEL_LOG_LEVEL
  // (e.g. 'debug') for deeper diagnosis.
  const { diag, DiagConsoleLogger } = await import('@opentelemetry/api')
  const { diagLogLevelFromString } = await import('@opentelemetry/core')
  diag.setLogger(new DiagConsoleLogger(), diagLogLevelFromString(process.env.OTEL_LOG_LEVEL || 'error'))

  const { NodeSDK } = await import('@opentelemetry/sdk-node')
  const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node')
  const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http')
  const { OTLPMetricExporter } = await import('@opentelemetry/exporter-metrics-otlp-http')
  const { PeriodicExportingMetricReader } = await import('@opentelemetry/sdk-metrics')
  const { resourceFromAttributes } = await import('@opentelemetry/resources')
  const { ATTR_SERVICE_NAME } = await import('@opentelemetry/semantic-conventions')

  // OTEL_EXPORTER_OTLP_ENDPOINT is read directly by the exporters below
  // (standard OTel env var) — each signal appends its own path (/v1/traces,
  // /v1/metrics) to it, so it's deliberately left unset here rather than
  // passed as `url` on each exporter.
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'smartbuy-api',
    }),
    traceExporter: new OTLPTraceExporter(),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter(),
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Every express.static() read of dist/ would otherwise become a span.
        '@opentelemetry/instrumentation-fs': { enabled: false },
        // As of auto-instrumentations-node 0.79 this instrumentation's Express
        // 5 support is broken: patching the router silently breaks matching
        // for some routes (returns Express's default 404 instead of hitting
        // the real handler — reproduced and confirmed locally). HTTP spans
        // (below) and pg spans still cover the request/DB-query path; only
        // the extra per-route-layer span is lost. Re-enable once upstream
        // fixes Express 5 compatibility.
        '@opentelemetry/instrumentation-express': { enabled: false },
      }),
    ],
  })

  sdk.start()
  console.log(
    `[otel] instrumentation started (service=${process.env.OTEL_SERVICE_NAME || 'smartbuy-api'}, endpoint=${
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318'
    })`,
  )

  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => {
      sdk.shutdown().finally(() => process.exit(0))
    })
  }
} else {
  console.log('[otel] disabled (set OTEL_ENABLED=true in .env to enable)')
}
