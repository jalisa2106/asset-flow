export const ROLES = ['Admin', 'Asset Manager', 'Department Head', 'Employee'] as const;
export type Role = (typeof ROLES)[number];

export const ASSET_STATUSES = [
  'Available', 'Allocated', 'Reserved', 'Under Maintenance', 'Lost', 'Retired', 'Disposed',
] as const;

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export const PG_ERROR = {
  UNIQUE_VIOLATION: '23505',
  EXCLUSION_VIOLATION: '23P01',
  CHECK_VIOLATION: '23514',
  RAISE_EXCEPTION: 'P0001',
} as const;
