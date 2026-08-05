import { useEffect, useRef, useState } from 'react';

export function useCountUp(end, duration = 1500, startOnMount = true) {
  const [count, setCount] = useState(0);
  const frameRef = useRef(null);
  const startTimeRef = useRef(null);

  const animate = (timestamp) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;
    const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    setCount(Math.floor(eased * end));

    if (progress < 1) {
      frameRef.current = requestAnimationFrame(animate);
    }
  };

  const start = () => {
    startTimeRef.current = null;
    frameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (startOnMount && end > 0) start();
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [end, startOnMount]);

  return count;
}
