import { cn } from "@/lib/utils";

export type BadgeStatus =
  | "available"
  | "allocated"
  | "maintenance"
  | "retired"
  | "lost"
  | "verified"
  | "damaged"
  | "missing"
  | "active"
  | "inactive";

interface StatusBadgeProps {
  status: BadgeStatus;
  label?: string;
  className?: string;
}

const statusConfig: Record<BadgeStatus, { bg: string; text: string; label: string }> = {
  available: { bg: "bg-positive/20", text: "text-positive-foreground", label: "Available" },
  allocated: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-800 dark:text-blue-300", label: "Allocated" },
  maintenance: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-800 dark:text-amber-300", label: "Under Maintenance" },
  retired: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-800 dark:text-gray-300", label: "Retired" },
  lost: { bg: "bg-destructive/20", text: "text-destructive font-semibold", label: "Lost" },
  verified: { bg: "bg-positive/20", text: "text-positive-foreground", label: "Verified" },
  damaged: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-800 dark:text-amber-300", label: "Damaged" },
  missing: { bg: "bg-destructive/20", text: "text-destructive font-semibold", label: "Missing" },
  active: { bg: "bg-positive/20", text: "text-positive-foreground", label: "Active" },
  inactive: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-800 dark:text-gray-300", label: "Inactive" },
};

export function AssetStatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.available;
  
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        config.bg,
        config.text,
        className
      )}
    >
      {label || config.label}
    </span>
  );
}
