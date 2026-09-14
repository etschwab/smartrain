import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Link2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { SubmitButton } from "@/components/forms/submit-button";
import { InviteCard } from "@/components/team/invite-card";
import { TeamTabs } from "@/components/team/team-tabs";
import { Select } from "@/components/ui/select";
import { createInviteAction, regenerateInviteAction, removeMemberAction, toggleInviteAction, updateMemberRoleAction } from "@/lib/actions";
import { managerRoles, teamRoleOptions } from "@/lib/constants";
import { getTeamById, listTeamInvites, listTeamMembersDetailed } from "@/lib/data";
import { getRequestOrigin } from "@/lib/request";
import { createAdminClient } from "@/lib/supabase-admin";
import { requireTeamAccess } from "@/lib/supabase-server";
import { buildJoinPath, getMemberStatusLabel, getRoleLabel } from "@/lib/utils";

type TeamMembersPageProps = { params: Promise<{ teamId: string }> };

export const metadata: Metadata = {
  title: "Mitglieder",
  description: "Mitglieder verwalten und neue Coaches, Spieler oder Eltern einladen."
};

export default async function TeamMembersPage({ params }: TeamMembersPageProps) {
  const { teamId } = await params;
  const { supabase, membership, user } = await requireTeamAccess(teamId, `/teams/${teamId}/members`);
  const canInvite = managerRoles.includes(membership.role);
  const readSupabase = createAdminClient() ?? supabase;
  const [team, members, invites, origin] = await Promise.all([
    getTeamById(readSupabase, teamId),
    listTeamMembersDetailed(readSupabase, teamId),
    canInvite ? listTeamInvites(readSupabase, teamId) : Promise.resolve([]),
    getRequestOrigin()
  ]);

  if (!team) notFound();

  const canManageRoles = membership.role === "owner";

  return (
    <div className="space-y-8">
      <Card className="p-6 sm:p-8">
        <p className="section-kicker">Mitglieder</p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold sm:text-4xl">{team.name}</h1>
            <p className="mt-3 text-muted-foreground">Einladen, Rollen vergeben und Mitglieder verwalten.</p>
          </div>
          <Badge variant="outline">{members.length} Mitglieder</Badge>
        </div>
        <div className="mt-6"><TeamTabs teamId={team.id} /></div>
      </Card>

      {canInvite ? (
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted"><Link2 className="h-5 w-5 text-primary" /></span>
            <div>
              <p className="section-kicker">Einladungslink</p>
              <h2 className="mt-1 text-2xl font-semibold">Mitglieder ins Team holen</h2>
              <p className="mt-2 text-sm text-muted-foreground">Erstelle einen Link mit der passenden Rolle und teile ihn direkt.</p>
            </div>
          </div>
          <form action={createInviteAction.bind(null, team.id)} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="grid flex-1 gap-2 text-sm font-semibold">
              Rolle für neue Mitglieder
              <Select name="role" defaultValue="player">
                {teamRoleOptions.filter((role) => role.value !== "owner").map((role) => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </Select>
            </label>
            <SubmitButton pendingLabel="Wird erstellt...">Link erstellen</SubmitButton>
          </form>
        </Card>
      ) : null}

      {canInvite && invites.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Einladungslinks</h2>
          {invites.map((invite) => (
            <InviteCard
              key={invite.id}
              invite={invite}
              absoluteUrl={`${origin}${buildJoinPath(invite.code)}`}
              regenerateAction={regenerateInviteAction.bind(null, team.id, invite.id)}
              toggleAction={toggleInviteAction.bind(null, team.id, invite.id, !invite.is_active)}
            />
          ))}
        </section>
      ) : null}

      <section>
        <div className="mb-4 flex items-center gap-3">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Mitgliederliste</h2>
        </div>
        <div className="space-y-3">
          {members.map((member) => (
            <Card key={member.id} className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-lg font-semibold">{member.profile?.full_name ?? member.profile?.email ?? "Unbekannt"}</h3>
                    <Badge variant="outline">{getRoleLabel(member.role)}</Badge>
                    <Badge variant={member.status === "active" ? "success" : "muted"}>{getMemberStatusLabel(member.status)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{member.profile?.email ?? "Keine E-Mail hinterlegt"}</p>
                </div>
                {canManageRoles ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <form action={updateMemberRoleAction.bind(null, team.id, member.id)} className="flex gap-2">
                      <Select name="role" defaultValue={member.role} className="min-w-36">
                        {teamRoleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                      </Select>
                      <SubmitButton variant="secondary" pendingLabel="...">Speichern</SubmitButton>
                    </form>
                    {member.user_id !== user.id ? (
                      <form action={removeMemberAction.bind(null, team.id, member.id)}>
                        <ConfirmSubmit variant="ghost" confirmMessage="Mitglied wirklich aus dem Team entfernen?">Entfernen</ConfirmSubmit>
                      </form>
                    ) : (
                      <Button disabled variant="ghost">Du</Button>
                    )}
                  </div>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
