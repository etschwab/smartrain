import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Wird geladen">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-36 w-full" />
      <Skeleton className="h-52 w-full" />
    </div>
  );
}
