import { z } from 'zod';

export const createAllocationSchema = z.object({
  assetId: z.string().uuid(),
  employeeId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  expectedReturnDate: z.string().date().optional(),
}).refine((v) => v.employeeId || v.departmentId, {
  message: 'Either employeeId or departmentId is required',
});

export const returnAllocationSchema = z.object({
  returnConditionNotes: z.string().optional(),
});

export const createTransferRequestSchema = z.object({
  allocationId: z.string().uuid(),
  toEmployeeId: z.string().uuid(),
  reason: z.string().optional(),
});

export type CreateAllocationInput = z.infer<typeof createAllocationSchema>;
export type ReturnAllocationInput = z.infer<typeof returnAllocationSchema>;
export type CreateTransferRequestInput = z.infer<typeof createTransferRequestSchema>;
