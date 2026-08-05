import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Upload, X, Plus, Trash2,
  Clock, Video, Link2, MessageCircle, Sparkles, Loader2, Check
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { PageTransition, StepProgress, ToggleSwitch, GoldBadge } from '../components/ui';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';

const STEPS = ['Basic Info', 'Media', 'Community', 'Sessions', 'Review'];
const CATEGORIES = ['Technology', 'Design', 'Business', 'Language', 'Music', 'Fitness', 'Other'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'BDT', 'INR', 'PKR', 'NGN', 'KES', 'PHP', 'BRL'];

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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '', description: '', category: '', price: '', currency: 'USD',
    thumbnail: null, thumbnailPreview: null, intro_video_url: '',
    whatsapp_link: '', telegram_link: '',
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
      sessions: prev.sessions.map((s, i) => i === idx ? { ...s, [field]: value } : s),
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
      case 0: return form.title && form.description && form.category && form.price;
      case 1: return true;
      case 2: return true;
      case 3: {
        if (form.has_free_session) {
          const fs = form.freeSession;
          if (!fs.title || !fs.zoom_link || !fs.scheduled_at) return false;
        }
        return form.sessions.every(s => s.title && s.zoom_link && s.scheduled_at);
      }
      default: return true;
    }
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

      const { data: pack, error: packErr } = await supabase.from('session_packs').insert({
        creator_id: user.id,
        title: form.title,
        description: form.description,
        category: form.category,
        price: parseFloat(form.price),
        currency: form.currency,
        thumbnail_url: thumbnailUrl,
        intro_video_url: form.intro_video_url || null,
        whatsapp_link: form.whatsapp_link || null,
        telegram_link: form.telegram_link || null,
        has_free_session: form.has_free_session,
        is_published: publish,
      }).select().single();

      if (packErr) throw packErr;

      const sessionsToInsert = [];
      let orderIdx = 0;

      if (form.has_free_session) {
        sessionsToInsert.push({
          pack_id: pack.id,
          title: form.freeSession.title,
          zoom_link: form.freeSession.zoom_link,
          scheduled_at: form.freeSession.scheduled_at,
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
          scheduled_at: s.scheduled_at,
          duration_minutes: parseInt(s.duration_minutes) || 60,
          order_index: orderIdx++,
          is_free_session: false,
        });
      }

      if (sessionsToInsert.length > 0) {
        const { error: sessErr } = await supabase.from('sessions').insert(sessionsToInsert);
        if (sessErr) throw sessErr;
      }

      navigate('/creator/packs');
    } catch (err) {
      console.error('Save error:', err);
      alert('Error saving pack: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] mb-8" style={{ fontFamily: 'var(--font-heading)' }}>
          Create Session Pack
        </h1>

        <StepProgress steps={STEPS} currentStep={step} />

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {/* STEP 0: Basic Info */}
            {step === 0 && (
              <div className="space-y-6">
                <div>
                  <label className="form-label">Title</label>
                  <input className="input-field" placeholder="e.g. Advanced React Masterclass"
                    value={form.title} onChange={e => update('title', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Description</label>
                  <textarea className="textarea-field" rows={4} placeholder="Describe what students will learn..."
                    value={form.description} onChange={e => update('description', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="form-label">Category</label>
                    <select className="select-field" value={form.category}
                      onChange={e => update('category', e.target.value)}>
                      <option value="">Select</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Currency</label>
                    <select className="select-field" value={form.currency}
                      onChange={e => update('currency', e.target.value)}>
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label">Price</label>
                  <input type="number" className="input-field" placeholder="29.99" min="0" step="0.01"
                    value={form.price} onChange={e => update('price', e.target.value)} />
                </div>
              </div>
            )}

            {/* STEP 1: Media */}
            {step === 1 && (
              <div className="space-y-7">
                <div>
                  <label className="form-label">Thumbnail</label>
                  {form.thumbnailPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-[#E2E8F0]">
                      <img src={form.thumbnailPreview} alt="Thumbnail" className="w-full h-48 object-cover" />
                      <button
                        onClick={() => { update('thumbnail', null); update('thumbnailPreview', null); }}
                        className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-[#475569] hover:bg-red-50 hover:text-[#C0392B] shadow-sm"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-[#E2E8F0] rounded-xl cursor-pointer hover:border-[#2563EB]/40 transition-colors bg-[#F8FAFC]">
                      <Upload size={28} className="text-[#94A6B8] mb-2" />
                      <span className="text-sm text-[#94A6B8]">Click or drag to upload</span>
                      <span className="text-xs text-[#94A6B8] mt-1">PNG, JPG up to 5MB</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleThumbnail} />
                    </label>
                  )}
                </div>
                <div>
                  <label className="form-label">Intro Video URL (YouTube/Vimeo)</label>
                  <input className="input-field" placeholder="https://youtube.com/watch?v=..."
                    value={form.intro_video_url} onChange={e => update('intro_video_url', e.target.value)} />
                </div>
              </div>
            )}

            {/* STEP 2: Community */}
            {step === 2 && (
              <div className="space-y-6">
                <p className="text-sm text-[#94A6B8] leading-relaxed">Optional links for your student community</p>
                <div>
                  <label className="form-label">WhatsApp Group Link</label>
                  <input className="input-field" placeholder="https://chat.whatsapp.com/..."
                    value={form.whatsapp_link} onChange={e => update('whatsapp_link', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Telegram Channel Link</label>
                  <input className="input-field" placeholder="https://t.me/..."
                    value={form.telegram_link} onChange={e => update('telegram_link', e.target.value)} />
                </div>
              </div>
            )}

            {/* STEP 3: Sessions */}
            {step === 3 && (
              <div className="space-y-7">
                {/* Free session toggle */}
                <div className="p-5 rounded-xl border border-[#DBEAFE]/50 bg-[#DBEAFE]/10">
                  <ToggleSwitch
                    checked={form.has_free_session}
                    onChange={v => update('has_free_session', v)}
                    label="Add a Free Preview Session"
                  />
                </div>

                {/* Free session form */}
                {form.has_free_session && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-6 rounded-xl border border-[#DBEAFE]/50 bg-[#DBEAFE]/5 space-y-5"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <GoldBadge icon={Sparkles}>FREE PREVIEW</GoldBadge>
                    </div>
                    <p className="text-xs text-[#94A6B8]">
                      This session is visible and joinable by anyone — even before they pay.
                    </p>
                    <div>
                      <label className="form-label">Session Title</label>
                      <input className="input-field" placeholder="e.g. Introduction & What You'll Learn"
                        value={form.freeSession.title} onChange={e => updateFreeSession('title', e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">Zoom Link</label>
                      <input className="input-field" placeholder="https://zoom.us/j/..."
                        value={form.freeSession.zoom_link} onChange={e => updateFreeSession('zoom_link', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className="form-label">Date & Time</label>
                        <input type="datetime-local" className="input-field"
                          value={form.freeSession.scheduled_at} onChange={e => updateFreeSession('scheduled_at', e.target.value)} />
                      </div>
                      <div>
                        <label className="form-label">Duration (min)</label>
                        <input type="number" className="input-field" min="15" step="15"
                          value={form.freeSession.duration_minutes} onChange={e => updateFreeSession('duration_minutes', e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Recording Link (optional)</label>
                      <input className="input-field" placeholder="Add after the session"
                        value={form.freeSession.recording_url} onChange={e => updateFreeSession('recording_url', e.target.value)} />
                    </div>
                  </motion.div>
                )}

                {/* Paid sessions */}
                <div>
                  <h3 className="text-sm font-semibold text-[#0F172A] mb-3 uppercase tracking-wider">
                    Paid Sessions
                  </h3>
                  <div className="space-y-5">
                    {form.sessions.map((s, idx) => (
                      <motion.div
                        key={s.id}
                        className="p-5 rounded-xl border border-[#E2E8F0] bg-white shadow-sm space-y-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#94A6B8] font-medium">Session {idx + 1}</span>
                          {form.sessions.length > 1 && (
                            <button onClick={() => removeSession(idx)} className="text-[#C0392B]/60 hover:text-[#C0392B]">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        <input className="input-field" placeholder="Session title"
                          value={s.title} onChange={e => updateSession(idx, 'title', e.target.value)} />
                        <input className="input-field" placeholder="Zoom link"
                          value={s.zoom_link} onChange={e => updateSession(idx, 'zoom_link', e.target.value)} />
                        <div className="grid grid-cols-2 gap-4">
                          <input type="datetime-local" className="input-field"
                            value={s.scheduled_at} onChange={e => updateSession(idx, 'scheduled_at', e.target.value)} />
                          <input type="number" className="input-field" placeholder="Duration (min)" min="15" step="15"
                            value={s.duration_minutes} onChange={e => updateSession(idx, 'duration_minutes', e.target.value)} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <button onClick={addSession} className="btn-ghost w-full mt-3 text-sm justify-center text-[#2563EB]">
                    <Plus size={16} /> Add Another Session
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Review */}
            {step === 4 && (
              <div className="space-y-7">
                <div className="bg-white p-8 rounded-2xl border border-[#F1F5F9] shadow-[0_2px_16px_rgba(0,0,0,0.06)] space-y-5">
                  <h3 className="text-xl font-bold text-[#0F172A]" style={{ fontFamily: 'var(--font-heading)' }}>
                    {form.title}
                  </h3>
                  <p className="text-sm text-[#475569] leading-relaxed">{form.description}</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="badge badge-gold">{form.category}</span>
                    <span className="text-[#0F172A] font-semibold">{form.currency} {form.price}</span>
                  </div>
                  {form.thumbnailPreview && (
                    <img src={form.thumbnailPreview} alt="Thumb" className="w-full h-40 object-cover rounded-lg" />
                  )}
                </div>

                {form.has_free_session && (
                  <div className="p-4 rounded-xl border border-[#DBEAFE]/50 bg-[#DBEAFE]/10">
                    <GoldBadge icon={Sparkles} className="mb-2">FREE PREVIEW</GoldBadge>
                    <p className="text-sm text-[#0F172A] font-medium">{form.freeSession.title}</p>
                    <p className="text-xs text-[#94A6B8] mt-1">{form.freeSession.duration_minutes} min</p>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-semibold text-[#94A6B8] uppercase tracking-wider mb-3">
                    {form.sessions.length} Paid Session{form.sessions.length !== 1 ? 's' : ''}
                  </h4>
                  {form.sessions.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-3 py-2 border-b border-[#E2E8F0] last:border-0">
                      <span className="text-xs text-[#94A6B8] w-6">{i + 1}.</span>
                      <span className="text-sm text-[#0F172A] flex-1">{s.title || 'Untitled'}</span>
                      <span className="text-xs text-[#94A6B8]">{s.duration_minutes}min</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4">
                  <button onClick={() => handleSave(false)} className="btn-secondary flex-1 py-3" disabled={saving}>
                    Save as Draft
                  </button>
                  <button onClick={() => handleSave(true)} className="btn-primary flex-1 py-3" disabled={saving}>
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <><Check size={18} /> Publish</>}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation buttons */}
        {step < 4 && (
          <div className="flex justify-between mt-10">
            <button
              onClick={() => setStep(s => s - 1)}
              className="btn-ghost"
              disabled={step === 0}
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              onClick={() => setStep(s => s + 1)}
              className="btn-primary"
              disabled={!canNext()}
            >
              Next <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
