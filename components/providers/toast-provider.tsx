"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      richColors
      theme="system"
      toastOptions={{
        className: "font-medium"
      }}
    />
  );
}
