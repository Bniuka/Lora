import { useState } from 'react';
import { 
  X, AlertTriangle, ShieldCheck, CheckCircle2, 
  Send, Loader2, Sparkles, AlertCircle, FileText, Upload
} from 'lucide-react';
import { REPORT_TYPES, submitStudentReport } from '../lib/disputeSystem';
import './student-report-modal.css';

export default function StudentReportModal({
  isOpen,
  onClose,
  pack,
  session,
  user,
  profile,
}) {
  const [selectedType, setSelectedType] = useState('live_sos');
  const [issueDetails, setIssueDetails] = useState('');
  const [bankRefNumber, setBankRefNumber] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!issueDetails.trim() && selectedType !== 'slip_appeal') {
      setErrorMsg('Please describe what issue you are experiencing.');
      return;
    }

    if (selectedType === 'slip_appeal' && !bankRefNumber.trim() && !issueDetails.trim()) {
      setErrorMsg('Please provide your Bank Reference Number or description.');
      return;
    }

    setSubmitting(true);
    try {
      await submitStudentReport({
        studentId: user?.id || 'guest',
        studentName: `${profile?.first_name || 'Student'} ${profile?.last_name || ''}`.trim(),
        studentEmail: user?.email || 'student@loraspace.com',
        studentPhone: profile?.contact_number || profile?.phone || user?.phone || '',
        creatorId: pack?.creator_id,
        packId: pack?.id,
        packTitle: pack?.title || 'Course Pack',
        sessionId: session?.id || null,
        sessionTitle: session?.title || 'Live Classroom',
        reportType: selectedType,
        issueDetails: issueDetails.trim(),
        bankRefNumber: bankRefNumber.trim(),
        proofScreenshotUrl: proofUrl.trim(),
      });

      setSuccess(true);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSuccess(false);
    setIssueDetails('');
    setBankRefNumber('');
    setProofUrl('');
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="lora-report-modal-backdrop" onClick={handleResetAndClose}>
      <div className="lora-report-modal" onClick={e => e.stopPropagation()}>
        {/* Header with Mascot */}
        <div className="lora-report-modal-hd">
          <div className="lora-report-mascot-head">
            <img src="/mascot-dreamy.png" alt="Dreamy" className="report-dreamy-img" />
            <span className="report-mascot-sparkle">✨</span>
          </div>
          <div className="lora-report-modal-title">
            <h3>Student Trust & Support Radar</h3>
            <p>Tell us what went wrong so we can get it resolved fast!</p>
          </div>
          <button type="button" className="lora-report-close" onClick={handleResetAndClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Course / Session Badge */}
        <div className="lora-report-target-badge">
          <span className="dot" />
          <b>{pack?.title || 'Current Course'}</b>
          {session?.title && <span>· {session.title}</span>}
        </div>

        {success ? (
          <div className="lora-report-success">
            <div className="success-icon-wrap">
              <CheckCircle2 size={44} className="text-emerald-500" />
            </div>
            <h4>Report Dispatched!</h4>
            <p>
              Your report has been flagged to the creator & LoraSpace Trust Sentinel. We are on it!
            </p>
            <button type="button" className="btn-done" onClick={handleResetAndClose}>
              Back to Course
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="lora-report-form">
            {errorMsg && (
              <div className="report-err-banner">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Select Issue Type */}
            <label className="field-lbl">What is happening?</label>
            <div className="report-types-grid">
              {Object.values(REPORT_TYPES).map((type) => (
                <button
                  type="button"
                  key={type.id}
                  className={`report-type-card ${selectedType === type.id ? 'active' : ''}`}
                  onClick={() => setSelectedType(type.id)}
                >
                  <div className="card-top">
                    <span className="badge" style={{ color: type.color, background: type.bg }}>
                      {type.badge}
                    </span>
                  </div>
                  <span className="card-lbl">{type.label}</span>
                </button>
              ))}
            </div>

            {/* Conditional Fields based on Report Type */}
            {selectedType === 'slip_appeal' && (
              <div className="report-slip-fields">
                <div className="form-group">
                  <label htmlFor="rep-bank-ref">Bank Reference / Transaction Number</label>
                  <input
                    id="rep-bank-ref"
                    type="text"
                    placeholder="e.g. BOC-TX-998231 or Commercial Ref #4412"
                    value={bankRefNumber}
                    onChange={e => setBankRefNumber(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="rep-proof-url">Screenshot or Slip Link (optional)</label>
                  <input
                    id="rep-proof-url"
                    type="url"
                    placeholder="https://imgur.com/... or Google Drive link"
                    value={proofUrl}
                    onChange={e => setProofUrl(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Details Field */}
            <div className="form-group">
              <label htmlFor="rep-details">
                {selectedType === 'live_sos'
                  ? 'Describe live classroom problem (e.g. Zoom link dead, passcode error)'
                  : selectedType === 'slip_appeal'
                  ? 'Additional payment notes (e.g. Paid yesterday 4 PM via BOC CDM)'
                  : 'Describe what happened'}
              </label>
              <textarea
                id="rep-details"
                rows={3}
                placeholder="Give us quick details so creator or founder can fix it right away…"
                value={issueDetails}
                onChange={e => setIssueDetails(e.target.value)}
                required={selectedType !== 'slip_appeal'}
              />
            </div>

            {/* Submit Button */}
            <div className="report-actions">
              <button type="button" className="btn-cancel" onClick={handleResetAndClose}>
                Cancel
              </button>
              <button type="submit" className="btn-submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Dispatching Alert…
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    Send Report
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
