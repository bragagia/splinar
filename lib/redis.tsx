import * as Sentry from "@sentry/node";
import Redis from "ioredis";

export default function newRedisClient() {
  const useTls =
    process.env.REDIS_USE_TLS && process.env.REDIS_USE_TLS === "true";

  const bypassTls =
    process.env.REDIS_BYPASS_TLS && process.env.REDIS_BYPASS_TLS === "true";

  const password = useTls ? process.env.REDIS_PASSWORD : undefined;

  const redis = new Redis(process.env.REDIS_URL!, {
    password: password,

    tls: useTls
      ? bypassTls
        ? {
            checkServerIdentity: (hostname, cert) => {
              return undefined; // TODO: One day, i should find a way to validate the Redis cert even if it's proxied through the ec2 (maybe use the AWS service specialized in proxying, there is a doc about that)
            },
          }
        : {}
      : undefined,

    maxRetriesPerRequest: null,
  });

  redis.on("error", function (e) {
    Sentry.captureException(e);
    throw e;
  });

  return redis;
}
