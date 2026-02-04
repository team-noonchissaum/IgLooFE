import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { RequireAuth, RequireAdmin } from "@/routes/guards";

import { HomePage } from "@/features/home/HomePage";
import { AuctionDetailPage } from "@/features/auctions/AuctionDetailPage";
import { AuctionRegisterPage } from "@/features/auctions/AuctionRegisterPage";
import { AuctionLivePage } from "@/features/auctions/AuctionLivePage";
import { AuctionResultPage } from "@/features/auctions/AuctionResultPage";
import { PaymentResultPage } from "@/features/payment/PaymentResultPage";
import { CreditsChargePage } from "@/features/credits/CreditsChargePage";
import { WalletPage } from "@/features/wallet/WalletPage";
import { NotificationsPage } from "@/features/notifications/NotificationsPage";
import { MePage } from "@/features/me/MePage";
import { MeEditPage } from "@/features/me/MeEditPage";
import { ChargesPendingPage } from "@/features/charges/ChargesPendingPage";
import { DeliveryPage } from "@/features/delivery/DeliveryPage";
import { AdminPage } from "@/features/admin/AdminPage";
import { ChatPage } from "@/features/chat/ChatPage";
import { OAuthCallbackPage } from "@/features/auth/OAuthCallbackPage";
import { LoginPage } from "@/features/auth/LoginPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="auctions/:auctionId" element={<AuctionDetailPage />} />
          <Route
            path="auctions/new"
            element={
              <RequireAuth>
                <AuctionRegisterPage />
              </RequireAuth>
            }
          />
          <Route path="auctions/:id/live" element={<AuctionLivePage />} />
          <Route path="auctions/:id/result" element={<AuctionResultPage />} />
          <Route path="payments/result" element={<PaymentResultPage />} />
          <Route
            path="credits/charge"
            element={
              <RequireAuth>
                <CreditsChargePage />
              </RequireAuth>
            }
          />
          <Route
            path="wallet"
            element={
              <RequireAuth>
                <WalletPage />
              </RequireAuth>
            }
          />
          <Route
            path="notifications"
            element={
              <RequireAuth>
                <NotificationsPage />
              </RequireAuth>
            }
          />
          <Route
            path="me"
            element={
              <RequireAuth>
                <MePage />
              </RequireAuth>
            }
          />
          <Route
            path="me/edit"
            element={
              <RequireAuth>
                <MeEditPage />
              </RequireAuth>
            }
          />
          <Route
            path="me/charges"
            element={
              <RequireAuth>
                <ChargesPendingPage />
              </RequireAuth>
            }
          />
          <Route
            path="delivery"
            element={
              <RequireAuth>
                <DeliveryPage />
              </RequireAuth>
            }
          />
          <Route
            path="admin"
            element={
              <RequireAdmin>
                <AdminPage />
              </RequireAdmin>
            }
          />
          <Route
            path="chat"
            element={
              <RequireAuth>
                <ChatPage />
              </RequireAuth>
            }
          />
          <Route path="login" element={<LoginPage />} />
        </Route>
        <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
