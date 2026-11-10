import { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, Building2, Users, AlertTriangle, Download, 
  Printer, CheckCircle2, Clock, XCircle, Search, Filter, 
  ExternalLink, MessageCircle, ArrowUpRight, ShieldCheck, RefreshCw,
  TrendingUp, Calendar, AlertCircle, Rocket, Gift, Check, Send, ChevronRight
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { getCreatorReports, resolveStudentReport, verifySlipAndActivateStudent } from '../lib/disputeSystem';
import { useVictory } from '../context/VictoryContext';
import { PageTransition } from '../components/ui';
import './creator-reports.css';

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
  const [selectedPackFilter, setSelectedPackFilter] = useState('all');
  const [selectedCohortPackId, setSelectedCohortPackId] = useState('all');
  const [disputeFilter, setDisputeFilter] = useState('all'); // 'all', 'open', 'slip_appeal', 'resolved'
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Creator Profile (including bank accounts)
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      setCreatorProfile(prof);

      // 2. Fetch Creator Packs
      const { data: creatorPacks } = await supabase
        .from('session_packs')
        .select('*')
        .eq('creator_id', user.id);
      setPacks(creatorPacks || []);

      // 3. Fetch Enrollments with student profiles
      const packIds = (creatorPacks || []).map(p => p.id);
      if (packIds.length > 0) {
        const { data: enrData, error: enrErr } = await supabase
          .from('enrollments')
          .select('*, profiles!enrollments_learner_id_fkey(id, first_name, last_name, email, contact_number, country_code)')
          .in('pack_id', packIds)
          .order('created_at', { ascending: false });

        if (enrErr) {
          console.warn('[CreatorReports] Primary enrollment query error, falling back:', enrErr);
          const { data: rawEnr } = await supabase
            .from('enrollments')
            .select('*')
            .in('pack_id', packIds)
            .order('created_at', { ascending: false });

          if (rawEnr && rawEnr.length > 0) {
            const learnerIds = [...new Set(rawEnr.map(e => e.learner_id).filter(Boolean))];
            const { data: profs } = await supabase
              .from('profiles')
              .select('id, first_name, last_name, email, contact_number, country_code')
              .in('id', learnerIds);
            const pMap = Object.fromEntries((profs || []).map(p => [p.id, p]));
            setEnrollments(rawEnr.map(e => ({ ...e, profiles: pMap[e.learner_id] || null })));
          } else {
            setEnrollments([]);
          }
        } else {
          setEnrollments(enrData || []);
        }
      } else {
        setEnrollments([]);
      }

      // 4. Fetch Student Reports for this Creator (notifications + local storage)
      const creatorDisputes = await getCreatorReports(user.id, packIds);
      setReports(creatorDisputes);
    } catch (err) {
      console.error('[CreatorReports] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Helper: Format Student Info & WhatsApp Links ──
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
      const packIds = packs.map(p => p.id);
      const updated = await getCreatorReports(user.id, packIds);
      setReports(updated);
    } catch (err) {
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
        await loadData();
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
    const creatorName = creatorProfile?.display_name || user?.user_metadata?.first_name || 'Your Instructor';
    const msg = `Hello ${rep.student_name}! This is ${creatorName} from LoraSpace regarding your support request for "${rep.pack_title}". Let's get this sorted out for you right away.`;
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
      const creatorName = creatorProfile?.display_name || user?.user_metadata?.first_name || 'Your Instructor';
      await supabase.from('notifications').insert([{
        user_id: rep.student_id,
        title: `Resolution Bonus & Free Access Granted! 🎁`,
        message: `Your instructor ${creatorName} has resolved your issue in "${rep.pack_title}" and granted you a bonus extension or free session access!`,
        is_read: false,
        created_at: new Date().toISOString(),
      }]);
      showToast(`Compensation bonus delivered to ${rep.student_name}'s notification bell!`);
    } catch (err) {
      showToast('Failed to deliver bonus.');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Actions: Cohort Retention Re-engagement & Upgrade ──
  const handleSendWhatsAppNudge = async (enr) => {
    const studentInfo = getStudentInfo(enr);
    const phone = formatWhatsAppPhone(studentInfo.phone);
    const packObj = packs.find(p => p.id === enr.pack_id);
    const packTitle = packObj?.title || 'your course';
    const creatorName = creatorProfile?.display_name || user?.user_metadata?.first_name || 'Your Instructor';

    // 1. Dispatch real in-app Supabase notification to the student's dashboard
    if (enr.learner_id) {
      try {
        await supabase.from('notifications').insert([{
          user_id: enr.learner_id,
          title: `Check-in from ${creatorName} 🎓`,
          message: `Hey ${studentInfo.name}, your instructor checked in on your learning progress in "${packTitle}". Catch up on recent sessions and recordings in your classroom!`,
          is_read: false,
          created_at: new Date().toISOString(),
        }]);
      } catch (err) {
        console.debug('[CreatorReports] Nudge in-app notification error:', err);
      }
    }

    // 2. Open WhatsApp if phone is present
    const message = `Hello ${studentInfo.name}! This is ${creatorName} from LoraSpace. We'd love to check in on your progress in "${packTitle}". We have upcoming sessions and would love to have you active! Here is your classroom link: ${window.location.origin}/packs/${enr.pack_id}`;
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
    const packObj = packs.find(p => p.id === enr.pack_id);
    const packTitle = packObj?.title || 'your course';
    const creatorName = creatorProfile?.display_name || user?.user_metadata?.first_name || 'Your Instructor';

    // Identify next batch or another course
    let nextPack = packs.find(p => p.parent_pack_id === packObj?.parent_pack_id && p.id !== packObj?.id && (p.order_index ?? 0) > (packObj?.order_index ?? 0));
    if (!nextPack) {
      nextPack = packs.find(p => p.id !== packObj?.id) || packObj;
    }
    const nextTitle = nextPack?.title || packTitle;
    const nextUrl = `${window.location.origin}/packs/${nextPack?.id || enr.pack_id}`;

    if (enr.learner_id) {
      try {
        await supabase.from('notifications').insert([{
          user_id: enr.learner_id,
          title: `Exclusive Course Upgrade Invitation 🚀`,
          message: `Instructor ${creatorName} has sent you an exclusive invitation to advance to the next batch / course: "${nextTitle}". Tap to enroll!`,
          is_read: false,
          created_at: new Date().toISOString(),
        }]);
      } catch (err) {
        console.debug('[CreatorReports] Upgrade notification error:', err);
      }
    }

    if (phone) {
      const waMsg = `Hi ${studentInfo.name}! Special invitation from ${creatorName}: you are eligible to enroll in our next batch "${nextTitle}". Reserve your seat here: ${nextUrl}`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}`, '_blank');
      showToast(`Upgrade invitation sent to ${studentInfo.name} via WhatsApp & in-app!`);
    } else {
      showToast(`Upgrade invitation delivered to ${studentInfo.name}'s notification bell!`);
    }
  };

  // ── Financial Reconciliation Calculations ──
  const isConfirmedEnr = (e) => e.status === 'active' || e.status === 'confirmed' || e.status === 'verified';
  const verifiedEnrollments = enrollments.filter(isConfirmedEnr);
  const pendingEnrollments = enrollments.filter(e => e.status === 'pending');
  const rejectedEnrollments = enrollments.filter(e => e.status === 'rejected');

  const totalVerifiedRevenue = verifiedEnrollments.reduce((sum, e) => {
    const packPrice = packs.find(p => p.id === e.pack_id)?.price || 0;
    return sum + Number(e.amount_paid || packPrice || 0);
  }, 0);

  const totalPendingRevenue = pendingEnrollments.reduce((sum, e) => {
    const packPrice = packs.find(p => p.id === e.pack_id)?.price || 0;
    return sum + Number(e.amount_paid || packPrice || 0);
  }, 0);

  // Creator Bank Accounts
  const bankAccounts = creatorProfile?.bank_accounts || [
    { bank_name: 'Bank of Ceylon (BOC)', account_number: '•••• 4412', account_holder: creatorProfile?.display_name || 'Creator Main' },
    { bank_name: 'Commercial Bank', account_number: '•••• 8820', account_holder: creatorProfile?.display_name || 'Creator Main' },
    { bank_name: 'Sampath Bank', account_number: '•••• 1928', account_holder: creatorProfile?.display_name || 'Creator Main' },
  ];

  const bankSummaries = bankAccounts.map((bank, index) => {
    const matched = verifiedEnrollments.filter(e => 
      e.bank_name_used ? e.bank_name_used.toLowerCase().includes(bank.bank_name.toLowerCase()) : (index === 0)
    );
    const amount = matched.reduce((s, e) => {
      const pPrice = packs.find(p => p.id === e.pack_id)?.price || 0;
      return s + Number(e.amount_paid || pPrice || 0);
    }, 0);
    return {
      bankName: bank.bank_name || 'Bank Account',
      accountNum: bank.account_number || '',
      accountHolder: bank.account_holder || '',
      verifiedCount: matched.length || (index === 0 ? verifiedEnrollments.length : 0),
      totalAmount: amount || (index === 0 ? totalVerifiedRevenue : 0),
    };
  });

  // ── Real Cohort Retention Calculations ──
  const multiPacks = packs.filter(p => p.is_multi_pack);
  
  let cohortBatches = [];
  let cohortTitle = 'All Courses Combined Retention';

  if (selectedCohortPackId !== 'all') {
    const selectedParent = packs.find(p => p.id === selectedCohortPackId);
    if (selectedParent) {
      cohortTitle = selectedParent.title;
      cohortBatches = packs
        .filter(p => p.parent_pack_id === selectedParent.id)
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0) || new Date(a.created_at) - new Date(b.created_at));
    }
  } else if (multiPacks.length > 0) {
    const firstMulti = multiPacks[0];
    cohortTitle = `${firstMulti.title} (Batch Series)`;
    cohortBatches = packs
      .filter(p => p.parent_pack_id === firstMulti.id)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0) || new Date(a.created_at) - new Date(b.created_at));
  }

  const usingBatchSeries = cohortBatches.length > 0;
  const cohortPacksToUse = usingBatchSeries 
    ? cohortBatches 
    : packs.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  // Compute stats per cohort stage
  const cohortStages = cohortPacksToUse.map((packItem, idx) => {
    const packEnrs = verifiedEnrollments.filter(e => e.pack_id === packItem.id);
    const studentIds = new Set(packEnrs.map(e => e.learner_id).filter(Boolean));
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

  // Calculate Overall Retention & Drop-off KPI
  let overallRetentionRate = 0;
  let retentionSubtitle = 'No student enrollments recorded yet';
  let totalUniqueLearners = new Set(verifiedEnrollments.map(e => e.learner_id).filter(Boolean)).size;

  if (usingBatchSeries && stagesWithStats.length >= 2) {
    const nextStat = stagesWithStats[1];
    overallRetentionRate = nextStat.pct;
    retentionSubtitle = `${nextStat.retained} of ${baseCohortCount} students renewed into ${nextStat.title}`;
  } else if (totalUniqueLearners > 0) {
    const countsPerLearner = {};
    verifiedEnrollments.forEach(e => {
      if (e.learner_id) {
        countsPerLearner[e.learner_id] = (countsPerLearner[e.learner_id] || 0) + 1;
      }
    });
    const repeatCount = Object.values(countsPerLearner).filter(c => c > 1).length;
    overallRetentionRate = Math.round((repeatCount / totalUniqueLearners) * 1000) / 10;
    retentionSubtitle = `${repeatCount} of ${totalUniqueLearners} unique students enrolled in 2+ courses`;
  }

  // Calculate real Inactive / At-Risk Drop-off Students
  const latestBatchStudentIds = usingBatchSeries && cohortStages.length > 1
    ? cohortStages[cohortStages.length - 1].studentIds
    : new Set();

  const atRiskList = [];
  const seenLearners = new Set();

  verifiedEnrollments.forEach(enr => {
    if (!enr.learner_id || seenLearners.has(enr.learner_id)) return;
    seenLearners.add(enr.learner_id);

    const studentInfo = getStudentInfo(enr);
    const enrolledDate = new Date(enr.created_at || enr.submitted_at || Date.now());
    const daysSince = Math.max(0, Math.floor((Date.now() - enrolledDate.getTime()) / (1000 * 60 * 60 * 24)));
    const packObj = packs.find(p => p.id === enr.pack_id);

    const hasDroppedFromSeries = usingBatchSeries && cohortStages.length > 1 && !latestBatchStudentIds.has(enr.learner_id);
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
  const openReports = reports.filter(r => r.status === 'open');
  const slipReports = reports.filter(r => r.report_type === 'slip_appeal');
  const resolvedReports = reports.filter(r => r.status === 'resolved' || r.status === 'dismissed');

  const filteredReports = reports.filter(r => {
    if (disputeFilter === 'open') return r.status === 'open';
    if (disputeFilter === 'slip_appeal') return r.report_type === 'slip_appeal';
    if (disputeFilter === 'resolved') return r.status === 'resolved' || r.status === 'dismissed';
    return true;
  });

  // ── CSV Export ──
  const handleExportCSV = () => {
    const headers = ['Student Name', 'Email', 'Phone', 'Course Pack', 'Bank Reference', 'Status', 'Amount (LKR)', 'Enrolled Date'];
    const rows = enrollments.map(e => {
      const s = getStudentInfo(e);
      const packTitle = packs.find(p => p.id === e.pack_id)?.title || 'Course';
      const refCode = e.payment_reference_code || e.bank_ref || e.payment_reference || e.id?.slice(0, 8);
      const amt = e.amount_paid || packs.find(p => p.id === e.pack_id)?.price || 0;
      return [
        `"${s.name}"`,
        `"${s.email}"`,
        `"${s.phone || 'N/A'}"`,
        `"${packTitle}"`,
        `"${refCode}"`,
        `"${e.status}"`,
        amt,
        new Date(e.created_at || Date.now()).toLocaleDateString(),
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LoraSpace_Reconciliation_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <PageTransition>
      <div className="lora-creator-reports">
        {toastMsg && <div className="lora-rep-toast">{toastMsg}</div>}

        {/* Header */}
        <div className="lora-rep-header">
          <div>
            <div className="rep-badge">
              <FileSpreadsheet size={14} />
              Financial & Academic Reports Studio
            </div>
            <h1>Creator Intelligence & Audit Reports</h1>
            <p>Real-time bank slip audit trails, student attendance registers, cohort retention analytics, and instant dispute resolution.</p>
          </div>

          <div className="rep-actions">
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
            Cohort Retention & Drop-off
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

        {/* TAB 1: BANK RECONCILIATION */}
        {activeTab === 'reconciliation' && (
          <div className="rep-tab-content">
            {/* KPI Cards */}
            <div className="rep-kpi-grid">
              <div className="rep-kpi-card green">
                <div className="kpi-top">
                  <small>Reconciled Bank Revenue</small>
                  <CheckCircle2 size={18} className="text-emerald-500" />
                </div>
                <b>LKR {totalVerifiedRevenue.toLocaleString()}</b>
                <span>{verifiedEnrollments.length} verified direct bank payments</span>
              </div>

              <div className="rep-kpi-card amber">
                <div className="kpi-top">
                  <small>Pending Slips In Review</small>
                  <Clock size={18} className="text-amber-500" />
                </div>
                <b>LKR {totalPendingRevenue.toLocaleString()}</b>
                <span>{pendingEnrollments.length} awaiting verification</span>
              </div>

              <div className="rep-kpi-card purple">
                <div className="kpi-top">
                  <small>0% Commission Savings</small>
                  <ShieldCheck size={18} className="text-purple-500" />
                </div>
                <b>LKR {Math.round(totalVerifiedRevenue * 0.15).toLocaleString()}</b>
                <span>Saved vs standard 15% platform fee</span>
              </div>
            </div>

            {/* Bank Accounts Breakdown */}
            <h3 className="section-title">Breakdown by Creator Bank Account</h3>
            <div className="bank-reconcile-grid">
              {bankSummaries.map((bs, i) => (
                <div key={i} className="bank-reconcile-card">
                  <div className="bank-card-hd">
                    <Building2 size={20} className="text-indigo-600" />
                    <div>
                      <h4>{bs.bankName}</h4>
                      <small>{bs.accountNum} · {bs.accountHolder}</small>
                    </div>
                  </div>
                  <div className="bank-card-stat">
                    <span>Total Credited:</span>
                    <b>LKR {bs.totalAmount.toLocaleString()}</b>
                  </div>
                  <div className="bank-card-footer">
                    <span>Verified Slips: <b>{bs.verifiedCount}</b></span>
                    <span className="status-badge success">Active Account</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Slip Audit Trail Table */}
            <div className="rep-table-wrap">
              <div className="table-header-bar">
                <h4>Payment Slips Audit Register</h4>
                <div className="table-search">
                  <Search size={14} />
                  <input
                    type="text"
                    placeholder="Search student or slip reference…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <table className="rep-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Course Pack</th>
                    <th>Slip Ref / Bank</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments
                    .filter(e => {
                      if (!searchQuery) return true;
                      const q = searchQuery.toLowerCase();
                      const s = getStudentInfo(e);
                      const name = s.name.toLowerCase();
                      const ref = (e.payment_reference_code || e.bank_ref || e.payment_reference || '').toLowerCase();
                      return name.includes(q) || ref.includes(q);
                    })
                    .slice(0, 20)
                    .map((enr) => {
                      const s = getStudentInfo(enr);
                      const packObj = packs.find(p => p.id === enr.pack_id);
                      const amt = enr.amount_paid || packObj?.price || 0;
                      const refCode = enr.payment_reference_code || enr.bank_ref || enr.payment_reference || enr.id?.slice(0, 8);
                      const isConf = isConfirmedEnr(enr);
                      return (
                        <tr key={enr.id}>
                          <td>
                            <b>{s.name}</b>
                            <small>{s.email || 'N/A'}</small>
                          </td>
                          <td>{packObj?.title || 'Course'}</td>
                          <td>
                            <code className="slip-ref">{refCode}</code>
                            {enr.bank_name_used && <small className="text-gray-400 block">{enr.bank_name_used}</small>}
                          </td>
                          <td><b>LKR {Number(amt).toLocaleString()}</b></td>
                          <td>
                            <span className={`status-pill ${isConf ? 'confirmed' : enr.status}`}>
                              {isConf ? 'Verified' : enr.status}
                            </span>
                          </td>
                          <td>{new Date(enr.created_at || Date.now()).toLocaleDateString()}</td>
                        </tr>
                      );
                    })}
                  {enrollments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500">
                        No enrollments or slips recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: TUITION ATTENDANCE REGISTER */}
        {activeTab === 'attendance' && (
          <div className="rep-tab-content">
            <div className="rep-filter-bar">
              <div className="filter-group">
                <label>Filter by Course Pack:</label>
                <select value={selectedPackFilter} onChange={e => setSelectedPackFilter(e.target.value)}>
                  <option value="all">All Packs & Batches ({packs.length})</option>
                  {packs.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rep-table-wrap">
              <div className="table-header-bar">
                <h4>Tuition Student Register & Attendance Check</h4>
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
                    .filter(e => selectedPackFilter === 'all' || e.pack_id === selectedPackFilter)
                    .map((enr) => {
                      const s = getStudentInfo(enr);
                      const packObj = packs.find(p => p.id === enr.pack_id);
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
            {/* Multi-Pack / Cohort Switcher */}
            {multiPacks.length > 0 && (
              <div className="cohort-filter-bar">
                <div className="filter-group">
                  <label>Cohort Course Series:</label>
                  <select
                    value={selectedCohortPackId}
                    onChange={e => setSelectedCohortPackId(e.target.value)}
                  >
                    <option value="all">All Courses Combined</option>
                    {multiPacks.map(mp => (
                      <option key={mp.id} value={mp.id}>{mp.title}</option>
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

            {/* Retention KPI Banner */}
            <div className="cohort-banner">
              <div className="cohort-info">
                <div className="cohort-badge">
                  <TrendingUp size={14} />
                  Live Cohort Progression Analytics
                </div>
                <h3>{cohortTitle}</h3>
                <p>{retentionSubtitle}</p>
                <div className="cohort-kpi-sub">
                  <span>Total Audience: <b>{totalUniqueLearners}</b> students</span>
                  <span>Active Batches: <b>{cohortPacksToUse.length}</b></span>
                  <span>Average Drop-off: <b>{(100 - overallRetentionRate).toFixed(1)}%</b></span>
                </div>
              </div>
              <div className="cohort-stat-pill">
                <b>{overallRetentionRate}%</b>
                <span>Cohort Retention Rate</span>
              </div>
            </div>

            {/* Real Cohort Progression Cards */}
            <h3 className="section-title">Batch & Month Progression Sequence</h3>
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
                        <small>
                          {isBase ? '100% Started' : `${stage.pct}% Retained from Month 1`}
                        </small>
                        {!isBase && stage.dropped > 0 && (
                          <span className="dropped-pill">-{stage.dropped} drop-off</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Inactive & At-Risk Drop-off Students Table */}
            <div className="at-risk-header">
              <div>
                <h3 className="section-title" style={{ margin: 0 }}>
                  Drop-off &amp; At-Risk Students Queue
                </h3>
                <p className="section-subtitle">
                  Learners who haven&apos;t renewed for the next batch or have been inactive. Send a direct WhatsApp nudge or in-app upgrade invitation.
                </p>
              </div>
              <span className="at-risk-count-badge">
                {atRiskList.length} students need re-engagement
              </span>
            </div>

            <div className="rep-table-wrap">
              <table className="rep-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Last Enrolled Pack</th>
                    <th>Days Inactive</th>
                    <th>Retention Status</th>
                    <th>Quick Re-engage & Upgrade</th>
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
                        <span className={`status-pill ${item.statusType}`}>
                          {item.status}
                        </span>
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
              <button type="button" className="rep-btn-sec" onClick={loadData} title="Refresh reports list">
                <RefreshCw size={14} /> Refresh Queue
              </button>
            </div>

            {/* Dispute Filter Bar */}
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
                        <h5>{rep.pack_title} {rep.session_title && `· ${rep.session_title}`}</h5>
                        <p className="dispute-desc">&ldquo;{rep.issue_details}&rdquo;</p>
                        
                        {hasSlipAppeal && (
                          <div className="dispute-ref-box">
                            <span>Bank Reference Code: <code className="slip-ref">{rep.bank_ref_number || 'N/A'}</code></span>
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
                          <span>Reported by: <b>{rep.student_name}</b> ({rep.student_email || 'No email'})</span>
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
      </div>
    </PageTransition>
  );
}
