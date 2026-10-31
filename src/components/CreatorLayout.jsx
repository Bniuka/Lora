import { NavLink, useNavigate, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Package, PlusCircle, Layers, CreditCard,
  Settings, Menu, X, Bell, Search, ChevronDown, Rocket, ChevronRight,
  CheckCircle, Clock, Loader2, LogOut, Crown
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { isUserAdmin } from '../lib/admin';
import AppLogo from './AppLogo';
import './creator-layout.css';

const navItems = [
  { to: '/creator/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/creator/packs', icon: Package, label: 'My Packs' },
  { to: '/creator/packs/new', icon: PlusCircle, label: 'Create Pack' },
  { to: '/creator/multi-packs/new', icon: Layers, label: 'Create Multi-Pack' },
  { to: '/creator/enrollments', icon: CreditCard, label: 'Enrollments' },
  { to: '/creator/settings', icon: Settings, label: 'Settings' },
];

function LogoMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
      <polygon points="10,2 18,17 2,17" fill="white" />
    </svg>
  );
}

/* ── Notification Panel ── */
function NotificationPanel({ userId, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifications(data || []);
    setLoading(false);
  };

  const markAllRead = async () => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const markOneRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  useEffect(() => { if (userId) fetchNotifications(); }, [userId]);

  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className="absolute right-0 top-full mt-4 z-50"
      style={{ width: 400 }}
    >
      <div
        className="bg-white rounded-3xl overflow-hidden"
        style={{
          border: '1px solid #E8EDF3',
          boxShadow: '0 12px 48px rgba(0,0,0,0.12)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-3">
            <p className="text-[15px] font-bold text-[#0F172A]">Notifications</p>
            {unread > 0 && (
              <span className="bg-[#2563EB] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                {unread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-[13px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
              >
                Mark all read
              </button>
            )}
            <button onClick={onClose} className="text-[#94A3B8] hover:text-[#0F172A] p-1 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto" style={{ maxHeight: 420 }}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-[#94A3B8]" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <div className="w-14 h-14 rounded-full bg-[#F1F5F9] flex items-center justify-center mb-4">
                <Bell size={24} className="text-[#94A3B8]" />
              </div>
              <p className="text-[15px] font-semibold text-[#0F172A] mb-2">No notifications yet</p>
              <p className="text-[13px] text-[#94A3B8] leading-relaxed">You'll be notified about enrollment activity here.</p>
            </div>
          ) : (
            <div>
              {notifications.map((n, i) => (
                <button
                  key={n.id}
                  onClick={() => markOneRead(n.id)}
                  className={`w-full text-left flex gap-4 px-6 py-5 transition-colors hover:bg-[#F8FAFC] ${
                    i < notifications.length - 1 ? 'border-b border-[#F8FAFC]' : ''
                  }`}
                >
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                    style={{ background: n.is_read ? '#F1F5F9' : '#DCFCE7' }}
                  >
                    <CheckCircle size={18} color={n.is_read ? '#94A3B8' : '#16A34A'} />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className={`text-[14px] leading-relaxed ${n.is_read ? 'font-medium text-[#475569]' : 'font-semibold text-[#0F172A]'}`}>
                        {n.title}
                      </p>
                      {!n.is_read && (
                        <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-[13px] text-[#64748B] mt-1.5 leading-relaxed">
                      {n.message}
                    </p>
                    <p className="text-[12px] text-[#94A3B8] mt-2.5 flex items-center gap-1.5 font-medium">
                      <Clock size={12} />
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-6 py-4 border-t border-[#F1F5F9] bg-[#FAFBFC]">
            <p className="text-[12px] text-[#94A3B8] text-center font-medium">
              Showing last {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ════════════════ LAYOUT ════════════════ */
export default function CreatorLayout({ children }) {
  const { profile, signOut, user } = useAuth();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);

  /* fetch unread count */
  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      setUnreadCount(count || 0);
    };
    fetchUnread();

    /* realtime subscription */
    const channel = supabase
      .channel('creator-notif')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, fetchUnread)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user]);

  /* close panel on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* Ctrl+K search hotkey */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('creator-gsearch')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  /* reset unread badge when panel opened */
  const handleBellClick = () => {
    setNotifOpen(prev => !prev);
    if (!notifOpen && unreadCount > 0) setUnreadCount(0);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/creator/enrollments?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const initials = `${profile?.first_name?.[0] ?? 'U'}${profile?.last_name?.[0] ?? ''}`.toUpperCase();
  const fullName = `${profile?.first_name ?? 'Creator'} ${profile?.last_name ?? ''}`.trim();

  return (
    <div className="lora-creator">
      <div className="app">
        {/* ══════════════ SIDEBAR ══════════════ */}
        <aside>
          <div className="logo">
            <AppLogo role="creator" to="/creator/dashboard" height={52} />
          </div>
          <nav>
            <NavLink to="/creator/dashboard" end className={({ isActive }) => isActive ? 'on' : ''}>
              <svg className="ic" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/creator/packs" end className={({ isActive }) => isActive ? 'on' : ''}>
              <svg className="ic" viewBox="0 0 24 24"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>
              <span>My Packs</span>
            </NavLink>
            <NavLink to="/creator/packs/new" className={({ isActive }) => isActive ? 'on' : ''}>
              <svg className="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>
              <span>Create Pack</span>
            </NavLink>
            <NavLink to="/creator/multi-packs/new" className={({ isActive }) => isActive ? 'on' : ''}>
              <svg className="ic" viewBox="0 0 24 24"><path d="m12 2 9 4.5-9 4.5-9-4.5z"/><path d="m3 12 9 4.5 9-4.5"/><path d="m3 17.5 9 4.5 9-4.5"/></svg>
              <span>Create Multi-Pack</span>
            </NavLink>
            <NavLink to="/creator/enrollments" className={({ isActive }) => isActive ? 'on' : ''}>
              <svg className="ic" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg>
              <span>Enrollments</span>
            </NavLink>
            <NavLink to="/creator/settings" className={({ isActive }) => isActive ? 'on' : ''}>
              <svg className="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>
              <span>Settings</span>
            </NavLink>
            <NavLink to="/creator/guide" className={({ isActive }) => isActive ? 'on' : ''}>
              <svg className="ic" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              <span>Creator Guide</span>
            </NavLink>
            {isUserAdmin(user?.email) && (
              <NavLink to="/creator/admin" className={({ isActive }) => isActive ? 'on' : ''}>
                <Crown className="ic" style={{ color: '#f59e0b' }} />
                <span style={{ color: '#d97706', fontWeight: 700 }}>Founder Panel</span>
              </NavLink>
            )}
          </nav>
          <div className="tip">
            <b>New to LoraSpace?</b>
            Discover all creator features, promo codes, and setup steps.
            <button type="button" onClick={() => navigate('/creator/guide')}>Open Creator Guide</button>
          </div>
        </aside>

        {/* ══════════════ MAIN COLUMN ══════════════ */}
        <main>
          {/* Top Header */}
          <div className="top">
            <form onSubmit={handleSearch} className="gsearch" style={{ margin: 0 }}>
              <svg className="ic" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
              <input
                id="creator-gsearch"
                placeholder="Search courses, packs, students…"
                aria-label="Search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <kbd>Ctrl K</kbd>
            </form>

            <div className="who">
              {/* Bell with dropdown panel */}
              <div className="relative" ref={notifRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="bell"
                  aria-label="Notifications"
                  onClick={handleBellClick}
                >
                  <svg className="ic" viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 21h4"/></svg>
                  {unreadCount > 0 && (
                    <span className="unread-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  )}
                </button>

                <AnimatePresence>
                  {notifOpen && user && (
                    <NotificationPanel userId={user.id} onClose={() => setNotifOpen(false)} />
                  )}
                </AnimatePresence>
              </div>

              {/* Profile dropdown */}
              <div className="relative" ref={userMenuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  className="av"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  title="Profile menu"
                >
                  {initials}
                </div>
                <div onClick={() => setUserDropdownOpen(!userDropdownOpen)} style={{ cursor: 'pointer' }}>
                  <b>{fullName}</b>
                  <small>Creator</small>
                </div>

                {userDropdownOpen && (
                  <div className="user-dropdown">
                    {isUserAdmin(user?.email) && (
                      <button type="button" onClick={() => { setUserDropdownOpen(false); navigate('/creator/admin'); }} style={{ color: '#d97706', fontWeight: 600 }}>
                        <Crown size={15} style={{ color: '#f59e0b' }} /> Founder Panel
                      </button>
                    )}
                    <button type="button" onClick={() => { setUserDropdownOpen(false); navigate('/creator/settings'); }}>
                      <Settings size={15} /> Settings
                    </button>
                    <button type="button" className="danger" onClick={handleSignOut}>
                      <LogOut size={15} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Page Content */}
          <div style={{ minWidth: 0, flex: 1 }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
