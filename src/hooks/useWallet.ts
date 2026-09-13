import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";
import type { Wallet, WalletTransaction } from "@/types/database";

export function useWallet() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["wallet", user?.id],
    enabled: !!user,
    queryFn: () => api.get<Wallet>("/wallet"),
    // No realtime backend here — poll so a settlement's payout shows up
    // without the user having to manually refresh.
    refetchInterval: 5_000,
  });
}

export function useWalletTransactions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["wallet-transactions", user?.id],
    enabled: !!user,
    queryFn: () => api.get<WalletTransaction[]>("/wallet/transactions"),
    refetchInterval: 10_000,
  });
}
