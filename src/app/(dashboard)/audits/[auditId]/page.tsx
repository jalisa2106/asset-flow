"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, CalendarDays, MapPin, Loader2, ArrowLeft, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AuditorVerificationGrid, AuditItem } from "@/components/audits/AuditorVerificationGrid";
import { DiscrepancyReport } from "@/components/audits/DiscrepancyReport";
import { BadgeStatus } from "@/components/assets/AssetStatusBadge";
import { apiFetch } from "@/lib/apiFetch";

interface AuditCycleDetail {
  id: string;
  name: string;
  scope_location?: string;
  start_date: string;
  end_date: string;
  status: "Open" | "Closed";
  assigned_auditors?: string[];
  department?: { name: string };
}

interface ApiResponseItem {
  id: string;
  cycle_id: string;
  asset_id: string;
  verification: string;
  notes?: string;
  assets?: {
    name: string;
    asset_tag: string;
  };
}

export default function AuditCycleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const auditId = params.auditId as string;

  const [cycle, setCycle] = useState<AuditCycleDetail | null>(null);
  const [items, setItems] = useState<AuditItem[]>([]);
  const [discrepancyCount, setDiscrepancyCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    async function loadCycleDetail() {
      try {
        const res = await apiFetch(`/api/audits/${auditId}`);
        if (!res.ok) throw new Error("Failed to load audit cycle.");
        const json = await res.json();
        
        setCycle(json.cycle);
        setDiscrepancyCount(json.discrepancyCount || 0);

        const fetchedItems: ApiResponseItem[] = json.items || [];
        const mappedItems: AuditItem[] = fetchedItems.map((item) => ({
          id: item.asset_id, // Map to asset_id for verification call
          tag: item.assets?.asset_tag || "N/A",
          name: item.assets?.name || "Unknown Asset",
          location: json.cycle.scope_location || "Scoped Department",
          verification: item.verification.toLowerCase() as BadgeStatus,
        }));
        setItems(mappedItems);
      } catch (err: any) {
        setError(err.message || "An error occurred.");
      } finally {
        setLoading(false);
      }
    }
    loadCycleDetail();
  }, [auditId]);

  const updateVerification = async (assetId: string, status: BadgeStatus) => {
    try {
      // Map BadgeStatus back to DB values
      const dbVerification = status.charAt(0).toUpperCase() + status.slice(1);
      
      const res = await apiFetch(`/api/audits/${auditId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId,
          verification: dbVerification,
          notes: "Auditor checked.",
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Verification update blocked.");
      }

      // Update local state
      const nextItems = items.map((item) =>
        item.id === assetId ? { ...item, verification: status } : item
      );
      setItems(nextItems);

      // Re-calculate discrepancies count
      const disc = nextItems.filter((i) => ["missing", "damaged"].includes(i.verification)).length;
      setDiscrepancyCount(disc);
      toast.success("Verification logged successfully.");
    } catch (err: any) {
      toast.error(err.message || "Could not log verification status.");
    }
  };

  const handleCloseCycle = async () => {
    setClosing(true);
    try {
      const res = await apiFetch(`/api/audits/${auditId}/close`, {
        method: "POST",
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to close cycle.");
      }

      toast.success("Audit cycle closed and missing asset statuses updated to Lost!");
      router.push("/audits");
    } catch (err: any) {
      toast.error(err.message || "An error occurred closing the audit.");
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !cycle) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-destructive text-sm font-semibold">
        {error || "Audit cycle not found."}
      </div>
    );
  }

  const isClosed = cycle.status === "Closed";

  return (
    <>
      <div className="fixed top-16 left-0 lg:left-64 right-0 z-20 bg-background px-4 md:px-6 lg:px-8 py-4 md:py-5">
        <div className="mx-auto max-w-6xl flex items-center gap-4">
          <Link href="/audits">
            <Button variant="outline" size="icon" className="rounded-lg h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground font-serif">Asset Verification</h1>
            <p className="text-muted-foreground mt-1 text-xs md:text-sm">Verify and reconcile physical items matching database records.</p>
          </div>
        </div>
      </div>

      <div className="pt-24 md:pt-28 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
        <div className="rounded-xl border border-border bg-card shadow-sm p-4 md:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">{cycle.name}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  cycle.status === "Open"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                }`}>
                  {cycle.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> Period: {cycle.start_date} to {cycle.end_date}</div>
                {cycle.scope_location && (
                  <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> Location: {cycle.scope_location}</div>
                )}
                {cycle.department?.name && (
                  <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> Department: {cycle.department.name}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {isClosed ? (
          <div className="rounded-xl border border-blue-500/10 bg-blue-500/5 p-4 text-xs text-muted-foreground flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-primary mt-0.5" />
            <span>This audit cycle is now locked and Closed. Verified status values are archived and cannot be edited.</span>
          </div>
        ) : null}

        {/* Verification Grid */}
        <AuditorVerificationGrid 
          items={items} 
          onUpdateVerification={isClosed ? undefined : updateVerification} 
        />

        {discrepancyCount > 0 && (
          <DiscrepancyReport 
            title={`${discrepancyCount} assets flagged`}
            message="Discrepancy report generated automatically. Assets marked missing or damaged will require follow-up resolution."
          />
        )}

        {!isClosed && (
          <div className="pt-6 border-t border-border flex justify-end">
            <Button
              onClick={handleCloseCycle}
              disabled={closing}
              className="bg-primary hover:bg-primary/90 text-primary-foreground py-6 px-8 text-base shadow-md font-semibold"
            >
              {closing ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-5 w-5" />
              )}
              <span>Close Audit Cycle</span>
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
