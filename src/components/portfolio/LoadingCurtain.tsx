import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface LoadingCurtainProps {
  brandName: string;
}

export function LoadingCurtain({ brandName }: LoadingCurtainProps) {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') return false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return false;
    if (window.sessionStorage.getItem('portfolio_intro_seen') === '1') return false;
    return true;
  });

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => {
      setVisible(false);
      window.sessionStorage.setItem('portfolio_intro_seen', '1');
    }, 850);
    return () => window.clearTimeout(timer);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07090D] text-slate-100 px-6"
          aria-hidden="true"
        >
          <div className="w-full max-w-xs space-y-5">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="text-xl font-display font-semibold tracking-tight text-center"
            >
              {brandName}
            </motion.p>
            <div className="h-[2px] w-full bg-slate-800 overflow-hidden rounded-full">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
                className="h-full w-full bg-blue-500 origin-left"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
