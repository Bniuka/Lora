require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: { user } } = await supabase.auth.getUser(); // Cannot do this with anon key without token, so I will select the first creator_profile

  const { data: profile } = await supabase.from('creator_profiles').select('id').limit(1).single();
  
  if (profile) {
    const { error } = await supabase.from('creator_profiles').update({
        payment_link: 'https://test.com',
        payment_option: 'link',
        about: 'test',
        category: 'Technology'
    }).eq('id', profile.id);
    console.log("Update creator_profiles error:", error);
  }
}

check();
