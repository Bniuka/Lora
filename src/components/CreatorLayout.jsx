import { NavLink, useNavigate, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import {
  LayoutDashboard, Package, PlusCircle, CreditCard,
  Settings, LogOut, Menu, X, Bell, Search, ChevronDown, Rocket, ChevronRight
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const navItems = [
  { to: '/creator/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/creator/packs', icon: Package, label: 'My Packs' },
  { to: '/creator/packs/new', icon: PlusCircle, label: 'Create Pack' },
  { to: '/creator/enrollments', icon: CreditCard, label: 'Enrollments' },
  { to: '/creator/settings', icon: Settings, label: 'Settings' },
];

/* ─────────────── Logo mark SVG (triangle) ─────────────── */
function LogoMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <polygon points="10,2 18,17 2,17" fill="white" />
    </svg>
  );
}

export default function CreatorLayout({ children }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const initials = `${profile?.first_name?.[0] ?? 'U'}${profile?.last_name?.[0] ?? ''}`.toUpperCase();
  const fullName = `${profile?.first_name ?? 'Creator'} ${profile?.last_name ?? ''}`.trim();

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="min-h-screen flex bg-[#F1F5F9]">

      {/* ── Mobile backdrop ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40 lg:hidden backdrop-blur-sm"
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
        style={{ width: '260px', minWidth: '260px', flexShrink: 0 }}
      >
        {/* ── Logo ── */}
        <div className="flex items-center justify-between px-6 pt-7 pb-6">
          <Link to="/creator/dashboard" className="flex items-center gap-2.5 group">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform"
              style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)' }}
            >
              <LogoMark />
            </div>
            <span className="text-[22px] font-extrabold tracking-tight text-[#0F172A]">
              Lora
            </span>
          </Link>
          <button className="lg:hidden text-[#94A3B8] hover:text-[#0F172A]" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* ── Nav ── */}
        <nav className="flex-1 px-3 overflow-y-auto">
          <div className="space-y-0.5">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/creator/dashboard'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-medium transition-all duration-150 group
                  ${isActive
                    ? 'bg-[#EFF6FF] text-[#1D4ED8] font-semibold'
                    : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E293B]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                      isActive ? 'bg-[#DBEAFE] text-[#1D4ED8]' : 'text-[#94A3B8] group-hover:text-[#64748B]'
                    }`}>
                      <Icon size={17} />
                    </span>
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* ── Promo card ── */}
        <div className="mx-3 mb-4">
          <div
            className="rounded-2xl p-4 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)', border: '1px solid #BFDBFE' }}
          >
            {/* decorative blob */}
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-blue-200/40 blur-xl" />
            <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center mb-3">
              <Rocket size={16} className="text-[#2563EB]" />
            </div>
            <p className="text-[13px] font-bold text-[#0F172A] mb-1">Grow Your Audience</p>
            <p className="text-[11.5px] text-[#475569] leading-relaxed mb-3">
              Share your courses with the world and make a bigger impact.
            </p>
            <button className="w-full py-2 rounded-lg text-[12px] font-semibold text-white transition-colors flex items-center justify-center gap-1.5"
              style={{ background: '#0F172A' }}
              onMouseEnter={e => e.currentTarget.style.background = '#1E293B'}
              onMouseLeave={e => e.currentTarget.style.background = '#0F172A'}
            >
              View Tips <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* ── Profile footer ── */}
        <div className="px-3 pb-5">
          <div
            className="flex items-center gap-3 px-3 py-3 rounded-xl border border-[#E8EDF3] bg-[#FAFBFC] cursor-pointer hover:border-[#CBD5E1] transition-colors group"
            onClick={handleSignOut}
            title="Sign out"
          >
            <div className="w-8 h-8 rounded-full bg-[#1E293B] flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#0F172A] truncate group-hover:text-[#2563EB] transition-colors">{fullName}</p>
              <p className="text-[11px] text-[#94A3B8] truncate">{profile?.email}</p>
            </div>
            <ChevronRight size={14} className="text-[#CBD5E1] flex-shrink-0" />
          </div>
        </div>
      </aside>

      {/* ══════════════ MAIN COLUMN ══════════════ */}
      <div className="flex-1 min-w-0 flex flex-col" style={{ height: '100vh', overflow: 'hidden' }}>

        {/* ── Top header ── */}
        <header className="flex-shrink-0 h-16 bg-white border-b border-[#E8EDF3] flex items-center justify-between px-6 z-30" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {/* Left: mobile burger + search */}
          <div className="flex items-center gap-4 flex-1">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-[#64748B] hover:text-[#0F172A] mr-1">
              <Menu size={20} />
            </button>

            {/* Search pill */}
            <div className="hidden md:flex items-center gap-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-full px-4 py-2 w-full max-w-md focus-within:border-[#3B82F6] focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <Search size={15} className="text-[#94A3B8] flex-shrink-0" />
              <input
                type="text"
                placeholder="Search anything... (courses, packs, students, etc.)"
                className="bg-transparent border-none focus:outline-none text-[13px] w-full text-[#0F172A] placeholder:text-[#94A3B8]"
              />
              <div className="flex items-center gap-0.5 bg-white border border-[#E2E8F0] rounded px-1.5 py-0.5 flex-shrink-0">
                <span className="text-[10px] font-semibold text-[#94A3B8]">Ctrl</span>
                <span className="text-[10px] font-semibold text-[#94A3B8] ml-0.5">K</span>
              </div>
            </div>
          </div>

          {/* Right: bell + profile */}
          <div className="flex items-center gap-4 ml-4">
            <button className="relative text-[#64748B] hover:text-[#0F172A] transition-colors">
              <Bell size={19} />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border-[1.5px] border-white" />
            </button>

            <div className="hidden sm:block w-px h-6 bg-[#E2E8F0]" />

            <div className="flex items-center gap-2.5 cursor-pointer group">
              <div className="w-8 h-8 rounded-full bg-[#1E293B] flex items-center justify-center text-white text-[11px] font-bold">
                {initials}
              </div>
              <div className="hidden sm:block">
                <p className="text-[13px] font-semibold text-[#0F172A] leading-tight">{fullName}</p>
                <p className="text-[11px] text-[#94A3B8] leading-tight">Creator</p>
              </div>
              <ChevronDown size={14} className="text-[#94A3B8] hidden sm:block group-hover:text-[#0F172A] transition-colors" />
            </div>
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1360px] mx-auto px-6 py-7">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
