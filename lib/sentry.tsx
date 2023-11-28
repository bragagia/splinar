import * as Sentry from "@sentry/node";

export function captureException(e: any) {
  console.log("An error occured: ", e);
  Sentry.captureException(e);
}
