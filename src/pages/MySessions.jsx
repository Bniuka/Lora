import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Clock, Play, Video, Sparkles, Calendar,
  ArrowLeft, MessageCircle, Send, CheckCircle,
  Timer, ChevronRight, Crown, Bookmark, BadgeCheck,
  FolderOpen, User, LayoutGrid, Repeat
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInMinutes, isPast } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { PageTransition, Skeleton } from '../components/ui';

function SessionCard({ session, index, packThumbnail }) {
  const now = new Date();
  const scheduled = new Date(session.scheduled_at);
  const minutesDiff = differenceInMinutes(scheduled, now);
  const isLive = minutesDiff <= 15 && minutesDiff >= -session.duration_minutes;
  const hasPassed = isPast(scheduled) && !isLive;

  return (
    <div className="flex flex-col md:flex-row items-center gap-6 p-5 rounded-2xl border border-[#DBEAFE] bg-white hover:border-[#2563EB]/40 hover:shadow-md transition-all group">
      {/* Thumbnail area */}
      <div className="w-full md:w-72 h-40 rounded-xl overflow-hidden relative shrink-0 bg-[#0F172A] shadow-sm">
        {packThumbnail ? (
          <img src={packThumbnail} alt={session.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1E293B] to-[#0F172A]" />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/90 group-hover:scale-110 transition-transform">
            <Play size={20} className="ml-1 fill-current" />
          </div>
        </div>
        <div className="absolute top-3 left-3">
          <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg text-white font-black text-sm tracking-widest shadow-sm">
            DAY {index + 1}
          </div>
        </div>
        {hasPassed && session.recording_url && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1.5 bg-[#10B981] text-white rounded-lg text-xs font-bold shadow-sm">
            <CheckCircle size={14} className="fill-white/20" /> Completed
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-3 py-1 bg-[#EFF6FF] text-[#2563EB] text-xs font-bold rounded-lg uppercase tracking-wide">
            DAY {index + 1}
          </span>
          {session.is_free_session && (
            <span className="px-3 py-1 bg-[#FEF3C7] text-[#D97706] text-xs font-bold rounded-lg uppercase tracking-wide flex items-center gap-1">
              <Sparkles size={12} /> Free Preview
            </span>
          )}
        </div>
        <h3 className="text-xl font-bold text-[#0F172A] mb-2 leading-tight group-hover:text-[#2563EB] transition-colors">{session.title}</h3>
        <p className="text-sm text-[#64748B] mb-5 line-clamp-2 leading-relaxed max-w-2xl">
          In this session, you'll get a complete overview and dive into practical strategies. Join the live interactive session or watch the recording at your own pace.
        </p>
        
        <div className="flex flex-wrap items-center gap-6 text-sm text-[#64748B] font-medium">
          <span className="flex items-center gap-2">
            <Calendar size={16} className="text-[#94A6B8]" />
            {format(scheduled, 'MMM dd, yyyy')}
          </span>
          <span className="flex items-center gap-2">
            <Clock size={16} className="text-[#94A6B8]" />
            {format(scheduled, 'h:mm a')}
          </span>
          <span className="flex items-center gap-2">
            <Timer size={16} className="text-[#94A6B8]" />
            {session.duration_minutes} min
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="shrink-0 w-full md:w-auto mt-4 md:mt-0 flex justify-end px-2">
        {isLive ? (
          <a
            href={session.zoom_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-4 w-full md:w-56 bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-3.5 px-6 rounded-full font-bold text-sm shadow-lg shadow-blue-500/20 transition-all group/btn"
          >
            <div className="flex items-center gap-2">
              <Video size={18} className="animate-pulse" /> Join Live
            </div>
            <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
          </a>
        ) : hasPassed && session.recording_url ? (
          <a
            href={session.recording_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-4 w-full md:w-56 bg-white hover:bg-[#F8FAFC] text-[#1D4ED8] border-2 border-[#1D4ED8] py-3 px-6 rounded-full font-bold text-sm shadow-sm transition-all group/btn"
          >
            <div className="flex items-center gap-2">
              <Play size={16} className="fill-current" /> Watch Recording
            </div>
            <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
          </a>
        ) : (
          <div className="w-full md:w-56 text-center p-3.5 rounded-full bg-[#F8FAFC] border border-[#E2E8F0]">
            <p className="text-sm font-bold text-[#64748B]">Starts {formatDistanceToNow(scheduled, { addSuffix: true })}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MySessions() {
  const { id } = useParams();
  const { user } = useAuth();
  const [pack, setPack] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [packRes, sessRes] = await Promise.all([
        supabase.from('session_packs')
          .select('*, creator_profiles(id, profiles(first_name, last_name))')
          .eq('id', id).single(),
        supabase.from('sessions').select('*').eq('pack_id', id).order('order_index'),
      ]);
      setPack(packRes.data);
      setSessions(sessRes.data || []);
      setLoading(false);
    };
    fetch();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full rounded-[24px]" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (!pack) {
    return <div className="text-center py-20 text-[#94A6B8]">Course not found</div>;
  }

  const totalMinutes = sessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);

  return (
    <PageTransition>
      <div className="pb-24">
        <Link
          to={`/learner/pack/${id}`}
          className="inline-flex items-center gap-2 text-sm text-[#64748B] hover:text-[#2563EB] font-medium transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Back to course details
        </Link>

        {/* Top Header Card */}
        <div className="relative rounded-[24px] overflow-hidden bg-white border border-[#E2E8F0] shadow-sm mb-12 p-6 md:p-8 flex flex-col xl:flex-row gap-8 items-start xl:items-center">
          {/* Decorative blur */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-[#DBEAFE]/60 to-transparent blur-3xl rounded-full -translate-y-1/3 translate-x-1/3 pointer-events-none"></div>

          {/* Thumbnail */}
          <div className="w-full xl:w-[420px] aspect-video rounded-[16px] overflow-hidden relative shadow-lg shrink-0 group cursor-pointer">
            {pack.thumbnail_url ? (
              <img src={pack.thumbnail_url} alt={pack.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            ) : (
              <div className="w-full h-full bg-[#1E293B]" />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/40 shadow-xl group-hover:scale-110 transition-transform">
                <Play size={28} className="ml-1 fill-current" />
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 relative z-10 w-full flex flex-col h-full justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EFF6FF] text-[#1D4ED8] rounded-full text-xs font-bold w-max shadow-sm border border-[#DBEAFE]">
                  <Crown size={14} className="fill-current text-[#3B82F6]" /> Premium Course
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E2E8F0] rounded-xl text-sm font-semibold text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-colors shadow-sm">
                  <Bookmark size={16} /> Save Course
                </button>
              </div>

              <h1 className="text-3xl md:text-4xl font-extrabold text-[#0F172A] mb-4 leading-tight tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                {pack.title}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-sm text-[#475569] mb-8">
                <div className="w-8 h-8 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center overflow-hidden font-bold uppercase text-[#64748B]">
                  {pack.creator_profiles?.profiles?.first_name?.[0]}{pack.creator_profiles?.profiles?.last_name?.[0]}
                </div>
                <div className="flex items-center gap-1.5">
                  by <span className="font-bold text-[#0F172A]">{pack.creator_profiles?.profiles?.first_name} {pack.creator_profiles?.profiles?.last_name}</span>
                  <BadgeCheck size={18} className="text-[#2563EB] fill-blue-100" />
                </div>
                <span className="text-[#CBD5E1] font-black">•</span>
                <span className="font-semibold text-[#64748B]">{sessions.length} sessions</span>
              </div>
            </div>

            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 w-full">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#E2E8F0] rounded-full text-xs font-semibold text-[#475569] shadow-sm"><FolderOpen size={14} className="text-[#94A6B8]"/> Course</span>
                <span className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#E2E8F0] rounded-full text-xs font-semibold text-[#475569] shadow-sm"><User size={14} className="text-[#94A6B8]"/> Beginner</span>
                <span className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#E2E8F0] rounded-full text-xs font-semibold text-[#475569] shadow-sm"><LayoutGrid size={14} className="text-[#94A6B8]"/> {pack.category}</span>
                <span className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#E2E8F0] rounded-full text-xs font-semibold text-[#475569] shadow-sm"><Repeat size={14} className="text-[#94A6B8]"/> Learn at your own pace</span>
              </div>
              
              <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl flex items-start gap-3 w-full xl:w-64 shadow-sm shrink-0">
                <CheckCircle size={24} className="text-[#16A34A] fill-green-100 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-[#16A34A] mb-0.5">Enrolled</p>
                  <p className="text-xs text-[#15803D] font-medium leading-relaxed">You have access to this course</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Course Sessions Section */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-[#0F172A] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              Course Sessions
            </h2>
            <p className="text-sm text-[#64748B]">
              Watch the recorded sessions and learn at your own pace. You can also join the live sessions when available.
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-[#DBEAFE] rounded-full text-sm font-bold text-[#1D4ED8] shadow-sm">
            <Video size={16} /> {sessions.length} sessions <span className="text-[#CBD5E1] mx-1 font-black">•</span> {totalMinutes} min total
          </div>
        </div>

        <div className="space-y-5 mb-12">
          {sessions.map((s, i) => (
            <SessionCard key={s.id} session={s} index={i} packThumbnail={pack.thumbnail_url} />
          ))}
        </div>

        {/* Community links */}
        {(pack.whatsapp_link || pack.telegram_link) && (
          <div className="bg-gradient-to-br from-[#F8FAFC] to-white p-8 rounded-[24px] border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-bold text-[#0F172A] mb-2">Join the Community</h3>
              <p className="text-sm text-[#64748B]">Connect with other learners and the creator.</p>
            </div>
            <div className="flex flex-wrap gap-4">
              {pack.whatsapp_link && (
                <a
                  href={pack.whatsapp_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-white border border-[#25D366] text-[#128C7E] hover:bg-[#25D366]/5 rounded-xl font-bold text-sm transition-colors shadow-sm"
                >
                  <MessageCircle size={18} /> WhatsApp Group
                </a>
              )}
              {pack.telegram_link && (
                <a
                  href={pack.telegram_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-white border border-[#229ED9] text-[#0088CC] hover:bg-[#229ED9]/5 rounded-xl font-bold text-sm transition-colors shadow-sm"
                >
                  <Send size={18} /> Telegram Channel
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
