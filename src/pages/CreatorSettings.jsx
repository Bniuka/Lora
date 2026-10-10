import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { PageTransition } from '../components/ui';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';
import { Link } from 'react-router-dom';
import './settings.css';

const CATEGORIES = ['Technology', 'Design', 'Business', 'Language', 'Music', 'Fitness', 'Other'];

export default function CreatorSettings() {
  useSubscriptionGuard();
  const { profile, creatorProfile, refreshProfile, user } = useAuth();

  const [savingPay, setSavingPay] = useState(false);
  const [savingProf, setSavingProf] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2400);
  };

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    contact_number: '',
    payment_link: '',
    payment_option: 'both',
    about: '',
    category: 'Technology',
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
    bank_name: '', account_holder_name: '', account_number: '',
    branch: '', branch_code: '', country: 'LK', extra_note: ''
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

  /* ── Handlers ── */
  const handleSavePayments = async () => {
    setSavingPay(true);
    try {
      if ((form.payment_option === 'bank' || form.payment_option === 'both') &&
          (!bankDetails.bank_name || !bankDetails.account_holder_name || !bankDetails.account_number)) {
        throw new Error('Bank Name, Account Holder, and Account Number are required.');
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
          creator_id: user.id, ...bankDetails, updated_at: new Date().toISOString()
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
        about: form.about, category: form.category,
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
    if (passwords.new !== passwords.confirm) { setPwMsg("Passwords don\u2019t match."); return; }
    if (passwords.new.length < 6) { setPwMsg('Password must be at least 6 characters.'); return; }
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: passwords.new });
    setSavingPw(false);
    if (error) { setPwMsg('Error: ' + error.message); return; }
    showToast('Password updated');
    setPasswords({ new: '', confirm: '' });
  };

  /* ── Section nav highlight via IntersectionObserver ── */
  const [activeSection, setActiveSection] = useState('plan');
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id); }),
      { rootMargin: '-30% 0px -60% 0px' }
    );
    const sections = document.querySelectorAll('.s-section');
    sections.forEach(s => observer.observe(s));
    return () => sections.forEach(s => observer.unobserve(s));
  }, []);

  /* ── Trial ring ── */
  const trialEnd = new Date(creatorProfile?.trial_ends_at || Date.now());
  const daysLeft = Math.max(0, Math.ceil((trialEnd - new Date()) / 864e5));
  const total = 30;
  const circumference = 264;
  const offset = circumference * (1 - daysLeft / total);

  const payOpt = form.payment_option;
  const showLink = payOpt === 'link' || payOpt === 'both';
  const showBank = payOpt === 'bank' || payOpt === 'both';

  return (
    <PageTransition>
      {/* ── Root wrapper — all styles scoped here ── */}
      <div className="lora-settings">

        {/* ── TOC ── */}
        <div className="s-toc">
          <h1>Settings</h1>
          {[
            { id: 'plan',     label: 'Subscription' },
            { id: 'pay',      label: 'Payments' },
            { id: 'profile',  label: 'Profile' },
            { id: 'security', label: 'Password' },
          ].map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              className={activeSection === id ? 'on' : ''}
            >
              {label}
            </a>
          ))}
        </div>

        {/* ── Content stack ── */}
        <div className="s-stack">

          {/* ════ SUBSCRIPTION ════ */}
          <section className="s-section s-plan" id="plan">
            <div className="s-ring" aria-hidden="true">
              <svg viewBox="0 0 100 100">
                <circle className="ring-track" cx="50" cy="50" r="42" />
                <circle
                  className="ring-progress"
                  cx="50" cy="50" r="42"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                />
              </svg>
              <div className="s-ring-label">
                <span>{daysLeft}</span>
                <small>days left</small>
              </div>
            </div>

            <div>
              <span className="s-badge">
                {creatorProfile?.subscription_status === 'trial' ? 'Free trial'
                  : creatorProfile?.subscription_status === 'active' ? 'Active'
                  : 'Expired'}
              </span>
              <h2>Lora Creator Plan</h2>
              <p>
                {creatorProfile?.subscription_status === 'trial'
                  ? `Trial ends on ${trialEnd.toLocaleDateString()}, then Rs.\u00a03,499/month.`
                  : creatorProfile?.subscription_status === 'active' && creatorProfile.next_billing_date
                    ? `Next billing: ${new Date(creatorProfile.next_billing_date).toLocaleDateString()} · Rs.\u00a03,499/month`
                    : 'Rs.\u00a03,499/month'}
              </p>
            </div>

            <div>
              {(creatorProfile?.subscription_status === 'trial' || creatorProfile?.subscription_status === 'expired' || creatorProfile?.subscription_status === 'cancelled') && (
                <Link to="/creator/subscription?upgrade=true" className="s-btn-light">
                  Upgrade now
                </Link>
              )}
              {creatorProfile?.subscription_status === 'active' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <a href="https://www.paypal.com/myaccount/autopay/" target="_blank" rel="noopener noreferrer" className="s-plan-manage">
                    Manage PayPal
                  </a>
                  <button
                    className="s-cancel-link"
                    onClick={async () => {
                      if (window.confirm('Are you sure? Also cancel the recurring payment on PayPal.')) {
                        await supabase.from('creator_profiles').update({ subscription_status: 'cancelled' }).eq('id', user.id);
                        alert('Subscription cancelled. Please also cancel on PayPal.');
                        refreshProfile();
                      }
                    }}
                  >
                    Cancel Subscription
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* ════ PAYMENT SETTINGS ════ */}
          <section className="s-section s-card" id="pay">
            <header>
              <h2>Payment settings</h2>
              <p>Choose how learners pay you.</p>
            </header>

            <div className="s-seg" role="radiogroup" aria-label="Payment method">
              {[
                {
                  id: 'link',
                  title: 'Payment link',
                  desc: 'Share a URL: bKash, PayPal, etc.',
                  icon: <><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></>,
                },
                {
                  id: 'bank',
                  title: 'Bank details',
                  desc: 'Share your bank info directly',
                  icon: <><path d="M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/></>,
                },
                {
                  id: 'both',
                  title: 'Both options',
                  desc: 'Let learners choose their method',
                  icon: <><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/></>,
                },
              ].map(opt => (
                <label key={opt.id}>
                  <input
                    type="radio"
                    name="payMethod"
                    value={opt.id}
                    className="s-seg-input"
                    checked={payOpt === opt.id}
                    onChange={() => update('payment_option', opt.id)}
                  />
                  <span className="s-opt">
                    <svg className="s-opt-icon" viewBox="0 0 24 24">{opt.icon}</svg>
                    <b>{opt.title}</b>
                    <span>{opt.desc}</span>
                  </span>
                </label>
              ))}
            </div>

            {/* Payment link panel */}
            <div className={`s-panel${showLink ? ' show' : ''}`} id="linkPanel">
              <div className="s-field">
                <label htmlFor="paymentLink">Payment link URL</label>
                <input
                  id="paymentLink"
                  name="paymentLink"
                  type="url"
                  value={form.payment_link}
                  onChange={e => update('payment_link', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Bank panel */}
            <div className={`s-panel${showBank ? ' show' : ''}`} id="bankPanel">
              <h3 className="s-sub-heading">Bank account</h3>
              <div className="s-grid">
                <div className="s-field">
                  <label htmlFor="bankName">Bank name <em>*</em></label>
                  <select id="bankName" name="bankName" value={bankDetails.bank_name} onChange={e => setBankDetails({ ...bankDetails, bank_name: e.target.value })}>
                    <option value="">Select a bank</option>
                    <option value="Bank of Ceylon">Bank of Ceylon</option>
                    <option value="Commercial Bank of Ceylon PLC">Commercial Bank</option>
                    <option value="Hatton National Bank PLC">Hatton National Bank</option>
                    <option value="People's Bank">People's Bank</option>
                    <option value="Sampath Bank PLC">Sampath Bank</option>
                    <option value="Seylan Bank PLC">Seylan Bank</option>
                    <option value="Nations Trust Bank PLC">Nations Trust Bank</option>
                    <option value="DFCC Bank PLC">DFCC Bank</option>
                    <option value="National Development Bank PLC">National Development Bank</option>
                    <option value="Amana Bank PLC">Amana Bank</option>
                    <option value="Pan Asia Banking Corporation PLC">Pan Asia Banking</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="s-field">
                  <label htmlFor="holder">Account holder name <em>*</em></label>
                  <input id="holder" name="accountHolder" value={bankDetails.account_holder_name} onChange={e => setBankDetails({ ...bankDetails, account_holder_name: e.target.value })} />
                </div>

                <div className="s-field">
                  <label htmlFor="accNo">Account number <em>*</em></label>
                  <input id="accNo" name="accountNumber" inputMode="numeric" value={bankDetails.account_number} onChange={e => setBankDetails({ ...bankDetails, account_number: e.target.value })} />
                </div>

                <div className="s-field">
                  <label htmlFor="country">Country <em>*</em></label>
                  <select id="country" name="country" value={bankDetails.country} onChange={e => setBankDetails({ ...bankDetails, country: e.target.value })}>
                    <option value="US">United States</option>
                    <option value="LK">Sri Lanka</option>
                    <option value="IN">India</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="BD">Bangladesh</option>
                  </select>
                </div>

                <div className="s-field">
                  <label htmlFor="branch">Branch</label>
                  <input id="branch" name="branch" value={bankDetails.branch} onChange={e => setBankDetails({ ...bankDetails, branch: e.target.value })} />
                </div>

                <div className="s-field">
                  <label htmlFor="branchCode">Branch code</label>
                  <input id="branchCode" name="branchCode" value={bankDetails.branch_code} onChange={e => setBankDetails({ ...bankDetails, branch_code: e.target.value })} />
                </div>

                <div className="s-field s-full">
                  <label htmlFor="note">Extra note for learners</label>
                  <textarea id="note" name="note" value={bankDetails.extra_note} onChange={e => setBankDetails({ ...bankDetails, extra_note: e.target.value })} placeholder="e.g. Please use your full name as the payment reference" />
                </div>
              </div>
            </div>

            <div className="s-actions">
              <button className="s-btn" onClick={handleSavePayments} disabled={savingPay}>
                {savingPay ? <Loader2 size={16} className="animate-spin" /> : 'Save payment settings'}
              </button>
            </div>
          </section>

          {/* ════ PROFILE ════ */}
          <section className="s-section s-card" id="profile">
            <header>
              <h2>Profile information</h2>
              <p>This is what learners see on your courses.</p>
            </header>

            <div className="s-grid">
              <div className="s-field">
                <label htmlFor="first">First name</label>
                <input id="first" name="firstName" value={form.first_name} onChange={e => update('first_name', e.target.value)} />
              </div>

              <div className="s-field">
                <label htmlFor="last">Last name</label>
                <input id="last" name="lastName" value={form.last_name} onChange={e => update('last_name', e.target.value)} />
              </div>

              <div className="s-field">
                <label htmlFor="phone">Contact number</label>
                <input id="phone" name="contact" type="tel" value={form.contact_number} onChange={e => update('contact_number', e.target.value)} />
              </div>

              <div className="s-field">
                <label htmlFor="cat">Category</label>
                <select id="cat" name="category" value={form.category} onChange={e => update('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="s-field s-full">
                <label htmlFor="about">About</label>
                <textarea id="about" name="about" maxLength={300} value={form.about} onChange={e => update('about', e.target.value)} />
                <div className="s-hint">
                  <span>Tell learners who you are and what you teach.</span>
                  <span>{form.about.length}/300</span>
                </div>
              </div>
            </div>

            <div className="s-actions">
              <button className="s-btn" onClick={handleSaveProfile} disabled={savingProf}>
                {savingProf ? <Loader2 size={16} className="animate-spin" /> : 'Save changes'}
              </button>
            </div>
          </section>

          {/* ════ PASSWORD ════ */}
          <section className="s-section s-card" id="security">
            <header>
              <h2>Change password</h2>
              <p>Use at least 6 characters.</p>
            </header>

            <div className="s-grid">
              <div className="s-field">
                <label htmlFor="pw1">New password</label>
                <input
                  id="pw1"
                  name="newPassword"
                  type="password"
                  placeholder="Min 6 characters"
                  autoComplete="new-password"
                  value={passwords.new}
                  onChange={e => { setPasswords(p => ({ ...p, new: e.target.value })); setPwMsg(''); }}
                />
              </div>

              <div className="s-field">
                <label htmlFor="pw2">Confirm new password</label>
                <input
                  id="pw2"
                  name="confirmPassword"
                  type="password"
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  className={pwMsg ? 'err' : ''}
                  value={passwords.confirm}
                  onChange={e => { setPasswords(p => ({ ...p, confirm: e.target.value })); setPwMsg(''); }}
                />
                {pwMsg && <div className="s-hint bad">{pwMsg}</div>}
              </div>
            </div>

            <div className="s-actions">
              <button className="s-btn-ghost" onClick={handlePasswordChange} disabled={savingPw}>
                {savingPw ? <Loader2 size={16} className="animate-spin" /> : 'Update password'}
              </button>
            </div>
          </section>

        </div>{/* /s-stack */}
      </div>{/* /lora-settings */}

      {/* ── Toast (outside lora-settings, uses dedicated class) ── */}
      <div className={`lora-settings-toast${toastMsg ? ' show' : ''}`} role="status">
        {toastMsg}
      </div>
    </PageTransition>
  );
}
