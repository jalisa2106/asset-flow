import type { Database } from '@/types/database.types';

export type Booking = Database['public']['Tables']['resource_bookings']['Row'];
export type BookingStatus = Booking['status'];
