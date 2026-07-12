"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface Booking {
  id: string;
  requester: string;
  startTime: string; // e.g., "09:00"
  endTime: string;   // e.g., "10:00"
}

interface AttemptedSlot {
  startTime: string; // e.g., "09:30"
  endTime: string;   // e.g., "10:30"
  hasConflict: boolean;
}

interface BookingCalendarProps {
  dateStr: string;
  bookings: Booking[];
  attemptedSlot?: AttemptedSlot;
}

const HOURS = [
  "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"
];

// Helper to convert "HH:MM" to row offset and height based on 9:00 start and 1 hour = 4rem (64px)
function timeToStyles(timeStr: string, baseTime = "09:00", rowHeight = 64) {
  const [h, m] = timeStr.split(":").map(Number);
  const [bh, bm] = baseTime.split(":").map(Number);
  const minutesFromBase = (h * 60 + m) - (bh * 60 + bm);
  return { top: `${(minutesFromBase / 60) * rowHeight}px` };
}

function calculateHeight(startTime: string, endTime: string, rowHeight = 64) {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const durationMinutes = (eh * 60 + em) - (sh * 60 + sm);
  return { height: `${(durationMinutes / 60) * rowHeight}px` };
}

export function BookingCalendar({ dateStr, bookings, attemptedSlot }: BookingCalendarProps) {
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const rowHeight = 64; // 4rem

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="bg-muted/30 px-6 py-4 border-b border-border">
        <h3 className="font-semibold text-foreground">{dateStr}</h3>
      </div>
      
      <div className="p-6 relative">
        {/* Time grid background */}
        <div className="space-y-[4rem] pb-8">
          {HOURS.map((hour) => (
            <div key={hour} className="relative h-0 border-t border-border flex items-center">
              <span className="absolute -top-2 -left-2 bg-card px-2 text-xs font-medium text-muted-foreground z-10">
                {hour}
              </span>
            </div>
          ))}
        </div>

        {/* Bookings overlay */}
        <div className="absolute top-6 bottom-6 left-20 right-6 z-0">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              onClick={() => setActiveSlotId(booking.id)}
              className={cn(
                "absolute left-0 right-12 rounded-md bg-booking-conflict-overlaygit  border border-primary/20 p-2 overflow-hidden shadow-sm flex flex-col justify-center transition-all hover:ring-2 hover:ring-primary/40 cursor-pointer",
                activeSlotId === booking.id ? "z-30 shadow-md ring-2 ring-primary/40" : "z-10"
              )}
              style={{
                ...timeToStyles(booking.startTime),
                ...calculateHeight(booking.startTime, booking.endTime)
              }}
            >
              <span className="text-xs font-semibold text-primary">
                Booked — {booking.requester}
              </span>
              <span className="text-[10px] text-primary/80 font-medium">
                {booking.startTime} - {booking.endTime}
              </span>
            </div>
          ))}

          {attemptedSlot && (
            <div
              onClick={() => setActiveSlotId("attempted")}
              className={cn(
                "absolute left-4 right-8 rounded-md border-2 border-dashed p-2 overflow-hidden shadow-md flex flex-col justify-center cursor-pointer transition-all hover:ring-2 hover:ring-destructive/40",
                activeSlotId === "attempted" ? "z-30 ring-2" : "z-20",
                attemptedSlot.hasConflict 
                  ? "bg-destructive text-destructive-foreground border-destructive-foreground/50 shadow-destructive/20 hover:ring-destructive/40"
                  : "bg-positive text-positive-foreground border-positive-foreground/50 shadow-positive/20 hover:ring-positive/40"
              )}
              style={{
                ...timeToStyles(attemptedSlot.startTime),
                ...calculateHeight(attemptedSlot.startTime, attemptedSlot.endTime)
              }}
            >
              <span className="text-xs font-bold flex items-center gap-1">
                {attemptedSlot.hasConflict ? "Conflict — Slot Unavailable" : "Requested Slot"}
              </span>
              <span className="text-[10px] opacity-90 font-medium">
                Requested {attemptedSlot.startTime} to {attemptedSlot.endTime}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
