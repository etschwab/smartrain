import { Check, HelpCircle, X } from "lucide-react";
import { SubmitButton } from "@/components/forms/submit-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { respondToEventAction } from "@/lib/actions";
import { cn, getResponseStatusLabel } from "@/lib/utils";
import type { EventResponseRecord, ResponseStatus } from "@/lib/types";

const choices: Array<{ status: ResponseStatus; label: string; icon: typeof Check; activeClass: string }> = [
  { status: "yes", label: "Zusagen", icon: Check, activeClass: "border-success bg-success/10 text-success hover:bg-success/15" },
  { status: "maybe", label: "Vielleicht", icon: HelpCircle, activeClass: "border-warning bg-warning/10 text-warning hover:bg-warning/15" },
  { status: "no", label: "Absagen", icon: X, activeClass: "border-destructive bg-destructive/10 text-destructive hover:bg-destructive/15" }
];

const badgeVariants: Record<ResponseStatus, "success" | "warning" | "danger"> = {
  yes: "success",
  maybe: "warning",
  no: "danger"
};

export function ResponseBadge({ status }: { status: ResponseStatus | null | undefined }) {
  if (!status) {
    return <Badge variant="muted">Offen</Badge>;
  }

  return <Badge variant={badgeVariants[status]}>{getResponseStatusLabel(status)}</Badge>;
}

type ResponseControlsProps = {
  teamId: string;
  eventId: string;
  response: EventResponseRecord | null;
  returnPath: string;
  withComment?: boolean;
  size?: "default" | "sm";
};

export function ResponseControls({ teamId, eventId, response, returnPath, withComment = false, size = "default" }: ResponseControlsProps) {
  return (
    <form className="space-y-3">
      {withComment ? (
        <Input
          name="comment"
          defaultValue={response?.comment ?? ""}
          maxLength={280}
          placeholder="Optionaler Kommentar, z. B. komme 10 Min. später"
          aria-label="Kommentar zur Antwort"
        />
      ) : response?.comment ? (
        <input type="hidden" name="comment" value={response.comment} />
      ) : null}
      <div className="grid grid-cols-3 gap-2">
        {choices.map((choice) => {
          const Icon = choice.icon;
          const isActive = response?.status === choice.status;
          return (
            <SubmitButton
              key={choice.status}
              variant="secondary"
              size={size}
              formAction={respondToEventAction.bind(null, teamId, eventId, choice.status, returnPath)}
              aria-pressed={isActive}
              pendingLabel={choice.label}
              className={cn("w-full px-2", isActive && choice.activeClass)}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {choice.label}
            </SubmitButton>
          );
        })}
      </div>
    </form>
  );
}
