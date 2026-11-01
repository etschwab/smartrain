import { AlertCircle } from "lucide-react";

type FormErrorProps = {
  message: string;
};

export function FormError({ message }: FormErrorProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
