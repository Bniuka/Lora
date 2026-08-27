import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Clock, Users, Lock, Play, ExternalLink, Upload,
  Sparkles, MessageCircle, Send, Calendar, Video, Loader2, 
  CheckCircle, Building2, Copy, Star, ChevronRight, 
  MonitorPlay, Smartphone, FileText, Headset, ShieldCheck, ChevronDown, ChevronUp
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInMinutes, isPast } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { generatePaymentReference } from '../lib/utils';
import { PageTransition, GoldBadge, Modal, Skeleton, ShareMenu } from '../components/ui';

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
        className="btn-secondary text-xs py-2 px-4 bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC]">
        <Video size={14} className="text-[#2563EB]" /> Watch Recording
      </a>
    );
  }
  if (hasPassed && !session.recording_url) {
    return (
      <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-[10px] font-bold uppercase tracking-wider">Recording Soon</span>
    );
  }
  return (
    <span className="text-xs font-semibold text-[#64748B] flex items-center gap-1.5 bg-[#F8FAFC] px-3 py-1.5 rounded-full border border-[#E2E8F0]">
      <Clock size={12} className="text-[#2563EB]" /> Starts {formatDistanceToNow(scheduled, { addSuffix: true })}
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
  
  // Payment state
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
  
  // UI state
  const [showFullDesc, setShowFullDesc] = useState(false);

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
    if (!user) {
      setLoginPrompt(true);
      return;
    }
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
      setEnrollment({ ...enrollment, status: 'pending' });
    } catch (err) {
      console.error("Payment upload error:", err);
      setUploadError(err.message || "An unknown error occurred during upload.");
    } finally {
      setUploading(false);
    }
  };

  const freeSession = sessions.find(s => s.is_free_session);
  const paidSessions = sessions.filter(s => !s.is_free_session);
  const totalMinutes = sessions.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
  
  // Find next upcoming session
  const nextSession = sessions.filter(s => new Date(s.scheduled_at) > new Date()).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))[0];

  const getVideoEmbedUrl = (url) => {
    if (!url) return null;
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vmMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vmMatch) return `https://player.vimeo.com/video/${vmMatch[1]}`;
    return null;
  };

  if (loading) return <div className="max-w-6xl mx-auto p-6"><Skeleton className="h-80 mb-6" /><Skeleton className="h-40" /></div>;
  if (!pack) return <div className="text-center py-20 text-[#94A6B8] bg-gray-50 min-h-screen">Pack not found</div>;

  const embedUrl = getVideoEmbedUrl(pack.intro_video_url);
  const enrolledStatus = enrollment?.status;

  return (
    <PageTransition>
      <div className="bg-white min-h-screen pb-20">
        
        {/* Breadcrumb Header */}
        <div className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-[#64748B]">
              <Link to="/" className="hover:text-[#2563EB] transition-colors font-medium">Home</Link>
              <ChevronRight size={14} />
              <Link to="/discover" className="hover:text-[#2563EB] transition-colors font-medium">Sessions</Link>
              <ChevronRight size={14} />
              <span className="text-[#0F172A] font-semibold truncate max-w-[200px] sm:max-w-md">{pack.title}</span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="flex flex-col lg:flex-row gap-10">
            
            {/* ======================================= */}
            {/* LEFT COLUMN (Main Content, ~65%) */}
            {/* ======================================= */}
            <div className="flex-1 lg:max-w-[65%]">
              
              {/* Title & Meta Row */}
              <div className="mb-8">
                {pack.has_free_session && (
                  <span className="inline-block px-3 py-1 mb-4 text-[11px] font-bold text-[#1E3A8A] bg-[#DBEAFE] rounded-full uppercase tracking-wider">
                    Free Preview Session Included
                  </span>
                )}
                
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#0F172A] leading-tight mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
                  {pack.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-y-3 gap-x-6 text-sm text-[#475569] mb-4">
                  <div className="flex items-center gap-2">
                    {creator?.profiles?.avatar_url ? (
                      <img src={creator.profiles.avatar_url} alt="Creator" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#E2E8F0] flex items-center justify-center text-[#475569] font-bold uppercase text-xs">
                        {creator?.profiles?.first_name?.[0]}{creator?.profiles?.last_name?.[0]}
                      </div>
                    )}
                    <span>Created by <Link to={`/creator/${creator?.id}`} className="font-semibold text-[#2563EB] hover:underline">{creator?.profiles?.first_name} {creator?.profiles?.last_name}</Link></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Star size={16} className="text-[#F59E0B] fill-[#F59E0B]" />
                    <span className="font-bold text-[#0F172A]">4.9</span>
                    <span className="text-[#94A6B8]">(128 ratings)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users size={16} className="text-[#94A6B8]" />
                    <span>{pack.enrollments?.[0]?.count || 0} learners</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-[#0F172A]">
                  <span className="flex items-center gap-1.5"><MonitorPlay size={16} className="text-[#64748B]" /> {sessions.length} Session{sessions.length > 1 && 's'}</span>
                  <span className="text-[#E2E8F0]">•</span>
                  <span className="flex items-center gap-1.5"><Clock size={16} className="text-[#64748B]" /> {totalMinutes} total minutes</span>
                  <span className="text-[#E2E8F0]">•</span>
                  <span className="flex items-center gap-1.5"><CheckCircle size={16} className="text-[#64748B]" /> All Levels</span>
                </div>
              </div>

              {/* Video Player */}
              {(embedUrl || pack.thumbnail_url) && (
                <div className="mb-10 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-[#E2E8F0] bg-black aspect-video relative group">
                  {embedUrl ? (
                    <iframe src={embedUrl} title="Intro video" className="w-full h-full relative z-10" allowFullScreen allow="autoplay; encrypted-media" />
                  ) : (
                    <img src={pack.thumbnail_url} alt={pack.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                  )}
                  {embedUrl && (
                    <div className="absolute top-4 right-4 z-20">
                      <span className="px-3 py-1 bg-black/60 backdrop-blur-md text-white text-xs font-semibold rounded-full border border-white/20 flex items-center gap-2 shadow-lg">
                        <Play size={12} className="fill-white" /> Watch Intro
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* About Section */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-[#0F172A] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>About This Session</h2>
                <div className="text-base text-[#475569] leading-relaxed space-y-4">
                  {showFullDesc ? (
                    <p className="whitespace-pre-wrap">{pack.description}</p>
                  ) : (
                    <p className="line-clamp-3 whitespace-pre-wrap">{pack.description}</p>
                  )}
                </div>
                {pack.description && pack.description.length > 250 && (
                  <button 
                    onClick={() => setShowFullDesc(!showFullDesc)}
                    className="mt-3 flex items-center gap-1 text-[#2563EB] font-semibold hover:text-[#1D4ED8] transition-colors"
                  >
                    {showFullDesc ? 'Show less' : 'Show more'}
                    {showFullDesc ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                )}
              </div>

              {/* What You'll Learn (Mock Checklist Grid) */}
              <div className="mb-12 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-6 sm:p-8">
                <h2 className="text-xl font-bold text-[#0F172A] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>What You'll Learn</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    "Master the core concepts and workflows of the topic",
                    "Apply practical techniques in real-world scenarios",
                    "Build a solid foundation for advanced learning",
                    "Gain exclusive insights from industry experts"
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle size={20} className="text-[#2D7A4F] shrink-0 mt-0.5" />
                      <span className="text-[#475569] text-sm leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Session Schedule */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-[#0F172A] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>Session Schedule</h2>
                
                {freeSession && (
                  <div className="mb-4">
                    <div className="p-5 sm:p-6 rounded-2xl border-2 border-[#DBEAFE] bg-[#EFF6FF] relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-3">
                        <span className="px-2.5 py-1 text-[10px] font-bold text-[#1E3A8A] bg-[#BFDBFE] rounded-full uppercase tracking-wider">Free</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#BFDBFE] flex items-center justify-center shrink-0">
                          <Play size={20} className="text-[#1E3A8A] fill-current" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-[#0F172A] mb-1 pr-12">{freeSession.title}</h4>
                          <p className="text-sm font-medium text-[#64748B] flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="flex items-center gap-1"><Calendar size={14} /> {format(new Date(freeSession.scheduled_at), 'MMM dd · h:mm a')}</span>
                            <span className="hidden sm:block text-[#CBD5E1]">|</span>
                            <span className="flex items-center gap-1"><Clock size={14} /> {freeSession.duration_minutes}m</span>
                          </p>
                        </div>
                        <div className="shrink-0 mt-2 sm:mt-0">
                          {(() => {
                            const now = new Date();
                            const scheduled = new Date(freeSession.scheduled_at);
                            const minutesDiff = differenceInMinutes(scheduled, now);
                            const isLive = minutesDiff <= 15 && minutesDiff >= -freeSession.duration_minutes;
                            const hasPassed = isPast(scheduled) && !isLive;
                            if (isLive) return <button onClick={() => handleFreeJoin(freeSession)} className="btn-primary py-2 px-4 text-sm animate-glow-pulse"><Play size={14} className="mr-1.5"/> Join Live</button>;
                            if (hasPassed && freeSession.recording_url) return <button onClick={() => { if(!user) setLoginPrompt(true); else window.open(freeSession.recording_url, '_blank'); }} className="btn-secondary py-2 px-4 text-sm"><Video size={14} className="mr-1.5"/> Watch Recording</button>;
                            if (hasPassed) return <span className="text-xs font-semibold text-[#64748B] px-3 py-1.5 bg-white rounded-full border border-[#E2E8F0]">Recording Soon</span>;
                            return <span className="text-xs font-semibold text-[#2563EB] bg-white px-3 py-1.5 rounded-full border border-[#BFDBFE]">Starts {formatDistanceToNow(scheduled, { addSuffix: true })}</span>;
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {paidSessions.map((s, i) => {
                    const isUpcoming = new Date(s.scheduled_at) > new Date();
                    return (
                      <div key={s.id} className="p-5 sm:p-6 rounded-2xl border border-[#E2E8F0] bg-white hover:border-[#CBD5E1] transition-colors flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#F1F5F9] flex items-center justify-center shrink-0">
                          {enrolledStatus === 'confirmed' ? (
                            <span className="text-sm font-bold text-[#64748B]">{freeSession ? i + 2 : i + 1}</span>
                          ) : (
                            <Lock size={16} className="text-[#94A6B8]" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-base font-bold text-[#0F172A] mb-1">{s.title}</h4>
                          <p className="text-sm text-[#64748B] flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="flex items-center gap-1"><Calendar size={14} className="text-[#94A6B8]"/> {format(new Date(s.scheduled_at), 'MMM dd · h:mm a')}</span>
                            <span className="hidden sm:block text-[#E2E8F0]">|</span>
                            <span className="flex items-center gap-1"><Clock size={14} className="text-[#94A6B8]"/> {s.duration_minutes}m</span>
                          </p>
                        </div>
                        <div className="shrink-0 mt-2 sm:mt-0 flex items-center gap-3">
                          {isUpcoming && <span className="text-[10px] font-bold uppercase tracking-wider text-[#059669] bg-[#D1FAE5] px-2 py-1 rounded-md hidden sm:block">Upcoming</span>}
                          {enrolledStatus === 'confirmed' && <SessionButton session={s} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
            
            {/* ======================================= */}
            {/* RIGHT COLUMN (Sticky Sidebar, ~35%) */}
            {/* ======================================= */}
            <div className="lg:w-[35%] w-full">
              <div className="sticky top-24 space-y-6">
                
                {/* Card 1: Pricing & CTA */}
                <div className="bg-white rounded-[24px] border border-[#E2E8F0] shadow-[0_12px_40px_rgb(0,0,0,0.06)] p-6 sm:p-8">
                  
                  {/* Share Menu positioned in top right of card */}
                  <div className="absolute top-6 right-6">
                    <ShareMenu url={`${window.location.origin}/learner/pack/${pack.id}`} title={pack.title} />
                  </div>

                  <p className="text-xs uppercase tracking-[0.15em] text-[#64748B] font-bold mb-1">Total Price</p>
                  <p className="text-4xl font-extrabold text-[#0F172A] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
                    {pack.currency} {pack.price}
                  </p>
                  
                  <div className="mb-6 space-y-3">
                    {enrolledStatus === 'confirmed' ? (
                      <div className="w-full bg-[#D1FAE5] text-[#065F46] py-4 rounded-xl font-bold text-center border border-[#34D399] flex items-center justify-center gap-2">
                        <CheckCircle size={20} /> You are Enrolled
                      </div>
                    ) : enrolledStatus === 'pending' ? (
                      <div className="w-full bg-[#FEF3C7] text-[#92400E] py-4 rounded-xl font-bold text-center border border-[#FCD34D] flex items-center justify-center gap-2">
                        <Clock size={20} /> Enrollment Pending
                      </div>
                    ) : enrolledStatus === 'rejected' ? (
                      <div className="w-full bg-red-50 text-[#C0392B] p-4 rounded-xl text-center border border-red-200">
                        <p className="font-bold mb-1">Payment Rejected</p>
                        <button onClick={() => setPaymentModal(true)} className="text-sm underline">Re-upload screenshot</button>
                      </div>
                    ) : (
                      <button 
                        onClick={handleStartPaymentFlow} 
                        className="w-full bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white py-4 px-6 rounded-xl font-bold text-lg shadow-[0_8px_25px_rgba(37,99,235,0.3)] hover:shadow-[0_12px_35px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                      >
                        Join This Session
                      </button>
                    )}
                  </div>

                  <div className="space-y-3 mb-6">
                    <h4 className="text-sm font-bold text-[#0F172A]">This course includes:</h4>
                    <div className="text-sm text-[#475569] space-y-2">
                      <p className="flex items-center gap-2"><CheckCircle size={16} className="text-[#2563EB]" /> {sessions.length} live interactive sessions</p>
                      <p className="flex items-center gap-2"><CheckCircle size={16} className="text-[#2563EB]" /> Full lifetime access to recordings</p>
                      <p className="flex items-center gap-2"><CheckCircle size={16} className="text-[#2563EB]" /> Access on mobile and desktop</p>
                      <p className="flex items-center gap-2"><CheckCircle size={16} className="text-[#2563EB]" /> Direct Q&A with the creator</p>
                    </div>
                  </div>

                  <div className="pt-5 border-t border-[#E2E8F0] flex items-center justify-center gap-4 text-xs text-[#64748B] font-medium">
                    <span className="flex items-center gap-1.5"><ShieldCheck size={14} /> Secure checkout</span>
                  </div>
                </div>

                {/* Card 2: Details */}
                <div className="bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-6">
                  <h3 className="text-lg font-bold text-[#0F172A] mb-4">Session Details</h3>
                  <div className="space-y-4 text-sm">
                    <div className="flex items-start gap-3">
                      <Calendar size={18} className="text-[#94A6B8] mt-0.5" />
                      <div>
                        <p className="font-semibold text-[#0F172A]">Starts on</p>
                        <p className="text-[#475569]">
                          {sessions.length > 0 ? format(new Date(sessions[0].scheduled_at), 'MMMM dd, yyyy') : 'TBA'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock size={18} className="text-[#94A6B8] mt-0.5" />
                      <div>
                        <p className="font-semibold text-[#0F172A]">Duration</p>
                        <p className="text-[#475569]">{totalMinutes} minutes total</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Users size={18} className="text-[#94A6B8] mt-0.5" />
                      <div>
                        <p className="font-semibold text-[#0F172A]">Category</p>
                        <p className="text-[#475569]">{pack.category}</p>
                      </div>
                    </div>
                  </div>
                  
                  {nextSession && (
                    <div className="mt-6 p-4 bg-white rounded-xl border border-[#E2E8F0] text-center">
                      <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">Next Session Starts In</p>
                      <div className="text-lg font-bold text-[#2563EB]">
                        {formatDistanceToNow(new Date(nextSession.scheduled_at))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card 3: What's included (Icons) */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
                  <h3 className="text-lg font-bold text-[#0F172A] mb-4">Features</h3>
                  <div className="space-y-4 text-sm text-[#475569]">
                    <div className="flex items-center gap-3"><MonitorPlay size={18} className="text-[#94A6B8]" /> Live session length: {totalMinutes}m</div>
                    <div className="flex items-center gap-3"><Smartphone size={18} className="text-[#94A6B8]" /> Access on mobile and TV</div>
                    <div className="flex items-center gap-3"><Video size={18} className="text-[#94A6B8]" /> Full lifetime access to recordings</div>
                    <div className="flex items-center gap-3"><FileText size={18} className="text-[#94A6B8]" /> Certificate of completion</div>
                  </div>
                  
                  {/* Community links if enrolled */}
                  {(pack.whatsapp_link || pack.telegram_link) && (enrolledStatus === 'confirmed' || user?.id === pack.creator_id) && (
                    <div className="mt-6 pt-6 border-t border-[#E2E8F0] space-y-3">
                      <p className="font-bold text-[#0F172A] text-sm mb-2">Community Access</p>
                      {pack.whatsapp_link && (
                        <a href={pack.whatsapp_link} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#25D366]/10 text-[#075E54] font-semibold text-sm hover:bg-[#25D366]/20 transition-colors">
                          <MessageCircle size={16} /> Join WhatsApp Group
                        </a>
                      )}
                      {pack.telegram_link && (
                        <a href={pack.telegram_link} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#0088cc]/10 text-[#0088cc] font-semibold text-sm hover:bg-[#0088cc]/20 transition-colors">
                          <Send size={16} /> Join Telegram Channel
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Card 4: Support */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 text-center">
                  <div className="w-12 h-12 bg-[#F8FAFC] rounded-full flex items-center justify-center mx-auto mb-3">
                    <Headset size={20} className="text-[#64748B]" />
                  </div>
                  <h3 className="font-bold text-[#0F172A] mb-1">Need Help?</h3>
                  <p className="text-xs text-[#64748B] mb-4 leading-relaxed">Having trouble with payment or accessing sessions? Our support team is here.</p>
                  <a href="mailto:support@lora.com" className="text-sm font-semibold text-[#2563EB] hover:underline">Contact Support</a>
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* Payment Modal (Reused existing logic but wrapped carefully) */}
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
          <Link to="/signup/learner" className="btn-primary w-full py-3 block text-center mb-4 shadow-sm border border-transparent">Sign Up as Learner</Link>
          <p className="text-center text-sm text-[#475569]">
            Already have an account? <Link to="/login" className="text-[#2563EB] font-semibold hover:underline">Log in</Link>
          </p>
        </Modal>
      </div>
    </PageTransition>
  );
}
