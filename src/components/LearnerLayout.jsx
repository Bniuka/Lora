import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, LogOut, User, Menu, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

export default function LearnerLayout({ children }) {
  const { profile, signOut, user } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

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

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-[68px] flex items-center gap-6">
          {/* Logo */}
          <Link to="/learner/dashboard" className="flex-shrink-0 pl-2">
            <span className="text-2xl font-bold text-[#2563EB]" style={{ fontFamily: 'var(--font-heading)' }}>
              Lora
            </span>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="hidden sm:flex flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A6B8]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses, creators..."
                className="w-full bg-[#F5F5F5] rounded-xl px-4 py-2.5 pl-10 text-sm text-[#0F172A] placeholder:text-[#94A6B8] focus:bg-white focus:border focus:border-[#2563EB] focus:outline-none transition-all duration-200"
              />
            </div>
          </form>

          {/* Right side */}
          <div className="flex items-center gap-4 ml-auto">
            {/* Nav links - desktop */}
            <div className="hidden md:flex items-center gap-6">
              <NavLink
                to="/learner/dashboard"
                end
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${
                    isActive ? 'text-[#2563EB]' : 'text-[#475569] hover:text-[#2563EB]'
                  }`
                }
              >
                My Courses
              </NavLink>
              <NavLink
                to="/learner/discover"
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${
                    isActive ? 'text-[#2563EB]' : 'text-[#475569] hover:text-[#2563EB]'
                  }`
                }
              >
                Discover
              </NavLink>
            </div>

            {/* Notifications */}
            <button className="relative p-2 text-[#475569] hover:text-[#2563EB] transition-colors">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#2563EB] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Avatar dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-10 h-10 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-sm font-bold hover:bg-[#1D4ED8] transition-colors"
              >
                {profile?.first_name?.[0]}{profile?.last_name?.[0]}
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 bg-white border border-[#E2E8F0] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] py-2 z-50"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <div className="px-4 py-3 border-b border-[#E2E8F0] mb-1">
                      <p className="text-sm font-medium text-[#0F172A]">{profile?.first_name} {profile?.last_name}</p>
                      <p className="text-xs text-[#94A6B8] truncate mt-1">{profile?.email}</p>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#475569] hover:text-[#C0392B] hover:bg-[#F8FAFC] transition-colors"
                    >
                      <LogOut size={14} /> Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden text-[#475569] hover:text-[#0F172A]"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-[#E2E8F0] bg-white overflow-hidden"
            >
              <div className="p-5 space-y-3">
                <form onSubmit={handleSearch} className="mb-3">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A6B8]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="input-field pl-10 py-2 text-sm"
                    />
                  </div>
                </form>
                <NavLink to="/learner/dashboard" end onClick={() => setMenuOpen(false)}
                  className={({ isActive }) => `block px-3 py-2 rounded-xl text-sm font-medium ${isActive ? 'text-[#2563EB] bg-[#DBEAFE]/30' : 'text-[#475569]'}`}
                >My Courses</NavLink>
                <NavLink to="/learner/discover" onClick={() => setMenuOpen(false)}
                  className={({ isActive }) => `block px-3 py-2 rounded-xl text-sm font-medium ${isActive ? 'text-[#2563EB] bg-[#DBEAFE]/30' : 'text-[#475569]'}`}
                >Discover</NavLink>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main className="max-w-7xl mx-auto px-6 md:px-10 py-8 lg:py-12">
        {children}
      </main>
    </div>
  );
}
