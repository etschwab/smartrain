"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type CopyInviteButtonProps = {
  value: string;
};

export function CopyInviteButton({ value }: CopyInviteButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      toast.error("Kopieren nicht möglich. Bitte den Link markieren und manuell kopieren.");
      return;
    }

    setCopied(true);
    toast.success("Einladungslink kopiert");
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Button type="button" onClick={handleCopy}>
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      Link kopieren
    </Button>
  );
}
