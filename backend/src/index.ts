import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config.js";
import authRouter from "./routes/auth.js";
import claimRouter from "./routes/claim.js";

const app = express();

app.use(cookieParser(config.sessionSecret));
app.use(express.json({ limit: "2mb" }));
app.use(
	cors({
		origin: config.corsOrigin ?? true,
		credentials: true,
	}),
);

app.get("/health", (_req, res) => {
	res.json({ status: "ok", network: config.network });
});

app.use("/api/auth", authRouter);
app.use("/v1", claimRouter);

const server = app.listen(config.port, () => {
	console.log(`Backend listening on port ${config.port}`);
});

process.on("SIGTERM", () => {
	server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
	server.close(() => process.exit(0));
});
