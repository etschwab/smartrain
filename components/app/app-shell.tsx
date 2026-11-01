import Link from "next/link";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/branding/logo";
import { AppNavigation } from "@/components/app/app-navigation";
import { signOutAction } from "@/lib/actions";
import { MAX_OWNED_TEAMS } from "@/lib/constants";
import { getDisplayName, getInitials } from "@/lib/utils";
import type { Profile, TeamWithMembership } from "@/lib/types";

type AppShellProps = {
  profile: Profile;
  teams: TeamWithMembership[];
  children: React.ReactNode;
};

export function AppShell({ profile, teams, children }: AppShellProps) {
  const ownedTeamsCount = teams.filter((team) => team.membership.role === "owner").length;
  const canCreateTeam = ownedTeamsCount < MAX_OWNED_TEAMS;
  const displayName = getDisplayName(profile.full_name, profile.email);
  const navTeams = teams.map(({ id, name, theme_color }) => ({ id, name, theme_color }));

  return (
    <div className="min-h-screen pb-16 lg:pb-0">
      <a className="skip-link" href="#main-content">Zum Inhalt springen</a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-14 items-center px-4">
          <Logo href="/dashboard" />
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-4">
          <AppNavigation teams={navTeams} canCreateTeam={canCreateTeam} />
        </div>

        <div className="flex items-center gap-1 border-t border-border p-2">
          <Link href="/profile" className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1.5 hover:bg-muted">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">
              {getInitials(displayName)}
            </span>
            <span className="truncate text-sm font-medium">{displayName}</span>
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Abmelden"
              title="Abmelden"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur lg:hidden">
        <Logo href="/dashboard" />
        <Link
          href="/profile"
          aria-label="Profil öffnen"
          className="grid h-8 w-8 place-items-center rounded-full bg-muted text-xs font-semibold"
        >
          {getInitials(displayName)}
        </Link>
      </header>

      <div className="lg:pl-60">
        <main id="main-content" className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 h-16 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <AppNavigation variant="mobile" />
      </div>
    </div>
  );
}
