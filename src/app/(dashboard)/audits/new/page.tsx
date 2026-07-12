"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Shield, Save } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/apiFetch";
import { createAuditCycleSchema } from "@/lib/validators/audit.schema";

interface Department {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  fullName: string;
}

export default function NewAuditCyclePage() {
  const router = useRouter();
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Selected auditor state (mock multi-select helper)
  const [selectedAuditors, setSelectedAuditors] = useState<string[]>([]);

  // Form Setup
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createAuditCycleSchema),
    defaultValues: {
      name: "",
      scopeDepartmentId: "",
      scopeLocation: "",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      auditorEmployeeIds: [] as string[],
    },
  });

  useEffect(() => {
    async function loadMetadata() {
      try {
        const [resDepts, resEmps] = await Promise.all([
          apiFetch("/api/departments"),
          apiFetch("/api/employees"),
        ]);
        if (resDepts.ok) {
          const json = await resDepts.json();
          setDepartments(json.data || json || []);
        }
        if (resEmps.ok) {
          const json = await resEmps.json();
          setEmployees(json.data || json || []);
        }
      } catch (err) {
        toast.error("Failed to load audit cycle form options.");
      } finally {
        setLoadingMeta(false);
      }
    }
    loadMetadata();
  }, []);

  const handleToggleAuditor = (empId: string) => {
    let next: string[];
    if (selectedAuditors.includes(empId)) {
      next = selectedAuditors.filter((id) => id !== empId);
    } else {
      next = [...selectedAuditors, empId];
    }
    setSelectedAuditors(next);
    setValue("auditorEmployeeIds", next, { shouldValidate: true });
  };

  const onSubmit = async (data: any) => {
    if (selectedAuditors.length === 0) {
      toast.error("Please assign at least one auditor.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch("/api/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          scopeDepartmentId: data.scopeDepartmentId || undefined,
          scopeLocation: data.scopeLocation || undefined,
          startDate: data.startDate,
          endDate: data.endDate,
          auditorEmployeeIds: selectedAuditors,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to initiate audit cycle.");
      }

      toast.success("Audit cycle initiated and verification tasks seeded!");
      router.push("/audits");
    } catch (err: any) {
      toast.error(err.message || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingMeta) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/audits">
          <Button variant="outline" size="icon" className="rounded-lg h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Initiate Audit Cycle</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Scoping parameters and assign inventory auditors.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground/80">Cycle Name</label>
            <input
              type="text"
              placeholder="e.g., Q3 Engineering Equipment Reconcile"
              className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              {...register("name")}
            />
            {errors.name && <p className="text-xs font-medium text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground/80">Scope Department (Optional)</label>
              <select
                className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                {...register("scopeDepartmentId")}
              >
                <option value="">-- All Departments --</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground/80">Scope Location (Optional)</label>
              <input
                type="text"
                placeholder="e.g., HQ - Floor 3"
                className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                {...register("scopeLocation")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground/80">Start Date</label>
              <input
                type="date"
                className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                {...register("startDate")}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground/80">End Date</label>
              <input
                type="date"
                className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                {...register("endDate")}
              />
            </div>
          </div>

          {/* Assigned Auditors (Multiple Selection Checklist) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground/80">Assign Auditors (Select multiple)</label>
            <div className="border border-border rounded-xl p-3 max-h-40 overflow-y-auto space-y-2 bg-muted/20">
              {employees.map((emp) => (
                <div 
                  key={emp.id}
                  onClick={() => handleToggleAuditor(emp.id)}
                  className="flex items-center gap-2.5 p-1.5 hover:bg-muted rounded-md cursor-pointer text-sm font-medium"
                >
                  <input
                    type="checkbox"
                    checked={selectedAuditors.includes(emp.id)}
                    readOnly
                    className="h-4.5 w-4.5 accent-primary rounded border-input"
                  />
                  <span>{emp.fullName}</span>
                </div>
              ))}
            </div>
            {errors.auditorEmployeeIds && (
              <p className="text-xs font-medium text-destructive mt-1">At least one auditor is required.</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Link href="/audits">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-1.5"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>Initiate Cycle</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
