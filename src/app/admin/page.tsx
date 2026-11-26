import type { Metadata } from "next";
import { AdminAuthGate } from "@/components/admin/AdminAuthGate";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `Admin — ${siteConfig.name}`,
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-canvas">
      <AdminAuthGate />
    </main>
  );
}
