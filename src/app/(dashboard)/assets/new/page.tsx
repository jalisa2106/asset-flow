"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Box, Save } from "lucide-react";
import Link from "next/link";

import { z } from "zod";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/apiFetch";
import { createAssetSchema, type CreateAssetInput } from "@/lib/validators/asset.schema";

export default function NewAssetPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Setup
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<z.input<typeof createAssetSchema>>({
    resolver: zodResolver(createAssetSchema),
    defaultValues: {
      name: "",
      categoryId: "",
      serialNumber: "",
      acquisitionDate: new Date().toISOString().slice(0, 10),
      acquisitionCost: 0,
      condition: "Good",
      location: "",
      departmentId: "",
      isBookable: false,
    },
  });

  useEffect(() => {
    async function loadMetadata() {
      try {
        const [catRes, deptRes] = await Promise.all([
          apiFetch("/api/categories"),
          apiFetch("/api/departments"),
        ]);
        if (catRes.ok) {
          const json = await catRes.json();
          setCategories(json.data || json || []);
        }
        if (deptRes.ok) {
          const json = await deptRes.json();
          setDepartments(json.data || json || []);
        }
      } catch (err) {
        toast.error("Failed to load category or department metadata.");
      } finally {
        setLoadingMeta(false);
      }
    }
    loadMetadata();
  }, []);

  const onSubmit = async (data: z.input<typeof createAssetSchema>) => {
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          acquisitionCost: data.acquisitionCost ? Number(data.acquisitionCost) : undefined,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to register asset.");
      }

      toast.success("Asset registered successfully!");
      router.push("/assets");
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/assets">
          <Button variant="outline" size="icon" className="rounded-lg h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Register New Asset</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Add a new physical item or device to the system directory.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground/80">Asset Name</label>
            <input
              type="text"
              placeholder="e.g., MacBook Pro 16-inch M3"
              className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              {...register("name")}
            />
            {errors.name && <p className="text-xs font-medium text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground/80">Category</label>
              <select
                className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                {...register("categoryId")}
              >
                <option value="">-- Select Category --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              {errors.categoryId && <p className="text-xs font-medium text-destructive mt-1">{errors.categoryId.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground/80">Serial Number</label>
              <input
                type="text"
                placeholder="e.g., C02XL812JG1"
                className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                {...register("serialNumber")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground/80">Acquisition Date</label>
              <input
                type="date"
                className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                {...register("acquisitionDate")}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground/80">Acquisition Cost (USD)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                {...register("acquisitionCost", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground/80">Location</label>
              <input
                type="text"
                placeholder="e.g., Corporate HQ Room 302"
                className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                {...register("location")}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground/80">Assigned Department</label>
              <select
                className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                {...register("departmentId")}
              >
                <option value="">-- No Department (General pool) --</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground/80">Initial Condition</label>
              <select
                className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                {...register("condition")}
              >
                <option value="New">New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="isBookable"
                className="h-4.5 w-4.5 accent-primary rounded border-input focus:ring-primary/20"
                {...register("isBookable")}
              />
              <label htmlFor="isBookable" className="text-xs font-semibold text-foreground/80 cursor-pointer">
                Allow as a Bookable Shared Resource
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Link href="/assets">
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
              <span>Save Asset</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
