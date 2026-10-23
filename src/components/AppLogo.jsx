import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import creatorLogo from '../../Logo/Creator logo.png';
import learnerLogo from '../../Logo/Leaner logo.png';
import defaultLogo from '../../Logo/Blue_Logo_Cropped.png';

export default function AppLogo({ role: roleProp, to, className = '', height = 36, style = {} }) {
  const { profile } = useAuth();
  const location = useLocation();

  // Determine effective role: prop > profile role > current route
  let effectiveRole = roleProp || profile?.role;
  if (!effectiveRole) {
    if (location.pathname.startsWith('/creator')) {
      effectiveRole = 'creator';
    } else if (location.pathname.startsWith('/learner')) {
      effectiveRole = 'learner';
    }
  }

  let src = defaultLogo;
  let alt = 'Lora';

  if (effectiveRole === 'creator') {
    src = creatorLogo;
    alt = 'Lora Creator';
  } else if (effectiveRole === 'learner') {
    src = learnerLogo;
    alt = 'Lora Learner';
  }

  const defaultDestination = effectiveRole === 'creator'
    ? '/creator/dashboard'
    : effectiveRole === 'learner'
    ? '/learner/dashboard'
    : '/';

  const destination = to !== undefined ? to : defaultDestination;

  const content = (
    <img
      src={src}
      alt={alt}
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        maxWidth: '175px',
        width: 'auto',
        objectFit: 'contain',
        display: 'block',
        ...style,
      }}
    />
  );

  if (destination) {
    return (
      <Link to={destination} className={className} aria-label={alt}>
        {content}
      </Link>
    );
  }

  return <span className={className}>{content}</span>;
}

export { creatorLogo, learnerLogo, defaultLogo };
