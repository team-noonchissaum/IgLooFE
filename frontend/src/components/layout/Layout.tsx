import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { ToastContainer } from "@/components/ui/Toast";
import { BlockedUserGuard } from "@/routes/BlockedUserGuard";

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[var(--surface)]">
      <BlockedUserGuard>
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
        <ToastContainer />
      </BlockedUserGuard>
    </div>
  );
}
