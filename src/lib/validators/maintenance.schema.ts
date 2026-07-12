import { z } from 'zod';

export const createMaintenanceSchema = z.object({
  assetId: z.string().uuid(),
  issueDescription: z.string().min(5),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  photoUrl: z.string().url().optional(),
});

export const approveMaintenanceSchema = z.object({
  decision: z.enum(['Approved', 'Rejected']),
});

export const assignTechnicianSchema = z.object({
  technicianName: z.string().min(1),
});

export const resolveMaintenanceSchema = z.object({
  notes: z.string().optional(),
});

export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;
export type ApproveMaintenanceInput = z.infer<typeof approveMaintenanceSchema>;
export type AssignTechnicianInput = z.infer<typeof assignTechnicianSchema>;
