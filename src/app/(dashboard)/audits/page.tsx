"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, CalendarDays, MapPin, Loader2, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/apiFetch";

interface AuditCycle {
  id: string;
  name: string;
  scope_location?: string;
  start_date: string;
  end_date: string;
  status: "Open" | "Closed";
  department?: { name: string };
  assigned_auditors?: string[];
}

export default function AuditsListPage() {
  const [cycles, setCycles] = useState<AuditCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCycles() {
      try {
        const res = await apiFetch("/api/audits");
        if (!res.ok) throw new Error("Failed to retrieve audit cycles.");
        const json = await res.json();
        setCycles(json.data || json || []);
      } catch (err: any) {
        setError(err.message || "An error occurred.");
      } finally {
        setLoading(false);
      }
    }
    fetchCycles();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground font-serif">Asset Audits</h1>
          <p className="text-muted-foreground mt-1 text-xs md:text-sm">Verify and reconcile physical inventory matching database states.</p>
        </div>
        <Link href="/audits/new">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-1.5 py-5 px-6 shadow-md">
            <Plus className="h-4 w-4" />
            <span>New Audit Cycle</span>
          </Button>
        </Link>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-destructive text-sm font-semibold">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cycles.map((cycle) => (
            <div key={cycle.id} className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    cycle.status === "Open"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300"
                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                  }`}>
                    {cycle.status}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-semibold">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>{cycle.start_date} to {cycle.end_date}</span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-foreground">{cycle.name}</h3>

                <div className="space-y-1.5 text-xs text-muted-foreground font-medium pt-2">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span>Scope Dept: <strong>{cycle.department?.name || "All Departments"}</strong></span>
                  </div>
                  {cycle.scope_location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>Location: <strong>{cycle.scope_location}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-5 border-t border-border mt-5 flex justify-end">
                <Link href={`/audits/${cycle.id}`}>
                  <Button variant="outline" className="gap-1.5 text-xs py-3 font-semibold">
                    <span>Perform Verification</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}

          {cycles.length === 0 && (
            <div className="col-span-full border border-dashed border-border rounded-2xl p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
              <ShieldCheck className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-semibold">No active or closed audit cycles recorded.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
