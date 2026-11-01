import { Suspense } from "react";
import { PublicFooter } from "@/components/public-footer";
import { PublicNavbar } from "@/components/public-navbar";
import { PublicNavbarAuth } from "@/components/public-navbar-auth";
import { ToastFromSearch } from "@/components/toast-from-search";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<PublicNavbar />}>
        <PublicNavbarAuth />
      </Suspense>
      <Suspense fallback={null}>
        <ToastFromSearch />
      </Suspense>
      <div className="flex-1">{children}</div>
      <PublicFooter />
    </div>
  );
}
