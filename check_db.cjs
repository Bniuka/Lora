require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  console.log("Checking creator_bank_details...");
  const { data, error } = await supabase.from('creator_bank_details').select('*').limit(1);
  if (error) {
    console.error("Error with creator_bank_details:", error.message);
  } else {
    console.log("creator_bank_details exists:", data);
  }
}

check();
