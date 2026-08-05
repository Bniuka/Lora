import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Save, Upload, X, Plus, Trash2, Video,
  Clock, Loader2, Sparkles, ExternalLink
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { PageTransition, ToggleSwitch, GoldBadge, Skeleton } from '../components/ui';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';

const CATEGORIES = ['Technology', 'Design', 'Business', 'Language', 'Music', 'Fitness', 'Other'];

export default function EditPack() {
  useSubscriptionGuard();
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pack, setPack] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbPreview, setThumbPreview] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      const [packRes, sessRes] = await Promise.all([
        supabase.from('session_packs').select('*').eq('id', id).single(),
        supabase.from('sessions').select('*').eq('pack_id', id).order('order_index'),
      ]);
      if (packRes.data) {
        setPack(packRes.data);
        setThumbPreview(packRes.data.thumbnail_url);
      }
      setSessions(sessRes.data || []);
      setLoading(false);
    };
    fetch();
  }, [id]);

  const updatePack = (field, value) => setPack(prev => ({ ...prev, [field]: value }));
  const updateSession = (idx, field, value) =>
    setSessions(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));

  const addSession = () => {
    setSessions(prev => [...prev, {
      id: null, pack_id: id, title: '', zoom_link: '',
      scheduled_at: '', duration_minutes: 60,
      order_index: prev.length, is_free_session: false, recording_url: null, _isNew: true,
    }]);
  };

  const removeSession = async (idx) => {
    const session = sessions[idx];
    if (session.id && !session._isNew) {
      await supabase.from('sessions').delete().eq('id', session.id);
    }
    setSessions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleThumbnail = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnail(file);
    setThumbPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let thumbnailUrl = pack.thumbnail_url;
      if (thumbnail) {
        const ext = thumbnail.name.split('.').pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        await supabase.storage.from('thumbnails').upload(path, thumbnail);
        const { data: urlData } = supabase.storage.from('thumbnails').getPublicUrl(path);
        thumbnailUrl = urlData.publicUrl;
      }

      const hasFree = sessions.some(s => s.is_free_session);

      await supabase.from('session_packs').update({
        title: pack.title,
        description: pack.description,
        category: pack.category,
        price: parseFloat(pack.price),
        currency: pack.currency,
        thumbnail_url: thumbnailUrl,
        intro_video_url: pack.intro_video_url || null,
        whatsapp_link: pack.whatsapp_link || null,
        telegram_link: pack.telegram_link || null,
        has_free_session: hasFree,
      }).eq('id', id);

      for (const s of sessions) {
        const sessionData = {
          pack_id: id,
          title: s.title,
          zoom_link: s.zoom_link,
          scheduled_at: s.scheduled_at,
          duration_minutes: parseInt(s.duration_minutes) || 60,
          order_index: s.order_index,
          is_free_session: s.is_free_session,
          recording_url: s.recording_url || null,
        };

        if (s._isNew || !s.id) {
          await supabase.from('sessions').insert(sessionData);
        } else {
          await supabase.from('sessions').update(sessionData).eq('id', s.id);
        }
      }

      navigate('/creator/packs');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="space-y-4 p-8"><Skeleton className="h-10 w-48" /><Skeleton className="h-64" /></div>;
  if (!pack) return <div className="p-8 text-center text-[#94A6B8]">Pack not found</div>;

  const now = new Date();

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link to="/creator/packs" className="inline-flex items-center gap-2 text-sm text-[#475569] hover:text-[#2563EB]">
            <ArrowLeft size={16} /> Back to Packs
          </Link>
          <button onClick={handleSave} className="btn-primary text-sm py-3 px-6" disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Save Changes</>}
          </button>
        </div>

        <h1 className="text-2xl font-bold text-[#0F172A] mb-8" style={{ fontFamily: 'var(--font-heading)' }}>Edit Pack</h1>

        <div className="space-y-8">
          {/* Basic Info */}
          <div className="bg-white p-8 rounded-2xl border border-[#F1F5F9] shadow-[0_2px_16px_rgba(0,0,0,0.06)] space-y-5">
            <h2 className="text-sm font-semibold text-[#94A6B8] uppercase tracking-wider mb-4">Basic Info</h2>
            <div>
              <label className="form-label">Title</label>
              <input className="input-field" value={pack.title} onChange={e => updatePack('title', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Description</label>
              <textarea className="textarea-field" rows={3} value={pack.description}
                onChange={e => updatePack('description', e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-5">
              <div>
                <label className="form-label">Category</label>
                <select className="select-field" value={pack.category}
                  onChange={e => updatePack('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Price</label>
                <input type="number" className="input-field" value={pack.price}
                  onChange={e => updatePack('price', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Currency</label>
                <input className="input-field" value={pack.currency}
                  onChange={e => updatePack('currency', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Thumbnail */}
          <div className="bg-white p-8 rounded-2xl border border-[#F1F5F9] shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
            <h2 className="text-sm font-semibold text-[#94A6B8] uppercase tracking-wider mb-5">Thumbnail</h2>
            {thumbPreview ? (
              <div className="relative rounded-lg overflow-hidden border border-[#E2E8F0]">
                <img src={thumbPreview} alt="Thumbnail" className="w-full h-44 object-cover" />
                <button onClick={() => { setThumbnail(null); setThumbPreview(null); updatePack('thumbnail_url', null); }}
                  className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-[#475569] hover:text-[#C0392B] shadow-sm">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-[#E2E8F0] rounded-xl cursor-pointer hover:border-[#2563EB]/40 transition-colors bg-[#F8FAFC]">
                <Upload size={24} className="text-[#94A6B8] mb-2" />
                <span className="text-sm text-[#94A6B8]">Upload thumbnail</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleThumbnail} />
              </label>
            )}
          </div>

          {/* Links */}
          <div className="bg-white p-8 rounded-2xl border border-[#F1F5F9] shadow-[0_2px_16px_rgba(0,0,0,0.06)] space-y-5">
            <h2 className="text-sm font-semibold text-[#94A6B8] uppercase tracking-wider mb-4">Links</h2>
            <div>
              <label className="form-label">Intro Video URL</label>
              <input className="input-field" value={pack.intro_video_url || ''}
                onChange={e => updatePack('intro_video_url', e.target.value)} />
            </div>
            <div>
              <label className="form-label">WhatsApp Group</label>
              <input className="input-field" value={pack.whatsapp_link || ''}
                onChange={e => updatePack('whatsapp_link', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Telegram Channel</label>
              <input className="input-field" value={pack.telegram_link || ''}
                onChange={e => updatePack('telegram_link', e.target.value)} />
            </div>
          </div>

          {/* Sessions */}
          <div className="bg-white p-8 rounded-2xl border border-[#F1F5F9] shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
            <h2 className="text-sm font-semibold text-[#94A6B8] uppercase tracking-wider mb-5">Sessions</h2>
            <div className="space-y-5">
              {sessions.map((s, idx) => {
                const isPast = s.scheduled_at && new Date(s.scheduled_at) < now;
                return (
                  <div key={s.id || idx} className={`p-5 rounded-xl border space-y-4 ${
                    s.is_free_session ? 'border-[#DBEAFE]/50 bg-[#DBEAFE]/5' : 'border-[#E2E8F0] bg-[#F8FAFC]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#94A6B8]">#{idx + 1}</span>
                        {s.is_free_session && <GoldBadge icon={Sparkles}>FREE</GoldBadge>}
                        {isPast && !s.recording_url && (
                          <span className="badge badge-pending text-[10px]">Needs Recording</span>
                        )}
                      </div>
                      <button onClick={() => removeSession(idx)} className="text-[#C0392B]/60 hover:text-[#C0392B]">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <input className="input-field" placeholder="Session title" value={s.title}
                      onChange={e => updateSession(idx, 'title', e.target.value)} />
                    <input className="input-field" placeholder="Zoom link" value={s.zoom_link}
                      onChange={e => updateSession(idx, 'zoom_link', e.target.value)} />
                    <div className="grid grid-cols-2 gap-4">
                      <input type="datetime-local" className="input-field" value={s.scheduled_at ? s.scheduled_at.slice(0, 16) : ''}
                        onChange={e => updateSession(idx, 'scheduled_at', e.target.value)} />
                      <input type="number" className="input-field" placeholder="Duration (min)" value={s.duration_minutes}
                        onChange={e => updateSession(idx, 'duration_minutes', e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label text-xs">Recording URL {isPast ? '' : '(add after session)'}</label>
                      <input className="input-field" placeholder="https://..." value={s.recording_url || ''}
                        onChange={e => updateSession(idx, 'recording_url', e.target.value)} />
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={addSession} className="btn-ghost w-full mt-3 text-sm justify-center text-[#2563EB]">
              <Plus size={16} /> Add Session
            </button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
