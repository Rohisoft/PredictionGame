import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/pages/LoginPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { ChangePasswordPage } from "@/pages/ChangePasswordPage";
import { GamePage } from "@/pages/GamePage";
import { ColorGamePage } from "@/pages/ColorGamePage";
import { SpinPage } from "@/pages/SpinPage";
import { MazePage } from "@/pages/MazePage";
import { WalletPage } from "@/pages/WalletPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { HistoryPage } from "@/pages/HistoryPage";
import { AdminPage } from "@/pages/AdminPage";
import { SuperAdminPage } from "@/pages/SuperAdminPage";
import HomePage from './pages/HomePage';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Toaster position="top-center" richColors closeButton />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/change-password"
              element={
                <ProtectedRoute>
                  <ChangePasswordPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/play"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <GamePage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/color"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <ColorGamePage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/maze"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <MazePage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/wallet"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <WalletPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/spin"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <SpinPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <HistoryPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <ProfilePage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <AdminPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <SuperAdminPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
