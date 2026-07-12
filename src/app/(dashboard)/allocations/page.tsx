"use client";

import React, { useState, useMemo } from "react";
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
  FileText 
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  createAllocationSchema as allocationSchema,
  createTransferRequestSchema as transferRequestSchema,
  type CreateAllocationInput as AllocationInput,
  type CreateTransferRequestInput as TransferRequestInput,
} from "@/lib/validators/allocation.schema";

// --- VALID UUIDS FOR SCHEMA SATISFACTION ---
const MOCK_UUIDS = {
  assets: [
    "e9d8c873-10d9-482a-bc91-9e767ebdb15a",
    "d8d8c873-10d9-482a-bc91-9e767ebdb15b",
    "c8d8c873-10d9-482a-bc91-9e767ebdb15c",
    "b8d8c873-10d9-482a-bc91-9e767ebdb15d",
  ],
  employees: [
    "1111c873-10d9-482a-bc91-9e767ebdb15a",
    "2222c873-10d9-482a-bc91-9e767ebdb15b",
    "3333c873-10d9-482a-bc91-9e767ebdb15c",
    "4444c873-10d9-482a-bc91-9e767ebdb15d",
    "5555c873-10d9-482a-bc91-9e767ebdb15e",
  ],
  departments: [
    "aaaaa873-10d9-482a-bc91-9e767ebdb15a",
    "bbbbb873-10d9-482a-bc91-9e767ebdb15b",
    "ccccc873-10d9-482a-bc91-9e767ebdb15c",
    "ddddd873-10d9-482a-bc91-9e767ebdb15d",
  ],
  allocations: [
    "7777c873-10d9-482a-bc91-9e767ebdb15a",
    "8888c873-10d9-482a-bc91-9e767ebdb15b",
    "9999c873-10d9-482a-bc91-9e767ebdb15c",
    "0000c873-10d9-482a-bc91-9e767ebdb15d",
  ]
};

const MOCK_EMPLOYEES = [
  { id: MOCK_UUIDS.employees[0], fullName: "Priya Shah", department: "Engineering" },
  { id: MOCK_UUIDS.employees[1], fullName: "Arjun Nair", department: "Engineering" },
  { id: MOCK_UUIDS.employees[2], fullName: "Alice Vance", department: "Engineering" },
  { id: MOCK_UUIDS.employees[3], fullName: "Bob Smith", department: "Frontend Core" },
  { id: MOCK_UUIDS.employees[4], fullName: "Clara Jones", department: "Design Studio" },
];

const MOCK_DEPARTMENTS = [
  { id: MOCK_UUIDS.departments[0], name: "Engineering" },
  { id: MOCK_UUIDS.departments[1], name: "Frontend Core" },
  { id: MOCK_UUIDS.departments[2], name: "Design Studio" },
  { id: MOCK_UUIDS.departments[3], name: "Operations" },
];

interface Asset {
  id: string;
  tag: string;
  name: string;
  status: "Available" | "Allocated";
  currentHolder?: string;
  currentHolderId?: string;
  currentDepartment?: string;
  currentAllocationId?: string;
  history: Array<{
    date: string;
    action: string;
    actor: string;
    note: string;
  }>;
}

const INITIAL_ASSETS: Asset[] = [
  {
    id: MOCK_UUIDS.assets[0],
    tag: "AF-0114",
    name: "Dell Laptop Latitude 5420",
    status: "Allocated",
    currentHolder: "Priya Shah",
    currentHolderId: MOCK_UUIDS.employees[0],
    currentDepartment: "Engineering",
    currentAllocationId: MOCK_UUIDS.allocations[0],
    history: [
      { date: "2026-03-12", action: "Allocated", actor: "Priya Shah", note: "Allocated for core dev task. Condition: Good" },
      { date: "2026-01-09", action: "Returned", actor: "Arjun Nair", note: "Returned. Condition: Good" },
    ],
  },
  {
    id: MOCK_UUIDS.assets[1],
    tag: "AF-0033",
    name: "Herman Miller Aeron Chair",
    status: "Available",
    history: [
      { date: "2026-02-15", action: "Returned", actor: "Clara Jones", note: "Condition: Excellent" },
    ],
  },
  {
    id: MOCK_UUIDS.assets[2],
    tag: "AF-0912",
    name: "Apple MacBook Pro 16",
    status: "Allocated",
    currentHolder: "Alice Vance",
    currentHolderId: MOCK_UUIDS.employees[2],
    currentDepartment: "Engineering",
    currentAllocationId: MOCK_UUIDS.allocations[1],
    history: [
      { date: "2026-04-01", action: "Allocated", actor: "Alice Vance", note: "New hire allocation." },
    ],
  },
  {
    id: MOCK_UUIDS.assets[3],
    tag: "AF-0089",
    name: "Logitech MX Master 3S Mouse",
    status: "Available",
    history: [
      { date: "2026-05-10", action: "Returned", actor: "Bob Smith", note: "Upgrade replacement return." },
    ],
  },
];

export default function AssetAllocationPage() {
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [notesText, setNotesText] = useState("");

  const selectedAsset = useMemo(() => {
    return assets.find((a) => a.id === selectedAssetId);
  }, [assets, selectedAssetId]);

  // Allocation Form (Available assets)
  const {
    register: registerAlloc,
    handleSubmit: handleAllocSubmit,
    formState: { errors: allocErrors },
    reset: resetAllocForm,
  } = useForm<AllocationInput>({
    resolver: zodResolver(allocationSchema),
    defaultValues: { assetId: "", employeeId: "", departmentId: "", expectedReturnDate: "" },
  });

  // Transfer Form (Allocated assets)
  const {
    register: registerTransfer,
    handleSubmit: handleTransferSubmit,
    formState: { errors: transferErrors },
    reset: resetTransferForm,
  } = useForm<TransferRequestInput>({
    resolver: zodResolver(transferRequestSchema),
    defaultValues: { allocationId: "", toEmployeeId: "", reason: "" },
  });

  // Handle select asset change
  const handleAssetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedAssetId(val);
    setNotesText("");
    
    resetAllocForm({ assetId: val, employeeId: "", departmentId: "", expectedReturnDate: "" });
    resetTransferForm({
      allocationId: assets.find((a) => a.id === val)?.currentAllocationId || "",
      toEmployeeId: "",
      reason: "",
    });
  };

  const onAllocate = (data: AllocationInput) => {
    if (!selectedAsset) return;

    const targetEmpName = MOCK_EMPLOYEES.find((emp) => emp.id === data.employeeId)?.fullName || "Unknown Employee";
    const targetDeptName = MOCK_DEPARTMENTS.find((dept) => dept.id === data.departmentId)?.name || "Unknown Department";

    const updatedAsset: Asset = {
      ...selectedAsset,
      status: "Allocated",
      currentHolder: targetEmpName,
      currentHolderId: data.employeeId,
      currentDepartment: targetDeptName,
      // eslint-disable-next-line react-hooks/purity
      currentAllocationId: `alloc-${Date.now()}`,
      history: [
        {
          date: new Date().toISOString().split("T")[0],
          action: "Allocated",
          actor: targetEmpName,
          note: notesText || "No notes provided.",
        },
        ...selectedAsset.history,
      ],
    };

    setAssets(assets.map((a) => (a.id === selectedAsset.id ? updatedAsset : a)));
    toast.success(`Asset "${selectedAsset.name}" allocated to ${targetEmpName}.`);
    setSelectedAssetId("");
    setNotesText("");
    resetAllocForm();
  };

  const onTransferRequest = (data: TransferRequestInput) => {
    if (!selectedAsset) return;

    const targetEmpName = MOCK_EMPLOYEES.find((emp) => emp.id === data.toEmployeeId)?.fullName || "Unknown Employee";
    const targetEmpDept = MOCK_EMPLOYEES.find((emp) => emp.id === data.toEmployeeId)?.department || "Unknown Department";

    const updatedAsset: Asset = {
      ...selectedAsset,
      status: "Allocated",
      currentHolder: targetEmpName,
      currentHolderId: data.toEmployeeId,
      currentDepartment: targetEmpDept,
      // eslint-disable-next-line react-hooks/purity
      currentAllocationId: `alloc-${Date.now()}`,
      history: [
        {
          date: new Date().toISOString().split("T")[0],
          action: "Transferred",
          actor: targetEmpName,
          note: `Transferred from ${selectedAsset.currentHolder}. Reason: ${data.reason || "None provided."}`,
        },
        ...selectedAsset.history,
      ],
    };

    setAssets(assets.map((a) => (a.id === selectedAsset.id ? updatedAsset : a)));
    toast.success(`Transfer request submitted and asset transferred to ${targetEmpName}.`);
    setSelectedAssetId("");
    resetTransferForm();
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Allocation & Transfer</h1>
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
          <select
            id="asset-select"
            value={selectedAssetId}
            onChange={handleAssetChange}
            className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">-- Choose an Asset --</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.tag} — {asset.name} ({asset.status})
              </option>
            ))}
          </select>
        </div>

        {selectedAsset && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* CONFLICT BLOCK (Screen 5 Requirement) */}
            {selectedAsset.status === "Allocated" ? (
              <div className="space-y-6">
                {/* Custom refined Red Banner */}
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-950/25 dark:text-red-200 flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm">
                      Already Allocated to {selectedAsset.currentHolder} ({selectedAsset.currentDepartment})
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
                        value={selectedAsset.currentHolder || ""}
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
                        {MOCK_EMPLOYEES.filter((emp) => emp.id !== selectedAsset.currentHolderId).map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.fullName} ({emp.department})
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

                  <Button
                    type="submit"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4"
                  >
                    Submit Transfer Request
                  </Button>
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
                      {MOCK_EMPLOYEES.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.fullName}
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
                      {MOCK_DEPARTMENTS.map((dept) => (
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
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4"
                >
                  Allocate Asset
                </Button>
              </form>
            )}

            {/* Allocation History */}
            <div className="pt-6 border-t border-border space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <History className="h-4 w-4 text-muted-foreground" />
                <span>Allocation History</span>
              </h3>
              
              {selectedAsset.history && selectedAsset.history.length > 0 ? (
                <div className="relative border-l-2 border-border ml-2.5 pl-5 space-y-5">
                  {selectedAsset.history.map((hist, idx) => (
                    <div key={idx} className="relative text-xs">
                      {/* Timeline dot */}
                      <div className="absolute -left-[27px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-primary"></div>
                      <div className="flex items-center gap-2 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                        <span>{hist.date}</span>
                        <span>•</span>
                        <span className={`px-1.5 py-0.2 rounded font-bold ${
                          hist.action === "Allocated" 
                            ? "bg-primary/10 text-primary" 
                            : "bg-positive/30 text-positive-foreground dark:bg-positive/10 dark:text-positive"
                        }`}>
                          {hist.action}
                        </span>
                      </div>
                      <p className="text-foreground font-semibold mt-1">Actor: {hist.actor}</p>
                      <p className="text-muted-foreground mt-0.5">{hist.note}</p>
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

      {/* Static conflict banner info box explaining the system design */}
      <div className="rounded-xl border border-blue-500/10 bg-blue-500/5 p-4 text-xs text-muted-foreground flex items-start gap-2.5 max-w-3xl">
        <AlertCircle className="h-4 w-4 shrink-0 text-primary mt-0.5" />
        <span>
          <strong>Product Constraint Rule 3</strong>: Direct re-allocation of an already allocated asset is strictly blocked. Clicking an allocated asset forces a transfer request, which logs previous holder information automatically.
        </span>
      </div>
    </div>
  );
}
