import { config } from "dotenv";
import { defineConfig } from "prisma/config";
import { resolveDatabaseLocation } from "./src/server/db/database-url";

config({ quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node --import tsx scripts/db.ts seed",
  },
  datasource: {
    url: resolveDatabaseLocation(process.env.DATABASE_URL).url,
  },
});

