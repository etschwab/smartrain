"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { toastMessages } from "@/lib/constants";

export function ToastFromSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const toastKey = searchParams.get("toast");
    const errorMessage = searchParams.get("actionError");

    if (!toastKey && !errorMessage) {
      return;
    }

    const next = new URLSearchParams(searchParams.toString());
    next.delete("toast");
    next.delete("actionError");

    if (errorMessage) {
      toast.error(errorMessage.slice(0, 200));
    } else if (toastKey) {
      const message = toastMessages[toastKey] ?? "Aktion erfolgreich";
      if (toastKey.includes("failed") || toastKey.includes("error")) {
        toast.error(message);
      } else {
        toast.success(message);
      }
    }

    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return null;
}
