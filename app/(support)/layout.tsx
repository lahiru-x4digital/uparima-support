import { AuthGuard } from "@/components/auth/auth-guard";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { SosProvider } from "@/components/sos/sos-provider";

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SosProvider>
        <div className="flex h-svh min-h-0 overflow-hidden bg-background">
          <AppSidebar />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
        </div>
      </SosProvider>
    </AuthGuard>
  );
}
