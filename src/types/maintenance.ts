import type { Database } from '@/types/database.types';

export type Maintenance = Database['public']['Tables']['maintenance_requests']['Row'];
export type MaintenanceStatus = Maintenance['status'];
