import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CachedProfile = {
  id: string;
  full_name: string;
  role: 'Admin' | 'Asset Manager' | 'Department Head' | 'Employee';
  department_id: string | null;
  status: 'Active' | 'Inactive';
} | null;

interface AuthState {
  profile: CachedProfile;
  setProfile: (profile: CachedProfile) => void;
  clear: () => void;
}

// This persists to localStorage under the hood via zustand's `persist` middleware.
// It NEVER stores the session token — only the display/role fields above.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      profile: null,
      setProfile: (profile) => set({ profile }),
      clear: () => set({ profile: null }),
    }),
    { name: 'assetflow-profile-cache' }
  )
);
