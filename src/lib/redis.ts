// BullMQ bundles its own ioredis, so we export a plain connection options object.
// For direct redis usage elsewhere, import ioredis separately.
export const redis = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  password: process.env.REDIS_PASSWORD ?? undefined,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  maxRetriesPerRequest: null as null,
}
