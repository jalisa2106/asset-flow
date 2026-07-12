import { ChevronDown, Check } from "lucide-react";
import { AssetStatusBadge, BadgeStatus } from "@/components/assets/AssetStatusBadge";

export interface AuditItem {
  id: string;
  tag: string;
  name: string;
  location: string;
  verification: BadgeStatus;
}

interface AuditorVerificationGridProps {
  items: AuditItem[];
  onUpdateVerification?: (id: string, status: BadgeStatus) => void;
}

export function AuditorVerificationGrid({ items, onUpdateVerification }: AuditorVerificationGridProps) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Desktop/Tablet Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Asset</th>
              <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Expected Location</th>
              <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Verification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{item.name}</span>
                    <span className="text-xs text-muted-foreground">{item.tag}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-muted-foreground">{item.location}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {onUpdateVerification ? (
                      <div className="relative group/dropdown">
                        <button className="flex items-center gap-2 border border-border bg-background rounded-md px-2 py-1 hover:border-primary/50 transition-colors">
                          <AssetStatusBadge status={item.verification} />
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        </button>
                        <div className="absolute top-full left-0 mt-1 w-36 rounded-md border border-border bg-popover shadow-md opacity-0 invisible group-hover/dropdown:opacity-100 group-hover/dropdown:visible transition-all z-10 flex flex-col p-1">
                          <button onClick={() => onUpdateVerification(item.id, "verified")} className="text-left px-2 py-1.5 text-xs hover:bg-muted rounded-sm flex items-center gap-2 text-foreground">
                            {item.verification === "verified" && <Check className="h-3 w-3 text-positive" />} Verified
                          </button>
                          <button onClick={() => onUpdateVerification(item.id, "missing")} className="text-left px-2 py-1.5 text-xs hover:bg-muted rounded-sm flex items-center gap-2 text-foreground">
                            {item.verification === "missing" && <Check className="h-3 w-3 text-destructive" />} Missing
                          </button>
                          <button onClick={() => onUpdateVerification(item.id, "damaged")} className="text-left px-2 py-1.5 text-xs hover:bg-muted rounded-sm flex items-center gap-2 text-foreground">
                            {item.verification === "damaged" && <Check className="h-3 w-3 text-amber-500" />} Damaged
                          </button>
                        </div>
                      </div>
                    ) : (
                      <AssetStatusBadge status={item.verification} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden flex flex-col divide-y divide-border">
        {items.map((item) => (
          <div key={item.id} className="p-4 flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="font-semibold text-foreground text-sm">{item.name}</span>
                <span className="text-xs text-muted-foreground">{item.tag}</span>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground bg-muted/30 p-2 rounded-md">
              <span className="font-medium text-foreground">Location:</span> {item.location}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status:</span>
              {onUpdateVerification ? (
                <div className="relative group/dropdown">
                  <button className="flex items-center gap-2 border border-border bg-background rounded-md px-2 py-1 hover:border-primary/50 transition-colors">
                    <AssetStatusBadge status={item.verification} />
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </button>
                  <div className="absolute top-full left-0 mt-1 w-36 rounded-md border border-border bg-popover shadow-md opacity-0 invisible group-hover/dropdown:opacity-100 group-hover/dropdown:visible transition-all z-10 flex flex-col p-1">
                    <button onClick={() => onUpdateVerification(item.id, "verified")} className="text-left px-2 py-1.5 text-xs hover:bg-muted rounded-sm flex items-center gap-2 text-foreground">
                      {item.verification === "verified" && <Check className="h-3 w-3 text-positive" />} Verified
                    </button>
                    <button onClick={() => onUpdateVerification(item.id, "missing")} className="text-left px-2 py-1.5 text-xs hover:bg-muted rounded-sm flex items-center gap-2 text-foreground">
                      {item.verification === "missing" && <Check className="h-3 w-3 text-destructive" />} Missing
                    </button>
                    <button onClick={() => onUpdateVerification(item.id, "damaged")} className="text-left px-2 py-1.5 text-xs hover:bg-muted rounded-sm flex items-center gap-2 text-foreground">
                      {item.verification === "damaged" && <Check className="h-3 w-3 text-amber-500" />} Damaged
                    </button>
                  </div>
                </div>
              ) : (
                <AssetStatusBadge status={item.verification} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
