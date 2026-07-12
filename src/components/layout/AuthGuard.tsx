'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { profile } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));
    
    if (!profile && !isPublic) {
      router.replace('/login');
    } else if (profile && isPublic) {
      router.replace('/dashboard');
    } else {
      // Basic client side RBAC check for the main protected routes
      if (profile && pathname.startsWith('/organization') && profile.role !== 'Admin') {
        router.replace('/dashboard');
      } else if (profile && pathname.startsWith('/reports') && profile.role === 'Employee') {
        router.replace('/dashboard');
      } else {
        setIsReady(true);
      }
    }
  }, [profile, pathname, router]);

  if (!isReady) {
    return null; // Or a loading spinner
  }

  return <>{children}</>;
}
