import { logs } from '@opentelemetry/api-logs';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import {
  NodeTracerProvider,
  BatchSpanProcessor,
} from '@opentelemetry/sdk-trace-node';
import {
  LoggerProvider,
  SimpleLogRecordProcessor,
} from '@opentelemetry/sdk-logs';

const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

export const isOtelEnabled = !!otelEndpoint;

if (isOtelEnabled) {
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'problem5-api',
    [ATTR_SERVICE_VERSION]: '1.0.0',
  });

  // Trace provider
  const tracerProvider = new NodeTracerProvider({
    resource,
    spanProcessors: [
      new BatchSpanProcessor(
        new OTLPTraceExporter({ url: `${otelEndpoint}/v1/traces` }),
      ),
    ],
  });
  tracerProvider.register();

  // Log provider
  const loggerProvider = new LoggerProvider({
    resource,
    processors: [
      new SimpleLogRecordProcessor(
        new OTLPLogExporter({ url: `${otelEndpoint}/v1/logs` }),
      ),
    ],
  });
  logs.setGlobalLoggerProvider(loggerProvider);

  // Graceful shutdown
  process.on('SIGTERM', () => {
    void Promise.all([
      tracerProvider.shutdown(),
      loggerProvider.shutdown(),
    ]).then(() => process.exit(0));
  });
}
