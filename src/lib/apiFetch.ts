'use client';

import { useAuthStore } from '@/store/authStore';

export async function apiFetch(input: RequestInfo, init?: RequestInit) {
  const res = await fetch(input, init);

  if (res.status === 401) {
    useAuthStore.getState().clear(); // wipe the stale cached profile immediately
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login?sessionExpired=1';
    }
  }

  return res;
}
