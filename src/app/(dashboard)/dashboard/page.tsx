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
    <>
      <div className="fixed top-16 left-0 lg:left-64 right-0 z-20 bg-background px-4 md:px-6 lg:px-8 py-4 md:py-5">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground font-serif">Today&apos;s Overview</h1>
            <p className="text-muted-foreground mt-1 text-xs md:text-sm">Welcome back, John. Here&apos;s what&apos;s happening today.</p>
          </div>
        </div>
      </div>

      <div className="pt-24 md:pt-28 space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-3">
        <KpiCard title="Available Assets" value="1,204" icon={<CheckCircle2 className="h-5 w-5" />} />
        <KpiCard title="Allocated Assets" value="482" icon={<Box className="h-5 w-5" />} />
        <KpiCard title="Reserved Assets" value="29" icon={<Clock className="h-5 w-5" />} />
        <KpiCard title="Active Bookings" value="14" icon={<CalendarDays className="h-5 w-5" />} />
        <KpiCard title="Pending Transfers" value="7" icon={<RotateCcw className="h-5 w-5" />} />
        <KpiCard title="Upcoming Returns" value="12" icon={<RotateCcw className="h-5 w-5" />} />
      </div>

      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive flex items-start sm:items-center gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 sm:mt-0" />
        <span className="text-sm font-medium">3 assets overdue for return — flagged for follow-up</span>
      </div>

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
    </>
  );
}
