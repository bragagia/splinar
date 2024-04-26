//import * as Sentry from "@sentry/node";

export function captureException(e: any, ...optionalParams: any[]) {
  console.error("An error occured: ", e, optionalParams);
  //Sentry.captureException(e);
}
