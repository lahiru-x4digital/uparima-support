import { AuthGuard } from "@/components/auth/auth-guard";
import { AppSidebar } from "@/components/shell/app-sidebar";

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-svh min-h-0 bg-background">
        <AppSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </AuthGuard>
  );
}
