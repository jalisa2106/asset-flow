import { cn } from "@/lib/utils";
import { 
  CheckCircle2, 
  RotateCcw, 
  CalendarDays, 
  AlertCircle, 
  AlertTriangle,
  Wrench,
  Ban,
  Bell,
  LucideIcon
} from "lucide-react";

export type NotificationType = 
  | "asset_assigned"
  | "transfer_approved"
  | "booking_confirmed"
  | "booking_cancelled"
  | "booking_reminder"
  | "maintenance_approved"
  | "maintenance_rejected"
  | "overdue_return"
  | "audit_discrepancy";

interface NotificationItemProps {
  type: NotificationType;
  message: string;
  timestamp: string;
  isUnread?: boolean;
}

const typeConfig: Record<NotificationType, { icon: LucideIcon, color: string, bgColor: string }> = {
  asset_assigned: { icon: CheckCircle2, color: "text-positive", bgColor: "bg-positive/10" },
  transfer_approved: { icon: RotateCcw, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  booking_confirmed: { icon: CalendarDays, color: "text-purple-500", bgColor: "bg-purple-500/10" },
  booking_cancelled: { icon: Ban, color: "text-gray-500", bgColor: "bg-gray-500/10" },
  booking_reminder: { icon: Bell, color: "text-amber-500", bgColor: "bg-amber-500/10" },
  maintenance_approved: { icon: Wrench, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  maintenance_rejected: { icon: Ban, color: "text-destructive", bgColor: "bg-destructive/10" },
  overdue_return: { icon: AlertTriangle, color: "text-amber-500", bgColor: "bg-amber-500/10" },
  audit_discrepancy: { icon: AlertCircle, color: "text-destructive", bgColor: "bg-destructive/10" },
};

export function NotificationItem({ type, message, timestamp, isUnread }: NotificationItemProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div className={cn("flex items-start gap-3 md:gap-4 p-3 md:p-4 transition-colors", isUnread ? "bg-muted/30" : "hover:bg-muted/10")}>
      <div className={cn("mt-0.5 p-1 md:p-1.5 rounded-full shrink-0", config.bgColor, config.color)}>
        <Icon className="h-4 w-4 md:h-5 md:w-5" />
      </div>
      <div className="flex-1 space-y-1 md:space-y-1.5">
        <p className={cn("text-xs md:text-sm text-foreground leading-snug", isUnread ? "font-semibold" : "font-medium")}>
          {message}
        </p>
        <p className="text-[10px] md:text-xs text-muted-foreground">{timestamp}</p>
      </div>
      {isUnread && (
        <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-primary mt-1 md:mt-1.5 shrink-0" />
      )}
    </div>
  );
}
