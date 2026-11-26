import { useEffect } from 'react';

/**
 * Mouse effects for the whole app, in one listener:
 *  - the background spotlight follows the pointer (--mx / --my on <html>)
 *  - the card under the pointer gets --x / --y for its own spotlight (.spot cards)
 * Updates are batched with requestAnimationFrame so they run at most once per frame.
 */
export function usePointerFx() {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    let frame = 0;
    let event = null;

    const update = () => {
      frame = 0;
      const root = document.documentElement;
      root.style.setProperty('--mx', `${event.clientX}px`);
      root.style.setProperty('--my', `${event.clientY}px`);

      const card = event.target instanceof Element ? event.target.closest('.spot') : null;
      if (card) {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--x', `${event.clientX - rect.left}px`);
        card.style.setProperty('--y', `${event.clientY - rect.top}px`);
      }
    };

    const onMove = (moveEvent) => {
      event = moveEvent;
      if (!frame) frame = requestAnimationFrame(update);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, []);
}
