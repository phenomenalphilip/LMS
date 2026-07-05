import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

if (typeof global.WebSocket === 'undefined') {
  (global as any).WebSocket = class { };
}

dotenv.config({ path: path.resolve(process.cwd(), '.env') });



import { Client } from 'pg';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

/**
 * Execute raw DDL using a direct Postgres connection.
 * This avoids relying on Supabase REST API endpoints (like exec_ddl)
 * that might not be precreated on a fresh project.
 */
async function executeSql(sql: string): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set in the environment. " +
      "Please add your direct Postgres connection string to your .env file to run migrations."
    );
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query(sql);
    console.log('SQL executed successfully via direct Postgres connection.');
  } finally {
    await client.end();
  }
}

const migrations: { name: string; sql: string }[] = [
  {
    name: 'add_channel_name_to_community_messages',
    sql: `
      ALTER TABLE community_messages
        ADD COLUMN IF NOT EXISTS channel_name TEXT NOT NULL DEFAULT 'general';

      -- Drop old unique constraint if it exists without channel_name
      ALTER TABLE community_messages
        DROP CONSTRAINT IF EXISTS community_messages_community_id_provider_telegram_message_id_key;

      -- Add composite unique constraint including channel_name for idempotent upserts
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'community_messages_unique_per_channel'
        ) THEN
          ALTER TABLE community_messages
            ADD CONSTRAINT community_messages_unique_per_channel
            UNIQUE (community_id, provider, channel_name, telegram_message_id);
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_community_messages_channel
        ON community_messages (community_id, channel_name, created_at DESC);
    `,
  },
];

async function run() {
  console.log('Running community_messages channel migrations...\n');

  for (const migration of migrations) {
    console.log(`→ ${migration.name}`);
    try {
      await executeSql(migration.sql);
      console.log(`  ✓ Done\n`);
    } catch (err: any) {
      console.error(`  ✗ Failed: ${err.message}\n`);
      console.log('  Hint: Run the SQL below manually in your Supabase SQL Editor:\n');
      console.log(migration.sql);
      process.exit(1);
    }
  }

  console.log('All migrations complete.');
}

run().catch(console.error);

