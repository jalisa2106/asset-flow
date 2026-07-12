"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, History, Clock, ArrowRightLeft, Wrench, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/apiFetch";

interface AllocationHistoryItem {
  id: string;
  status: string;
  allocated_at: string;
  returned_at?: string;
  expected_return_date?: string;
  employee_profiles?: { full_name: string };
}

interface MaintenanceHistoryItem {
  id: string;
  status: string;
  created_at: string;
  issue_description: string;
  priority: string;
}

interface TimelineItem {
  date: string;
  type: "allocation" | "maintenance";
  title: string;
  subtitle: string;
  details: string;
  badge: string;
  color: string;
}

export default function AssetHistoryPage() {
  const params = useParams();
  const assetId = params.assetId as string;

  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await apiFetch(`/api/assets/${assetId}/history`);
        if (!res.ok) {
          throw new Error("Failed to load asset history log.");
        }
        const json = await res.json();
        
        const allocs: AllocationHistoryItem[] = json.allocations || [];
        const maints: MaintenanceHistoryItem[] = json.maintenance || [];

        const items: TimelineItem[] = [];

        // Map Allocations
        allocs.forEach((a) => {
          const holderName = a.employee_profiles?.full_name || "Unknown Employee";
          
          items.push({
            date: a.allocated_at,
            type: "allocation",
            title: `Asset Allocated`,
            subtitle: `Assigned to ${holderName}`,
            details: `Expected return by: ${a.expected_return_date || "N/A"}`,
            badge: a.status,
            color: "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300",
          });

          if (a.returned_at) {
            items.push({
              date: a.returned_at,
              type: "allocation",
              title: `Asset Returned`,
              subtitle: `Returned by ${holderName}`,
              details: `Allocation closed successfully.`,
              badge: "Returned",
              color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
            });
          }
        });

        // Map Maintenance
        maints.forEach((m) => {
          items.push({
            date: m.created_at,
            type: "maintenance",
            title: `Maintenance Request Raised`,
            subtitle: m.issue_description,
            details: `Priority level: ${m.priority}`,
            badge: m.status,
            color: "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
          });
        });

        // Sort descending by date
        items.sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());
        setTimeline(items);
      } catch (err: any) {
        setError(err.message || "An error occurred.");
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [assetId]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-destructive text-sm font-semibold">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 border-b border-border pb-4">
        <Link href={`/assets/${assetId}`}>
          <Button variant="outline" size="icon" className="rounded-lg h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lifecycle Timeline</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Historical allocation logs and maintenance records.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        {timeline.length > 0 ? (
          <div className="relative border-l-2 border-border ml-3 pl-6 space-y-6">
            {timeline.map((item, idx) => (
              <div key={idx} className="relative text-sm">
                {/* Timeline Dot Icon */}
                <div className="absolute -left-[37px] top-1 h-7 w-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-primary shadow-sm">
                  {item.type === "allocation" ? (
                    <Clock className="h-3.5 w-3.5" />
                  ) : (
                    <Wrench className="h-3.5 w-3.5" />
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-semibold">
                  <span>
                    {new Date(item.date).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span>•</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${item.color}`}>
                    {item.badge}
                  </span>
                </div>

                <h4 className="font-bold text-base text-foreground mt-1.5">{item.title}</h4>
                <p className="text-sm text-foreground mt-0.5">{item.subtitle}</p>
                <p className="text-xs text-muted-foreground mt-1 font-semibold">{item.details}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground text-sm flex flex-col items-center gap-2">
            <History className="h-8 w-8 text-muted-foreground" />
            <span>No historical event records logged for this asset.</span>
          </div>
        )}
      </div>
    </div>
  );
}
