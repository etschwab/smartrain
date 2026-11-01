"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Übersicht", getHref: (teamId: string) => `/teams/${teamId}` },
  { label: "Termine", getHref: (teamId: string) => `/teams/${teamId}/events` },
  { label: "Mitglieder", getHref: (teamId: string) => `/teams/${teamId}/members` }
];

type TeamTabsProps = {
  teamId: string;
};

export function TeamTabs({ teamId }: TeamTabsProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Teambereiche" className="-mb-px flex gap-5 overflow-x-auto border-b border-border">
      {tabs.map((tab) => {
        const href = tab.getHref(teamId);
        const isOverview = href === `/teams/${teamId}`;
        const isActive = isOverview ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "whitespace-nowrap border-b-2 pb-2.5 text-sm font-medium transition-colors",
              isActive ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
