"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Calendar, Save } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/apiFetch";
import { createBookingSchema } from "@/lib/validators/booking.schema";

interface BookableAsset {
  id: string;
  name: string;
  asset_tag: string;
}

interface Department {
  id: string;
  name: string;
}

export default function NewBookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedResourceId = searchParams.get("resourceId") || "";

  const [resources, setResources] = useState<BookableAsset[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Setup
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      resourceAssetId: preSelectedResourceId,
      bookedForDepartmentId: "",
      startsAt: "",
      endsAt: "",
    },
  });

  const startsAtValue = watch("startsAt");
  const endsAtValue = watch("endsAt");

  useEffect(() => {
    if (preSelectedResourceId) {
      setValue("resourceAssetId", preSelectedResourceId);
    }
  }, [preSelectedResourceId, setValue]);

  useEffect(() => {
    async function loadMetadata() {
      try {
        const [resAssets, resDepts] = await Promise.all([
          apiFetch("/api/assets?bookable=true"),
          apiFetch("/api/departments"),
        ]);
        if (resAssets.ok) {
          const json = await resAssets.json();
          setResources(json.data || json || []);
        }
        if (resDepts.ok) {
          const json = await resDepts.json();
          setDepartments(json.data || json || []);
        }
      } catch (err) {
        toast.error("Failed to load booking metadata.");
      } finally {
        setLoadingMeta(false);
      }
    }
    loadMetadata();
  }, []);

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      // Map local date-time strings to ISO timestamp strings
      const isoStarts = new Date(data.startsAt).toISOString();
      const isoEnds = new Date(data.endsAt).toISOString();

      const res = await apiFetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceAssetId: data.resourceAssetId,
          bookedForDepartmentId: data.bookedForDepartmentId || undefined,
          startsAt: isoStarts,
          endsAt: isoEnds,
        }),
      });

      if (res.status === 409) {
        const json = await res.json().catch(() => ({}));
        if (json.code === "SLOT_CONFLICT") {
          // Redirect back to calendar with conflict params to trigger red overlay
          router.push(
            `/bookings?conflictResource=${data.resourceAssetId}&conflictStart=${encodeURIComponent(
              isoStarts
            )}&conflictEnd=${encodeURIComponent(isoEnds)}`
          );
          return;
        }
        throw new Error(json.error || "Overlapping booking detected.");
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to book resource.");
      }

      toast.success("Resource booked successfully!");
      router.push("/bookings");
    } catch (err: any) {
      toast.error(err.message || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingMeta) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/bookings">
          <Button variant="outline" size="icon" className="rounded-lg h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-serif">Book Shared Resource</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Reserve shared office equipment or meeting conference rooms.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground/80">Choose Resource</label>
            <select
              className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              {...register("resourceAssetId")}
            >
              <option value="">-- Choose Resource --</option>
              {resources.map((res) => (
                <option key={res.id} value={res.id}>
                  {res.asset_tag} — {res.name}
                </option>
              ))}
            </select>
            {errors.resourceAssetId && (
              <p className="text-xs font-medium text-destructive mt-1">Resource selection is required.</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground/80">Book on behalf of Department (Optional)</label>
            <select
              className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              {...register("bookedForDepartmentId")}
            >
              <option value="">-- Personal Reservation --</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground/80">Reservation Starts At</label>
              <input
                type="datetime-local"
                className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                {...register("startsAt")}
              />
              {errors.startsAt && (
                <p className="text-xs font-medium text-destructive mt-1">Start time is required.</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground/80">Reservation Ends At</label>
              <input
                type="datetime-local"
                className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                {...register("endsAt")}
              />
              {errors.endsAt && (
                <p className="text-xs font-medium text-destructive mt-1">End time is required.</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Link href="/bookings">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-1.5"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>Reserve Slot</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
