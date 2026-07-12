"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Plus, 
  CalendarDays, 
  AlertTriangle, 
  Box, 
  CheckCircle2, 
  RotateCcw, 
  AlertCircle, 
  Clock, 
  Loader2 
} from "lucide-react";

import { KpiCard } from "@/components/dashboard/KpiCard";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/apiFetch";
import { useAuthStore } from "@/store/authStore";

interface DashboardSummary {
  kpis: {
    assetsAvailable: number;
    assetsAllocated: number;
    assetsReserved: number;
    activeBookings: number;
    pendingTransfers: number;
    overdueReturnsCount: number;
  };
  overdueReturns: Array<{
    id: string;
    expected_return_date: string;
    asset_id: string;
    employee_id: string;
    assets: { name: string; asset_tag: string };
    employee_profiles: { full_name: string };
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    created_at: string;
    actor_id: string;
    employee_profiles: { full_name: string };
  }>;
}

// Action labels for formatting recent activity logs
const ACTION_LABEL_MAP: Record<string, string> = {
  "asset.registered": "registered a new asset",
  "asset.updated": "updated asset details",
  "asset.status_changed": "changed asset status of",
  "allocation.created": "allocated asset to",
  "allocation.returned": "received returned asset from",
  "transfer.requested": "submitted transfer request for",
  "transfer.approved": "approved transfer of",
  "transfer.rejected": "rejected transfer request for",
  "booking.created": "booked resource",
  "booking.cancelled": "cancelled booking for",
  "booking.rescheduled": "rescheduled booking for",
  "maintenance.created": "raised maintenance request for",
  "maintenance.approved": "approved maintenance for",
  "maintenance.assigned": "assigned technician for",
  "maintenance.in_progress": "started repairs on",
  "maintenance.resolved": "resolved maintenance for",
  "audit.created": "initiated audit cycle",
  "audit.item_verified": "verified audit item of",
  "audit.completed": "closed audit cycle",
};

export default function DashboardPage() {
  const { profile } = useAuthStore();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSummary() {
      try {
        const res = await apiFetch("/api/dashboard/summary");
        if (!res.ok) {
          throw new Error("Failed to load dashboard summary data.");
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || "An error occurred.");
      } finally {
        setLoading(false);
      }
    }
    loadSummary();
  }, []);

  const formatActivityText = (act: DashboardSummary["recentActivity"][number]) => {
    const actorName = act.employee_profiles?.full_name || "Someone";
    const actionDesc = ACTION_LABEL_MAP[act.action] || act.action || "performed an action";
    return `${actorName} ${actionDesc} (${act.entity_type})`;
  };

  const getActivityIcon = (action: string) => {
    if (action.startsWith("asset.")) return Box;
    if (action.startsWith("allocation.")) return CheckCircle2;
    if (action.startsWith("transfer.")) return RotateCcw;
    if (action.startsWith("booking.")) return CalendarDays;
    if (action.startsWith("maintenance.")) return AlertCircle;
    return Clock;
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-destructive flex flex-col gap-2">
        <h3 className="font-bold">Error loading dashboard</h3>
        <p className="text-sm">{error || "Could not retrieve summary metrics from the server."}</p>
      </div>
    );
  }

  return (
    <>
      <div className="fixed top-16 left-0 lg:left-64 right-0 z-20 bg-background px-4 md:px-6 lg:px-8 py-4 md:py-5">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground font-serif">Today's Overview</h1>
            <p className="text-muted-foreground mt-1 text-xs md:text-sm">
              Welcome back, {profile?.full_name || "User"}. Here's what's happening today.
            </p>
          </div>
        </div>
      </div>

      <div className="pt-24 md:pt-28 space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-3">
          <KpiCard title="Available Assets" value={String(data.kpis.assetsAvailable)} icon={<CheckCircle2 className="h-5 w-5" />} />
          <KpiCard title="Allocated Assets" value={String(data.kpis.assetsAllocated)} icon={<Box className="h-5 w-5" />} />
          <KpiCard title="Reserved Assets" value={String(data.kpis.assetsReserved)} icon={<Clock className="h-5 w-5" />} />
          <KpiCard title="Active Bookings" value={String(data.kpis.activeBookings)} icon={<CalendarDays className="h-5 w-5" />} />
          <KpiCard title="Pending Transfers" value={String(data.kpis.pendingTransfers)} icon={<RotateCcw className="h-5 w-5" />} />
          <KpiCard title="Overdue Returns" value={String(data.kpis.overdueReturnsCount)} icon={<AlertCircle className="h-5 w-5" />} />
        </div>

        {data.kpis.overdueReturnsCount > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-950/25 dark:text-red-200 flex items-start sm:items-center gap-3 animate-pulse">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 sm:mt-0 text-red-600 dark:text-red-400" />
            <span className="text-sm font-semibold">
              {data.kpis.overdueReturnsCount} asset{data.kpis.overdueReturnsCount > 1 ? "s are" : " is"} overdue for return — flagged for follow-up
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4 w-full">
          <Link href="/assets/new" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md rounded-lg py-5 px-6 font-semibold">
              <Plus className="h-4 w-4 shrink-0" />
              Register asset
            </Button>
          </Link>
          <Link href="/bookings/new" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto gap-2 bg-card hover:bg-muted text-foreground border-border shadow-sm rounded-lg py-5 px-6 font-semibold">
              <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
              Book resource
            </Button>
          </Link>
          <Link href="/maintenance/new" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto gap-2 bg-card hover:bg-muted text-foreground border-border shadow-sm rounded-lg py-5 px-6 font-semibold">
              <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
              Raise request
            </Button>
          </Link>
        </div>

        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground mb-4">Recent Activity</h2>
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="divide-y divide-border">
              {data.recentActivity.map((activity) => {
                const IconComponent = getActivityIcon(activity.action);
                return (
                  <div key={activity.id} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                    <div className="mt-0.5 text-primary">
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{formatActivityText(activity)}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(activity.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                );
              })}
              {data.recentActivity.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No recent activities recorded.
                </div>
              )}
            </div>
            <div className="p-4 border-t border-border bg-muted/20 text-center">
              <Link href="/notifications" className="text-sm font-medium text-primary hover:underline">
                View all activity
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
