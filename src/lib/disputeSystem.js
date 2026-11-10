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
 * Persists locally and syncs to Supabase notifications so creators and founders receive it immediately across devices.
 * Also checks if the 3+ student Classroom SOS threshold is met to trigger immediate alert.
 */
export async function submitStudentReport({
  studentId,
  studentName,
  studentEmail,
  studentPhone,
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
    student_phone: studentPhone || '',
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
            message: `Multiple students cannot access the live stream for "${sessionTitle}" in "${packTitle}". Please verify your Zoom / YouTube meeting link immediately!\n\n<!--DISPUTE_DATA:${JSON.stringify(newReport)}-->`,
            is_read: false,
            created_at: timestamp,
          },
        ]);
      } catch (e) {
        console.debug('[DisputeSystem] SOS creator notification skipped:', e);
      }
    }
  }

  // 4. Send standard notification with structured payload to Creator
  try {
    const titleText =
      reportType === 'slip_appeal'
        ? `🏦 New Slip Verification Appeal: ${studentName}`
        : reportType === 'missing_recording'
        ? `⏳ Recording Reminder for "${sessionTitle}"`
        : `⚠️ Student Issue Reported: ${sessionTitle}`;

    const payloadMarker = `<!--DISPUTE_DATA:${JSON.stringify(newReport)}-->`;

    await supabase.from('notifications').insert([
      {
        user_id: creatorId,
        title: titleText,
        message: `${studentName} reported an issue in "${packTitle}": ${issueDetails.slice(0, 100)}... Open your Creator Reports Desk to respond.\n\n${payloadMarker}`,
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
 * Parses both Supabase notifications and student_reports table + local storage.
 */
export async function getCreatorReports(creatorId, packIds = []) {
  let remoteReports = [];

  // 1. Fetch remote notifications containing dispute data
  try {
    const { data: notifs, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', creatorId)
      .order('created_at', { ascending: false });

    if (!error && notifs) {
      notifs.forEach(n => {
        if (!n.message) return;
        const match = n.message.match(/<!--DISPUTE_DATA:(.*?)-->/s);
        if (match) {
          try {
            const parsed = JSON.parse(match[1]);
            parsed.notification_id = n.id;
            remoteReports.push(parsed);
          } catch {
            // ignore malformed
          }
        }
      });
    }
  } catch (err) {
    console.debug('[DisputeSystem] Remote notification dispute fetch failed:', err);
  }

  // 2. Fetch from student_reports table if it exists
  try {
    const { data, error } = await supabase
      .from('student_reports')
      .select('*')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false });
    if (!error && data) {
      remoteReports.push(...data);
    }
  } catch {
    // table may not exist
  }

  // 3. Merge with local reports
  const localReports = getLocalReports().filter(r => 
    r.creator_id === creatorId || (r.pack_id && packIds.includes(r.pack_id))
  );
  const map = new Map();

  [...remoteReports, ...localReports].forEach(r => {
    if (map.has(r.id)) {
      const existing = map.get(r.id);
      // Prioritize resolved/dismissed status over open
      if (existing.status === 'resolved' || existing.status === 'dismissed') {
        return;
      }
    }
    map.set(r.id, r);
  });

  return Array.from(map.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

/**
 * Gets all reports for Founder Panel.
 */
export async function getAllReportsForFounder() {
  let remoteReports = [];

  try {
    const { data: notifs, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && notifs) {
      notifs.forEach(n => {
        if (!n.message) return;
        const match = n.message.match(/<!--DISPUTE_DATA:(.*?)-->/s);
        if (match) {
          try {
            const parsed = JSON.parse(match[1]);
            parsed.notification_id = n.id;
            remoteReports.push(parsed);
          } catch {}
        }
      });
    }
  } catch (err) {
    console.debug('[DisputeSystem] Remote fetch skipped:', err);
  }

  try {
    const { data, error } = await supabase
      .from('student_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      remoteReports.push(...data);
    }
  } catch {
    // table may not exist
  }

  const localReports = getLocalReports();
  const map = new Map();

  [...remoteReports, ...localReports].forEach(r => {
    if (map.has(r.id)) {
      const existing = map.get(r.id);
      if (existing.status === 'resolved' || existing.status === 'dismissed') {
        return;
      }
    }
    map.set(r.id, r);
  });

  return Array.from(map.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

/**
 * Resolves a student report (by Creator or Founder) and dispatches a direct notification to the student.
 */
export async function resolveStudentReport({ reportId, resolutionStatus, notes, actorEmail }) {
  let resolvedReport = null;

  // 1. Update local storage
  const reports = getLocalReports();
  const updated = reports.map(r => {
    if (r.id === reportId) {
      resolvedReport = {
        ...r,
        status: resolutionStatus, // 'resolved', 'dismissed'
        resolution_notes: notes || 'Resolved by creator.',
        resolved_at: new Date().toISOString(),
        resolved_by: actorEmail,
      };
      return resolvedReport;
    }
    return r;
  });
  saveLocalReports(updated);

  // 2. Update Supabase notifications message payload
  try {
    const { data: notifs } = await supabase
      .from('notifications')
      .select('*')
      .ilike('message', `%${reportId}%`);

    if (notifs && notifs.length > 0) {
      for (const n of notifs) {
        const match = n.message.match(/<!--DISPUTE_DATA:(.*?)-->/s);
        if (match) {
          try {
            const parsed = JSON.parse(match[1]);
            parsed.status = resolutionStatus;
            parsed.resolution_notes = notes || 'Resolved by creator.';
            parsed.resolved_at = new Date().toISOString();
            parsed.resolved_by = actorEmail;
            const newMsg = n.message.replace(/<!--DISPUTE_DATA:.*?-->/s, `<!--DISPUTE_DATA:${JSON.stringify(parsed)}-->`);
            await supabase.from('notifications').update({ message: newMsg, is_read: true }).eq('id', n.id);
            resolvedReport = resolvedReport || parsed;
          } catch {}
        }
      }
    }
  } catch (err) {
    console.debug('[DisputeSystem] Notification update error:', err);
  }

  // 3. Update Supabase table if available
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

  // 4. Notify the student directly in their Supabase notification bell
  if (resolvedReport && resolvedReport.student_id && resolvedReport.student_id !== 'guest') {
    try {
      const isApproved = resolutionStatus === 'resolved';
      await supabase.from('notifications').insert([
        {
          user_id: resolvedReport.student_id,
          title: isApproved
            ? `Dispute Resolved! 🎉 (${resolvedReport.pack_title})`
            : `Dispute Closed: ${resolvedReport.pack_title}`,
          message: isApproved
            ? `Good news! Your instructor reviewed your issue regarding "${resolvedReport.session_title || resolvedReport.pack_title}" and marked it as RESOLVED. Note: ${notes || 'Issue has been addressed.'}`
            : `Your dispute regarding "${resolvedReport.session_title || resolvedReport.pack_title}" was closed with note: ${notes || 'Dismissed by instructor.'}`,
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (notifErr) {
      console.debug('[DisputeSystem] Student resolution notification failed:', notifErr);
    }
  }

  return true;
}

/**
 * Direct Slip Verification & Student Activation from the Dispute Desk.
 */
export async function verifySlipAndActivateStudent({ report, actorEmail }) {
  let enrollmentUpdated = false;

  // 1. Update enrollment in Supabase to active
  try {
    if (report.pack_id && report.student_id && report.student_id !== 'guest') {
      // Update enrollment to confirmed/active with confirmed_at timestamp
      const { data, error } = await supabase
        .from('enrollments')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .eq('pack_id', report.pack_id)
        .eq('learner_id', report.student_id);

      if (!error) {
        enrollmentUpdated = true;
      }
    }
  } catch (err) {
    console.debug('[DisputeSystem] Enrollment update error:', err);
  }

  // 2. Resolve the report
  await resolveStudentReport({
    reportId: report.id,
    resolutionStatus: 'resolved',
    notes: `Bank slip verified & student enrolled directly from Dispute Desk by ${actorEmail || 'Creator'}.`,
    actorEmail,
  });

  // 3. Send celebratory active enrollment notification to student
  if (report.student_id && report.student_id !== 'guest') {
    try {
      await supabase.from('notifications').insert([
        {
          user_id: report.student_id,
          title: `Slip Verified & Access Granted! 🎉 (${report.pack_title})`,
          message: `Your payment slip appeal has been approved by your instructor. Your course "${report.pack_title}" is now active and ready to access!`,
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (e) {
      console.debug('[DisputeSystem] Student activation notification failed:', e);
    }
  }

  return { success: true, enrollmentUpdated };
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
