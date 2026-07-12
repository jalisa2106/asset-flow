"use client";

import React, { useState } from "react";
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
  Clock 
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  createMaintenanceSchema,
} from "@/lib/validators/maintenance.schema";

// --- TYPES ---
interface MaintenanceRequest {
  id: string;
  assetTag: string;
  assetName: string;
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "Pending" | "Approved" | "Technician Assigned" | "In Progress" | "Resolved";
  technician?: string;
  updatedAt: string;
}

// --- MOCK INITIAL STATE ---
const INITIAL_REQUESTS: MaintenanceRequest[] = [
  {
    id: "req-1",
    assetTag: "AF-0062",
    assetName: "Epson Projector B1",
    title: "Bulb not turning on",
    description: "The main projection bulb fails to ignite. Status red indicator flashing.",
    priority: "High",
    status: "Pending",
    updatedAt: "12 Jul 2026",
  },
  {
    id: "req-2",
    assetTag: "AF-0114",
    assetName: "Dell Laptop Latitude 5420",
    title: "Battery swollen",
    description: "The bottom chassis is expanding due to swollen lithium pouch.",
    priority: "Critical",
    status: "Approved",
    updatedAt: "11 Jul 2026",
  },
  {
    id: "req-3",
    assetTag: "AF-0033",
    assetName: "Herman Miller Aeron Chair",
    title: "Hydraulic cylinder sinking",
    description: "The pneumatic lift cylinder slowly sinks when sitting down.",
    priority: "Medium",
    status: "Technician Assigned",
    technician: "Alex Mercer",
    updatedAt: "10 Jul 2026",
  },
  {
    id: "req-4",
    assetTag: "AF-0891",
    assetName: "Logitech MX Mouse",
    title: "Left click double clicking",
    description: "Left button microswitch is bouncing and register double clicks.",
    priority: "Low",
    status: "In Progress",
    technician: "Alex Mercer",
    updatedAt: "09 Jul 2026",
  },
  {
    id: "req-5",
    assetTag: "AF-873",
    assetName: "Conference Desk C",
    title: "Chair leg repair",
    description: "Support bracket on leg re-welded.",
    priority: "Medium",
    status: "Resolved",
    technician: "Sam Patel",
    updatedAt: "07 Jul 2026",
  },
];

const MOCK_ASSETS = [
  { id: "8816c873-10d9-482a-bc91-9e767ebdb15a", tag: "AF-0062", name: "Epson Projector B1" },
  { id: "7716c873-10d9-482a-bc91-9e767ebdb15b", tag: "AF-0114", name: "Dell Laptop Latitude 5420" },
  { id: "6616c873-10d9-482a-bc91-9e767ebdb15c", tag: "AF-0033", name: "Herman Miller Aeron Chair" },
  { id: "5516c873-10d9-482a-bc91-9e767ebdb15d", tag: "AF-0891", name: "Logitech MX Mouse" },
];

export default function MaintenancePage() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>(INITIAL_REQUESTS);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form setup
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<z.input<typeof createMaintenanceSchema>>({
    resolver: zodResolver(createMaintenanceSchema),
    defaultValues: { assetId: "", issueDescription: "", priority: "Medium" },
  });

  const onSubmit = (data: z.input<typeof createMaintenanceSchema>) => {
    const selectedAsset = MOCK_ASSETS.find((a) => a.id === data.assetId);
    if (!selectedAsset) return;

    const newRequest: MaintenanceRequest = {
      // eslint-disable-next-line react-hooks/purity
      id: `req-${Date.now()}`,
      assetTag: selectedAsset.tag,
      assetName: selectedAsset.name,
      title: data.issueDescription.split(" ").slice(0, 4).join(" ") + "...",
      description: data.issueDescription,
      priority: data.priority || "Medium",
      status: "Pending",
      updatedAt: new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    };

    setRequests([newRequest, ...requests]);
    toast.success(`Maintenance request for "${selectedAsset.name}" submitted!`);
    reset();
    setIsAddModalOpen(false);
  };

  // Helper to update request status (workflow transition)
  const advanceStatus = (reqId: string, currentStatus: MaintenanceRequest["status"]) => {
    let nextStatus: MaintenanceRequest["status"] = currentStatus;
    let toastMsg = "";

    if (currentStatus === "Pending") {
      nextStatus = "Approved";
      toastMsg = "Request approved! Asset status flipped to [Under Maintenance].";
    } else if (currentStatus === "Approved") {
      nextStatus = "Technician Assigned";
      toastMsg = "Technician Alex Mercer assigned to task.";
    } else if (currentStatus === "Technician Assigned") {
      nextStatus = "In Progress";
      toastMsg = "Repair work initiated.";
    } else if (currentStatus === "In Progress") {
      nextStatus = "Resolved";
      toastMsg = "Repair resolved successfully! Asset status reverted to [Available].";
    }

    setRequests(
      requests.map((req) =>
        req.id === reqId
          ? {
              ...req,
              status: nextStatus,
              technician: nextStatus === "Technician Assigned" ? "Alex Mercer" : req.technician,
              updatedAt: new Date().toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
            }
          : req
      )
    );

    toast.success(toastMsg);
  };

  // Group columns
  const columns: { title: MaintenanceRequest["status"]; color: string }[] = [
    { title: "Pending", color: "bg-slate-100 dark:bg-slate-800" },
    { title: "Approved", color: "bg-blue-50/50 dark:bg-blue-950/15" },
    { title: "Technician Assigned", color: "bg-purple-50/50 dark:bg-purple-950/15" },
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

      {/* Kanban Board Container (Scrollable on smaller viewports) */}
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
                        <span className="font-mono text-xs font-semibold text-primary">{req.assetTag}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          req.priority === "Critical"
                            ? "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400"
                            : req.priority === "High"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                            : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400"
                        }`}>
                          {req.priority}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-foreground">{req.assetName}</h4>
                      <p className="text-xs text-muted-foreground font-semibold mt-0.5">{req.title}</p>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2">{req.description}</p>

                    {req.technician && (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-semibold">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Tech: {req.technician}</span>
                      </div>
                    )}

                    {/* Progress action button */}
                    {req.status !== "Resolved" && (
                      <div className="pt-2 border-t border-border flex justify-end">
                        <Button
                          onClick={() => advanceStatus(req.id, req.status)}
                          size="xs"
                          variant="outline"
                          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground font-semibold flex items-center gap-1 py-3"
                        >
                          <span>
                            {req.status === "Pending" && "Approve"}
                            {req.status === "Approved" && "Assign Tech"}
                            {req.status === "Technician Assigned" && "Start Work"}
                            {req.status === "In Progress" && "Resolve"}
                          </span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    {req.status === "Resolved" && (
                      <div className="pt-2 border-t border-emerald-200/50 flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Resolved — {req.updatedAt}</span>
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

      {/* Kanban Info Footer */}
      <div className="rounded-xl border border-blue-500/10 bg-blue-500/5 p-4 text-xs text-muted-foreground flex items-start gap-2.5 max-w-3xl">
        <AlertCircle className="h-4 w-4 shrink-0 text-primary mt-0.5" />
        <span>
          <strong>Product Constraint Rule 5</strong>: Raising a maintenance request holds the asset in its current status. Approving the request advances the asset state to <strong>Under Maintenance</strong>, and Resolving the request flips it back to <strong>Available</strong> automatically.
        </span>
      </div>

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
                  {MOCK_ASSETS.map((a) => (
                    <option key={a.id} value={a.id}>{a.tag} — {a.name}</option>
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
                <Button type="submit" className="bg-primary text-primary-foreground font-semibold">Submit Request</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
