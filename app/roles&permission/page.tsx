"use client";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";


export default function RolesPermissionPage() {
 
    return (
        <AppShell>
            <div className="space-y-8">
                <div className="flex items-start justify-between">
                    <PageHeading title="Roles & Permission" />
                </div>

            </div>
        </AppShell>
    );
}
