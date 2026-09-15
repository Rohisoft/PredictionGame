import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { ColorRound, GameRound, Profile, TeenPattiRound, WalletTransaction } from "@/types/database";

export type AdminUser = Profile & { balance: number };

export function useAdminUsers(search: string) {
  return useQuery({
    queryKey: ["admin-users", search],
    queryFn: () => api.get<AdminUser[]>(`/admin/users?search=${encodeURIComponent(search)}`),
    // Keep the list fresh since balances change as rounds settle.
    refetchInterval: 15_000,
  });
}

export function useAdminUserTransactions(userId: string | null) {
  return useQuery({
    queryKey: ["admin-user-transactions", userId],
    enabled: !!userId,
    queryFn: () => api.get<WalletTransaction[]>(`/admin/users/${userId}/transactions`),
  });
}

interface AdjustPointsParams {
  username: string;
  amount: number;
  description?: string;
}

export function useAdminAdjustPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: AdjustPointsParams) => api.post<{ ok: true }>("/admin/adjust-points", params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-transactions"] });
    },
  });
}

interface CreateUserParams {
  username: string;
  password: string;
  fullName: string;
  email?: string;
  phone?: string;
}

export function useAdminCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateUserParams) => api.post<Profile>("/admin/users", params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

interface UsernameAvailability {
  available: boolean;
  suggestions: string[];
}

/** On-demand check (call it yourself, e.g. debounced on blur/typing) — not a live query. */
export function useCheckUsername() {
  return useMutation({
    mutationFn: ({ username, phone }: { username: string; phone?: string }) => {
      const params = new URLSearchParams({ username });
      if (phone) params.set("phone", phone);
      return api.get<UsernameAvailability>(`/admin/users/check-username?${params.toString()}`);
    },
  });
}

export function useAdminSetPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { username: string; password: string }) =>
      api.post<{ ok: true }>("/admin/users/set-password", params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Manual round control — any admin (or above) can pause/resume the game.
// This is global state, not scoped to the caller's own players.
// ---------------------------------------------------------------------------

export interface GameControlState {
  is_game_running: boolean;
  current_round: GameRound | null;
}

export function useAdminRoundState() {
  return useQuery({
    queryKey: ["admin-round-state"],
    queryFn: () => api.get<GameControlState>("/admin/rounds/state"),
    refetchInterval: 5_000,
  });
}

function useSetRoundState(action: "start" | "stop") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post<GameControlState>(`/admin/rounds/${action}`, {}),
    onSuccess: (state) => {
      queryClient.setQueryData(["admin-round-state"], state);
      queryClient.invalidateQueries({ queryKey: ["current-round"] });
      queryClient.invalidateQueries({ queryKey: ["game-running"] });
    },
  });
}

export function useStartRound() {
  return useSetRoundState("start");
}

export function useStopRound() {
  return useSetRoundState("stop");
}

// ---------------------------------------------------------------------------
// Superadmin-only: managing admin accounts themselves.
// ---------------------------------------------------------------------------

export function useSuperAdminAdmins(search: string) {
  return useQuery({
    queryKey: ["superadmin-admins", search],
    queryFn: () => api.get<AdminUser[]>(`/superadmin/admins?search=${encodeURIComponent(search)}`),
    refetchInterval: 15_000,
  });
}

export function useSuperAdminCreateAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateUserParams) => api.post<Profile>("/superadmin/admins", params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-admins"] });
    },
  });
}

/** Mint/credit (or debit) an admin's own wallet directly — no source deduction. */
export function useSuperAdminAdjustAdminPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: AdjustPointsParams) => api.post<{ ok: true }>("/superadmin/admins/adjust-points", params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-admins"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-transactions"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Superadmin-only: Spin & Win on/off switch.
// ---------------------------------------------------------------------------

export function useSuperAdminSpinState() {
  return useQuery({
    queryKey: ["superadmin-spin-state"],
    queryFn: () => api.get<{ enabled: boolean }>("/superadmin/spin/state"),
    refetchInterval: 15_000,
  });
}

function useSetSpinEnabled(action: "enable" | "disable") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post<{ enabled: boolean }>(`/superadmin/spin/${action}`, {}),
    onSuccess: (state) => {
      queryClient.setQueryData(["superadmin-spin-state"], state);
      queryClient.invalidateQueries({ queryKey: ["spin-state"] });
    },
  });
}

export function useEnableSpin() {
  return useSetSpinEnabled("enable");
}

export function useDisableSpin() {
  return useSetSpinEnabled("disable");
}

// ---------------------------------------------------------------------------
// Superadmin-only: Color Prediction on/off switch.
// ---------------------------------------------------------------------------

export interface ColorControlState {
  enabled: boolean;
  current_round: ColorRound | null;
}

export function useSuperAdminColorState() {
  return useQuery({
    queryKey: ["superadmin-color-state"],
    queryFn: () => api.get<ColorControlState>("/superadmin/color/state"),
    refetchInterval: 5_000,
  });
}

function useSetColorGameEnabled(action: "enable" | "disable") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post<ColorControlState>(`/superadmin/color/${action}`, {}),
    onSuccess: (state) => {
      queryClient.setQueryData(["superadmin-color-state"], state);
      queryClient.invalidateQueries({ queryKey: ["color-game-enabled"] });
    },
  });
}

export function useEnableColorGame() {
  return useSetColorGameEnabled("enable");
}

export function useDisableColorGame() {
  return useSetColorGameEnabled("disable");
}

// ---------------------------------------------------------------------------
// Superadmin-only: Teen Patti Prediction on/off switch.
// ---------------------------------------------------------------------------

export interface TeenPattiControlState {
  enabled: boolean;
  current_round: TeenPattiRound | null;
}

export function useSuperAdminTeenPattiState() {
  return useQuery({
    queryKey: ["superadmin-teenpatti-state"],
    queryFn: () => api.get<TeenPattiControlState>("/superadmin/teenpatti/state"),
    refetchInterval: 5_000,
  });
}

function useSetTeenPattiGameEnabled(action: "enable" | "disable") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post<TeenPattiControlState>(`/superadmin/teenpatti/${action}`, {}),
    onSuccess: (state) => {
      queryClient.setQueryData(["superadmin-teenpatti-state"], state);
      queryClient.invalidateQueries({ queryKey: ["teenpatti-game-enabled"] });
    },
  });
}

export function useEnableTeenPattiGame() {
  return useSetTeenPattiGameEnabled("enable");
}

export function useDisableTeenPattiGame() {
  return useSetTeenPattiGameEnabled("disable");
}
