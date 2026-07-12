'use client';

import { useUser } from './useUser';

export function useRole() {
  const profile = useUser();
  return profile?.role ?? null;
}
