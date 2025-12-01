"use client";

import type { ReactNode } from "react";
import { HeaderBar } from "@/components/layout/HeaderBar";
import { TopNavigationBar } from "@/components/layout/TopNavigationBar";
import { useAuthSession } from "@/hooks/useAuthSession";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuthSession();

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen gradient-bg w-full">
      <div className="flex flex-col h-full w-full overflow-hidden">
        {/* Top Header Bar */}
        <HeaderBar userEmail={user.email} onLogout={logout} />

        {/* Top Navigation Bar */}
        <TopNavigationBar />

        {/* Main Content Area - Full Width */}
        <main className="flex w-full flex-1 flex-col gap-8 overflow-y-auto pb-12 scrollbar-hidden px-6 pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}

