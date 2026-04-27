"use client";

import { useState, type ReactNode } from "react";
import { HeaderBar } from "@/components/layout/HeaderBar";
import { TopNavigationBar } from "@/components/layout/TopNavigationBar";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useSocket } from "@/hooks/useSocket";
import { useRouteProtection } from "@/hooks/useRouteProtection";
import { useAppSelector } from "@/store/hooks";
import { selectUser, selectUserGroupName } from "@/store/slices/authSlice";
import { useGetBellNotificationsQuery } from "@/store/api/notificationApi";

/**
 * Prefetches bell notifications on every authenticated shell load (incl. browser refresh).
 * Same cache subscription as {@link NotificationDropdown}; RTK Query deduplicates the request.
 */
function BellNotificationsPrefetch() {
  const user = useAppSelector(selectUser);
  const userId = user?.id;
  useGetBellNotificationsQuery(
    { userId: userId ?? 0 },
    { skip: !userId, refetchOnMountOrArgChange: true }
  );
  return null;
}

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuthSession();
  const groupName = useAppSelector(selectUserGroupName);
   const [isNavOpen, setIsNavOpen] = useState(false);
const toggleNav = () => {
    setIsNavOpen((prev) => !prev);
  };
  
  // Initialize socket connection when user is authenticated
  useSocket();
  
  // Protect routes based on user role (e.g., restrict nurses to specific routes)
  useRouteProtection();

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen gradient-bg w-full">
      <div className="flex flex-col h-full w-full overflow-hidden">
        <BellNotificationsPrefetch />
        {/* Top Header Bar */}
        <HeaderBar 
          userEmail={user.email} 
          userRole={groupName || ""} 
          onLogout={logout}
          onToggleNav={toggleNav} 
        />

        {/* Top Navigation Bar */}
        <TopNavigationBar isOpen={isNavOpen}/>

        {/* Main Content Area - Full Width */}
        <main
          data-app-shell-scroll
          className="flex w-full flex-1 flex-col gap-8 overflow-y-auto pb-12 scrollbar-hidden px-6 md:px-4 pt-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

