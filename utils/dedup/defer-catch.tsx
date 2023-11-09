export async function deferCatch(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (error) {
    console.log(error);
    console.log("formated error:");
    throw error;
  }
}
