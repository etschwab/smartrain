"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plus, UserRound, Users } from "lucide-react";
import { cn, getTeamAccentColor } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Übersicht", icon: Home },
  { href: "/teams", label: "Teams", icon: Users, exact: true },
  { href: "/profile", label: "Profil", icon: UserRound }
];

type NavTeam = { id: string; name: string; theme_color: string | null };

type AppNavigationProps = {
  variant?: "sidebar" | "mobile";
  teams?: NavTeam[];
  canCreateTeam?: boolean;
};

function isActivePath(pathname: string, href: string, exact = false) {
  return pathname === href || (!exact && pathname.startsWith(`${href}/`));
}

export function AppNavigation({ variant = "sidebar", teams = [], canCreateTeam = false }: AppNavigationProps) {
  const pathname = usePathname();

  if (variant === "mobile") {
    return (
      <nav aria-label="App-Navigation" className="grid h-full grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = isActivePath(pathname, item.href, false);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  const linkClass = (isActive: boolean) =>
    cn(
      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
      isActive ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
    );

  return (
    <nav aria-label="App-Navigation" className="space-y-6">
      <div className="space-y-0.5">
        {items.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const isActive = isActivePath(pathname, item.href, item.exact);
          return (
            <Link key={item.href} href={item.href} aria-current={isActive ? "page" : undefined} className={linkClass(isActive)}>
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div>
        <p className="px-2.5 pb-1.5 text-xs font-medium text-muted-foreground">Deine Teams</p>
        <div className="space-y-0.5">
          {teams.map((team) => {
            const href = `/teams/${team.id}`;
            const isActive = isActivePath(pathname, href);
            return (
              <Link key={team.id} href={href} aria-current={isActive ? "page" : undefined} className={linkClass(isActive)}>
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: getTeamAccentColor(team.theme_color) }} />
                <span className="truncate">{team.name}</span>
              </Link>
            );
          })}
          {canCreateTeam ? (
            <Link href="/teams/new" className={linkClass(pathname === "/teams/new")}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Neues Team
            </Link>
          ) : null}
          {teams.length === 0 && !canCreateTeam ? <p className="px-2.5 text-sm text-muted-foreground">Noch keine Teams</p> : null}
        </div>
      </div>
    </nav>
  );
}
