import { NavLink, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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

export default function CreatorLayout({ children }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdown, setProfileDropdown] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen w-[280px] z-50
        bg-white border-r border-[#E2E8F0] flex flex-col
        transition-transform duration-300 ease-in-out shadow-sm
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between px-8 py-7">
          <Link to="/creator/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <div className="w-0 h-0 border-l-[10px] border-l-transparent border-b-[16px] border-b-white border-r-[10px] border-r-transparent rounded-sm transform rotate-45" />
            </div>
            <span className="text-2xl font-black text-[#0F172A] tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              Lora
            </span>
          </Link>
          <button className="lg:hidden text-[#94A6B8] hover:text-[#0F172A]" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-4 px-4 overflow-y-auto space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/creator/dashboard'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-bold
                  transition-all duration-300 group
                  ${isActive
                    ? 'bg-[#EFF6FF] text-[#1D4ED8] shadow-[0_0_0_1px_rgba(37,99,235,0.1)]'
                    : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    <Icon size={20} className={isActive ? "text-[#2563EB]" : "text-[#94A6B8] group-hover:text-[#64748B]"} />
                    {item.label}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Grow Audience Card */}
        <div className="px-6 py-4">
          <div className="bg-gradient-to-br from-[#EFF6FF] to-white p-5 rounded-[24px] border border-[#DBEAFE] shadow-sm relative overflow-hidden">
            <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-[#E2E8F0] flex items-center justify-center mb-4 relative z-10">
              <Rocket size={20} className="text-[#2563EB]" />
            </div>
            <h4 className="text-sm font-bold text-[#0F172A] mb-1.5 relative z-10">Grow Your Audience</h4>
            <p className="text-xs text-[#64748B] leading-relaxed mb-4 relative z-10">Share your courses with the world and make a bigger impact.</p>
            <button className="w-full py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 relative z-10">
              View Tips <ChevronRight size={14} />
            </button>
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-[#2563EB]/10 rounded-full blur-2xl" />
          </div>
        </div>

        {/* User section */}
        <div className="p-4 mx-4 mb-6 mt-2 rounded-[20px] border border-[#E2E8F0] hover:border-[#CBD5E1] transition-colors cursor-pointer group flex items-center justify-between bg-white shadow-sm" onClick={handleSignOut}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1E293B] to-[#0F172A] flex items-center justify-center text-white text-sm font-bold shadow-md">
              {profile?.first_name?.[0] || 'U'}{profile?.last_name?.[0] || ''}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#0F172A] truncate group-hover:text-[#2563EB] transition-colors">
                {profile?.first_name || 'Creator'} {profile?.last_name}
              </p>
              <p className="text-[11px] text-[#64748B] truncate mt-0.5">{profile?.email || 'email@example.com'}</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-[#94A6B8] group-hover:text-[#0F172A] transition-colors" />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-8 sticky top-0 z-30 shadow-sm/50">
          <div className="flex items-center gap-4 flex-1">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-[#475569] hover:text-[#0F172A]">
              <Menu size={22} />
            </button>
            
            <div className="hidden md:flex items-center gap-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-full px-5 py-2.5 w-full max-w-lg focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-[#DBEAFE] focus-within:bg-white transition-all shadow-inner">
              <Search size={18} className="text-[#94A6B8]" />
              <input 
                type="text" 
                placeholder="Search anything... (courses, packs, students, etc.)"
                className="bg-transparent border-none focus:outline-none text-sm w-full text-[#0F172A] placeholder:text-[#94A6B8]"
              />
              <div className="flex items-center gap-1 bg-white border border-[#E2E8F0] rounded-md px-2 py-1 shadow-sm shrink-0">
                <span className="text-[10px] font-bold text-[#64748B]">Ctrl</span>
                <span className="text-[10px] font-bold text-[#64748B]">K</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button className="relative text-[#64748B] hover:text-[#0F172A] transition-colors">
              <Bell size={20} />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#EF4444] rounded-full border-2 border-white" />
            </button>
            <div className="hidden sm:block w-px h-8 bg-[#E2E8F0]" />
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setProfileDropdown(!profileDropdown)}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1E293B] to-[#0F172A] flex items-center justify-center text-white text-sm font-bold shadow-md group-hover:shadow-lg transition-shadow">
                {profile?.first_name?.[0] || 'U'}{profile?.last_name?.[0] || ''}
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-sm font-bold text-[#0F172A]">{profile?.first_name || 'Creator'} {profile?.last_name}</p>
                <p className="text-[11px] text-[#64748B] font-bold uppercase tracking-widest mt-0.5">Creator</p>
              </div>
              <ChevronDown size={16} className="text-[#94A6B8] hidden sm:block group-hover:text-[#0F172A] transition-colors" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-10 pb-24">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
