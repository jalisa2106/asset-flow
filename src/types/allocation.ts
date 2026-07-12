import type { Database } from '@/types/database.types';

export type Allocation = Database['public']['Tables']['allocations']['Row'];
export type AllocationStatus = Allocation['status'];
