'use client';

import { useEffect } from 'react';
import AOS from 'aos';

export function AOSInit() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

    AOS.init({
      duration: 750,
      easing: 'ease-out-cubic',
      once: true,
      offset: 80,
      disable: prefersReducedMotion,
    });
  }, []);

  return null;
}
