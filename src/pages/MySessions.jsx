import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MessageCircle, Send, Sparkles, ArrowRight
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInMinutes, isPast } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { PageTransition, Skeleton } from '../components/ui';
import './course-sessions.css';

function SessionCard({ session, index, packThumbnail, packCreatorId, packTitle }) {
  const [requested, setRequested] = useState(() => {
    try {
      return localStorage.getItem(`lora_rec_req_${session.id}`) === 'true';
    } catch {
      return false;
    }
  });
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestToast, setRequestToast] = useState(false);

  const now = new Date();
  const scheduled = new Date(session.scheduled_at);
  const duration = session.duration_minutes || 60;
  const sessionEndTime = new Date(scheduled.getTime() + duration * 60000);
  const minutesDiff = differenceInMinutes(scheduled, now);
  const isLive = minutesDiff <= 15 && minutesDiff >= -duration;
  const hasEnded = (isPast(scheduled) || now > sessionEndTime) && !isLive;
  const hasRecording = Boolean(session.recording_url && session.recording_url.trim());
  const isCompleted = hasEnded && hasRecording;

  // Concluded session without recording
  const hoursSinceEnd = (now.getTime() - sessionEndTime.getTime()) / (1000 * 60 * 60);
  const isProcessing = hasEnded && !hasRecording && hoursSinceEnd <= 24;
  const isPending = hasEnded && !hasRecording && hoursSinceEnd > 24;

  const handleRequestRecording = async () => {
    if (requested || isRequesting) return;
    setIsRequesting(true);
    try {
      if (packCreatorId) {
        await supabase.from('notifications').insert({
          user_id: packCreatorId,
          title: 'Recording Requested! 🔔',
          message: `Learners are waiting for the recording of Day ${index + 1}: "${session.title}" in "${packTitle || 'your course'}".`,
        });
      }
      try {
        localStorage.setItem(`lora_rec_req_${session.id}`, 'true');
      } catch {}
      setRequested(true);
      setRequestToast(true);
      setTimeout(() => setRequestToast(false), 4500);
    } catch (err) {
      console.error('Failed to request recording:', err);
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <article className={`card sess ${isCompleted ? 'ok' : ''}`}>
      {/* Thumbnail Area */}
      <div className="th">
        <span className="day">DAY {index + 1}</span>
        
        {packThumbnail ? (
          <img src={packThumbnail} alt={session.title} />
        ) : null}

        {isCompleted && session.recording_url ? (
          <a
            href={session.recording_url}
            target="_blank"
            rel="noopener noreferrer"
            className="play"
            aria-label="Play recording"
          >
            <svg className="ic" viewBox="0 0 24 24"><path d="M6 4v16l14-8z"/></svg>
          </a>
        ) : isLive ? (
          <a
            href={session.zoom_link || session.youtube_live_link}
            target="_blank"
            rel="noopener noreferrer"
            className="play"
            aria-label="Join live session"
          >
            <svg className="ic" viewBox="0 0 24 24"><path d="M6 4v16l14-8z"/></svg>
          </a>
        ) : (
          <div className="play" aria-hidden="true">
            <svg className="ic" viewBox="0 0 24 24"><path d="M6 4v16l14-8z"/></svg>
          </div>
        )}

        {isCompleted && (
          <span className="done">
            <svg className="ic" viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>
            Completed
          </span>
        )}
      </div>

      {/* Session Details */}
      <div className="sb">
        <div className="tags">
          Day {index + 1}
          {session.is_free_session && <span className="fp">Free preview</span>}
        </div>
        <h3>{session.title}</h3>
        <p>
          {session.description || "In this session, you'll get a complete overview and dive into practical strategies. Join the live interactive session or watch the recording at your own pace."}
        </p>

        <div className="mt">
          <span>
            <svg className="ic" viewBox="0 0 24 24">
              <rect x="3" y="5" width="18" height="16" rx="2"/>
              <path d="M3 10h18M8 3v4M16 3v4"/>
            </svg>
            {format(scheduled, 'MMM dd, yyyy')}
          </span>
          <span>
            <svg className="ic" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9"/>
              <path d="M12 7v5l3 2"/>
            </svg>
            {format(scheduled, 'h:mm a')}
          </span>
          <span>
            <svg className="ic" viewBox="0 0 24 24">
              <circle cx="12" cy="13" r="8"/>
              <path d="M12 9v4M9 2h6"/>
            </svg>
            {session.duration_minutes || 60} min
          </span>
        </div>
      </div>

      {/* Action CTA */}
      <div className="act">
        {isLive ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {session.zoom_link && (
              <a
                className="btn live"
                href={session.zoom_link}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="ic" viewBox="0 0 24 24">
                  <polygon points="23 7 16 12 23 17 23 7"/>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>
                Join Zoom
              </a>
            )}
            {session.youtube_live_link && (
              <a
                className="btn yt-live"
                href={session.youtube_live_link}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="ic" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                Watch YouTube
              </a>
            )}
          </div>
        ) : isCompleted ? (
          <a
            className="btn"
            href={session.recording_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg className="ic" viewBox="0 0 24 24">
              <rect x="3" y="6" width="13" height="12" rx="2"/>
              <path d="m16 10 5-3v10l-5-3"/>
            </svg>
            Watch recording
          </a>
        ) : isProcessing ? (
          <div className="processing-wrap">
            <span className="pill processing">
              <svg className="ic spin" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" fill="none" strokeDasharray="30" strokeDashoffset="12" strokeLinecap="round" />
              </svg>
              Recording being processed — available soon
            </span>
          </div>
        ) : isPending ? (
          <div className="pending-wrap">
            <span className="pill pending">
              <svg className="ic" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" />
                <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Recording pending
            </span>
            <button
              type="button"
              className={`btn req-btn ${requested ? 'done' : ''}`}
              onClick={handleRequestRecording}
              disabled={requested || isRequesting}
              title={requested ? 'Creator has been notified' : 'Notify creator to upload the recording'}
            >
              {requested ? (
                <>
                  <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="m5 12 5 5 9-10" />
                  </svg>
                  Requested ✓
                </>
              ) : isRequesting ? (
                'Requesting...'
              ) : (
                <>
                  <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  Request recording
                </>
              )}
            </button>
            {requestToast && (
              <div className="req-toast">Creator notified! We'll alert you once uploaded.</div>
            )}
          </div>
        ) : (
          <span className="pill">
            <svg className="ic" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9"/>
              <path d="M12 7v5l3 2"/>
            </svg>
            Starts {formatDistanceToNow(scheduled, { addSuffix: true })}
          </span>
        )}
      </div>
    </article>
  );
}

export default function MySessions() {
  const { id } = useParams();
  const { user } = useAuth();
  const [pack, setPack] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      let packData = null;

      if (isUuid) {
        const { data } = await supabase.from('session_packs')
          .select('*, creator_profiles(id, profiles(first_name, last_name))')
          .eq('id', id).maybeSingle();
        packData = data;
      } else {
        const { data: bySlug } = await supabase.from('session_packs')
          .select('*, creator_profiles(id, profiles(first_name, last_name))')
          .eq('slug', id).maybeSingle();
        packData = bySlug;

        if (!packData) {
          const { data: byTitle } = await supabase.from('session_packs')
            .select('*, creator_profiles(id, profiles(first_name, last_name))')
            .ilike('title', id.replace(/-/g, ' '))
            .limit(1);
          if (byTitle && byTitle.length > 0) packData = byTitle[0];
        }
      }

      setPack(packData);

      if (packData) {
        const sessRes = await supabase.from('sessions').select('*').eq('pack_id', packData.id).order('order_index');
        setSessions(sessRes.data || []);
      }
      setLoading(false);
    };
    fetch();
  }, [id]);

  if (loading) {
    return (
      <div className="lora-sessions">
        <div className="wrap">
          <Skeleton className="h-64 w-full rounded-[24px]" style={{ marginBottom: 24, height: 260 }} />
          <Skeleton className="h-10 w-64" style={{ marginBottom: 16, height: 40 }} />
          <Skeleton className="h-40 w-full" style={{ marginBottom: 16, height: 140 }} />
          <Skeleton className="h-40 w-full" style={{ height: 140 }} />
        </div>
      </div>
    );
  }

  if (!pack) {
    return (
      <div className="lora-sessions">
        <div className="wrap" style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--muted)' }}>
          Course not found
        </div>
      </div>
    );
  }

  const totalMinutes = sessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
  const completedSessions = sessions.filter(s => isPast(new Date(s.scheduled_at)) && s.recording_url).length;
  const progressPercent = sessions.length > 0 ? Math.round((completedSessions / sessions.length) * 100) : 0;

  const creatorFirst = pack.creator_profiles?.profiles?.first_name || '';
  const creatorLast = pack.creator_profiles?.profiles?.last_name || '';
  const initials = ((creatorFirst[0] || 'C') + (creatorLast[0] || '')).toUpperCase();

  return (
    <PageTransition>
      <div className="lora-sessions">
        <div className="wrap">
          {/* Back link */}
          <Link to={`/learner/pack/${pack.slug || id}`} className="backl">
            <svg className="ic" viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>
            Back to course details
          </Link>

          {/* Top Header Card */}
          <section className="card hero">
            <div className="th">
              {pack.thumbnail_url && <img src={pack.thumbnail_url} alt={pack.title} />}
              {pack.intro_video_url ? (
                <a
                  href={pack.intro_video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="play"
                  aria-label="Play course intro"
                >
                  <svg className="ic" viewBox="0 0 24 24"><path d="M6 4v16l14-8z"/></svg>
                </a>
              ) : (
                <div className="play" aria-label="Course preview">
                  <svg className="ic" viewBox="0 0 24 24"><path d="M6 4v16l14-8z"/></svg>
                </div>
              )}
            </div>

            <div className="hb">
              <div className="top">
                <span className="prem">
                  <svg className="ic" viewBox="0 0 24 24" style={{ width: 14, height: 14 }}>
                    <path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>
                  </svg>
                  Premium course
                </span>

                <button
                  className={`save ${isSaved ? 'on' : ''}`}
                  id="save"
                  type="button"
                  aria-pressed={isSaved}
                  onClick={() => setIsSaved(!isSaved)}
                >
                  <svg className="ic" viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z"/></svg>
                  <span>{isSaved ? 'Saved' : 'Save course'}</span>
                </button>
              </div>

              <h1>{pack.title}</h1>

              <div className="by">
                <span className="a">{initials}</span>
                by <b>{creatorFirst} {creatorLast}</b>
                <svg className="ic v" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9"/>
                  <path d="m8.5 12 2.5 2.5 4.5-5"/>
                </svg>
                <span className="d"></span>
                <b>{sessions.length} session{sessions.length !== 1 ? 's' : ''}</b>
              </div>

              <div className="chips">
                <span>
                  <svg className="ic" viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                  Course
                </span>
                <span>
                  <svg className="ic" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>
                  All levels
                </span>
                <span>
                  <svg className="ic" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="7" height="7" rx="1.5"/>
                    <rect x="14" y="3" width="7" height="7" rx="1.5"/>
                    <rect x="3" y="14" width="7" height="7" rx="1.5"/>
                    <rect x="14" y="14" width="7" height="7" rx="1.5"/>
                  </svg>
                  {pack.category || 'General'}
                </span>
                <span>
                  <svg className="ic" viewBox="0 0 24 24"><path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/></svg>
                  Learn at your own pace
                </span>
              </div>

              <div className="enr">
                <span className="ck">
                  <svg className="ic" viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>
                </span>
                <div>
                  <b>Enrolled</b>
                  <small>You have access to this course</small>
                </div>
                <div className="pg">
                  {completedSessions} of {sessions.length} completed
                  <div className="bar2">
                    <i style={{ width: `${progressPercent}%` }}></i>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Course Sessions Section Header */}
          <div className="sh">
            <div>
              <h2>Course sessions</h2>
              <p>Watch the recorded sessions and learn at your own pace. You can also join the live sessions when available.</p>
            </div>
            <div className="tot">
              <svg className="ic" viewBox="0 0 24 24"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/></svg>
              {sessions.length} session{sessions.length !== 1 ? 's' : ''}
              <span className="d"></span>
              {totalMinutes} min total
            </div>
          </div>

          {/* Sessions List */}
          <div className="list">
            {sessions.map((s, i) => (
              <SessionCard
                key={s.id}
                session={s}
                index={i}
                packThumbnail={pack.thumbnail_url}
                packCreatorId={pack.creator_id}
                packTitle={pack.title}
              />
            ))}
          </div>

          {/* Optional Upsell / Next Course Recommendation */}
          {(pack.upsell_link || pack.upsell_title) && (
            <div className="upsell-card">
              <div>
                <span className="upsell-badge">
                  <Sparkles size={13} /> Recommended Next Step
                </span>
                <h3 className="upsell-title">{pack.upsell_title || 'Continue Your Learning'}</h3>
                <p className="upsell-desc">Ready to level up? Join the creator's advanced follow-up course.</p>
              </div>
              <a
                href={pack.upsell_link || '#'}
                target={pack.upsell_link?.startsWith('http') ? '_blank' : '_self'}
                rel="noopener noreferrer"
                className="upsell-btn"
              >
                View Next Course <ArrowRight size={16} />
              </a>
            </div>
          )}

          {/* Community Links */}
          {(pack.whatsapp_link || pack.telegram_link) && (
            <div className="card comm">
              <div>
                <h3>Join the Community</h3>
                <p>Connect with other learners and the creator.</p>
              </div>
              <div className="comm-btns">
                {pack.whatsapp_link && (
                  <a
                    href={pack.whatsapp_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-wa"
                  >
                    <MessageCircle size={18} /> WhatsApp Group
                  </a>
                )}
                {pack.telegram_link && (
                  <a
                    href={pack.telegram_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-tg"
                  >
                    <Send size={18} /> Telegram Channel
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
