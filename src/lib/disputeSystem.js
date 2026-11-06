import { supabase } from './supabase';

const LS_STUDENT_REPORTS = 'lora_student_reports_v1';

/**
 * Report Types supported by LoraSpace
 */
export const REPORT_TYPES = {
  LIVE_SOS: {
    id: 'live_sos',
    label: 'Classroom SOS (Live Link / Passcode Issue)',
    badge: '🚨 Urgent Live SOS',
    color: '#ef4444',
    bg: '#fef2f2',
  },
  SLIP_APPEAL: {
    id: 'slip_appeal',
    label: 'Bank Slip Appeal (Delayed or Rejected)',
    badge: '🏦 Slip Dispute',
    color: '#d97706',
    bg: '#fffbeb',
  },
  MISSING_RECORDING: {
    id: 'missing_recording',
    label: 'Missing / Overdue Recording',
    badge: '⏳ Recording Overdue',
    color: '#8b5cf6',
    bg: '#f5f3ff',
  },
  QUALITY_ISSUE: {
    id: 'quality_issue',
    label: 'Audio, Video, or Materials Problem',
    badge: '⚠️ Quality Issue',
    color: '#2563eb',
    bg: '#eff6ff',
  },
};

/**
 * Submits a student report / dispute.
 * Also checks if the 3+ student Classroom SOS threshold is met to trigger immediate alert.
 */
export async function submitStudentReport({
  studentId,
  studentName,
  studentEmail,
  creatorId,
  packId,
  packTitle,
  sessionId,
  sessionTitle,
  reportType,
  issueDetails,
  bankRefNumber,
  proofScreenshotUrl,
}) {
  const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = new Date().toISOString();

  const newReport = {
    id: reportId,
    student_id: studentId,
    student_name: studentName || 'Student',
    student_email: studentEmail || 'student@loraspace.com',
    creator_id: creatorId,
    pack_id: packId,
    pack_title: packTitle,
    session_id: sessionId || null,
    session_title: sessionTitle || 'All Sessions',
    report_type: reportType,
    issue_details: issueDetails || '',
    bank_ref_number: bankRefNumber || null,
    proof_screenshot_url: proofScreenshotUrl || null,
    status: 'open', // 'open', 'resolved', 'dismissed'
    resolution_notes: null,
    resolved_at: null,
    created_at: timestamp,
  };

  // 1. Persist to Local Storage
  const reports = getLocalReports();
  reports.unshift(newReport);
  saveLocalReports(reports);

  // 2. Persist to Supabase if table exists
  try {
    await supabase.from('student_reports').insert([newReport]);
  } catch (err) {
    console.debug('[DisputeSystem] Remote student_reports insert bypassed:', err);
  }

  // 3. Automated Threshold Check for Classroom SOS
  if (reportType === 'live_sos' && sessionId) {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const recentSosReports = reports.filter(
      r => r.session_id === sessionId && r.report_type === 'live_sos' && r.created_at >= tenMinutesAgo
    );

    if (recentSosReports.length >= 3) {
      // Trigger URGENT CREATOR ALERT
      try {
        await supabase.from('notifications').insert([
          {
            user_id: creatorId,
            title: `🚨 URGENT: ${recentSosReports.length} Students Reported Live Link Issue!`,
            message: `Multiple students cannot access the live stream for "${sessionTitle}" in "${packTitle}". Please verify your Zoom / YouTube meeting link immediately!`,
            is_read: false,
            created_at: timestamp,
          },
        ]);
      } catch (e) {
        console.debug('[DisputeSystem] SOS creator notification skipped:', e);
      }
    }
  }

  // 4. Send standard notification to Creator
  try {
    const titleText =
      reportType === 'slip_appeal'
        ? `🏦 New Slip Verification Appeal: ${studentName}`
        : reportType === 'missing_recording'
        ? `⏳ Recording Reminder for "${sessionTitle}"`
        : `⚠️ Student Issue Reported: ${sessionTitle}`;

    await supabase.from('notifications').insert([
      {
        user_id: creatorId,
        title: titleText,
        message: `${studentName} reported an issue in "${packTitle}": ${issueDetails.slice(0, 100)}... Open your Creator Reports Desk to respond.`,
        is_read: false,
        created_at: timestamp,
      },
    ]);
  } catch (err) {
    console.debug('[DisputeSystem] Creator notification failed:', err);
  }

  return newReport;
}

/**
 * Gets reports for a specific creator (for Creator Reports Desk).
 */
export async function getCreatorReports(creatorId) {
  let remoteReports = [];
  try {
    const { data, error } = await supabase
      .from('student_reports')
      .select('*')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false });
    if (!error && data) {
      remoteReports = data;
    }
  } catch (err) {
    console.debug('[DisputeSystem] Remote fetch failed:', err);
  }

  const localReports = getLocalReports().filter(r => r.creator_id === creatorId);
  const map = new Map();
  [...localReports, ...remoteReports].forEach(r => map.set(r.id, r));
  return Array.from(map.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

/**
 * Gets all reports for Founder Panel.
 */
export async function getAllReportsForFounder() {
  let remoteReports = [];
  try {
    const { data, error } = await supabase
      .from('student_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      remoteReports = data;
    }
  } catch (err) {
    console.debug('[DisputeSystem] Remote fetch skipped:', err);
  }

  const localReports = getLocalReports();
  const map = new Map();
  [...localReports, ...remoteReports].forEach(r => map.set(r.id, r));
  return Array.from(map.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

/**
 * Resolves a student report (by Creator or Founder).
 */
export async function resolveStudentReport({ reportId, resolutionStatus, notes, actorEmail }) {
  const reports = getLocalReports();
  const updated = reports.map(r => {
    if (r.id === reportId) {
      return {
        ...r,
        status: resolutionStatus, // 'resolved', 'dismissed'
        resolution_notes: notes || 'Resolved by creator.',
        resolved_at: new Date().toISOString(),
        resolved_by: actorEmail,
      };
    }
    return r;
  });
  saveLocalReports(updated);

  // Update Supabase if available
  try {
    await supabase
      .from('student_reports')
      .update({
        status: resolutionStatus,
        resolution_notes: notes,
        resolved_at: new Date().toISOString(),
        resolved_by: actorEmail,
      })
      .eq('id', reportId);
  } catch (e) {
    console.debug('[DisputeSystem] Remote update skipped:', e);
  }

  return true;
}

// ─── Local Storage Helpers ───
function getLocalReports() {
  try {
    return JSON.parse(localStorage.getItem(LS_STUDENT_REPORTS) || '[]');
  } catch {
    return [];
  }
}

function saveLocalReports(reports) {
  try {
    localStorage.setItem(LS_STUDENT_REPORTS, JSON.stringify(reports));
  } catch (e) {
    console.error('[DisputeSystem] Local storage save error:', e);
  }
}
