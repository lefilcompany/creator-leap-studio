import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

export const RouteProgressBar = () => {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const prevPath = useRef(location.pathname);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (location.pathname === prevPath.current) return;
    prevPath.current = location.pathname;

    // Start
    setVisible(true);
    setProgress(30);

    // Quick jump to 70
    timeoutRef.current = setTimeout(() => setProgress(70), 80);

    // Complete
    const complete = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
    }, 200);

    return () => {
      clearTimeout(timeoutRef.current);
      clearTimeout(complete);
    };
  }, [location.pathname]);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9998] h-[2.5px] pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="h-full bg-gradient-to-r from-primary via-primary to-secondary rounded-r-full shadow-[0_0_8px_hsl(var(--primary)/0.4)]"
        style={{
          width: `${progress}%`,
          transition: progress === 0
            ? 'none'
            : progress === 100
              ? 'width 200ms ease-out, opacity 300ms ease-out'
              : 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
};
