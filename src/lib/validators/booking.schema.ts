import { z } from 'zod';

export const createBookingSchema = z.object({
  resourceAssetId: z.string().uuid(),
  bookedForDepartmentId: z.string().uuid().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
}).refine((v) => new Date(v.endsAt) > new Date(v.startsAt), {
  message: 'endsAt must be after startsAt',
});

export const rescheduleBookingSchema = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
}).refine((v) => new Date(v.endsAt) > new Date(v.startsAt), {
  message: 'endsAt must be after startsAt',
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type RescheduleBookingInput = z.infer<typeof rescheduleBookingSchema>;
