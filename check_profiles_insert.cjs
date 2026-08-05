require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('profiles').insert({
    id: '00000000-0000-0000-0000-000000000000', // invalid uuid, will fail on FK if not RLS
    role: 'learner',
    first_name: 'Test',
    last_name: 'Test'
  });
  console.log("Error:", error);
}

check();
