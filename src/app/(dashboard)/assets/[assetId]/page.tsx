"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Calendar, DollarSign, MapPin, Briefcase, FileText, CheckCircle2, History, Edit, Save, ToggleLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/apiFetch";
import { AssetStatusBadge, BadgeStatus } from "@/components/assets/AssetStatusBadge";

interface AssetDetail {
  id: string;
  asset_tag: string;
  name: string;
  serial_number?: string;
  acquisition_date?: string;
  acquisition_cost?: number;
  condition: string;
  location?: string;
  is_bookable: boolean;
  status: string;
  category_id: string;
  department_id?: string;
  asset_categories?: { name: string };
  departments?: { name: string };
}

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assetId = params.assetId as string;

  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    serial_number: "",
    location: "",
    is_bookable: false,
    condition: "Good",
  });

  // Change Status state
  const [newStatus, setNewStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    async function loadAsset() {
      try {
        const res = await apiFetch(`/api/assets/${assetId}`);
        if (!res.ok) {
          throw new Error("Failed to load asset details.");
        }
        const json = await res.json();
        const data = json.data || json;
        setAsset(data);
        setEditForm({
          name: data.name,
          serial_number: data.serial_number || "",
          location: data.location || "",
          is_bookable: data.is_bookable || false,
          condition: data.condition || "Good",
        });
        setNewStatus(data.status);
      } catch (err: any) {
        setError(err.message || "An error occurred.");
      } finally {
        setLoading(false);
      }
    }
    loadAsset();
  }, [assetId]);

  const handleUpdateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch(`/api/assets/${assetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          serialNumber: editForm.serial_number,
          location: editForm.location,
          isBookable: editForm.is_bookable,
          condition: editForm.condition,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to update asset.");
      }

      toast.success("Asset details updated!");
      setAsset((prev) => prev ? { ...prev, ...editForm } : null);
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err.message || "Could not save details.");
    }
  };

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingStatus(true);
    try {
      const res = await apiFetch(`/api/assets/${assetId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          reason: statusReason,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Invalid status transition.");
      }

      toast.success(`Asset status changed to ${newStatus}!`);
      setAsset((prev) => prev ? { ...prev, status: newStatus } : null);
      setStatusReason("");
    } catch (err: any) {
      toast.error(err.message || "Transition blocked by system rules.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-destructive text-sm font-semibold">
        {error || "Asset not found."}
      </div>
    );
  }

  const s = asset.status.toLowerCase();
  let badgeStatus: BadgeStatus = "available";
  if (s === "under maintenance") badgeStatus = "maintenance";
  else if (s === "available") badgeStatus = "available";
  else if (s === "allocated") badgeStatus = "allocated";
  else if (s === "reserved") badgeStatus = "active";
  else if (s === "lost") badgeStatus = "lost";
  else if (s === "retired") badgeStatus = "retired";
  else if (s === "disposed") badgeStatus = "retired";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-4">
          <Link href="/assets">
            <Button variant="outline" size="icon" className="rounded-lg h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-sm font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                {asset.asset_tag}
              </span>
              <AssetStatusBadge status={badgeStatus} />
            </div>
            <h1 className="text-2xl font-bold mt-1 text-foreground">{asset.name}</h1>
          </div>
        </div>

        <div className="flex gap-2">
          <Link href={`/assets/${assetId}/history`}>
            <Button variant="outline" className="gap-1.5 font-semibold text-sm py-4">
              <History className="h-4 w-4" />
              <span>Asset History</span>
            </Button>
          </Link>
          <Button 
            onClick={() => setIsEditing(!isEditing)} 
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-4"
          >
            <Edit className="h-4 w-4 mr-1.5" />
            {isEditing ? "View Details" : "Edit Asset"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Main Specs / Edit form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            {isEditing ? (
              <form onSubmit={handleUpdateAsset} className="space-y-4">
                <h3 className="text-sm font-bold text-foreground border-b border-border pb-2 mb-4">Edit Asset Details</h3>
                
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground/80">Asset Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground/80">Serial Number</label>
                    <input
                      type="text"
                      value={editForm.serial_number}
                      onChange={(e) => setEditForm({ ...editForm, serial_number: e.target.value })}
                      className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground/80">Location</label>
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground/80">Condition</label>
                    <select
                      value={editForm.condition}
                      onChange={(e) => setEditForm({ ...editForm, condition: e.target.value })}
                      className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    >
                      <option value="New">New</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Poor">Poor</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="isBookable"
                      checked={editForm.is_bookable}
                      onChange={(e) => setEditForm({ ...editForm, is_bookable: e.target.checked })}
                      className="h-4.5 w-4.5 rounded border-input text-primary"
                    />
                    <label htmlFor="isBookable" className="text-xs font-semibold text-foreground/80">
                      Bookable Resource
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border mt-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button type="submit" className="bg-primary text-primary-foreground font-semibold">Save Changes</Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-foreground border-b border-border pb-2">Asset Specifications</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="h-4 w-4 shrink-0 text-primary" />
                    <span>Category: <strong className="text-foreground">{asset.asset_categories?.name || "General"}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0 text-primary" />
                    <span>Location: <strong className="text-foreground">{asset.location || "HQ"}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0 text-primary" />
                    <span>Acquired: <strong className="text-foreground">{asset.acquisition_date || "N/A"}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4 shrink-0 text-primary" />
                    <span>Acquisition Cost: <strong className="text-foreground">${asset.acquisition_cost || "0.00"}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <span>Serial Number: <strong className="text-foreground font-mono">{asset.serial_number || "None"}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    <span>Condition: <strong className="text-foreground">{asset.condition}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ToggleLeft className="h-4 w-4 shrink-0 text-primary" />
                    <span>Bookable: <strong className="text-foreground">{asset.is_bookable ? "Yes" : "No"}</strong></span>
                  </div>
                  {asset.departments?.name && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Briefcase className="h-4 w-4 shrink-0 text-primary" />
                      <span>Department: <strong className="text-foreground">{asset.departments.name}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Status Lifecycle Control */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground border-b border-border pb-2">Status Management</h3>
            
            <form onSubmit={handleStatusChange} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Lifecycle State</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                >
                  <option value="Available">Available</option>
                  <option value="Allocated">Allocated</option>
                  <option value="Reserved">Reserved</option>
                  <option value="Under Maintenance">Under Maintenance</option>
                  <option value="Lost">Lost</option>
                  <option value="Retired">Retired</option>
                  <option value="Disposed">Disposed</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Transition Reason</label>
                <textarea
                  placeholder="Notes for history logs..."
                  rows={2}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="block w-full rounded-lg border border-input bg-background py-2 px-3 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={updatingStatus || newStatus === asset.status}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center justify-center gap-1 py-4"
              >
                {updatingStatus && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Apply Status Transition</span>
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
