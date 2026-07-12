'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
  const router = useRouter();
  const clear = useAuthStore((s) => s.clear);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' }); // clears the httpOnly session cookies
    clear();                                              // clears the localStorage-cached profile
    router.push('/login');
  }

  return (
    <button onClick={handleLogout} className="ml-auto text-muted-foreground hover:text-destructive transition-colors">
      <LogOut className="h-5 w-5" />
    </button>
  );
}
