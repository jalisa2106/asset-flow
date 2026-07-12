"use client";

import { Search, Bell, Menu } from "lucide-react";
import { useUiStore } from "@/store/uiStore";

export function Topbar() {
  const { toggleMobileSidebar } = useUiStore();

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border bg-background px-4 md:px-6">
      <div className="flex items-center flex-1 gap-4">
        <button 
          onClick={toggleMobileSidebar}
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground lg:hidden rounded-md hover:bg-muted transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search assets, users, or locations..." 
            className="w-full rounded-full border border-input bg-muted/50 py-2 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors sm:hidden">
          <Search className="h-5 w-5" />
        </button>
        <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive"></span>
        </button>
      </div>
    </header>
  );
}