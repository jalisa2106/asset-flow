import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { AssetStatusBadge, BadgeStatus } from "@/components/assets/AssetStatusBadge";

export interface Asset {
  id: string;
  tag: string;
  name: string;
  category: string;
  status: BadgeStatus;
  location: string;
}

interface AssetTableProps {
  assets: Asset[];
}

export function AssetTable({ assets }: AssetTableProps) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Desktop/Tablet Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Tag</th>
              <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Name</th>
              <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Category</th>
              <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Status</th>
              <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Location</th>
              <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {assets.map((asset) => (
              <tr key={asset.id} className="hover:bg-muted/30 transition-colors group">
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link href={`/assets/${asset.id}`} className="font-medium text-primary hover:underline">
                    {asset.tag}
                  </Link>
                </td>
                <td className="px-6 py-4 font-medium text-foreground">{asset.name}</td>
                <td className="px-6 py-4 text-muted-foreground">{asset.category}</td>
                <td className="px-6 py-4">
                  <AssetStatusBadge status={asset.status} />
                </td>
                <td className="px-6 py-4 text-muted-foreground">{asset.location}</td>
                <td className="px-6 py-4 text-right">
                  <button className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Flashcard View */}
      <div className="md:hidden flex flex-col divide-y divide-border">
        {assets.map((asset) => (
          <div key={asset.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <Link href={`/assets/${asset.id}`} className="font-medium text-primary hover:underline text-sm block">
                  {asset.tag}
                </Link>
                <span className="font-semibold text-foreground">{asset.name}</span>
              </div>
              <button className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <div className="bg-muted/50 px-2 py-1 rounded-md">{asset.category}</div>
              <div className="bg-muted/50 px-2 py-1 rounded-md">{asset.location}</div>
            </div>
            
            <div>
              <AssetStatusBadge status={asset.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
