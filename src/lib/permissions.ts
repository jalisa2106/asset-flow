import type { Role } from '@/lib/constants';

export type EmployeeProfile = {
  id: string;
  role: Role;
  department_id: string | null;
  status: 'Active' | 'Inactive';
};

export function hasRole(profile: EmployeeProfile | null, ...allowed: Role[]): boolean {
  return !!profile && profile.status === 'Active' && allowed.includes(profile.role);
}

export const can = {
  manageOrgMasterData: (p: EmployeeProfile | null) => hasRole(p, 'Admin'),
  promoteEmployee: (p: EmployeeProfile | null) => hasRole(p, 'Admin'),
  registerOrEditAsset: (p: EmployeeProfile | null) => hasRole(p, 'Admin', 'Asset Manager'),
  changeAssetStatus: (p: EmployeeProfile | null) => hasRole(p, 'Admin', 'Asset Manager'),
  allocateAsset: (p: EmployeeProfile | null) => hasRole(p, 'Admin', 'Asset Manager'),
  approveTransfer: (p: EmployeeProfile | null) => hasRole(p, 'Admin', 'Asset Manager', 'Department Head'),
  bookResource: (p: EmployeeProfile | null) => hasRole(p, 'Admin', 'Asset Manager', 'Department Head', 'Employee'),
  cancelBooking: (p: EmployeeProfile | null, booking: { booked_by: string }) =>
    !!p && (p.id === booking.booked_by || hasRole(p, 'Admin', 'Asset Manager', 'Department Head')),
  raiseMaintenance: (p: EmployeeProfile | null) => !!p && p.status === 'Active',
  approveMaintenance: (p: EmployeeProfile | null) => hasRole(p, 'Admin', 'Asset Manager'),
  manageAuditCycles: (p: EmployeeProfile | null) => hasRole(p, 'Admin', 'Asset Manager'),
  verifyAuditItem: (p: EmployeeProfile | null, auditorIds: string[]) =>
    !!p && (auditorIds.includes(p.id) || hasRole(p, 'Admin', 'Asset Manager')),
};
