'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/shared/lib/supabase/client';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<'loading' | 'authed' | 'unauthed'>('loading');

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          console.error('[AuthGuard] getSession error:', error.message);
          setStatus('unauthed');
          router.replace(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
          return;
        }
        if (data.session) {
          setStatus('authed');
        } else {
          setStatus('unauthed');
          router.replace(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
        }
      })
      .catch((err) => {
        console.error('[AuthGuard] unexpected error:', err);
        setStatus('unauthed');
        router.replace(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setStatus('unauthed');
        router.replace(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (event === 'SIGNED_IN' && session) {
        setStatus('authed');
      }
    });

    return () => subscription.unsubscribe();
  }, [router, pathname]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#F6F8FC] flex flex-col items-center justify-center gap-4">
        <div
          className="h-10 w-10 rounded-full border-[3px] border-blue-200 border-t-blue-600 animate-spin"
          aria-label="Checking authentication…"
        />
        <p className="text-sm text-slate-500 font-medium">Checking your session…</p>
      </div>
    );
  }

  if (status === 'unauthed') return null;

  return <>{children}</>;
}