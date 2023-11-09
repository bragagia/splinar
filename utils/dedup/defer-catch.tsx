import { formatError } from "pretty-print-error";

export async function deferCatch(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (error) {
    console.log(error);
    console.log("formated error:");
    console.log(formatError(error));
    throw error;
  }
}
