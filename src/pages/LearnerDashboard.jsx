import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { generatePaymentReference } from '../lib/utils';
import './learner-dashboard.css';

export default function LearnerDashboard() {
  const { user, profile } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [discover, setDiscover] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [regeneratingId, setRegeneratingId] = useState(null);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [enrRes, discRes] = await Promise.all([
        supabase
          .from('enrollments')
          .select('*, session_packs(id, title, thumbnail_url, category, has_free_session, sessions(count), creator_profiles(id, profiles(first_name, last_name)))')
          .eq('learner_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('session_packs')
          .select('*, creator_profiles(id, profiles(first_name, last_name))')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(6),
      ]);
      setEnrollments(enrRes.data || []);
      setDiscover((discRes.data || []).filter(p => p.visibility !== 'unlisted'));
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleRegenerateCode = async (enrollmentId) => {
    const code = await generatePaymentReference(profile?.first_name);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    await supabase
      .from('enrollments')
      .update({
        payment_reference_code: code,
        code_expires_at: expiresAt,
      })
      .eq('id', enrollmentId);

    setEnrollments((prev) =>
      prev.map((enr) =>
        enr.id === enrollmentId
          ? { ...enr, payment_reference_code: code, code_expires_at: expiresAt }
          : enr
      )
    );
  };

  const handleCopyCode = (e, code, id) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRegenerate = async (e, enrollmentId) => {
    e.preventDefault();
    e.stopPropagation();
    setRegeneratingId(enrollmentId);
    try {
      await handleRegenerateCode(enrollmentId);
    } finally {
      setRegeneratingId(null);
    }
  };

  const renderCreatorName = (creatorProfiles) => {
    const p = creatorProfiles?.profiles;
    if (!p) return '';
    return `${p.first_name || ''} ${p.last_name || ''}`.trim();
  };

  return (
    <div className="lora-learner">
      <div className="wrap">
        {/* Welcome Heading */}
        <div className="hello">
          <div>
            <h1>My dashboard</h1>
            <p>Pick up where you left off, or find your next course.</p>
          </div>
        </div>

        {/* Section 1: My enrolled packs */}
        <section className="sec">
          <div className="sh">
            <h2>My enrolled packs</h2>
            {enrollments.length > 0 && <span className="cnt">{enrollments.length}</span>}
          </div>

          {loading ? (
            <div className="grid">
              {[1, 2, 3].map((n) => (
                <div key={n} className="card course skel-card">
                  <div className="th skel-th" />
                  <div className="cb">
                    <div className="skel-line" style={{ width: '70%', height: '18px' }} />
                    <div className="skel-line" style={{ width: '45%' }} />
                    <div className="cf" style={{ marginTop: '16px' }}>
                      <div className="skel-btn" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : enrollments.length === 0 ? (
            <div className="card empty">
              <div className="ring">
                <svg className="ic" viewBox="0 0 24 24">
                  <path d="M12 6c-2-1.5-5-2-8-2v13c3 0 6 .5 8 2 2-1.5 5-2 8-2V4c-3 0-6 .5-8 2zM12 6v13" />
                </svg>
              </div>
              <h3>No enrollments yet</h3>
              <p>Discover courses and start learning today!</p>
              <Link className="btn" to="/learner/discover">
                Discover courses{' '}
                <svg className="ic" viewBox="0 0 24 24">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
          ) : (
            <div className="grid">
              {enrollments.map((enr) => {
                const pack = enr.session_packs || {};
                const creatorName = renderCreatorName(pack.creator_profiles);
                const isConfirmed = enr.status === 'confirmed';
                const isPending = enr.status === 'pending';
                const isRejected = enr.status === 'rejected';
                const isExpired = enr.code_expires_at && new Date(enr.code_expires_at) < new Date();
                const targetLink = isConfirmed
                  ? `/learner/pack/${pack.id}/sessions`
                  : `/learner/pack/${pack.id}`;

                return (
                  <Link key={enr.id} className="card course" to={targetLink}>
                    <div className="th">
                      {isConfirmed && (
                        <span className="chip ok">
                          <svg className="ic" viewBox="0 0 24 24">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Enrolled
                        </span>
                      )}
                      {isPending && (
                        <span className="chip wait">
                          <svg className="ic" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          Pending approval
                        </span>
                      )}
                      {isRejected && (
                        <span className="chip err">
                          <svg className="ic" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                          </svg>
                          Payment rejected
                        </span>
                      )}
                      {!isConfirmed && !isPending && !isRejected && (
                        <span className="chip">{enr.status}</span>
                      )}
                      {pack.thumbnail_url && (
                        <img src={pack.thumbnail_url} alt={pack.title || 'Course'} />
                      )}
                    </div>

                    <div className="cb">
                      <h3>{pack.title}</h3>
                      <div className="by">
                        {creatorName && <span>{creatorName}</span>}
                        {creatorName && pack.category && <i />}
                        {pack.category && <span>{pack.category}</span>}
                      </div>

                      {/* Bank transfer payment verification reference */}
                      {isPending && (enr.payment_method_used === 'bank' || enr.payment_method_used?.startsWith('bank')) && (
                        <div
                          className="card-alert pending-bank"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <div className="card-alert-title">
                            <svg
                              className="ic"
                              style={{ width: 12, height: 12 }}
                              viewBox="0 0 24 24"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            Awaiting verification
                          </div>
                          <div className="card-alert-row">
                            <span className="card-alert-code">
                              {enr.payment_reference_code}
                            </span>
                            {isExpired ? (
                              <span
                                style={{
                                  fontSize: '10px',
                                  color: '#fff',
                                  background: '#c0392b',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 700,
                                }}
                              >
                                Expired
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleCopyCode(e, enr.payment_reference_code, enr.id)
                                }
                                className="card-alert-copy"
                                title="Copy reference code"
                              >
                                {copiedId === enr.id ? 'Copied!' : 'Copy'}
                              </button>
                            )}
                          </div>
                          {isExpired && (
                            <button
                              type="button"
                              onClick={(e) => handleRegenerate(e, enr.id)}
                              className="card-alert-btn"
                              disabled={regeneratingId === enr.id}
                            >
                              {regeneratingId === enr.id
                                ? 'Requesting...'
                                : 'Request New Code'}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Rejection notice */}
                      {isRejected && (
                        <div
                          className="card-alert rejected"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <div className="card-alert-title">
                            <svg
                              className="ic"
                              style={{ width: 12, height: 12 }}
                              viewBox="0 0 24 24"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <line x1="15" y1="9" x2="9" y2="15" />
                              <line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                            Payment rejected
                          </div>
                          {enr.rejection_reason && (
                            <p
                              style={{
                                margin: '4px 0 0',
                                fontSize: '12px',
                                color: 'var(--muted)',
                              }}
                            >
                              Reason: {enr.rejection_reason}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="cf">
                        <span className="btn sm">
                          {isConfirmed
                            ? 'Continue'
                            : isRejected
                            ? 'Try Again'
                            : 'View status'}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 2: Discover new courses */}
        <section className="sec">
          <div className="sh">
            <h2>Discover new courses</h2>
            <Link className="va" to="/learner/discover">
              See all{' '}
              <svg className="ic" viewBox="0 0 24 24">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>

          {loading ? (
            <div className="grid">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="card course skel-card">
                  <div className="th skel-th" />
                  <div className="cb">
                    <div className="skel-line" style={{ width: '70%', height: '18px' }} />
                    <div className="skel-line" style={{ width: '45%' }} />
                    <div className="cf" style={{ marginTop: '16px' }}>
                      <div className="skel-line" style={{ width: '35%', height: '22px' }} />
                      <div className="skel-circle" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : discover.length === 0 ? (
            <div className="card empty">
              <div className="ring">
                <svg className="ic" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <path d="m4.93 4.93 4.24 4.24M14.83 14.83l4.24 4.24M14.83 9.17l4.24-4.24M4.93 19.07l4.24-4.24" />
                </svg>
              </div>
              <h3>No courses to discover</h3>
              <p>Check back soon for new courses.</p>
            </div>
          ) : (
            <div className="grid">
              {discover.map((pack) => {
                const creatorName = renderCreatorName(pack.creator_profiles);
                return (
                  <Link
                    key={pack.id}
                    className="card course"
                    to={`/learner/pack/${pack.id}`}
                  >
                    <div className="th">
                      {pack.visibility === 'private' ? (
                        <span className="chip" style={{ background: '#1e1b4b', color: '#fff', borderColor: '#312e81' }}>
                          🔒 Private
                        </span>
                      ) : pack.has_free_session ? (
                        <span className="chip">
                          <svg className="ic" viewBox="0 0 24 24">
                            <path d="m12 3 2.2 5.6L20 9l-4.5 3.8L17 19l-5-3-5 3 1.5-6.2L4 9l5.8-.4z" />
                          </svg>
                          Free preview
                        </span>
                      ) : null}
                      {pack.thumbnail_url && (
                        <img src={pack.thumbnail_url} alt={pack.title || 'Course'} />
                      )}
                    </div>
                    <div className="cb">
                      <h3>{pack.title}</h3>
                      <div className="by">
                        {creatorName && <span>{creatorName}</span>}
                        {creatorName && pack.category && <i />}
                        {pack.category && <span>{pack.category}</span>}
                      </div>
                      <div className="cf">
                        {pack.visibility === 'private' ? (
                          <span className="price" style={{ fontSize: '12.5px', color: '#6d28d9' }}>
                            🔒 Private · Invite Only
                          </span>
                        ) : (
                          <span className="price">
                            {Number(pack.price) === 0 ? 'FREE' : `${pack.currency || 'USD'} ${pack.price}`}
                          </span>
                        )}
                        <span className="arrow">
                          <svg className="ic" viewBox="0 0 24 24">
                            <path d="M5 12h14M13 6l6 6-6 6" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
