export function splitArrayIntoChunks<T>(array: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) throw new Error("chunkSize must be greater than 0");

  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}
