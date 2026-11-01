import type { ReactNode } from "react";
import { TeamTabs } from "@/components/team/team-tabs";
import { getRoleLabel, getTeamAccentColor } from "@/lib/utils";
import type { Team, TeamRole } from "@/lib/types";

type TeamHeaderProps = {
  team: Team;
  role: TeamRole;
  action?: ReactNode;
};

export function TeamHeader({ team, role, action }: TeamHeaderProps) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getTeamAccentColor(team.theme_color) }} />
            {team.sport} · {team.season} · {getRoleLabel(role)}
          </p>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight sm:text-3xl">{team.name}</h1>
        </div>
        {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
      </div>
      <TeamTabs teamId={team.id} />
    </div>
  );
}
