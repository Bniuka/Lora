import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Clock, Play, Video, Lock, Sparkles, Calendar,
  ArrowLeft, MessageCircle, Send, ExternalLink
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInMinutes, isPast } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { PageTransition, GoldBadge, Skeleton } from '../components/ui';

function SessionCard({ session, onFreeJoin }) {
  const now = new Date();
  const scheduled = new Date(session.scheduled_at);
  const minutesDiff = differenceInMinutes(scheduled, now);
  const isLive = minutesDiff <= 15 && minutesDiff >= -session.duration_minutes;
  const hasPassed = isPast(scheduled) && !isLive;
  const recentlyUpdated = session.updated_at && new Date(session.updated_at) > new Date(Date.now() - 24 * 60 * 60 * 1000);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-5 rounded-xl border transition-all ${
        session.is_free_session
          ? 'border-[#DBEAFE] bg-[#DBEAFE]/10'
          : 'border-[#E2E8F0] bg-white hover:border-[#2563EB]/30 shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {session.is_free_session && <GoldBadge icon={Sparkles}>FREE</GoldBadge>}
            {recentlyUpdated && (
              <span className="badge badge-gold text-[10px]">Updated recently</span>
            )}
          </div>
          <h3 className="font-semibold text-[#0F172A] mb-1">{session.title}</h3>
          <div className="flex flex-wrap items-center gap-3 text-sm text-[#94A6B8]">
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {format(scheduled, 'MMM dd, yyyy · h:mm a')}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={14} /> {session.duration_minutes} min
            </span>
          </div>
        </div>

        <div className="flex-shrink-0">
          {isLive ? (
            <a
              href={session.zoom_link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => session.is_free_session && onFreeJoin?.(session)}
              className="btn-primary text-sm py-2.5 px-5 animate-glow-pulse"
            >
              <Play size={16} /> Join Now
            </a>
          ) : hasPassed && session.recording_url ? (
            <a
              href={session.recording_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-sm py-2.5 px-5"
            >
              <Video size={16} /> Watch Recording
            </a>
          ) : hasPassed && !session.recording_url ? (
            <span className="badge badge-pending">Recording Coming Soon</span>
          ) : (
            <div className="text-right">
              <span className="text-xs text-[#94A6B8] flex items-center gap-1">
                <Clock size={12} className="text-[#2563EB]" />
                {formatDistanceToNow(scheduled, { addSuffix: true })}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
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

  const handleFreeJoin = async (session) => {
    if (!user) return;
    await supabase.from('free_session_joins').insert({
      session_id: session.id,
      learner_id: user.id,
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (!pack) {
    return <div className="text-center py-20 text-[#94A6B8]">Pack not found</div>;
  }

  const freeSession = sessions.find(s => s.is_free_session);
  const paidSessions = sessions.filter(s => !s.is_free_session);

  return (
    <PageTransition>
      <div>
        <Link
          to={`/learner/pack/${id}`}
          className="inline-flex items-center gap-2 text-sm text-[#94A6B8] hover:text-[#2563EB] transition-colors mb-8"
        >
          <ArrowLeft size={16} /> Back to pack details
        </Link>

        <div className="mb-10">
          <h1
            className="text-2xl sm:text-3xl font-bold text-[#0F172A] mb-2"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {pack.title}
          </h1>
          <p className="text-sm text-[#94A6B8] mt-2">
            by {pack.creator_profiles?.profiles?.first_name} {pack.creator_profiles?.profiles?.last_name}
            {' · '}{sessions.length} session{sessions.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Free session at top */}
        {freeSession && (
          <div className="mb-10">
            <h2
              className="text-sm font-semibold text-[#2563EB] uppercase tracking-wider mb-4 flex items-center gap-2"
            >
              <Sparkles size={14} /> Free Preview Session
            </h2>
            <SessionCard session={freeSession} onFreeJoin={handleFreeJoin} />
          </div>
        )}

        {/* Paid sessions */}
        <div className="mb-10">
          <h2
            className="text-sm font-semibold text-[#94A6B8] uppercase tracking-wider mb-4"
          >
            Course Sessions ({paidSessions.length})
          </h2>
          <div className="space-y-4">
            {paidSessions.map((s, i) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        </div>

        {/* Community links */}
        {(pack.whatsapp_link || pack.telegram_link) && (
          <div className="bg-white p-8 rounded-2xl border border-[#F1F5F9] shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
            <h3 className="text-sm font-semibold text-[#94A6B8] uppercase tracking-wider mb-4">
              Community
            </h3>
            <div className="flex flex-wrap gap-4">
              {pack.whatsapp_link && (
                <a
                  href={pack.whatsapp_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost text-sm text-[#2D7A4F] border border-[#2D7A4F]/20 hover:bg-[#2D7A4F]/10"
                >
                  <MessageCircle size={16} /> WhatsApp Group
                </a>
              )}
              {pack.telegram_link && (
                <a
                  href={pack.telegram_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost text-sm text-[#2D7A4F] border border-[#2D7A4F]/20 hover:bg-[#2D7A4F]/10"
                >
                  <Send size={16} /> Telegram Channel
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
