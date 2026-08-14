import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [creatorProfile, setCreatorProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchRef = useRef(null);

  const fetchProfile = useCallback(async (userId) => {
    // De-duplicate concurrent calls for the same user
    if (fetchRef.current) return fetchRef.current;

    fetchRef.current = (async () => {
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*, creator_profiles(*)')
          .eq('id', userId)
          .single();

        if (profileData) {
          const creatorData = profileData.creator_profiles;
          delete profileData.creator_profiles;

          setProfile(profileData);
          if (profileData.role === 'creator') {
            setCreatorProfile(creatorData);
          }
        } else {
          // If profile is missing in DB, insert it so foreign keys don't break
          const { data: authData } = await supabase.auth.getUser();
          const user = authData?.user;
          const email = user?.email || '';
          const meta = user?.user_metadata || {};
          
          const fallbackProfile = { 
            id: userId, 
            role: meta.role || 'learner', 
            first_name: meta.first_name || 'New', 
            last_name: meta.last_name || 'Learner',
            email: email,
            contact_number: meta.contact_number || '0000000000',
            country_code: meta.country_code || 'US'
          };
          
          // Attempt to insert the missing profile
          const { error: insertError } = await supabase.from('profiles').insert(fallbackProfile);
          if (insertError) {
            console.error('[useAuth] Fallback profile insert failed:', insertError);
          }

          if (fallbackProfile.role === 'creator') {
            const now = new Date();
            const trialEnds = new Date(now);
            trialEnds.setDate(now.getDate() + 30);
      
            const creatorFallback = {
              id: userId,
              payment_link: meta.payment_link || '',
              about: meta.about || '',
              category: meta.category || '',
              subscription_status: 'trial',
              trial_started_at: now.toISOString(),
              trial_ends_at: trialEnds.toISOString(),
            };
            const { error: creatorError } = await supabase.from('creator_profiles').insert(creatorFallback);
            if (creatorError) {
              console.error('[useAuth] Fallback creator insert failed:', creatorError);
            }
            setCreatorProfile(creatorFallback);
          }
          
          setProfile(fallbackProfile);
        }
        return profileData;
      } finally {
        fetchRef.current = null;
      }
    })();

    return fetchRef.current;
  }, []);

  useEffect(() => {
    // Use only onAuthStateChange for session management to avoid Web Locks deadlock.
    // Supabase v2 emits INITIAL_SESSION on subscribe, covering the getSession() use case.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        setUser(session.user);
        // Use setTimeout to avoid holding the auth lock while making DB calls
        setTimeout(async () => {
          await fetchProfile(session.user.id);
          setLoading(false);
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setCreatorProfile(null);
        setLoading(false);
      } else if (event === 'INITIAL_SESSION' && !session) {
        // No existing session
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signUp = async ({ email, password, role, firstName, lastName, contactNumber, countryCode, paymentLink, about, category }) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          role,
          contact_number: contactNumber,
          country_code: countryCode,
          payment_link: paymentLink,
          about,
          category
        }
      }
    });

    if (authError) {
      console.error('[useAuth] signUp auth error:', authError.message);
      throw authError;
    }

    if (!authData.user) {
      throw new Error('An account with this email already exists. Try logging in.');
    }

    const userId = authData.user.id;

    // If email confirmation is required, authData.session will be null.
    // We cannot insert into 'profiles' right now because RLS requires an active session.
    // We will rely on fetchProfile's fallback logic to insert it on their first login.
    if (authData.session) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        role,
        first_name: firstName,
        last_name: lastName,
        contact_number: contactNumber,
        country_code: countryCode,
        email,
      });

      if (profileError) {
        console.error('[useAuth] profiles insert error:', profileError.message, profileError);
        throw profileError;
      }

      if (role === 'creator') {
        const now = new Date();
        const trialEnds = new Date(now);
        trialEnds.setDate(now.getDate() + 30);

        const { error: creatorError } = await supabase.from('creator_profiles').insert({
          id: userId,
          payment_link: paymentLink || '',
          about,
          category,
          subscription_status: 'trial',
          trial_started_at: now.toISOString(),
          trial_ends_at: trialEnds.toISOString(),
        });
        if (creatorError) {
          console.error('[useAuth] creator_profiles insert error:', creatorError.message, creatorError);
          throw creatorError;
        }
      }
      await fetchProfile(userId);
    }

    return authData;
  };

  const signIn = async ({ email, password }, setStep) => {
    if (setStep) setStep('Signing in...');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // The onAuthStateChange listener will handle setting user and fetching profile.
    // But we also fetch here so the caller gets the profile data back immediately.
    let profileData = null;
    if (data.user) {
      if (setStep) setStep('Loading your profile...');
      profileData = await fetchProfile(data.user.id);
    }
    if (setStep) setStep('Almost there...');
    return { ...data, profile: profileData };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setCreatorProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      creatorProfile,
      loading,
      signUp,
      signIn,
      signOut,
      refreshProfile,
      isCreator: profile?.role === 'creator',
      isLearner: profile?.role === 'learner',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
