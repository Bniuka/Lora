import { Link } from 'react-router-dom';
import AppLogo, { creatorLogo, learnerLogo } from '../components/AppLogo';
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
        <div className="logo">
          <AppLogo to="/" height={52} />
        </div>
      </header>

      <main>
        <h1>
          Join <em>Lora</em>
        </h1>
        <p className="lead">Choose how you want to use the platform</p>

        <div className="grid">
          <article className="role">
            <div className="mb-4">
              <img src={creatorLogo} alt="Lora Creator" style={{ height: 44, width: 'auto', objectFit: 'contain' }} />
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
            <div className="mb-4">
              <img src={learnerLogo} alt="Lora Learner" style={{ height: 44, width: 'auto', objectFit: 'contain' }} />
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
