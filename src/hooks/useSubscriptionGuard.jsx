import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';

export function useSubscriptionGuard() {
  const { creatorProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    const checkSubscription = async () => {
      if (!creatorProfile) return;

      const now = new Date();
      const status = creatorProfile.subscription_status;
      const trialEnds = creatorProfile.trial_ends_at ? new Date(creatorProfile.trial_ends_at) : null;
      const subEnds = creatorProfile.subscription_ends_at ? new Date(creatorProfile.subscription_ends_at) : null;

      let needsUpdate = false;
      let newStatus = status;

      if (status === 'trial') {
        if (trialEnds && trialEnds < now) {
          needsUpdate = true;
          newStatus = 'expired';
        }
      } else if (status === 'active') {
        // Check if an explicit end date or next billing date has passed.
        // If neither is set, this is Lifetime VIP and never expires.
        const activeEnds = subEnds || (creatorProfile.next_billing_date ? new Date(creatorProfile.next_billing_date) : null);
        if (activeEnds && activeEnds < now) {
          needsUpdate = true;
          newStatus = 'expired';
        }
      }

      if (needsUpdate) {
        await supabase
          .from('creator_profiles')
          .update({ subscription_status: newStatus })
          .eq('id', creatorProfile.id);
        
        await refreshProfile();
      }

      const finalStatus = needsUpdate ? newStatus : status;

      if (finalStatus === 'expired' || finalStatus === 'cancelled') {
        if (location.pathname !== '/creator/subscription') {
          navigate('/creator/subscription', { replace: true });
        }
      }
    };

    checkSubscription();

    return () => { isMounted = false; };
  }, [creatorProfile, navigate, location.pathname, refreshProfile]);
}
