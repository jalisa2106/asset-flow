import { z } from 'zod';

// datetime-local inputs produce "YYYY-MM-DDTHH:mm" (no seconds/tz).
// We accept any non-empty string here and convert to full ISO on submit.
// Server-side the converted ISO string is stored directly.
export const createBookingSchema = z.object({
  resourceAssetId: z.string().uuid('Please select a resource'),
  bookedForDepartmentId: z.string().uuid().optional().or(z.literal('')),
  startsAt: z.string().min(1, 'Start time is required'),
  endsAt: z.string().min(1, 'End time is required'),
}).refine((v) => new Date(v.endsAt) > new Date(v.startsAt), {
  message: 'End time must be after start time',
  path: ['endsAt'],
});

export const rescheduleBookingSchema = z.object({
  startsAt: z.string().min(1, 'Start time is required'),
  endsAt: z.string().min(1, 'End time is required'),
}).refine((v) => new Date(v.endsAt) > new Date(v.startsAt), {
  message: 'End time must be after start time',
  path: ['endsAt'],
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type RescheduleBookingInput = z.infer<typeof rescheduleBookingSchema>;
