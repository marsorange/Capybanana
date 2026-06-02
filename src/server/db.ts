import postgres from "postgres";

function postgresUrl(): string | null {
  return (
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    null
  );
}

const url = postgresUrl();

export const SQL_PERSISTENT = url !== null;

export function sqlDb(): ReturnType<typeof postgres> {
  if (!url) {
    throw new Error(
      "Missing POSTGRES_URL/POSTGRES_PRISMA_URL/POSTGRES_URL_NON_POOLING for SQL storage.",
    );
  }

  const g = globalThis as typeof globalThis & {
    __capySql?: ReturnType<typeof postgres>;
  };

  return (g.__capySql ??= postgres(url, {
    max: 1,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 15,
  }));
}
