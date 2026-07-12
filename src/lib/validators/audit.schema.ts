import { z } from 'zod';

export const createAuditCycleSchema = z.object({
  name: z.string().min(2),
  scopeDepartmentId: z.string().uuid().optional(),
  scopeLocation: z.string().optional(),
  startDate: z.string().date(),
  endDate: z.string().date(),
  auditorEmployeeIds: z.array(z.string().uuid()).min(1),
}).refine((v) => v.endDate >= v.startDate, { message: 'endDate must be on or after startDate' });

export const verifyAuditItemSchema = z.object({
  assetId: z.string().uuid(),
  verification: z.enum(['Verified', 'Missing', 'Damaged', 'Pending']),
  notes: z.string().optional(),
});

export type CreateAuditCycleInput = z.infer<typeof createAuditCycleSchema>;
export type VerifyAuditItemInput = z.infer<typeof verifyAuditItemSchema>;
