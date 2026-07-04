import { createClient } from '@supabase/supabase-js';

const url = 'https://kpynihtocsflfntzuudp.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtweW5paHRvY3NmbGZudHp1dWRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNDAxMjksImV4cCI6MjA5NzcxNjEyOX0.WGu42AHfTbAzo6W-6p3X2E6NSoaO2-weap7du1KgfPY';
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
check();
