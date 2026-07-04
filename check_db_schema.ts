import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;
if (!url || !key) {
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set');
}
const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('profiles').select('telegram_chat_id').limit(1);
  if (error) {
    console.error("Profiles error:", error.message);
  } else {
    console.log("Profiles telegram_chat_id exists.");
  }
  const { data: msgData, error: msgErr } = await supabase.from('course_telegram_messages').select('id').limit(1);
  if (msgErr) {
    console.error("Messages error:", msgErr.message);
  } else {
    console.log("course_telegram_messages table exists.");
  }
}

check().catch((err) => {
  console.error('Schema check failed:', err);
  process.exitCode = 1;
});

