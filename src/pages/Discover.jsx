import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Filter, Package, Sparkles, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageTransition, GoldBadge, Skeleton, EmptyState, ToggleSwitch, ShareMenu } from '../components/ui';

const CATEGORIES = ['All', 'Technology', 'Design', 'Business', 'Language', 'Music', 'Fitness', 'Other'];

export default function Discover() {
  const [searchParams] = useSearchParams();
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState('All');
  const [hasFreeSession, setHasFreeSession] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const fetchPacks = async () => {
    setLoading(true);
    let q = supabase
      .from('session_packs')
      .select('*, creator_profiles(id, profiles(first_name, last_name)), enrollments(count)')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (query.trim()) {
      q = q.or(`title.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`);
    }
    if (category !== 'All') q = q.eq('category', category);
    if (hasFreeSession) q = q.eq('has_free_session', true);

    const { data } = await q;
    setPacks(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPacks(); }, [query, category, hasFreeSession]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPacks();
  };

  return (
    <PageTransition>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] mb-8" style={{ fontFamily: 'var(--font-heading)' }}>
          Discover Courses
        </h1>

        {/* Search + Filter bar */}
        <div className="flex flex-col sm:flex-row gap-5 mb-10 z-10 relative">
          <form onSubmit={handleSearch} className="relative flex-1 group">
            {/* Cinematic Light Decoration */}
            <div className="absolute -inset-1 bg-gradient-to-r from-[#2563EB] via-[#93C5FD] to-[#3B82F6] rounded-[20px] blur-lg opacity-30 group-focus-within:opacity-70 group-hover:opacity-50 transition duration-700"></div>
            
            <div className="relative flex items-center bg-white rounded-2xl border border-[#E2E8F0] focus-within:border-transparent focus-within:ring-2 focus-within:ring-[#2563EB] transition-all shadow-lg overflow-hidden h-[60px]">
              <div className="pl-5 pr-3">
                <Search size={22} className="text-[#2563EB]" />
              </div>
              <input
                className="w-full h-full text-base sm:text-lg text-[#0F172A] placeholder-[#94A6B8] focus:outline-none bg-transparent"
                placeholder="Search courses, topics, creators..."
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              <button type="submit" className="mr-2 px-6 py-2.5 bg-[#2563EB] text-white rounded-xl font-medium text-sm hover:bg-[#1D4ED8] transition-all shadow-lg shadow-[#2563EB]/40 flex items-center gap-2">
                Search
              </button>
            </div>
          </form>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative h-[60px] px-6 sm:px-8 rounded-2xl font-medium flex items-center gap-2 transition-all shadow-lg overflow-hidden group ${
              showFilters 
                ? 'text-[#2563EB] border-2 border-[#2563EB] bg-[#DBEAFE]/30' 
                : 'text-[#475569] border border-[#E2E8F0] bg-white hover:border-[#94A6B8]'
            }`}
          >
            {showFilters && <div className="absolute inset-0 bg-[#2563EB]/5 blur-md" />}
            <Filter size={20} className="relative z-10" /> 
            <span className="hidden sm:inline relative z-10">Filters</span>
          </button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 p-5 rounded-xl border border-[#F1F5F9] bg-white shadow-sm"
          >
            <div className="flex flex-wrap gap-5 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="form-label text-xs">Category</label>
                <select className="select-field text-sm" value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <ToggleSwitch checked={hasFreeSession} onChange={setHasFreeSession} label="Has Free Session" />
              <button onClick={() => { setCategory('All'); setHasFreeSession(false); setQuery(''); }}
                className="btn-ghost text-xs text-[#475569] border-transparent hover:bg-[#F5F5F5]"><X size={14} /> Clear</button>
            </div>
          </motion.div>
        )}

        {/* Results */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-60" />)}
          </div>
        ) : packs.length === 0 ? (
          <EmptyState icon={Package} title="No courses found" description="Try adjusting your filters or search terms." />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {packs.map((pack, i) => (
              <motion.div key={pack.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link to={`/learner/pack/${pack.id}`} className="bg-white rounded-2xl border border-[#F1F5F9] shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden block group">
                  <div className="h-40 bg-[#F8FAFC] relative overflow-hidden">
                    {pack.thumbnail_url ? (
                      <img src={pack.thumbnail_url} alt={pack.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={36} className="text-[#E2E8F0]" />
                      </div>
                    )}
                    {pack.has_free_session && (
                      <div className="absolute top-3 left-3"><GoldBadge icon={Sparkles}>Free Preview</GoldBadge></div>
                    )}
                    <div className="absolute top-3 right-3">
                      <ShareMenu url={`${window.location.origin}/learner/pack/${pack.id}`} title={pack.title} />
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-[#0F172A] mb-1 line-clamp-1">{pack.title}</h3>
                    <p className="text-xs text-[#94A6B8] mb-3">
                      {pack.creator_profiles?.profiles?.first_name} {pack.creator_profiles?.profiles?.last_name} · {pack.category}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-[#2563EB]">{pack.currency} {pack.price}</p>
                      <span className="text-xs text-[#94A6B8]">{pack.enrollments?.[0]?.count || 0} students</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
