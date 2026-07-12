import type { Database } from '@/types/database.types';

export type Asset = Database['public']['Tables']['assets']['Row'];
export type AssetStatus = Asset['status'];
