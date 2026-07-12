"use client";

import { KpiCard } from "@/components/dashboard/KpiCard";
import { Button } from "@/components/ui/button";
import { Plus, CalendarDays, AlertTriangle, Box, CheckCircle2, RotateCcw, AlertCircle, Clock } from "lucide-react";
import Link from "next/link";

const RECENT_ACTIVITY = [
  { id: 1, text: "Laptop AF-0114 assigned to Priya Shah", time: "2h ago", icon: CheckCircle2, color: "text-positive" },
  { id: 2, text: "Transfer approved: AF-0033 to Facilities dept", time: "5h ago", icon: RotateCcw, color: "text-blue-500" },
  { id: 3, text: "Audit discrepancy flagged: AF-0891 damaged", time: "2d ago", icon: AlertCircle, color: "text-destructive" },
  { id: 4, text: "Conference Room B booked by Eng Team", time: "3d ago", icon: CalendarDays, color: "text-purple-500" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-serif">Today's Overview</h1>
          <p className="text-muted-foreground mt-1 text-sm">Welcome back, John. Here's what's happening today.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <KpiCard title="Available Assets" value="1,204" icon={<CheckCircle2 className="h-5 w-5" />} />
        <KpiCard title="Allocated Assets" value="482" icon={<Box className="h-5 w-5" />} />
        <KpiCard title="Reserved Assets" value="29" icon={<Clock className="h-5 w-5" />} />
        <KpiCard title="Active Bookings" value="14" icon={<CalendarDays className="h-5 w-5" />} />
        <KpiCard title="Pending Transfers" value="7" icon={<RotateCcw className="h-5 w-5" />} />
        <KpiCard title="Upcoming Returns" value="12" icon={<RotateCcw className="h-5 w-5" />} />
      </div>

      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-950/25 dark:text-red-200 flex items-center gap-3 animate-pulse">
        <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
        <span className="text-sm font-semibold">3 assets overdue for return — flagged for follow-up</span>
      </div>

      <div className="flex flex-wrap gap-4">
        <Link href="/assets/new">
          <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md rounded-lg py-5 px-6">
            <Plus className="h-4 w-4" />
            Register asset
          </Button>
        </Link>
        <Link href="/bookings/new">
          <Button variant="outline" className="gap-2 bg-card hover:bg-muted text-foreground border-border shadow-sm rounded-lg py-5 px-6">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            Book resource
          </Button>
        </Link>
        <Link href="/maintenance/new">
          <Button variant="outline" className="gap-2 bg-card hover:bg-muted text-foreground border-border shadow-sm rounded-lg py-5 px-6">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            Raise request
          </Button>
        </Link>
      </div>

      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-4">Recent Activity</h2>
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="divide-y divide-border">
            {RECENT_ACTIVITY.map((activity) => (
              <div key={activity.id} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                <div className={`mt-0.5 ${activity.color}`}>
                  <activity.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{activity.text}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-border bg-muted/20 text-center">
            <Link href="/notifications" className="text-sm font-medium text-primary hover:underline">
              View all activity
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
