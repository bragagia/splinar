// import postgres from "postgres";

const connectionString = process.env.DATABASE_URL!;
// export const rawsql = postgres(connectionString);

import { Client, QueryConfig } from "pg";

export async function rawsql(
  queryTextOrConfig: string | QueryConfig<any[]>,
  ...values: any[]
) {
  const client = new Client({
    connectionString: connectionString,
  });
  await client.connect();

  const res = await client.query(queryTextOrConfig, values);

  await client.end();

  return res;
}
