"use client";

import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  BarChart4,
  TrendingUp,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Loader2,
  Package,
  ClipboardCheck,
  Wrench,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/apiFetch";

interface ReportSummary {
  totalAssets: number;
  activeAllocations: number;
  pendingMaintenance: number;
  activeAudits: number;
}

interface AssetRow {
  id: string;
  asset_tag: string;
  name: string;
  status: string;
  created_at: string;
  category?: { name: string } | null;
  department?: { name: string } | null;
}

interface AllocationRow {
  id: string;
  allocated_at: string;
  status: string;
  expected_return_date?: string | null;
  asset?: { name: string; asset_tag: string } | null;
  employee?: { full_name: string } | null;
  department?: { name: string } | null;
}

// Group assets by department for the utilization chart
function buildUtilizationData(assets: AssetRow[], allocations: AllocationRow[]) {
  const deptMap: Record<string, { total: number; allocated: number }> = {};

  assets.forEach((a) => {
    const dept = a.department?.name || "Unassigned";
    if (!deptMap[dept]) deptMap[dept] = { total: 0, allocated: 0 };
    deptMap[dept].total += 1;
    if (a.status === "Allocated") deptMap[dept].allocated += 1;
  });

  return Object.entries(deptMap)
    .map(([dept, { total, allocated }]) => ({
      dept,
      pct: total > 0 ? Math.round((allocated / total) * 100) : 0,
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);
}

function buildMostUsed(allocations: AllocationRow[]) {
  const countMap: Record<string, { name: string; tag: string; count: number }> = {};
  allocations.forEach((a) => {
    const key = a.asset?.asset_tag || a.id;
    if (!countMap[key]) countMap[key] = { name: a.asset?.name || "Unknown", tag: key, count: 0 };
    countMap[key].count += 1;
  });
  return Object.values(countMap).sort((a, b) => b.count - a.count).slice(0, 5);
}

function buildIdleAssets(assets: AssetRow[], allocations: AllocationRow[]) {
  const allocatedIds = new Set(allocations.map((a) => a.asset?.asset_tag).filter(Boolean));
  return assets
    .filter((a) => a.status === "Available" && !allocatedIds.has(a.asset_tag))
    .slice(0, 5);
}

export default function ReportsPage() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, assetsRes, allocRes] = await Promise.all([
        apiFetch("/api/reports"),
        apiFetch("/api/reports?type=assets"),
        apiFetch("/api/reports?type=allocations"),
      ]);
      const [summaryJson, assetsJson, allocJson] = await Promise.all([
        summaryRes.json(),
        assetsRes.json(),
        allocRes.json(),
      ]);
      setSummary(summaryJson.data || null);
      setAssets(assetsJson.data || []);
      setAllocations(allocJson.data || []);
    } catch (err: any) {
      toast.error("Failed to load reports data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const onExport = () => {
    if (!assets.length) return;
    const header = "Asset Tag,Name,Status,Category,Department,Created At\n";
    const rows = assets
      .map((a) =>
        [a.asset_tag, a.name, a.status, a.category?.name || "", a.department?.name || "", new Date(a.created_at).toLocaleDateString("en-GB")].join(",")
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `assetflow_report_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported!", { description: "CSV file downloaded to your device." });
  };

  const utilizationData = buildUtilizationData(assets, allocations);
  const mostUsed = buildMostUsed(allocations);
  const idleAssets = buildIdleAssets(assets, allocations);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-serif">Reports &amp; Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aggregate utilization metrics and equipment maintenance frequency logs.
          </p>
        </div>
        <Button
          onClick={onExport}
          className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2 py-5 px-4 shadow-md font-semibold text-sm transition-all"
        >
          <Download className="h-4 w-4" />
          <span>Export CSV</span>
        </Button>
      </div>

      {/* Summary KPIs */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Assets", value: summary.totalAssets, icon: Package, color: "text-primary" },
            { label: "Active Allocations", value: summary.activeAllocations, icon: ClipboardCheck, color: "text-emerald-500" },
            { label: "Pending Maintenance", value: summary.pendingMaintenance, icon: Wrench, color: "text-amber-500" },
            { label: "Open Audits", value: summary.activeAudits, icon: ShieldCheck, color: "text-blue-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-card rounded-2xl border border-border p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <span className={`text-3xl font-extrabold ${color}`}>{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Chart A: Utilization by Department */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
              <BarChart4 className="h-4 w-4 text-primary" />
              <span>Asset Utilization by Department</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Percentage of assets currently allocated.</p>
          </div>

          <div className="space-y-3.5 pt-4">
            {utilizationData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No data available.</p>
            ) : (
              utilizationData.map(({ dept, pct }) => (
                <div key={dept}>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-foreground">{dept}</span>
                    <span className="text-primary">{pct}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chart B: Asset Status Distribution */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span>Asset Status Distribution</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Current breakdown of all asset states.</p>
          </div>

          <div className="pt-4 space-y-2.5">
            {(["Available", "Allocated", "Under Maintenance", "Reserved", "Lost", "Retired", "Disposed"] as const).map((status) => {
              const count = assets.filter((a) => a.status === status).length;
              if (count === 0) return null;
              const pct = assets.length > 0 ? Math.round((count / assets.length) * 100) : 0;
              return (
                <div key={status}>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-foreground">{status}</span>
                    <span className="text-muted-foreground">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: status === "Available" ? "hsl(var(--primary))" :
                          status === "Allocated" ? "#10b981" :
                          status === "Under Maintenance" ? "#f59e0b" :
                          status === "Reserved" ? "#6366f1" : "#ef4444",
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {assets.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No assets registered.</p>}
          </div>
        </div>
      </div>

      {/* Side-by-side Ranked Lists */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Most-allocated Assets */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
            <span>Most-allocated Assets</span>
          </h3>
          <div className="divide-y divide-border text-xs">
            {mostUsed.length === 0 ? (
              <p className="py-4 text-muted-foreground text-center">No allocations recorded.</p>
            ) : (
              mostUsed.map((item) => (
                <div key={item.tag} className="py-2.5 flex justify-between items-center font-medium">
                  <span className="text-foreground">{item.name}</span>
                  <span className="text-muted-foreground">{item.count} allocation{item.count !== 1 ? "s" : ""}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Idle Assets */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <ArrowDownRight className="h-4 w-4 text-amber-500" />
            <span>Idle Assets (Available, Unallocated)</span>
          </h3>
          <div className="divide-y divide-border text-xs">
            {idleAssets.length === 0 ? (
              <p className="py-4 text-muted-foreground text-center">No idle assets found.</p>
            ) : (
              idleAssets.map((asset) => (
                <div key={asset.id} className="py-2.5 flex justify-between items-center font-medium">
                  <span className="text-foreground">{asset.name} ({asset.asset_tag})</span>
                  <span className="text-muted-foreground">{asset.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* All Assets Table */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span>Full Asset Registry ({assets.length} assets)</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-900/40 text-muted-foreground font-semibold uppercase">
                <th className="px-4 py-3">Asset Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium">
              {assets.slice(0, 15).map((asset) => (
                <tr key={asset.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                  <td className="px-4 py-3 text-foreground font-mono font-semibold">{asset.asset_tag}</td>
                  <td className="px-4 py-3 text-foreground">{asset.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{asset.category?.name || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{asset.department?.name || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      asset.status === "Available"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
                        : asset.status === "Allocated"
                        ? "bg-primary/10 text-primary"
                        : asset.status === "Under Maintenance"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                        : "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400"
                    }`}>
                      {asset.status}
                    </span>
                  </td>
                </tr>
              ))}
              {assets.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No assets registered.</td>
                </tr>
              )}
            </tbody>
          </table>
          {assets.length > 15 && (
            <p className="text-xs text-muted-foreground text-center pt-3">
              Showing first 15 of {assets.length} assets. Export CSV for complete list.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
