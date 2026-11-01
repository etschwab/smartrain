"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type ShareInviteButtonProps = {
  url: string;
  title: string;
};

export function ShareInviteButton({ url, title }: ShareInviteButtonProps) {
  async function handleShare() {
    if (!navigator.share) {
      toast.info("Teilen wird auf diesem Gerät nicht direkt unterstützt.");
      return;
    }

    try {
      await navigator.share({
        title,
        url
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Teilen ist fehlgeschlagen. Kopiere den Link stattdessen.");
    }
  }

  return (
    <Button type="button" variant="secondary" onClick={handleShare}>
      <Share2 className="h-4 w-4" />
      Teilen
    </Button>
  );
}
