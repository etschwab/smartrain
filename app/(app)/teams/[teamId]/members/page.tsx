import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { SubmitButton } from "@/components/forms/submit-button";
import { InviteCard } from "@/components/team/invite-card";
import { TeamHeader } from "@/components/team/team-header";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { createInviteAction, regenerateInviteAction, removeMemberAction, toggleInviteAction, updateMemberRoleAction } from "@/lib/actions";
import { managerRoles, teamRoleOptions } from "@/lib/constants";
import { getTeamById, listTeamInvites, listTeamMembersDetailed } from "@/lib/data";
import { getRequestOrigin } from "@/lib/request";
import { createAdminClient } from "@/lib/supabase-admin";
import { requireTeamAccess } from "@/lib/supabase-server";
import { buildJoinPath, getDisplayName, getInitials, getMemberStatusLabel, getRoleLabel } from "@/lib/utils";

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
  const activeInvites = invites.filter((invite) => invite.is_active);
  const pausedInvites = invites.filter((invite) => !invite.is_active);

  return (
    <div className="space-y-8">
      <TeamHeader team={team} role={membership.role} />

      {canInvite ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Einladen</h2>
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">
              Erstelle einen Link und schicke ihn z. B. in den Team-Chat. Wer ihn öffnet, tritt mit der gewählten Rolle bei.
            </p>
            <form action={createInviteAction.bind(null, team.id)} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <Field label="Rolle" className="sm:w-56">
                <Select name="role" defaultValue="player">
                  {teamRoleOptions.filter((role) => role.value !== "owner").map((role) => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </Select>
              </Field>
              <SubmitButton variant="secondary" pendingLabel="Wird erstellt...">Neuen Link erstellen</SubmitButton>
            </form>
          </Card>

          {activeInvites.map((invite) => (
            <InviteCard
              key={invite.id}
              invite={invite}
              absoluteUrl={`${origin}${buildJoinPath(invite.code)}`}
              regenerateAction={regenerateInviteAction.bind(null, team.id, invite.id)}
              toggleAction={toggleInviteAction.bind(null, team.id, invite.id, false)}
            />
          ))}

          {pausedInvites.length > 0 ? (
            <details className="rounded-xl border border-border">
              <summary className="cursor-pointer px-5 py-3 text-sm text-muted-foreground">{pausedInvites.length} deaktivierte Links</summary>
              <div className="space-y-3 border-t border-border p-3">
                {pausedInvites.map((invite) => (
                  <InviteCard
                    key={invite.id}
                    invite={invite}
                    absoluteUrl={`${origin}${buildJoinPath(invite.code)}`}
                    toggleAction={toggleInviteAction.bind(null, team.id, invite.id, true)}
                  />
                ))}
              </div>
            </details>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">{members.length} Mitglieder</h2>
        <Card className="divide-y divide-border">
          {members.map((member) => {
            const name = getDisplayName(member.profile?.full_name, member.profile?.email);
            const isSelf = member.user_id === user.id;
            return (
              <div key={member.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">{getInitials(name)}</span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {name}
                      {isSelf ? <span className="font-normal text-muted-foreground"> (du)</span> : null}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {canManageRoles ? member.profile?.email ?? "Keine E-Mail" : getRoleLabel(member.role)}
                    </p>
                  </div>
                  {member.status !== "active" ? <Badge variant="muted">{getMemberStatusLabel(member.status)}</Badge> : null}
                </div>
                {canManageRoles && !isSelf ? (
                  <div className="flex items-center gap-2">
                    <form action={updateMemberRoleAction.bind(null, team.id, member.id)} className="flex gap-2">
                      <Select name="role" defaultValue={member.role} className="h-9 w-36" aria-label={`Rolle von ${name}`}>
                        {teamRoleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                      </Select>
                      <SubmitButton variant="secondary" size="sm" className="h-9" pendingLabel="...">Speichern</SubmitButton>
                    </form>
                    <form action={removeMemberAction.bind(null, team.id, member.id)}>
                      <ConfirmSubmit variant="ghost" size="sm" className="h-9 text-destructive hover:bg-destructive/10" confirmMessage={`${name} wirklich aus dem Team entfernen?`}>
                        Entfernen
                      </ConfirmSubmit>
                    </form>
                  </div>
                ) : canManageRoles ? (
                  <span className="text-sm text-muted-foreground">{getRoleLabel(member.role)}</span>
                ) : null}
              </div>
            );
          })}
        </Card>
      </section>
    </div>
  );
}
