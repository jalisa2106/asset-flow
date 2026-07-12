"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Plus, Filter, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssetTable, Asset } from "@/components/assets/AssetTable";
import { BadgeStatus } from "@/components/assets/AssetStatusBadge";

const MOCK_ASSETS: Asset[] = [
  { id: "1", tag: "AF-0114", name: "Dell XPS 15", category: "Laptops", status: "allocated" as BadgeStatus, location: "Engineering" },
  { id: "2", tag: "AF-0062", name: "Epson Projector", category: "A/V Equipment", status: "maintenance" as BadgeStatus, location: "Room B2" },
  { id: "3", tag: "AF-0891", name: "Ergonomic Chair", category: "Furniture", status: "available" as BadgeStatus, location: "Storage A" },
  { id: "4", tag: "AF-0102", name: "MacBook Pro M2", category: "Laptops", status: "allocated" as BadgeStatus, location: "Design Studio" },
  { id: "5", tag: "AF-0334", name: "Standing Desk", category: "Furniture", status: "retired" as BadgeStatus, location: "Storage B" },
];

export default function AssetsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <>
      <div className="fixed top-16 left-0 lg:left-64 right-0 z-20 bg-background px-4 md:px-6 lg:px-8 py-4 md:py-5">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground font-serif">Asset Directory</h1>
            <p className="text-muted-foreground mt-1 text-xs md:text-sm">Manage and track all organizational assets.</p>
          </div>
          <Link href="/assets/new" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md rounded-lg py-5 px-6">
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
            placeholder="Search by tag, serial, or QR code..."
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
          <button className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm font-medium hover:bg-muted transition-colors">
            Category
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
          <button className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm font-medium hover:bg-muted transition-colors">
            Status
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
          <button className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm font-medium hover:bg-muted transition-colors">
            Department
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <AssetTable assets={MOCK_ASSETS} />
      </div>
    </>
  );
}
