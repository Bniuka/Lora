import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Clock, Users, Lock, Play, ExternalLink, Upload,
  Sparkles, MessageCircle, Send, Calendar, Video, Loader2, CheckCircle, Building2, Copy,
  ChevronRight, ChevronDown, ChevronUp, Star, ShieldCheck, Headset, LayoutGrid, MonitorPlay, Infinity as InfinityIcon, Smartphone, PlayCircle
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInMinutes, isPast } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { generatePaymentReference, hasValidSubscription } from '../lib/utils';
import { PageTransition, GoldBadge, Modal, StatusBadge, Skeleton } from '../components/ui';

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
  const [descExpanded, setDescExpanded] = useState(false);

  const totalMinutes = sessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);

  useEffect(() => {
    const fetch = async () => {
      const [packRes, sessRes] = await Promise.all([
        supabase.from('session_packs')
          .select('*, creator_profiles(id, subscription_status, trial_ends_at, payment_link, payment_option, about, category, profiles(first_name, last_name, avatar_url))')
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

  const isCreatorValid = hasValidSubscription(creator);
  // Hide pack if the creator's subscription is invalid, unless the current user is the creator
  if (!isCreatorValid && user?.id !== pack.creator_id) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center py-32">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock size={32} />
        </div>
        <h2 className="text-3xl font-bold text-[#0F172A] mb-4">Course Unavailable</h2>
        <p className="text-lg text-[#475569] max-w-md mx-auto mb-8">
          This course is currently unavailable because the creator's account is inactive or their free trial has ended.
        </p>
        <Link to="/learner/discover" className="btn-primary inline-flex">Explore other courses</Link>
      </div>
    );
  }

  const embedUrl = getVideoEmbedUrl(pack.intro_video_url);

  return (
    <PageTransition>
      <div className="min-h-screen bg-white pb-32">
        {/* BREADCRUMB */}
        <div className="bg-[#F8F9FA] border-b border-[#E2E8F0] py-3 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-[#64748B] font-medium">
            <Link to="/" className="hover:text-[#2563EB]">Home</Link>
            <ChevronRight size={14} />
            <Link to="/learner/discover" className="hover:text-[#2563EB]">Sessions</Link>
            <ChevronRight size={14} />
            <span className="text-[#0F172A] truncate">{pack.title}</span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 flex flex-col lg:flex-row gap-10">
          
          {/* LEFT COLUMN */}
          <div className="flex-1 lg:max-w-[65%] min-w-0">
            {pack.has_free_session && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EFF6FF] text-[#2563EB] rounded-full text-xs font-bold uppercase tracking-widest mb-4 border border-[#DBEAFE]">
                <Sparkles size={12} /> Free Preview Session
              </div>
            )}
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0F172A] leading-[1.1] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
              {pack.title}
            </h1>
            
            {creator && (
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-[#E2E8F0]">
                <div className="w-12 h-12 rounded-full bg-[#E2E8F0] flex items-center justify-center text-[#475569] font-bold uppercase shrink-0">
                  {creator.profiles?.first_name?.[0]}{creator.profiles?.last_name?.[0]}
                </div>
                <div>
                  <p className="text-sm text-[#64748B] mb-0.5">Created by</p>
                  <Link to={`/creator/${creator.id}`} className="text-base font-bold text-[#0F172A] hover:text-[#2563EB] transition-colors">
                    {creator.profiles?.first_name} {creator.profiles?.last_name}
                  </Link>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-[#475569] font-medium mb-8">
              <div className="flex items-center gap-2"><PlayCircle size={18} className="text-[#2563EB]"/> {sessions.length} session{sessions.length !== 1 && 's'}</div>
              <div className="flex items-center gap-2"><Clock size={18} className="text-[#2563EB]"/> {totalMinutes} min total</div>
              <div className="flex items-center gap-2"><Users size={18} className="text-[#2563EB]"/> All Levels</div>
              <div className="flex items-center gap-2 text-[#F59E0B]"><Star size={18} className="fill-current"/> <span className="text-[#0F172A] font-bold">4.9</span> <span className="text-[#64748B]">(128 reviews)</span></div>
            </div>

            {/* Video Player */}
            {embedUrl && (
              <div className="mb-10 rounded-xl overflow-hidden shadow-lg border border-[#E2E8F0] bg-black aspect-video relative group">
                <iframe src={embedUrl} title="Intro video" className="w-full h-full relative z-10" allowFullScreen allow="autoplay; encrypted-media" />
                {embedUrl.includes('youtube') && (
                  <div className="absolute top-4 left-4 z-20 pointer-events-none">
                    <span className="bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                      <Play size={12} /> Watch on YouTube
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {/* Thumbnail Fallback */}
            {!embedUrl && pack.thumbnail_url && (
              <div className="mb-10 rounded-xl overflow-hidden shadow-lg border border-[#E2E8F0] aspect-video">
                <img src={pack.thumbnail_url} alt={pack.title} className="w-full h-full object-cover" />
              </div>
            )}

            {/* About */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-[#0F172A] mb-4">About This Session</h2>
              <div className="relative">
                <p className={`text-base text-[#475569] leading-relaxed whitespace-pre-wrap ${!descExpanded ? 'line-clamp-3' : ''}`}>
                  {pack.description}
                </p>
                {pack.description?.length > 150 && (
                  <button onClick={() => setDescExpanded(!descExpanded)} className="text-[#2563EB] font-bold text-sm hover:underline mt-2 flex items-center gap-1">
                    {descExpanded ? <>Show less <ChevronUp size={16}/></> : <>Show more <ChevronDown size={16}/></>}
                  </button>
                )}
              </div>
            </div>

            {/* What You'll Learn */}
            <div className="mb-10 bg-[#F8F9FA] rounded-xl p-6 sm:p-8 border border-[#E2E8F0]">
              <h2 className="text-xl font-bold text-[#0F172A] mb-6">What You'll Learn</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {['Master the core concepts from scratch', 'Practical hands-on exercises & projects', 'Live Q&A and community support', 'Access to exclusive resources and templates'].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="mt-0.5 bg-[#DCFCE7] text-[#16A34A] rounded-full p-0.5 shrink-0">
                      <CheckCircle size={16} />
                    </div>
                    <span className="text-sm text-[#475569] font-medium leading-tight">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Session Schedule */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-[#0F172A] mb-6">Session Schedule</h2>
              <div className="space-y-4">
                {sessions.map((s, i) => (
                  <div key={s.id} className="p-5 sm:p-6 rounded-xl border border-[#E2E8F0] bg-white shadow-sm flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] flex items-center justify-center shrink-0">
                      {(enrollment?.status === 'confirmed' || s.is_free_session) ? (
                        <span className="text-base font-black text-[#2563EB]">{i + 1}</span>
                      ) : (
                        <Lock size={18} className="text-[#94A6B8]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-[#0F172A] bg-[#F1F5F9] px-2 py-1 rounded-md">
                          {format(new Date(s.scheduled_at), 'MMM dd')}
                        </span>
                        {s.is_free_session && (
                          <span className="text-[10px] font-bold text-[#2563EB] bg-[#DBEAFE] px-2 py-1 rounded-md uppercase tracking-wider">Free Preview</span>
                        )}
                        {differenceInMinutes(new Date(s.scheduled_at), new Date()) > 0 && differenceInMinutes(new Date(s.scheduled_at), new Date()) < 24*60 && (
                          <span className="text-[10px] font-bold text-[#D97706] bg-[#FEF3C7] px-2 py-1 rounded-md uppercase tracking-wider">Upcoming Soon</span>
                        )}
                      </div>
                      <h4 className="text-lg font-bold text-[#0F172A] mb-1 leading-tight truncate">{s.title}</h4>
                      <div className="text-sm text-[#64748B] flex items-center gap-3">
                        <span className="flex items-center gap-1.5"><Clock size={14} /> {format(new Date(s.scheduled_at), 'h:mm a')}</span>
                        <span>•</span>
                        <span>{s.duration_minutes}m duration</span>
                      </div>
                    </div>
                    {enrollment?.status === 'confirmed' || s.is_free_session ? (
                      <div className="shrink-0 mt-2 sm:mt-0">
                        <SessionButton session={s} />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN (SIDEBAR) */}
          <div className="lg:w-[35%] shrink-0">
            <div className="sticky top-8 space-y-6">
              
              {/* Pricing Card */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xl p-6 sm:p-8">
                <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">Total Price</p>
                <div className="text-4xl font-black text-[#0F172A] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
                  {pack.currency} {pack.price}
                </div>

                {user && profile?.role === 'learner' && !enrollment && (
                  <button onClick={handleStartPaymentFlow} className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all flex items-center justify-center gap-2 mb-4">
                    Join This Session
                  </button>
                )}

                {enrollment?.status === 'pending' && (
                  <div className="p-4 rounded-xl bg-[#DBEAFE]/30 border border-[#DBEAFE] text-center mb-4">
                    <p className="text-sm text-[#2563EB] font-bold">Payment submitted!</p>
                    <p className="text-xs text-[#2563EB]/80 mt-1">Waiting for creator confirmation.</p>
                  </div>
                )}
                {enrollment?.status === 'rejected' && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-center mb-4">
                    <p className="text-sm text-[#C0392B] font-bold mb-2">Payment rejected</p>
                    <button onClick={() => setPaymentModal(true)} className="btn-primary w-full py-2 text-sm">Re-upload Screenshot</button>
                  </div>
                )}
                {!user && (
                  <Link to="/signup/learner" className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all flex items-center justify-center gap-2 mb-4">
                    Sign Up to Join
                  </Link>
                )}

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-sm text-[#475569] font-medium"><CheckCircle size={16} className="text-[#16A34A]"/> Full lifetime access</div>
                  <div className="flex items-center gap-3 text-sm text-[#475569] font-medium"><CheckCircle size={16} className="text-[#16A34A]"/> Access on mobile and desktop</div>
                  <div className="flex items-center gap-3 text-sm text-[#475569] font-medium"><CheckCircle size={16} className="text-[#16A34A]"/> Certificate of completion</div>
                </div>

                <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-center gap-2 text-xs text-[#64748B] font-medium">
                  <ShieldCheck size={14} className="text-[#94A6B8]"/> Secure checkout • 7-day refund
                </div>
              </div>

              {/* Session Details Card */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
                <h3 className="font-bold text-[#0F172A] mb-4">Session Details</h3>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Calendar size={18} className="text-[#64748B] shrink-0 mt-0.5"/>
                    <div>
                      <p className="text-sm font-bold text-[#0F172A]">Starts On</p>
                      <p className="text-sm text-[#475569]">{sessions[0] ? format(new Date(sessions[0].scheduled_at), 'MMMM dd, yyyy') : 'TBA'}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Clock size={18} className="text-[#64748B] shrink-0 mt-0.5"/>
                    <div>
                      <p className="text-sm font-bold text-[#0F172A]">Time</p>
                      <p className="text-sm text-[#475569]">{sessions[0] ? format(new Date(sessions[0].scheduled_at), 'h:mm a') : 'TBA'}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <LayoutGrid size={18} className="text-[#64748B] shrink-0 mt-0.5"/>
                    <div>
                      <p className="text-sm font-bold text-[#0F172A]">Category</p>
                      <p className="text-sm text-[#475569]">{pack.category}</p>
                    </div>
                  </div>
                  
                  {sessions[0] && differenceInMinutes(new Date(sessions[0].scheduled_at), new Date()) > 0 && (
                    <div className="mt-6 p-4 bg-[#F8F9FA] rounded-lg border border-[#E2E8F0] text-center">
                      <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">Starts In</p>
                      <p className="text-sm font-bold text-[#2563EB]">{formatDistanceToNow(new Date(sessions[0].scheduled_at))}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* What's Included */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
                <h3 className="font-bold text-[#0F172A] mb-4">What's Included</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-[#475569]"><MonitorPlay size={16} className="text-[#64748B]"/> {totalMinutes} minutes of live content</div>
                  <div className="flex items-center gap-3 text-sm text-[#475569]"><Smartphone size={16} className="text-[#64748B]"/> Access on TV & Mobile</div>
                  <div className="flex items-center gap-3 text-sm text-[#475569]"><InfinityIcon size={16} className="text-[#64748B]"/> Replay availability</div>
                  {(pack.whatsapp_link || pack.telegram_link) && (
                    <div className="flex items-center gap-3 text-sm text-[#475569]"><Users size={16} className="text-[#64748B]"/> Community group access</div>
                  )}
                </div>
                
                {(pack.whatsapp_link || pack.telegram_link) && (enrollment?.status === 'confirmed' || user?.id === pack.creator_id) && (
                  <div className="mt-5 pt-5 border-t border-[#E2E8F0] space-y-2">
                    {pack.whatsapp_link && (
                      <a href={pack.whatsapp_link} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full py-2 text-sm flex items-center justify-center gap-2 border-[#E2E8F0]">
                        <MessageCircle size={16} className="text-[#25D366]"/> Join WhatsApp
                      </a>
                    )}
                    {pack.telegram_link && (
                      <a href={pack.telegram_link} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full py-2 text-sm flex items-center justify-center gap-2 border-[#E2E8F0]">
                        <Send size={16} className="text-[#229ED9]"/> Join Telegram
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Support Card */}
              <div className="bg-[#F8F9FA] rounded-xl border border-[#E2E8F0] p-6 text-center">
                <div className="w-10 h-10 rounded-full bg-[#E2E8F0] text-[#64748B] flex items-center justify-center mx-auto mb-3">
                  <Headset size={20} />
                </div>
                <h3 className="font-bold text-[#0F172A] mb-1">Need Help?</h3>
                <p className="text-xs text-[#475569] mb-4">Having trouble with your enrollment or have questions?</p>
                <button className="text-sm font-bold text-[#2563EB] hover:underline">Contact Support</button>
              </div>

            </div>
          </div>
        </div>

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
