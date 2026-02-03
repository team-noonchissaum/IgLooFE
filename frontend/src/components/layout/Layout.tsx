import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { CategoryBar } from "./CategoryBar";
import { ToastContainer } from "@/components/ui/Toast";

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <CategoryBar />
      <main className="flex-1">
        <Outlet />
      </main>
      <ToastContainer />
    </div>
  );
}
