import { NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { User, LogOut, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import AppLogo from './AppLogo';
import '../pages/learner-dashboard.css';

export default function LearnerLayout({ children }) {
  const { profile, signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const userMenuRef = useRef(null);
  const notifRef = useRef(null);

  const isDashboard = location.pathname === '/learner/dashboard';

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
  }, [user]);

  useEffect(() => {
    if (!user || !notifOpen) return;
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setNotifications(data || []);
    };
    fetchNotifications();
  }, [user, notifOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/learner/discover?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const initials =
    ((profile?.first_name?.[0] || 'L') + (profile?.last_name?.[0] || '')).toUpperCase();

  return (
    <div className="min-h-screen bg-[#f4f6fb]">
      {/* Redesigned Learner Top Bar */}
      <div className="lora-learner">
        <header>
          <div className="bar">
            {/* Logo */}
            <div className="logo">
              <AppLogo role="learner" to="/learner/dashboard" height={52} />
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearch} className="search">
              <svg className="ic" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses, creators…"
                aria-label="Search courses and creators"
              />
            </form>

            {/* Links and Actions */}
            <nav className="links">
              <NavLink
                to="/learner/dashboard"
                end
                className={({ isActive }) => (isActive ? 'on' : '')}
              >
                My courses
              </NavLink>
              <NavLink
                to="/learner/discover"
                className={({ isActive }) => (isActive ? 'on' : '')}
              >
                Discover
              </NavLink>

              {/* Notification Bell */}
              <div className="relative" ref={notifRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  className={`bell ${unreadCount > 0 ? 'has' : ''}`}
                  id="bell"
                  aria-label="Notifications"
                  onClick={() => {
                    setNotifOpen(!notifOpen);
                    setUserMenuOpen(false);
                  }}
                >
                  <svg className="ic" viewBox="0 0 24 24">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 21h4" />
                  </svg>
                </button>

                {notifOpen && (
                  <div className="dropdown" style={{ width: '300px', right: 0 }}>
                    <div
                      className="dropdown-header"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span className="dropdown-name">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllRead}
                          style={{
                            fontSize: '11px',
                            color: 'var(--brand)',
                            background: 'none',
                            border: '0',
                            cursor: 'pointer',
                            fontWeight: 600,
                            padding: 0,
                          }}
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div
                        style={{
                          padding: '20px 12px',
                          textAlign: 'center',
                          color: 'var(--muted)',
                          fontSize: '13px',
                        }}
                      >
                        No notifications yet
                      </div>
                    ) : (
                      <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                        {notifications.map((n) => (
                          <div
                            key={n.id}
                            style={{
                              padding: '8px 10px',
                              borderRadius: '8px',
                              background: n.is_read ? 'transparent' : 'var(--brand-soft)',
                              marginBottom: '4px',
                              fontSize: '12px',
                            }}
                          >
                            <p
                              style={{
                                margin: '0 0 2px',
                                fontWeight: n.is_read ? 500 : 700,
                                color: 'var(--ink)',
                              }}
                            >
                              {n.title || n.message}
                            </p>
                            {n.title && (
                              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '11px' }}>
                                {n.message}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Avatar & User Dropdown */}
              <div className="relative" ref={userMenuRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="av"
                  title="Profile"
                  onClick={() => {
                    setUserMenuOpen(!userMenuOpen);
                    setNotifOpen(false);
                  }}
                >
                  {initials}
                </button>

                {userMenuOpen && (
                  <div className="dropdown">
                    <div className="dropdown-header">
                      <div className="dropdown-name">
                        {profile?.first_name} {profile?.last_name}
                      </div>
                      <div className="dropdown-email">{profile?.email || user?.email}</div>
                    </div>
                    <Link
                      to="/learner/dashboard"
                      className="dropdown-item"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User size={15} /> My dashboard
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="dropdown-item danger"
                    >
                      <LogOut size={15} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </nav>
          </div>
        </header>
      </div>

      {/* Main Content Area */}
      {isDashboard || location.pathname.includes('/sessions') ? (
        children
      ) : (
        <main className="max-w-7xl mx-auto px-6 md:px-10 py-8 lg:py-12">
          {children}
        </main>
      )}
    </div>
  );
}
