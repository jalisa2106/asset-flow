'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

// Hydrates the cached profile from localStorage instantly on mount (via zustand persist),
// then reconciles against the real server session in the background. If the server session
// is gone (expired/logged out elsewhere), the cache is cleared.
export function useUser() {
  const { profile, setProfile, clear } = useAuthStore();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.profile) clear();
        else setProfile(data.profile);
      })
      .catch(() => {
        // network hiccup — keep the cached value, don't clear on a transient failure
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return profile;
}
