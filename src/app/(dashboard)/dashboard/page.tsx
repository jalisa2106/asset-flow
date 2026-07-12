"use client";

import { useState, useEffect } from "react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Button } from "@/components/ui/button";
import { Plus, CalendarDays, AlertTriangle, Box, CheckCircle2, RotateCcw, AlertCircle, Clock } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

type DashboardSummary = {
  kpis: {
    assetsAvailable: number;
    assetsAllocated: number;
    assetsReserved: number;
    activeBookings: number;
    pendingTransfers: number;
    overdueReturnsCount: number;
  };
  overdueReturns: any[];
  recentActivity: any[];
  mine: {
    allocations: any[];
    bookings: any[];
    maintenance: any[];
  };
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await fetch("/api/dashboard/summary");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard summary", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSummary();
  }, []);

  const getActionIcon = (action: string) => {
    if (action.includes("allocat") || action.includes("transfer")) return RotateCcw;
    if (action.includes("book")) return CalendarDays;
    if (action.includes("audit") || action.includes("flag")) return AlertCircle;
    return CheckCircle2;
  };

  const getActionColor = (action: string) => {
    if (action.includes("allocat")) return "text-positive";
    if (action.includes("transfer")) return "text-blue-500";
    if (action.includes("audit") || action.includes("flag")) return "text-destructive";
    if (action.includes("book")) return "text-purple-500";
    return "text-muted-foreground";
  };

  if (isLoading || !data) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed top-16 left-0 lg:left-64 right-0 z-20 bg-background px-4 md:px-6 lg:px-8 py-4 md:py-5">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground font-serif">Today's Overview</h1>
            <p className="text-muted-foreground mt-1 text-xs md:text-sm">Welcome back. Here's what's happening today.</p>
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
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive flex items-start sm:items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 sm:mt-0" />
          <span className="text-sm font-medium">{data.kpis.overdueReturnsCount} assets overdue for return — flagged for follow-up</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4 w-full">
        <Link href="/assets/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md rounded-lg py-5 px-6">
            <Plus className="h-4 w-4 shrink-0" />
            Register asset
          </Button>
        </Link>
        <Link href="/bookings/new" className="w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto gap-2 bg-card hover:bg-muted text-foreground border-border shadow-sm rounded-lg py-5 px-6">
            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
            Book resource
          </Button>
        </Link>
        <Link href="/maintenance/new" className="w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto gap-2 bg-card hover:bg-muted text-foreground border-border shadow-sm rounded-lg py-5 px-6">
            <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
            Raise request
          </Button>
        </Link>
      </div>

      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-4">My Items</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-card shadow-sm p-4">
            <h3 className="font-semibold mb-2">My Allocations</h3>
            {data.mine.allocations.length === 0 ? <p className="text-sm text-muted-foreground">None</p> : (
              <ul className="space-y-2">
                {data.mine.allocations.map(a => (
                   <li key={a.id} className="text-sm">{a.asset?.name} ({a.asset?.asset_tag})</li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-xl border border-border bg-card shadow-sm p-4">
            <h3 className="font-semibold mb-2">My Bookings</h3>
            {data.mine.bookings.length === 0 ? <p className="text-sm text-muted-foreground">None</p> : (
              <ul className="space-y-2">
                {data.mine.bookings.map(b => (
                   <li key={b.id} className="text-sm">{b.asset?.name} ({b.asset?.asset_tag}) - <span className="font-medium">{b.status}</span></li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-xl border border-border bg-card shadow-sm p-4">
            <h3 className="font-semibold mb-2">My Maintenance Requests</h3>
            {data.mine.maintenance.length === 0 ? <p className="text-sm text-muted-foreground">None</p> : (
              <ul className="space-y-2">
                {data.mine.maintenance.map(m => (
                   <li key={m.id} className="text-sm">{m.asset?.name} ({m.asset?.asset_tag}) - <span className="font-medium">{m.status}</span></li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

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
                const IconComponent = getActionIcon(activity.action.toLowerCase());
                const color = getActionColor(activity.action.toLowerCase());
                return (
                  <div key={activity.id} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                    <div className={`mt-0.5 ${color}`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{activity.action} - {activity.entity_type}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
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
