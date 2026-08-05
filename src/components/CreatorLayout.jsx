import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  LayoutDashboard, Package, PlusCircle, CreditCard,
  Settings, LogOut, Menu, X, Bell
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen w-64 z-50
        bg-white border-r border-[#E2E8F0] flex flex-col
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-6 border-b border-[#E2E8F0]">
          <span className="text-2xl font-bold text-[#2563EB]" style={{ fontFamily: 'var(--font-heading)' }}>
            Lora
          </span>
          <button
            className="lg:hidden text-[#94A6B8] hover:text-[#0F172A]"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-6 px-3 overflow-y-auto">
          <p className="text-xs uppercase tracking-widest text-[#94A6B8] font-semibold px-3 mb-3">
            Menu
          </p>
          <div className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/creator/dashboard'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                  transition-all duration-200
                  ${isActive
                    ? 'bg-[#DBEAFE] text-[#1D4ED8] font-semibold'
                    : 'text-[#475569] hover:bg-[#DBEAFE]/50 hover:text-[#2563EB]'
                  }
                `}
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* User section */}
        <div className="border-t border-[#E2E8F0] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-sm font-bold">
              {profile?.first_name?.[0]}{profile?.last_name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#0F172A] truncate">
                {profile?.first_name} {profile?.last_name}
              </p>
              <p className="text-xs text-[#94A6B8] truncate mt-0.5">{profile?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 text-sm text-[#94A6B8] hover:text-[#C0392B] transition-colors w-full px-2 py-1"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-[#475569] hover:text-[#0F172A]"
          >
            <Menu size={22} />
          </button>
          <span className="text-lg font-bold text-[#2563EB]" style={{ fontFamily: 'var(--font-heading)' }}>
            Lora
          </span>
          <div className="w-8" />
        </header>

        <main className="p-8 lg:p-12 max-w-6xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
