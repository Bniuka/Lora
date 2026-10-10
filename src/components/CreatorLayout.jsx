import { NavLink, useNavigate, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Package, PlusCircle, CreditCard,
  Settings, Menu, X, Bell, Search, ChevronDown, Rocket, ChevronRight,
  CheckCircle, Clock, Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

const navItems = [
  { to: '/creator/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/creator/packs', icon: Package, label: 'My Packs' },
  { to: '/creator/packs/new', icon: PlusCircle, label: 'Create Pack' },
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);

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
    };
    if (notifOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notifOpen]);

  /* reset unread badge when panel opened */
  const handleBellClick = () => {
    setNotifOpen(prev => !prev);
    if (!notifOpen && unreadCount > 0) setUnreadCount(0);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const initials = `${profile?.first_name?.[0] ?? 'U'}${profile?.last_name?.[0] ?? ''}`.toUpperCase();
  const fullName = `${profile?.first_name ?? 'Creator'} ${profile?.last_name ?? ''}`.trim();

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="min-h-screen flex bg-[#F1F5F9]">

      {/* Mobile backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ══════════════ SIDEBAR ══════════════ */}
      <aside
        className={`
          fixed lg:static top-0 left-0 h-screen z-50
          flex flex-col bg-white border-r border-[#E8EDF3]
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ width: '300px', minWidth: '300px', flexShrink: 0 }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-8 pt-10 pb-8">
          <Link to="/creator/dashboard" className="flex items-center gap-3.5 group">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform"
              style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)' }}
            >
              <LogoMark />
            </div>
            <span className="text-[26px] font-extrabold tracking-tight text-[#0F172A]">Lora</span>
          </Link>
          <button className="lg:hidden text-[#94A3B8] hover:text-[#0F172A] p-2" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-5 overflow-y-auto mt-2">
          <div className="space-y-2">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/creator/dashboard'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-4 px-4 py-4 rounded-2xl text-[15px] font-semibold transition-all duration-200 group
                  ${isActive
                    ? 'bg-[#EFF6FF] text-[#1D4ED8]'
                    : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E293B]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`flex items-center justify-center w-10 h-10 rounded-xl transition-colors ${
                      isActive ? 'bg-[#DBEAFE] text-[#1D4ED8]' : 'text-[#94A3B8] group-hover:text-[#64748B]'
                    }`}>
                      <Icon size={20} />
                    </span>
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Promo card */}
        <div className="mx-5 mb-6 mt-8">
          <div
            className="rounded-3xl p-6 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)', border: '1px solid #BFDBFE' }}
          >
            <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-blue-200/40 blur-2xl" />
            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4">
              <Rocket size={18} className="text-[#2563EB]" />
            </div>
            <p className="text-[15px] font-bold text-[#0F172A] mb-2">Grow Your Audience</p>
            <p className="text-[13px] text-[#475569] leading-relaxed mb-5">
              Share your courses with the world and make a bigger impact.
            </p>
            <button
              className="w-full py-3 rounded-xl text-[13.5px] font-bold text-white transition-colors flex items-center justify-center gap-2 shadow-md"
              style={{ background: '#0F172A' }}
            >
              View Tips <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* Profile footer */}
        <div className="px-5 pb-8">
          <div
            className="flex items-center gap-4 px-4 py-4 rounded-2xl border border-[#E8EDF3] bg-white cursor-pointer hover:border-[#CBD5E1] transition-all group shadow-sm hover:shadow-md"
            onClick={handleSignOut}
            title="Sign out"
          >
            <div className="w-10 h-10 rounded-full bg-[#1E293B] flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0 shadow-inner">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-[#0F172A] truncate group-hover:text-[#2563EB] transition-colors">{fullName}</p>
              <p className="text-[12px] text-[#94A3B8] mt-0.5 truncate">{profile?.email}</p>
            </div>
            <ChevronRight size={16} className="text-[#CBD5E1] flex-shrink-0 group-hover:text-[#94A3B8] transition-colors" />
          </div>
        </div>
      </aside>

      {/* ══════════════ MAIN COLUMN ══════════════ */}
      <div className="flex-1 min-w-0 flex flex-col" style={{ height: '100vh', overflow: 'hidden' }}>

        {/* Top header */}
        <header
          className="flex-shrink-0 h-20 bg-white border-b border-[#E8EDF3] flex items-center justify-between px-10 z-30"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}
        >
          {/* Left: burger + search */}
          <div className="flex items-center gap-6 flex-1">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-[#64748B] hover:text-[#0F172A] p-2 -ml-2">
              <Menu size={24} />
            </button>
            <div className="hidden md:flex items-center gap-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-full px-5 py-3 w-full max-w-lg focus-within:border-[#3B82F6] focus-within:ring-4 focus-within:ring-blue-50 transition-all">
              <Search size={18} className="text-[#94A3B8] flex-shrink-0" />
              <input
                type="text"
                placeholder="Search anything... (courses, packs, students, etc.)"
                className="bg-transparent border-none focus:outline-none text-[14px] w-full text-[#0F172A] placeholder:text-[#94A3B8]"
              />
              <div className="flex items-center gap-1 bg-white border border-[#E2E8F0] rounded-md px-2 py-1 flex-shrink-0 shadow-sm">
                <span className="text-[11px] font-bold text-[#94A3B8]">Ctrl</span>
                <span className="text-[11px] font-bold text-[#94A3B8]">K</span>
              </div>
            </div>
          </div>

          {/* Right: bell + profile */}
          <div className="flex items-center gap-6 ml-6">

            {/* Bell with dropdown panel */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={handleBellClick}
                className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                  notifOpen ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                }`}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1.5 border-2 border-white shadow-sm">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notifOpen && user && (
                  <NotificationPanel userId={user.id} onClose={() => setNotifOpen(false)} />
                )}
              </AnimatePresence>
            </div>

            <div className="hidden sm:block w-[1.5px] h-8 bg-[#E2E8F0]" />

            {/* Profile chip */}
            <div className="flex items-center gap-3.5 cursor-pointer group p-1.5 rounded-2xl hover:bg-[#F8FAFC] transition-colors">
              <div className="w-10 h-10 rounded-full bg-[#1E293B] flex items-center justify-center text-white text-[13px] font-bold shadow-sm">
                {initials}
              </div>
              <div className="hidden sm:block">
                <p className="text-[14px] font-bold text-[#0F172A] leading-tight mb-0.5">{fullName}</p>
                <p className="text-[12px] font-medium text-[#64748B] leading-tight">Creator</p>
              </div>
              <ChevronDown size={16} className="text-[#94A3B8] hidden sm:block group-hover:text-[#0F172A] transition-colors ml-1" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto px-10 py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
