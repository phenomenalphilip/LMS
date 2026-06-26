import { createClient } from '@supabase/supabase-js';

// @ts-ignore - Vite specific env access
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kpynihtocsflfntzuudp.supabase.co';
// @ts-ignore
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtweW5paHRvY3NmbGZudHp1dWRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNDAxMjksImV4cCI6MjA5NzcxNjEyOX0.WGu42AHfTbAzo6W-6p3X2E6NSoaO2-weap7du1KgfPY';

export const supabase = createClient(supabaseUrl, supabaseKey);
