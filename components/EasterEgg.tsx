import React, { useState, useEffect, useCallback } from 'react';

const SHIFT_COUNT = 5;
const RESET_MS = 1500;

export const EasterEgg: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [count, setCount] = useState(0);
  const resetRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetCount = useCallback(() => {
    if (resetRef.current) {
      clearTimeout(resetRef.current);
      resetRef.current = null;
    }
    setCount(0);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Shift') return;
      e.preventDefault();
      if (resetRef.current) {
        clearTimeout(resetRef.current);
      }
      const next = count + 1;
      setCount(next);
      if (next >= SHIFT_COUNT) {
        setVisible(true);
        setCount(0);
        resetRef.current = null;
        return;
      }
      resetRef.current = setTimeout(resetCount, RESET_MS);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (resetRef.current) clearTimeout(resetRef.current);
    };
  }, [count, resetCount]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-300"
        onClick={() => setVisible(false)}
        aria-hidden
      />
      <div className="relative bg-[#0c1220] border border-white/10 rounded-[30px] sm:rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex justify-end p-3 absolute top-0 right-0 z-10">
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all text-xl leading-none"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        <img
          src="/easter-egg.png"
          alt="Easter egg"
          className="w-full h-auto rounded-b-[28px] sm:rounded-b-[36px]"
        />
      </div>
    </div>
  );
};
