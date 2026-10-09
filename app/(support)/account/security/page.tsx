import type { Metadata } from "next";
import { TwoFactorCard } from "@/components/auth/two-factor-card";
import { PageShell } from "@/components/shared/page-shell";

export const metadata: Metadata = { title: "Security · Uparima Support" };

export default function SecurityPage() {
  return (
    <PageShell title="Security" description="How you sign in to the Support Portal." width="max-w-3xl">
      <TwoFactorCard />
    </PageShell>
  );
}
