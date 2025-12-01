"use client";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="">
        <PageHeading title="Dashboard" />
      </div>
    </AppShell>
  );
}
