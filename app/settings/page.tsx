"use client";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="px-8">
        <PageHeading title="Settings" />
      </div>
    </AppShell>
  );
}

