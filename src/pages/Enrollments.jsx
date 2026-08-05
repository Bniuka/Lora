import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, CheckCircle, XCircle, Eye, Loader2, Clock, Copy, X } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { PageTransition, StatusBadge, Modal, Skeleton, EmptyState } from '../components/ui';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';

export default function Enrollments() {
  useSubscriptionGuard();
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [screenshotModal, setScreenshotModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(null);
  const [showBanner, setShowBanner] = useState(() => localStorage.getItem('hideRefBanner') !== 'true');

  const dismissBanner = () => {
    localStorage.setItem('hideRefBanner', 'true');
    setShowBanner(false);
  };

  const fetchEnrollments = async () => {
    const { data } = await supabase
      .from('enrollments')
      .select(`
        *,
        profiles!enrollments_learner_id_fkey(first_name, last_name, email),
        session_packs!inner(title, creator_id)
      `)
      .eq('session_packs.creator_id', user.id)
      .order('submitted_at', { ascending: false });
    setEnrollments(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchEnrollments();
  }, [user]);

  const confirmPayment = async (enrollmentId) => {
    setProcessing(enrollmentId);
    const enrollment = enrollments.find(e => e.id === enrollmentId);

    await supabase.from('enrollments').update({
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    }).eq('id', enrollmentId);

    if (enrollment) {
      await supabase.from('notifications').insert({
        user_id: enrollment.learner_id,
        title: 'Payment Confirmed! 🎉',
        message: `Your payment for "${enrollment.session_packs.title}" has been confirmed. You can now access all sessions.`,
      });
    }

    setProcessing(null);
    fetchEnrollments();
  };

  const rejectPayment = async () => {
    if (!rejectModal) return;
    setProcessing(rejectModal);
    const enrollment = enrollments.find(e => e.id === rejectModal);

    await supabase.from('enrollments').update({
      status: 'rejected',
      rejection_reason: rejectReason || null,
    }).eq('id', rejectModal);

    if (enrollment) {
      await supabase.from('notifications').insert({
        user_id: enrollment.learner_id,
        title: 'Payment Issue',
        message: `Your payment for "${enrollment.session_packs.title}" was rejected. Reason: ${rejectReason || 'None given'}. Please try again.`,
      });
    }

    setRejectModal(null);
    setRejectReason('');
    setProcessing(null);
    fetchEnrollments();
  };

  const filtered = enrollments.filter(e => {
    if (filter !== 'all' && e.status !== filter) return false;
    if (searchQuery) {
      const name = `${e.profiles?.first_name} ${e.profiles?.last_name}`.toLowerCase();
      return name.includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <PageTransition>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] mb-8" style={{ fontFamily: 'var(--font-heading)' }}>
          Enrollments & Payments
        </h1>

        {/* Helper Banner */}
        {showBanner && (
          <div className="mb-8 p-4 rounded-xl border border-[#DBEAFE] bg-[#DBEAFE]/10 flex items-start justify-between gap-4">
            <p className="text-sm text-[#0F172A]">
              <span className="mr-2">💡</span> For bank transfer payments — check your bank statement for the reference code shown below, verify the amount matches, then click Verify & Unlock.
            </p>
            <button onClick={dismissBanner} className="text-[#94A6B8] hover:text-[#0F172A]">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 mb-10 z-10 relative">
          <div className="relative w-full lg:max-w-md group">
            {/* Cinematic Light Decoration */}
            <div className="absolute -inset-1 bg-gradient-to-r from-[#2563EB] via-[#93C5FD] to-[#3B82F6] rounded-[20px] blur-lg opacity-30 group-focus-within:opacity-70 group-hover:opacity-50 transition duration-700"></div>
            
            <div className="relative flex items-center bg-white rounded-2xl border border-[#E2E8F0] focus-within:border-transparent focus-within:ring-2 focus-within:ring-[#2563EB] transition-all shadow-lg overflow-hidden h-[54px]">
              <div className="pl-5 pr-3">
                <Search size={20} className="text-[#2563EB]" />
              </div>
              <input
                className="w-full h-full text-sm sm:text-base text-[#0F172A] placeholder-[#94A6B8] focus:outline-none bg-transparent"
                placeholder="Search by learner name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 w-full lg:w-auto">
            {['all', 'pending', 'confirmed', 'rejected', 'expired'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
                  filter === f ? 'bg-[#DBEAFE]/30 text-[#2563EB] border border-[#DBEAFE]' : 'text-[#94A6B8] hover:bg-[#F5F5F5] border border-transparent'
                }`}
              >
                {f}
                {f === 'pending' && enrollments.filter(e => e.status === 'pending').length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-[#2563EB] text-white rounded-full text-[10px] font-bold">
                    {enrollments.filter(e => e.status === 'pending').length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Clock} title="No enrollments found" description="No enrollment records match your current filters." />
        ) : (
          <div className="overflow-x-auto bg-white rounded-2xl border border-[#F1F5F9] shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0]">
                  <th className="text-left py-4 px-6 text-xs text-[#94A6B8] font-medium uppercase tracking-wider">Learner</th>
                  <th className="text-left py-4 px-6 text-xs text-[#94A6B8] font-medium uppercase tracking-wider">Pack</th>
                  <th className="text-left py-4 px-6 text-xs text-[#94A6B8] font-medium uppercase tracking-wider">Method & Ref</th>
                  <th className="text-left py-4 px-6 text-xs text-[#94A6B8] font-medium uppercase tracking-wider">Date</th>
                  <th className="text-left py-4 px-6 text-xs text-[#94A6B8] font-medium uppercase tracking-wider">Proof</th>
                  <th className="text-left py-4 px-6 text-xs text-[#94A6B8] font-medium uppercase tracking-wider">Status</th>
                  <th className="text-right py-4 px-6 text-xs text-[#94A6B8] font-medium uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => (
                  <motion.tr
                    key={e.id}
                    className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <td className="py-4 px-6">
                      <p className="text-[#0F172A] font-medium">{e.profiles?.first_name} {e.profiles?.last_name}</p>
                      <p className="text-xs text-[#94A6B8] mt-1">{e.profiles?.email}</p>
                    </td>
                    <td className="py-4 px-6 text-[#475569]">{e.session_packs?.title}</td>
                    <td className="py-4 px-6">
                      {e.payment_method_used === 'bank' ? (
                        <div>
                          <span className="badge badge-gold mb-1 inline-block">Bank Transfer</span>
                          <div className="flex items-center gap-2 text-xs font-mono text-[#0F172A]">
                            {e.payment_reference_code}
                            <button onClick={() => navigator.clipboard.writeText(e.payment_reference_code)} className="text-[#94A6B8] hover:text-[#2563EB]">
                              <Copy size={12} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="px-2 py-1 bg-[#F5F5F5] border border-[#E2E8F0] rounded-md text-[10px] text-[#94A6B8]">Via Link</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-[#94A6B8] text-xs">
                      {format(new Date(e.submitted_at), 'MMM dd, yyyy')}
                    </td>
                    <td className="py-4 px-6">
                      {e.payment_screenshot_url ? (
                        <button
                          onClick={() => setScreenshotModal(e.payment_screenshot_url)}
                          className="text-[#2563EB] text-xs hover:text-[#1D4ED8] flex items-center gap-1"
                        >
                          <Eye size={13} /> View
                        </button>
                      ) : (
                        <span className="text-xs text-[#94A6B8]">None</span>
                      )}
                    </td>
                    <td className="py-4 px-6"><StatusBadge status={e.status} /></td>
                    <td className="py-4 px-6 text-right">
                      {e.status === 'pending' && (
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => confirmPayment(e.id)}
                            className="btn-primary text-xs py-1.5 px-3"
                            disabled={processing === e.id}
                          >
                            {processing === e.id ? <Loader2 size={12} className="animate-spin" /> : <><CheckCircle size={12} /> Confirm</>}
                          </button>
                          <button
                            onClick={() => setRejectModal(e.id)}
                            className="btn-danger text-xs py-1.5 px-3"
                          >
                            <XCircle size={12} /> Reject
                          </button>
                        </div>
                      )}
                      {e.status === 'rejected' && e.rejection_reason && (
                        <span className="text-xs text-[#C0392B]" title={e.rejection_reason}>Reason given</span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Screenshot modal */}
        <Modal isOpen={!!screenshotModal} onClose={() => setScreenshotModal(null)} title="Payment Proof">
          {screenshotModal && (
            <img src={screenshotModal} alt="Payment screenshot" className="w-full rounded-lg" />
          )}
        </Modal>

        {/* Reject modal */}
        <Modal isOpen={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Payment">
          <p className="text-sm text-[#475569] mb-4">Provide a reason so the learner can re-upload a correct screenshot.</p>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {["Wrong amount", "Code not found in bank", "Screenshot unclear", "Payment not received"].map(reason => (
              <button 
                key={reason}
                onClick={() => setRejectReason(reason)}
                className="px-3 py-1.5 rounded-full border border-[#E2E8F0] text-xs text-[#475569] hover:bg-[#F5F5F5] hover:text-[#0F172A] transition-colors"
              >
                {reason}
              </button>
            ))}
          </div>

          <textarea
            className="textarea-field mb-6"
            placeholder="Reason for rejection (optional)..."
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            rows={3}
          />
          <div className="flex gap-4 mt-8">
            <button onClick={() => setRejectModal(null)} className="btn-ghost flex-1 border border-[#E2E8F0]">Cancel</button>
            <button onClick={rejectPayment} className="btn-danger flex-1 bg-[#C0392B] text-white border-[#C0392B]" disabled={processing === rejectModal}>
              {processing === rejectModal ? 'Rejecting...' : 'Reject Payment'}
            </button>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}
