import { z } from "zod";

export const allocationSchema = z.object({
  assetId: z.string().min(1, "Asset selection is required"),
  employeeId: z.string().min(1, "Employee is required"),
  departmentId: z.string().min(1, "Department is required"),
  notes: z.string().optional(),
  expectedReturnDate: z.string().min(1, "Expected return date is required"),
});

export const transferRequestSchema = z.object({
  assetId: z.string().min(1, "Asset is required"),
  fromEmployeeId: z.string().min(1, "From employee is required"),
  toEmployeeId: z.string().min(1, "Target employee selection is required"),
  reason: z.string().min(5, "Transfer reason must be at least 5 characters"),
});

export type AllocationInput = z.infer<typeof allocationSchema>;
export type TransferRequestInput = z.infer<typeof transferRequestSchema>;
