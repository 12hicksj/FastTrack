import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/auth";
import { RoleSwitcher } from "@/components/role-switcher";
import { Separator } from "@/components/ui/separator";

export default async function ClaimsLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/select-role");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/claims" className="font-semibold text-lg tracking-tight">
              FastTrack
            </Link>
            <Separator orientation="vertical" className="h-5" />
            <nav className="flex items-center gap-4">
              <Link
                href="/claims"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Claims
              </Link>
            </nav>
          </div>
          <RoleSwitcher currentUser={user} />
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">{children}</main>
    </div>
  );
}
