"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Plus, Filter, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssetTable, Asset } from "@/components/assets/AssetTable";
import { BadgeStatus } from "@/components/assets/AssetStatusBadge";
import { apiFetch } from "@/lib/apiFetch";

interface ApiResponseAsset {
  id: string;
  asset_tag: string;
  name: string;
  status: string;
  location: string;
  asset_categories?: { name: string };
  departments?: { name: string };
}

export default function AssetsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load categories and departments for filters (optional UI Polish)
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    async function loadFilters() {
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
        console.error("Failed to load filter metadata:", err);
      }
    }
    loadFilters();
  }, []);

  useEffect(() => {
    async function loadAssets() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (searchQuery) queryParams.set("q", searchQuery);
        if (categoryFilter) queryParams.set("category", categoryFilter);
        if (statusFilter) queryParams.set("status", statusFilter);
        if (departmentFilter) queryParams.set("department", departmentFilter);

        const res = await apiFetch(`/api/assets?${queryParams.toString()}`);
        if (!res.ok) {
          throw new Error("Failed to load asset directory.");
        }
        const json = await res.json();
        const dataList: ApiResponseAsset[] = json.data || [];

        const mapped: Asset[] = dataList.map((item) => {
          const s = item.status.toLowerCase();
          let badgeStatus: BadgeStatus = "available";
          if (s === "under maintenance") badgeStatus = "maintenance";
          else if (s === "available") badgeStatus = "available";
          else if (s === "allocated") badgeStatus = "allocated";
          else if (s === "reserved") badgeStatus = "active";
          else if (s === "lost") badgeStatus = "lost";
          else if (s === "retired") badgeStatus = "retired";
          else if (s === "disposed") badgeStatus = "retired";

          return {
            id: item.id,
            tag: item.asset_tag,
            name: item.name,
            category: item.asset_categories?.name || "General",
            status: badgeStatus,
            location: item.location || item.departments?.name || "Corporate HQ",
          };
        });

        setAssets(mapped);
      } catch (err: any) {
        setError(err.message || "An error occurred.");
      } finally {
        setLoading(false);
      }
    }

    const delayDebounce = setTimeout(() => {
      loadAssets();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, categoryFilter, statusFilter, departmentFilter]);

  return (
    <>
      <div className="fixed top-16 left-0 lg:left-64 right-0 z-20 bg-background px-4 md:px-6 lg:px-8 py-4 md:py-5">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground font-serif">Asset Directory</h1>
            <p className="text-muted-foreground mt-1 text-xs md:text-sm">Manage and track all organizational assets.</p>
          </div>
          <Link href="/assets/new" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md rounded-lg py-5 px-6 font-semibold">
              <Plus className="h-4 w-4 shrink-0" />
              Register Asset
            </Button>
          </Link>
        </div>
      </div>

      <div className="pt-32 sm:pt-28 md:pt-28 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-4">
          {/* Search Bar */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by tag, name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-input bg-background py-3 pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 mr-2 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4" />
              Filters:
            </div>
            
            {/* Category Select Dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm font-medium hover:bg-muted outline-none transition-colors"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            {/* Status Select Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm font-medium hover:bg-muted outline-none transition-colors"
            >
              <option value="">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Allocated">Allocated</option>
              <option value="Reserved">Reserved</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Lost">Lost</option>
              <option value="Retired">Retired</option>
            </select>

            {/* Department Select Dropdown */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm font-medium hover:bg-muted outline-none transition-colors"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex h-[40vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-destructive text-sm font-semibold">
            {error}
          </div>
        ) : (
          <AssetTable assets={assets} />
        )}
      </div>
    </>
  );
}
