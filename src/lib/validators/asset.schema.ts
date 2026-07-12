import { z } from 'zod';
import { ASSET_STATUSES } from '@/lib/constants';

export const createAssetSchema = z.object({
  name: z.string().min(2),
  categoryId: z.string().uuid(),
  serialNumber: z.string().optional(),
  acquisitionDate: z.string().date().optional(),
  acquisitionCost: z.number().nonnegative().optional(),
  condition: z.string().default('Good'),
  location: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  isBookable: z.boolean().default(false),
  photoUrl: z.string().url().optional(),
});

export const updateAssetSchema = createAssetSchema.partial();

export const changeAssetStatusSchema = z.object({
  status: z.enum(ASSET_STATUSES),
  reason: z.string().optional(),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type ChangeAssetStatusInput = z.infer<typeof changeAssetStatusSchema>;
