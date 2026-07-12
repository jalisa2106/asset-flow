"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, Building, Box, Repeat, Calendar, 
  Wrench, ShieldCheck, BarChart, Bell, LogOut, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/uiStore";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { LogoutButton } from "./LogoutButton";

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
  const { isMobileSidebarOpen, closeMobileSidebar } = useUiStore();
  const profile = useAuthStore((state) => state.profile);

  // Close sidebar on route change for mobile
  useEffect(() => {
    closeMobileSidebar();
  }, [pathname, closeMobileSidebar]);

  const filteredNavItems = NAV_ITEMS.filter((item) => {
    if (!profile) return false;
    if (item.href === '/organization' && profile.role !== 'Admin') return false;
    if (item.href === '/reports' && profile.role === 'Employee') return false;
    return true;
  });

  if (!profile) return null; // or a loading state

  const initials = profile.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <>
      {/* Mobile overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Sidebar */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-border bg-sidebar px-4 py-6 transition-transform duration-300 ease-in-out lg:translate-x-0",
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="mb-8 flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-[#b4d6ff] shadow-sm">
              <span className="text-lg font-bold text-primary-foreground tracking-wider">AF</span>
            </div>
            <span className="text-xl font-bold text-foreground">Asset<span className="text-primary">Flow</span></span>
          </div>
          <button 
            className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
            onClick={closeMobileSidebar}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileSidebar}
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
              {initials}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium text-foreground leading-none truncate">{profile.full_name}</span>
              <span className="text-xs text-muted-foreground mt-1 truncate">{profile.role}</span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>
    </>
  );
}
