import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/auth";
import { RoleSwitcher } from "@/components/role-switcher";

export default async function ClaimsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  if (!user) redirect("/select-role");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Link href="/claims" className="flex items-center gap-2 group">
              <span className="h-5 w-5 rounded bg-primary flex items-center justify-center text-primary-foreground text-[10px] font-bold shrink-0">
                FT
              </span>
              <span className="text-sm font-semibold tracking-tight group-hover:text-muted-foreground transition-colors">
                FastTrack
              </span>
            </Link>
            <span className="text-border select-none">/</span>
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
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        {children}
      </main>
    </div>
  );
}
