import { z } from "zod";

export const maintenanceRequestSchema = z.object({
  assetId: z.string().min(1, "Asset selection is required"),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  priority: z.enum(["Low", "Medium", "High", "Critical"]),
});

export type MaintenanceRequestInput = z.infer<typeof maintenanceRequestSchema>;
