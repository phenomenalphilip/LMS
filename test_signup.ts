import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { data, error } = await supabase.auth.signUp({
    email: 'testuser123456@example.com',
    password: 'Password123!',
    options: {
      data: {
        full_name: 'Test User'
      }
    }
  });
  console.log("Data:", JSON.stringify(data));
  console.log("Error:", error);
}

run();
