import { useState, useEffect, useRef } from 'react';
import { Loader2, Crown, Sparkles, Camera, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { PageTransition } from '../components/ui';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';
import { isUserAdmin } from '../lib/admin';
import { Link } from 'react-router-dom';
import ThemeSwitcher from '../components/ThemeSwitcher';
import { processAndSquareImage, verifyHumanAuthenticity, uploadAvatarAndSaveProfile } from '../lib/avatarVerification';
import './settings.css';

const CATEGORIES = ['Technology', 'Design', 'Business', 'Language', 'Music', 'Fitness', 'Other'];

export default function CreatorSettings() {
  useSubscriptionGuard();
  const { profile, creatorProfile, refreshProfile, user } = useAuth();

  const [savingPay, setSavingPay] = useState(false);
  const [savingProf, setSavingProf] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Avatar upload and AI verification state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarStatus, setAvatarStatus] = useState({ stage: 'idle', message: '', isError: false });
  const fileInputRef = useRef(null);

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

  const [bankAccounts, setBankAccounts] = useState([
    {
      id: 'primary',
      bank_name: '',
      account_holder_name: '',
      account_number: '',
      branch: '',
      branch_code: '',
      country: 'LK',
      extra_note: '',
      is_primary: true,
    }
  ]);

  useEffect(() => {
    if (user) {
      supabase.from('creator_bank_details').select('*').eq('creator_id', user.id).maybeSingle()
        .then(({ data }) => {
          if (data) {
            if (Array.isArray(data.bank_accounts) && data.bank_accounts.length > 0) {
              setBankAccounts(data.bank_accounts);
            } else if (data.bank_name) {
              setBankAccounts([{
                id: data.id || 'primary',
                bank_name: data.bank_name || '',
                account_holder_name: data.account_holder_name || '',
                account_number: data.account_number || '',
                branch: data.branch || '',
                branch_code: data.branch_code || '',
                country: data.country || 'LK',
                extra_note: data.extra_note || '',
                is_primary: true,
              }]);
            }
          }
        });
    }
  }, [user]);

  const updateBankAccount = (id, field, value) => {
    setBankAccounts(prev => prev.map(acc => acc.id === id ? { ...acc, [field]: value } : acc));
  };

  const setPrimaryAccount = (id) => {
    setBankAccounts(prev => prev.map(acc => ({
      ...acc,
      is_primary: acc.id === id,
    })));
  };

  const addBankAccount = () => {
    if (bankAccounts.length >= 4) {
      showToast('Maximum 4 bank accounts allowed');
      return;
    }
    const newAcc = {
      id: 'acc_' + Date.now(),
      bank_name: '',
      account_holder_name: bankAccounts[0]?.account_holder_name || '',
      account_number: '',
      branch: '',
      branch_code: '',
      country: 'LK',
      extra_note: '',
      is_primary: false,
    };
    setBankAccounts(prev => [...prev, newAcc]);
  };

  const removeBankAccount = (id) => {
    if (bankAccounts.length <= 1) return;
    setBankAccounts(prev => {
      const remaining = prev.filter(acc => acc.id !== id);
      if (!remaining.some(acc => acc.is_primary) && remaining.length > 0) {
        remaining[0].is_primary = true;
      }
      return remaining;
    });
  };

  const [passwords, setPasswords] = useState({ new: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  /* ── Handlers ── */
  const handleSavePayments = async () => {
    setSavingPay(true);
    try {
      if (form.payment_option === 'bank' || form.payment_option === 'both') {
        for (let i = 0; i < bankAccounts.length; i++) {
          const acc = bankAccounts[i];
          if (!acc.bank_name || !acc.account_holder_name || !acc.account_number) {
            throw new Error(`Please complete Bank Name, Holder, and Account Number for Bank #${i + 1}.`);
          }
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
        const primaryAcc = bankAccounts.find(a => a.is_primary) || bankAccounts[0] || {};
        const basePayload = {
          creator_id: user.id,
          bank_name: primaryAcc.bank_name || '',
          account_holder_name: primaryAcc.account_holder_name || '',
          account_number: primaryAcc.account_number || '',
          branch: primaryAcc.branch || '',
          branch_code: primaryAcc.branch_code || '',
          country: primaryAcc.country || 'LK',
          extra_note: primaryAcc.extra_note || '',
          updated_at: new Date().toISOString()
        };

        // Try upserting with bank_accounts JSON column
        const { error: upsertErr } = await supabase.from('creator_bank_details').upsert({
          ...basePayload,
          bank_accounts: bankAccounts,
        }, { onConflict: 'creator_id' });

        if (upsertErr) {
          console.warn("Retrying bank save without bank_accounts column:", upsertErr.message);
          const { error: fallbackErr } = await supabase.from('creator_bank_details').upsert(basePayload, { onConflict: 'creator_id' });
          if (fallbackErr) throw fallbackErr;
        }
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

  const handleAvatarFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input so user can pick again if desired
    e.target.value = '';

    setUploadingAvatar(true);
    setAvatarStatus({ stage: 'processing', message: 'Optimizing and squaring photo (1:1)...', isError: false });

    try {
      // 1. Process & square image via canvas (enforces 1:1, max 5MB, 500x500px)
      const { blob, base64 } = await processAndSquareImage(file);

      // 2. Automated AI authenticity inspection (verifies real human vs cartoon/anime/object/AI art)
      setAvatarStatus({ stage: 'verifying', message: 'AI inspecting photo (confirming authentic human instructor)...', isError: false });
      const { verified, reason } = await verifyHumanAuthenticity(base64);

      if (!verified) {
        setAvatarStatus({
          stage: 'rejected',
          message: reason || 'Photo rejected: Please upload an authentic photograph of yourself. Cartoon avatars, logos, and AI art are not allowed.',
          isError: true
        });
        setUploadingAvatar(false);
        return;
      }

      // 3. Upload to Supabase Storage & update profiles table
      setAvatarStatus({ stage: 'uploading', message: 'Uploading verified instructor photo...', isError: false });
      await uploadAvatarAndSaveProfile(user.id, blob);

      // 4. Refresh auth profile
      await refreshProfile();
      setAvatarStatus({ stage: 'success', message: 'Photo verified and updated successfully!', isError: false });
      showToast('Profile photo updated & verified!');
    } catch (err) {
      console.error('[CreatorSettings] Avatar upload error:', err);
      setAvatarStatus({ stage: 'error', message: err.message || 'Failed to update photo.', isError: true });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!window.confirm('Are you sure you want to remove your profile picture?')) return;
    try {
      setUploadingAvatar(true);
      await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id);
      await refreshProfile();
      setAvatarStatus({ stage: 'idle', message: '', isError: false });
      showToast('Profile photo removed');
    } catch (err) {
      console.error('Remove avatar error:', err);
      showToast('Could not remove photo: ' + err.message);
    } finally {
      setUploadingAvatar(false);
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

  /* ── Subscription Status & Calculations ── */
  const isFounder = isUserAdmin(user?.email);
  const subStatus = isFounder ? 'active' : (creatorProfile?.subscription_status || 'trial');
  const nextBilling = creatorProfile?.next_billing_date ? new Date(creatorProfile.next_billing_date) : null;
  const trialEnd = new Date(creatorProfile?.trial_ends_at || Date.now());

  // Lifetime VIP (Founder, or active with no expiration, or date > 2090)
  const isLifetime = isFounder || (subStatus === 'active' && (!nextBilling || nextBilling.getFullYear() >= 2090));

  // Promotional/Granted Access (e.g. 6 months, 10 months, 1 year granted by founder)
  const isGrantedAccess = !isLifetime && subStatus === 'active' && nextBilling && (nextBilling - new Date() > 32 * 864e5);

  // Paid Monthly PayPal Subscription
  const isPaidActive = !isLifetime && !isGrantedAccess && subStatus === 'active';

  // Target expiry date
  const targetDate = isLifetime
    ? null
    : subStatus === 'trial'
      ? trialEnd
      : nextBilling;

  const daysLeft = targetDate
    ? Math.max(0, Math.ceil((targetDate - new Date()) / 864e5))
    : null;

  const total = subStatus === 'trial' ? 30 : Math.max(30, daysLeft || 30);
  const circumference = 264;
  const offset = isLifetime
    ? 0
    : circumference * (1 - Math.min(1, (daysLeft || 0) / total));

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
            { id: 'plan',       label: 'Subscription' },
            { id: 'pay',        label: 'Payments' },
            { id: 'profile',    label: 'Profile' },
            { id: 'appearance', label: 'Appearance' },
            { id: 'security',   label: 'Password' },
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
            <div className={`s-ring ${isLifetime ? 's-ring-vip' : ''}`} aria-hidden="true">
              <svg viewBox="0 0 100 100">
                <circle className="ring-track" cx="50" cy="50" r="42" />
                <circle
                  className={`ring-progress ${isLifetime ? 'ring-progress-vip' : ''}`}
                  cx="50" cy="50" r="42"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                />
              </svg>
              <div className={`s-ring-label ${isLifetime ? 's-ring-label-vip' : ''}`}>
                {isLifetime ? (
                  <>
                    <span style={{ fontSize: 32, lineHeight: 1 }}>∞</span>
                    <small>Lifetime</small>
                  </>
                ) : (
                  <>
                    <span>{daysLeft}</span>
                    <small>days left</small>
                  </>
                )}
              </div>
            </div>

            <div>
              <span className={`s-badge ${isLifetime ? 's-badge-vip' : ''}`}>
                {isLifetime
                  ? (isFounder ? '👑 Founder Lifetime VIP' : '👑 Lifetime VIP Access')
                  : isGrantedAccess
                    ? '🎉 Complimentary Access'
                    : subStatus === 'trial'
                      ? 'Free trial'
                      : subStatus === 'active'
                        ? 'Active Subscription'
                        : 'Expired'}
              </span>
              <h2>Lora Creator Plan</h2>
              <p>
                {isLifetime
                  ? 'You have permanent, unrestricted access to all Lora Creator features. No renewals or payments needed.'
                  : isGrantedAccess && nextBilling
                    ? `Complimentary creator access active until ${nextBilling.toLocaleDateString()}.`
                    : subStatus === 'trial'
                      ? `Trial ends on ${trialEnd.toLocaleDateString()}, then Rs.\u00a03,499/month.`
                      : isPaidActive && nextBilling
                        ? `Next billing: ${nextBilling.toLocaleDateString()} · Rs.\u00a03,499/month`
                        : 'Rs.\u00a03,499/month'}
              </p>
            </div>

            <div>
              {isLifetime ? (
                <div className="s-plan-vip-pill">
                  <Sparkles size={16} />
                  <span>VIP Status Active</span>
                </div>
              ) : isGrantedAccess ? (
                <div className="s-plan-vip-pill" style={{ borderColor: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)' }}>
                  <span>{daysLeft} Days Remaining</span>
                </div>
              ) : (subStatus === 'trial' || subStatus === 'expired' || subStatus === 'cancelled') ? (
                <Link to="/creator/subscription?upgrade=true" className="s-btn-light">
                  Upgrade now
                </Link>
              ) : isPaidActive ? (
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
              ) : null}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <h3 className="s-sub-heading" style={{ margin: 0 }}>Bank accounts</h3>
                  <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--s-muted)' }}>
                    Add multiple banks so learners can choose the most convenient one.
                  </p>
                </div>
              </div>

              {bankAccounts.map((acc, index) => (
                <div key={acc.id || index} className={`s-bank-card ${acc.is_primary ? 'is-primary' : ''}`}>
                  <div className="s-bank-head">
                    <div className="s-bank-title">
                      <span>🏦 Bank #{index + 1}{acc.bank_name ? ` · ${acc.bank_name}` : ''}</span>
                      {acc.is_primary && (
                        <span className="s-bank-primary-badge">
                          ⭐ Primary (Default)
                        </span>
                      )}
                    </div>
                    <div className="s-bank-actions">
                      {!acc.is_primary && (
                        <button
                          type="button"
                          className="s-btn-text"
                          onClick={() => setPrimaryAccount(acc.id)}
                        >
                          Set as primary
                        </button>
                      )}
                      {bankAccounts.length > 1 && (
                        <button
                          type="button"
                          className="s-btn-text s-btn-text-danger"
                          onClick={() => removeBankAccount(acc.id)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="s-grid">
                    <div className="s-field">
                      <label htmlFor={`bankName_${acc.id}`}>Bank name <em>*</em></label>
                      <select
                        id={`bankName_${acc.id}`}
                        name="bankName"
                        value={acc.bank_name}
                        onChange={e => updateBankAccount(acc.id, 'bank_name', e.target.value)}
                      >
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
                      <label htmlFor={`holder_${acc.id}`}>Account holder name <em>*</em></label>
                      <input
                        id={`holder_${acc.id}`}
                        name="accountHolder"
                        value={acc.account_holder_name}
                        onChange={e => updateBankAccount(acc.id, 'account_holder_name', e.target.value)}
                      />
                    </div>

                    <div className="s-field">
                      <label htmlFor={`accNo_${acc.id}`}>Account number <em>*</em></label>
                      <input
                        id={`accNo_${acc.id}`}
                        name="accountNumber"
                        inputMode="numeric"
                        value={acc.account_number}
                        onChange={e => updateBankAccount(acc.id, 'account_number', e.target.value)}
                      />
                    </div>

                    <div className="s-field">
                      <label htmlFor={`country_${acc.id}`}>Country <em>*</em></label>
                      <select
                        id={`country_${acc.id}`}
                        name="country"
                        value={acc.country}
                        onChange={e => updateBankAccount(acc.id, 'country', e.target.value)}
                      >
                        <option value="US">United States</option>
                        <option value="LK">Sri Lanka</option>
                        <option value="IN">India</option>
                        <option value="GB">United Kingdom</option>
                        <option value="AU">Australia</option>
                        <option value="BD">Bangladesh</option>
                      </select>
                    </div>

                    <div className="s-field">
                      <label htmlFor={`branch_${acc.id}`}>Branch</label>
                      <input
                        id={`branch_${acc.id}`}
                        name="branch"
                        value={acc.branch}
                        onChange={e => updateBankAccount(acc.id, 'branch', e.target.value)}
                      />
                    </div>

                    <div className="s-field">
                      <label htmlFor={`branchCode_${acc.id}`}>Branch code</label>
                      <input
                        id={`branchCode_${acc.id}`}
                        name="branchCode"
                        value={acc.branch_code}
                        onChange={e => updateBankAccount(acc.id, 'branch_code', e.target.value)}
                      />
                    </div>

                    <div className="s-field s-full">
                      <label htmlFor={`note_${acc.id}`}>Extra note for learners</label>
                      <textarea
                        id={`note_${acc.id}`}
                        name="note"
                        value={acc.extra_note}
                        onChange={e => updateBankAccount(acc.id, 'extra_note', e.target.value)}
                        placeholder="e.g. Please use your full name or reference code as the payment description"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {bankAccounts.length < 4 && (
                <button
                  type="button"
                  className="s-add-bank-btn"
                  onClick={addBankAccount}
                >
                  + Add another bank account ({bankAccounts.length}/4)
                </button>
              )}
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

            {/* Profile Photo Upload & AI Authenticity Card */}
            <div className="s-avatar-card">
              <div className="s-avatar-preview-wrap">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="s-avatar-img" />
                ) : (
                  <span>{profile?.first_name?.[0] || 'C'}{profile?.last_name?.[0] || ''}</span>
                )}
              </div>

              <div className="s-avatar-info">
                <div className="s-avatar-title-row">
                  <h3 className="s-avatar-title">Instructor Profile Photo</h3>
                  {profile?.avatar_url && (
                    <span className="s-avatar-verified-pill">
                      <CheckCircle2 size={13} /> Real Instructor Photo
                    </span>
                  )}
                </div>

                <p className="s-avatar-desc">
                  Upload a real photograph of yourself. Authentic photos confirm instructor credibility for new learners and boost course enrollments.
                </p>

                <div className="s-avatar-specs">
                  <span className="s-avatar-spec-chip">✓ Square 1:1 (auto-cropped)</span>
                  <span className="s-avatar-spec-chip">✓ Real human face required</span>
                  <span className="s-avatar-spec-chip">✓ Max 5 MB (JPG, PNG, WEBP)</span>
                  <span className="s-avatar-spec-chip">🚫 No cartoons, AI art or objects</span>
                </div>

                <div className="s-avatar-actions">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarFileSelect}
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="s-btn-upload-photo"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? (
                      <><Loader2 size={15} className="animate-spin" /> {avatarStatus.message || 'Verifying photo...'}</>
                    ) : (
                      <><Camera size={15} /> {profile?.avatar_url ? 'Change Photo' : 'Upload Real Photo'}</>
                    )}
                  </button>

                  {profile?.avatar_url && !uploadingAvatar && (
                    <button
                      type="button"
                      className="s-btn-remove-photo"
                      onClick={handleRemoveAvatar}
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  )}
                </div>

                {avatarStatus.message && (
                  <div className={`s-avatar-alert ${avatarStatus.isError ? 'error' : 'scanning'}`}>
                    {avatarStatus.isError ? <AlertTriangle size={16} /> : <Loader2 size={16} className="animate-spin" />}
                    <span>{avatarStatus.message}</span>
                  </div>
                )}
              </div>
            </div>

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

          {/* ════ APPEARANCE & THEME ════ */}
          <section className="s-section s-card" id="appearance">
            <header>
              <h2>Appearance &amp; Theme</h2>
              <p>Choose your preferred interface theme or allow LoraSpace to auto-select based on your system settings.</p>
            </header>
            <div style={{ marginTop: 14 }}>
              <ThemeSwitcher variant="segmented" />
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
