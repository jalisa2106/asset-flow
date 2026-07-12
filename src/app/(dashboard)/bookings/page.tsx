"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Calendar, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { BookingCalendar } from "@/components/bookings/BookingCalendar";
import { apiFetch } from "@/lib/apiFetch";

interface BookableAsset {
  id: string;
  name: string;
  asset_tag: string;
}

interface Booking {
  id: string;
  resource_asset_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  employee?: { full_name: string };
}

export default function BookingsPage() {
  const [resources, setResources] = useState<BookableAsset[]>([]);
  const [selectedResourceId, setSelectedResourceId] = useState<string>("");
  const [bookings, setBookings] = useState<any[]>([]);
  
  const [loadingResources, setLoadingResources] = useState(true);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read URL search params for attempted slot redirects (conflict mockup display)
  const [attemptedSlot, setAttemptedSlot] = useState<any>(null);

  useEffect(() => {
    // Check if there was an attempted slot in session storage or URL parameters
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const conflictStart = params.get("conflictStart");
      const conflictEnd = params.get("conflictEnd");
      const conflictResource = params.get("conflictResource");

      if (conflictStart && conflictEnd && conflictResource) {
        setSelectedResourceId(conflictResource);
        setAttemptedSlot({
          startTime: new Date(conflictStart).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }),
          endTime: new Date(conflictEnd).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }),
          hasConflict: true,
        });
        toast.error("Booking conflict! The requested slot overlaps with an existing booking.");
      }
    }
  }, []);

  // Fetch bookable assets
  useEffect(() => {
    async function fetchResources() {
      try {
        const res = await apiFetch("/api/assets?bookable=true");
        if (!res.ok) throw new Error("Failed to load bookable resources.");
        const json = await res.json();
        const dataList = json.data || [];
        setResources(dataList);
        
        // Default to first resource if none selected
        if (dataList.length > 0 && !selectedResourceId) {
          setSelectedResourceId(dataList[0].id);
        }
      } catch (err: any) {
        setError(err.message || "An error occurred.");
      } finally {
        setLoadingResources(false);
      }
    }
    fetchResources();
  }, [selectedResourceId]);

  // Fetch bookings when selected resource changes
  useEffect(() => {
    if (!selectedResourceId) return;

    async function fetchBookings() {
      setLoadingCalendar(true);
      try {
        const res = await apiFetch(`/api/bookings?resourceAssetId=${selectedResourceId}`);
        if (!res.ok) throw new Error("Failed to load bookings calendar.");
        const json = await res.json();
        const dataList: Booking[] = json.data || [];

        // Format to simple calendar format (requester, startTime, endTime)
        const formatted = dataList
          .filter((b) => b.status !== "Cancelled")
          .map((b) => {
            const startDate = new Date(b.starts_at);
            const endDate = new Date(b.ends_at);
            return {
              id: b.id,
              requester: b.employee?.full_name || "Unknown Requester",
              startTime: startDate.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }),
              endTime: endDate.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }),
            };
          });

        setBookings(formatted);
      } catch (err: any) {
        toast.error(err.message || "Failed to sync calendar.");
      } finally {
        setLoadingCalendar(false);
      }
    }
    fetchBookings();
  }, [selectedResourceId]);

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const res = await apiFetch(`/api/bookings/${bookingId}/cancel`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Failed to cancel booking.");
      toast.success("Booking cancelled.");
      setBookings(bookings.filter((b) => b.id !== bookingId));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const selectedResource = resources.find((r) => r.id === selectedResourceId);

  return (
    <>
      <div className="fixed top-16 left-0 lg:left-64 right-0 z-20 bg-background px-4 md:px-6 lg:px-8 py-4 md:py-5">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground font-serif">Resource Booking</h1>
            <p className="text-muted-foreground mt-1 text-xs md:text-sm">Schedule shared resources and track availability.</p>
          </div>
          <Link href="/bookings/new" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md rounded-lg py-5 px-6 font-semibold">
              <Plus className="h-4 w-4 shrink-0" />
              Book a slot
            </Button>
          </Link>
        </div>
      </div>

      <div className="pt-32 sm:pt-28 md:pt-28 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {loadingResources ? (
          <div className="flex h-[40vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-destructive text-sm font-semibold">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            {/* Left Column: Resource Select Selector */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-primary" />
                <span>Shared Resources</span>
              </h3>
              
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase">Choose Resource</label>
                <select
                  value={selectedResourceId}
                  onChange={(e) => {
                    setSelectedResourceId(e.target.value);
                    setAttemptedSlot(null);
                  }}
                  className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                >
                  {resources.map((res) => (
                    <option key={res.id} value={res.id}>
                      {res.asset_tag} — {res.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedResourceId && (
                <Link href={`/bookings/new?resourceId=${selectedResourceId}`} className="block pt-2">
                  <Button className="w-full bg-primary text-primary-foreground font-semibold py-4 text-xs">
                    Quick Book This Resource
                  </Button>
                </Link>
              )}
            </div>

            {/* Right Column: Calendar grid */}
            <div className="lg:col-span-3 space-y-4">
              {loadingCalendar ? (
                <div className="flex h-[300px] items-center justify-center border border-dashed border-border bg-card rounded-2xl">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="relative">
                  <BookingCalendar 
                    dateStr={`${selectedResource?.name || "Resource"} Calendar — Today`} 
                    bookings={bookings}
                    attemptedSlot={attemptedSlot || undefined}
                  />

                  {/* Actions overlay panel for details */}
                  {bookings.length > 0 && (
                    <div className="bg-card border border-border rounded-xl p-4 shadow-sm text-xs mt-4">
                      <h4 className="font-bold text-foreground mb-2">Today's Active Blocks</h4>
                      <div className="divide-y divide-border">
                        {bookings.map((b) => (
                          <div key={b.id} className="py-2 flex justify-between items-center">
                            <div>
                              <span className="font-semibold text-foreground">{b.startTime} - {b.endTime}</span>
                              <span className="text-muted-foreground ml-2">by {b.requester}</span>
                            </div>
                            <Button
                              onClick={() => handleCancelBooking(b.id)}
                              size="xs"
                              variant="outline"
                              className="text-destructive hover:bg-destructive hover:text-white border-destructive/20 text-[10px] py-1"
                            >
                              Cancel Booking
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
