import type { Database } from '@/types/database.types';

export type AuditCycle = Database['public']['Tables']['audit_cycles']['Row'];
export type AuditCycleStatus = AuditCycle['status'];

export type AuditItem = Database['public']['Tables']['audit_items']['Row'];
export type AuditItemVerification = AuditItem['verification'];
