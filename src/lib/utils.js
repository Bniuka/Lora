import { supabase } from './supabase';

export async function generatePaymentReference() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded 0, O, 1, I
  let isUnique = false;
  let code = '';

  while (!isUnique) {
    let first4 = '';
    let second4 = '';
    for (let i = 0; i < 4; i++) {
      first4 += chars.charAt(Math.floor(Math.random() * chars.length));
      second4 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code = `LORA-${first4}-${second4}`;

    // Verify uniqueness in Supabase
    const { data } = await supabase
      .from('enrollments')
      .select('id')
      .eq('payment_reference_code', code)
      .maybeSingle();
      
    if (!data) {
      isUnique = true;
    }
  }
  
  return code;
}
