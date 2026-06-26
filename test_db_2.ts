import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { data, error } = await supabase.rpc('get_schema');
  
  // Actually, we can just insert a row to see if avatar_url exists
  const { error: insertError } = await supabase.from('profiles').insert({
    id: '00000000-0000-0000-0000-000000000000',
    full_name: 'Test',
    avatar_url: 'http://test.com'
  });
  console.log("Insert Error:", insertError);
}

run();
