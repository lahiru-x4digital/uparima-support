import { AuthGuard } from "@/components/auth/auth-guard";

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
