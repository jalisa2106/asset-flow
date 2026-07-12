"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, Building, Box, Repeat, Calendar, 
  Wrench, ShieldCheck, BarChart, Bell, LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Organization Setup", href: "/organization", icon: Building },
  { name: "Asset Directory", href: "/assets", icon: Box },
  { name: "Allocation & Transfer", href: "/allocations", icon: Repeat },
  { name: "Resource Booking", href: "/bookings", icon: Calendar },
  { name: "Maintenance", href: "/maintenance", icon: Wrench },
  { name: "Audit", href: "/audits", icon: ShieldCheck },
  { name: "Reports & Analytics", href: "/reports", icon: BarChart },
  { name: "Notifications", href: "/notifications", icon: Bell },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-border bg-sidebar px-4 py-6">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-[#b4d6ff] shadow-sm">
          <span className="text-lg font-bold text-primary-foreground tracking-wider">AF</span>
        </div>
        <span className="text-xl font-bold text-foreground">Asset<span className="text-primary">Flow</span></span>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-border pt-4">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
            JD
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground leading-none">John Doe</span>
            <span className="text-xs text-muted-foreground mt-1">Employee</span>
          </div>
          <button className="ml-auto text-muted-foreground hover:text-destructive transition-colors">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
