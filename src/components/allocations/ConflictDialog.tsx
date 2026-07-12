import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConflictDialogProps {
  title: string;
  message: string;
  className?: string;
}

export function ConflictDialog({ title, message, className }: ConflictDialogProps) {
  return (
    <div className={cn("rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive flex items-start gap-3", className)}>
      <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="flex flex-col">
        <span className="text-sm font-bold">{title}</span>
        <span className="text-sm font-medium opacity-90 mt-0.5">{message}</span>
      </div>
    </div>
  );
}
