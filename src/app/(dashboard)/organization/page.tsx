"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { 
  Building2, 
  Tags, 
  Users, 
  Plus, 
  UserCog, 
  X, 
  ShieldAlert, 
  AlertCircle,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/apiFetch";
import {
  departmentSchema,
  categorySchema,
  promoteRoleSchema,
  type DepartmentInput,
  type CategoryInput,
  type PromoteRoleInput,
} from "@/lib/validators/org-setup.schema";

interface Department {
  id: string;
  name: string;
  head_employee_id: string | null;
  parent_department_id: string | null;
  status: "Active" | "Inactive";
  head?: { full_name: string } | null;
}

interface Category {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  status: "Active" | "Inactive";
}

interface Employee {
  id: string;
  full_name: string;
  email: string;
  role: "Admin" | "Asset Manager" | "Department Head" | "Employee";
  department_id: string | null;
  department?: { name: string } | null;
}

export default function OrganizationSetupPage() {
  const [activeTab, setActiveTab] = useState<"departments" | "categories" | "employees">("departments");

  // Data States
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [modalType, setModalType] = useState<"add-dept" | "add-cat" | "promote" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // --- DATA FETCHING ---
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [deptRes, catRes, empRes] = await Promise.all([
        apiFetch("/api/departments"),
        apiFetch("/api/categories"),
        apiFetch("/api/employees?pageSize=100"),
      ]);
      const [deptJson, catJson, empJson] = await Promise.all([
        deptRes.json(),
        catRes.json(),
        empRes.json(),
      ]);
      setDepartments(deptJson.data || []);
      setCategories(catJson.data || []);
      setEmployees(empJson.data || []);
    } catch (err: any) {
      toast.error("Failed to load organization data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // --- FORM HANDLERS ---

  // Department Form
  const {
    register: registerDept,
    handleSubmit: handleDeptSubmit,
    formState: { errors: deptErrors },
    reset: resetDeptForm,
  } = useForm<z.input<typeof departmentSchema>>({
    resolver: (values, context, options) => {
      const cleaned = { ...values };
      if (cleaned.parentDeptId === "") delete cleaned.parentDeptId;
      if (cleaned.headEmployeeId === "") delete cleaned.headEmployeeId;
      return zodResolver(departmentSchema)(cleaned, context, options);
    },
    defaultValues: { name: "", headEmployeeId: "", parentDeptId: "", status: "Active" },
  });

  // Category Form
  const {
    register: registerCat,
    handleSubmit: handleCatSubmit,
    formState: { errors: catErrors },
    reset: resetCatForm,
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", code: "", description: "", status: "Active" },
  });

  // Promote Role Form
  const {
    register: registerPromote,
    handleSubmit: handlePromoteSubmit,
    formState: { errors: promoteErrors },
    reset: resetPromoteForm,
  } = useForm<PromoteRoleInput>({
    resolver: zodResolver(promoteRoleSchema),
    defaultValues: { role: "Employee", departmentId: "" },
  });

  const onAddDept = async (data: z.input<typeof departmentSchema>) => {
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          headEmployeeId: data.headEmployeeId || undefined,
          parentDeptId: data.parentDeptId || undefined,
          status: data.status,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add department.");
      toast.success(`Department "${data.name}" added successfully.`);
      resetDeptForm();
      setModalType(null);
      fetchAll();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const onAddCat = async (data: CategoryInput) => {
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add category.");
      toast.success(`Category "${data.name}" added successfully.`);
      resetCatForm();
      setModalType(null);
      fetchAll();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const onPromoteRole = async (data: PromoteRoleInput) => {
    if (!selectedEmployeeId) return;
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/employees/${selectedEmployeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: data.role,
          departmentId: data.departmentId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update role.");
      const empName = employees.find((e) => e.id === selectedEmployeeId)?.full_name;
      toast.success(`Updated role for ${empName} to ${data.role}.`);
      resetPromoteForm();
      setSelectedEmployeeId(null);
      setModalType(null);
      fetchAll();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openPromoteModal = (empId: string, currentRole: string, currentDeptId: string | null) => {
    setSelectedEmployeeId(empId);
    resetPromoteForm({
      role: currentRole as any,
      departmentId: currentDeptId || "",
    });
    setModalType("promote");
  };

  const handleAddButtonClick = () => {
    if (activeTab === "departments") setModalType("add-dept");
    if (activeTab === "categories") setModalType("add-cat");
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Upper bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organization Setup</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your organization&apos;s departments, asset categories, and employee roles.
          </p>
        </div>
        {activeTab !== "employees" && (
          <Button
            onClick={handleAddButtonClick}
            className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2 py-5 px-4 shadow-md font-semibold text-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>
              {activeTab === "departments" && "Add Department"}
              {activeTab === "categories" && "Add Category"}
            </span>
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6 gap-2">
        <button
          onClick={() => setActiveTab("departments")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "departments"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Departments</span>
        </button>
        <button
          onClick={() => setActiveTab("categories")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "categories"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Tags className="h-4 w-4" />
          <span>Asset Categories</span>
        </button>
        <button
          onClick={() => setActiveTab("employees")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "employees"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Employees</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* DEPARTMENTS TAB */}
            {activeTab === "departments" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-slate-50 dark:bg-slate-900/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="px-6 py-4">Department Name</th>
                      <th className="px-6 py-4">Department Head</th>
                      <th className="px-6 py-4">Parent Dept</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm font-medium">
                    {departments.map((dept) => {
                      const parentName = departments.find((d) => d.id === dept.parent_department_id)?.name;
                      return (
                        <tr key={dept.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                          <td className="px-6 py-4 text-foreground font-semibold">{dept.name}</td>
                          <td className="px-6 py-4 text-muted-foreground">{dept.head?.full_name || "—"}</td>
                          <td className="px-6 py-4 text-muted-foreground">{parentName || "—"}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              dept.status === "Active"
                                ? "bg-positive/30 text-positive-foreground dark:bg-positive/10 dark:text-positive"
                                : "border border-border text-muted-foreground"
                            }`}>
                              {dept.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {departments.length === 0 && (
                      <tr><td colSpan={4} className="px-6 py-10 text-center text-sm text-muted-foreground">No departments found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* CATEGORIES TAB */}
            {activeTab === "categories" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-slate-50 dark:bg-slate-900/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="px-6 py-4">Category Name</th>
                      <th className="px-6 py-4">Code</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm font-medium">
                    {categories.map((cat) => (
                      <tr key={cat.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                        <td className="px-6 py-4 text-foreground font-semibold">{cat.name}</td>
                        <td className="px-6 py-4 text-primary font-mono font-semibold">{cat.code}</td>
                        <td className="px-6 py-4 text-muted-foreground max-w-xs truncate">{cat.description || "—"}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            cat.status === "Active"
                              ? "bg-positive/30 text-positive-foreground dark:bg-positive/10 dark:text-positive"
                              : "border border-border text-muted-foreground"
                          }`}>
                            {cat.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {categories.length === 0 && (
                      <tr><td colSpan={4} className="px-6 py-10 text-center text-sm text-muted-foreground">No categories found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* EMPLOYEES TAB */}
            {activeTab === "employees" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-slate-50 dark:bg-slate-900/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Current Role</th>
                      <th className="px-6 py-4">Department</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm font-medium">
                    {employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                        <td className="px-6 py-4 text-foreground font-semibold">{emp.full_name}</td>
                        <td className="px-6 py-4 text-muted-foreground">{emp.email}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            emp.role === "Admin"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                              : emp.role === "Asset Manager"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
                              : emp.role === "Department Head"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
                              : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400"
                          }`}>
                            {emp.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{emp.department?.name || "—"}</td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            onClick={() => openPromoteModal(emp.id, emp.role, emp.department_id)}
                            variant="outline"
                            size="sm"
                            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground font-semibold inline-flex items-center gap-1.5"
                          >
                            <UserCog className="h-3.5 w-3.5" />
                            <span>Change Role</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {employees.length === 0 && (
                      <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-muted-foreground">No employees found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Info Box */}
      <div className="mt-8 rounded-xl border border-blue-500/10 bg-blue-500/5 p-4 text-xs text-muted-foreground flex items-start gap-2.5 max-w-3xl">
        <AlertCircle className="h-4 w-4 shrink-0 text-primary mt-0.5" />
        <span>
          Editing departments, categories, and employees here drives the picklists and hierarchies used in <strong>Asset Registration</strong> (Screen 4) and <strong>Asset Allocation</strong> (Screen 5).
        </span>
      </div>

      {/* --- MODALS --- */}
      
      {/* 1. ADD DEPARTMENT MODAL */}
      {modalType === "add-dept" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setModalType(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold mb-1">Add Department</h2>
            <p className="text-xs text-muted-foreground mb-4">Create a new organizational department.</p>

            <form onSubmit={handleDeptSubmit(onAddDept)} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Department Name</label>
                <input
                  type="text"
                  placeholder="e.g., Finance, Human Resources"
                  className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  {...registerDept("name")}
                />
                {deptErrors.name && (
                  <p className="text-xs font-medium text-destructive mt-1">{deptErrors.name.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Department Head (Optional)</label>
                <select
                  className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  {...registerDept("headEmployeeId")}
                >
                  <option value="">No Head assigned</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Parent Department (Optional)</label>
                <select
                  className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  {...registerDept("parentDeptId")}
                >
                  <option value="">No Parent (Root level)</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Status</label>
                <select
                  className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  {...registerDept("status")}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setModalType(null)}>Cancel</Button>
                <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground font-semibold">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Department"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. ADD CATEGORY MODAL */}
      {modalType === "add-cat" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setModalType(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold mb-1">Add Asset Category</h2>
            <p className="text-xs text-muted-foreground mb-4">Create a new asset classification type.</p>

            <form onSubmit={handleCatSubmit(onAddCat)} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Category Name</label>
                <input
                  type="text"
                  placeholder="e.g., Heavy Machinery, Vehicles"
                  className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  {...registerCat("name")}
                />
                {catErrors.name && (
                  <p className="text-xs font-medium text-destructive mt-1">{catErrors.name.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Category Code (Shortcode)</label>
                <input
                  type="text"
                  placeholder="e.g., VEHI, MACH"
                  className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 uppercase"
                  {...registerCat("code")}
                />
                {catErrors.code && (
                  <p className="text-xs font-medium text-destructive mt-1">{catErrors.code.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Description</label>
                <textarea
                  placeholder="Detailed description of assets belonging to this category..."
                  rows={3}
                  className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                  {...registerCat("description")}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Status</label>
                <select
                  className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  {...registerCat("status")}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setModalType(null)}>Cancel</Button>
                <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground font-semibold">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Category"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. PROMOTE ROLE MODAL */}
      {modalType === "promote" && selectedEmployeeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => {
                setModalType(null);
                setSelectedEmployeeId(null);
              }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold mb-1">Promote &amp; Change Role</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Change role for {employees.find((e) => e.id === selectedEmployeeId)?.full_name}.
            </p>

            <form onSubmit={handlePromoteSubmit(onPromoteRole)} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Assigned Role</label>
                <select
                  className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  {...registerPromote("role")}
                >
                  <option value="Employee">Employee</option>
                  <option value="Department Head">Department Head</option>
                  <option value="Asset Manager">Asset Manager</option>
                  <option value="Admin">Admin</option>
                </select>
                {promoteErrors.role && (
                  <p className="text-xs font-medium text-destructive mt-1">{promoteErrors.role.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Department Scope</label>
                <select
                  className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  {...registerPromote("departmentId")}
                >
                  <option value="">No department scope</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3.5 text-xs text-yellow-800 dark:text-yellow-300 flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0 text-yellow-500 mt-0.5" />
                <span>
                  <strong>Product Constraint Rule 1</strong>: Signups are strictly Employee-only. Role promotion must only happen in this Org Setup employee directory dashboard.
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setModalType(null);
                    setSelectedEmployeeId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground font-semibold">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
