import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';

export function CustomCursor({ enabled }: { enabled: boolean }) {
  const [active, setActive] = useState(false);
  const [hovered, setHovered] = useState(false);

  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const springX = useSpring(cursorX, { stiffness: 450, damping: 32, mass: 0.4 });
  const springY = useSpring(cursorY, { stiffness: 450, damping: 32, mass: 0.4 });

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!finePointer || reduced) return;

    const handleMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      if (!active) setActive(true);

      const target = e.target;
      const interactive =
        target instanceof Element
          ? Boolean(target.closest('a, button, [role="button"], input, textarea, select'))
          : false;
      setHovered(interactive);
    };

    const handleLeave = () => setActive(false);

    window.addEventListener('mousemove', handleMove, { passive: true });
    document.addEventListener('mouseleave', handleLeave);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseleave', handleLeave);
    };
  }, [enabled, active, cursorX, cursorY]);

  if (!enabled || !active) return null;

  return (
    <motion.div
      aria-hidden="true"
      style={{
        translateX: springX,
        translateY: springY,
      }}
      animate={{
        scale: hovered ? 1.65 : 1,
        opacity: active ? 1 : 0,
      }}
      transition={{ duration: 0.18 }}
      className="fixed top-0 left-0 -ml-3 -mt-3 w-6 h-6 rounded-full border border-blue-500/70 bg-blue-500/5 pointer-events-none z-40 hidden lg:block mix-blend-difference"
    />
  );
}
