import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Globe, Crown, Sparkles, MessageCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { isUserAdmin } from '../lib/admin';
import { FullPageLoader } from '../components/ui';
import AppLogo from '../components/AppLogo';
import ThemeSwitcher from '../components/ThemeSwitcher';
import { normalizeSubWebConfig, saveCreatorSubWebConfig } from '../lib/subWeb';
import './creator-subscription.css';

const PAYPAL_CLIENT_ID =
  'BAA3LepPjCppAUIZqcUh_cS9FGoyk9NET_68v8caPOhyq4c3wBYkfvyMNDmLJD9jij4qkhnNEEBN1m4hKs';
const MONTHLY_PAYPAL_PLAN_ID = 'P-29205712KU195831VNKVYZQQ';

const LKR_TO_USD_RATE = 0.0034;
export const AMOUNT_MONTHLY_LKR = 4999;
export const AMOUNT_ONETIME_LKR = 34499;
const AMOUNT_ONETIME_USD = (AMOUNT_ONETIME_LKR * LKR_TO_USD_RATE).toFixed(2);

const MONTHLY_FEATURES = [
  'Unlimited session packs & multi-packs',
  'Manual bank slip verification system',
  'Free preview session & discount promo codes',
  'WhatsApp & Telegram community links',
  'Scheduled Zoom & YouTube Live management',
  'Learner enrollment & financial reports',
  'Standard creator profile on LoraSpace',
];

const ONETIME_WEBSITE_FEATURES = [
  '🌐 Your Own Subdomain (your-name.loraspace.com)',
  '🎨 Branded Academy Website (Own Logo, Navbar & Theme Colors)',
  '🚫 Competitor-Free Storefront (No links to other teachers)',
  '👑 Lifetime Access — Pay Once, No Monthly Subscription Fees!',
  '🔐 Branded Student Login & Course Checkout Portal',
  '🔗 VIP Custom Domain Ready (e.g. www.youracademy.lk)',
  '✨ Includes ALL Lora Pro Course & Multi-Pack Features Forever',
];

export default function CreatorSubscription() {
  const { user, profile, creatorProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialPlanParam = searchParams.get('plan') === 'onetime' ? 'onetime' : 'monthly';
  const [selectedPlan, setSelectedPlan] = useState(initialPlanParam); // 'monthly' | 'onetime'
  const [loading, setLoading] = useState(false);
  const [scriptModeLoaded, setScriptModeLoaded] = useState(null); // 'monthly' | 'onetime' | null
  const [error, setError] = useState('');

  // 👑 Founders have permanent Lifetime VIP access and never need to subscribe
  useEffect(() => {
    if (isUserAdmin(user?.email)) {
      navigate('/creator/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const isUpgrade = searchParams.get('upgrade') === 'true' || searchParams.get('plan') === 'onetime';
  const isTrialView =
    creatorProfile?.subscription_status === 'trial' && !isUpgrade && selectedPlan === 'monthly';

  const handleSelectPlan = (planKey) => {
    setSelectedPlan(planKey);
    setError('');
    setSearchParams({ upgrade: 'true', plan: planKey }, { replace: true });
  };

  // Load the matching PayPal SDK mode (Subscription vs One-Time Order Capture)
  useEffect(() => {
    if (isTrialView) return;

    const targetMode = selectedPlan;
    const scriptId = 'lora-paypal-sdk-script';
    const existingScript = document.getElementById(scriptId);

    const desiredSrc =
      targetMode === 'onetime'
        ? `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD&intent=capture&disable-funding=paylater,venmo`
        : `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&vault=true&intent=subscription&disable-funding=paylater,venmo`;

    if (existingScript && existingScript.getAttribute('data-mode') === targetMode && window.paypal) {
      setScriptModeLoaded(targetMode);
      return;
    }

    setScriptModeLoaded(null);
    if (existingScript) {
      existingScript.remove();
    }
    try {
      delete window.paypal;
    } catch {
      window.paypal = undefined;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.setAttribute('data-mode', targetMode);
    script.src = desiredSrc;
    script.async = true;
    script.onload = () => setScriptModeLoaded(targetMode);
    script.onerror = () => setError('Could not load PayPal checkout. Please check your connection.');
    document.body.appendChild(script);
  }, [isTrialView, selectedPlan]);

  // Render PayPal buttons once the matching SDK mode is ready
  useEffect(() => {
    if (isTrialView || scriptModeLoaded !== selectedPlan || !window.paypal || !creatorProfile) {
      return;
    }

    const container = document.getElementById('paypal-button-container');
    if (!container) return;
    container.innerHTML = '';

    if (selectedPlan === 'onetime') {
      // ── ONE-TIME OWN ACADEMY WEBSITE CHECKOUT (LKR 34,499 / Dynamic Order Capture) ──
      window.paypal
        .Buttons({
          style: {
            shape: 'pill',
            color: 'gold',
            layout: 'vertical',
            label: 'pay',
          },
          createOrder: (data, actions) => {
            return actions.order.create({
              purchase_units: [
                {
                  description: 'LoraSpace Own Academy Website (Lifetime Sub-Web License)',
                  amount: {
                    currency_code: 'USD',
                    value: AMOUNT_ONETIME_USD,
                  },
                },
              ],
            });
          },
          onApprove: async (data, actions) => {
            try {
              setLoading(true);
              const details = await actions.order.capture();

              await supabase.from('subscription_payments').insert({
                creator_id: creatorProfile.id,
                paypal_order_id: details?.id || data.orderID,
                amount: AMOUNT_ONETIME_LKR,
                currency: 'LKR',
                status: 'completed',
                paid_at: new Date().toISOString(),
              });

              const nowIso = new Date().toISOString();
              await supabase
                .from('creator_profiles')
                .update({
                  subscription_status: 'active',
                  subscription_started_at: nowIso,
                  subscription_ends_at: null,
                  next_billing_date: null,
                })
                .eq('id', creatorProfile.id);

              const currentSubWebCfg = normalizeSubWebConfig(creatorProfile, profile);
              await saveCreatorSubWebConfig(creatorProfile.id, {
                ...currentSubWebCfg,
                has_sub_web: true,
              });

              await refreshProfile();
              alert('🎉 Congratulations! Your Own Academy Website (Lifetime License) is now unlocked!');
              navigate('/creator/website');
            } catch (err) {
              console.error(err);
              setError('One-time payment capture failed. Please contact support.');
              setLoading(false);
            }
          },
          onError: (err) => {
            console.error(err);
            setError('Payment was cancelled or could not be completed. Please try again.');
          },
        })
        .render('#paypal-button-container');
    } else {
      // ── MONTHLY RECURRING SUBSCRIPTION CHECKOUT (LKR 4,999 / month) ──
      window.paypal
        .Buttons({
          style: {
            shape: 'pill',
            color: 'gold',
            layout: 'vertical',
            label: 'paypal',
          },
          createSubscription: (data, actions) => {
            return actions.subscription.create({
              plan_id: MONTHLY_PAYPAL_PLAN_ID,
            });
          },
          onApprove: async (data) => {
            try {
              setLoading(true);

              await supabase.from('subscription_payments').insert({
                creator_id: creatorProfile.id,
                paypal_order_id: data.subscriptionID,
                amount: AMOUNT_MONTHLY_LKR,
                currency: 'LKR',
                status: 'completed',
                paid_at: new Date().toISOString(),
              });

              const now = new Date();
              const nextBilling = new Date();
              nextBilling.setDate(now.getDate() + 30);

              await supabase
                .from('creator_profiles')
                .update({
                  subscription_status: 'active',
                  subscription_started_at: now.toISOString(),
                  subscription_ends_at: nextBilling.toISOString(),
                  next_billing_date: nextBilling.toISOString(),
                })
                .eq('id', creatorProfile.id);

              await refreshProfile();
              alert('Subscription activated! Welcome to Lora Pro 🎉');

              setTimeout(() => {
                navigate('/creator/dashboard');
              }, 1500);
            } catch (err) {
              console.error(err);
              setError('Payment processing failed. Please contact support.');
              setLoading(false);
            }
          },
          onError: (err) => {
            console.error(err);
            setError('Payment was cancelled or failed. Please try again.');
          },
        })
        .render('#paypal-button-container');
    }
  }, [isTrialView, scriptModeLoaded, selectedPlan, creatorProfile, profile, navigate, refreshProfile]);

  if (creatorProfile === undefined) {
    return <FullPageLoader message="Loading your subscription status..." />;
  }

  const isCreatorInTrial =
    creatorProfile?.subscription_status === 'trial' &&
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

  const activeFeatures =
    selectedPlan === 'onetime' ? ONETIME_WEBSITE_FEATURES : MONTHLY_FEATURES;

  return (
    <div className="lora-sub">
      <div className="wrap">
        <div className="grid">
          <div className="text">
            <div className="top-nav">
              <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <ThemeSwitcher size="sm" />
                <AppLogo role="creator" to="/creator/dashboard" height={52} />
              </div>
              {(isCreatorInTrial || creatorProfile?.subscription_status === 'active') && (
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

            <span className="eyebrow">
              {selectedPlan === 'onetime'
                ? '🌐 White-Label Own Academy Website'
                : 'Lora Pro for creators'}
            </span>

            <h1>
              {selectedPlan === 'onetime' ? (
                <>
                  Own your <em>Academy Website</em>
                </>
              ) : isTrialView ? (
                <>
                  Start your free <em>month</em>
                </>
              ) : (
                <>
                  Choose your <em>Creator Plan</em>
                </>
              )}
            </h1>

            <p className="lead">
              {selectedPlan === 'onetime'
                ? 'Get your own standalone branded website (your-name.loraspace.com) for a single one-time investment — with zero monthly subscription fees.'
                : isTrialView
                ? 'No payment needed today. Enjoy full access for 30 days, on us.'
                : 'Keep your courses live with a monthly plan, or unlock your own branded Academy Website forever.'}
            </p>

            {/* Plan Switcher Cards */}
            <div className="sub-plan-switcher">
              <button
                type="button"
                onClick={() => handleSelectPlan('monthly')}
                className={`sub-plan-option ${selectedPlan === 'monthly' ? 'active' : ''}`}
              >
                <div className="sub-plan-opt-top">
                  <span className="sub-plan-opt-name">Monthly Creator Plan</span>
                  <span className="sub-plan-opt-price">Rs. 4,999 / mo</span>
                </div>
                <span className="sub-plan-opt-desc">
                  Standard creator profile on LoraSpace · Cancel anytime
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPlan('onetime')}
                className={`sub-plan-option onetime ${selectedPlan === 'onetime' ? 'active' : ''}`}
              >
                <span className="sub-plan-popular-tag">
                  <Crown size={11} /> BEST VALUE · OWN WEBSITE
                </span>
                <div className="sub-plan-opt-top">
                  <span className="sub-plan-opt-name">Own Academy Website (Sub-Web)</span>
                  <span className="sub-plan-opt-price">Rs. 34,499 One-Time</span>
                </div>
                <span className="sub-plan-opt-desc">
                  Your own branded website (your-academy.loraspace.com) + Lifetime Access
                </span>
              </button>
            </div>
          </div>

          <section className={`card ${selectedPlan === 'onetime' ? 'card-onetime' : ''}`} aria-label="Creator plan">
            <div className={`head ${selectedPlan === 'onetime' ? 'head-onetime' : ''}`}>
              <span className="plan">
                {selectedPlan === 'onetime' ? '🌐 Own Academy Website + Lifetime' : 'Creator Monthly Plan'}
              </span>
              <div className="price">
                <span className="cur">Rs.</span>
                <span className="num">
                  {selectedPlan === 'onetime' ? '34,499' : '4,999'}
                </span>
                <span className="dec">.00</span>
              </div>
              <div className="per">
                {selectedPlan === 'onetime'
                  ? 'one-time payment · lifetime access (no monthly fee)'
                  : 'per month after free trial'}
              </div>
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
                    After 30 days, Rs. 4,999/month — or upgrade to Own Website (Rs. 34,499 one-time).
                  </p>
                </>
              ) : (
                <>
                  {error && <div className="sub-error">{error}</div>}
                  <div style={{ position: 'relative' }}>
                    {(loading || scriptModeLoaded !== selectedPlan) && (
                      <div className="loading-overlay">
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} />
                      </div>
                    )}
                    <div className="pp" id="paypal-button-container" style={{ minHeight: '54px' }}></div>
                  </div>
                  <p className="powered">
                    <svg className="ic" viewBox="0 0 24 24">
                      <rect x="5" y="11" width="14" height="9" rx="2" />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                    {selectedPlan === 'onetime' ? (
                      <>
                        Instant One-Time Checkout · Powered by <b>PayPal / Card</b>
                      </>
                    ) : (
                      <>
                        Secure payment · Powered by <b>PayPal</b>
                      </>
                    )}
                  </p>
                  <p className="live">
                    {selectedPlan === 'onetime'
                      ? '🌐 Your branded Sub-Web Studio & Lifetime VIP status unlock immediately!'
                      : 'Your courses will go live again immediately after payment.'}
                  </p>
                </>
              )}
            </div>
          </section>

          <div className="featwrap">
            <ul className="feat">
              {activeFeatures.map((feature, idx) => (
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
        </div>
      </div>
    </div>
  );
}
