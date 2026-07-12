"use client";

import React from "react";
import { toast } from "sonner";
import { 
  BarChart4, 
  TrendingUp, 
  Download, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle,
  FileSpreadsheet
} from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ReportsPage() {
  const onExport = () => {
    toast.success("Report export initiated!", {
      description: "Preparing your CSV format organization analytics document.",
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-serif">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aggregate utilization metrics and equipment maintenance frequency logs.
          </p>
        </div>
        <Button
          onClick={onExport}
          className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2 py-5 px-4 shadow-md font-semibold text-sm transition-all"
        >
          <Download className="h-4 w-4" />
          <span>Export Analytics</span>
        </Button>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Chart A: Utilization by Department */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
              <BarChart4 className="h-4 w-4 text-primary" />
              <span>Asset Utilization by Department</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Average asset allocation occupancy rate.</p>
          </div>
          
          {/* Custom Responsive SVG/CSS Bar Graphic */}
          <div className="space-y-3.5 pt-4">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-foreground">Engineering</span>
                <span className="text-primary">87%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: "87%" }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-foreground">Operations</span>
                <span className="text-primary">64%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: "64%" }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-foreground">Design Studio</span>
                <span className="text-primary">52%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: "52%" }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-foreground">HR & Admin</span>
                <span className="text-primary">38%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: "38%" }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Chart B: Maintenance Frequency */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span>Maintenance Frequency (Monthly)</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Servicing request tickets resolved.</p>
          </div>

          {/* Custom SVG Line Chart representation */}
          <div className="pt-4 flex items-end justify-between h-36 border-b border-border px-2">
            <div className="flex flex-col items-center gap-1">
              <div className="h-10 w-3.5 bg-primary/20 hover:bg-primary rounded-t transition-all duration-300" style={{ height: "35px" }}></div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Feb</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="h-16 w-3.5 bg-primary/20 hover:bg-primary rounded-t transition-all duration-300" style={{ height: "65px" }}></div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Mar</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="h-20 w-3.5 bg-primary/20 hover:bg-primary rounded-t transition-all duration-300" style={{ height: "95px" }}></div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Apr</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="h-12 w-3.5 bg-primary/20 hover:bg-primary rounded-t transition-all duration-300" style={{ height: "55px" }}></div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">May</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="h-24 w-3.5 bg-primary/20 hover:bg-primary rounded-t transition-all duration-300" style={{ height: "125px" }}></div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Jun</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="h-28 w-3.5 bg-primary rounded-t transition-all duration-300" style={{ height: "140px" }}></div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Jul</span>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-side Ranked Lists */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* List A: Most-used Assets */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
            <span>Most-used Assets</span>
          </h3>
          <div className="divide-y divide-border text-xs">
            <div className="py-2.5 flex justify-between items-center font-medium">
              <span className="text-foreground">Conference Room B2</span>
              <span className="text-muted-foreground">39 bookings this month</span>
            </div>
            <div className="py-2.5 flex justify-between items-center font-medium">
              <span className="text-foreground">Epson Projector AF-0062</span>
              <span className="text-muted-foreground">28 bookings this month</span>
            </div>
            <div className="py-2.5 flex justify-between items-center font-medium">
              <span className="text-foreground">Development iMac AF-018</span>
              <span className="text-muted-foreground">100% active allocation</span>
            </div>
          </div>
        </div>

        {/* List B: Idle Assets */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <ArrowDownRight className="h-4 w-4 text-amber-500" />
            <span>Idle Assets</span>
          </h3>
          <div className="divide-y divide-border text-xs">
            <div className="py-2.5 flex justify-between items-center font-medium">
              <span className="text-foreground">Logitech Mouse AF-0089</span>
              <span className="text-muted-foreground">0 bookings (14 days idle)</span>
            </div>
            <div className="py-2.5 flex justify-between items-center font-medium">
              <span className="text-foreground">Herman Miller Aeron Chair AF-0033</span>
              <span className="text-muted-foreground">0 bookings (9 days idle)</span>
            </div>
            <div className="py-2.5 flex justify-between items-center font-medium">
              <span className="text-foreground">Dell Latitude Laptop AF-0199</span>
              <span className="text-muted-foreground">Unassigned since 01 Jul</span>
            </div>
          </div>
        </div>
      </div>

      {/* Assets due for maintenance / nearing retirement */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive-foreground dark:text-red-400" />
          <span>Assets Due for Maintenance / Nearing Retirement</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-900/40 text-muted-foreground font-semibold uppercase">
                <th className="px-4 py-3">Asset Code</th>
                <th className="px-4 py-3">Asset Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Age / Utilization Limit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium">
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                <td className="px-4 py-3 text-foreground font-mono font-semibold">AF-0062</td>
                <td className="px-4 py-3 text-muted-foreground">Projector (Bulb life at 98%)</td>
                <td className="px-4 py-3 text-destructive-foreground dark:text-red-400 font-bold">Overdue Servicing</td>
                <td className="px-4 py-3 text-right text-muted-foreground">1,980 hrs / 2,000 hrs</td>
              </tr>
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                <td className="px-4 py-3 text-foreground font-mono font-semibold">AF-0114</td>
                <td className="px-4 py-3 text-muted-foreground">Dell Laptop (Battery swollen)</td>
                <td className="px-4 py-3 text-destructive-foreground dark:text-red-400 font-bold">Flagged for repair</td>
                <td className="px-4 py-3 text-right text-muted-foreground">4.8 yrs / 5.0 yrs limit</td>
              </tr>
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                <td className="px-4 py-3 text-foreground font-mono font-semibold">AF-0033</td>
                <td className="px-4 py-3 text-muted-foreground">Ergonomic Desk Chair</td>
                <td className="px-4 py-3 text-amber-500 font-bold">Upcoming Service</td>
                <td className="px-4 py-3 text-right text-muted-foreground">Annual Inspection due 18 Jul</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
