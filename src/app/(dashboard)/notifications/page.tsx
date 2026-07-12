"use client";

import { useState } from "react";
import { NotificationItem, NotificationType } from "@/components/notifications/NotificationItem";

type FilterType = "All" | "Unread" | "Alerts" | "Bookings";

const NOTIFICATIONS = [
  { id: "1", type: "asset_assigned" as NotificationType, message: "Laptop AF-0114 assigned to Priya Shah", timestamp: "2h ago", isUnread: true },
  { id: "2", type: "transfer_approved" as NotificationType, message: "Transfer approved: AF-0033 to Facilities dept", timestamp: "5h ago", isUnread: true },
  { id: "3", type: "audit_discrepancy" as NotificationType, message: "Audit discrepancy flagged: AF-0891 damaged", timestamp: "2d ago", isUnread: false },
  { id: "4", type: "booking_confirmed" as NotificationType, message: "Booking confirmed: Conference Room B2 for tomorrow", timestamp: "3d ago", isUnread: false },
  { id: "5", type: "overdue_return" as NotificationType, message: "Overdue return alert: AF-0021 Projector from Engineering", timestamp: "1w ago", isUnread: false },
  { id: "6", type: "maintenance_approved" as NotificationType, message: "Maintenance approved for Ergonomic Chair AF-0891", timestamp: "1w ago", isUnread: false },
];

export default function NotificationsPage() {
  const [activeFilter, setActiveFilter] = useState<FilterType>("All");

  const filters: FilterType[] = ["All", "Unread", "Alerts", "Bookings"];

  const filteredNotifications = NOTIFICATIONS.filter((notif) => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Unread") return notif.isUnread;
    if (activeFilter === "Alerts") return notif.type === "audit_discrepancy" || notif.type === "overdue_return";
    if (activeFilter === "Bookings") return notif.type.startsWith("booking");
    return true;
  });

  return (
    <>
      <div className="fixed top-16 left-0 lg:left-64 right-0 z-20 bg-background px-4 md:px-6 lg:px-8 py-4 md:py-5">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground font-serif">Activity & Notifications</h1>
          <p className="text-muted-foreground mt-1 text-xs md:text-sm">Stay updated on asset movements, requests, and alerts.</p>
        </div>
      </div>

      <div className="pt-24 md:pt-28 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 max-w-3xl mx-auto">

      <div className="flex items-center gap-2 border-b border-border pb-4 overflow-x-auto hide-scrollbar">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              activeFilter === filter 
                ? "bg-foreground text-background" 
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No notifications found.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="divide-y divide-border">
              {filteredNotifications.map((notif) => (
                <NotificationItem
                  key={notif.id}
                  type={notif.type}
                  message={notif.message}
                  timestamp={notif.timestamp}
                  isUnread={notif.isUnread}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      </div>
    </>
  );
}
