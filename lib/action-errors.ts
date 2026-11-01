import { redirect, unstable_rethrow } from "next/navigation";

const fallbackMessage = "Die Aktion konnte nicht ausgeführt werden. Bitte versuche es erneut.";

export function withErrorParam(path: string, message: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}actionError=${encodeURIComponent(message.slice(0, 200))}`;
}

/**
 * Next.js hides thrown error messages in production builds, so a failed form
 * would only show the generic error page. Instead, send the user back to the
 * form with the message, which ToastFromSearch shows as an error toast.
 */
export async function runAction(errorPath: string, action: () => Promise<void>) {
  try {
    await action();
  } catch (error) {
    unstable_rethrow(error);
    console.error(error);
    redirect(withErrorParam(errorPath, error instanceof Error && error.message ? error.message : fallbackMessage));
  }
}
