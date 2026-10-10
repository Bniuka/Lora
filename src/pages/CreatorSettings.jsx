import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { PageTransition } from '../components/ui';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';
import { Link } from 'react-router-dom';

const CATEGORIES = ['Technology', 'Design', 'Business', 'Language', 'Music', 'Fitness', 'Other'];

export default function CreatorSettings() {
  useSubscriptionGuard();
  const { profile, creatorProfile, refreshProfile, user } = useAuth();
  
  const [savingPay, setSavingPay] = useState(false);
  const [savingProf, setSavingProf] = useState(false);
  
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2400);
  };

  const [form, setForm] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    contact_number: profile?.contact_number || '',
    payment_link: creatorProfile?.payment_link || '',
    payment_option: creatorProfile?.payment_option || 'both',
    about: creatorProfile?.about || '',
    category: creatorProfile?.category || 'Technology',
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
    branch_code: '', country: 'Sri Lanka', extra_note: ''
  });

  useEffect(() => {
    if (user) {
      supabase.from('creator_bank_details').select('*').eq('creator_id', user.id).maybeSingle()
        .then(({ data }) => { if (data) setBankDetails(data); });
    }
  }, [user]);

  const [passwords, setPasswords] = useState({ new: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSavePayments = async () => {
    setSavingPay(true);
    try {
      if (form.payment_option === 'bank' || form.payment_option === 'both') {
        if (!bankDetails.bank_name || !bankDetails.account_holder_name || !bankDetails.account_number) {
          throw new Error('Bank Name, Account Holder, and Account Number are required.');
        }
      }
      if (form.payment_option === 'link' && !form.payment_link) {
        throw new Error('Payment Link URL is required.');
      }

      await supabase.from('creator_profiles').update({
        payment_link: form.payment_link,
        payment_option: form.payment_option,
      }).eq('id', user.id);

      if (form.payment_option === 'bank' || form.payment_option === 'both') {
        await supabase.from('creator_bank_details').upsert({
          creator_id: user.id,
          ...bankDetails,
          updated_at: new Date().toISOString()
        }, { onConflict: 'creator_id' });
      }

      await refreshProfile();
      showToast('Payment settings saved');
    } catch (err) {
      showToast('Error: ' + err.message);
    } finally {
      setSavingPay(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProf(true);
    try {
      await supabase.from('profiles').update({
        first_name: form.first_name,
        last_name: form.last_name,
        contact_number: form.contact_number,
      }).eq('id', user.id);

      await supabase.from('creator_profiles').update({
        about: form.about,
        category: form.category,
      }).eq('id', user.id);

      await refreshProfile();
      showToast('Profile saved');
    } catch (err) {
      showToast('Error: ' + err.message);
    } finally {
      setSavingProf(false);
    }
  };

  const handlePasswordChange = async () => {
    setPwMsg('');
    if (passwords.new !== passwords.confirm) { setPwMsg('Passwords don’t match.'); return; }
    if (passwords.new.length < 6) { setPwMsg('Password must be at least 6 characters.'); return; }

    const { error } = await supabase.auth.updateUser({ password: passwords.new });
    if (error) { setPwMsg('Error: ' + error.message); return; }

    showToast('Password updated');
    setPasswords({ new: '', confirm: '' });
  };

  // Section nav highlight
  const [activeSection, setActiveSection] = useState('plan');
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) setActiveSection(entry.target.id);
      });
    }, { rootMargin: '-30% 0px -60% 0px' });

    const sections = document.querySelectorAll('section.card-section');
    sections.forEach(s => observer.observe(s));
    return () => sections.forEach(s => observer.unobserve(s));
  }, []);

  // Trial calculations
  const end = new Date(creatorProfile?.trial_ends_at || Date.now());
  const now = new Date();
  const total = 30;
  const left = Math.max(0, Math.ceil((end - now) / 864e5));

  return (
    <PageTransition>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;700;800&family=Figtree:wght@400;500;600&display=swap');
        
        .settings-page {
          --bg: #f4f6fb; --surface: #fff; --ink: #0e1733; --muted: #68728d; --line: #e3e7f1; 
          --brand: #2f5bff; --brand-soft: #e9eeff; --ok: #0f9d6b; --bad: #d6334a; 
          --hero: #0e1733; --hero-ink: #fff; 
          --shadow: 0 1px 2px rgba(14,23,51,.05), 0 8px 24px -12px rgba(14,23,51,.12);
          font-family: 'Figtree', sans-serif;
          color: var(--ink);
          background: transparent;
        }
        
        @media (prefers-color-scheme: dark) {
          :root:not([data-theme="light"]) .settings-page {
            --bg: #0a1022; --surface: #121a33; --ink: #eef1fb; --muted: #9aa5c4; 
            --line: #222c4c; --brand: #6c8cff; --brand-soft: #1b2750; --hero: #1a2750; --shadow: none;
          }
        }
        
        .settings-page h1, .settings-page h2, .settings-page h3, .settings-page b, .font-bricolage {
          font-family: 'Bricolage Grotesque', sans-serif;
          letter-spacing: -0.02em;
        }
        
        .settings-page input:focus-visible, .settings-page select:focus-visible, .settings-page textarea:focus-visible, .settings-page button:focus-visible {
          outline: 2px solid var(--brand); outline-offset: 2px;
        }
        
        /* Segmented Control */
        .seg-input:checked + .seg-opt {
          border-color: var(--brand); background: var(--brand-soft);
        }
        .seg-input:checked + .seg-opt .seg-icon {
          background: var(--brand); stroke: #fff;
        }
        .seg-input:checked + .seg-opt::after {
          content: "✓"; position: absolute; top: 12px; right: 14px; width: 20px; height: 20px;
          border-radius: 50%; background: var(--brand); color: #fff; font-size: 12px;
          display: grid; place-items: center;
        }
        .seg-input:focus-visible + .seg-opt {
          outline: 2px solid var(--brand); outline-offset: 2px;
        }
        
        /* Inputs */
        .f-input {
          width: 100%; background: var(--bg); border: 1.5px solid var(--line); border-radius: 12px;
          padding: 12px 14px; outline: 0; transition: .15s; color: inherit; font-family: inherit;
        }
        .f-input:focus {
          border-color: var(--brand); background: var(--surface); box-shadow: 0 0 0 4px var(--brand-soft);
        }
        .f-input.err { border-color: var(--bad); }
        
        .plan-card::after {
          content: ""; position: absolute; right: -60px; top: -80px; width: 260px; height: 260px;
          border-radius: 50%; border: 1px solid rgba(255,255,255,.12);
          box-shadow: 0 0 0 40px rgba(255,255,255,.03), 0 0 0 80px rgba(255,255,255,.02); pointer-events: none;
        }
      `}</style>

      <div className="settings-page max-w-[1020px] w-full grid md:grid-cols-[190px_1fr] gap-9 items-start pb-20">
        
        {/* TOC */}
        <div className="sticky top-[20px] md:top-[90px] flex md:flex-col gap-2 flex-wrap z-10 pb-4 md:pb-0 bg-[#F1F5F9] md:bg-transparent -mx-4 px-4 md:mx-0 md:px-0">
          <h1 className="text-[30px] mb-3 w-full font-bricolage tracking-tight hidden md:block m-0 font-extrabold text-[var(--ink)]">Settings</h1>
          {[
            { id: 'plan', label: 'Subscription' },
            { id: 'pay', label: 'Payments' },
            { id: 'profile', label: 'Profile' },
            { id: 'security', label: 'Password' }
          ].map(link => (
            <a 
              key={link.id}
              href={`#${link.id}`}
              className={`px-3.5 py-1.5 md:py-2 md:px-3 text-[14px] md:text-[15px] font-medium transition-all
                md:border-l-2 md:border-y-0 md:border-r-0 md:rounded-none border rounded-full
                ${activeSection === link.id 
                  ? 'text-[var(--brand)] md:border-[var(--brand)] border-[var(--brand)] bg-[var(--brand-soft)] md:bg-transparent font-semibold' 
                  : 'text-[var(--muted)] md:border-[var(--line)] border-[var(--line)] bg-[var(--surface)] md:bg-transparent'}`}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Content Stack */}
        <div className="flex flex-col gap-7 min-w-0">
          
          {/* SUBSCRIPTION */}
          <section className="card-section plan-card bg-[var(--hero)] text-[var(--hero-ink)] rounded-[20px] relative overflow-hidden grid md:grid-cols-[auto_1fr_auto] gap-6 items-center p-6 md:p-8" id="plan">
            <div className="relative w-[92px] h-[92px] shrink-0" aria-hidden="true">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="8" strokeLinecap="round" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="#7fa0ff" strokeWidth="8" strokeLinecap="round" 
                  strokeDasharray="264" strokeDashoffset={264 * (1 - left / total)} 
                  className="transition-[stroke-dashoffset] duration-1000 ease-out" />
              </svg>
              <div className="absolute inset-0 grid place-content-center text-center font-bricolage font-extrabold text-[24px] leading-none">
                <span>{left}</span>
                <small className="block font-figtree font-medium text-[11px] opacity-70 mt-1">days left</small>
              </div>
            </div>
            <div className="z-10">
              <span className="inline-block bg-white/10 rounded-full px-2.5 py-1 text-[12px] font-semibold mb-2">
                {creatorProfile?.subscription_status === 'trial' ? 'Free trial' : 
                 creatorProfile?.subscription_status === 'active' ? 'Active' : 'Expired'}
              </span>
              <h2 className="text-[24px] font-bricolage tracking-tight m-0 text-white">Lora Creator Plan</h2>
              <p className="m-0 mt-1.5 opacity-75 text-[14.5px]">
                {creatorProfile?.subscription_status === 'trial' 
                  ? `Trial ends on ${end.toLocaleDateString()}, then Rs. 3,499/month.`
                  : creatorProfile?.subscription_status === 'active' && creatorProfile?.next_billing_date
                    ? `Next billing date: ${new Date(creatorProfile.next_billing_date).toLocaleDateString()}`
                    : 'Rs. 3,499/month'}
              </p>
            </div>
            <div className="z-10 relative">
              {creatorProfile?.subscription_status === 'trial' || creatorProfile?.subscription_status === 'expired' ? (
                 <Link to="/creator/subscription?upgrade=true" className="bg-white text-[#0e1733] font-semibold py-3 px-5 rounded-xl hover:brightness-110 active:scale-95 transition-all block whitespace-nowrap text-center">
                   Upgrade now
                 </Link>
              ) : (
                <div className="flex flex-col gap-3">
                  <a href="https://www.paypal.com/myaccount/autopay/" target="_blank" rel="noopener noreferrer" className="bg-white/10 text-white font-semibold py-2 px-4 rounded-xl hover:bg-white/20 transition-all text-sm text-center">Manage PayPal</a>
                  <button onClick={async () => {
                     if (window.confirm('Are you sure you want to cancel? IMPORTANT: You must also log into your PayPal account to stop the recurring payment.')) {
                       await supabase.from('creator_profiles').update({ subscription_status: 'cancelled' }).eq('id', user.id);
                       alert('Subscription cancelled in Lora. Please ensure you also cancel the recurring payment on PayPal.');
                       refreshProfile();
                     }
                  }} className="text-red-300 font-medium text-sm hover:text-red-400">Cancel Subscription</button>
                </div>
              )}
            </div>
          </section>

          {/* PAYMENT SETTINGS */}
          <section className="card-section bg-[var(--surface)] border border-[var(--line)] rounded-[20px] p-6 sm:p-7 shadow-[var(--shadow)]" id="pay">
            <header className="mb-6">
              <h2 className="text-[20px] font-bricolage tracking-tight m-0">Payment settings</h2>
              <p className="m-0 mt-1 text-[14px] text-[var(--muted)]">Choose how learners pay you.</p>
            </header>
            
            <div className="grid sm:grid-cols-3 gap-3 mb-6" role="radiogroup">
              {[
                { id: 'link', icon: <><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></>, title: 'Payment link', desc: 'Share a URL: bKash, PayPal, etc.' },
                { id: 'bank', icon: <><path d="M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/></>, title: 'Bank details', desc: 'Share your bank info directly' },
                { id: 'both', icon: <><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/></>, title: 'Both options', desc: 'Let learners choose their method' },
              ].map(opt => (
                <label key={opt.id} className="cursor-pointer relative">
                  <input type="radio" name="payMethod" value={opt.id} checked={form.payment_option === opt.id} onChange={() => update('payment_option', opt.id)} className="seg-input absolute opacity-0" />
                  <span className="seg-opt block h-full border-[1.5px] border-[var(--line)] rounded-2xl p-4 transition-all relative bg-[var(--surface)]">
                    <svg className="seg-icon w-9 h-9 p-2 rounded-xl bg-[var(--bg)] stroke-[var(--muted)] fill-none stroke-[1.8px] mb-2.5 transition-all" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                      {opt.icon}
                    </svg>
                    <b className="block font-bricolage text-[15px] mb-0.5">{opt.title}</b>
                    <span className="text-[13px] text-[var(--muted)] block">{opt.desc}</span>
                  </span>
                </label>
              ))}
            </div>

            {(form.payment_option === 'link' || form.payment_option === 'both') && (
              <div className="mb-4 animate-in fade-in slide-in-from-top-1">
                <label className="block font-semibold text-[13.5px] mb-1.5" htmlFor="paymentLink">Payment link URL</label>
                <input id="paymentLink" className="f-input" type="url" value={form.payment_link} onChange={e => update('payment_link', e.target.value)} placeholder="https://..." />
              </div>
            )}

            {(form.payment_option === 'bank' || form.payment_option === 'both') && (
              <div className="animate-in fade-in slide-in-from-top-1 pt-4">
                <h3 className="font-bricolage font-bold m-0 mb-4 flex items-center gap-3 after:content-[''] after:flex-1 after:h-[1px] after:bg-[var(--line)]">Bank account</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="mb-2">
                    <label className="block font-semibold text-[13.5px] mb-1.5">Bank name <em className="text-[var(--bad)] not-italic">*</em></label>
                    <select className="f-input" value={bankDetails.bank_name} onChange={e => setBankDetails({...bankDetails, bank_name: e.target.value})}>
                      <option value="">Select a bank</option>
                      <option>Bank of Ceylon</option>
                      <option>Commercial Bank</option>
                      <option>Hatton National Bank</option>
                      <option>People's Bank</option>
                      <option>Sampath Bank</option>
                      <option>Seylan Bank</option>
                      <option>Nations Trust Bank</option>
                    </select>
                  </div>
                  <div className="mb-2">
                    <label className="block font-semibold text-[13.5px] mb-1.5">Account holder name <em className="text-[var(--bad)] not-italic">*</em></label>
                    <input className="f-input" value={bankDetails.account_holder_name} onChange={e => setBankDetails({...bankDetails, account_holder_name: e.target.value})} />
                  </div>
                  <div className="mb-2">
                    <label className="block font-semibold text-[13.5px] mb-1.5">Account number <em className="text-[var(--bad)] not-italic">*</em></label>
                    <input className="f-input" inputMode="numeric" value={bankDetails.account_number} onChange={e => setBankDetails({...bankDetails, account_number: e.target.value})} />
                  </div>
                  <div className="mb-2">
                    <label className="block font-semibold text-[13.5px] mb-1.5">Country <em className="text-[var(--bad)] not-italic">*</em></label>
                    <select className="f-input" value={bankDetails.country} onChange={e => setBankDetails({...bankDetails, country: e.target.value})}>
                      <option value="US">United States</option>
                      <option value="LK">Sri Lanka</option>
                      <option value="IN">India</option>
                      <option value="GB">United Kingdom</option>
                      <option value="AU">Australia</option>
                    </select>
                  </div>
                  <div className="mb-2">
                    <label className="block font-semibold text-[13.5px] mb-1.5">Branch</label>
                    <input className="f-input" value={bankDetails.branch} onChange={e => setBankDetails({...bankDetails, branch: e.target.value})} />
                  </div>
                  <div className="mb-2">
                    <label className="block font-semibold text-[13.5px] mb-1.5">Branch code</label>
                    <input className="f-input" value={bankDetails.branch_code} onChange={e => setBankDetails({...bankDetails, branch_code: e.target.value})} />
                  </div>
                  <div className="sm:col-span-2 mb-2">
                    <label className="block font-semibold text-[13.5px] mb-1.5">Extra note for learners</label>
                    <textarea className="f-input min-h-[110px]" value={bankDetails.extra_note} onChange={e => setBankDetails({...bankDetails, extra_note: e.target.value})} placeholder="e.g. Please use your full name as the payment reference" />
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-end mt-6">
              <button onClick={handleSavePayments} disabled={savingPay} className="bg-[var(--brand)] text-white font-semibold py-3 px-6 rounded-xl hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 border-0 cursor-pointer">
                {savingPay ? <Loader2 size={18} className="animate-spin" /> : 'Save payment settings'}
              </button>
            </div>
          </section>

          {/* PROFILE */}
          <section className="card-section bg-[var(--surface)] border border-[var(--line)] rounded-[20px] p-6 sm:p-7 shadow-[var(--shadow)]" id="profile">
            <header className="mb-6">
              <h2 className="text-[20px] font-bricolage tracking-tight m-0">Profile information</h2>
              <p className="m-0 mt-1 text-[14px] text-[var(--muted)]">This is what learners see on your courses.</p>
            </header>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="mb-2">
                <label className="block font-semibold text-[13.5px] mb-1.5" htmlFor="first">First name</label>
                <input id="first" className="f-input" value={form.first_name} onChange={e => update('first_name', e.target.value)} />
              </div>
              <div className="mb-2">
                <label className="block font-semibold text-[13.5px] mb-1.5" htmlFor="last">Last name</label>
                <input id="last" className="f-input" value={form.last_name} onChange={e => update('last_name', e.target.value)} />
              </div>
              <div className="mb-2">
                <label className="block font-semibold text-[13.5px] mb-1.5" htmlFor="phone">Contact number</label>
                <input id="phone" className="f-input" type="tel" value={form.contact_number} onChange={e => update('contact_number', e.target.value)} />
              </div>
              <div className="mb-2">
                <label className="block font-semibold text-[13.5px] mb-1.5" htmlFor="cat">Category</label>
                <select id="cat" className="f-input" value={form.category} onChange={e => update('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2 mb-2">
                <label className="block font-semibold text-[13.5px] mb-1.5" htmlFor="about">About</label>
                <textarea id="about" className="f-input min-h-[110px]" maxLength={300} value={form.about} onChange={e => update('about', e.target.value)} />
                <div className="flex justify-between text-[12.5px] text-[var(--muted)] mt-1.5">
                  <span>Tell learners who you are and what you teach.</span>
                  <span className="font-medium text-[var(--ink)]">{form.about.length}/300</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={handleSaveProfile} disabled={savingProf} className="bg-[var(--brand)] text-white font-semibold py-3 px-6 rounded-xl hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 border-0 cursor-pointer">
                {savingProf ? <Loader2 size={18} className="animate-spin" /> : 'Save changes'}
              </button>
            </div>
          </section>

          {/* PASSWORD */}
          <section className="card-section bg-[var(--surface)] border border-[var(--line)] rounded-[20px] p-6 sm:p-7 shadow-[var(--shadow)]" id="security">
            <header className="mb-6">
              <h2 className="text-[20px] font-bricolage tracking-tight m-0">Change password</h2>
              <p className="m-0 mt-1 text-[14px] text-[var(--muted)]">Use at least 6 characters.</p>
            </header>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="mb-2">
                <label className="block font-semibold text-[13.5px] mb-1.5" htmlFor="pw1">New password</label>
                <input id="pw1" className={`f-input ${pwMsg && !passwords.new ? 'err' : ''}`} type="password" placeholder="Min 6 characters" autoComplete="new-password" value={passwords.new} onChange={e => {setPasswords(p => ({ ...p, new: e.target.value })); setPwMsg('')}} />
              </div>
              <div className="mb-2">
                <label className="block font-semibold text-[13.5px] mb-1.5" htmlFor="pw2">Confirm new password</label>
                <input id="pw2" className={`f-input ${pwMsg ? 'err' : ''}`} type="password" placeholder="Repeat password" autoComplete="new-password" value={passwords.confirm} onChange={e => {setPasswords(p => ({ ...p, confirm: e.target.value })); setPwMsg('')}} />
                {pwMsg && <div className="flex justify-between text-[12.5px] text-[var(--bad)] mt-1.5 font-medium">{pwMsg}</div>}
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={handlePasswordChange} className="bg-transparent border-[1.5px] border-[var(--brand)] text-[var(--brand)] font-semibold py-3 px-6 rounded-xl hover:bg-[var(--brand-soft)] active:scale-95 transition-all cursor-pointer">
                Update password
              </button>
            </div>
          </section>
          
        </div>
      </div>
      
      {/* Toast */}
      <div className={`fixed left-1/2 bottom-[24px] -translate-x-1/2 bg-[var(--ink)] text-[var(--bg)] py-3 px-5 rounded-2xl font-semibold pointer-events-none z-50 transition-all duration-300 ${toastMsg ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {toastMsg}
      </div>
    </PageTransition>
  );
}
