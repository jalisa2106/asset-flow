"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ShieldAlert,
  History,
  ArrowRightLeft,
  UserCheck,
  AlertCircle,
  CalendarDays,
  FileText,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/apiFetch";
import {
  createAllocationSchema as allocationSchema,
  createTransferRequestSchema as transferRequestSchema,
  type CreateAllocationInput as AllocationInput,
  type CreateTransferRequestInput as TransferRequestInput,
} from "@/lib/validators/allocation.schema";

interface Asset {
  id: string;
  asset_tag: string;
  name: string;
  status: string;
  current_holder?: string;
  current_holder_id?: string;
  current_department?: string;
  current_allocation_id?: string;
}

interface Employee {
  id: string;
  full_name: string;
  department?: { name: string } | null;
}

interface Department {
  id: string;
  name: string;
}

interface AllocationRecord {
  id: string;
  allocated_at: string;
  status: string;
  expected_return_date?: string | null;
  employee?: { full_name: string } | null;
  department?: { name: string } | null;
}

export default function AssetAllocationPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allocHistory, setAllocHistory] = useState<AllocationRecord[]>([]);
  const [pendingTransfers, setPendingTransfers] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [notesText, setNotesText] = useState("");

  const selectedAsset = useMemo(
    () => assets.find((a) => a.id === selectedAssetId),
    [assets, selectedAssetId]
  );

  // --- DATA FETCHING ---
  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const [assetsRes, empRes, deptRes] = await Promise.all([
        apiFetch("/api/assets?pageSize=100"),
        apiFetch("/api/employees?pageSize=100"),
        apiFetch("/api/departments"),
      ]);
      const [assetsJson, empJson, deptJson] = await Promise.all([
        assetsRes.json(),
        empRes.json(),
        deptRes.json(),
      ]);

      const rawAssets: any[] = assetsJson.data || [];
      // Build a flat asset list with current holder info from active allocation data
      const formattedAssets: Asset[] = rawAssets
        .filter((a: any) => ["Available", "Allocated"].includes(a.status))
        .map((a: any) => ({
          id: a.id,
          asset_tag: a.asset_tag,
          name: a.name,
          status: a.status,
        }));

      setAssets(formattedAssets);
      setEmployees(empJson.data || []);
      setDepartments(deptJson.data || []);
    } catch (err: any) {
      toast.error("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPendingTransfers = useCallback(async () => {
    try {
      const res = await apiFetch("/api/allocations/transfers?status=Requested");
      const json = await res.json();
      setPendingTransfers(json.data || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
    fetchPendingTransfers();
  }, [fetchAssets, fetchPendingTransfers]);

  // Fetch allocation history + current holder for selected asset
  useEffect(() => {
    if (!selectedAssetId) {
      setAllocHistory([]);
      return;
    }
    setLoadingHistory(true);
    apiFetch(`/api/allocations?assetId=${selectedAssetId}&pageSize=20`)
      .then((r) => r.json())
      .then((json) => {
        setAllocHistory(json.data || []);
      })
      .catch(() => toast.error("Failed to load allocation history."))
      .finally(() => setLoadingHistory(false));
  }, [selectedAssetId]);

  // Derive current active allocation from history
  const currentAllocation = useMemo(
    () => allocHistory.find((a) => a.status === "Active"),
    [allocHistory]
  );

  const isCurrentlyAllocated = selectedAsset?.status === "Allocated";

  // Allocation Form
  const {
    register: registerAlloc,
    handleSubmit: handleAllocSubmit,
    formState: { errors: allocErrors },
    reset: resetAllocForm,
  } = useForm<AllocationInput>({
    resolver: zodResolver(allocationSchema),
    defaultValues: { assetId: "", employeeId: "", departmentId: "", expectedReturnDate: "" },
  });

  // Transfer Form
  const {
    register: registerTransfer,
    handleSubmit: handleTransferSubmit,
    formState: { errors: transferErrors },
    reset: resetTransferForm,
  } = useForm<TransferRequestInput>({
    resolver: zodResolver(transferRequestSchema),
    defaultValues: { allocationId: "", toEmployeeId: "", reason: "" },
  });

  const handleAssetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedAssetId(val);
    setNotesText("");
    resetAllocForm({ assetId: val, employeeId: "", departmentId: "", expectedReturnDate: "" });
    resetTransferForm({ allocationId: "", toEmployeeId: "", reason: "" });
  };

  // Reset allocationId in transfer form when history loads
  useEffect(() => {
    if (currentAllocation) {
      resetTransferForm({ allocationId: currentAllocation.id, toEmployeeId: "", reason: "" });
    }
  }, [currentAllocation, resetTransferForm]);

  const onAllocate = async (data: AllocationInput) => {
    if (!selectedAsset) return;
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: selectedAsset.id,
          employeeId: data.employeeId || undefined,
          departmentId: data.departmentId || undefined,
          expectedReturnDate: data.expectedReturnDate || undefined,
          notes: notesText || undefined,
        }),
      });
      const json = await res.json();

      if (res.status === 409 && json.code === "ALREADY_ALLOCATED") {
        toast.error(`Asset already allocated to ${json.currentHolder || "someone"}. Submit a transfer request instead.`);
        return;
      }

      if (!res.ok) throw new Error(json.error || "Failed to allocate asset.");

      const empName = employees.find((e) => e.id === data.employeeId)?.full_name;
      toast.success(`Asset "${selectedAsset.name}" allocated to ${empName || "employee"}.`);
      setSelectedAssetId("");
      setNotesText("");
      resetAllocForm();
      fetchAssets();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const onTransferRequest = async (data: TransferRequestInput) => {
    if (!selectedAsset || !currentAllocation) return;
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/allocations/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allocationId: currentAllocation.id,
          toEmployeeId: data.toEmployeeId,
          reason: data.reason,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit transfer request.");

      const targetEmpName = employees.find((e) => e.id === data.toEmployeeId)?.full_name;
      toast.success(`Transfer request submitted for "${selectedAsset.name}" → ${targetEmpName || "employee"}.`);
      setSelectedAssetId("");
      resetTransferForm();
      fetchAssets();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const onReturnAsset = async () => {
    if (!selectedAsset || !currentAllocation) return;
    const notes = window.prompt("Enter condition notes for return (optional):");
    if (notes === null) return; // user cancelled

    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/allocations/${currentAllocation.id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnConditionNotes: notes }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to process return.");

      toast.success(`Asset "${selectedAsset.name}" has been returned successfully.`);
      setSelectedAssetId("");
      fetchAssets();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const onProcessTransfer = async (transferId: string, action: "approve" | "reject") => {
    setSubmitting(true);
    try {
      const endpoint = action === "approve"
        ? `/api/allocations/transfers/${transferId}/approve`
        : `/api/allocations/transfers/${transferId}/reject`;

      const res = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "reject" ? { reason: "Rejected by manager" } : {}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Failed to ${action} transfer.`);

      toast.success(`Transfer ${action}d successfully.`);
      fetchPendingTransfers();
      fetchAssets();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Allocation &amp; Transfer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Allocate available assets or initiate transfers for currently occupied assets.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-6">
        {/* Asset Selection */}
        <div className="space-y-1.5 max-w-md">
          <label className="text-xs font-semibold text-foreground/80" htmlFor="asset-select">
            Select Asset to Allocate or Transfer
          </label>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading assets...</span>
            </div>
          ) : (
            <select
              id="asset-select"
              value={selectedAssetId}
              onChange={handleAssetChange}
              className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">-- Choose an Asset --</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.asset_tag} — {asset.name} ({asset.status})
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedAsset && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {isCurrentlyAllocated ? (
              <div className="space-y-6">
                {/* Conflict Banner */}
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-950/25 dark:text-red-200 flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm">
                      Already Allocated
                      {currentAllocation?.employee?.full_name && ` to ${currentAllocation.employee.full_name}`}
                      {currentAllocation?.department?.name && ` (${currentAllocation.department.name})`}
                    </h4>
                    <p className="text-xs text-red-700/90 dark:text-red-300/90 mt-0.5">
                      Direct re-allocation is blocked — submit a transfer request below.
                    </p>
                  </div>
                </div>

                {/* Inline Transfer Form */}
                <form onSubmit={handleTransferSubmit(onTransferRequest)} className="space-y-4 max-w-xl">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4 text-primary" />
                    <span>Transfer Request Form</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground/80">From (Current Holder)</label>
                      <input
                        type="text"
                        value={currentAllocation?.employee?.full_name || "Unknown"}
                        disabled
                        className="block w-full rounded-lg border border-input bg-muted py-2.5 px-3 text-sm text-muted-foreground outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground/80">To (Target Employee)</label>
                      <select
                        className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        {...registerTransfer("toEmployeeId")}
                      >
                        <option value="">-- Select Target Employee --</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.full_name} {emp.department?.name ? `(${emp.department.name})` : ""}
                          </option>
                        ))}
                      </select>
                      {transferErrors.toEmployeeId && (
                        <p className="text-xs font-medium text-destructive mt-1">{transferErrors.toEmployeeId.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground/80">Reason for Transfer</label>
                    <textarea
                      placeholder="Specify why this asset transfer is required..."
                      rows={3}
                      className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                      {...registerTransfer("reason")}
                    />
                    {transferErrors.reason && (
                      <p className="text-xs font-medium text-destructive mt-1">{transferErrors.reason.message}</p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Transfer Request"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={submitting}
                      onClick={onReturnAsset}
                      className="border-destructive/20 text-destructive hover:bg-destructive/10 font-semibold px-4"
                    >
                      Process Return
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
              /* Allocation Form (Available assets) */
              <form onSubmit={handleAllocSubmit(onAllocate)} className="space-y-4 max-w-xl">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  <span>Direct Allocation Form</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground/80">Allocate To (Employee)</label>
                    <select
                      className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      {...registerAlloc("employeeId")}
                    >
                      <option value="">-- Select Employee --</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.full_name}
                        </option>
                      ))}
                    </select>
                    {allocErrors.employeeId && (
                      <p className="text-xs font-medium text-destructive mt-1">{allocErrors.employeeId.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground/80">Department</label>
                    <select
                      className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      {...registerAlloc("departmentId")}
                    >
                      <option value="">-- Select Department --</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                    {allocErrors.departmentId && (
                      <p className="text-xs font-medium text-destructive mt-1">{allocErrors.departmentId.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Expected Return Date</span>
                    </label>
                    <input
                      type="date"
                      className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      {...registerAlloc("expectedReturnDate")}
                    />
                    {allocErrors.expectedReturnDate && (
                      <p className="text-xs font-medium text-destructive mt-1">{allocErrors.expectedReturnDate.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Allocation Notes</span>
                  </label>
                  <textarea
                    placeholder="Enter condition details or notes..."
                    rows={3}
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Allocate Asset"}
                </Button>
              </form>
            )}

            {/* Allocation History */}
            <div className="pt-6 border-t border-border space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <History className="h-4 w-4 text-muted-foreground" />
                <span>Allocation History</span>
              </h3>

              {loadingHistory ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading history...</span>
                </div>
              ) : allocHistory.length > 0 ? (
                <div className="relative border-l-2 border-border ml-2.5 pl-5 space-y-5">
                  {allocHistory.map((hist) => (
                    <div key={hist.id} className="relative text-xs">
                      <div className="absolute -left-[27px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-primary" />
                      <div className="flex items-center gap-2 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                        <span>{new Date(hist.allocated_at).toLocaleDateString("en-GB")}</span>
                        <span>•</span>
                        <span className={`px-1.5 rounded font-bold ${
                          hist.status === "Active"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {hist.status}
                        </span>
                      </div>
                      <p className="text-foreground font-semibold mt-1">
                        {hist.employee?.full_name || "Unknown Employee"}
                        {hist.department?.name && ` — ${hist.department.name}`}
                      </p>
                      {hist.expected_return_date && (
                        <p className="text-muted-foreground mt-0.5">
                          Expected return: {new Date(hist.expected_return_date).toLocaleDateString("en-GB")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No allocation history available for this asset.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="rounded-xl border border-blue-500/10 bg-blue-500/5 p-4 text-xs text-muted-foreground flex items-start gap-2.5 max-w-3xl">
        <AlertCircle className="h-4 w-4 shrink-0 text-primary mt-0.5" />
        <span>
          <strong>Product Constraint Rule 3</strong>: Direct re-allocation of an already allocated asset is strictly blocked. Clicking an allocated asset forces a transfer request, which logs previous holder information automatically.
        </span>
      </div>

      {/* Pending Transfers List for Managers */}
      {pendingTransfers.length > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            <span>Pending Transfer Requests</span>
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pendingTransfers.map((t) => (
              <div key={t.id} className="border border-border rounded-xl p-4 space-y-3 bg-muted/20">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-foreground">
                      {t.allocation?.assets?.name || "Asset"} <span className="text-muted-foreground text-xs font-mono">({t.allocation?.assets?.asset_tag})</span>
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Requested by <span className="font-semibold text-foreground">{t.from_employee?.full_name}</span> → <span className="font-semibold text-foreground">{t.to_employee?.full_name}</span>
                    </p>
                  </div>
                  <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                    Pending
                  </span>
                </div>
                {t.reason && (
                  <p className="text-xs text-muted-foreground bg-background rounded-md p-2 border border-border">
                    <span className="font-semibold">Reason:</span> {t.reason}
                  </p>
                )}
                <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                  <Button size="xs" variant="outline" className="border-destructive/20 text-destructive hover:bg-destructive/10" disabled={submitting} onClick={() => onProcessTransfer(t.id, "reject")}>
                    Reject
                  </Button>
                  <Button size="xs" className="bg-primary text-primary-foreground" disabled={submitting} onClick={() => onProcessTransfer(t.id, "approve")}>
                    Approve Transfer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
