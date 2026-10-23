import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import AppLogo from '../components/AppLogo';
import './creator-subscription.css';

const LKR_TO_USD_RATE = 0.0034;
const AMOUNT_LKR = 3499;
const AMOUNT_USD = (AMOUNT_LKR * LKR_TO_USD_RATE).toFixed(2);

export default function CreatorSubscription() {
  const { creatorProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [error, setError] = useState('');

  // Wait for profile to load before determining trial status
  if (creatorProfile === undefined) {
    return (
      <div className="lora-sub" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--brand)' }} />
      </div>
    );
  }

  const isUpgrade = searchParams.get('upgrade') === 'true';
  const isTrialView = creatorProfile?.subscription_status === 'trial' && !isUpgrade;

  useEffect(() => {
    if (isTrialView) return;

    const loadPayPalScript = () => {
      if (window.paypal) {
        setScriptLoaded(true);
        return;
      }
      const script = document.createElement('script');
      // Hide Venmo and PayLater to prevent clutter, but KEEP Card/Credit
      script.src = "https://www.paypal.com/sdk/js?client-id=BAA3LepPjCppAUIZqcUh_cS9FGoyk9NET_68v8caPOhyq4c3wBYkfvyMNDmLJD9jij4qkhnNEEBN1m4hKs&vault=true&intent=subscription&disable-funding=paylater,venmo";
      script.async = true;
      script.onload = () => setScriptLoaded(true);
      document.body.appendChild(script);
    };

    loadPayPalScript();
  }, [isTrialView]);

  useEffect(() => {
    if (!isTrialView && scriptLoaded && window.paypal) {
      const container = document.getElementById('paypal-button-container');
      if (container) {
        container.innerHTML = ''; // Clear container to prevent duplicate buttons
      }

      window.paypal.Buttons({
        style: {
          shape: 'pill',
          color: 'gold',
          layout: 'vertical',
          label: 'paypal'
        },
        createSubscription: (data, actions) => {
          return actions.subscription.create({
            plan_id: 'P-29205712KU195831VNKVYZQQ'
          });
        },
        onApprove: async (data, actions) => {
          try {
            setLoading(true);
            
            await supabase.from('subscription_payments').insert({
              creator_id: creatorProfile.id,
              paypal_order_id: data.subscriptionID, 
              amount: AMOUNT_LKR,
              currency: 'LKR',
              status: 'completed',
              paid_at: new Date().toISOString()
            });

            const now = new Date();
            const nextBilling = new Date();
            nextBilling.setDate(now.getDate() + 30);

            await supabase.from('creator_profiles').update({
              subscription_status: 'active',
              subscription_started_at: now.toISOString(),
              subscription_ends_at: nextBilling.toISOString(),
              next_billing_date: nextBilling.toISOString()
            }).eq('id', creatorProfile.id);

            await refreshProfile();
            
            alert("Subscription activated! Welcome to Lora Pro 🎉");
            
            setTimeout(() => {
              navigate('/creator/dashboard');
            }, 2000);

          } catch (err) {
            console.error(err);
            setError("Payment processing failed. Please contact support.");
            setLoading(false);
          }
        },
        onError: (err) => {
          console.error(err);
          setError("Payment was cancelled or failed. Please try again.");
        }
      }).render('#paypal-button-container');
    }
  }, [isTrialView, scriptLoaded, creatorProfile, navigate, refreshProfile]);

  const isCreatorInTrial = creatorProfile?.subscription_status === 'trial' &&
    (!creatorProfile.trial_ends_at || new Date(creatorProfile.trial_ends_at) > new Date());

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/creator/dashboard');
    }
  };

  const handleStartTrial = () => {
    navigate('/creator/dashboard');
  };

  const features = [
    "Unlimited session packs",
    "Manual payment verification system",
    "Free preview session feature",
    "WhatsApp & Telegram community links",
    "Scheduled Zoom session management",
    "Learner enrollment dashboard",
    "Bank transfer + payment link support",
    "Recording links for missed sessions"
  ];

  return (
    <div className="lora-sub">
      <div className="wrap">
        <div className="grid">
          <div className="text">
            <div className="top-nav">
              <div className="logo">
                <AppLogo role="creator" to="/creator/dashboard" height={36} />
              </div>
              {isCreatorInTrial && (
                <button
                  type="button"
                  onClick={handleGoBack}
                  className="back-btn"
                  aria-label="Go back to previous page"
                >
                  <svg className="ic" viewBox="0 0 24 24">
                    <path d="M19 12H5M11 6l-6 6 6 6" />
                  </svg>
                  Go back
                </button>
              )}
            </div>
            <span className="eyebrow">Lora Pro for creators</span>
            <h1>
              {isTrialView ? (
                <>Start your free <em>month</em></>
              ) : (
                <>Your free trial has <em>ended</em></>
              )}
            </h1>
            <p className="lead">
              {isTrialView
                ? "No payment needed today. Enjoy full access for 30 days, on us."
                : "Subscribe to keep your courses live and continue earning."}
            </p>
          </div>

          <section className="card" aria-label="Creator plan">
            <div className="head">
              <span className="plan">Creator plan</span>
              <div className="price">
                <span className="cur">Rs.</span>
                <span className="num">3,499</span>
                <span className="dec">.00</span>
              </div>
              <div className="per">per month after free trial</div>
            </div>
            <div className="pay">
              {isTrialView ? (
                <>
                  <div className="trial-banner">
                    <b>🎉 First month completely FREE</b>
                    <small>No credit card required to start</small>
                  </div>
                  <button onClick={handleStartTrial} className="trial-btn">
                    Start My Free Month →
                  </button>
                  <p className="live" style={{ marginTop: '14px' }}>
                    After 30 days, Rs. 3,499/month. Cancel anytime.
                  </p>
                </>
              ) : (
                <>
                  {error && <div className="sub-error">{error}</div>}
                  <div style={{ position: 'relative' }}>
                    {loading && (
                      <div className="loading-overlay">
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} />
                      </div>
                    )}
                    <div className="pp" id="paypal-button-container" style={{ minHeight: '50px' }}></div>
                  </div>
                  <p className="powered">
                    <svg className="ic" viewBox="0 0 24 24">
                      <rect x="5" y="11" width="14" height="9" rx="2" />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                    Secure payment · Powered by <b>PayPal</b>
                  </p>
                  <p className="live">Your courses will go live again immediately after payment.</p>
                </>
              )}
            </div>
          </section>

          <div className="featwrap">
            <ul className="feat">
              {features.map((feature, idx) => (
                <li key={idx}>
                  <span className="ck">
                    <svg className="ic" viewBox="0 0 24 24">
                      <path d="m5 12 5 5 9-10" />
                    </svg>
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <p className="foot">
            Questions? <a href="mailto:support@lora.com">Contact us</a> · © 2026 Lora
          </p>
        </div>
      </div>
    </div>
  );
}
