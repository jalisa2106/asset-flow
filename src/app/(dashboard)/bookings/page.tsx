"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookingCalendar } from "@/components/bookings/BookingCalendar";

const MOCK_BOOKINGS = [
  { id: "1", requester: "Procurement Team", startTime: "09:00", endTime: "10:00" },
  { id: "2", requester: "Engineering Standup", startTime: "11:00", endTime: "12:00" },
  { id: "3", requester: "Design Review", startTime: "14:00", endTime: "15:30" },
];

const ATTEMPTED_SLOT = {
  startTime: "09:30",
  endTime: "10:30",
  hasConflict: true,
};

export default function BookingsPage() {
  return (
    <>
      <div className="fixed top-16 left-0 lg:left-64 right-0 z-20 bg-background px-4 md:px-6 lg:px-8 py-4 md:py-5">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground font-serif">Resource Booking</h1>
            <p className="text-muted-foreground mt-1 text-xs md:text-sm">Schedule shared resources and track availability.</p>
          </div>
          <Link href="/bookings/new" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md rounded-lg py-5 px-6">
              <Plus className="h-4 w-4 shrink-0" />
              Book a slot
            </Button>
          </Link>
        </div>
      </div>

      <div className="pt-32 sm:pt-28 md:pt-28 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      <div className="mx-auto max-w-4xl">
        <BookingCalendar 
          dateStr="Conference room B2 — Tue, 7 Jul" 
          bookings={MOCK_BOOKINGS}
          attemptedSlot={ATTEMPTED_SLOT}
        />
        
        <div className="mt-6 flex justify-center">
          <Link href="/bookings/new">
            <Button variant="outline" className="gap-2 border-border text-foreground hover:bg-muted py-5 px-8 rounded-full shadow-sm">
              <Plus className="h-4 w-4 text-muted-foreground" />
              Book a different slot
            </Button>
          </Link>
        </div>
      </div>
      </div>
    </>
  );
}
