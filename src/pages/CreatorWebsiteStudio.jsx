import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import {
  Globe,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Palette,
  Layout,
  UserCheck,
  Loader2,
  Crown,
  Lock,
  Upload,
  Video,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { isUserAdmin } from '../lib/admin';
import { PageTransition } from '../components/ui';
import {
  SUB_WEB_THEMES,
  getThemeById,
  sanitizeSubdomainSlug,
  sanitizeCustomDomain,
  getSubWebUrls,
  normalizeSubWebConfig,
  saveCreatorSubWebConfig,
} from '../lib/subWeb';
import './creator-website-studio.css';

export default function CreatorWebsiteStudio() {
  const { user, profile, creatorProfile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('domain'); // 'domain' | 'branding' | 'hero' | 'about'
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [copiedType, setCopiedType] = useState(null);
  const [toastMsg, setToastMsg] = useState('');

  const [form, setForm] = useState(() =>
    normalizeSubWebConfig(creatorProfile, profile)
  );

  useEffect(() => {
    if (creatorProfile || profile) {
      setForm(normalizeSubWebConfig(creatorProfile, profile));
    }
  }, [creatorProfile, profile]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3200);
  };

  const isFounder = isUserAdmin(user?.email);
  const isLifetimeVip =
    isFounder ||
    (creatorProfile?.subscription_status === 'active' && !creatorProfile?.next_billing_date);
  const isWebsiteUnlocked = Boolean(isFounder || isLifetimeVip || form.has_sub_web);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleUploadImage = async (e, targetKey, setUploadingState) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingState(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/subweb-${targetKey}-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('thumbnails').upload(path, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('thumbnails').getPublicUrl(path);
      if (urlData?.publicUrl) {
        updateField(targetKey, urlData.publicUrl);
        showToast('Image uploaded! Click Save Website Settings to publish.');
      }
    } catch (err) {
      showToast('Upload error: ' + err.message);
    } finally {
      setUploadingState(false);
    }
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const cleanSlug = sanitizeSubdomainSlug(form.sub_web_slug) || 'my-academy';
      const cleanDomain = sanitizeCustomDomain(form.custom_domain);
      const nextPayload = {
        ...form,
        has_sub_web: isWebsiteUnlocked,
        sub_web_slug: cleanSlug,
        custom_domain: cleanDomain,
      };
      setForm(nextPayload);
      await saveCreatorSubWebConfig(user.id, nextPayload);
      if (refreshProfile) await refreshProfile();
      showToast('✓ Your Academy Website settings have been saved!');
    } catch (err) {
      showToast('Error saving website settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const urls = getSubWebUrls(form.sub_web_slug, form.custom_domain);
  const theme = getThemeById(form.theme_color);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedType(key);
    showToast(`Copied ${text} to clipboard!`);
    setTimeout(() => setCopiedType(null), 2200);
  };

  return (
    <PageTransition>
      <div className="cws-page">
        {/* Top Hero Banner */}
        <section className="cws-hero-banner">
          <div>
            <span className={`cws-hero-kicker ${isWebsiteUnlocked ? 'is-live' : ''}`}>
              {isWebsiteUnlocked ? (
                <>
                  <Check size={13} /> OWN ACADEMY WEBSITE ACTIVE (LIFETIME LICENSE)
                </>
              ) : (
                <>
                  <Crown size={13} /> OWN ACADEMY WEBSITE BUILDER (SUB-WEB STUDIO)
                </>
              )}
            </span>
            <h1 className="cws-hero-title">My Branded Academy Website</h1>
            <p className="cws-hero-sub">
              Give your students a standalone academy website at{' '}
              <b style={{ color: '#ffffff' }}>{urls.subdomainDisplay}</b> (or your own custom domain) with your logo, brand colors, and zero competitor links.
            </p>
          </div>

          <div className="cws-hero-actions">
            <Link
              to={`/s/${urls.slug}`}
              target="_blank"
              className="cws-btn-live"
            >
              <ExternalLink size={15} />
              <span>Preview Live Website</span>
            </Link>

            {!isWebsiteUnlocked && (
              <Link
                to="/creator/subscription?plan=onetime&upgrade=true"
                className="cws-btn-upgrade"
              >
                <Crown size={16} />
                <span>Unlock Own Website (Rs. 34,499 One-Time)</span>
              </Link>
            )}
          </div>
        </section>

        {/* Focused 4-Tab Bar (Zero Long Scrolling) */}
        <nav className="cws-tabs" aria-label="Website builder sections">
          <button
            type="button"
            onClick={() => setActiveTab('domain')}
            className={`cws-tab-btn ${activeTab === 'domain' ? 'active' : ''}`}
          >
            <Globe size={16} />
            <span>1. Domain &amp; Subdomain</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('branding')}
            className={`cws-tab-btn ${activeTab === 'branding' ? 'active' : ''}`}
          >
            <Palette size={16} />
            <span>2. Logo &amp; Brand Theme</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hero')}
            className={`cws-tab-btn ${activeTab === 'hero' ? 'active' : ''}`}
          >
            <Layout size={16} />
            <span>3. Hero &amp; Trailer Video</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('about')}
            className={`cws-tab-btn ${activeTab === 'about' ? 'active' : ''}`}
          >
            <UserCheck size={16} />
            <span>4. About &amp; Contact</span>
          </button>
        </nav>

        {/* Main Studio Grid */}
        <div className="cws-grid">
          {/* Left Column: Active Tab Form */}
          <form onSubmit={handleSave} className="cws-card">
            {/* TAB 1: DOMAIN & SUBDOMAIN */}
            {activeTab === 'domain' && (
              <>
                <div className="cws-card-head">
                  <h2>Subdomain &amp; Custom Domain Setup</h2>
                  <p>
                    Choose your official subdomain address (e.g. <b>apex-physics.loraspace.com</b>) or connect your own custom domain.
                  </p>
                </div>

                <div className="cws-field">
                  <label htmlFor="sw-slug">Your Subdomain Address</label>
                  <div className="cws-subdomain-group">
                    <span className="cws-subdomain-prefix">https://</span>
                    <input
                      id="sw-slug"
                      type="text"
                      className="cws-subdomain-input"
                      value={form.sub_web_slug}
                      onChange={(e) => updateField('sub_web_slug', sanitizeSubdomainSlug(e.target.value))}
                      placeholder="apex-physics"
                      required
                    />
                    <span className="cws-subdomain-suffix">.{urls.baseDomain}</span>
                  </div>
                  <small>
                    Use lowercase letters, numbers, and hyphens (e.g. <code>apex-physics</code>, <code>kasun-maths</code>).
                  </small>
                </div>

                {/* Live Access Links */}
                <div className="cws-url-box">
                  <div className="cws-url-row">
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>
                        PRIMARY SUBDOMAIN ADDRESS
                      </div>
                      <code className="cws-url-code">{urls.subdomainUrl}</code>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => handleCopy(urls.subdomainUrl, 'sub')}
                        className="cws-mini-btn"
                      >
                        {copiedType === 'sub' ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiedType === 'sub' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="cws-url-row" style={{ paddingTop: 10, borderTop: '1px dashed #e2e8f0' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>
                        DIRECT SHAREABLE PATH LINK (WORKS IMMEDIATELY)
                      </div>
                      <code className="cws-url-code">{urls.pathUrl}</code>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => handleCopy(urls.pathUrl, 'path')}
                        className="cws-mini-btn"
                      >
                        {copiedType === 'path' ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiedType === 'path' ? 'Copied' : 'Copy'}</span>
                      </button>
                      <Link to={`/s/${urls.slug}`} target="_blank" className="cws-mini-btn">
                        <ExternalLink size={13} />
                        <span>Open</span>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* VIP Custom Domain Section */}
                <div className="cws-custom-domain-box">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Crown size={18} color="#7c3aed" />
                      <b style={{ fontSize: 15, color: '#4c1d95' }}>
                        VIP Custom Domain (e.g. www.youracademy.lk)
                      </b>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '3px 10px',
                        borderRadius: 99,
                        background: '#ede9fe',
                        color: '#6d28d9',
                      }}
                    >
                      OPTIONAL VIP ADD-ON
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: 13, color: '#5b21b6', lineHeight: 1.55 }}>
                    Want your students to visit <b>www.youracademy.lk</b> or <b>www.youracademy.com</b>? Enter your domain below and point its DNS <code>CNAME</code> record to LoraSpace.
                  </p>

                  <div className="cws-field">
                    <input
                      type="text"
                      className="cws-input"
                      placeholder="e.g. www.apexphysics.lk"
                      value={form.custom_domain}
                      onChange={(e) => updateField('custom_domain', e.target.value)}
                    />
                  </div>

                  <table className="cws-dns-table">
                    <thead>
                      <tr>
                        <th>Record Type</th>
                        <th>Host / Name</th>
                        <th>Target / Points To</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><b>CNAME</b></td>
                        <td><code>www</code> (or <code>@</code>)</td>
                        <td><code>{urls.baseDomain}</code></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* TAB 2: LOGO & BRAND THEME */}
            {activeTab === 'branding' && (
              <>
                <div className="cws-card-head">
                  <h2>Academy Identity &amp; Brand Color Theme</h2>
                  <p>Customize the navbar logo, academy name, and color scheme of your website.</p>
                </div>

                <div className="cws-field">
                  <label htmlFor="sw-name">Academy / Website Name *</label>
                  <input
                    id="sw-name"
                    type="text"
                    className="cws-input"
                    value={form.academy_name}
                    onChange={(e) => updateField('academy_name', e.target.value)}
                    placeholder="e.g. Apex Physics Academy"
                    required
                  />
                </div>

                <div className="cws-field">
                  <label htmlFor="sw-tagline">Short Navbar Tagline</label>
                  <input
                    id="sw-tagline"
                    type="text"
                    className="cws-input"
                    value={form.tagline}
                    onChange={(e) => updateField('tagline', e.target.value)}
                    placeholder="e.g. Official Online Learning Portal & Live Classes"
                  />
                </div>

                {/* Color Theme Selector */}
                <div className="cws-field">
                  <label>Brand Color Theme</label>
                  <div className="cws-theme-grid">
                    {SUB_WEB_THEMES.map((t) => {
                      const active = form.theme_color === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => updateField('theme_color', t.id)}
                          className={`cws-theme-card ${active ? 'active' : ''}`}
                        >
                          <span
                            className="cws-theme-swatch"
                            style={{ background: t.heroGradient }}
                          />
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 13.5 }}>{t.name}</div>
                            <div style={{ fontSize: 11.5, color: '#64748b' }}>
                              {active ? '✓ Selected' : 'Click to apply'}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Academy Logo Upload */}
                <div className="cws-field">
                  <label>Academy Logo (Square 1:1 recommended)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    {form.logo_url && (
                      <img
                        src={form.logo_url}
                        alt="Academy logo"
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 14,
                          objectFit: 'cover',
                          border: '1.5px solid #cbd5e1',
                        }}
                      />
                    )}
                    <label className="cws-mini-btn" style={{ padding: '10px 16px' }}>
                      {uploadingLogo ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      <span>{uploadingLogo ? 'Uploading...' : 'Upload Logo Image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => handleUploadImage(e, 'logo_url', setUploadingLogo)}
                      />
                    </label>
                    <input
                      type="url"
                      className="cws-input"
                      style={{ flex: 1, minWidth: 200 }}
                      placeholder="Or paste logo image URL..."
                      value={form.logo_url}
                      onChange={(e) => updateField('logo_url', e.target.value)}
                    />
                  </div>
                </div>

                {/* White-Label Footer Toggle */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    padding: '16px 20px',
                    borderRadius: 16,
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <b style={{ fontSize: 14, display: 'block', marginBottom: 3 }}>
                      100% White-Label Footer (Hide &ldquo;Powered by LoraSpace&rdquo;)
                    </b>
                    <span style={{ fontSize: 12.5, color: '#64748b' }}>
                      Remove the LoraSpace badge from your website footer so only your Academy copyright is shown.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(form.hide_lora_badge)}
                    onChange={(e) => updateField('hide_lora_badge', e.target.checked)}
                    style={{ width: 20, height: 20, accentColor: '#2563eb' }}
                  />
                </label>
              </>
            )}

            {/* TAB 3: HERO & TRAILER VIDEO */}
            {activeTab === 'hero' && (
              <>
                <div className="cws-card-head">
                  <h2>Hero Showcase &amp; Trailer Video</h2>
                  <p>Customize the first thing students see when they land on your website.</p>
                </div>

                <div className="cws-field">
                  <label htmlFor="sw-ann">Top Announcement Bar (Optional)</label>
                  <input
                    id="sw-ann"
                    type="text"
                    className="cws-input"
                    value={form.announcement_text}
                    onChange={(e) => updateField('announcement_text', e.target.value)}
                    placeholder="e.g. 🔥 2026 New Theory Batch Enrollments Now Open! Use code EARLY20 for 20% OFF"
                  />
                </div>

                <div className="cws-field">
                  <label htmlFor="sw-hbadge">Hero Badge Text</label>
                  <input
                    id="sw-hbadge"
                    type="text"
                    className="cws-input"
                    value={form.hero_badge}
                    onChange={(e) => updateField('hero_badge', e.target.value)}
                    placeholder="e.g. OFFICIAL ACADEMY PORTAL"
                  />
                </div>

                <div className="cws-field">
                  <label htmlFor="sw-htitle">Hero Main Headline *</label>
                  <input
                    id="sw-htitle"
                    type="text"
                    className="cws-input"
                    value={form.hero_title}
                    onChange={(e) => updateField('hero_title', e.target.value)}
                    placeholder="e.g. Master A/L Physics with Structured Live Classes"
                    required
                  />
                </div>

                <div className="cws-field">
                  <label htmlFor="sw-hsub">Hero Subtitle / Description</label>
                  <textarea
                    id="sw-hsub"
                    className="cws-textarea"
                    rows={3}
                    value={form.hero_subtitle}
                    onChange={(e) => updateField('hero_subtitle', e.target.value)}
                    placeholder="Explain what makes your classes special and how students learn with you..."
                  />
                </div>

                <div className="cws-field">
                  <label htmlFor="sw-video">
                    <Video size={14} style={{ display: 'inline', marginRight: 6 }} />
                    Intro Trailer Video URL (YouTube)
                  </label>
                  <input
                    id="sw-video"
                    type="url"
                    className="cws-input"
                    value={form.intro_video_url}
                    onChange={(e) => updateField('intro_video_url', e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                  <small>
                    If provided, an interactive YouTube video player will appear directly in your website hero section.
                  </small>
                </div>

                <div className="cws-field">
                  <label>Hero Cover Image (Used if no YouTube video is set)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <label className="cws-mini-btn" style={{ padding: '10px 16px' }}>
                      {uploadingBanner ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      <span>{uploadingBanner ? 'Uploading...' : 'Upload Hero Banner'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => handleUploadImage(e, 'hero_banner_url', setUploadingBanner)}
                      />
                    </label>
                    <input
                      type="url"
                      className="cws-input"
                      style={{ flex: 1, minWidth: 200 }}
                      placeholder="Or paste 16:9 banner image URL..."
                      value={form.hero_banner_url}
                      onChange={(e) => updateField('hero_banner_url', e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
                  <div className="cws-field">
                    <label>Highlight Pill 1</label>
                    <input
                      type="text"
                      className="cws-input"
                      value={form.stats_badge_1}
                      onChange={(e) => updateField('stats_badge_1', e.target.value)}
                      placeholder="Live Interactive Classes"
                    />
                  </div>
                  <div className="cws-field">
                    <label>Highlight Pill 2</label>
                    <input
                      type="text"
                      className="cws-input"
                      value={form.stats_badge_2}
                      onChange={(e) => updateField('stats_badge_2', e.target.value)}
                      placeholder="HD Catch-Up Recordings"
                    />
                  </div>
                  <div className="cws-field">
                    <label>Highlight Pill 3</label>
                    <input
                      type="text"
                      className="cws-input"
                      value={form.stats_badge_3}
                      onChange={(e) => updateField('stats_badge_3', e.target.value)}
                      placeholder="Direct Mentor Support"
                    />
                  </div>
                </div>
              </>
            )}

            {/* TAB 4: ABOUT & CONTACT */}
            {activeTab === 'about' && (
              <>
                <div className="cws-card-head">
                  <h2>About the Academy &amp; Direct Contact Channels</h2>
                  <p>Build trust with prospective students and parents by sharing your background and contact links.</p>
                </div>

                <div className="cws-field">
                  <label htmlFor="sw-atitle">About Section Heading</label>
                  <input
                    id="sw-atitle"
                    type="text"
                    className="cws-input"
                    value={form.about_title}
                    onChange={(e) => updateField('about_title', e.target.value)}
                    placeholder="e.g. Meet Your Instructor"
                  />
                </div>

                <div className="cws-field">
                  <label htmlFor="sw-adesc">Full Instructor / Academy Biography</label>
                  <textarea
                    id="sw-adesc"
                    className="cws-textarea"
                    rows={5}
                    value={form.about_description}
                    onChange={(e) => updateField('about_description', e.target.value)}
                    placeholder="Share your qualifications, teaching philosophy, island ranks, or academy story..."
                  />
                </div>

                <div className="cws-field">
                  <label>
                    <MessageCircle size={14} style={{ display: 'inline', marginRight: 6 }} />
                    WhatsApp Inquiry Number (Shows &ldquo;Ask on WhatsApp&rdquo; buttons)
                  </label>
                  <PhoneInput
                    international
                    defaultCountry="LK"
                    value={form.whatsapp_number}
                    onChange={(v) => updateField('whatsapp_number', v || '')}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                  <div className="cws-field">
                    <label>Public WhatsApp Community Link</label>
                    <input
                      type="url"
                      className="cws-input"
                      placeholder="https://chat.whatsapp.com/..."
                      value={form.whatsapp_group}
                      onChange={(e) => updateField('whatsapp_group', e.target.value)}
                    />
                  </div>

                  <div className="cws-field">
                    <label>Telegram Channel Link</label>
                    <input
                      type="url"
                      className="cws-input"
                      placeholder="https://t.me/..."
                      value={form.telegram_link}
                      onChange={(e) => updateField('telegram_link', e.target.value)}
                    />
                  </div>

                  <div className="cws-field">
                    <label>YouTube Channel Link</label>
                    <input
                      type="url"
                      className="cws-input"
                      placeholder="https://youtube.com/@..."
                      value={form.youtube_channel}
                      onChange={(e) => updateField('youtube_channel', e.target.value)}
                    />
                  </div>

                  <div className="cws-field">
                    <label>Facebook Page Link</label>
                    <input
                      type="url"
                      className="cws-input"
                      placeholder="https://facebook.com/..."
                      value={form.facebook_page}
                      onChange={(e) => updateField('facebook_page', e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Save Footer */}
            <div className="cws-save-bar">
              <span style={{ fontSize: 12.5, color: '#64748b' }}>
                All changes update your live academy website immediately.
              </span>

              <button type="submit" className="cws-btn-save" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving Website...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Save Website Settings</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Right Column: Live Interactive Mini-Browser Preview */}
          <aside className="cws-preview-sticky">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 800,
                  color: '#059669',
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  padding: '4px 12px',
                  borderRadius: 99,
                }}
              >
                ● LIVE SUB-WEB PREVIEW
              </span>
              <Link
                to={`/s/${urls.slug}`}
                target="_blank"
                style={{ fontSize: 12.5, fontWeight: 700, color: '#2563eb', textDecoration: 'none' }}
              >
                Open Full Screen ↗
              </Link>
            </div>

            <div className="cws-browser-mockup">
              <div className="cws-browser-bar">
                <div className="cws-browser-dots">
                  <i style={{ background: '#ef4444' }} />
                  <i style={{ background: '#f59e0b' }} />
                  <i style={{ background: '#10b981' }} />
                </div>
                <div className="cws-browser-url">
                  🔒 {urls.customDomain || urls.subdomainDisplay}
                </div>
              </div>

              {/* Mini Website Preview Body */}
              <div>
                {form.announcement_text && (
                  <div
                    style={{
                      background: theme.buttonGradient,
                      color: '#fff',
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '6px 12px',
                      textAlign: 'center',
                    }}
                  >
                    {form.announcement_text}
                  </div>
                )}

                {/* Mini Navbar */}
                <div
                  style={{
                    padding: '12px 16px',
                    background: '#ffffff',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: theme.buttonGradient,
                        color: '#fff',
                        display: 'grid',
                        placeItems: 'center',
                        fontWeight: 800,
                        fontSize: 12,
                        overflow: 'hidden',
                      }}
                    >
                      {form.logo_url ? (
                        <img src={form.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        form.academy_name?.[0] || 'A'
                      )}
                    </div>
                    <b style={{ fontSize: 13, color: '#0f172a' }}>{form.academy_name}</b>
                  </div>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 99,
                      background: theme.buttonGradient,
                      color: '#fff',
                      fontSize: 10.5,
                      fontWeight: 700,
                    }}
                  >
                    Join Academy
                  </span>
                </div>

                {/* Mini Hero */}
                <div
                  style={{
                    background: theme.heroGradient,
                    color: '#ffffff',
                    padding: '22px 18px',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '3px 9px',
                      borderRadius: 99,
                      background: theme.badgeBg,
                      color: theme.badgeText,
                      fontSize: 9.5,
                      fontWeight: 800,
                      marginBottom: 8,
                    }}
                  >
                    {form.hero_badge || 'OFFICIAL ACADEMY'}
                  </span>
                  <h3
                    style={{
                      fontFamily: 'Bricolage Grotesque, sans-serif',
                      fontSize: 18,
                      fontWeight: 800,
                      margin: '0 0 6px',
                      lineHeight: 1.2,
                    }}
                  >
                    {form.hero_title}
                  </h3>
                  <p
                    style={{
                      fontSize: 11.5,
                      color: 'rgba(255,255,255,0.82)',
                      margin: '0 0 14px',
                      lineHeight: 1.45,
                    }}
                  >
                    {form.hero_subtitle}
                  </p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {form.stats_badge_1 && (
                      <span
                        style={{
                          fontSize: 10,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: 'rgba(255,255,255,0.12)',
                        }}
                      >
                        ✓ {form.stats_badge_1}
                      </span>
                    )}
                    {form.stats_badge_2 && (
                      <span
                        style={{
                          fontSize: 10,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: 'rgba(255,255,255,0.12)',
                        }}
                      >
                        ✓ {form.stats_badge_2}
                      </span>
                    )}
                  </div>
                </div>

                {/* Mini Footer */}
                <div
                  style={{
                    padding: '12px 16px',
                    background: '#0f172a',
                    color: '#94a3b8',
                    fontSize: 10.5,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>© {new Date().getFullYear()} {form.academy_name}</span>
                  {!form.hide_lora_badge && <span>Powered by LoraSpace</span>}
                </div>
              </div>
            </div>

            {!isWebsiteUnlocked && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                  border: '1.5px solid #fcd34d',
                  borderRadius: 18,
                  padding: '16px 18px',
                  color: '#92400e',
                  fontSize: 12.5,
                  lineHeight: 1.55,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 800, fontSize: 13.5, marginBottom: 4 }}>
                  <Lock size={14} />
                  <span>Own Website License: Rs. 34,499 One-Time</span>
                </div>
                Upgrade to the <b>Own Academy Website Package</b> to permanently activate{' '}
                <b>{urls.subdomainDisplay}</b> and remove monthly subscription fees forever!
              </div>
            )}
          </aside>
        </div>

        {toastMsg && (
          <div
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 9999,
              background: '#0f172a',
              color: '#ffffff',
              padding: '12px 20px',
              borderRadius: 14,
              fontWeight: 700,
              fontSize: 14,
              boxShadow: '0 14px 32px rgba(0,0,0,0.35)',
            }}
          >
            {toastMsg}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
