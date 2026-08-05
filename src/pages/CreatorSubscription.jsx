import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { PageTransition } from '../components/ui';

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

  const isUpgrade = searchParams.get('upgrade') === 'true';
  const isTrialView = creatorProfile?.subscription_status === 'trial' && !isUpgrade;

  useEffect(() => {
    if (isTrialView) return; // No PayPal needed for free trial start

    const loadPayPalScript = () => {
      if (window.paypal) {
        setScriptLoaded(true);
        return;
      }
      const script = document.createElement('script');
      script.src = "https://www.paypal.com/sdk/js?client-id=EEItlAkQuMS7Zhq7Jhz6wBQpdBuM6sQDi7isAcHtkGhQU6_C0jBxRNhz-mpw1cba27t-XdBb03udjKwe&currency=USD&intent=capture";
      script.async = true;
      script.onload = () => setScriptLoaded(true);
      document.body.appendChild(script);
    };

    loadPayPalScript();
  }, [isTrialView]);

  useEffect(() => {
    if (!isTrialView && scriptLoaded && window.paypal) {
      window.paypal.Buttons({
        createOrder: (data, actions) => {
          return actions.order.create({
            intent: "CAPTURE",
            purchase_units: [{
              amount: {
                currency_code: "USD",
                value: AMOUNT_USD
              },
              description: "Lora Creator Plan - Monthly Subscription"
            }]
          });
        },
        onApprove: async (data, actions) => {
          try {
            setLoading(true);
            const order = await actions.order.capture();
            
            // Insert payment
            await supabase.from('subscription_payments').insert({
              creator_id: creatorProfile.id,
              paypal_order_id: order.id,
              amount: AMOUNT_LKR,
              currency: 'LKR',
              status: 'completed',
              paid_at: new Date().toISOString()
            });

            // Update profile
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
            
            // Show toast (assuming alert for now)
            alert("Payment successful! Welcome to Lora Pro 🎉");
            
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
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-[#FAFAFA] to-[#F5EDD8] flex flex-col items-center justify-center px-6 py-16">
        
        <div className="text-center mb-10">
          <span className="inline-block px-3 py-1 bg-[#F0E0B0] text-[#A0782A] text-xs font-bold rounded-full mb-4 tracking-wider">
            LORA PRO FOR CREATORS
          </span>
          <h1 className="text-5xl font-bold text-[#1A1A1A] mb-4 font-['Playfair_Display']">
            {isTrialView ? "Start your free month" : "Your free trial has ended"}
          </h1>
          <p className="text-gray-500 text-lg max-w-md mx-auto">
            {isTrialView 
              ? "No payment needed today. Enjoy full access for 30 days, on us."
              : "Subscribe to keep your courses live and continue earning."}
          </p>
        </div>

        <div className="bg-white rounded-3xl p-10 max-w-md w-full mx-auto shadow-[0_8px_40px_rgba(0,0,0,0.10)] border border-[#F0E0B0] relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-[#C9A84C] text-white text-xs font-bold px-4 py-1 rounded-full shadow-md">
              CREATOR PLAN
            </span>
          </div>

          <div className="text-center my-8">
            <div className="flex items-start justify-center gap-1">
              <span className="text-2xl font-bold text-gray-500 mt-3">Rs.</span>
              <span className="text-7xl font-bold text-[#1A1A1A] font-['Playfair_Display'] leading-none">3,499</span>
              <span className="text-2xl font-bold text-gray-500 mt-3">.00</span>
            </div>
            <p className="text-gray-400 text-sm mt-2">per month after free trial</p>
          </div>

          <div className="border-t border-[#E8E8E8] my-6"></div>

          <div className="space-y-4 mb-8">
            {features.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#F0E0B0] flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-[#C9A84C]" />
                </div>
                <span className="text-gray-700 text-sm">{feature}</span>
              </div>
            ))}
          </div>

          {isTrialView && (
            <div className="bg-[#F0E0B0]/40 rounded-2xl p-4 text-center mb-6">
              <p className="text-[#A0782A] font-bold text-lg">
                🎉 First month completely FREE
              </p>
              <p className="text-[#A0782A]/80 text-sm mt-1">
                No credit card required to start
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 text-red-600 text-sm text-center font-medium bg-red-50 py-2 rounded-lg">
              {error}
            </div>
          )}

          {isTrialView ? (
            <button 
              onClick={handleStartTrial}
              className="w-full group relative overflow-hidden bg-[#C9A84C] hover:bg-[#A0782A] text-white font-bold text-lg py-5 rounded-2xl shadow-[0_8px_32px_rgba(201,168,76,0.4)] hover:shadow-[0_12px_40px_rgba(201,168,76,0.6)] hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              Start My Free Month →
            </button>
          ) : (
            <div className="relative">
              {loading && (
                <div className="absolute inset-0 z-10 bg-white/80 flex items-center justify-center rounded-2xl">
                  <Loader2 className="w-8 h-8 text-[#C9A84C] animate-spin" />
                </div>
              )}
              <div id="paypal-button-container" className="min-h-[50px]"></div>
            </div>
          )}

          <p className="text-center text-xs text-gray-400 mt-4">
            {isTrialView 
              ? "After 30 days, Rs. 3,499/month. Cancel anytime."
              : "Your courses will go live again immediately after payment."}
          </p>
        </div>

        <div className="mt-12 text-center">
          <a href="mailto:support@lora.com" className="text-sm text-gray-500 hover:text-[#C9A84C] transition-colors mb-2 inline-block">
            Questions? Contact us
          </a>
          <p className="text-xs text-gray-400 font-bold">© 2026 Lora</p>
        </div>

      </div>
    </PageTransition>
  );
}
