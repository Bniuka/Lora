import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Loader2, Upload, User, Building2, Layers, Link as LinkIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { PageTransition } from '../components/ui';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';
import { Link } from 'react-router-dom';

const CATEGORIES = ['Technology', 'Design', 'Business', 'Language', 'Music', 'Fitness', 'Other'];

export default function CreatorSettings() {
  useSubscriptionGuard();
  const { profile, creatorProfile, refreshProfile, user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    contact_number: profile?.contact_number || '',
    payment_link: creatorProfile?.payment_link || '',
    payment_option: creatorProfile?.payment_option || 'link',
    about: creatorProfile?.about || '',
    category: creatorProfile?.category || '',
  });

  useEffect(() => {
    setForm(prev => ({
      ...prev,
      first_name: profile?.first_name || prev.first_name,
      last_name: profile?.last_name || prev.last_name,
      contact_number: profile?.contact_number || prev.contact_number,
      payment_link: creatorProfile?.payment_link || prev.payment_link,
      payment_option: creatorProfile?.payment_option || prev.payment_option,
      about: creatorProfile?.about || prev.about,
      category: creatorProfile?.category || prev.category,
    }));
  }, [profile, creatorProfile]);

  const [bankDetails, setBankDetails] = useState({
    bank_name: '', account_holder_name: '', account_number: '', branch: '', 
    branch_code: '', country: 'US', swift_code: '', iban: '', routing_number: '', extra_note: ''
  });

  useEffect(() => {
    if (user) {
      supabase.from('creator_bank_details').select('*').eq('creator_id', user.id).maybeSingle()
        .then(({ data }) => { if (data) setBankDetails(data); });
    }
  }, [user]);

  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await supabase.from('profiles').update({
        first_name: form.first_name,
        last_name: form.last_name,
        contact_number: form.contact_number,
      }).eq('id', user.id);

      await supabase.from('creator_profiles').update({
        payment_link: form.payment_link,
        payment_option: form.payment_option,
        about: form.about,
        category: form.category,
      }).eq('id', user.id);

      if (form.payment_option === 'bank' || form.payment_option === 'both') {
        if (!bankDetails.bank_name || !bankDetails.account_holder_name || !bankDetails.account_number) {
          throw new Error('Bank Name, Account Holder Name, and Account Number are required.');
        }
        await supabase.from('creator_bank_details').upsert({
          creator_id: user.id,
          ...bankDetails,
          updated_at: new Date().toISOString()
        }, { onConflict: 'creator_id' });
      }

      await refreshProfile();
      setMessage('Settings saved successfully!');
    } catch (err) {
      setMessage('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPwMsg('');
    if (passwords.new !== passwords.confirm) { setPwMsg('Passwords do not match'); return; }
    if (passwords.new.length < 6) { setPwMsg('Password must be at least 6 characters'); return; }

    const { error } = await supabase.auth.updateUser({ password: passwords.new });
    if (error) { setPwMsg('Error: ' + error.message); return; }

    setPwMsg('Password updated successfully!');
    setPasswords({ current: '', new: '', confirm: '' });
  };

  return (
    <PageTransition>
      <div className="max-w-2xl">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] mb-8" style={{ fontFamily: 'var(--font-heading)' }}>
          Profile & Settings
        </h1>

        {/* Subscription Settings */}
        <div className="bg-white p-8 rounded-2xl border border-[#F1F5F9] shadow-[0_2px_16px_rgba(0,0,0,0.06)] space-y-6 mb-8">
          <h2 className="text-sm font-semibold text-[#94A6B8] uppercase tracking-wider mb-4">Subscription</h2>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
            <div>
              <h3 className="font-bold text-[#0F172A] text-lg">Lora Creator Plan</h3>
              <p className="text-sm text-[#475569] mt-1">
                {creatorProfile?.subscription_status === 'trial' ? 'Free Trial' : 
                 creatorProfile?.subscription_status === 'active' ? 'Active Subscription' : 'Expired/Cancelled'}
              </p>
              <div className="text-sm text-[#64748B] mt-1">
                {creatorProfile?.subscription_status === 'trial' && creatorProfile.trial_ends_at && (
                  <span>Trial ends on {new Date(creatorProfile.trial_ends_at).toLocaleDateString()}</span>
                )}
                {creatorProfile?.subscription_status === 'active' && creatorProfile.next_billing_date && (
                  <span>Next billing date: {new Date(creatorProfile.next_billing_date).toLocaleDateString()}</span>
                )}
                <span className="ml-2 font-medium">Rs. 3,499/month</span>
              </div>
            </div>

            <div>
              {creatorProfile?.subscription_status === 'trial' && (
                <Link to="/creator/subscription?upgrade=true" className="btn-primary py-2 px-4 whitespace-nowrap bg-[#C9A84C] hover:bg-[#A0782A]">
                  Upgrade Now
                </Link>
              )}
              {creatorProfile?.subscription_status === 'active' && (
                <button 
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to cancel your subscription?')) {
                      await supabase.from('creator_profiles').update({ subscription_status: 'cancelled' }).eq('id', user.id);
                      alert('Subscription cancelled. You have access until ' + new Date(creatorProfile.subscription_ends_at).toLocaleDateString());
                      refreshProfile();
                    }
                  }}
                  className="px-4 py-2 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors text-sm font-medium"
                >
                  Cancel Subscription
                </button>
              )}
              {(creatorProfile?.subscription_status === 'expired' || creatorProfile?.subscription_status === 'cancelled') && (
                <Link to="/creator/subscription" className="btn-primary py-2 px-4 whitespace-nowrap bg-[#C9A84C] hover:bg-[#A0782A]">
                  Subscribe to Reactivate
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Payment Settings */}
        <div className="bg-white p-8 rounded-2xl border border-[#F1F5F9] shadow-[0_2px_16px_rgba(0,0,0,0.06)] space-y-6 mb-8">
          <h2 className="text-sm font-semibold text-[#94A6B8] uppercase tracking-wider mb-4">Payment Settings</h2>
          
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { id: 'link', icon: LinkIcon, title: 'Payment Link', desc: 'Share a URL — bKash, PayPal, etc' },
              { id: 'bank', icon: Building2, title: 'Bank Details', desc: 'Share your bank info directly' },
              { id: 'both', icon: Layers, title: 'Both Options', desc: 'Let learners choose their method' },
            ].map((opt) => {
              const active = form.payment_option === opt.id;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  onClick={() => update('payment_option', opt.id)}
                  className={`group relative p-5 rounded-2xl text-left transition-all duration-300 overflow-hidden flex flex-col h-full border-2 min-h-[150px]
                    ${active ? 'border-[#2563EB] shadow-[0_0_30px_rgba(37,99,235,0.15)] scale-[1.02] z-10' : 'border-[#E2E8F0] hover:border-[#cbd5e1] bg-white hover:shadow-xl hover:-translate-y-1'}`}
                >
                  {/* Cinematic animated background for active state */}
                  {active && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-br from-[#2563EB]/10 via-transparent to-[#DBEAFE]/40" />
                      <div className="absolute -inset-[150%] bg-[conic-gradient(from_90deg_at_50%_50%,#2563EB_0%,transparent_50%,#2563EB_100%)] opacity-[0.04] animate-[spin_5s_linear_infinite]" />
                      <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#2563EB]/20 blur-[40px] rounded-full" />
                    </>
                  )}
                  
                  {/* Hover gradient for inactive state */}
                  {!active && (
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent to-[#F1F5F9] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  )}

                  <div className="relative z-10 flex-1 flex flex-col h-full">
                    <div className={`w-10 h-10 rounded-xl mb-4 flex items-center justify-center transition-colors duration-300 ${active ? 'bg-[#2563EB] text-white shadow-lg shadow-[#2563EB]/30' : 'bg-[#F8FAFC] text-[#94A6B8] group-hover:text-[#475569]'}`}>
                      <Icon size={20} />
                    </div>
                    <div className="mt-auto">
                      <h3 className={`font-bold text-base mb-2 transition-colors duration-300 break-words ${active ? 'text-[#2563EB]' : 'text-[#0F172A]'}`}>
                        {opt.title}
                      </h3>
                      <p className={`text-xs leading-relaxed break-words ${active ? 'text-[#334155]' : 'text-[#94A6B8]'}`}>
                        {opt.desc}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {(form.payment_option === 'link' || form.payment_option === 'both') && (
            <div className="mt-6">
              <label className="form-label">Payment Link URL</label>
              <input className="input-field" value={form.payment_link} onChange={e => update('payment_link', e.target.value)} placeholder="https://..." />
            </div>
          )}

          {(form.payment_option === 'bank' || form.payment_option === 'both') && (
            <div className="mt-6 pt-6 border-t border-[#E2E8F0] space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="form-label">Bank Name *</label>
                  <select className="select-field" value={bankDetails.bank_name} onChange={e => setBankDetails({...bankDetails, bank_name: e.target.value})}>
                    <option value="" disabled>Select a Bank</option>
                    <option value="Bank of Ceylon">Bank of Ceylon (State-owned)</option>
                    <option value="People's Bank">People's Bank (State-owned)</option>
                    <option value="Commercial Bank of Ceylon PLC">Commercial Bank of Ceylon PLC</option>
                    <option value="Hatton National Bank PLC">Hatton National Bank PLC</option>
                    <option value="Sampath Bank PLC">Sampath Bank PLC</option>
                    <option value="DFCC Bank PLC">DFCC Bank PLC</option>
                    <option value="National Development Bank PLC">National Development Bank PLC</option>
                    <option value="Nations Trust Bank PLC">Nations Trust Bank PLC</option>
                    <option value="Seylan Bank PLC">Seylan Bank PLC</option>
                    <option value="Amana Bank PLC">Amana Bank PLC (Islamic banking)</option>
                    <option value="Cargills Bank PLC">Cargills Bank PLC</option>
                    <option value="Pan Asia Banking Corporation PLC">Pan Asia Banking Corporation PLC</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Account Holder Name *</label>
                  <input className="input-field" value={bankDetails.account_holder_name} onChange={e => setBankDetails({...bankDetails, account_holder_name: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="form-label">Account Number *</label>
                  <input className="input-field" value={bankDetails.account_number} onChange={e => setBankDetails({...bankDetails, account_number: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">Country *</label>
                  <select className="select-field" value={bankDetails.country} onChange={e => setBankDetails({...bankDetails, country: e.target.value})}>
                    <option value="US">United States</option>
                    <option value="BD">Bangladesh</option>
                    <option value="IN">India</option>
                    <option value="NG">Nigeria</option>
                    <option value="LK">Sri Lanka</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="form-label">Branch</label>
                  <input className="input-field" value={bankDetails.branch} onChange={e => setBankDetails({...bankDetails, branch: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">Branch Code</label>
                  <input className="input-field" value={bankDetails.branch_code} onChange={e => setBankDetails({...bankDetails, branch_code: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="form-label">Extra Note for Learners</label>
                <textarea className="textarea-field" rows={2} maxLength={200} placeholder="e.g. Please use your full name as the payment reference"
                  value={bankDetails.extra_note} onChange={e => setBankDetails({...bankDetails, extra_note: e.target.value})} />
              </div>
            </div>
          )}
        </div>

        {/* Profile section */}
        <div className="bg-white p-8 rounded-2xl border border-[#F1F5F9] shadow-[0_2px_16px_rgba(0,0,0,0.06)] space-y-6 mb-8">
          <h2 className="text-sm font-semibold text-[#94A6B8] uppercase tracking-wider mb-4">Profile Information</h2>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="form-label">First Name</label>
              <input className="input-field" value={form.first_name} onChange={e => update('first_name', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Last Name</label>
              <input className="input-field" value={form.last_name} onChange={e => update('last_name', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="form-label">Contact Number</label>
            <input className="input-field" value={form.contact_number} onChange={e => update('contact_number', e.target.value)} />
          </div>

          <div>
            <label className="form-label">Category</label>
            <select className="select-field" value={form.category} onChange={e => update('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="form-label">About ({form.about.length}/300)</label>
            <textarea className="textarea-field" rows={3} maxLength={300} value={form.about}
              onChange={e => update('about', e.target.value)} />
          </div>

          {message && (
            <p className={`text-sm ${message.includes('Error') ? 'text-[#C0392B]' : 'text-[#2D7A4F]'}`}>{message}</p>
          )}

          <button onClick={handleSave} className="btn-primary py-3 mt-4" disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Save Changes</>}
          </button>
        </div>

        {/* Password section */}
        <div className="bg-white p-8 rounded-2xl border border-[#F1F5F9] shadow-[0_2px_16px_rgba(0,0,0,0.06)] space-y-5">
          <h2 className="text-sm font-semibold text-[#94A6B8] uppercase tracking-wider mb-4">Change Password</h2>
          <div>
            <label className="form-label">New Password</label>
            <input type="password" className="input-field" value={passwords.new}
              onChange={e => setPasswords(p => ({ ...p, new: e.target.value }))} placeholder="Min 6 characters" />
          </div>
          <div>
            <label className="form-label">Confirm New Password</label>
            <input type="password" className="input-field" value={passwords.confirm}
              onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} placeholder="Repeat password" />
          </div>
          {pwMsg && (
            <p className={`text-sm ${pwMsg.includes('Error') ? 'text-[#C0392B]' : 'text-[#2D7A4F]'}`}>{pwMsg}</p>
          )}
          <button onClick={handlePasswordChange} className="btn-secondary py-3 mt-4">Update Password</button>
        </div>
      </div>
    </PageTransition>
  );
}
