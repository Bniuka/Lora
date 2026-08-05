import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gpxnalcfagzmewulvjcf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdweG5hbGNmYWd6bWV3dWx2amNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MDEzMzgsImV4cCI6MjA5NjQ3NzMzOH0.otCNYffDppFkt6Q7xOGLhnbePuotvwGvabixTj8-Lq4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('profiles').select('*, creator_profiles(*)').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success:', data);
  }
}

test();
