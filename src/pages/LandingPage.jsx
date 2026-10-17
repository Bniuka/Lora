import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageTransition } from '../components/ui';
import blueLogo from '../../Logo/Blue_Logo_Cropped.png';
import './home.css';

export default function LandingPage() {
  /* Scroll-reveal observer (visual effect) */
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll('.rv').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <PageTransition>
      <div className="lora-home">
        {/* ── HEADER ── */}
        <header>
          <div className="wrap">
            <Link className="logo" to="/" aria-label="Lora home">
              <img src={blueLogo} alt="Lora" />
            </Link>
            <nav>
              <Link className="ln" to="/login">Log in</Link>
              <Link className="btn pri sm" to="/signup">Get started</Link>
            </nav>
          </div>
        </header>

        <main>
          {/* ── HERO ── */}
          <div className="hero">
            <div className="wrap">
              <h1>
                Teach the world,<br />
                <em>get paid</em> your way.
              </h1>
              <p className="lead">
                The premium course platform designed for creators who can't access Stripe or PayPal. Accept any local payment method. Verify manually. Start earning today.
              </p>
              <div className="cta">
                <Link className="btn pri" to="/signup/creator">
                  Start teaching <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </Link>
                <Link className="btn sec" to="/signup/learner">
                  Join as learner
                </Link>
              </div>
              <ul className="ticks">
                <li><i>✓</i>Free to start</li>
                <li><i>✓</i>No transaction fees</li>
                <li><i>✓</i>Any payment method</li>
              </ul>
              <div className="pills" aria-hidden="true">
                <span>bKash</span>
                <span>UPI</span>
                <span>Bank transfer</span>
                <span>QR codes</span>
                <span>PayPal link</span>
              </div>
            </div>
          </div>

          {/* ── FEATURES (Bento Grid) ── */}
          <section>
            <div className="wrap">
              <div className="sh rv">
                <span className="eyebrow">Everything you need</span>
                <h2>Built for creators everywhere.</h2>
              </div>
              <div className="bento">
                <article className="bc rv">
                  <div className="ico">
                    <svg viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
                    </svg>
                  </div>
                  <h3>No Stripe? No problem.</h3>
                  <p>
                    Accept payments via any local method: bKash, UPI, bank transfer, QR codes. Your students pay directly to your account, skipping the international gateway hurdles.
                  </p>
                </article>

                <article className="bc rv">
                  <div className="ico">
                    <svg viewBox="0 0 24 24">
                      <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  </div>
                  <h3>Manual verification</h3>
                  <p>
                    Students upload payment proof directly to your dashboard. You verify the receipt and unlock access with a single click. Simple, secure, and completely fraud-resistant.
                  </p>
                </article>

                <article className="bc rv">
                  <div className="ico">
                    <svg viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="9" />
                      <path d="m10 8.5 5.5 3.5-5.5 3.5z" />
                    </svg>
                  </div>
                  <h3>Free preview sessions</h3>
                  <p>
                    Let students join a free live session before committing. Build absolute trust, showcase your expertise, and dramatically boost your course conversion rates.
                  </p>
                </article>

                <article className="bc rv">
                  <div className="ico">
                    <svg viewBox="0 0 24 24">
                      <circle cx="9" cy="8" r="3.5" />
                      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" />
                    </svg>
                  </div>
                  <h3>Session-based learning</h3>
                  <p>
                    Schedule live Zoom sessions, automatically share recordings, and build a thriving, interactive community around your core expertise.
                  </p>
                </article>
              </div>
            </div>
          </section>

          {/* ── HOW IT WORKS (Dark section) ── */}
          <section className="how">
            <div className="wrap">
              <div className="sh rv">
                <span className="eyebrow">How it works</span>
                <h2>From idea to income in four steps.</h2>
              </div>
              <div className="steps">
                <div className="step rv">
                  <small>STEP 01</small>
                  <h3>Create Your Premium Pack</h3>
                  <p>
                    Add your live sessions, set your local pricing, upload beautiful thumbnails, and optionally add a free preview session to draw students in.
                  </p>
                </div>
                <div className="step rv">
                  <small>STEP 02</small>
                  <h3>Share Your Custom Link</h3>
                  <p>
                    Students discover your beautiful landing page, watch your intro video, and experience your free preview session.
                  </p>
                </div>
                <div className="step rv">
                  <small>STEP 03</small>
                  <h3>Get Paid Directly</h3>
                  <p>
                    Students pay using your local payment link (or bank details) and upload their receipt proof. You verify it on your dashboard.
                  </p>
                </div>
                <div className="step rv">
                  <small>STEP 04</small>
                  <h3>Teach &amp; Grow Globally</h3>
                  <p>
                    Deliver high-quality live sessions on Zoom, automatically share recordings, and grow your student base without borders.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ── FINAL CTA BANNER ── */}
          <div className="final">
            <div className="wrap">
              <div className="banner rv">
                <h2>Ready to start teaching?</h2>
                <p>
                  Join hundreds of creators who are monetizing their expertise today, without needing international payment gateways.
                </p>
                <Link className="btn" to="/signup/creator">
                  Create your first pack <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </Link>
              </div>
            </div>
          </div>
        </main>

        {/* ── FOOTER ── */}
        <footer>
          <div className="wrap">
            <div>
              <b>Lora</b>
              <small>Built for creators, everywhere.</small>
            </div>
            <span>© {new Date().getFullYear()} Lora. All rights reserved.</span>
            <nav>
              <Link to="/signup">Get started</Link>
              <Link to="/login">Log in</Link>
            </nav>
          </div>
        </footer>
      </div>
    </PageTransition>
  );
}
