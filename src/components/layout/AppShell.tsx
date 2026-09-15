import { type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Crown, Dices, Gift, History, LogOut, Palette, ShieldCheck, Spade, User, Wallet } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useWallet } from "@/hooks/useWallet";
import { formatPoints, cn } from "@/lib/utils";

const navItems = [
  { to: "/play", label: "Play", icon: Dices },
  { to: "/color", label: "Color", icon: Palette },
  { to: "/teenpatti", label: "Teen Patti", icon: Spade },
  { to: "/spin", label: "Spin", icon: Gift },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/history", label: "History", icon: History },
  { to: "/profile", label: "Profile", icon: User },
];

/** The proper display name of whichever page is active, shown in the header. */
const PAGE_TITLE: Record<string, string> = {
  "/play": "Odd/Even",
  "/color": "Color Prediction",
  "/teenpatti": "Teen Patti",
  "/spin": "Spin & Win",
  "/wallet": "Wallet",
  "/history": "History",
  "/profile": "Profile",
  "/admin": "Admin",
  "/superadmin": "Super Admin",
};

const NAV_LINK_CLASS =
  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white/50 transition-colors hover:bg-white/10 hover:text-white";
const NAV_LINK_ACTIVE_CLASS = "bg-amber-400/10 text-amber-300";

export function AppShell({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: wallet } = useWallet();
  const navigate = useNavigate();
  const location = useLocation();

  const pageTitle = PAGE_TITLE[location.pathname] ?? "Odd/Even";

  async function handleLogout() {
    await signOut();
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <Dices className="h-6 w-6 text-amber-400" />
            <span>{pageTitle}</span>
          </div>

          <nav className="hidden items-center gap-1 sm:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => cn(NAV_LINK_CLASS, isActive && NAV_LINK_ACTIVE_CLASS)}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
            {profile?.is_admin && (
              <NavLink
                to="/admin"
                className={({ isActive }) => cn(NAV_LINK_CLASS, isActive && NAV_LINK_ACTIVE_CLASS)}
              >
                <ShieldCheck className="h-4 w-4" />
                Admin
              </NavLink>
            )}
            {profile?.is_super_admin && (
              <NavLink
                to="/superadmin"
                className={({ isActive }) => cn(NAV_LINK_CLASS, isActive && NAV_LINK_ACTIVE_CLASS)}
              >
                <Crown className="h-4 w-4" />
                Super Admin
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden rounded-full bg-amber-400/15 px-3 py-1.5 text-sm font-semibold text-amber-300 sm:block">
              {wallet ? `${formatPoints(wallet.balance)} pts` : "…"}
            </div>
            {profile?.is_admin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white sm:hidden",
                    isActive && "bg-amber-400/10 text-amber-300",
                  )
                }
                aria-label="Admin"
              >
                <ShieldCheck className="h-4 w-4" />
              </NavLink>
            )}
            {profile?.is_super_admin && (
              <NavLink
                to="/superadmin"
                className={({ isActive }) =>
                  cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white sm:hidden",
                    isActive && "bg-amber-400/10 text-amber-300",
                  )
                }
                aria-label="Super Admin"
              >
                <Crown className="h-4 w-4" />
              </NavLink>
            )}
            <button
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="container flex-1 py-6">{children}</main>

      <nav className="sticky bottom-0 z-20 flex border-t border-white/10 bg-slate-950/95 backdrop-blur sm:hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium text-white/50",
                isActive && "text-amber-400",
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <footer className="hidden border-t border-white/10 py-4 text-center text-xs text-white/40 sm:block">
        Odd/Even is a game of chance played with virtual points — not real money. Play responsibly. 18+ only.
      </footer>
    </div>
  );
}
