import * as Sentry from "@sentry/node";
import Redis from "ioredis";

export default function newRedisClient() {
  const redis = new Redis(process.env.REDIS_URL!, {
    password: process.env.REDIS_PASSWORD!,

    tls:
      process.env.REDIS_BYPASSTLS && process.env.REDIS_BYPASSTLS === "true"
        ? {
            checkServerIdentity: (hostname, cert) => {
              return undefined; // TODO: One day, i should find a way to validate the Redis cert even if it's proxied through the ec2 (maybe use the AWS service specialized in proxying, there is a doc about that)
            },
          }
        : {},

    maxRetriesPerRequest: null,
  });

  redis.on("error", function (e) {
    Sentry.captureException(e);
    throw e;
  });

  return redis;
}
