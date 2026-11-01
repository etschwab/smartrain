import { CopyInviteButton } from "@/components/clipboard/copy-invite-button";
import { ShareInviteButton } from "@/components/clipboard/share-invite-button";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { InviteQrCode } from "@/components/team/invite-qr-code";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDateTimeLabel, getRoleLabel } from "@/lib/utils";
import type { TeamInvite } from "@/lib/types";

type InviteCardProps = {
  invite: TeamInvite;
  absoluteUrl: string;
  regenerateAction?: () => Promise<void>;
  toggleAction?: () => Promise<void>;
};

export function InviteCard({ invite, absoluteUrl, regenerateAction, toggleAction }: InviteCardProps) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">Link für {getRoleLabel(invite.role)}</span>
        {!invite.is_active ? <Badge variant="muted">Deaktiviert</Badge> : null}
        {invite.last_used_at ? <span className="text-muted-foreground">· zuletzt genutzt {formatDateTimeLabel(invite.last_used_at)}</span> : null}
      </div>
      <p className="mt-2 select-all break-all rounded-lg bg-muted px-3 py-2 font-mono text-sm">{absoluteUrl}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {invite.is_active ? (
          <>
            <CopyInviteButton value={absoluteUrl} />
            <ShareInviteButton title={`Einladung zu ${invite.team_name}`} url={absoluteUrl} />
            <InviteQrCode url={absoluteUrl} teamName={invite.team_name} active={invite.is_active} />
          </>
        ) : null}
        {regenerateAction ? (
          <form action={regenerateAction}>
            <ConfirmSubmit type="submit" variant="ghost" confirmMessage="Neuen Link erzeugen? Der bisherige Link funktioniert danach nicht mehr.">
              Neu erzeugen
            </ConfirmSubmit>
          </form>
        ) : null}
        {toggleAction ? (
          invite.is_active ? (
            <form action={toggleAction}>
              <ConfirmSubmit type="submit" variant="ghost" confirmMessage="Link deaktivieren? Niemand kann mehr darüber beitreten.">
                Deaktivieren
              </ConfirmSubmit>
            </form>
          ) : (
            <form action={toggleAction}>
              <Button type="submit" variant="secondary">Wieder aktivieren</Button>
            </form>
          )
        ) : null}
      </div>
    </Card>
  );
}
