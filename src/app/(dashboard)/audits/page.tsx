"use client";

import { useState } from "react";
import { CheckCircle2, CalendarDays, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuditorVerificationGrid, AuditItem } from "@/components/audits/AuditorVerificationGrid";
import { DiscrepancyReport } from "@/components/audits/DiscrepancyReport";
import { BadgeStatus } from "@/components/assets/AssetStatusBadge";

const MOCK_AUDIT_ITEMS: AuditItem[] = [
  { id: "1", tag: "AF-0114", name: "Dell XPS 15", location: "Engineering", verification: "verified" as BadgeStatus },
  { id: "2", tag: "AF-0062", name: "Epson Projector", location: "Room B2", verification: "damaged" as BadgeStatus },
  { id: "3", tag: "AF-0891", name: "Ergonomic Chair", location: "Storage A", verification: "missing" as BadgeStatus },
  { id: "4", tag: "AF-0102", name: "MacBook Pro M2", location: "Design Studio", verification: "verified" as BadgeStatus },
];

export default function AuditsPage() {
  const [items, setItems] = useState(MOCK_AUDIT_ITEMS);

  const updateVerification = (id: string, status: BadgeStatus) => {
    setItems(items.map(item => item.id === id ? { ...item, verification: status } : item));
  };

  const discrepanciesCount = items.filter(i => i.verification !== "verified").length;

  return (
    <>
      <div className="fixed top-16 left-0 lg:left-64 right-0 z-20 bg-background px-4 md:px-6 lg:px-8 py-4 md:py-5">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground font-serif">Asset Audit</h1>
          <p className="text-muted-foreground mt-1 text-xs md:text-sm">Verify and reconcile physical assets.</p>
        </div>
      </div>

      <div className="pt-24 md:pt-28 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">

      <div className="rounded-xl border border-border bg-card shadow-sm p-4 md:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Active Audit Cycle: Q3 Engineering</h2>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> Due: Aug 15, 2026</div>
              <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> HQ - Floor 3</div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <span className="text-sm font-medium text-foreground">Assigned Auditors:</span>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="flex items-center gap-1.5"><div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">AR</div> A. Rao</span>
              <span className="flex items-center gap-1.5"><div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">SI</div> S. Iqbal</span>
            </div>
          </div>
        </div>
      </div>

      <AuditorVerificationGrid items={items} onUpdateVerification={updateVerification} />

      {discrepanciesCount > 0 && (
        <DiscrepancyReport 
          title={`${discrepanciesCount} assets flagged`}
          message="Discrepancy report generated automatically. Assets marked missing or damaged will require follow-up resolution."
        />
      )}

      <div className="pt-6 border-t border-border flex justify-end">
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground py-6 px-8 text-base shadow-md font-semibold">
          <CheckCircle2 className="mr-2 h-5 w-5" />
          Close Audit Cycle
        </Button>
      </div>
      </div>
    </>
  );
}
