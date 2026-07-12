"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Bell, CheckCircle2, History, RotateCcw, AlertCircle, CalendarDays, BookOpen } from "lucide-react";
import { toast } from "sonner";

import { NotificationItem, NotificationType } from "@/components/notifications/NotificationItem";
import { apiFetch } from "@/lib/apiFetch";
import { Button } from "@/components/ui/button";

interface NotificationData {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface ActivityData {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  employee_profiles?: { full_name: string };
}

// Map database activity log actions to user-facing labels
const ACTION_LABEL_MAP: Record<string, string> = {
  "asset.registered": "registered a new asset",
  "asset.updated": "updated asset details",
  "asset.status_changed": "changed asset status of",
  "allocation.created": "allocated asset to",
  "allocation.returned": "received returned asset from",
  "transfer.requested": "submitted transfer request for",
  "transfer.approved": "approved transfer of",
  "transfer.rejected": "rejected transfer request for",
  "booking.created": "booked resource",
  "booking.cancelled": "cancelled booking for",
  "booking.rescheduled": "rescheduled booking for",
  "maintenance.created": "raised maintenance request for",
  "maintenance.approved": "approved maintenance for",
  "maintenance.assigned": "assigned technician for",
  "maintenance.in_progress": "started repairs on",
  "maintenance.resolved": "resolved maintenance for",
  "audit.created": "initiated audit cycle",
  "audit.item_verified": "verified audit item of",
  "audit.completed": "closed audit cycle",
};

export default function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [activities, setActivities] = useState<ActivityData[]>([]);
  
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const [loadingActs, setLoadingActs] = useState(true);

  // Load user notifications
  const fetchNotifications = async () => {
    setLoadingNotifs(true);
    try {
      const res = await apiFetch(`/api/notifications?unreadOnly=${unreadOnly}`);
      if (!res.ok) throw new Error("Could not load notifications.");
      const json = await res.json();
      setNotifications(json.data || json || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load notifications.");
    } finally {
      setLoadingNotifs(false);
    }
  };

  // Load recent org-wide activities
  const fetchActivities = async () => {
    setLoadingActs(true);
    try {
      const res = await apiFetch("/api/activity-log?pageSize=20");
      if (!res.ok) throw new Error("Could not load activity log.");
      const json = await res.json();
      setActivities(json.data || json || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load activity logs.");
    } finally {
      setLoadingActs(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [unreadOnly]);

  useEffect(() => {
    fetchActivities();
  }, []);

  const handleMarkAsRead = async (notifId: string) => {
    try {
      const res = await apiFetch(`/api/notifications/${notifId}/read`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Failed to mark as read.");
      
      // Update local state
      setNotifications(
        notifications.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
      );
      toast.success("Notification marked as read.");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const mapNotificationType = (dbType: string): NotificationType => {
    const t = dbType.toLowerCase();
    if (t.includes("assigned")) return "asset_assigned";
    if (t.includes("transfer") && t.includes("approved")) return "transfer_approved";
    if (t.includes("booking") && t.includes("confirmed")) return "booking_confirmed";
    if (t.includes("booking") && t.includes("cancelled")) return "booking_cancelled";
    if (t.includes("booking") && t.includes("reminder")) return "booking_reminder";
    if (t.includes("maintenance") && t.includes("approved")) return "maintenance_approved";
    if (t.includes("maintenance") && t.includes("rejected")) return "maintenance_rejected";
    if (t.includes("overdue")) return "overdue_return";
    if (t.includes("audit") || t.includes("discrepancy") || t.includes("missing") || t.includes("damaged")) return "audit_discrepancy";
    return "booking_reminder";
  };

  const formatActivityText = (act: ActivityData) => {
    const actorName = act.employee_profiles?.full_name || "Someone";
    const actionDesc = ACTION_LABEL_MAP[act.action] || act.action || "performed an action";
    return `${actorName} ${actionDesc} (${act.entity_type})`;
  };

  return (
    <>
      <div className="fixed top-16 left-0 lg:left-64 right-0 z-20 bg-background px-4 md:px-6 lg:px-8 py-4 md:py-5">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground font-serif">Activity & Notifications</h1>
          <p className="text-muted-foreground mt-1 text-xs md:text-sm">Stay updated on asset movements, requests, and alerts.</p>
        </div>
      </div>

      <div className="pt-24 md:pt-28 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left Columns (Span 2): Notifications */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="text-base font-bold text-foreground flex items-center gap-1.5">
                  <Bell className="h-4 w-4 text-primary" />
                  <span>My Inbox</span>
                </h2>
                <div className="flex gap-2">
                  <Button
                    variant={unreadOnly ? "outline" : "default"}
                    size="sm"
                    className="text-xs font-semibold py-1 px-3 rounded-lg"
                    onClick={() => setUnreadOnly(false)}
                  >
                    All
                  </Button>
                  <Button
                    variant={unreadOnly ? "default" : "outline"}
                    size="sm"
                    className="text-xs font-semibold py-1 px-3 rounded-lg"
                    onClick={() => setUnreadOnly(true)}
                  >
                    Unread Only
                  </Button>
                </div>
              </div>

              {loadingNotifs ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((n) => (
                    <div key={n.id} className="relative group">
                      <NotificationItem
                        type={mapNotificationType(n.type)}
                        message={n.message}
                        timestamp={new Date(n.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                        isUnread={!n.is_read}
                      />
                      {!n.is_read && (
                        <button
                          onClick={() => handleMarkAsRead(n.id)}
                          className="absolute right-4 top-4 hidden group-hover:block bg-muted/80 text-foreground border border-border rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <div className="text-center py-12 text-sm text-muted-foreground">
                      No notifications found.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Activity log stream */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-foreground flex items-center gap-1.5 border-b border-border pb-3">
                <History className="h-4 w-4 text-primary" />
                <span>Enterprise Feed</span>
              </h2>

              {loadingActs ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {activities.map((act) => (
                    <div key={act.id} className="text-xs space-y-1 p-2 hover:bg-muted/30 rounded-lg transition-colors border-l-2 border-primary/20 pl-3">
                      <p className="font-semibold text-foreground leading-snug">
                        {formatActivityText(act)}
                      </p>
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        {new Date(act.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                  {activities.length === 0 && (
                    <div className="text-center py-10 text-xs text-muted-foreground">
                      No activities logged.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
