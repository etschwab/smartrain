"use client";

import { QrCode, X } from "lucide-react";
import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";

type InviteQrCodeProps = {
  url: string;
  teamName: string;
  active: boolean;
};

function QrGraphic({ url, teamName, large = false }: { url: string; teamName: string; large?: boolean }) {
  return (
    <QRCodeSVG
      value={url}
      title={`Einladung zu ${teamName} scannen`}
      level="M"
      marginSize={4}
      size={large ? 512 : 208}
      bgColor="#ffffff"
      fgColor="#111111"
      className={large ? "h-auto w-full max-w-[min(72vw,60vh)]" : "h-auto w-full max-w-52"}
    />
  );
}

export function InviteQrCode({ url, teamName, active }: InviteQrCodeProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  if (!active) {
    return null;
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => dialogRef.current?.showModal()}>
        <QrCode className="h-4 w-4" />QR-Code
      </Button>

      <dialog ref={dialogRef} className="m-auto max-h-none max-w-none rounded-2xl bg-white p-0 text-zinc-950 shadow-2xl backdrop:bg-black/70">
        <div className="relative flex min-h-[min(90vh,720px)] w-[min(92vw,720px)] flex-col items-center justify-center p-6 sm:p-10">
          <form method="dialog" className="absolute right-4 top-4">
            <button type="submit" aria-label="QR-Code schließen" className="grid h-9 w-9 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">
              <X className="h-5 w-5" />
            </button>
          </form>
          <p className="mb-1 text-sm text-zinc-500">Team beitreten</p>
          <h2 className="mb-6 text-center text-2xl font-semibold sm:text-3xl">{teamName}</h2>
          <QrGraphic url={url} teamName={teamName} large />
          <p className="mt-6 text-center font-medium">Mit der Handykamera scannen</p>
          <p className="mt-1 max-w-lg break-all text-center text-sm text-zinc-500">{url}</p>
        </div>
      </dialog>
    </>
  );
}
