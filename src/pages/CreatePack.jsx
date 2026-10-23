import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { PageTransition } from '../components/ui';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';
import { generateUniquePackSlug } from '../lib/utils';
import './create-pack.css';

const STEPS = ['Basic Info', 'Media', 'Contact & Community', 'Sessions', 'Review'];
const CATEGORIES = ['Technology', 'Design', 'Business', 'Language', 'Music', 'Fitness', 'Other'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'BDT', 'INR', 'PKR', 'NGN', 'KES', 'PHP', 'BRL', 'LKR'];

const STEP_META = [
  {
    title: 'Basic info',
    desc: 'Tell learners what your pack is about.',
    icon: <path d="M4 6h16M4 12h16M4 18h10" />,
    sClass: 's1',
  },
  {
    title: 'Media',
    desc: 'Add a cover image and an intro video.',
    icon: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="10" r="2" />
        <path d="m21 16-5-5-9 9" />
      </>
    ),
    sClass: 's2',
  },
  {
    title: 'Contact & community',
    desc: 'Help learners reach you and join your community.',
    icon: (
      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" />
    ),
    sClass: 's3',
  },
  {
    title: 'Sessions',
    desc: 'Add a free preview and your paid sessions.',
    icon: (
      <>
        <rect x="3" y="6" width="13" height="12" rx="2" />
        <path d="m16 10 5-3v10l-5-3" />
      </>
    ),
    sClass: 's4',
  },
  {
    title: 'Review',
    desc: 'Check everything before you publish.',
    icon: <path d="m5 12 5 5 9-10" />,
    sClass: 's5',
  },
];

const emptySession = () => ({
  id: crypto.randomUUID(),
  title: '',
  zoom_link: '',
  scheduled_at: '',
  duration_minutes: 60,
  is_free_session: false,
});

export default function CreatePack() {
  useSubscriptionGuard();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const toastTimeoutRef = useRef(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMsg(''), 2500);
  };

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    currency: 'USD',
    thumbnail: null,
    thumbnailPreview: null,
    intro_video_url: '',
    whatsapp_number: profile?.contact_number || '',
    whatsapp_link: '',
    telegram_link: '',
    has_free_session: false,
    freeSession: { title: '', zoom_link: '', scheduled_at: '', duration_minutes: 60, recording_url: '' },
    sessions: [emptySession()],
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const updateFreeSession = (field, value) =>
    setForm(prev => ({ ...prev, freeSession: { ...prev.freeSession, [field]: value } }));

  const updateSession = (idx, field, value) =>
    setForm(prev => ({
      ...prev,
      sessions: prev.sessions.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    }));

  const addSession = () =>
    setForm(prev => ({ ...prev, sessions: [...prev.sessions, emptySession()] }));

  const removeSession = (idx) =>
    setForm(prev => ({ ...prev, sessions: prev.sessions.filter((_, i) => i !== idx) }));

  const handleThumbnail = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    update('thumbnail', file);
    update('thumbnailPreview', URL.createObjectURL(file));
  };

  const canNext = () => {
    switch (step) {
      case 0:
        return Boolean(form.title.trim() && form.description.trim() && form.category && form.price);
      case 1:
        return true;
      case 2:
        return true;
      case 3: {
        if (form.has_free_session) {
          const fs = form.freeSession;
          if (!fs.title.trim() || !fs.zoom_link.trim() || !fs.scheduled_at) return false;
        }
        return form.sessions.every(s => s.title.trim() && s.zoom_link.trim() && s.scheduled_at);
      }
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!canNext()) return;
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (step === 0) return;
    setStep(s => s - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async (publish) => {
    setSaving(true);
    try {
      let thumbnailUrl = null;
      if (form.thumbnail) {
        const ext = form.thumbnail.name.split('.').pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('thumbnails').upload(path, form.thumbnail);
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('thumbnails').getPublicUrl(path);
          thumbnailUrl = urlData.publicUrl;
        }
      }

      const slug = await generateUniquePackSlug(form.title);

      const packPayload = {
        creator_id: user.id,
        title: form.title,
        slug: slug,
        description: form.description,
        category: form.category,
        price: parseFloat(form.price),
        currency: form.currency,
        thumbnail_url: thumbnailUrl,
        intro_video_url: form.intro_video_url || null,
        whatsapp_number: form.whatsapp_number || null,
        whatsapp_link: form.whatsapp_link || null,
        telegram_link: form.telegram_link || null,
        has_free_session: form.has_free_session,
        is_published: publish,
      };

      let { data: pack, error: packErr } = await supabase.from('session_packs').insert(packPayload).select().single();

      // Gracefully retry without optional columns if not yet present in Supabase
      if (packErr && (packErr.message?.includes('whatsapp_number') || packErr.message?.includes('slug'))) {
        if (packErr.message?.includes('whatsapp_number')) delete packPayload.whatsapp_number;
        if (packErr.message?.includes('slug')) delete packPayload.slug;
        const retry = await supabase.from('session_packs').insert(packPayload).select().single();
        pack = retry.data;
        packErr = retry.error;
      }

      if (packErr) throw packErr;

      const sessionsToInsert = [];
      let orderIdx = 0;

      if (form.has_free_session) {
        sessionsToInsert.push({
          pack_id: pack.id,
          title: form.freeSession.title,
          zoom_link: form.freeSession.zoom_link,
          scheduled_at: form.freeSession.scheduled_at ? new Date(form.freeSession.scheduled_at).toISOString() : null,
          duration_minutes: parseInt(form.freeSession.duration_minutes) || 60,
          order_index: orderIdx++,
          is_free_session: true,
          recording_url: form.freeSession.recording_url || null,
        });
      }

      for (const s of form.sessions) {
        sessionsToInsert.push({
          pack_id: pack.id,
          title: s.title,
          zoom_link: s.zoom_link,
          scheduled_at: s.scheduled_at ? new Date(s.scheduled_at).toISOString() : null,
          duration_minutes: parseInt(s.duration_minutes) || 60,
          order_index: orderIdx++,
          is_free_session: false,
        });
      }

      if (sessionsToInsert.length > 0) {
        const { error: sessErr } = await supabase.from('sessions').insert(sessionsToInsert);
        if (sessErr) throw sessErr;
      }

      showToast(publish ? 'Pack published!' : 'Saved as draft');
      setTimeout(() => {
        navigate('/creator/packs');
      }, 700);
    } catch (err) {
      console.error('Save error:', err);
      showToast('Error: ' + err.message);
      alert('Error saving pack: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const currentMeta = STEP_META[step];

  return (
    <PageTransition>
      <div className="lora-wizard">
        <div className="page">
          <h1>Create session pack</h1>
          <p>Launch your live interactive course in 5 simple steps.</p>

          {/* Stepper Card */}
          <section className="card stp">
            <div className="steps">
              <div className="track">
                <i style={{ width: `${(step / 4) * 100}%` }}></i>
              </div>
              {STEPS.map((name, i) => {
                const isDone = i < step;
                const isCurrent = i === step;
                const cls = isDone ? 'done' : isCurrent ? 'cur' : '';
                return (
                  <div
                    key={name}
                    className={`st ${cls}`}
                    onClick={() => {
                      if (i < step) setStep(i);
                    }}
                    style={{ cursor: i < step ? 'pointer' : 'default' }}
                  >
                    <div className="dot">
                      {isDone ? (
                        <svg className="ic" viewBox="0 0 24 24"><path d="m5 12 5 5 9-10" /></svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span>{name}</span>
                  </div>
                );
              })}
            </div>
            <p className="mob">
              Step {step + 1} of 5: {STEPS[step]}
            </p>
          </section>

          {/* Step Form Card */}
          <section className="card" id="card">
            <div className={`body ${currentMeta.sClass}`}>
              <div className="sh">
                <span className="ib">
                  <svg className="ic" viewBox="0 0 24 24" style={{ width: 22, height: 22 }}>
                    {currentMeta.icon}
                  </svg>
                </span>
                <div>
                  <h2>{currentMeta.title}</h2>
                  <p>{currentMeta.desc}</p>
                </div>
              </div>

              {/* STEP 0: Basic Info */}
              {step === 0 && (
                <div className="g">
                  <div className="f">
                    <label htmlFor="title">Title <em>*</em></label>
                    <input
                      id="title"
                      name="title"
                      placeholder="e.g. Advanced React Masterclass"
                      value={form.title}
                      onChange={e => update('title', e.target.value)}
                      required
                    />
                  </div>
                  <div className="f">
                    <label htmlFor="desc">Description</label>
                    <textarea
                      id="desc"
                      name="description"
                      rows={4}
                      placeholder="Describe what students will learn..."
                      value={form.description}
                      onChange={e => update('description', e.target.value)}
                    />
                  </div>
                  <div className="g g3">
                    <div className="f">
                      <label htmlFor="cat">Category</label>
                      <select
                        id="cat"
                        name="category"
                        value={form.category}
                        onChange={e => update('category', e.target.value)}
                      >
                        <option value="">Select category</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="f">
                      <label htmlFor="cur">Currency</label>
                      <select
                        id="cur"
                        name="currency"
                        value={form.currency}
                        onChange={e => update('currency', e.target.value)}
                      >
                        {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="f">
                      <label htmlFor="price">Price <em>*</em></label>
                      <input
                        id="price"
                        name="price"
                        type="number"
                        inputMode="decimal"
                        placeholder="29.99"
                        min="0"
                        step="0.01"
                        value={form.price}
                        onChange={e => update('price', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 1: Media */}
              {step === 1 && (
                <div className="g">
                  <div className="f">
                    <label>Thumbnail</label>
                    {form.thumbnailPreview ? (
                      <div className="thumb" style={{ backgroundImage: `url(${form.thumbnailPreview})` }}>
                        <button
                          type="button"
                          onClick={() => {
                            update('thumbnail', null);
                            update('thumbnailPreview', null);
                          }}
                          aria-label="Remove thumbnail"
                        >
                          <svg className="ic" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>
                        </button>
                      </div>
                    ) : (
                      <label className="drop">
                        <svg className="ic" viewBox="0 0 24 24">
                          <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
                        </svg>
                        <b>Upload thumbnail</b>
                        <small>PNG or JPG, 16:9 looks best</small>
                        <input type="file" accept="image/*" onChange={handleThumbnail} />
                      </label>
                    )}
                  </div>
                  <div className="f">
                    <label htmlFor="intro">Intro video URL <span>(YouTube/Vimeo)</span></label>
                    <input
                      id="intro"
                      name="introVideo"
                      type="url"
                      placeholder="https://youtube.com/watch?v=..."
                      value={form.intro_video_url}
                      onChange={e => update('intro_video_url', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: Contact & Community */}
              {step === 2 && (
                <div className="g">
                  <div className="sub">Inquiry contact details</div>
                  <p className="note">
                    Allow interested learners to chat on WhatsApp or call you directly if they need more information or guidance before enrolling.
                  </p>

                  <div className="f">
                    <label htmlFor="wa">WhatsApp &amp; contact number</label>
                    <PhoneInput
                      international
                      defaultCountry="LK"
                      value={form.whatsapp_number}
                      onChange={v => update('whatsapp_number', v || '')}
                    />
                    {profile?.contact_number && form.whatsapp_number !== profile.contact_number && (
                      <button
                        type="button"
                        onClick={() => update('whatsapp_number', profile.contact_number)}
                        className="use-profile-num"
                      >
                        Use my profile number ({profile.contact_number})
                      </button>
                    )}
                    <div className="h">
                      Displayed prominently on your course detail page with "Chat on WhatsApp" and "Call for details" buttons.
                    </div>
                  </div>

                  <div className="sub">Enrolled community links</div>
                  <p className="note">
                    Optional links visible to students once their enrollment is confirmed.
                  </p>

                  <div className="f">
                    <label htmlFor="wag">WhatsApp group link</label>
                    <input
                      id="wag"
                      name="whatsappGroup"
                      type="url"
                      placeholder="https://chat.whatsapp.com/..."
                      value={form.whatsapp_link}
                      onChange={e => update('whatsapp_link', e.target.value)}
                    />
                  </div>

                  <div className="f">
                    <label htmlFor="tg">Telegram channel link</label>
                    <input
                      id="tg"
                      name="telegram"
                      type="url"
                      placeholder="https://t.me/..."
                      value={form.telegram_link}
                      onChange={e => update('telegram_link', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: Sessions */}
              {step === 3 && (
                <div>
                  {/* Free preview toggle switch */}
                  <label className="sw">
                    <input
                      type="checkbox"
                      id="fo"
                      checked={form.has_free_session}
                      onChange={e => update('has_free_session', e.target.checked)}
                    />
                    <span className="tg"></span>
                    Add a free preview session
                  </label>

                  {/* Free preview session block */}
                  {form.has_free_session && (
                    <div className="sess free">
                      <div className="sh2">
                        <span className="tag">FREE PREVIEW</span>
                      </div>
                      <p className="hint">
                        This session is visible and joinable by anyone, even before they pay.
                      </p>
                      <div className="g">
                        <div className="f">
                          <label>Session title</label>
                          <input
                            placeholder="e.g. Introduction & What You'll Learn"
                            value={form.freeSession.title}
                            onChange={e => updateFreeSession('title', e.target.value)}
                          />
                        </div>
                        <div className="f">
                          <label>Zoom link</label>
                          <input
                            type="url"
                            placeholder="https://zoom.us/j/..."
                            value={form.freeSession.zoom_link}
                            onChange={e => updateFreeSession('zoom_link', e.target.value)}
                          />
                        </div>
                        <div className="g g2 keep">
                          <div className="f">
                            <label>Date &amp; time</label>
                            <input
                              type="datetime-local"
                              value={form.freeSession.scheduled_at}
                              onChange={e => updateFreeSession('scheduled_at', e.target.value)}
                            />
                          </div>
                          <div className="f">
                            <label>Duration <span>(min)</span></label>
                            <input
                              type="number"
                              inputMode="numeric"
                              min="15"
                              step="15"
                              value={form.freeSession.duration_minutes}
                              onChange={e => updateFreeSession('duration_minutes', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="f">
                          <label>Recording link <span>(optional)</span></label>
                          <input
                            type="url"
                            placeholder="Add after the session"
                            value={form.freeSession.recording_url}
                            onChange={e => updateFreeSession('recording_url', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Paid sessions */}
                  <div className="hd2">Paid sessions</div>
                  {form.sessions.map((s, idx) => (
                    <div key={s.id} className="sess">
                      <div className="sh2">
                        <span className="num">{idx + 1}</span>
                        <b>Session {idx + 1}</b>
                        {form.sessions.length > 1 && (
                          <button
                            type="button"
                            className="del"
                            onClick={() => removeSession(idx)}
                            aria-label={`Delete session ${idx + 1}`}
                          >
                            <svg className="ic" viewBox="0 0 24 24">
                              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <div className="g">
                        <div className="f">
                          <label>Session title</label>
                          <input
                            placeholder="Session title"
                            value={s.title}
                            onChange={e => updateSession(idx, 'title', e.target.value)}
                          />
                        </div>
                        <div className="f">
                          <label>Zoom link</label>
                          <input
                            type="url"
                            placeholder="https://zoom.us/j/..."
                            value={s.zoom_link}
                            onChange={e => updateSession(idx, 'zoom_link', e.target.value)}
                          />
                        </div>
                        <div className="g g2 keep">
                          <div className="f">
                            <label>Date &amp; time</label>
                            <input
                              type="datetime-local"
                              value={s.scheduled_at}
                              onChange={e => updateSession(idx, 'scheduled_at', e.target.value)}
                            />
                          </div>
                          <div className="f">
                            <label>Duration <span>(min)</span></label>
                            <input
                              type="number"
                              inputMode="numeric"
                              min="15"
                              step="15"
                              value={s.duration_minutes}
                              onChange={e => updateSession(idx, 'duration_minutes', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button className="add" type="button" onClick={addSession}>
                    <svg className="ic" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
                    Add another session
                  </button>
                </div>
              )}

              {/* STEP 4: Review */}
              {step === 4 && (
                <div className="rv">
                  <h3>{form.title || 'Untitled pack'}</h3>
                  <p>{form.description || 'No description provided.'}</p>

                  <div className="chips">
                    <span>{form.category || 'General'}</span>
                    <span className="pr">{form.currency} {form.price || '0'}</span>
                    {(form.whatsapp_number || profile?.contact_number) && (
                      <span className="wa">
                        WhatsApp: {form.whatsapp_number || profile?.contact_number}
                      </span>
                    )}
                  </div>

                  {form.thumbnailPreview && (
                    <div className="thumb" style={{ backgroundImage: `url(${form.thumbnailPreview})` }} />
                  )}

                  {form.has_free_session && (
                    <>
                      <div className="hd2">Free preview session</div>
                      <div className="ri">
                        <span className="tag">FREE PREVIEW</span>
                        <b>{form.freeSession.title || 'Untitled'}</b>
                        <small>{form.freeSession.duration_minutes || 60} min</small>
                      </div>
                    </>
                  )}

                  <div className="hd2">
                    {form.sessions.length} paid session{form.sessions.length !== 1 ? 's' : ''}
                  </div>
                  {form.sessions.map((s, i) => (
                    <div key={s.id || i} className="ri">
                      <span className="num">{i + 1}</span>
                      <b>{s.title || 'Untitled'}</b>
                      <small>{s.duration_minutes || 60} min</small>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Wizard Navigation Footer */}
            <div className={`foot ${step === 4 ? 'last' : ''}`}>
              {step === 4 ? (
                <>
                  <button
                    className="btn out"
                    type="button"
                    onClick={() => handleSave(false)}
                    disabled={saving}
                  >
                    Save as draft
                  </button>
                  <button
                    className="btn pri"
                    type="button"
                    onClick={() => handleSave(true)}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="ic animate-spin" />
                    ) : (
                      <>
                        <svg className="ic" viewBox="0 0 24 24"><path d="m5 12 5 5 9-10" /></svg>
                        Publish
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn back"
                    type="button"
                    onClick={handleBack}
                    style={{ visibility: step === 0 ? 'hidden' : 'visible' }}
                  >
                    <svg className="ic" viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
                    Back
                  </button>
                  <button
                    className="btn pri"
                    id="nx"
                    type="button"
                    onClick={handleNext}
                    disabled={!canNext()}
                  >
                    Next <svg className="ic" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </button>
                </>
              )}
            </div>
          </section>
        </div>

        {/* Toast notification */}
        <div className={`toast ${toastMsg ? 'show' : ''}`} role="status">
          {toastMsg}
        </div>
      </div>
    </PageTransition>
  );
}
