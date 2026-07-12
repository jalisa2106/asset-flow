"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Plus,
  X,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/apiFetch";
import { createMaintenanceSchema } from "@/lib/validators/maintenance.schema";

type MaintenanceFormValues = z.input<typeof createMaintenanceSchema>;

// --- TYPES ---
interface MaintenanceRequest {
  id: string;
  asset_id: string;
  issue_description: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "Pending" | "Approved" | "Rejected" | "In Progress" | "Resolved";
  technician_name?: string | null;
  updated_at: string;
  created_at: string;
  asset?: { name: string; asset_tag: string } | null;
  reporter?: { full_name: string } | null;
}

interface AssetItem {
  id: string;
  asset_tag: string;
  name: string;
}

export default function MaintenancePage() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [assignModal, setAssignModal] = useState<{ isOpen: boolean; request: MaintenanceRequest | null }>({ isOpen: false, request: null });
  const [technicianName, setTechnicianName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // --- DATA FETCHING ---
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/maintenance?pageSize=50");
      if (!res.ok) throw new Error("Failed to load maintenance requests.");
      const json = await res.json();
      setRequests(json.data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load maintenance data.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAssets = useCallback(async () => {
    try {
      const res = await apiFetch("/api/assets?pageSize=100");
      const json = await res.json();
      setAssets(json.data || []);
    } catch {
      // silent — assets loaded for the modal
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    fetchAssets();
  }, [fetchRequests, fetchAssets]);

  // Form setup
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<MaintenanceFormValues>({
    resolver: zodResolver(createMaintenanceSchema),
    defaultValues: { assetId: "", issueDescription: "", priority: "Medium" },
  });

  const onSubmit = async (data: MaintenanceFormValues) => {
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit maintenance request.");

      const assetName = assets.find((a) => a.id === data.assetId)?.name || "asset";
      toast.success(`Maintenance request for "${assetName}" submitted!`);
      reset();
      setIsAddModalOpen(false);
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Advance workflow status
  const advanceStatus = async (req: MaintenanceRequest) => {
    if (req.status === "Approved") {
      setAssignModal({ isOpen: true, request: req });
      return;
    }

    setSubmitting(true);
    try {
      let endpoint = "";
      let body: Record<string, any> = {};
      let expectedNextStatus = "";

      if (req.status === "Pending") {
        endpoint = `/api/maintenance/${req.id}/approve`;
        body = { decision: "Approved" };
        expectedNextStatus = "Approved";
      } else if (req.status === "In Progress") {
        endpoint = `/api/maintenance/${req.id}/resolve`;
        body = { notes: "Repair completed successfully." };
        expectedNextStatus = "Resolved";
      } else {
        return;
      }

      const res = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to advance status.");

      toast.success(`Request moved to ${expectedNextStatus}.`);
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignTechnician = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModal.request || !technicianName.trim()) return;

    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/maintenance/${assignModal.request.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technicianName: technicianName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to assign technician.");

      toast.success("Technician assigned and request moved to In Progress.");
      setAssignModal({ isOpen: false, request: null });
      setTechnicianName("");
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Group columns
  const columns: { title: MaintenanceRequest["status"]; color: string }[] = [
    { title: "Pending", color: "bg-slate-100 dark:bg-slate-800" },
    { title: "Approved", color: "bg-blue-50/50 dark:bg-blue-950/15" },
    { title: "In Progress", color: "bg-amber-50/50 dark:bg-amber-950/15" },
    { title: "Resolved", color: "bg-emerald-50/50 dark:bg-emerald-950/15" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Maintenance Workflow</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and advance physical assets undergoing repairs and servicing.
          </p>
        </div>
        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2 py-5 px-4 shadow-md font-semibold text-sm transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Raise Request</span>
        </Button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Kanban Board */}
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-border">
            {columns.map((col) => {
              const colRequests = requests.filter((req) => req.status === col.title);
              return (
                <div
                  key={col.title}
                  className={`flex-shrink-0 w-80 rounded-2xl border border-border p-4 flex flex-col min-h-[480px] ${col.color}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-foreground">{col.title}</h3>
                    <span className="rounded-full bg-background border border-border px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                      {colRequests.length}
                    </span>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px] pr-1">
                    {colRequests.map((req) => (
                      <div
                        key={req.id}
                        className={`rounded-xl border border-border bg-card p-4 shadow-sm space-y-3 transition-all hover:shadow-md ${
                          req.status === "Resolved"
                            ? "border-emerald-200 dark:border-emerald-900 bg-emerald-500/5"
                            : ""
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-mono text-xs font-semibold text-primary">
                              {req.asset?.asset_tag || "—"}
                            </span>
                            <span className={`px-1.5 rounded text-[10px] font-bold ${
                              req.priority === "Critical"
                                ? "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400"
                                : req.priority === "High"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                                : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400"
                            }`}>
                              {req.priority}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-foreground">{req.asset?.name || "Unknown Asset"}</h4>
                          <p className="text-xs text-muted-foreground font-semibold mt-0.5 line-clamp-1">
                            {req.issue_description}
                          </p>
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2">{req.issue_description}</p>

                        {req.technician_name && (
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-semibold">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Tech: {req.technician_name}</span>
                          </div>
                        )}

                        {/* Progress action button */}
                        {req.status !== "Resolved" && req.status !== "Rejected" && (
                          <div className="pt-2 border-t border-border flex justify-end">
                            <Button
                              onClick={() => advanceStatus(req)}
                              disabled={submitting}
                              size="xs"
                              variant="outline"
                              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground font-semibold flex items-center gap-1 py-3"
                            >
                              <span>
                                {req.status === "Pending" && "Approve"}
                                {req.status === "Approved" && "Assign & Start"}
                                {req.status === "In Progress" && "Resolve"}
                              </span>
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </div>
                        )}

                        {req.status === "Resolved" && (
                          <div className="pt-2 border-t border-emerald-200/50 flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Resolved — {new Date(req.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                          </div>
                        )}
                      </div>
                    ))}

                    {colRequests.length === 0 && (
                      <div className="h-full flex items-center justify-center border border-dashed border-border rounded-xl p-8 text-center text-xs text-muted-foreground">
                        No requests in this stage
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer info */}
          <div className="rounded-xl border border-blue-500/10 bg-blue-500/5 p-4 text-xs text-muted-foreground flex items-start gap-2.5 max-w-3xl">
            <AlertCircle className="h-4 w-4 shrink-0 text-primary mt-0.5" />
            <span>
              <strong>Product Constraint Rule 5</strong>: Raising a maintenance request holds the asset in its current status. Approving the request advances the asset state to <strong>Under Maintenance</strong>, and Resolving the request flips it back to <strong>Available</strong> automatically.
            </span>
          </div>
        </>
      )}

      {/* --- ADD REQUEST MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setIsAddModalOpen(false);
                reset();
              }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold mb-1">Raise Maintenance Request</h2>
            <p className="text-xs text-muted-foreground mb-4">Request technical servicing or repair work for an asset.</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Select Asset</label>
                <select
                  className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  {...register("assetId")}
                >
                  <option value="">-- Choose Asset --</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>{a.asset_tag} — {a.name}</option>
                  ))}
                </select>
                {errors.assetId && (
                  <p className="text-xs font-medium text-destructive mt-1">{errors.assetId.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Description</label>
                <textarea
                  placeholder="Describe the issues or damages in detail..."
                  rows={3}
                  className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                  {...register("issueDescription")}
                />
                {errors.issueDescription && (
                  <p className="text-xs font-medium text-destructive mt-1">{errors.issueDescription.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Priority</label>
                <select
                  className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  {...register("priority")}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground font-semibold">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Request"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ASSIGN TECHNICIAN MODAL --- */}
      {assignModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setAssignModal({ isOpen: false, request: null });
                setTechnicianName("");
              }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold mb-1">Assign Technician</h2>
            <p className="text-xs text-muted-foreground mb-4">Assign a technician to start the maintenance work.</p>

            <form onSubmit={handleAssignTechnician} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Technician Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                  className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => {
                  setAssignModal({ isOpen: false, request: null });
                  setTechnicianName("");
                }}>Cancel</Button>
                <Button type="submit" disabled={submitting || !technicianName.trim()} className="bg-primary text-primary-foreground font-semibold">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign & Start"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
