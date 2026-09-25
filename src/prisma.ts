// One shared PrismaClient for the whole app. It opens a connection pool,
// so we create it once and import it everywhere.
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.js'

// Prisma 7 talks to Postgres through a driver adapter. We point the pg driver
// at the same DATABASE_URL the CLI uses for migrations.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })

export const prisma = new PrismaClient({ adapter })

export { Prisma } from '../generated/prisma/client.js'
