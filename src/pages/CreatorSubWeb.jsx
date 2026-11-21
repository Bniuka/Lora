import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Check,
  Sparkles,
  Users,
  Video,
  Layers,
  Lock,
  Search,
  MessageCircle,
  Send,
  PlayCircle,
  Globe,
  ArrowRight,
  Play,
  BookOpen,
  Award,
  Phone,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { PageTransition, Skeleton } from '../components/ui';
import {
  getThemeById,
  resolveCreatorBySubWeb,
} from '../lib/subWeb';
import './creator-sub-web.css';

function extractYouTubeEmbedUrl(url = '') {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|live\/)([^#&?]*).*/;
  const match = String(url).match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}?rel=0`;
  }
  return null;
}

export default function CreatorSubWeb({ hostContext = null }) {
  const { slug: routeSlug } = useParams();
  const { user, profile: viewerProfile } = useAuth();

  const [creatorData, setCreatorData] = useState(null);
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const effectiveSlug = hostContext?.slug || routeSlug || '';
  const effectiveCustomDomain = hostContext?.customDomain || '';

  useEffect(() => {
    let cancelled = false;
    const loadAcademy = async () => {
      setLoading(true);
      try {
        const resolved = await resolveCreatorBySubWeb({
          slug: effectiveSlug,
          customDomain: effectiveCustomDomain,
        });

        if (!resolved || cancelled) {
          setCreatorData(null);
          setLoading(false);
          return;
        }

        setCreatorData(resolved);

        if (resolved.config?.academy_name) {
          document.title = `${resolved.config.academy_name} — Official Course Portal`;
        }

        const { data: packsRes } = await supabase
          .from('session_packs')
          .select('*, sessions(count), enrollments(count)')
          .eq('creator_id', resolved.creator.id)
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        if (!cancelled) {
          const allPub = packsRes || [];
          const subByParent = allPub.reduce((acc, p) => {
            if (p.parent_pack_id) {
              if (!acc[p.parent_pack_id]) acc[p.parent_pack_id] = [];
              acc[p.parent_pack_id].push(p);
            }
            return acc;
          }, {});

          const topLevel = allPub
            .filter((p) => !p.parent_pack_id && p.visibility !== 'unlisted')
            .map((p) => ({
              ...p,
              _subPacks: subByParent[p.id] || [],
            }));

          setPacks(topLevel);
        }
      } catch (err) {
        console.error('Error loading Sub-Web academy:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadAcademy();
    return () => {
      cancelled = true;
    };
  }, [effectiveSlug, effectiveCustomDomain]);

  const categories = useMemo(() => {
    const cats = new Set();
    packs.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return ['all', ...Array.from(cats)];
  }, [packs]);

  const filteredPacks = useMemo(() => {
    return packs.filter((p) => {
      if (activeCategory === 'multi' && !p.is_multi_pack) return false;
      if (activeCategory === 'free' && Number(p.price) !== 0 && !p.has_free_session) return false;
      if (
        activeCategory !== 'all' &&
        activeCategory !== 'multi' &&
        activeCategory !== 'free' &&
        p.category !== activeCategory
      ) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (p.title || '').toLowerCase().includes(q);
        const descMatch = (p.description || '').toLowerCase().includes(q);
        return titleMatch || descMatch;
      }
      return true;
    });
  }, [packs, activeCategory, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-8 max-w-6xl mx-auto">
        <Skeleton className="h-16 w-full rounded-2xl mb-8" />
        <Skeleton className="h-80 w-full rounded-3xl mb-10" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!creatorData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A] text-white p-6">
        <div className="max-w-md text-center bg-[#1E293B] border border-slate-700 rounded-3xl p-8">
          <Globe className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Academy Website Not Found</h1>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            The academy address <b>{effectiveCustomDomain || effectiveSlug}</b> is not active yet or has been moved.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500"
          >
            Visit LoraSpace Main Platform
          </Link>
        </div>
      </div>
    );
  }

  const { creator, profile, config } = creatorData;
  const theme = getThemeById(config.theme_color);
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Instructor';
  const initials = `${profile?.first_name?.[0] || 'A'}${profile?.last_name?.[0] || ''}`.toUpperCase();
  const embedVideoUrl = extractYouTubeEmbedUrl(config.intro_video_url);

  const totalSessionsAcrossPacks = packs.reduce((sum, p) => {
    if (p.is_multi_pack) {
      return sum + (p._subPacks || []).reduce((s2, sub) => s2 + (sub.sessions?.[0]?.count || 0), 0);
    }
    return sum + (p.sessions?.[0]?.count || 0);
  }, 0);

  const totalStudentsCount = Math.max(
    creator?.total_students || 0,
    packs.reduce((sum, p) => {
      if (p.is_multi_pack) {
        return sum + (p._subPacks || []).reduce((s2, sub) => s2 + (sub.enrollments?.[0]?.count || 0), 0);
      }
      return sum + (p.enrollments?.[0]?.count || 0);
    }, 0)
  );

  const cleanWaDigits = (config.whatsapp_number || '').replace(/[^0-9]/g, '');
  const waChatUrl = cleanWaDigits
    ? `https://wa.me/${cleanWaDigits}?text=${encodeURIComponent(`Hi ${config.academy_name}, I would like to know more about your courses.`)}`
    : null;

  return (
    <PageTransition>
      <div
        className="lora-subweb"
        style={{
          '--sw-primary': theme.primary,
          '--sw-primary-dark': theme.primaryDark,
          '--sw-secondary': theme.secondary,
          '--sw-accent': theme.accent,
          '--sw-soft': theme.softBg,
          '--sw-border': theme.border,
          '--sw-hero-grad': theme.heroGradient,
          '--sw-btn-grad': theme.buttonGradient,
          '--sw-badge-bg': theme.badgeBg,
          '--sw-badge-text': theme.badgeText,
        }}
      >
        {/* Optional Top Announcement Bar */}
        {config.announcement_text && (
          <div className="sw-announcement">
            <Sparkles size={15} />
            <span>{config.announcement_text}</span>
          </div>
        )}

        {/* Standalone Branded Academy Navbar */}
        <header className="sw-navbar">
          <div className="sw-navbar-inner">
            <a href="#top" className="sw-brand">
              <div className="sw-brand-logo">
                {config.logo_url ? (
                  <img src={config.logo_url} alt={config.academy_name} />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="sw-brand-text">
                <span className="sw-brand-name">
                  {config.academy_name}
                  <span className="sw-verified-pill" title="Verified Official Academy">
                    <Check size={11} strokeWidth={3} />
                  </span>
                </span>
                <span className="sw-brand-sub">{config.tagline}</span>
              </div>
            </a>

            <nav className="sw-nav-links">
              <a href="#courses" className="sw-nav-link">Courses &amp; Batches</a>
              <a href="#about" className="sw-nav-link">About Academy</a>
              {waChatUrl && (
                <a href={waChatUrl} target="_blank" rel="noopener noreferrer" className="sw-nav-link">
                  Contact Support
                </a>
              )}
            </nav>

            <div className="sw-nav-actions">
              {waChatUrl && (
                <a
                  href={waChatUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sw-btn-wa-nav"
                >
                  <MessageCircle size={15} />
                  <span>WhatsApp Inquiry</span>
                </a>
              )}

              {user ? (
                <Link
                  to={viewerProfile?.role === 'creator' ? '/creator/dashboard' : '/learner/dashboard'}
                  className="sw-btn-primary"
                >
                  <BookOpen size={15} />
                  <span>{viewerProfile?.role === 'creator' ? 'Creator Studio' : 'My Enrolled Classes'}</span>
                </Link>
              ) : (
                <>
                  <Link
                    to={`/login?academy=${encodeURIComponent(config.sub_web_slug)}`}
                    className="sw-btn-login"
                  >
                    Student Login
                  </Link>
                  <Link
                    to={`/signup/learner?academy=${encodeURIComponent(config.sub_web_slug)}`}
                    className="sw-btn-primary"
                  >
                    <span>Join Academy</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="sw-hero" id="top">
          <div className="sw-hero-inner">
            <div>
              <div className="sw-hero-badge">
                <Sparkles size={13} />
                <span>{config.hero_badge || 'OFFICIAL ACADEMY PORTAL'}</span>
              </div>

              <h1 className="sw-hero-title">{config.hero_title}</h1>
              <p className="sw-hero-sub">{config.hero_subtitle}</p>

              <div className="sw-hero-pills">
                {config.stats_badge_1 && (
                  <span className="sw-hero-pill">
                    <Video size={14} /> {config.stats_badge_1}
                  </span>
                )}
                {config.stats_badge_2 && (
                  <span className="sw-hero-pill">
                    <Play size={14} /> {config.stats_badge_2}
                  </span>
                )}
                {config.stats_badge_3 && (
                  <span className="sw-hero-pill">
                    <Award size={14} /> {config.stats_badge_3}
                  </span>
                )}
              </div>

              <div className="sw-hero-ctas">
                <a href="#courses" className="sw-hero-btn-main">
                  <span>Explore Courses &amp; Batches</span>
                  <ArrowRight size={17} />
                </a>
                {waChatUrl && (
                  <a
                    href={waChatUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sw-hero-btn-sec"
                  >
                    <MessageCircle size={17} />
                    <span>Ask on WhatsApp</span>
                  </a>
                )}
              </div>
            </div>

            {/* Right: Video Trailer or Academy Visual Showcase */}
            <div className="sw-hero-media-card">
              <div className="sw-hero-video-frame">
                {embedVideoUrl ? (
                  <iframe
                    src={embedVideoUrl}
                    title={`${config.academy_name} Intro Video`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : config.hero_banner_url ? (
                  <img src={config.hero_banner_url} alt={config.academy_name} />
                ) : packs[0]?.thumbnail_url ? (
                  <img src={packs[0].thumbnail_url} alt={config.academy_name} />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 24,
                      textAlign: 'center',
                      background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.16), transparent 70%)',
                    }}
                  >
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 22,
                        background: 'rgba(255,255,255,0.14)',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 28,
                        fontWeight: 800,
                        marginBottom: 12,
                      }}
                    >
                      {initials}
                    </div>
                    <b style={{ fontSize: 18 }}>{config.academy_name}</b>
                    <span style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>
                      Interactive Live Classes &amp; Recorded Sessions
                    </span>
                  </div>
                )}
              </div>

              <div className="sw-hero-stats-strip">
                <div className="sw-hero-stat-box">
                  <b>{packs.length}</b>
                  <span>Active Courses</span>
                </div>
                <div className="sw-hero-stat-box">
                  <b>{totalSessionsAcrossPacks}+</b>
                  <span>Class Sessions</span>
                </div>
                <div className="sw-hero-stat-box">
                  <b>{totalStudentsCount}+</b>
                  <span>Students Joined</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content Area */}
        <main className="sw-main">
          {/* SECTION 1: Courses & Multi-Packs Catalog */}
          <section id="courses">
            <div className="sw-section-head">
              <div>
                <span className="sw-section-kicker">
                  <BookOpen size={12} /> OFFICIAL COURSE CATALOG
                </span>
                <h2 className="sw-section-title">Available Courses &amp; Monthly Batches</h2>
                <p className="sw-section-sub">
                  Select a course or monthly batch below to view the session schedule, watch free previews, and enroll.
                </p>
              </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="sw-catalog-toolbar">
              <div className="sw-filter-tabs">
                <button
                  type="button"
                  onClick={() => setActiveCategory('all')}
                  className={`sw-filter-tab ${activeCategory === 'all' ? 'active' : ''}`}
                >
                  All Courses ({packs.length})
                </button>
                {packs.some((p) => p.is_multi_pack) && (
                  <button
                    type="button"
                    onClick={() => setActiveCategory('multi')}
                    className={`sw-filter-tab ${activeCategory === 'multi' ? 'active' : ''}`}
                  >
                    Multi-Batch Courses
                  </button>
                )}
                {packs.some((p) => Number(p.price) === 0 || p.has_free_session) && (
                  <button
                    type="button"
                    onClick={() => setActiveCategory('free')}
                    className={`sw-filter-tab ${activeCategory === 'free' ? 'active' : ''}`}
                  >
                    Free Previews &amp; Workshops
                  </button>
                )}
                {categories
                  .filter((c) => c !== 'all')
                  .map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`sw-filter-tab ${activeCategory === cat ? 'active' : ''}`}
                    >
                      {cat}
                    </button>
                  ))}
              </div>

              <div className="sw-search-wrap">
                <Search size={16} className="sw-search-icon" />
                <input
                  type="text"
                  className="sw-search-input"
                  placeholder="Search courses or batches..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {filteredPacks.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-14 text-center">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-800 mb-1">No matching courses found</h3>
                <p className="text-sm text-slate-500">
                  Try clearing your search filter or check back soon for upcoming batches.
                </p>
              </div>
            ) : (
              <div className="sw-courses-grid">
                {filteredPacks.map((pack) => {
                  const isMulti = Boolean(pack.is_multi_pack);
                  const subs = pack._subPacks || [];
                  const sessionCount = isMulti
                    ? subs.reduce((sum, s) => sum + (s.sessions?.[0]?.count || 0), 0)
                    : pack.sessions?.[0]?.count || 0;
                  const studentCount = isMulti
                    ? subs.reduce((sum, s) => sum + (s.enrollments?.[0]?.count || 0), 0)
                    : pack.enrollments?.[0]?.count || 0;
                  const isFree = !isMulti && Number(pack.price) === 0;
                  const paidPrices = subs.map((s) => Number(s.price)).filter((n) => n > 0);
                  const minSubPrice = paidPrices.length > 0 ? Math.min(...paidPrices) : null;

                  return (
                    <Link
                      key={pack.id}
                      to={`/p/${pack.slug || pack.id}?academy=${encodeURIComponent(config.sub_web_slug)}`}
                      className="sw-course-card"
                    >
                      <div className="sw-course-thumb">
                        {pack.thumbnail_url ? (
                          <img src={pack.thumbnail_url} alt={pack.title} />
                        ) : (
                          <Layers size={42} color="rgba(255,255,255,0.45)" />
                        )}

                        <div className="sw-course-badges">
                          {isMulti && (
                            <span className="sw-course-badge multi">
                              <Layers size={12} /> {subs.length} Batch{subs.length !== 1 ? 'es' : ''}
                            </span>
                          )}
                          {isFree && (
                            <span className="sw-course-badge free">
                              <Sparkles size={11} /> 100% Free
                            </span>
                          )}
                          {!isFree && pack.has_free_session && (
                            <span className="sw-course-badge preview">
                              <Play size={11} /> Free Preview
                            </span>
                          )}
                          {pack.visibility === 'private' && (
                            <span className="sw-course-badge private">
                              <Lock size={11} /> Invite / Promo Only
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="sw-course-body">
                        <span className="sw-course-cat">
                          {pack.category || (isMulti ? 'Multi-Batch Program' : 'Live Course')}
                        </span>
                        <h3 className="sw-course-title">{pack.title}</h3>
                        <p className="sw-course-desc">
                          {pack.description || 'Structured live and recorded sessions with full mentor guidance.'}
                        </p>

                        <div className="sw-course-meta">
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <Video size={14} /> {sessionCount} session{sessionCount !== 1 ? 's' : ''}
                          </span>
                          <span>·</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <Users size={14} /> {studentCount} enrolled
                          </span>
                        </div>

                        <div className="sw-course-foot">
                          <div>
                            {pack.visibility === 'private' ? (
                              <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg">
                                🔒 Secret Link / Promo
                              </span>
                            ) : isMulti ? (
                              <span className="sw-course-price">
                                {minSubPrice !== null
                                  ? `From ${pack.currency} ${minSubPrice.toLocaleString()}`
                                  : 'View Batches'}
                              </span>
                            ) : isFree ? (
                              <span className="sw-course-price is-free">FREE</span>
                            ) : (
                              <span className="sw-course-price">
                                {pack.currency} {Number(pack.price || 0).toLocaleString()}
                              </span>
                            )}
                          </div>

                          <span className="sw-course-cta">
                            {isMulti ? 'View Batches' : 'Enroll Now'} <ArrowRight size={14} />
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* SECTION 2: About the Academy & Community */}
          <section id="about">
            <div className="sw-about-card">
              <div className="sw-about-avatar">
                {config.logo_url || profile?.avatar_url ? (
                  <img src={config.logo_url || profile?.avatar_url} alt={fullName} />
                ) : (
                  <span>{initials}</span>
                )}
              </div>

              <div>
                <span className="sw-section-kicker">
                  <Award size={12} /> MEET YOUR INSTRUCTOR &amp; ACADEMY
                </span>
                <h2 className="sw-section-title">{config.about_title || `About ${config.academy_name}`}</h2>
                <p className="sw-about-bio">{config.about_description}</p>

                <div className="sw-social-pills">
                  {waChatUrl && (
                    <a
                      href={waChatUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sw-social-btn"
                    >
                      <MessageCircle size={16} color="#059669" />
                      <span>Chat on WhatsApp</span>
                    </a>
                  )}
                  {config.whatsapp_number && (
                    <a href={`tel:${config.whatsapp_number}`} className="sw-social-btn">
                      <Phone size={15} color="#2563eb" />
                      <span>Call {config.whatsapp_number}</span>
                    </a>
                  )}
                  {config.whatsapp_group && (
                    <a
                      href={config.whatsapp_group}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sw-social-btn"
                    >
                      <Users size={16} color="#16a34a" />
                      <span>Join WhatsApp Community</span>
                    </a>
                  )}
                  {config.telegram_link && (
                    <a
                      href={config.telegram_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sw-social-btn"
                    >
                      <Send size={15} color="#0284c7" />
                      <span>Telegram Channel</span>
                    </a>
                  )}
                  {config.youtube_channel && (
                    <a
                      href={config.youtube_channel}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sw-social-btn"
                    >
                      <PlayCircle size={16} color="#dc2626" />
                      <span>YouTube Channel</span>
                    </a>
                  )}
                  {config.facebook_page && (
                    <a
                      href={config.facebook_page}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sw-social-btn"
                    >
                      <Globe size={15} color="#1d4ed8" />
                      <span>Facebook Page</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Academy Footer */}
        <footer className="sw-footer">
          <div className="sw-footer-inner">
            <div>
              <b style={{ color: '#ffffff' }}>{config.academy_name}</b> · © {new Date().getFullYear()} All rights reserved.
            </div>

            {!config.hide_lora_badge && (
              <Link to="/" className="sw-powered-badge">
                <Sparkles size={12} className="text-blue-400" />
                <span>Powered by LoraSpace Academy Engine</span>
              </Link>
            )}
          </div>
        </footer>
      </div>
    </PageTransition>
  );
}
