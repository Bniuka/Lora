import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileSpreadsheet, Building2, Users, AlertTriangle, Download,
  Printer, CheckCircle2, Clock, XCircle, Search,
  ExternalLink, MessageCircle, ShieldCheck, RefreshCw,
  TrendingUp, Rocket, Gift, Check, Eye, Copy, X,
  FileCheck, ChevronLeft, ChevronRight, Loader2, CreditCard, Link2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { getCreatorReports, resolveStudentReport, verifySlipAndActivateStudent } from '../lib/disputeSystem';
import {
  extractConfiguredBanks,
  isConfirmedStatus,
  classifyEnrollmentPayment,
  matchEnrollmentToChannel,
  getEnrollmentRefCode,
  getEnrollmentDate,
  formatCurrencyMap,
  computeReconciliationSummary,
  filterReconciliationEnrollments,
  matchBankStatementText,
  buildReconciliationCSV,
} from '../lib/bankReconciliation';
import { useVictory } from '../context/VictoryContext';
import { PageTransition } from '../components/ui';
import './creator-reports.css';

const RECON_PAGE_SIZE = 20;

const QUICK_REASONS = [
  'Wrong amount',
  'Code not found in bank',
  'Screenshot unclear',
  'Payment not received',
  'Duplicate slip',
];

export default function CreatorReports() {
  const { user } = useAuth();
  const { triggerVictory } = useVictory();
  const [activeTab, setActiveTab] = useState('reconciliation'); // 'reconciliation', 'attendance', 'retention', 'disputes'
  const [loading, setLoading] = useState(true);

  // Data states
  const [enrollments, setEnrollments] = useState([]);
  const [packs, setPacks] = useState([]);
  const [reports, setReports] = useState([]);
  const [creatorProfile, setCreatorProfile] = useState(null);
  const [creatorPayProfile, setCreatorPayProfile] = useState(null);
  const [bankDetails, setBankDetails] = useState(null);

  // Tab filters & searches
  const [selectedPackFilter, setSelectedPackFilter] = useState('all');
  const [selectedCohortPackId, setSelectedCohortPackId] = useState('all');
  const [disputeFilter, setDisputeFilter] = useState('all'); // 'all', 'open', 'slip_appeal', 'resolved'
  const [searchQuery, setSearchQuery] = useState('');

  // Bank Slip Reconciliation states
  const [reconStatusFilter, setReconStatusFilter] = useState('all'); // 'all', 'pending', 'verified', 'rejected', 'expired'
  const [reconBankFilter, setReconBankFilter] = useState('all');
  const [reconPackFilter, setReconPackFilter] = useState('all');
  const [reconPage, setReconPage] = useState(1);
  const [showAllRows, setShowAllRows] = useState(false);
  const [reconciledIds, setReconciledIds] = useState([]);

  // Reconciliation Modals & Actions
  const [slipModalEnr, setSlipModalEnr] = useState(null);
  const [slipImgError, setSlipImgError] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [matcherOpen, setMatcherOpen] = useState(false);
  const [statementText, setStatementText] = useState('');
  const [statementBankFilter, setStatementBankFilter] = useState('all');
  const [copiedRefId, setCopiedRefId] = useState(null);

  const [processingId, setProcessingId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  // Load statement-checked IDs from localStorage
  useEffect(() => {
    if (!user?.id) return;
    try {
      const saved = JSON.parse(localStorage.getItem(`lora_reconciled_slips_${user.id}`) || '[]');
      if (Array.isArray(saved)) setReconciledIds(saved);
    } catch {
      setReconciledIds([]);
    }
  }, [user?.id]);

  const persistReconciledIds = (nextIds) => {
    setReconciledIds(nextIds);
    if (user?.id) {
      try {
        localStorage.setItem(`lora_reconciled_slips_${user.id}`, JSON.stringify(nextIds));
      } catch {
        // ignore storage quota error
      }
    }
  };

  const toggleStatementChecked = (enrId) => {
    if (!enrId) return;
    if (reconciledIds.includes(enrId)) {
      persistReconciledIds(reconciledIds.filter((id) => id !== enrId));
    } else {
      persistReconciledIds([...reconciledIds, enrId]);
    }
  };

  const markManyStatementChecked = (ids) => {
    const merged = Array.from(new Set([...reconciledIds, ...ids.filter(Boolean)]));
    persistReconciledIds(merged);
  };

  const loadData = useCallback(async ({ showSkeleton = false } = {}) => {
    if (!user?.id) return;
    if (showSkeleton) setLoading(true);
    try {
      // 1. Fetch Creator Profile, Payment Options, Bank Accounts, and Packs in parallel
      const [profRes, creatorPayRes, bankRes, packsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('creator_profiles').select('id, payment_option, payment_link').eq('id', user.id).maybeSingle(),
        supabase.from('creator_bank_details').select('*').eq('creator_id', user.id).maybeSingle(),
        supabase.from('session_packs').select('*').eq('creator_id', user.id),
      ]);

      setCreatorProfile(profRes.data || null);
      setCreatorPayProfile(creatorPayRes.data || null);
      setBankDetails(bankRes.data || null);

      const creatorPacks = packsRes.data || [];
      setPacks(creatorPacks);

      // 2. Fetch Enrollments with student profiles
      const packIds = creatorPacks.map((p) => p.id);
      if (packIds.length > 0) {
        let fetchedEnrollments = [];
        const { data: enrData, error: enrErr } = await supabase
          .from('enrollments')
          .select('*, profiles!enrollments_learner_id_fkey(id, first_name, last_name, email, contact_number, country_code)')
          .in('pack_id', packIds);

        if (enrErr) {
          console.warn('[CreatorReports] Primary enrollment query error, falling back:', enrErr);
          const { data: rawEnr } = await supabase
            .from('enrollments')
            .select('*')
            .in('pack_id', packIds);

          if (rawEnr && rawEnr.length > 0) {
            const learnerIds = [...new Set(rawEnr.map((e) => e.learner_id).filter(Boolean))];
            const { data: profs } = await supabase
              .from('profiles')
              .select('id, first_name, last_name, email, contact_number, country_code')
              .in('id', learnerIds);
            const pMap = Object.fromEntries((profs || []).map((p) => [p.id, p]));
            fetchedEnrollments = rawEnr.map((e) => ({ ...e, profiles: pMap[e.learner_id] || null }));
          }
        } else {
          fetchedEnrollments = enrData || [];
        }

        // Sort deterministically by newest submission / creation date
        fetchedEnrollments.sort((a, b) => {
          const da = new Date(getEnrollmentDate(a) || 0).getTime();
          const db = new Date(getEnrollmentDate(b) || 0).getTime();
          return db - da;
        });

        setEnrollments(fetchedEnrollments);
      } else {
        setEnrollments([]);
      }

      // 3. Fetch Student Reports for this Creator
      const creatorDisputes = await getCreatorReports(user.id, packIds);
      setReports(creatorDisputes);
    } catch (err) {
      console.error('[CreatorReports] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    loadData({ showSkeleton: true });
  }, [user, loadData]);

  // Reset pagination when filters change
  useEffect(() => {
    setReconPage(1);
  }, [reconStatusFilter, reconBankFilter, reconPackFilter, searchQuery]);

  // Escape closes top-most open modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (rejectTarget) {
        setRejectTarget(null);
        setRejectReason('');
      } else if (slipModalEnr) {
        setSlipModalEnr(null);
      } else if (matcherOpen) {
        setMatcherOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rejectTarget, slipModalEnr, matcherOpen]);

  // ── Helper: Format Student Info, Creator Name & WhatsApp Links ──
  const creatorDisplayName = useMemo(() => {
    const full = `${creatorProfile?.first_name || ''} ${creatorProfile?.last_name || ''}`.trim();
    return full || creatorProfile?.full_name || creatorProfile?.name || user?.user_metadata?.first_name || 'Your Instructor';
  }, [creatorProfile, user]);

  const getStudentInfo = (enr) => {
    const prof = enr.profiles || enr.student || {};
    const firstName = prof.first_name || '';
    const lastName = prof.last_name || '';
    const name = `${firstName} ${lastName}`.trim() || 'Learner';
    const email = prof.email || '';
    const phone = prof.contact_number || prof.phone || '';
    return { name, email, phone };
  };

  const formatWhatsAppPhone = (phone) => {
    if (!phone) return '';
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = '94' + cleaned.slice(1);
    }
    return cleaned;
  };

  const handleCopyRef = async (refCode, id) => {
    try {
      await navigator.clipboard.writeText(refCode);
    } catch {
      // ignore clipboard errors in restricted browsers
    }
    setCopiedRefId(id);
    setTimeout(() => setCopiedRefId((prev) => (prev === id ? null : prev)), 1800);
  };

  // ── Actions: Bank Slip Reconciliation (Approve / Reject / Bulk) ──
  const approveSingleEnrollment = async (enr, { skipVictory = false, silentToast = false } = {}) => {
    if (!enr?.id) return false;
    const packObj = packs.find((p) => p.id === enr.pack_id);
    const packTitle = packObj?.title || 'your course';
    const studentInfo = getStudentInfo(enr);

    let updateRes = await supabase
      .from('enrollments')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq('id', enr.id);

    if (updateRes.error && (updateRes.error.message?.includes('confirmed_at') || updateRes.error.message?.includes('rejection_reason'))) {
      updateRes = await supabase
        .from('enrollments')
        .update({ status: 'confirmed' })
        .eq('id', enr.id);
    }

    if (updateRes.error) {
      if (!silentToast) showToast('Error approving slip: ' + updateRes.error.message);
      return false;
    }

    // Notify learner in-app
    if (enr.learner_id) {
      try {
        await supabase.from('notifications').insert({
          user_id: enr.learner_id,
          title: 'Payment Confirmed! 🎉',
          message: `Your payment for "${packTitle}" has been confirmed. You can now access all sessions.`,
        });
      } catch (notifErr) {
        console.debug('[CreatorReports] Approval notification skipped:', notifErr);
      }
    }

    // Keep any matching open slip appeal in Dispute Desk synced
    const matchingAppeals = reports.filter(
      (r) =>
        r.status === 'open' &&
        r.report_type === 'slip_appeal' &&
        r.pack_id === enr.pack_id &&
        r.student_id === enr.learner_id
    );
    for (const appeal of matchingAppeals) {
      try {
        await resolveStudentReport({
          reportId: appeal.id,
          resolutionStatus: 'resolved',
          notes: `Bank slip verified & reconciled by ${user?.email || 'Creator'}.`,
          actorEmail: user?.email,
        });
      } catch {
        // non-blocking
      }
    }

    if (!reconciledIds.includes(enr.id)) {
      persistReconciledIds([...reconciledIds, enr.id]);
    }

    if (!silentToast) {
      showToast(`Slip verified! ${studentInfo.name} now has access to "${packTitle}".`);
    }

    if (!skipVictory && triggerVictory) {
      triggerVictory({
        type: 'customer',
        title: 'Slip Reconciled & Approved! 💰',
        subtitle: `Access granted to ${studentInfo.name} for "${packTitle}".`,
      });
    }

    return true;
  };

  const handleApproveEnrollment = async (enr) => {
    setProcessingId(enr.id);
    try {
      const ok = await approveSingleEnrollment(enr);
      if (ok) {
        if (slipModalEnr?.id === enr.id) setSlipModalEnr(null);
        await loadData({ showSkeleton: false });
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectEnrollment = async () => {
    if (!rejectTarget) return;
    setProcessingId(rejectTarget.id);
    try {
      const packObj = packs.find((p) => p.id === rejectTarget.pack_id);
      const packTitle = packObj?.title || 'your course';
      const cleanReason = rejectReason.trim();

      const { error } = await supabase
        .from('enrollments')
        .update({
          status: 'rejected',
          rejection_reason: cleanReason || null,
        })
        .eq('id', rejectTarget.id);

      if (error) {
        showToast('Error rejecting slip: ' + error.message);
        return;
      }

      if (rejectTarget.learner_id) {
        try {
          await supabase.from('notifications').insert({
            user_id: rejectTarget.learner_id,
            title: 'Payment Issue',
            message: `Your payment for "${packTitle}" was rejected. Reason: ${cleanReason || 'None given'}. Please try again.`,
          });
        } catch (notifErr) {
          console.debug('[CreatorReports] Rejection notification skipped:', notifErr);
        }
      }

      showToast('Slip rejected and learner notified.');
      if (slipModalEnr?.id === rejectTarget.id) setSlipModalEnr(null);
      setRejectTarget(null);
      setRejectReason('');
      await loadData({ showSkeleton: false });
    } finally {
      setProcessingId(null);
    }
  };

  const handleBulkApproveMatched = async (exactMatches) => {
    if (!exactMatches || exactMatches.length === 0) return;
    setProcessingId('bulk');
    let approvedCount = 0;
    const checkedIds = [];
    try {
      for (const item of exactMatches) {
        const ok = await approveSingleEnrollment(item.enrollment, {
          skipVictory: true,
          silentToast: true,
        });
        if (ok) {
          approvedCount++;
          checkedIds.push(item.enrollment.id);
        }
      }

      if (checkedIds.length > 0) {
        markManyStatementChecked(checkedIds);
      }

      if (approvedCount > 0) {
        showToast(`Reconciled & approved ${approvedCount} bank slip${approvedCount > 1 ? 's' : ''}!`);
        if (triggerVictory) {
          triggerVictory({
            type: 'customer',
            title: `${approvedCount} Slips Reconciled! 🚀`,
            subtitle: 'Matched bank statement transfers were approved and students notified.',
          });
        }
        await loadData({ showSkeleton: false });
      } else {
        showToast('Could not approve matched slips. Please try individually.');
      }
    } finally {
      setProcessingId(null);
    }
  };

  // ── Actions: Dispute Desk ──
  const handleResolveReport = async (reportId, resolutionStatus) => {
    setActionLoading(true);
    try {
      await resolveStudentReport({
        reportId,
        resolutionStatus,
        notes: `Addressed by creator on ${new Date().toLocaleDateString()}`,
        actorEmail: user?.email,
      });
      showToast(`Dispute marked as ${resolutionStatus}! Student notified in-app.`);
      const packIds = packs.map((p) => p.id);
      const updated = await getCreatorReports(user.id, packIds);
      setReports(updated);
    } catch {
      showToast('Failed to resolve dispute.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifySlipAndActivate = async (rep) => {
    setActionLoading(true);
    try {
      const res = await verifySlipAndActivateStudent({
        report: rep,
        actorEmail: user?.email,
      });

      if (res.success) {
        showToast(`Bank slip verified! ${rep.student_name} activated with full access.`);
        if (triggerVictory) {
          triggerVictory({
            type: 'customer',
            title: 'Student Activated! 🚀',
            subtitle: `${rep.student_name} now has access to "${rep.pack_title}".`,
          });
        }
        await loadData({ showSkeleton: false });
      } else {
        showToast('Failed to verify slip. Please check enrollment record.');
      }
    } catch (err) {
      showToast('Error activating student: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDirectWhatsAppStudent = (rep) => {
    const phone = formatWhatsAppPhone(rep.student_phone || rep.studentPhone);
    const msg = `Hello ${rep.student_name}! This is ${creatorDisplayName} from LoraSpace regarding your support request for "${rep.pack_title}". Let's get this sorted out for you right away.`;
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
      showToast(`Opening WhatsApp chat with ${rep.student_name}…`);
    } else {
      showToast('No phone number recorded for this student.');
    }
  };

  const handleOfferDisputeBonus = async (rep) => {
    if (!rep.student_id || rep.student_id === 'guest') {
      showToast('Cannot send bonus to a guest account.');
      return;
    }
    setActionLoading(true);
    try {
      await supabase.from('notifications').insert([
        {
          user_id: rep.student_id,
          title: `Resolution Bonus & Free Access Granted! 🎁`,
          message: `Your instructor ${creatorDisplayName} has resolved your issue in "${rep.pack_title}" and granted you a bonus extension or free session access!`,
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ]);
      showToast(`Compensation bonus delivered to ${rep.student_name}'s notification bell!`);
    } catch {
      showToast('Failed to deliver bonus.');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Actions: Cohort Retention Re-engagement & Upgrade ──
  const handleSendWhatsAppNudge = async (enr) => {
    const studentInfo = getStudentInfo(enr);
    const phone = formatWhatsAppPhone(studentInfo.phone);
    const packObj = packs.find((p) => p.id === enr.pack_id);
    const packTitle = packObj?.title || 'your course';

    if (enr.learner_id) {
      try {
        await supabase.from('notifications').insert([
          {
            user_id: enr.learner_id,
            title: `Check-in from ${creatorDisplayName} 🎓`,
            message: `Hey ${studentInfo.name}, your instructor checked in on your learning progress in "${packTitle}". Catch up on recent sessions and recordings in your classroom!`,
            is_read: false,
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (err) {
        console.debug('[CreatorReports] Nudge in-app notification error:', err);
      }
    }

    const message = `Hello ${studentInfo.name}! This is ${creatorDisplayName} from LoraSpace. We'd love to check in on your progress in "${packTitle}". We have upcoming sessions and would love to have you active! Here is your classroom link: ${window.location.origin}/packs/${enr.pack_id}`;
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
      showToast(`WhatsApp opened & in-app reminder sent to ${studentInfo.name}!`);
    } else {
      showToast(`In-app notification sent to ${studentInfo.name} (no phone number on file)`);
    }
  };

  const handleSendUpgrade = async (enr) => {
    const studentInfo = getStudentInfo(enr);
    const phone = formatWhatsAppPhone(studentInfo.phone);
    const packObj = packs.find((p) => p.id === enr.pack_id);
    const packTitle = packObj?.title || 'your course';

    let nextPack = packs.find(
      (p) =>
        p.parent_pack_id === packObj?.parent_pack_id &&
        p.id !== packObj?.id &&
        (p.order_index ?? 0) > (packObj?.order_index ?? 0)
    );
    if (!nextPack) {
      nextPack = packs.find((p) => p.id !== packObj?.id) || packObj;
    }
    const nextTitle = nextPack?.title || packTitle;
    const nextUrl = `${window.location.origin}/packs/${nextPack?.id || enr.pack_id}`;

    if (enr.learner_id) {
      try {
        await supabase.from('notifications').insert([
          {
            user_id: enr.learner_id,
            title: `Exclusive Course Upgrade Invitation 🚀`,
            message: `Instructor ${creatorDisplayName} has sent you an exclusive invitation to advance to the next batch / course: "${nextTitle}". Tap to enroll!`,
            is_read: false,
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (err) {
        console.debug('[CreatorReports] Upgrade notification error:', err);
      }
    }

    if (phone) {
      const waMsg = `Hi ${studentInfo.name}! Special invitation from ${creatorDisplayName}: you are eligible to enroll in our next batch "${nextTitle}". Reserve your seat here: ${nextUrl}`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}`, '_blank');
      showToast(`Upgrade invitation sent to ${studentInfo.name} via WhatsApp & in-app!`);
    } else {
      showToast(`Upgrade invitation delivered to ${studentInfo.name}'s notification bell!`);
    }
  };

  // ── Real Bank Accounts & Reconciliation Computations ──
  const bankAccounts = useMemo(() => extractConfiguredBanks(bankDetails), [bankDetails]);

  const packMap = useMemo(() => new Map(packs.map((p) => [p.id, p])), [packs]);

  const verifiedEnrollments = useMemo(
    () => enrollments.filter((e) => isConfirmedStatus(e.status)),
    [enrollments]
  );

  const reconSummary = useMemo(
    () =>
      computeReconciliationSummary({
        enrollments,
        packs,
        bankAccounts,
        creatorPayOption: creatorPayProfile?.payment_option || '',
      }),
    [enrollments, packs, bankAccounts, creatorPayProfile]
  );

  const filteredReconEnrollments = useMemo(
    () =>
      filterReconciliationEnrollments({
        enrollments,
        packs,
        bankAccounts,
        statusFilter: reconStatusFilter,
        bankFilter: reconBankFilter,
        packFilter: reconPackFilter,
        searchQuery,
      }),
    [enrollments, packs, bankAccounts, reconStatusFilter, reconBankFilter, reconPackFilter, searchQuery]
  );

  const totalReconPages = Math.max(1, Math.ceil(filteredReconEnrollments.length / RECON_PAGE_SIZE));
  const safeReconPage = Math.min(reconPage, totalReconPages);
  const displayedReconRows = showAllRows
    ? filteredReconEnrollments
    : filteredReconEnrollments.slice((safeReconPage - 1) * RECON_PAGE_SIZE, safeReconPage * RECON_PAGE_SIZE);

  const statementMatchResult = useMemo(
    () =>
      matchBankStatementText({
        statementText,
        enrollments,
        packs,
        bankAccounts,
        bankFilter: statementBankFilter,
      }),
    [statementText, enrollments, packs, bankAccounts, statementBankFilter]
  );

  const hasActiveReconFilters =
    reconStatusFilter !== 'all' ||
    reconBankFilter !== 'all' ||
    reconPackFilter !== 'all' ||
    searchQuery.trim() !== '';

  const clearReconFilters = () => {
    setReconStatusFilter('all');
    setReconBankFilter('all');
    setReconPackFilter('all');
    setSearchQuery('');
  };

  // ── Real Cohort Retention Calculations ──
  const multiPacks = packs.filter((p) => p.is_multi_pack);

  let cohortBatches = [];
  let cohortTitle = 'All Courses Combined Retention';

  if (selectedCohortPackId !== 'all') {
    const selectedParent = packs.find((p) => p.id === selectedCohortPackId);
    if (selectedParent) {
      cohortTitle = selectedParent.title;
      cohortBatches = packs
        .filter((p) => p.parent_pack_id === selectedParent.id)
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0) || new Date(a.created_at) - new Date(b.created_at));
    }
  } else if (multiPacks.length > 0) {
    const firstMulti = multiPacks[0];
    cohortTitle = `${firstMulti.title} (Batch Series)`;
    cohortBatches = packs
      .filter((p) => p.parent_pack_id === firstMulti.id)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0) || new Date(a.created_at) - new Date(b.created_at));
  }

  const usingBatchSeries = cohortBatches.length > 0;
  const cohortPacksToUse = usingBatchSeries
    ? cohortBatches
    : packs.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const cohortStages = cohortPacksToUse.map((packItem, idx) => {
    const packEnrs = verifiedEnrollments.filter((e) => e.pack_id === packItem.id);
    const studentIds = new Set(packEnrs.map((e) => e.learner_id).filter(Boolean));
    return {
      id: packItem.id,
      title: packItem.title || `Month ${idx + 1}`,
      count: studentIds.size,
      studentIds,
      enrollments: packEnrs,
    };
  });

  const baseCohortCount = cohortStages[0]?.count || 0;
  const stagesWithStats = cohortStages.map((stage, idx) => {
    if (idx === 0) {
      return {
        ...stage,
        pct: baseCohortCount > 0 ? 100 : 0,
        retained: baseCohortCount,
        dropped: 0,
      };
    }
    const prevCount = cohortStages[idx - 1]?.count || 0;
    const pct = baseCohortCount > 0 ? Math.round((stage.count / baseCohortCount) * 1000) / 10 : 0;
    const dropped = Math.max(0, prevCount - stage.count);
    return {
      ...stage,
      pct,
      retained: stage.count,
      dropped,
    };
  });

  let overallRetentionRate = 0;
  let retentionSubtitle = 'No student enrollments recorded yet';
  const totalUniqueLearners = new Set(verifiedEnrollments.map((e) => e.learner_id).filter(Boolean)).size;

  if (usingBatchSeries && stagesWithStats.length >= 2) {
    const nextStat = stagesWithStats[1];
    overallRetentionRate = nextStat.pct;
    retentionSubtitle = `${nextStat.retained} of ${baseCohortCount} students renewed into ${nextStat.title}`;
  } else if (totalUniqueLearners > 0) {
    const countsPerLearner = {};
    verifiedEnrollments.forEach((e) => {
      if (e.learner_id) {
        countsPerLearner[e.learner_id] = (countsPerLearner[e.learner_id] || 0) + 1;
      }
    });
    const repeatCount = Object.values(countsPerLearner).filter((c) => c > 1).length;
    overallRetentionRate = Math.round((repeatCount / totalUniqueLearners) * 1000) / 10;
    retentionSubtitle = `${repeatCount} of ${totalUniqueLearners} unique students enrolled in 2+ courses`;
  }

  const latestBatchStudentIds =
    usingBatchSeries && cohortStages.length > 1
      ? cohortStages[cohortStages.length - 1].studentIds
      : new Set();

  const atRiskList = [];
  const seenLearners = new Set();

  verifiedEnrollments.forEach((enr) => {
    if (!enr.learner_id || seenLearners.has(enr.learner_id)) return;
    seenLearners.add(enr.learner_id);

    const studentInfo = getStudentInfo(enr);
    const enrolledDate = new Date(enr.created_at || enr.submitted_at || Date.now());
    const daysSince = Math.max(0, Math.floor((Date.now() - enrolledDate.getTime()) / (1000 * 60 * 60 * 24)));
    const packObj = packMap.get(enr.pack_id);

    const hasDroppedFromSeries =
      usingBatchSeries && cohortStages.length > 1 && !latestBatchStudentIds.has(enr.learner_id);
    const isInactiveOverdue = daysSince >= 14;
    const isFollowupDue = daysSince >= 3;

    if (hasDroppedFromSeries || isInactiveOverdue || isFollowupDue || verifiedEnrollments.length <= 8) {
      atRiskList.push({
        enrollment: enr,
        studentInfo,
        packTitle: packObj?.title || 'Course Pack',
        daysSince,
        daysText: daysSince === 0 ? 'Enrolled Today' : `${daysSince} day${daysSince !== 1 ? 's' : ''} ago`,
        status: hasDroppedFromSeries
          ? 'Dropped Off (No Renewal)'
          : isInactiveOverdue
          ? 'Needs Re-engagement'
          : 'Follow-up Check-in',
        statusType: hasDroppedFromSeries ? 'danger' : isInactiveOverdue ? 'warn' : 'info',
      });
    }
  });

  // ── Dispute Queue Stats & Filtering ──
  const openReports = reports.filter((r) => r.status === 'open');
  const slipReports = reports.filter((r) => r.report_type === 'slip_appeal');
  const resolvedReports = reports.filter((r) => r.status === 'resolved' || r.status === 'dismissed');

  const filteredReports = reports.filter((r) => {
    if (disputeFilter === 'open') return r.status === 'open';
    if (disputeFilter === 'slip_appeal') return r.report_type === 'slip_appeal';
    if (disputeFilter === 'resolved') return r.status === 'resolved' || r.status === 'dismissed';
    return true;
  });

  // ── CSV Export ──
  const handleExportCSV = () => {
    const exportRows = activeTab === 'reconciliation' ? filteredReconEnrollments : enrollments;
    if (exportRows.length === 0) {
      showToast('No records to export.');
      return;
    }

    const csvString = buildReconciliationCSV({
      rows: exportRows,
      packs,
      reconciledIds,
    });

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `LoraSpace_Reconciliation_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${exportRows.length} audit record${exportRows.length !== 1 ? 's' : ''} to CSV!`);
  };

  const handlePrint = () => {
    window.print();
  };

  const formatPackTitleWithParent = (packObj) => {
    if (!packObj) return 'Course';
    if (packObj.parent_pack_id) {
      const parent = packMap.get(packObj.parent_pack_id);
      if (parent) return `${parent.title} › ${packObj.title}`;
    }
    return packObj.title || 'Course';
  };

  const formatDateDisplay = (dateVal) => {
    if (!dateVal) return 'N/A';
    const d = new Date(dateVal);
    if (Number.isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString();
  };

  // Sub-copy for KPI Card 1
  const verifiedBreakdownParts = [];
  if (reconSummary.verifiedBankCount > 0) {
    verifiedBreakdownParts.push(`${reconSummary.verifiedBankCount} bank slip${reconSummary.verifiedBankCount !== 1 ? 's' : ''}`);
  }
  if (reconSummary.verifiedLinkCount > 0) {
    verifiedBreakdownParts.push(`${reconSummary.verifiedLinkCount} payment link${reconSummary.verifiedLinkCount !== 1 ? 's' : ''}`);
  }
  if (reconSummary.verifiedFreeOrPromoCount > 0) {
    verifiedBreakdownParts.push(`${reconSummary.verifiedFreeOrPromoCount} free/promo`);
  }
  const verifiedSubtext =
    verifiedBreakdownParts.length > 0
      ? verifiedBreakdownParts.join(' · ')
      : '0 verified payments recorded yet';

  return (
    <PageTransition>
      <div className="lora-creator-reports">
        {toastMsg && <div className="lora-rep-toast">{toastMsg}</div>}

        {/* Print-only statement header */}
        <div className="rep-print-header">
          <h2>LoraSpace · Bank Slip Reconciliation Statement</h2>
          <p>
            Instructor: {creatorDisplayName} · Generated: {new Date().toLocaleString()} · Records: {filteredReconEnrollments.length}
          </p>
        </div>

        {/* Header */}
        <div className="lora-rep-header">
          <div>
            <div className="rep-badge">
              <FileSpreadsheet size={14} />
              Financial &amp; Academic Reports Studio
            </div>
            <h1>Creator Intelligence &amp; Audit Reports</h1>
            <p>Real-time bank slip audit trails, student attendance registers, cohort retention analytics, and instant dispute resolution.</p>
          </div>

          <div className="rep-actions">
            <button type="button" className="rep-btn-sec" onClick={() => loadData({ showSkeleton: false })} title="Refresh report data">
              <RefreshCw size={15} /> Refresh
            </button>
            <button type="button" className="rep-btn-sec" onClick={handlePrint} title="Print statement">
              <Printer size={15} /> Print Statement
            </button>
            <button type="button" className="rep-btn-pri" onClick={handleExportCSV} title="Export to CSV">
              <Download size={15} /> Export CSV
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="lora-rep-tabs">
          <button
            type="button"
            className={activeTab === 'reconciliation' ? 'active' : ''}
            onClick={() => setActiveTab('reconciliation')}
          >
            <Building2 size={16} />
            Bank Slip Reconciliation
            {reconSummary.pendingCount > 0 && (
              <span className="tab-pill-pending">{reconSummary.pendingCount}</span>
            )}
          </button>
          <button
            type="button"
            className={activeTab === 'attendance' ? 'active' : ''}
            onClick={() => setActiveTab('attendance')}
          >
            <Users size={16} />
            Tuition Attendance Register
          </button>
          <button
            type="button"
            className={activeTab === 'retention' ? 'active' : ''}
            onClick={() => setActiveTab('retention')}
          >
            <TrendingUp size={16} />
            Cohort Retention &amp; Drop-off
          </button>
          <button
            type="button"
            className={activeTab === 'disputes' ? 'active' : ''}
            onClick={() => setActiveTab('disputes')}
          >
            <AlertTriangle size={16} />
            Student Dispute Desk
            {openReports.length > 0 && (
              <span className="tab-pill-alert">{openReports.length}</span>
            )}
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="rep-loading-grid">
            <div className="rep-kpi-grid">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rep-kpi-card rep-skeleton-card" />
              ))}
            </div>
            <div className="rep-table-wrap rep-skeleton-table" />
          </div>
        ) : (
          <>
            {/* TAB 1: BANK RECONCILIATION */}
            {activeTab === 'reconciliation' && (
              <div className="rep-tab-content">
                {/* KPI Cards */}
                <div className="rep-kpi-grid">
                  <div className="rep-kpi-card green">
                    <div className="kpi-top">
                      <small>Reconciled Revenue</small>
                      <CheckCircle2 size={18} className="text-emerald-500" />
                    </div>
                    <b>{formatCurrencyMap(reconSummary.verifiedRevenueMap, reconSummary.primaryCurrency)}</b>
                    <span>{verifiedSubtext}</span>
                  </div>

                  <div className="rep-kpi-card amber">
                    <div className="kpi-top">
                      <small>Pending Slips In Review</small>
                      <Clock size={18} className="text-amber-500" />
                    </div>
                    <b>{formatCurrencyMap(reconSummary.pendingRevenueMap, reconSummary.primaryCurrency)}</b>
                    <div className="kpi-sub-row">
                      <span>{reconSummary.pendingCount} awaiting verification</span>
                      {reconSummary.pendingCount > 0 && (
                        <button
                          type="button"
                          className="kpi-quick-link"
                          onClick={() => setReconStatusFilter('pending')}
                        >
                          Review pending →
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="rep-kpi-card purple">
                    <div className="kpi-top">
                      <small>0% Commission Savings</small>
                      <ShieldCheck size={18} className="text-purple-500" />
                    </div>
                    <b>{formatCurrencyMap(reconSummary.commissionSavingsMap, reconSummary.primaryCurrency)}</b>
                    <span>Saved vs standard 15% platform fee</span>
                  </div>
                </div>

                {/* Bank Accounts Breakdown */}
                <div className="recon-section-head">
                  <div>
                    <h3 className="section-title" style={{ marginBottom: 2 }}>
                      Breakdown by Creator Bank Account
                    </h3>
                    <p className="section-subtitle">
                      Click any account card to isolate and audit its slips below.
                    </p>
                  </div>
                  <Link to="/creator/settings#pay" className="recon-settings-link">
                    Manage Bank Accounts →
                  </Link>
                </div>

                <div className="bank-reconcile-grid">
                  {reconSummary.bankCards.length === 0 ? (
                    <div className="bank-reconcile-card empty-setup">
                      <div className="bank-card-hd">
                        <Building2 size={20} className="text-indigo-600" />
                        <div>
                          <h4>No Bank Accounts Configured</h4>
                          <small>Add up to 4 Sri Lankan or international bank accounts in Settings to track transfers per bank.</small>
                        </div>
                      </div>
                      <Link to="/creator/settings#pay" className="recon-setup-btn">
                        Configure Bank Accounts →
                      </Link>
                    </div>
                  ) : (
                    reconSummary.bankCards.map((bs) => {
                      const isSelected = reconBankFilter === bs.channelKey;
                      return (
                        <button
                          type="button"
                          key={bs.id}
                          onClick={() => setReconBankFilter(isSelected ? 'all' : bs.channelKey)}
                          className={`bank-reconcile-card clickable ${isSelected ? 'active' : ''}`}
                          title={isSelected ? 'Click to show all accounts' : `Filter audit register by ${bs.bankName}`}
                        >
                          <div className="bank-card-hd">
                            <Building2 size={20} className="text-indigo-600" />
                            <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                              <div className="bank-card-title-row">
                                <h4>{bs.bankName}</h4>
                                {bs.isPrimary && <span className="bank-primary-tag">Primary</span>}
                              </div>
                              <small>
                                {bs.maskedAccountNum}
                                {bs.accountHolder ? ` · ${bs.accountHolder}` : ''}
                                {bs.branch ? ` (${bs.branch})` : ''}
                              </small>
                            </div>
                          </div>
                          <div className="bank-card-stat">
                            <span>Verified Credited:</span>
                            <b>{formatCurrencyMap(bs.verifiedRevenueMap, reconSummary.primaryCurrency)}</b>
                          </div>
                          <div className="bank-card-footer">
                            <span>
                              Verified: <b>{bs.verifiedCount}</b>
                              {bs.pendingCount > 0 && (
                                <span className="bank-pending-tag">
                                  · {bs.pendingCount} pending ({formatCurrencyMap(bs.pendingRevenueMap, reconSummary.primaryCurrency)})
                                </span>
                              )}
                            </span>
                            <span className={`status-badge ${isSelected ? 'filtered' : 'success'}`}>
                              {isSelected ? 'Filtered ✓' : 'Active'}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}

                  {reconSummary.linkCard && (
                    <button
                      type="button"
                      onClick={() => setReconBankFilter(reconBankFilter === 'link' ? 'all' : 'link')}
                      className={`bank-reconcile-card clickable ${reconBankFilter === 'link' ? 'active' : ''}`}
                    >
                      <div className="bank-card-hd">
                        <Link2 size={20} className="text-blue-600" />
                        <div style={{ textAlign: 'left', flex: 1 }}>
                          <h4>Payment Link / Direct URL</h4>
                          <small>Online checkout &amp; direct payment links</small>
                        </div>
                      </div>
                      <div className="bank-card-stat">
                        <span>Verified Credited:</span>
                        <b>{formatCurrencyMap(reconSummary.linkCard.verifiedRevenueMap, reconSummary.primaryCurrency)}</b>
                      </div>
                      <div className="bank-card-footer">
                        <span>
                          Verified: <b>{reconSummary.linkCard.verifiedCount}</b>
                          {reconSummary.linkCard.pendingCount > 0 && (
                            <span className="bank-pending-tag"> · {reconSummary.linkCard.pendingCount} pending</span>
                          )}
                        </span>
                        <span className={`status-badge ${reconBankFilter === 'link' ? 'filtered' : 'success'}`}>
                          {reconBankFilter === 'link' ? 'Filtered ✓' : 'Online'}
                        </span>
                      </div>
                    </button>
                  )}

                  {reconSummary.unmatchedBankCard && (
                    <button
                      type="button"
                      onClick={() => setReconBankFilter(reconBankFilter === 'unmatched_bank' ? 'all' : 'unmatched_bank')}
                      className={`bank-reconcile-card clickable ${reconBankFilter === 'unmatched_bank' ? 'active' : ''}`}
                    >
                      <div className="bank-card-hd">
                        <CreditCard size={20} className="text-slate-500" />
                        <div style={{ textAlign: 'left', flex: 1 }}>
                          <h4>Other / Unlisted Bank</h4>
                          <small>Transfers to previously saved or unlisted banks</small>
                        </div>
                      </div>
                      <div className="bank-card-stat">
                        <span>Verified Credited:</span>
                        <b>{formatCurrencyMap(reconSummary.unmatchedBankCard.verifiedRevenueMap, reconSummary.primaryCurrency)}</b>
                      </div>
                      <div className="bank-card-footer">
                        <span>
                          Verified: <b>{reconSummary.unmatchedBankCard.verifiedCount}</b>
                          {reconSummary.unmatchedBankCard.pendingCount > 0 && (
                            <span className="bank-pending-tag"> · {reconSummary.unmatchedBankCard.pendingCount} pending</span>
                          )}
                        </span>
                        <span className={`status-badge ${reconBankFilter === 'unmatched_bank' ? 'filtered' : 'success'}`}>
                          {reconBankFilter === 'unmatched_bank' ? 'Filtered ✓' : 'Legacy'}
                        </span>
                      </div>
                    </button>
                  )}
                </div>

                {/* Slip Audit Trail Table */}
                <div className="rep-table-wrap">
                  <div className="table-header-bar">
                    <div>
                      <h4>Payment Slips Audit Register</h4>
                      <small className="table-count-sub">
                        Showing {displayedReconRows.length} of {filteredReconEnrollments.length} matching record{filteredReconEnrollments.length !== 1 ? 's' : ''}
                        {enrollments.length !== filteredReconEnrollments.length ? ` (${enrollments.length} total)` : ''}
                      </small>
                    </div>

                    <div className="recon-header-tools">
                      <button
                        type="button"
                        className="btn-statement-matcher"
                        onClick={() => setMatcherOpen(true)}
                      >
                        <FileCheck size={14} />
                        Statement Ref Matcher
                      </button>

                      <div className="table-search">
                        <Search size={14} />
                        <input
                          type="text"
                          placeholder="Search name, ref code, bank…"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Filter Bar */}
                  <div className="recon-filter-bar">
                    <div className="recon-status-pills">
                      <button
                        type="button"
                        className={`recon-pill ${reconStatusFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setReconStatusFilter('all')}
                      >
                        All ({enrollments.length})
                      </button>
                      <button
                        type="button"
                        className={`recon-pill ${reconStatusFilter === 'pending' ? 'active' : ''}`}
                        onClick={() => setReconStatusFilter('pending')}
                      >
                        Pending {reconSummary.pendingCount > 0 && <span className="pill-badge amber">{reconSummary.pendingCount}</span>}
                      </button>
                      <button
                        type="button"
                        className={`recon-pill ${reconStatusFilter === 'verified' ? 'active' : ''}`}
                        onClick={() => setReconStatusFilter('verified')}
                      >
                        Verified ({reconSummary.verifiedCount})
                      </button>
                      <button
                        type="button"
                        className={`recon-pill ${reconStatusFilter === 'rejected' ? 'active' : ''}`}
                        onClick={() => setReconStatusFilter('rejected')}
                      >
                        Rejected ({reconSummary.rejectedCount})
                      </button>
                      {reconSummary.expiredCount > 0 && (
                        <button
                          type="button"
                          className={`recon-pill ${reconStatusFilter === 'expired' ? 'active' : ''}`}
                          onClick={() => setReconStatusFilter('expired')}
                        >
                          Expired ({reconSummary.expiredCount})
                        </button>
                      )}
                    </div>

                    <div className="recon-selects">
                      <select
                        aria-label="Filter by bank or method"
                        className="recon-select"
                        value={reconBankFilter}
                        onChange={(e) => setReconBankFilter(e.target.value)}
                      >
                        <option value="all">All Banks &amp; Methods</option>
                        {reconSummary.bankCards.map((b) => (
                          <option key={b.id} value={b.channelKey}>
                            🏦 {b.bankName} ({b.maskedAccountNum})
                          </option>
                        ))}
                        {reconSummary.linkCard && <option value="link">🔗 Payment Link</option>}
                        {reconSummary.unmatchedBankCard && <option value="unmatched_bank">🏦 Other / Unlisted Bank</option>}
                        <option value="free_promo">🎟️ Free / 100% Promo</option>
                      </select>

                      <select
                        aria-label="Filter by course pack"
                        className="recon-select"
                        value={reconPackFilter}
                        onChange={(e) => setReconPackFilter(e.target.value)}
                      >
                        <option value="all">All Packs ({packs.length})</option>
                        {packs.map((p) => (
                          <option key={p.id} value={p.id}>
                            {formatPackTitleWithParent(p)}
                          </option>
                        ))}
                      </select>

                      {hasActiveReconFilters && (
                        <button type="button" className="recon-clear-btn" onClick={clearReconFilters}>
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="rep-table-scroll">
                    <table className="rep-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Course Pack</th>
                          <th>Method / Bank</th>
                          <th>Slip Ref &amp; Proof</th>
                          <th>Amount</th>
                          <th>Status &amp; Audit</th>
                          <th>Date</th>
                          <th className="recon-actions-col">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedReconRows.map((enr) => {
                          const s = getStudentInfo(enr);
                          const packObj = packMap.get(enr.pack_id);
                          const paymentInfo = classifyEnrollmentPayment(enr, packObj);
                          const refCode = getEnrollmentRefCode(enr);
                          const isConf = isConfirmedStatus(enr.status);
                          const isPending = enr.status === 'pending';
                          const isChecked = reconciledIds.includes(enr.id);
                          const isBusy = processingId === enr.id || processingId === 'bulk';
                          const dateVal = getEnrollmentDate(enr);

                          return (
                            <tr key={enr.id} className={isPending ? 'recon-row-pending' : ''}>
                              <td>
                                <b>{s.name}</b>
                                <small>{s.email || s.phone || 'N/A'}</small>
                              </td>
                              <td>
                                <span>{formatPackTitleWithParent(packObj)}</span>
                                {paymentInfo.promoCode && (
                                  <small className="recon-promo-tag">🏷️ {paymentInfo.promoCode}</small>
                                )}
                              </td>
                              <td>
                                <span className={`method-badge ${paymentInfo.kind}`}>
                                  {paymentInfo.kind === 'bank' && '🏦 '}
                                  {paymentInfo.kind === 'link' && '🔗 '}
                                  {(paymentInfo.kind === 'free' || paymentInfo.kind === 'promo') && '🎟️ '}
                                  {paymentInfo.bankName || paymentInfo.label}
                                </span>
                              </td>
                              <td>
                                <div className="slip-ref-wrap">
                                  <code className="slip-ref">{refCode}</code>
                                  <button
                                    type="button"
                                    className="slip-copy-btn"
                                    onClick={() => handleCopyRef(refCode, enr.id)}
                                    title="Copy reference code"
                                  >
                                    {copiedRefId === enr.id ? <Check size={12} /> : <Copy size={12} />}
                                  </button>
                                </div>
                                <div style={{ marginTop: 5 }}>
                                  {enr.payment_screenshot_url ? (
                                    <button
                                      type="button"
                                      className="slip-proof-btn"
                                      onClick={() => {
                                        setSlipImgError(false);
                                        setSlipModalEnr(enr);
                                      }}
                                    >
                                      <Eye size={12} /> View Slip Proof
                                    </button>
                                  ) : (
                                    <small className="text-gray-400">
                                      {paymentInfo.isFree ? 'No slip required' : 'No slip uploaded'}
                                    </small>
                                  )}
                                </div>
                              </td>
                              <td>
                                <b>
                                  {paymentInfo.isFree && paymentInfo.amount === 0
                                    ? 'FREE'
                                    : `${paymentInfo.currency} ${Number(paymentInfo.amount).toLocaleString()}`}
                                </b>
                              </td>
                              <td>
                                <div className="recon-status-cell">
                                  <span className={`status-pill ${isConf ? 'confirmed' : enr.status}`}>
                                    {isConf ? 'Verified' : enr.status}
                                  </span>
                                  {!paymentInfo.isFree && (
                                    <button
                                      type="button"
                                      className={`recon-check-pill ${isChecked ? 'checked' : ''}`}
                                      onClick={() => toggleStatementChecked(enr.id)}
                                      title="Toggle statement verified mark"
                                    >
                                      {isChecked ? '✓ Statement Checked' : 'Mark Checked'}
                                    </button>
                                  )}
                                  {enr.rejection_reason && (
                                    <small className="recon-rej-note" title={enr.rejection_reason}>
                                      {enr.rejection_reason}
                                    </small>
                                  )}
                                </div>
                              </td>
                              <td>{formatDateDisplay(dateVal)}</td>
                              <td className="recon-actions-col">
                                <div className="recon-row-actions">
                                  {isPending ? (
                                    <>
                                      <button
                                        type="button"
                                        className="recon-act-approve"
                                        disabled={isBusy}
                                        onClick={() => handleApproveEnrollment(enr)}
                                        title="Verify slip and grant course access"
                                      >
                                        {processingId === enr.id ? (
                                          <Loader2 size={13} className="animate-spin" />
                                        ) : (
                                          <Check size={13} />
                                        )}
                                        Approve
                                      </button>
                                      <button
                                        type="button"
                                        className="recon-act-reject"
                                        disabled={isBusy}
                                        onClick={() => {
                                          setRejectReason('');
                                          setRejectTarget(enr);
                                        }}
                                        title="Reject slip with reason"
                                      >
                                        <X size={13} />
                                        Reject
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      className="recon-act-view"
                                      onClick={() => {
                                        setSlipImgError(false);
                                        setSlipModalEnr(enr);
                                      }}
                                      title="Inspect slip & reconciliation details"
                                    >
                                      <Eye size={13} /> Inspect
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {displayedReconRows.length === 0 && (
                          <tr>
                            <td colSpan={8} className="text-center py-8 text-gray-500">
                              {enrollments.length === 0
                                ? 'No enrollments or bank slips recorded yet.'
                                : 'No slips match the selected filters.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  {filteredReconEnrollments.length > RECON_PAGE_SIZE && (
                    <div className="recon-pagination">
                      <div className="recon-page-info">
                        {showAllRows
                          ? `Showing all ${filteredReconEnrollments.length} records`
                          : `Page ${safeReconPage} of ${totalReconPages} · ${filteredReconEnrollments.length} records`}
                      </div>
                      <div className="recon-page-controls">
                        {!showAllRows && (
                          <>
                            <button
                              type="button"
                              className="recon-page-btn"
                              disabled={safeReconPage <= 1}
                              onClick={() => setReconPage((p) => Math.max(1, p - 1))}
                            >
                              <ChevronLeft size={14} /> Prev
                            </button>
                            <button
                              type="button"
                              className="recon-page-btn"
                              disabled={safeReconPage >= totalReconPages}
                              onClick={() => setReconPage((p) => Math.min(totalReconPages, p + 1))}
                            >
                              Next <ChevronRight size={14} />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className="recon-page-btn"
                          onClick={() => setShowAllRows((prev) => !prev)}
                        >
                          {showAllRows ? `Paginate (${RECON_PAGE_SIZE}/page)` : `Show All (${filteredReconEnrollments.length})`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: TUITION ATTENDANCE REGISTER */}
            {activeTab === 'attendance' && (
              <div className="rep-tab-content">
                <div className="rep-filter-bar">
                  <div className="filter-group">
                    <label>Filter by Course Pack:</label>
                    <select value={selectedPackFilter} onChange={(e) => setSelectedPackFilter(e.target.value)}>
                      <option value="all">All Packs &amp; Batches ({packs.length})</option>
                      {packs.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="rep-table-wrap">
                  <div className="table-header-bar">
                    <h4>Tuition Student Register &amp; Attendance Check</h4>
                    <small>Showing verified enrolled students ({verifiedEnrollments.length})</small>
                  </div>

                  <table className="rep-table">
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Phone / WhatsApp</th>
                        <th>Pack Title</th>
                        <th>Enrollment Status</th>
                        <th>Classroom Access</th>
                        <th>Direct Contact</th>
                      </tr>
                    </thead>
                    <tbody>
                      {verifiedEnrollments
                        .filter((e) => selectedPackFilter === 'all' || e.pack_id === selectedPackFilter)
                        .map((enr) => {
                          const s = getStudentInfo(enr);
                          const packObj = packMap.get(enr.pack_id);
                          const waClean = formatWhatsAppPhone(s.phone);
                          return (
                            <tr key={enr.id}>
                              <td>
                                <b>{s.name}</b>
                                <small>{s.email || 'N/A'}</small>
                              </td>
                              <td>
                                {waClean ? (
                                  <a
                                    href={`https://wa.me/${waClean}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="wa-chip"
                                  >
                                    <MessageCircle size={13} /> {s.phone}
                                  </a>
                                ) : (
                                  <span className="text-gray-400">Not provided</span>
                                )}
                              </td>
                              <td>{packObj?.title || 'Pack'}</td>
                              <td>
                                <span className="attendance-chip present">
                                  <CheckCircle2 size={13} /> Active Learner
                                </span>
                              </td>
                              <td>
                                <span className="status-pill confirmed">Unlocked</span>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="btn-quick-ping"
                                  onClick={() => handleSendWhatsAppNudge(enr)}
                                  title="Send WhatsApp check-in and dashboard notification"
                                >
                                  Nudge 🔔
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      {verifiedEnrollments.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-gray-500">
                            No verified students enrolled yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: COHORT RETENTION & DROP-OFF */}
            {activeTab === 'retention' && (
              <div className="rep-tab-content">
                {multiPacks.length > 0 && (
                  <div className="cohort-filter-bar">
                    <div className="filter-group">
                      <label>Cohort Course Series:</label>
                      <select
                        value={selectedCohortPackId}
                        onChange={(e) => setSelectedCohortPackId(e.target.value)}
                      >
                        <option value="all">All Courses Combined</option>
                        {multiPacks.map((mp) => (
                          <option key={mp.id} value={mp.id}>
                            {mp.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <small className="cohort-mode-hint">
                      {usingBatchSeries
                        ? `Tracking progression across ${cohortBatches.length} batch stages`
                        : 'Showing overall cross-course student retention'}
                    </small>
                  </div>
                )}

                <div className="cohort-banner">
                  <div className="cohort-info">
                    <div className="cohort-badge">
                      <TrendingUp size={14} />
                      Live Cohort Progression Analytics
                    </div>
                    <h3>{cohortTitle}</h3>
                    <p>{retentionSubtitle}</p>
                    <div className="cohort-kpi-sub">
                      <span>
                        Total Audience: <b>{totalUniqueLearners}</b> students
                      </span>
                      <span>
                        Active Batches: <b>{cohortPacksToUse.length}</b>
                      </span>
                      <span>
                        Average Drop-off: <b>{(100 - overallRetentionRate).toFixed(1)}%</b>
                      </span>
                    </div>
                  </div>
                  <div className="cohort-stat-pill">
                    <b>{overallRetentionRate}%</b>
                    <span>Cohort Retention Rate</span>
                  </div>
                </div>

                <h3 className="section-title">Batch &amp; Month Progression Sequence</h3>
                {stagesWithStats.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">
                    <p>No packs or batches created yet. Create a multi-pack with monthly sub-packs to track progression.</p>
                  </div>
                ) : (
                  <div className="cohort-grid">
                    {stagesWithStats.map((stage, idx) => {
                      const isBase = idx === 0;
                      const barColor = idx === 0 ? '#10b981' : idx === 1 ? '#6366f1' : '#8b5cf6';
                      return (
                        <div key={stage.id} className="cohort-card">
                          <div className="cohort-card-top">
                            <h4>{stage.title}</h4>
                            <span className="cohort-stage-tag">{isBase ? 'Month 01 (Base)' : `Month 0${idx + 1}`}</span>
                          </div>
                          <div className="cohort-num">
                            {stage.count} {stage.count === 1 ? 'Student' : 'Students'}
                          </div>
                          <div className="cohort-progress-bar">
                            <div
                              className="fill"
                              style={{
                                width: `${Math.min(100, Math.max(stage.pct, stage.count > 0 ? 5 : 0))}%`,
                                background: barColor,
                              }}
                            />
                          </div>
                          <div className="cohort-card-meta">
                            <small>{isBase ? '100% Started' : `${stage.pct}% Retained from Month 1`}</small>
                            {!isBase && stage.dropped > 0 && (
                              <span className="dropped-pill">-{stage.dropped} drop-off</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="at-risk-header">
                  <div>
                    <h3 className="section-title" style={{ margin: 0 }}>
                      Drop-off &amp; At-Risk Students Queue
                    </h3>
                    <p className="section-subtitle">
                      Learners who haven&apos;t renewed for the next batch or have been inactive. Send a direct WhatsApp nudge or in-app upgrade invitation.
                    </p>
                  </div>
                  <span className="at-risk-count-badge">{atRiskList.length} students need re-engagement</span>
                </div>

                <div className="rep-table-wrap">
                  <table className="rep-table">
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Last Enrolled Pack</th>
                        <th>Days Inactive</th>
                        <th>Retention Status</th>
                        <th>Quick Re-engage &amp; Upgrade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {atRiskList.map((item, i) => (
                        <tr key={i}>
                          <td>
                            <b>{item.studentInfo.name}</b>
                            <small>{item.studentInfo.email || item.studentInfo.phone || 'N/A'}</small>
                          </td>
                          <td>{item.packTitle}</td>
                          <td>
                            <span className={`days-pill ${item.daysSince >= 14 ? 'high' : 'med'}`}>
                              <Clock size={12} /> {item.daysText}
                            </span>
                          </td>
                          <td>
                            <span className={`status-pill ${item.statusType}`}>{item.status}</span>
                          </td>
                          <td>
                            <div className="retention-actions-cell">
                              <button
                                type="button"
                                className="btn-wa-nudge"
                                onClick={() => handleSendWhatsAppNudge(item.enrollment)}
                                title="Open WhatsApp chat and send in-app dashboard reminder"
                              >
                                <MessageCircle size={13} /> Send WhatsApp 💬
                              </button>
                              <button
                                type="button"
                                className="btn-upgrade-nudge"
                                onClick={() => handleSendUpgrade(item.enrollment)}
                                title="Deliver next batch upgrade invitation to student"
                              >
                                <Rocket size={13} /> Upgrade 🚀
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {atRiskList.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-gray-500">
                            {verifiedEnrollments.length === 0
                              ? 'No enrolled students recorded yet.'
                              : '🎉 Outstanding retention! Zero dropped-off students detected.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: STUDENT DISPUTE & SOS DESK */}
            {activeTab === 'disputes' && (
              <div className="rep-tab-content">
                <div className="dispute-overview-bar">
                  <div>
                    <h4>Live Classroom SOS &amp; Slip Appeals Queue</h4>
                    <p>Verify bank slips, grant instant classroom access, resolve student tickets, and send compensation upgrades.</p>
                  </div>
                  <button
                    type="button"
                    className="rep-btn-sec"
                    onClick={() => loadData({ showSkeleton: false })}
                    title="Refresh reports list"
                  >
                    <RefreshCw size={14} /> Refresh Queue
                  </button>
                </div>

                <div className="dispute-filter-bar">
                  <button
                    type="button"
                    className={`dispute-filter-pill ${disputeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setDisputeFilter('all')}
                  >
                    All Reports ({reports.length})
                  </button>
                  <button
                    type="button"
                    className={`dispute-filter-pill ${disputeFilter === 'open' ? 'active' : ''}`}
                    onClick={() => setDisputeFilter('open')}
                  >
                    Open / Action Required ({openReports.length})
                  </button>
                  <button
                    type="button"
                    className={`dispute-filter-pill ${disputeFilter === 'slip_appeal' ? 'active' : ''}`}
                    onClick={() => setDisputeFilter('slip_appeal')}
                  >
                    🏦 Slip Appeals ({slipReports.length})
                  </button>
                  <button
                    type="button"
                    className={`dispute-filter-pill ${disputeFilter === 'resolved' ? 'active' : ''}`}
                    onClick={() => setDisputeFilter('resolved')}
                  >
                    ✅ Resolved ({resolvedReports.length})
                  </button>
                </div>

                {filteredReports.length === 0 ? (
                  <div className="dispute-empty-state">
                    <ShieldCheck size={48} className="mx-auto text-emerald-500 mb-3" />
                    <h4 className="font-bold text-gray-800 text-lg">
                      {disputeFilter === 'all' ? 'Clean Record!' : 'No Matching Reports'}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {disputeFilter === 'all'
                        ? 'Zero student disputes or live link SOS tickets active in your queue.'
                        : `No reports found for filter "${disputeFilter}".`}
                    </p>
                  </div>
                ) : (
                  <div className="disputes-list">
                    {filteredReports.map((rep) => {
                      const studentPhone = rep.student_phone || rep.studentPhone || '';
                      const hasSlipAppeal = rep.report_type === 'slip_appeal' || rep.bank_ref_number;
                      const isResolved = rep.status === 'resolved' || rep.status === 'dismissed';

                      return (
                        <div key={rep.id} className={`dispute-card ${rep.status}`}>
                          <div className="dispute-card-hd">
                            <div className="dispute-type-pill" data-type={rep.report_type}>
                              {rep.report_type === 'live_sos' && '🚨 Live Link SOS'}
                              {rep.report_type === 'slip_appeal' && '🏦 Slip Verification Appeal'}
                              {rep.report_type === 'missing_recording' && '⏳ Missing Recording'}
                              {rep.report_type === 'quality_issue' && '⚠️ Quality Issue'}
                            </div>
                            <span className="dispute-time">
                              {new Date(rep.created_at || Date.now()).toLocaleString()}
                            </span>
                          </div>

                          <div className="dispute-body">
                            <h5>
                              {rep.pack_title} {rep.session_title && `· ${rep.session_title}`}
                            </h5>
                            <p className="dispute-desc">&ldquo;{rep.issue_details}&rdquo;</p>

                            {hasSlipAppeal && (
                              <div className="dispute-ref-box">
                                <span>
                                  Bank Reference Code: <code className="slip-ref">{rep.bank_ref_number || 'N/A'}</code>
                                </span>
                                {rep.proof_screenshot_url && (
                                  <a
                                    href={rep.proof_screenshot_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="proof-link"
                                  >
                                    View Attached Slip Proof <ExternalLink size={12} />
                                  </a>
                                )}
                              </div>
                            )}

                            <div className="dispute-student-meta">
                              <span>
                                Reported by: <b>{rep.student_name}</b> ({rep.student_email || 'No email'})
                              </span>
                              {studentPhone && (
                                <span className="student-phone-pill">
                                  <MessageCircle size={12} /> {studentPhone}
                                </span>
                              )}
                            </div>

                            {rep.resolution_notes && (
                              <div className="dispute-resolution-note">
                                <CheckCircle2 size={13} className="text-emerald-500" />
                                <span>Resolution: {rep.resolution_notes}</span>
                              </div>
                            )}
                          </div>

                          <div className="dispute-footer">
                            <span className={`status-pill ${rep.status}`}>
                              Status: {rep.status.toUpperCase()}
                            </span>

                            <div className="dispute-actions">
                              {rep.status === 'open' && (
                                <>
                                  {hasSlipAppeal && (
                                    <button
                                      type="button"
                                      className="btn-approve-slip"
                                      disabled={actionLoading}
                                      onClick={() => handleVerifySlipAndActivate(rep)}
                                      title="Instantly approve bank slip and activate student enrollment"
                                    >
                                      <Check size={14} /> Verify Slip &amp; Activate Student 🚀
                                    </button>
                                  )}
                                  {studentPhone && (
                                    <button
                                      type="button"
                                      className="btn-wa-direct"
                                      onClick={() => handleDirectWhatsAppStudent(rep)}
                                      title="Open WhatsApp chat with student"
                                    >
                                      <MessageCircle size={13} /> Chat on WhatsApp
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="btn-resolve"
                                    disabled={actionLoading}
                                    onClick={() => handleResolveReport(rep.id, 'resolved')}
                                  >
                                    <CheckCircle2 size={14} /> Mark Resolved
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-dismiss"
                                    disabled={actionLoading}
                                    onClick={() => handleResolveReport(rep.id, 'dismissed')}
                                  >
                                    <XCircle size={14} /> Dismiss
                                  </button>
                                </>
                              )}

                              {isResolved && (
                                <button
                                  type="button"
                                  className="btn-upgrade-bonus"
                                  disabled={actionLoading}
                                  onClick={() => handleOfferDisputeBonus(rep)}
                                  title="Send resolution bonus / extension directly to student dashboard"
                                >
                                  <Gift size={13} /> Offer Compensation Bonus 🎁
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* MODAL 1: SLIP PROOF & RECONCILIATION INSPECTOR */}
        {slipModalEnr && (() => {
          const s = getStudentInfo(slipModalEnr);
          const packObj = packMap.get(slipModalEnr.pack_id);
          const paymentInfo = classifyEnrollmentPayment(slipModalEnr, packObj);
          const { bankAccount } = matchEnrollmentToChannel(slipModalEnr, bankAccounts, packObj);
          const refCode = getEnrollmentRefCode(slipModalEnr);
          const isConf = isConfirmedStatus(slipModalEnr.status);
          const isPending = slipModalEnr.status === 'pending';
          const isChecked = reconciledIds.includes(slipModalEnr.id);
          const waClean = formatWhatsAppPhone(s.phone);
          const isBusy = processingId === slipModalEnr.id;

          return (
            <div
              className="recon-modal-backdrop"
              role="dialog"
              aria-modal="true"
              onClick={() => setSlipModalEnr(null)}
            >
              <div className="recon-modal-card large" onClick={(e) => e.stopPropagation()}>
                <div className="recon-modal-hd">
                  <div>
                    <h3>Bank Slip Inspection · {s.name}</h3>
                    <p>{formatPackTitleWithParent(packObj)}</p>
                  </div>
                  <button
                    type="button"
                    className="recon-modal-close"
                    onClick={() => setSlipModalEnr(null)}
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="recon-proof-layout">
                  {/* Left: Slip Image */}
                  <div className="recon-proof-img-box">
                    {slipModalEnr.payment_screenshot_url && !slipImgError ? (
                      <>
                        <img
                          src={slipModalEnr.payment_screenshot_url}
                          alt={`Payment slip from ${s.name}`}
                          onError={() => setSlipImgError(true)}
                        />
                        <a
                          href={slipModalEnr.payment_screenshot_url}
                          target="_blank"
                          rel="noreferrer"
                          className="recon-open-orig"
                        >
                          Open full resolution <ExternalLink size={12} />
                        </a>
                      </>
                    ) : (
                      <div className="recon-no-img">
                        <Building2 size={36} className="text-slate-400" />
                        <p>
                          {slipImgError
                            ? 'Could not render slip image preview inline.'
                            : 'No payment screenshot uploaded for this enrollment.'}
                        </p>
                        {slipModalEnr.payment_screenshot_url && (
                          <a
                            href={slipModalEnr.payment_screenshot_url}
                            target="_blank"
                            rel="noreferrer"
                            className="recon-open-orig"
                          >
                            Open Slip Link <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: Audit Details */}
                  <div className="recon-proof-details">
                    <div className="recon-detail-grid">
                      <div>
                        <small>Student</small>
                        <b>{s.name}</b>
                        <span>{s.email || 'No email'}</span>
                      </div>
                      <div>
                        <small>Amount Due / Paid</small>
                        <b className="text-lg">
                          {paymentInfo.isFree && paymentInfo.amount === 0
                            ? 'FREE'
                            : `${paymentInfo.currency} ${Number(paymentInfo.amount).toLocaleString()}`}
                        </b>
                        {paymentInfo.promoCode && <span>Promo: {paymentInfo.promoCode}</span>}
                      </div>
                      <div>
                        <small>Reference Code</small>
                        <div className="slip-ref-wrap">
                          <code className="slip-ref">{refCode}</code>
                          <button
                            type="button"
                            className="slip-copy-btn"
                            onClick={() => handleCopyRef(refCode, slipModalEnr.id)}
                          >
                            {copiedRefId === slipModalEnr.id ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <small>Bank / Channel</small>
                        <b>{paymentInfo.bankName || paymentInfo.label}</b>
                        {bankAccount?.account_number && (
                          <span>Acct: {bankAccount.account_number}</span>
                        )}
                      </div>
                      <div>
                        <small>Submitted</small>
                        <b>{formatDateDisplay(getEnrollmentDate(slipModalEnr))}</b>
                      </div>
                      <div>
                        <small>Status</small>
                        <span className={`status-pill ${isConf ? 'confirmed' : slipModalEnr.status}`}>
                          {isConf ? 'Verified' : slipModalEnr.status}
                        </span>
                      </div>
                    </div>

                    {slipModalEnr.rejection_reason && (
                      <div className="recon-modal-rej-box">
                        <b>Rejection Reason:</b> {slipModalEnr.rejection_reason}
                      </div>
                    )}

                    <div className="recon-modal-extras">
                      {!paymentInfo.isFree && (
                        <button
                          type="button"
                          className={`recon-check-pill ${isChecked ? 'checked' : ''}`}
                          onClick={() => toggleStatementChecked(slipModalEnr.id)}
                        >
                          {isChecked ? '✓ Statement Checked' : 'Mark Statement Checked'}
                        </button>
                      )}
                      {waClean && (
                        <a
                          href={`https://wa.me/${waClean}`}
                          target="_blank"
                          rel="noreferrer"
                          className="wa-chip"
                        >
                          <MessageCircle size={13} /> WhatsApp ({s.phone})
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="recon-modal-foot">
                  <button
                    type="button"
                    className="btn-dismiss"
                    onClick={() => setSlipModalEnr(null)}
                  >
                    Close
                  </button>

                  <div className="recon-modal-foot-right">
                    {isPending && (
                      <button
                        type="button"
                        className="recon-act-reject lg"
                        disabled={isBusy}
                        onClick={() => {
                          setRejectReason('');
                          setRejectTarget(slipModalEnr);
                        }}
                      >
                        <XCircle size={15} /> Reject Slip
                      </button>
                    )}

                    {!isConf && (
                      <button
                        type="button"
                        className="recon-act-approve lg"
                        disabled={isBusy}
                        onClick={() => handleApproveEnrollment(slipModalEnr)}
                      >
                        {isBusy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                        {isPending ? 'Approve & Grant Access' : 'Override & Approve Access'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* MODAL 2: REJECT PAYMENT REASON */}
        {rejectTarget && (() => {
          const s = getStudentInfo(rejectTarget);
          const isBusy = processingId === rejectTarget.id;
          return (
            <div
              className="recon-modal-backdrop"
              role="dialog"
              aria-modal="true"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason('');
              }}
            >
              <div className="recon-modal-card small" onClick={(e) => e.stopPropagation()}>
                <div className="recon-modal-hd">
                  <div>
                    <h3>Reject Bank Slip · {s.name}</h3>
                    <p>Provide a clear reason so the learner can upload a corrected slip.</p>
                  </div>
                  <button
                    type="button"
                    className="recon-modal-close"
                    onClick={() => {
                      setRejectTarget(null);
                      setRejectReason('');
                    }}
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="recon-reject-chips">
                  {QUICK_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`recon-reject-chip ${rejectReason === r ? 'active' : ''}`}
                      onClick={() => setRejectReason(r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <textarea
                  className="recon-reject-textarea"
                  placeholder="Optional custom note for the student…"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />

                <div className="recon-modal-foot">
                  <button
                    type="button"
                    className="btn-dismiss"
                    onClick={() => {
                      setRejectTarget(null);
                      setRejectReason('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="recon-act-reject lg"
                    disabled={isBusy}
                    onClick={handleRejectEnrollment}
                  >
                    {isBusy ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                    Confirm Rejection
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* MODAL 3: BANK STATEMENT REFERENCE MATCHER */}
        {matcherOpen && (
          <div
            className="recon-modal-backdrop"
            role="dialog"
            aria-modal="true"
            onClick={() => setMatcherOpen(false)}
          >
            <div className="recon-modal-card large" onClick={(e) => e.stopPropagation()}>
              <div className="recon-modal-hd">
                <div>
                  <h3>Bank Statement Reference Matcher</h3>
                  <p>
                    Paste bank statement lines, SMS alerts, or CSV rows containing transfer reference codes (e.g. LORA_NIMAL_4821) to match pending slips instantly.
                  </p>
                </div>
                <button
                  type="button"
                  className="recon-modal-close"
                  onClick={() => setMatcherOpen(false)}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="matcher-controls">
                <label>
                  <span>Match Against Bank:</span>
                  <select
                    className="recon-select"
                    value={statementBankFilter}
                    onChange={(e) => setStatementBankFilter(e.target.value)}
                  >
                    <option value="all">All Banks &amp; Methods</option>
                    {reconSummary.bankCards.map((b) => (
                      <option key={b.id} value={b.channelKey}>
                        🏦 {b.bankName} ({b.maskedAccountNum})
                      </option>
                    ))}
                  </select>
                </label>
                {statementText && (
                  <button
                    type="button"
                    className="recon-clear-btn"
                    onClick={() => setStatementText('')}
                  >
                    Clear Text
                  </button>
                )}
              </div>

              <textarea
                className="matcher-textarea"
                rows={5}
                placeholder={'Paste statement rows here…\nExample:\n11/11/2026 IBFT CR LORA_NIMAL_4821 5,000.00\n11/11/2026 CEFT REF LORA-KASUN-9102 3,500.00'}
                value={statementText}
                onChange={(e) => setStatementText(e.target.value)}
              />

              {statementText.trim() && (
                <div className="matcher-results">
                  <div className="matcher-summary-grid">
                    <div className="matcher-stat ok">
                      <b>{statementMatchResult.matchedPending.length}</b>
                      <span>Pending Slips Matched</span>
                    </div>
                    <div className="matcher-stat info">
                      <b>{statementMatchResult.matchedVerified.length}</b>
                      <span>Already Verified</span>
                    </div>
                    <div className="matcher-stat warn">
                      <b>{statementMatchResult.unmatchedPending.length}</b>
                      <span>Pending Not Found</span>
                    </div>
                    <div className="matcher-stat muted">
                      <b>{statementMatchResult.unrecognizedRefs.length}</b>
                      <span>Unknown LORA Refs</span>
                    </div>
                  </div>

                  {statementMatchResult.matchedPending.length > 0 && (
                    <div className="matcher-section">
                      <div className="matcher-section-hd">
                        <h4>Matched Pending Slips Ready to Approve</h4>
                        {statementMatchResult.matchedPending.some((m) => m.matchType === 'exact') && (
                          <button
                            type="button"
                            className="recon-act-approve"
                            disabled={processingId === 'bulk'}
                            onClick={() =>
                              handleBulkApproveMatched(
                                statementMatchResult.matchedPending.filter((m) => m.matchType === 'exact')
                              )
                            }
                          >
                            {processingId === 'bulk' ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={13} />
                            )}
                            Approve All Exact Matches (
                            {statementMatchResult.matchedPending.filter((m) => m.matchType === 'exact').length})
                          </button>
                        )}
                      </div>

                      <div className="matcher-list">
                        {statementMatchResult.matchedPending.map((item) => {
                          const s = getStudentInfo(item.enrollment);
                          return (
                            <div key={item.enrollment.id} className="matcher-item">
                              <div>
                                <b>{s.name}</b> · <span>{item.packObj?.title || 'Course'}</span>
                                <div className="matcher-item-meta">
                                  <code className="slip-ref">{item.refCode}</code>
                                  <span>{item.info.bankName || item.info.label}</span>
                                  <b>{item.info.currency} {Number(item.info.amount).toLocaleString()}</b>
                                  <span className={`match-type-tag ${item.matchType}`}>
                                    {item.matchType === 'exact' ? 'Exact Ref Match' : '4-Digit Suffix (Verify Slip)'}
                                  </span>
                                </div>
                              </div>
                              <div className="recon-row-actions">
                                {item.enrollment.payment_screenshot_url && (
                                  <button
                                    type="button"
                                    className="recon-act-view"
                                    onClick={() => {
                                      setSlipImgError(false);
                                      setSlipModalEnr(item.enrollment);
                                    }}
                                  >
                                    <Eye size={13} /> Slip
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="recon-act-approve"
                                  disabled={processingId === item.enrollment.id || processingId === 'bulk'}
                                  onClick={() => handleApproveEnrollment(item.enrollment)}
                                >
                                  <Check size={13} /> Approve
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {statementMatchResult.matchedVerified.length > 0 && (
                    <div className="matcher-section">
                      <div className="matcher-section-hd">
                        <h4>Already Verified Slips Found in Statement ({statementMatchResult.matchedVerified.length})</h4>
                        <button
                          type="button"
                          className="recon-act-view"
                          onClick={() => {
                            markManyStatementChecked(statementMatchResult.matchedVerified.map((m) => m.enrollment.id));
                            showToast('Marked matched verified slips as Statement Checked!');
                          }}
                        >
                          <Check size={13} /> Mark All Checked
                        </button>
                      </div>
                    </div>
                  )}

                  {statementMatchResult.unrecognizedRefs.length > 0 && (
                    <div className="matcher-unrecognized">
                      <b>Unmatched LORA codes in statement:</b>{' '}
                      {statementMatchResult.unrecognizedRefs.map((code) => (
                        <code key={code} className="slip-ref" style={{ marginRight: 6 }}>
                          {code}
                        </code>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="recon-modal-foot">
                <button type="button" className="btn-dismiss" onClick={() => setMatcherOpen(false)}>
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
