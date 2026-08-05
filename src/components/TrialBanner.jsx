import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function TrialBanner() {
  const { creatorProfile } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (creatorProfile?.subscription_status !== 'trial') return;

    const today = new Date().toISOString().split('T')[0];
    const dismissKey = `lora_trial_banner_dismissed_${today}`;
    
    if (localStorage.getItem(dismissKey) !== 'true') {
      setIsVisible(true);
    }
  }, [creatorProfile]);

  if (!isVisible || !creatorProfile || creatorProfile.subscription_status !== 'trial') {
    return null;
  }

  const trialEnds = creatorProfile.trial_ends_at ? new Date(creatorProfile.trial_ends_at) : new Date();
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((trialEnds - now) / (1000 * 60 * 60 * 24)));

  const handleDismiss = () => {
    const today = new Date().toISOString().split('T')[0];
    const dismissKey = `lora_trial_banner_dismissed_${today}`;
    localStorage.setItem(dismissKey, 'true');
    setIsVisible(false);
  };

  if (daysLeft > 7) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl px-6 py-4 flex justify-between items-center mb-6">
        <p className="text-green-800 text-sm font-medium">
          🟢 Free trial active — {daysLeft} days remaining. Enjoying Lora? Subscribe to keep going after your trial.
        </p>
        <div className="flex items-center gap-4">
          <Link to="/creator/subscription?upgrade=true" className="text-sm font-bold text-green-700 hover:text-green-900 underline">
            Subscribe Now
          </Link>
          <button onClick={handleDismiss} className="text-green-500 hover:text-green-700">
            <X size={18} />
          </button>
        </div>
      </div>
    );
  }

  if (daysLeft <= 7 && daysLeft > 0) {
    return (
      <div className="bg-[#FFF9E6] border border-[#F0E0B0] rounded-2xl px-6 py-4 flex justify-between items-center mb-6">
        <p className="text-[#A0782A] text-sm font-medium">
          ⚠️ Your free trial ends in {daysLeft} days! Subscribe now to keep your courses live.
        </p>
        <div className="flex items-center gap-4">
          <Link to="/creator/subscription?upgrade=true" className="text-sm font-bold bg-[#C9A84C] text-white px-4 py-2 rounded-xl hover:bg-[#A0782A] transition-colors shadow-sm">
            Subscribe Now
          </Link>
          <button onClick={handleDismiss} className="text-[#C9A84C] hover:text-[#A0782A]">
            <X size={18} />
          </button>
        </div>
      </div>
    );
  }

  if (daysLeft === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-4 flex justify-between items-center mb-6">
        <p className="text-red-800 text-sm font-medium">
          🔴 Your trial expires today! Subscribe now to avoid interruption.
        </p>
        <div className="flex items-center gap-4">
          <Link to="/creator/subscription?upgrade=true" className="text-sm font-bold bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-colors shadow-sm">
            Subscribe Now
          </Link>
          <button onClick={handleDismiss} className="text-red-400 hover:text-red-600">
            <X size={18} />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
