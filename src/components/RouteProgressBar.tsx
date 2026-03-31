import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

export const RouteProgressBar = () => {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const prevPath = useRef(location.pathname);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const schedule = (fn: () => void, ms: number) => {
    timeoutsRef.current.push(setTimeout(fn, ms));
  };

  useEffect(() => {
    if (location.pathname === prevPath.current) return;
    prevPath.current = location.pathname;
    clearAllTimeouts();

    // Start — ramp up progressively
    setVisible(true);
    setProgress(20);

    schedule(() => setProgress(45), 150);
    schedule(() => setProgress(65), 350);
    schedule(() => setProgress(80), 550);

    // Complete
    schedule(() => {
      setProgress(100);
      schedule(() => {
        setVisible(false);
        setProgress(0);
      }, 500);
    }, 700);

    return clearAllTimeouts;
  }, [location.pathname]);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9998] h-[3px] pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="h-full bg-gradient-to-r from-primary via-primary to-secondary rounded-r-full shadow-[0_0_10px_hsl(var(--primary)/0.5)]"
        style={{
          width: `${progress}%`,
          transition: progress === 0
            ? 'none'
            : progress === 100
              ? 'width 300ms ease-out, opacity 400ms ease-out'
              : 'width 400ms cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
};
