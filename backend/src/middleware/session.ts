import type { NextFunction, Request, Response } from "express";
import { sessionStore, type StoredSession } from "../utils/session-store.js";

export type AuthenticatedRequest = Request & {
	sessionId: string;
	session: StoredSession;
};

export function requireSession(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	const sessionId = req.cookies?.zkSession;
	if (!sessionId || typeof sessionId !== "string") {
		return res.status(401).json({ error: "Missing session cookie" });
	}
	const session = sessionStore.getSession(sessionId);
	if (!session) {
		return res.status(401).json({ error: "Session expired or not found" });
	}
	(req as AuthenticatedRequest).sessionId = sessionId;
	(req as AuthenticatedRequest).session = session;
	return next();
}
