import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Star,
  ShieldCheck,
  ThumbsUp,
  MessageSquare,
  Sparkles,
  AlertCircle,
  Loader2,
  Trash2,
  Edit3,
  CheckCircle2,
  CornerDownRight,
  Filter,
  UserCheck
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import './pack-reviews.css';

const RATING_LABELS = {
  1: '1 star - Needs major improvement',
  2: '2 stars - Below expectations',
  3: '3 stars - Average / acceptable',
  4: '4 stars - Very good & practical',
  5: '5 stars - Exceptional course!'
};

export default function PackReviewsSection({
  pack,
  creator,
  currentUser,
  currentProfile,
  currentEnrollment,
  subEnrollmentsMap = {},
  onStatsChange
}) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbMissing, setDbMissing] = useState(false);

  // Form State
  const [userRating, setUserRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState(null);

  // Instructor Reply State
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Filter & Sort State
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'verified' | '5' | '4'
  const [sortMode, setSortMode] = useState('newest'); // 'newest' | 'highest' | 'helpful'

  // Helpful tracking in localStorage
  const [helpfulGiven, setHelpfulGiven] = useState(() => {
    try {
      const stored = localStorage.getItem(`lora_helpful_votes_${pack?.id}`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Determine if the current user is a confirmed/active enrolled student
  const isVerifiedLearner = useMemo(() => {
    if (!currentUser) return false;
    // Check main pack enrollment
    if (currentEnrollment && ['confirmed', 'active'].includes(currentEnrollment.status)) {
      return true;
    }
    // Check sub-pack enrollments if multi-pack
    if (subEnrollmentsMap && Object.values(subEnrollmentsMap).some(e => ['confirmed', 'active'].includes(e.status))) {
      return true;
    }
    return false;
  }, [currentUser, currentEnrollment, subEnrollmentsMap]);

  // Is current viewer the creator of this pack?
  const isCreatorOfPack = currentUser?.id && pack?.creator_id && currentUser.id === pack.creator_id;

  // Fetch reviews from Supabase
  const fetchReviews = useCallback(async () => {
    if (!pack?.id) return;
    try {
      // First try joining profiles
      let { data, error } = await supabase
        .from('pack_reviews')
        .select(`
          id,
          pack_id,
          user_id,
          rating,
          comment,
          is_verified_learner,
          helpful_count,
          creator_reply,
          creator_replied_at,
          created_at,
          updated_at,
          user:profiles (
            id,
            first_name,
            last_name,
            avatar_url,
            role
          )
        `)
        .eq('pack_id', pack.id)
        .order('created_at', { ascending: false });

      if (error) {
        // Check if table missing in DB
        if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
          setDbMissing(true);
          setLoading(false);
          return;
        }

        // If join alias failed, fallback to flat select
        const flatRes = await supabase
          .from('pack_reviews')
          .select('*')
          .eq('pack_id', pack.id)
          .order('created_at', { ascending: false });

        if (flatRes.error) {
          throw flatRes.error;
        }

        // Fetch user profiles manually for the reviews
        const userIds = [...new Set((flatRes.data || []).map(r => r.user_id))];
        let profilesMap = {};
        if (userIds.length > 0) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, avatar_url, role')
            .in('id', userIds);
          (profs || []).forEach(p => {
            profilesMap[p.id] = p;
          });
        }

        data = (flatRes.data || []).map(r => ({
          ...r,
          user: profilesMap[r.user_id] || null
        }));
      }

      setReviews(data || []);
      setDbMissing(false);
    } catch (err) {
      console.warn('[PackReviewsSection] Error loading reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [pack?.id]);

  // Initial load + Realtime Channel Subscription
  useEffect(() => {
    fetchReviews();

    if (!pack?.id) return;

    // Realtime channel for live reviews & comments
    const channelName = `public:pack_reviews:${pack.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pack_reviews',
          filter: `pack_id=eq.${pack.id}`
        },
        () => {
          // Immediately sync updates in real time
          fetchReviews();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pack?.id, fetchReviews]);

  // Existing review by currently logged-in user
  const userExistingReview = useMemo(() => {
    if (!currentUser?.id) return null;
    return reviews.find(r => r.user_id === currentUser.id) || null;
  }, [reviews, currentUser?.id]);

  // If user has an existing review and isn't editing, populate state for quick edit
  useEffect(() => {
    if (userExistingReview && !isEditing) {
      setUserRating(userExistingReview.rating || 5);
      setCommentText(userExistingReview.comment || '');
    }
  }, [userExistingReview, isEditing]);

  // Calculate statistics (Average, Count, Breakdown)
  const stats = useMemo(() => {
    const total = reviews.length;
    if (total === 0) {
      return {
        avg: 0,
        count: 0,
        verifiedCount: 0,
        breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      };
    }

    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    const avg = Number((sum / total).toFixed(1));
    const verifiedCount = reviews.filter(r => r.is_verified_learner).length;

    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
      breakdown[star] = (breakdown[star] || 0) + 1;
    });

    return { avg, count: total, verifiedCount, breakdown };
  }, [reviews]);

  // Notify parent of updated stats so top header reflects real reviews
  useEffect(() => {
    if (onStatsChange) {
      onStatsChange({
        avgRating: stats.avg,
        totalReviews: stats.count,
        verifiedCount: stats.verifiedCount
      });
    }
  }, [stats, onStatsChange]);

  // Handle Review Submission (Create or Update)
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!commentText.trim()) {
      setFormError('Please write a brief comment sharing your experience.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const payload = {
        pack_id: pack.id,
        user_id: currentUser.id,
        rating: userRating,
        comment: commentText.trim(),
        is_verified_learner: isVerifiedLearner,
        updated_at: new Date().toISOString()
      };

      if (isEditing && editingReviewId) {
        const { error } = await supabase
          .from('pack_reviews')
          .update(payload)
          .eq('id', editingReviewId);
        if (error) throw error;
        setIsEditing(false);
        setEditingReviewId(null);
      } else {
        const { error } = await supabase
          .from('pack_reviews')
          .upsert(payload, { onConflict: 'user_id,pack_id' });
        if (error) throw error;
      }

      await fetchReviews();
    } catch (err) {
      console.error('[PackReviewsSection] Error submitting review:', err);
      setFormError(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Deleting Review
  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete your review?')) return;
    try {
      const { error } = await supabase
        .from('pack_reviews')
        .delete()
        .eq('id', reviewId);
      if (error) throw error;
      setIsEditing(false);
      setEditingReviewId(null);
      setCommentText('');
      setUserRating(5);
      await fetchReviews();
    } catch (err) {
      console.error('[PackReviewsSection] Delete review error:', err);
      alert('Could not delete review: ' + err.message);
    }
  };

  // Handle Instructor Reply Submission
  const handleSubmitReply = async (reviewId) => {
    if (!replyText.trim() || !isCreatorOfPack) return;
    setSubmittingReply(true);
    try {
      const { error } = await supabase
        .from('pack_reviews')
        .update({
          creator_reply: replyText.trim(),
          creator_replied_at: new Date().toISOString()
        })
        .eq('id', reviewId);

      if (error) throw error;
      setReplyingToId(null);
      setReplyText('');
      await fetchReviews();
    } catch (err) {
      console.error('[PackReviewsSection] Reply error:', err);
      alert('Could not post reply: ' + err.message);
    } finally {
      setSubmittingReply(false);
    }
  };

  // Handle Helpful Upvote
  const handleToggleHelpful = async (review) => {
    const isVoted = Boolean(helpfulGiven[review.id]);
    const nextCount = isVoted
      ? Math.max(0, (review.helpful_count || 1) - 1)
      : (review.helpful_count || 0) + 1;

    const nextVotes = { ...helpfulGiven, [review.id]: !isVoted };
    setHelpfulGiven(nextVotes);
    try {
      localStorage.setItem(`lora_helpful_votes_${pack.id}`, JSON.stringify(nextVotes));
    } catch {}

    // Optimistic UI update
    setReviews(prev =>
      prev.map(r => (r.id === review.id ? { ...r, helpful_count: nextCount } : r))
    );

    try {
      await supabase
        .from('pack_reviews')
        .update({ helpful_count: nextCount })
        .eq('id', review.id);
    } catch (err) {
      console.warn('Could not persist helpful count:', err);
    }
  };

  // Filtered & Sorted Reviews
  const displayedReviews = useMemo(() => {
    let list = [...reviews];

    // Filter
    if (filterMode === 'verified') {
      list = list.filter(r => r.is_verified_learner);
    } else if (filterMode === '5') {
      list = list.filter(r => r.rating === 5);
    } else if (filterMode === '4') {
      list = list.filter(r => r.rating === 4);
    }

    // Sort
    if (sortMode === 'highest') {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortMode === 'helpful') {
      list.sort((a, b) => (b.helpful_count || 0) - (a.helpful_count || 0));
    } else {
      // Newest
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return list;
  }, [reviews, filterMode, sortMode]);

  return (
    <section className="sec lora-reviews" id="reviews-section">
      {/* SECTION HEADER */}
      <div className="lora-reviews-header">
        <div>
          <h2>
            <Star className="text-amber-500 fill-amber-500" size={22} />
            Learner Reviews &amp; Feedback
          </h2>
          <p>
            Real feedback from genuine students to verify course quality and teaching fidelity before enrolling.
          </p>
        </div>
        <div className="lora-reviews-live-pill" title="Live real-time feed active">
          <span className="lora-reviews-live-dot" />
          <span>Realtime Verified Feed</span>
        </div>
      </div>

      {/* SQL Migration Setup Alert if table missing */}
      {dbMissing && (
        <div className="lora-reviews-setup-alert">
          <h4>
            <AlertCircle size={18} /> Supabase Reviews Table Setup Required
          </h4>
          <p style={{ margin: '0 0 8px' }}>
            The <code>pack_reviews</code> table is ready in your migration file. Run{' '}
            <b>supabase_migration_pack_reviews.sql</b> in your Supabase SQL Editor to enable real-time database storage.
          </p>
        </div>
      )}

      {/* RATINGS SCORECARD / SUMMARY BANNER */}
      <div className="lora-reviews-summary-card">
        {/* Overall score */}
        <div className="lora-reviews-score-col">
          <div className="lora-reviews-big-num">
            {stats.count > 0 ? stats.avg.toFixed(1) : 'New'}
          </div>
          <div className="lora-reviews-stars-row">
            {[1, 2, 3, 4, 5].map(starIndex => (
              <Star
                key={starIndex}
                size={18}
                fill={starIndex <= Math.round(stats.avg) ? '#f59e0b' : 'none'}
                stroke="#f59e0b"
                strokeWidth={1.8}
              />
            ))}
          </div>
          <div className="lora-reviews-count-text">
            {stats.count > 0 ? (
              <>
                Based on <b>{stats.count}</b> authentic review{stats.count !== 1 ? 's' : ''}
              </>
            ) : (
              'No learner reviews yet'
            )}
          </div>
          {stats.verifiedCount > 0 && (
            <div className="lora-reviews-verified-tag">
              <ShieldCheck size={13} />
              <span>{stats.verifiedCount} Verified Students</span>
            </div>
          )}
        </div>

        {/* Breakdown bars */}
        <div className="lora-reviews-breakdown">
          {[5, 4, 3, 2, 1].map(stars => {
            const countForStar = stats.breakdown[stars] || 0;
            const pct = stats.count > 0 ? Math.round((countForStar / stats.count) * 100) : 0;
            return (
              <div key={stars} className="lora-reviews-bar-row">
                <span className="lora-reviews-bar-label">
                  {stars} <Star size={11} fill="#f59e0b" stroke="#f59e0b" />
                </span>
                <div className="lora-reviews-bar-track">
                  <div className="lora-reviews-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="lora-reviews-bar-count">{countForStar}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* FIDELITY CALLOUT */}
      <div className="lora-reviews-trust-callout">
        <ShieldCheck size={18} />
        <div>
          <b>Verified Student Fidelity:</b> Students with confirmed enrollment display the{' '}
          <span style={{ color: '#047857', fontWeight: 700 }}>✓ Verified Learner</span> badge. Unenrolled community inquiries and visitor comments are noted transparently.
        </div>
      </div>

      {/* LEAVE / EDIT REVIEW BOX */}
      {!currentUser ? (
        <div className="lora-review-guest-banner">
          <p>Enrolled or interested in this course? Log in to leave a review or ask a question.</p>
          <Link to="/login">
            <UserCheck size={15} /> Log in to review
          </Link>
        </div>
      ) : isCreatorOfPack ? (
        <div className="lora-review-instructor-notice">
          <Sparkles size={18} />
          <div>
            <b>Instructor Mode:</b> You are the creator of this course. You cannot submit reviews for your own course, but you can reply to student feedback and inquiries below.
          </div>
        </div>
      ) : userExistingReview && !isEditing ? (
        <div className="lora-review-write-box">
          <div className="lora-review-write-header">
            <h3>
              <CheckCircle2 size={18} className="text-emerald-600" />
              Your Review for this Course
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                className="lora-author-action-btn"
                onClick={() => {
                  setIsEditing(true);
                  setEditingReviewId(userExistingReview.id);
                  setUserRating(userExistingReview.rating);
                  setCommentText(userExistingReview.comment);
                }}
              >
                <Edit3 size={13} /> Edit My Review
              </button>
              <button
                type="button"
                className="lora-author-action-btn delete"
                onClick={() => handleDeleteReview(userExistingReview.id)}
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
          <div className="lora-reviews-stars-row" style={{ marginBottom: 8 }}>
            {[1, 2, 3, 4, 5].map(s => (
              <Star
                key={s}
                size={16}
                fill={s <= userExistingReview.rating ? '#f59e0b' : 'none'}
                stroke="#f59e0b"
              />
            ))}
            <span style={{ fontSize: 13, color: '#64748b', marginLeft: 6 }}>
              {RATING_LABELS[userExistingReview.rating]}
            </span>
          </div>
          <p className="lora-review-body" style={{ margin: 0 }}>
            {userExistingReview.comment}
          </p>
        </div>
      ) : (
        <form className="lora-review-write-box" onSubmit={handleSubmitReview}>
          <div className="lora-review-write-header">
            <h3>
              <Sparkles size={17} className="text-blue-600" />
              {isEditing ? 'Edit Your Review' : 'Write a Review / Student Feedback'}
            </h3>
            {isVerifiedLearner && (
              <span className="lora-verified-pill">
                <CheckCircle2 size={12} /> Verified Learner
              </span>
            )}
          </div>

          {/* Star selector */}
          <div className="lora-interactive-stars">
            {[1, 2, 3, 4, 5].map(starNum => {
              const active = hoverRating ? starNum <= hoverRating : starNum <= userRating;
              return (
                <button
                  key={starNum}
                  type="button"
                  className={`lora-star-btn ${active ? 'filled' : ''}`}
                  onMouseEnter={() => setHoverRating(starNum)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setUserRating(starNum)}
                  title={`Rate ${starNum} stars`}
                >
                  <Star
                    size={26}
                    fill={active ? '#f59e0b' : 'none'}
                    stroke={active ? '#f59e0b' : '#cbd5e1'}
                    strokeWidth={2}
                  />
                </button>
              );
            })}
            <span className="lora-star-hint">
              {RATING_LABELS[hoverRating || userRating]}
            </span>
          </div>

          {/* Comment textarea */}
          <textarea
            className="lora-review-textarea"
            rows={3}
            placeholder={
              isVerifiedLearner
                ? "Share your experience with the live sessions, instructor's teaching style, curriculum clarity, and value..."
                : "Ask questions about curriculum, pre-requisites, or share community feedback..."
            }
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            maxLength={1200}
          />

          {formError && (
            <p style={{ color: '#dc2626', fontSize: 13, margin: '6px 0 0', fontWeight: 500 }}>
              {formError}
            </p>
          )}

          <div className="lora-review-write-footer">
            <small>{commentText.length}/1200 characters</small>
            <div style={{ display: 'flex', gap: 8 }}>
              {isEditing && (
                <button
                  type="button"
                  className="lora-btn-cancel-edit"
                  onClick={() => {
                    setIsEditing(false);
                    setEditingReviewId(null);
                  }}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="lora-btn-post-review"
                disabled={submitting || !commentText.trim()}
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Submitting...
                  </>
                ) : isEditing ? (
                  'Update Review'
                ) : (
                  'Submit Review'
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* FILTER & SORT TOOLBAR */}
      {reviews.length > 0 && (
        <div className="lora-reviews-toolbar">
          <div className="lora-reviews-filter-pills">
            <button
              type="button"
              className={`lora-reviews-pill ${filterMode === 'all' ? 'active' : ''}`}
              onClick={() => setFilterMode('all')}
            >
              All Reviews ({reviews.length})
            </button>
            {stats.verifiedCount > 0 && (
              <button
                type="button"
                className={`lora-reviews-pill ${filterMode === 'verified' ? 'active' : ''}`}
                onClick={() => setFilterMode('verified')}
              >
                Verified Students ({stats.verifiedCount})
              </button>
            )}
            {stats.breakdown[5] > 0 && (
              <button
                type="button"
                className={`lora-reviews-pill ${filterMode === '5' ? 'active' : ''}`}
                onClick={() => setFilterMode('5')}
              >
                5 Stars ({stats.breakdown[5]})
              </button>
            )}
            {stats.breakdown[4] > 0 && (
              <button
                type="button"
                className={`lora-reviews-pill ${filterMode === '4' ? 'active' : ''}`}
                onClick={() => setFilterMode('4')}
              >
                4 Stars ({stats.breakdown[4]})
              </button>
            )}
          </div>

          <div className="lora-reviews-sort-group">
            <Filter size={14} />
            <span>Sort by:</span>
            <select
              className="lora-reviews-sort-select"
              value={sortMode}
              onChange={e => setSortMode(e.target.value)}
            >
              <option value="newest">Most Recent</option>
              <option value="highest">Highest Rating</option>
              <option value="helpful">Most Helpful</option>
            </select>
          </div>
        </div>
      )}

      {/* REVIEWS LIST */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '36px 0', color: '#64748b' }}>
          <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
          <p style={{ fontSize: 13.5 }}>Loading authentic reviews...</p>
        </div>
      ) : displayedReviews.length === 0 ? (
        <div className="lora-reviews-empty">
          <div className="lora-reviews-empty-icon">
            <MessageSquare size={26} />
          </div>
          <h4>No reviews matching your filter</h4>
          <p>
            {reviews.length === 0
              ? 'Be the first learner to share your experience with this course and guide fellow students!'
              : 'Try selecting "All Reviews" to view all student feedback.'}
          </p>
        </div>
      ) : (
        <div className="lora-reviews-list">
          {displayedReviews.map(rev => {
            const isMyReview = currentUser?.id === rev.user_id;
            const reviewerName = rev.user
              ? `${rev.user.first_name || 'Learner'} ${rev.user.last_name || ''}`.trim()
              : 'Verified Learner';
            const initial = rev.user?.first_name?.[0] || 'L';
            const isHelpful = Boolean(helpfulGiven[rev.id]);

            let timeAgo = 'Recently';
            try {
              if (rev.created_at) {
                timeAgo = formatDistanceToNow(new Date(rev.created_at), { addSuffix: true });
              }
            } catch {}

            return (
              <div
                key={rev.id}
                className={`lora-review-card ${isMyReview ? 'mine' : ''}`}
              >
                <div className="lora-review-card-top">
                  <div className="lora-reviewer-info">
                    <div className="lora-reviewer-avatar">
                      {rev.user?.avatar_url ? (
                        <img src={rev.user.avatar_url} alt={reviewerName} />
                      ) : (
                        initial
                      )}
                    </div>
                    <div className="lora-reviewer-meta">
                      <div className="lora-reviewer-name-line">
                        <span className="lora-reviewer-name">{reviewerName}</span>
                        {rev.is_verified_learner && (
                          <span className="lora-verified-pill" title="Verified enrolled student">
                            <CheckCircle2 size={11} /> Verified Learner
                          </span>
                        )}
                      </div>
                      <span className="lora-review-time">{timeAgo}</span>
                    </div>
                  </div>

                  {/* Star rating */}
                  <div className="lora-review-stars">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star
                        key={s}
                        size={15}
                        fill={s <= rev.rating ? '#f59e0b' : 'none'}
                        stroke="#f59e0b"
                      />
                    ))}
                  </div>
                </div>

                {/* Review Body */}
                <p className="lora-review-body">{rev.comment}</p>

                {/* Instructor Reply (if existing) */}
                {rev.creator_reply && (
                  <div className="lora-instructor-reply">
                    <div className="lora-reply-header">
                      <span className="lora-reply-tag">
                        <CornerDownRight size={12} /> Instructor Response
                      </span>
                      <span className="lora-reply-author">
                        {creator?.profiles?.first_name || 'Instructor'} {creator?.profiles?.last_name || ''}
                      </span>
                      {rev.creator_replied_at && (
                        <span className="lora-reply-time">
                          {formatDistanceToNow(new Date(rev.creator_replied_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <p className="lora-reply-text">{rev.creator_reply}</p>
                  </div>
                )}

                {/* Inline Instructor Reply Box */}
                {isCreatorOfPack && replyingToId === rev.id && (
                  <div className="lora-instructor-reply-input">
                    <textarea
                      className="lora-reply-textarea"
                      placeholder={`Reply to ${reviewerName} as the course instructor...`}
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                    />
                    <div className="lora-reply-btn-row">
                      <button
                        type="button"
                        className="lora-btn-cancel-edit"
                        style={{ padding: '6px 12px', fontSize: 12 }}
                        onClick={() => {
                          setReplyingToId(null);
                          setReplyText('');
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="lora-btn-post-review"
                        style={{ padding: '6px 14px', fontSize: 12 }}
                        disabled={submittingReply || !replyText.trim()}
                        onClick={() => handleSubmitReply(rev.id)}
                      >
                        {submittingReply ? <Loader2 size={13} className="animate-spin" /> : 'Post Reply'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Actions Bar */}
                <div className="lora-review-actions-bar">
                  <button
                    type="button"
                    className={`lora-btn-helpful ${isHelpful ? 'active' : ''}`}
                    onClick={() => handleToggleHelpful(rev)}
                    title="Mark this review as helpful"
                  >
                    <ThumbsUp size={13} fill={isHelpful ? 'currentColor' : 'none'} />
                    <span>Helpful {rev.helpful_count > 0 ? `(${rev.helpful_count})` : ''}</span>
                  </button>

                  <div className="lora-author-actions">
                    {/* Instructor Reply trigger */}
                    {isCreatorOfPack && replyingToId !== rev.id && (
                      <button
                        type="button"
                        className="lora-author-action-btn"
                        onClick={() => {
                          setReplyingToId(rev.id);
                          setReplyText(rev.creator_reply || '');
                        }}
                      >
                        <MessageSquare size={13} />{' '}
                        {rev.creator_reply ? 'Edit Reply' : 'Reply as Instructor'}
                      </button>
                    )}

                    {/* Review Author edit/delete triggers */}
                    {isMyReview && (
                      <>
                        <button
                          type="button"
                          className="lora-author-action-btn"
                          onClick={() => {
                            setIsEditing(true);
                            setEditingReviewId(rev.id);
                            setUserRating(rev.rating);
                            setCommentText(rev.comment);
                            document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                        >
                          <Edit3 size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          className="lora-author-action-btn delete"
                          onClick={() => handleDeleteReview(rev.id)}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
