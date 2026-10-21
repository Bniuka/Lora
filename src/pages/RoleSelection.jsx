import { Link } from 'react-router-dom';
import './signup-choose.css';

export default function RoleSelection() {
  return (
    <div className="lora-signup">
      <header className="top">
        <Link className="back" to="/">
          <svg className="ic" viewBox="0 0 24 24">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
          Back to home
        </Link>
        <Link className="logo" to="/">
          <i>
            <svg viewBox="0 0 24 24">
              <path d="M12 3 22 21H2z" />
            </svg>
          </i>
          Lora
        </Link>
      </header>

      <main>
        <h1>
          Join <em>Lora</em>
        </h1>
        <p className="lead">Choose how you want to use the platform</p>

        <div className="grid">
          <article className="role">
            <div className="ico">
              <svg className="ic" viewBox="0 0 24 24">
                <path d="M12 19l7-7 3 3-7 7zM18 13 16.5 5.5 2 2l3.5 14.5L13 18z" />
                <path d="m2 2 7.6 7.6" />
                <circle cx="11" cy="11" r="2" />
              </svg>
            </div>
            <h2>I'm a Creator</h2>
            <p>
              Create session packs, schedule live classes, and accept payments from students worldwide.
            </p>
            <Link className="cta fill" to="/signup/creator">
              Get started{' '}
              <svg className="ic" viewBox="0 0 24 24">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </article>

          <article className="role">
            <div className="ico">
              <svg className="ic" viewBox="0 0 24 24">
                <path d="M22 10 12 5 2 10l10 5z" />
                <path d="M6 12v5c3 2.5 9 2.5 12 0v-5M22 10v6" />
              </svg>
            </div>
            <h2>I'm a Learner</h2>
            <p>
              Discover live sessions, join free previews, enroll in courses, and learn from the best.
            </p>
            <Link className="cta line" to="/signup/learner">
              Start learning{' '}
              <svg className="ic" viewBox="0 0 24 24">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </article>
        </div>

        <p className="have">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </main>
    </div>
  );
}
