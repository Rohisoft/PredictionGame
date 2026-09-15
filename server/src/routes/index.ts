import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { profileRouter } from "./profile.routes.js";
import { walletRouter } from "./wallet.routes.js";
import { roundsRouter } from "./rounds.routes.js";
import { betsRouter } from "./bets.routes.js";
import { adminRouter } from "./admin.routes.js";
import { superAdminRouter } from "./superadmin.routes.js";
import { spinRouter } from "./spin.routes.js";
import { colorRoundsRouter } from "./colorRounds.routes.js";
import { colorBetsRouter } from "./colorBets.routes.js";
import { teenPattiRoundsRouter } from "./teenPattiRounds.routes.js";
import { teenPattiBetsRouter } from "./teenPattiBets.routes.js";

export const apiRouter = Router();

apiRouter.get("/server-time", (_req, res) => {
  res.json({ now: new Date().toISOString() });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/profile", profileRouter);
apiRouter.use("/wallet", walletRouter);
apiRouter.use("/rounds", roundsRouter);
apiRouter.use("/bets", betsRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/superadmin", superAdminRouter);
apiRouter.use("/spin", spinRouter);
apiRouter.use("/color/rounds", colorRoundsRouter);
apiRouter.use("/color/bets", colorBetsRouter);
apiRouter.use("/teenpatti/rounds", teenPattiRoundsRouter);
apiRouter.use("/teenpatti/bets", teenPattiBetsRouter);
