import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Volume2, Pause, Play, Square, Sparkles, CheckCircle2,
  AlertTriangle, ArrowRight, X, Compass, HelpCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import {
  voiceEngine,
  useVoiceEngine,
  buildCreatorDiagnosis,
  getPageVoiceGuide,
} from '../lib/sinhalaVoiceEngine';
import '../pages/creator-guide.css';

export function VoiceEqualizer({ active = false }) {
  return (
    <span className={`lt-voice-eq ${active ? 'is-speaking' : ''}`} aria-hidden="true">
      <i className="b1" />
      <i className="b2" />
      <i className="b3" />
      <i className="b4" />
    </span>
  );
}

export default function CreatorVoiceAssistant({
  isOpen,
  onClose,
  externalState = null,
  onOpenWelcomeTour = null,
}) {
  const { user, profile, creatorProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const voice = useVoiceEngine();

  const [lang, setLang] = useState(() => localStorage.getItem('lora_guide_lang') || 'si');
  const [liveState, setLiveState] = useState({
    hasProfile: false,
    hasBank: false,
    packsCount: 0,
    hasSessions: true,
    hasPublishedPack: false,
    pendingSlipsCount: 0,
    missingRecordingsCount: 0,
    latestPackId: null,
    loaded: false,
  });

  const handleLangChange = (newLang) => {
    voiceEngine.stop();
    setLang(newLang);
    localStorage.setItem('lora_guide_lang', newLang);
  };

  // Fetch creator's live setup status if not supplied via externalState
  useEffect(() => {
    let cancelled = false;
    if (!isOpen || !user) return undefined;

    if (externalState) {
      return undefined;
    }

    async function loadCreatorStatus() {
      const [banksRes, packsRes, pendingRes] = await Promise.all([
        supabase
          .from('creator_bank_accounts')
          .select('id', { count: 'exact', head: true })
          .eq('creator_id', user.id),
        supabase
          .from('session_packs')
          .select('id, is_published, parent_pack_id, sessions(count)')
          .eq('creator_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('enrollments')
          .select('id, session_packs!inner(creator_id)', { count: 'exact', head: true })
          .eq('session_packs.creator_id', user.id)
          .eq('payment_status', 'pending'),
      ]);

      if (cancelled) return;

      const packs = packsRes.data || [];
      const topPacks = packs.filter(p => !p.parent_pack_id);
      const latest = topPacks[0] || packs[0] || null;
      const latestSessions = latest?.sessions?.[0]?.count ?? 0;

      setLiveState({
        hasProfile: Boolean(profile?.first_name && (creatorProfile?.about || profile?.contact_number)),
        hasBank: Boolean((banksRes.count || 0) > 0 || creatorProfile?.payment_link),
        packsCount: topPacks.length || packs.length,
        hasSessions: latest ? latestSessions > 0 : true,
        hasPublishedPack: packs.some(p => p.is_published),
        pendingSlipsCount: pendingRes.count || 0,
        missingRecordingsCount: 0,
        latestPackId: latest?.id || null,
        loaded: true,
      });
    }

    loadCreatorStatus();
    return () => {
      cancelled = true;
    };
  }, [isOpen, user, externalState, profile, creatorProfile]);

  if (!isOpen) return null;

  const effectiveState = externalState || liveState;
  const diagnosis = buildCreatorDiagnosis(effectiveState, lang);
  const pageGuide = getPageVoiceGuide(location.pathname, lang);
  const isSi = lang !== 'en';
  const isSpeaking = voice.isPlaying && !voice.isPaused;

  const handleClose = () => {
    voiceEngine.stop();
    onClose();
  };

  const handlePlayAllMissing = () => {
    if (voice.isPlaying && voice.playlistTotal > 1) {
      voiceEngine.togglePause();
      return;
    }
    voiceEngine.playPlaylist(diagnosis.playlist, { lang });
  };

  const handlePlayPageGuide = () => {
    if (voice.activeClipId === pageGuide.clipId && voice.isPlaying) {
      voiceEngine.togglePause();
      return;
    }
    voiceEngine.playClip(pageGuide.clipId, {
      itemId: 'page_guide',
      text: pageGuide.text,
      lang,
    });
  };

  const handlePlaySingleItem = (item) => {
    if (voice.activeClipId === item.clipId && voice.isPlaying) {
      voiceEngine.togglePause();
      return;
    }
    voiceEngine.playClip(item.clipId, {
      itemId: item.id,
      text: item.voiceText,
      lang,
    });
  };

  const handleActionClick = (to) => {
    voiceEngine.stop();
    onClose();
    navigate(to);
  };

  const handleCycleSpeed = () => {
    const nextRate = voice.rate === 1.0 ? 1.15 : voice.rate === 1.15 ? 0.9 : 1.0;
    voiceEngine.setRate(nextRate);
  };

  return (
    <div
      className="lora-tour-overlay lora-voice-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={isSi ? 'ලෝරා හඬ සහායකයා' : 'Lora Voice Assistant'}
      onClick={handleClose}
    >
      <div
        className="lt-modal lva-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER WITH MASCOT & LANGUAGE SWITCH ── */}
        <div className="lt-header lva-header">
          <div className="lt-header-top">
            <span className="lt-badge lva-badge">
              <Sparkles size={14} />
              {isSi ? 'AI හඬ මාර්ගෝපදේශකයා · සිංහලෙන්' : 'AI Voice Co-Pilot · Interactive Guide'}
            </span>

            <div className="lt-header-controls">
              <div className="lg-lang-switch">
                <button
                  type="button"
                  className={`lg-lang-btn ${lang === 'si' ? 'active' : ''}`}
                  onClick={() => handleLangChange('si')}
                >
                  🇱🇰 සිංහල
                </button>
                <button
                  type="button"
                  className={`lg-lang-btn ${lang === 'en' ? 'active' : ''}`}
                  onClick={() => handleLangChange('en')}
                >
                  English
                </button>
              </div>

              <button
                type="button"
                className="lt-close-btn"
                onClick={handleClose}
                aria-label="Close voice assistant"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          <div className="lva-hero-row">
            <div className={`lva-avatar-wrap ${isSpeaking ? 'is-speaking' : ''}`}>
              <img src="/mascot-dreamy.png" alt="Lora Voice Assistant" className="lva-avatar-img" />
              <span className="lva-avatar-ring" aria-hidden="true" />
            </div>

            <div className="lva-hero-copy">
              <h2 className="lt-title">
                {isSi
                  ? 'ආයුබෝවන්! මොනවද කරන්න තියෙන්නේ කියලා සිංහලෙන්ම අහමු 🎙️'
                  : 'Hi Creator! Let me guide you through what needs to be done 🎙️'}
              </h2>
              <p className="lt-subtitle">
                {isSi
                  ? 'කියවන්න අමාරු නම් හෝ කොතනින්ද පටන් ගන්නේ කියලා පැහැදිලි නැත්නම්, පහළ බටන් එක ඔබන්න. ඔයාගේ ගිණුමේ අඩුපාඩු සහ ඊළඟට කළ යුතු දේ මම එකින් එක කියලා දෙන්නම්.'
                  : 'Skip reading long guides—tap Play below and I will check your account, tell you what is missing, and explain each step aloud.'}
              </p>
            </div>
          </div>

          {/* Primary Voice Control Bar */}
          <div className="lva-player-bar">
            <button
              type="button"
              className={`lva-main-play-btn ${isSpeaking ? 'playing' : ''}`}
              onClick={handlePlayAllMissing}
            >
              {isSpeaking && voice.playlistTotal > 1 ? (
                <>
                  <Pause size={17} />
                  <span>{isSi ? 'නවත්වන්න (Pause)' : 'Pause Guide'}</span>
                </>
              ) : (
                <>
                  <Volume2 size={18} />
                  <span>
                    {diagnosis.missingItems.length > 0
                      ? isSi
                        ? `මගේ අඩුපාඩු ${diagnosis.missingItems.length} සහ කළ යුතු දේ අහන්න`
                        : `Speak My ${diagnosis.missingItems.length} Missing Step${diagnosis.missingItems.length > 1 ? 's' : ''}`
                      : isSi
                        ? 'සම්පූර්ණ විස්තරය සිංහලෙන් අහන්න'
                        : 'Listen to Account Summary'}
                  </span>
                </>
              )}
              <VoiceEqualizer active={isSpeaking} />
            </button>

            <button
              type="button"
              className="lva-sec-play-btn"
              onClick={handlePlayPageGuide}
              title={pageGuide.title}
            >
              <Compass size={15} />
              <span>
                {voice.activeClipId === pageGuide.clipId && isSpeaking
                  ? isSi ? 'කතා කරමින්...' : 'Speaking...'
                  : isSi ? 'මේ පිටුව ගැන අහන්න' : 'Explain This Page'}
              </span>
            </button>

            {voice.isPlaying && (
              <div className="lva-mini-controls">
                <button
                  type="button"
                  className="lva-ctrl-chip"
                  onClick={handleCycleSpeed}
                  title="Playback speed"
                >
                  {voice.rate}x
                </button>
                <button
                  type="button"
                  className="lva-ctrl-chip stop"
                  onClick={() => voiceEngine.stop()}
                  title="Stop voice"
                  aria-label="Stop voice"
                >
                  <Square size={13} />
                </button>
              </div>
            )}
          </div>

          {/* Live Spoken Caption Box */}
          {voice.isPlaying && voice.currentText && (
            <div className="lva-caption-box">
              <div className="lva-caption-top">
                <span className="lva-caption-live">
                  <span className="lva-live-dot" />
                  {isSi ? 'හඬ මාර්ගෝපදේශය ක්‍රියාත්මකයි' : 'Speaking Live'}
                </span>
                {voice.playlistTotal > 1 && (
                  <span className="lva-caption-step">
                    {voice.playlistIndex + 1} / {voice.playlistTotal}
                  </span>
                )}
              </div>
              <p className="lva-caption-text">“{voice.currentText}”</p>
              <div className="lva-progress-track">
                <div className="lva-progress-fill" style={{ width: `${voice.progress || 15}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* ── BODY: SMART MISSING ITEMS & STEP-BY-STEP CHECKLIST ── */}
        <div className="lt-body lva-body">
          <div className="lva-section-head">
            <span className="lva-section-title">
              {diagnosis.missingItems.length > 0
                ? isSi
                  ? `⚠️ දැනට සම්පූර්ණ කළ යුතු දේවල් (${diagnosis.missingItems.length})`
                  : `⚠️ Missing Setup & Action Items (${diagnosis.missingItems.length})`
                : isSi
                  ? '✅ සියලුම මූලික පියවර සම්පූර්ණයි!'
                  : '✅ All Core Setup Steps Completed!'}
            </span>
            <span className="lva-section-sub">
              {isSi ? 'ඕනෑම පියවරක 🔊 ඔබා විස්තරය අහන්න' : 'Tap 🔊 on any step to listen'}
            </span>
          </div>

          <div className="lva-items-list">
            {diagnosis.items.map((item) => {
              const isItemSpeaking = voice.activeClipId === item.clipId && voice.isPlaying;
              return (
                <div
                  key={item.id}
                  className={`lva-item-card ${item.done ? 'is-done' : `is-missing sev-${item.severity}`} ${
                    isItemSpeaking ? 'is-speaking-card' : ''
                  }`}
                >
                  <div className="lva-item-left">
                    <div className={`lva-item-icon ${item.done ? 'done' : item.severity}`}>
                      {item.done ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
                    </div>

                    <div className="lva-item-content">
                      <div className="lva-item-badges">
                        <span className="lva-step-pill">{item.stepBadge}</span>
                        <span className={`lva-status-pill ${item.done ? 'done' : 'pending'}`}>
                          {item.done
                            ? isSi ? 'සම්පූර්ණයි ✓' : 'Done ✓'
                            : isSi ? 'සම්පූර්ණ කර නැත' : 'Missing'}
                        </span>
                      </div>
                      <div className="lva-item-title">{item.title}</div>
                      <div className="lva-item-desc">{item.shortDesc}</div>
                    </div>
                  </div>

                  <div className="lva-item-actions">
                    <button
                      type="button"
                      className={`lva-listen-chip ${isItemSpeaking ? 'active' : ''}`}
                      onClick={() => handlePlaySingleItem(item)}
                      title={isSi ? 'සිංහලෙන් අහන්න' : 'Listen to explanation'}
                    >
                      {isItemSpeaking && !voice.isPaused ? <Pause size={13} /> : <Play size={13} />}
                      <span>{isItemSpeaking ? (isSi ? 'අහමින්...' : 'Playing') : isSi ? 'අහන්න' : 'Listen'}</span>
                    </button>

                    <button
                      type="button"
                      className={`lva-go-chip ${item.done ? 'done' : ''}`}
                      onClick={() => handleActionClick(item.to)}
                    >
                      <span>{item.done ? item.doneLabel : item.ctaLabel}</span>
                      {!item.done && <ArrowRight size={13} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="lt-footer lva-footer">
          {onOpenWelcomeTour ? (
            <button
              type="button"
              className="lt-btn-back"
              onClick={() => {
                voiceEngine.stop();
                onClose();
                onOpenWelcomeTour();
              }}
            >
              <HelpCircle size={15} />
              {isSi ? 'පියවර 6 පින්තූර මාර්ගෝපදේශය (Slide Tour)' : 'Open 6-Slide Visual Tour'}
            </button>
          ) : (
            <button
              type="button"
              className="lt-btn-back"
              onClick={() => handleActionClick('/creator/guide')}
            >
              <HelpCircle size={15} />
              {isSi ? 'සම්පූර්ණ Creator Guide පිටුව' : 'Open Full Creator Guide'}
            </button>
          )}

          <button
            type="button"
            className="lt-btn-done"
            onClick={handleClose}
          >
            {isSi ? 'පැහැදිලියි, වැඩ පටන් ගමු!' : 'Got It, Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
