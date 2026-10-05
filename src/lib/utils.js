import { supabase } from './supabase';

export async function generatePaymentReference(learnerName = '') {
  const sanitizedName = (learnerName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)) || 'USER';
  let isUnique = false;
  let code = '';

  while (!isUnique) {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    code = `LORA_${sanitizedName}_${randomNum}`;

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

export function hasValidSubscription(creatorProfile) {
  if (!creatorProfile) return false;
  if (creatorProfile.subscription_status === 'active') return true;
  if (creatorProfile.subscription_status === 'trial') {
    return new Date(creatorProfile.trial_ends_at) > new Date();
  }
  return false;
}
