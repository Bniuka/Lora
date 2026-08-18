import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Clock, Users, Lock, Play, ExternalLink, Upload,
  Sparkles, MessageCircle, Send, Calendar, Video, Loader2, CheckCircle, Building2, Copy
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInMinutes, isPast } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { generatePaymentReference } from '../lib/utils';
import { PageTransition, GoldBadge, Modal, StatusBadge, Skeleton, ShareMenu } from '../components/ui';

function SessionButton({ session }) {
  const now = new Date();
  const scheduled = new Date(session.scheduled_at);
  const minutesDiff = differenceInMinutes(scheduled, now);
  const isLive = minutesDiff <= 15 && minutesDiff >= -session.duration_minutes;
  const hasPassed = isPast(scheduled) && !isLive;

  if (isLive) {
    return (
      <a href={session.zoom_link} target="_blank" rel="noopener noreferrer"
        className="btn-primary text-xs py-2 px-4 animate-glow-pulse">
        <Play size={14} /> Join Now
      </a>
    );
  }
  if (hasPassed && session.recording_url) {
    return (
      <a href={session.recording_url} target="_blank" rel="noopener noreferrer"
        className="btn-secondary text-xs py-2 px-4">
        <Video size={14} /> Watch Recording
      </a>
    );
  }
  if (hasPassed && !session.recording_url) {
    return (
      <span className="badge badge-pending text-[10px]">Recording Coming Soon</span>
    );
  }
  return (
    <span className="text-xs text-[#94A6B8] flex items-center gap-1">
      <Clock size={12} /> Starts {formatDistanceToNow(scheduled, { addSuffix: true })}
    </span>
  );
}

export default function PackDetail() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const [pack, setPack] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [creator, setCreator] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentModal, setPaymentModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [screenshot, setScreenshot] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [loginPrompt, setLoginPrompt] = useState(false);
  const [bankDetails, setBankDetails] = useState(null);
  const [paymentStep, setPaymentStep] = useState(1);
  const [refCode, setRefCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  useEffect(() => {
    const fetch = async () => {
      const [packRes, sessRes] = await Promise.all([
        supabase.from('session_packs')
          .select('*, creator_profiles(id, payment_link, payment_option, about, category, profiles(first_name, last_name, avatar_url))')
          .eq('id', id).single(),
        supabase.from('sessions').select('*').eq('pack_id', id).order('order_index'),
      ]);

      if (packRes.data) {
        setPack(packRes.data);
        setCreator(packRes.data.creator_profiles);
      }
      setSessions(sessRes.data || []);

      if (user) {
        const { data: enr } = await supabase.from('enrollments')
          .select('*').eq('learner_id', user.id).eq('pack_id', id).maybeSingle();
        setEnrollment(enr);
      }
      
      if (packRes.data?.creator_profiles) {
        supabase.from('creator_bank_details').select('*').eq('creator_id', packRes.data.creator_profiles.id).maybeSingle()
          .then(({ data }) => setBankDetails(data));
      }
      
      setLoading(false);
    };
    fetch();
  }, [id, user]);

  const handleFreeJoin = async (session) => {
    if (!user) { setLoginPrompt(true); return; }
    await supabase.from('free_session_joins').insert({
      session_id: session.id,
      learner_id: user.id,
    });
    window.open(session.zoom_link, '_blank');
  };

  const handleStartPaymentFlow = async () => {
    setUploadError(null);
    const code = await generatePaymentReference();
    setRefCode(code);
    setPaymentStep(1);
    setPaymentModal(true);
  };

  const handlePaymentUpload = async () => {
    if (!screenshot || !user) return;
    setUploading(true);
    try {
      const ext = screenshot.name.split('.').pop();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('payment-screenshots').upload(path, screenshot);
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('payment-screenshots').getPublicUrl(path);

      const { error: enrErr } = await supabase.from('enrollments').upsert({
        id: enrollment?.id || undefined,
        learner_id: user.id,
        pack_id: id,
        status: 'pending',
        payment_screenshot_url: urlData?.publicUrl || null,
        payment_method_used: paymentMethod || 'manual',
        payment_reference_code: refCode,
        code_expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        submitted_at: new Date().toISOString(),
      }, { onConflict: enrollment?.id ? 'id' : undefined });

      if (enrErr) throw enrErr;

      await supabase.from('notifications').insert({
        user_id: pack.creator_id,
        title: 'New Payment Received! 💰',
        message: `${profile.first_name} ${profile.last_name} submitted payment for "${pack.title}". Review and confirm.`,
      });

      setPaymentStep(3);
      setSubmitted(true);
    } catch (err) {
      console.error("Payment upload error:", err);
      setUploadError(err.message || "An unknown error occurred during upload.");
    } finally {
      setUploading(false);
    }
  };

  const freeSession = sessions.find(s => s.is_free_session);
  const paidSessions = sessions.filter(s => !s.is_free_session);

  const getVideoEmbedUrl = (url) => {
    if (!url) return null;
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vmMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vmMatch) return `https://player.vimeo.com/video/${vmMatch[1]}`;
    return null;
  };

  if (loading) return <div className="max-w-4xl mx-auto p-6"><Skeleton className="h-80 mb-6" /><Skeleton className="h-40" /></div>;
  if (!pack) return <div className="text-center py-20 text-[#94A6B8]">Pack not found</div>;

  const embedUrl = getVideoEmbedUrl(pack.intro_video_url);

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-5 sm:px-6 md:px-10 pt-8 pb-32 sm:pb-40 overflow-x-hidden sm:overflow-x-visible">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          {pack.thumbnail_url && (
            <div className="relative w-full h-64 sm:h-80 rounded-[32px] overflow-hidden mb-8 shadow-2xl group">
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/90 via-[#0F172A]/30 to-transparent z-10 transition-opacity duration-500"></div>
              <img src={pack.thumbnail_url} alt={pack.title} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-1000" />
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 text-xs font-bold text-white bg-gradient-to-r from-[#2563EB] to-[#3B82F6] rounded-full shadow-lg shadow-[#2563EB]/30">{pack.category}</span>
                {pack.has_free_session && (
                  <span className="px-3 py-1 text-xs font-bold text-[#78350F] bg-gradient-to-r from-[#FCD34D] to-[#F59E0B] rounded-full shadow-lg shadow-[#F59E0B]/30 flex items-center gap-1">
                    <Sparkles size={12} /> Free Preview
                  </span>
                )}
                <ShareMenu url={`${window.location.origin}/learner/pack/${pack.id}`} title={pack.title} />
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#0F172A] to-[#334155] leading-tight mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                {pack.title}
              </h1>
              {creator && (
                <Link to={`/creator/${creator.id}`} className="text-sm font-medium text-[#64748B] hover:text-[#2563EB] transition-colors flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#E2E8F0] flex items-center justify-center text-[#475569] font-bold uppercase">
                    {creator.profiles?.first_name?.[0]}{creator.profiles?.last_name?.[0]}
                  </div>
                  Created by {creator.profiles?.first_name} {creator.profiles?.last_name}
                </Link>
              )}
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-[#F1F5F9] min-w-[180px] text-center shrink-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#2563EB]/5 rounded-bl-[64px]" />
              <p className="text-xs uppercase tracking-[0.2em] text-[#94A6B8] mb-1 font-bold">Total Price</p>
              <p className="text-3xl font-black text-[#2563EB] mb-0" style={{ fontFamily: 'var(--font-heading)' }}>
                {pack.currency} {pack.price}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Intro Video */}
        {embedUrl && (
          <div className="mb-12 rounded-[24px] overflow-hidden border border-[#E2E8F0] shadow-xl shadow-[#0F172A]/5 aspect-video bg-black relative">
            <iframe src={embedUrl} title="Intro video" className="w-full h-full relative z-10" allowFullScreen allow="autoplay; encrypted-media" />
          </div>
        )}

        <p className="text-[#475569] mb-12 leading-relaxed text-lg">{pack.description}</p>

        {/* FREE SESSION CARD */}
        {freeSession && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 p-8 sm:p-10 rounded-[32px] bg-gradient-to-br from-[#1E293B] to-[#0F172A] relative overflow-hidden shadow-2xl border border-[#334155] text-white"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#3B82F6] to-transparent opacity-20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-[#F59E0B] to-transparent opacity-10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-4 py-1.5 text-[10px] font-black tracking-widest text-[#FDE68A] bg-[#F59E0B]/20 rounded-full border border-[#F59E0B]/30 flex items-center gap-1 uppercase">
                  <Sparkles size={14} /> Free Preview Session
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold mb-5 leading-tight">{freeSession.title}</h3>
              <div className="flex flex-wrap items-center gap-4 text-sm text-[#94A6B8] mb-8">
                <span className="flex items-center gap-2 bg-white/5 px-4 py-2.5 rounded-xl border border-white/10 backdrop-blur-sm">
                  <Calendar size={16} className="text-[#60A5FA]" /> {format(new Date(freeSession.scheduled_at), 'MMM dd, yyyy · h:mm a')}
                </span>
                <span className="flex items-center gap-2 bg-white/5 px-4 py-2.5 rounded-xl border border-white/10 backdrop-blur-sm">
                  <Clock size={16} className="text-[#60A5FA]" /> {freeSession.duration_minutes} min
                </span>
              </div>
              <div className="flex items-center gap-3">
                {(() => {
                  const now = new Date();
                  const scheduled = new Date(freeSession.scheduled_at);
                  const minutesDiff = differenceInMinutes(scheduled, now);
                  const isLive = minutesDiff <= 15 && minutesDiff >= -freeSession.duration_minutes;
                  const hasPassed = isPast(scheduled) && !isLive;

                  if (isLive) {
                    return (
                      <button onClick={() => handleFreeJoin(freeSession)}
                        className="bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white py-4 px-8 rounded-2xl font-bold shadow-lg shadow-[#2563EB]/40 hover:shadow-[#2563EB]/60 hover:-translate-y-1 transition-all flex items-center gap-2">
                        <Play size={20} className="fill-current" /> JOIN LIVE NOW
                      </button>
                    );
                  }
                  if (hasPassed && freeSession.recording_url) {
                    return (
                      <button onClick={() => {
                        if (!user) { setLoginPrompt(true); return; }
                        window.open(freeSession.recording_url, '_blank');
                      }} className="bg-white/10 hover:bg-white/20 border border-white/20 text-white py-4 px-8 rounded-2xl font-bold transition-all flex items-center gap-2">
                        <Video size={20} /> WATCH RECORDING
                      </button>
                    );
                  }
                  if (hasPassed) {
                    return <span className="text-sm font-medium text-[#94A6B8] bg-white/5 px-5 py-3 rounded-xl">Recording Coming Soon</span>;
                  }
                  return (
                    <div className="text-sm font-bold text-[#60A5FA] bg-[#3B82F6]/10 border border-[#3B82F6]/20 px-5 py-3 rounded-xl flex items-center gap-2">
                      <Clock size={16} className="animate-pulse" />
                      Starts {formatDistanceToNow(scheduled, { addSuffix: true })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </motion.div>
        )}

        {/* Session schedule */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] mb-8 flex flex-wrap items-center gap-3" style={{ fontFamily: 'var(--font-heading)' }}>
            <div className="w-1.5 h-6 bg-gradient-to-b from-[#2563EB] to-[#60A5FA] rounded-full shrink-0"></div>
            <span>Session Schedule</span> <span className="text-[#94A6B8] text-lg font-medium">({paidSessions.length} sessions)</span>
          </h2>
          <div className="space-y-4">
            {paidSessions.map((s, i) => (
              <div key={s.id} className="group relative flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 p-5 sm:p-6 rounded-[24px] border border-[#F1F5F9] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-lg hover:border-[#DBEAFE] transition-all overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[#F8FAFC] to-transparent opacity-0 group-hover:opacity-100 rounded-[24px] transition-opacity -z-10"></div>
                
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F1F5F9] to-[#E2E8F0] group-hover:from-[#DBEAFE] group-hover:to-[#EFF6FF] flex items-center justify-center flex-shrink-0 transition-colors">
                  {enrollment?.status === 'confirmed' ? (
                    <span className="text-sm font-black text-[#2563EB]">{i + 1}</span>
                  ) : (
                    <Lock size={16} className="text-[#94A6B8] group-hover:text-[#2563EB]/60" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-bold text-[#0F172A] mb-2 group-hover:text-[#2563EB] transition-colors break-words leading-tight">{s.title}</h4>
                  <p className="text-sm font-medium text-[#64748B] flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="flex items-center gap-1 shrink-0"><Calendar size={14} className="text-[#94A6B8]" /> {format(new Date(s.scheduled_at), 'MMM dd · h:mm a')}</span>
                    <span className="text-[#E2E8F0] hidden sm:block">|</span>
                    <span className="flex items-center gap-1 shrink-0"><Clock size={14} className="text-[#94A6B8]" /> {s.duration_minutes}m</span>
                  </p>
                </div>
                
                {enrollment?.status === 'confirmed' && (
                  <div className="shrink-0 mt-2 sm:mt-0">
                    <SessionButton session={s} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Community links */}
        {(pack.whatsapp_link || pack.telegram_link) && (enrollment?.status === 'confirmed' || user?.id === pack.creator_id) && (
          <div className="flex gap-4 mb-10">
            {pack.whatsapp_link && (
              <a href={pack.whatsapp_link} target="_blank" rel="noopener noreferrer"
                className="btn-ghost text-sm flex items-center gap-2 text-[#2D7A4F] border border-[#2D7A4F]/20 hover:bg-[#2D7A4F]/10">
                <MessageCircle size={16} /> WhatsApp Group
              </a>
            )}
            {pack.telegram_link && (
              <a href={pack.telegram_link} target="_blank" rel="noopener noreferrer"
                className="btn-ghost text-sm flex items-center gap-2 text-[#2D7A4F] border border-[#2D7A4F]/20 hover:bg-[#2D7A4F]/10">
                <Send size={16} /> Telegram Channel
              </a>
            )}
          </div>
        )}

        {/* Enroll CTA */}
        {user && profile?.role === 'learner' && !enrollment && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="sticky bottom-6 z-30 mt-12 sm:mt-20">
            <button onClick={handleStartPaymentFlow} className="w-full bg-gradient-to-r from-[#2563EB] via-[#1D4ED8] to-[#1E40AF] text-white py-4 sm:py-5 px-6 sm:px-8 rounded-2xl font-bold text-base sm:text-lg shadow-[0_10px_40px_rgba(37,99,235,0.4)] hover:shadow-[0_15px_50px_rgba(37,99,235,0.6)] hover:-translate-y-1 transition-all flex items-center justify-center gap-2 sm:gap-3 group">
              ENROLL NOW FOR {pack.currency} {pack.price}
            </button>
          </motion.div>
        )}

        {enrollment?.status === 'pending' && (
          <div className="p-5 rounded-xl bg-[#DBEAFE]/20 border border-[#DBEAFE] text-center">
            <p className="text-sm text-[#2563EB] font-semibold">Payment submitted! Waiting for creator confirmation.</p>
          </div>
        )}

        {enrollment?.status === 'rejected' && (
          <div className="p-5 rounded-xl bg-red-50 border border-red-100">
            <p className="text-sm text-[#C0392B] font-medium mb-3">Payment was rejected</p>
            {enrollment.rejection_reason && <p className="text-xs text-[#475569] mb-4">{enrollment.rejection_reason}</p>}
            <button onClick={() => setPaymentModal(true)} className="btn-primary text-sm">Re-upload Screenshot</button>
          </div>
        )}

        {!user && (
          <div className="sticky bottom-4 z-10">
            <Link to="/signup/learner" className="btn-primary w-full py-4 text-base block text-center shadow-xl">
              Sign Up to Enroll
            </Link>
          </div>
        )}

        {/* Payment Modal */}
        <Modal isOpen={paymentModal} onClose={() => { setPaymentModal(false); setPaymentStep(1); setScreenshot(null); }}
          title={paymentStep === 3 ? 'Payment Submitted!' : 'Complete Payment'}
        >
          {paymentStep === 1 && (
            <div className="space-y-6">
              <p className="text-sm text-[#475569]">
                When making your payment, paste or type this exact code in the payment description/reference field. This is how the creator identifies your payment.
              </p>
              <div className="p-6 rounded-xl border-2 border-[#DBEAFE] bg-[#F8FAFC] text-center">
                <p className="text-xs text-[#2563EB] uppercase tracking-wider font-semibold mb-2">Your Reference Code</p>
                <div className="text-3xl font-mono font-bold text-[#0F172A] mb-4 tracking-widest">{refCode}</div>
                <button onClick={() => navigator.clipboard.writeText(refCode)} className="btn-secondary text-xs mx-auto py-2 px-4">
                  <Copy size={14} className="mr-2 inline" /> Copy Code
                </button>
              </div>
              <p className="text-xs text-center text-[#C0392B] font-medium flex items-center justify-center gap-1">
                <Clock size={12} /> This code expires in 48 hours
              </p>
              <button onClick={() => setPaymentStep(2)} className="btn-primary w-full py-4 mt-2">
                Next: View Payment Instructions →
              </button>
            </div>
          )}

          {paymentStep === 2 && (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1 -mx-1 pb-2">
              
              {creator?.payment_link && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-[#0F172A] flex items-center gap-2"><ExternalLink size={18} className="text-[#2563EB]"/> Option 1: Payment Link</h3>
                  <div className="p-5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <p className="text-xs text-[#94A6B8] uppercase tracking-wider mb-1">Total Amount:</p>
                    <p className="text-2xl font-bold text-[#0F172A] mb-5">{pack.currency} {pack.price}</p>
                    <a href={creator?.payment_link} target="_blank" rel="noopener noreferrer" className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                      <ExternalLink size={18} /> Pay via Link
                    </a>
                  </div>
                </div>
              )}

              {(!creator?.payment_option || creator?.payment_option === 'bank' || creator?.payment_option === 'both') && (
                <div className="space-y-3 pt-2">
                  <h3 className="font-semibold text-[#0F172A] flex items-center gap-2"><Building2 size={18} className="text-[#2563EB]"/> {creator?.payment_link ? 'Option 2: Bank Transfer' : 'Bank Transfer'}</h3>
                  {bankDetails ? (
                    <div className="relative p-6 rounded-2xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white shadow-[0_8px_30px_rgba(15,23,42,0.12)] overflow-hidden border border-[#334155]">
                      {/* Decorative Background Elements */}
                      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#3B82F6] to-transparent opacity-20 rounded-full blur-3xl -mr-10 -mt-10"></div>
                      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#60A5FA] to-transparent opacity-10 rounded-full blur-2xl -ml-5 -mb-5"></div>
                      
                      <div className="relative z-10 space-y-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-[#94A6B8] mb-1">Bank Name</p>
                            <p className="text-lg font-bold text-white">{bankDetails.bank_name}</p>
                          </div>
                          <Building2 size={24} className="text-[#3B82F6] opacity-90" />
                        </div>
                        
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-[#94A6B8] mb-1">Account Holder</p>
                          <p className="text-base font-semibold text-white tracking-wide">{bankDetails.account_holder_name}</p>
                        </div>
                        
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-[#94A6B8] mb-1">Account Number</p>
                          <div className="flex items-center justify-between bg-[#000000]/20 rounded-xl p-3 border border-[#334155]/50 backdrop-blur-sm">
                            <p className="text-xl font-mono tracking-widest text-[#E2E8F0]">{bankDetails.account_number}</p>
                            <button 
                              onClick={() => navigator.clipboard.writeText(bankDetails.account_number)} 
                              className="p-2 rounded-lg bg-[#3B82F6]/20 text-[#60A5FA] hover:bg-[#3B82F6]/40 hover:text-white transition-colors"
                              title="Copy Account Number"
                            >
                              <Copy size={16} />
                            </button>
                          </div>
                        </div>

                        {bankDetails.branch && (
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-[#94A6B8] mb-1">Branch Details</p>
                            <p className="text-sm font-medium text-[#E2E8F0]">{bankDetails.branch} {bankDetails.branch_code && <span className="text-[#94A6B8]">({bankDetails.branch_code})</span>}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
                      <p className="text-sm text-[#475569]">Bank transfer details are not available. Please contact the creator to get their bank account information.</p>
                    </div>
                  )}
                  
                  {bankDetails?.extra_note && (
                    <p className="text-xs text-[#475569] italic bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
                      <strong className="text-[#2563EB] not-italic font-semibold">Note:</strong> {bankDetails.extra_note}
                    </p>
                  )}
                </div>
              )}

              <div className="pt-4 border-t border-[#E2E8F0]">
                <p className="text-sm text-[#0F172A] font-medium mb-3">Which payment method did you use?</p>
                <div className="flex gap-4 mb-4">
                  {creator?.payment_link && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="paymentMethod" value="link" checked={paymentMethod === 'link'} onChange={(e) => setPaymentMethod(e.target.value)} className="w-4 h-4 text-[#2563EB]" />
                      <span className="text-sm text-[#475569]">Payment Link</span>
                    </label>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="paymentMethod" value="bank" checked={paymentMethod === 'bank'} onChange={(e) => setPaymentMethod(e.target.value)} className="w-4 h-4 text-[#2563EB]" />
                    <span className="text-sm text-[#475569]">Manual Bank Transfer</span>
                  </label>
                </div>
                <p className="text-sm text-[#0F172A] font-medium mb-1">Upload Confirmation Screenshot</p>
                <p className="text-xs text-[#475569] mb-4">A screenshot is required to complete enrollment</p>
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-[#E2E8F0] rounded-xl cursor-pointer hover:border-[#2563EB]/40 transition-colors bg-[#F8FAFC]">
                  {screenshot ? (
                    <div className="text-center">
                      <CheckCircle size={24} className="text-[#2D7A4F] mx-auto mb-1" />
                      <span className="text-sm text-[#0F172A]">{screenshot.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload size={24} className="text-[#94A6B8] mb-2" />
                      <span className="text-sm text-[#94A6B8]">Upload payment screenshot</span>
                      <span className="text-xs text-[#94A6B8]">Max 5MB, images only</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={e => { setScreenshot(e.target.files?.[0] || null); setUploadError(null); }} />
                </label>
              </div>

              {uploadError && (
                <div className="p-3 mt-2 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-600 font-medium">Error: {uploadError}</p>
                </div>
              )}

              <div className="flex gap-4 pt-2">
                <button onClick={() => setPaymentStep(1)} className="btn-ghost px-4 border border-[#E2E8F0]">← Back</button>
                <button onClick={handlePaymentUpload} className="btn-primary flex-1 py-4" disabled={uploading || !screenshot}>
                  {uploading ? <Loader2 size={18} className="animate-spin" /> : "Submit Payment"}
                </button>
              </div>
            </div>
          )}

          {paymentStep === 3 && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-[#2D7A4F]/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={32} className="text-[#2D7A4F]" />
              </div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-2">Payment Submitted!</h3>
              
              <div className="my-6 p-4 rounded-xl border border-[#DBEAFE] bg-[#F8FAFC] inline-block">
                <p className="text-xs text-[#94A6B8] mb-1 uppercase tracking-wider">Reference Code</p>
                <p className="text-lg font-mono font-bold text-[#2563EB]">{refCode}</p>
              </div>
              
              <p className="text-sm text-[#475569] mb-8 leading-relaxed max-w-sm mx-auto">
                The creator will verify your payment using this code. You'll be notified once access is granted.
              </p>
              
              <button onClick={() => { setPaymentModal(false); window.location.reload(); }} className="btn-primary w-full py-4">
                Close
              </button>
            </div>
          )}
        </Modal>

        {/* Login prompt modal */}
        <Modal isOpen={loginPrompt} onClose={() => setLoginPrompt(false)} title="Create an Account">
          <p className="text-sm text-[#475569] mb-6">Create a free learner account to join sessions and enroll in courses.</p>
          <Link to="/signup/learner" className="btn-primary w-full py-3 block text-center">Sign Up as Learner</Link>
          <p className="text-center text-sm text-[#475569] mt-4">
            Already have an account? <Link to="/login" className="text-[#2563EB]">Log in</Link>
          </p>
        </Modal>
      </div>
    </PageTransition>
  );
}
