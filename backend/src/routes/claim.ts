import { Router } from "express";
import type { Response } from "express";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { z } from "zod";
import { config } from "../config.js";
import {
	requireSession,
	type AuthenticatedRequest,
} from "../middleware/session.js";
import { sponsorService } from "../services/sponsor-service.js";
import { transactionCache } from "../utils/sponsor-cache.js";

const router = Router();

const sponsorBodySchema = z.object({
	network: z.string().optional(),
	sender: z.string(),
	claimer: z.string(),
	transactionBlockKindBytes: z.string(),
});

const signatureSchema = z.object({
	signature: z.string(),
});

router.post("/transaction-blocks/sponsor", requireSession, async (req, res) => {
	const { session } = req as AuthenticatedRequest;
	const parse = sponsorBodySchema.safeParse(req.body);
	if (!parse.success) {
		return res.status(400).json({ error: parse.error.message });
	}

	const body = parse.data;
	if (
		body.network &&
		body.network !== config.enokiEnv &&
		body.network !== config.network
	) {
		return res
			.status(400)
			.json({ error: `Unsupported network ${body.network}` });
	}

	const claimer = normalizeSuiAddress(body.claimer);
	if (claimer !== normalizeSuiAddress(session.address)) {
		return res
			.status(403)
			.json({ error: "Claimer address does not match authenticated session" });
	}

	try {
		const sponsored = await sponsorService.prepareSponsoredTransaction({
			transactionBlockKindBytes: body.transactionBlockKindBytes,
			claimer,
			sender: normalizeSuiAddress(body.sender),
		});

		res.json({
			data: {
				digest: sponsored.digest,
				bytes: sponsored.bytes,
				sponsor: sponsorService.sponsorAddress,
				expiresAt: Date.now() + config.sponsorMaxLifetimeMs,
			},
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to sponsor transaction";
		res.status(400).json({ error: message });
	}
});

router.post(
	"/transaction-blocks/sponsor/:digest",
	requireSession,
	async (req, res: Response) => {
		const { session } = req as AuthenticatedRequest;
		const parse = signatureSchema.safeParse(req.body);
		if (!parse.success) {
			return res.status(400).json({ error: parse.error.message });
		}

		console.info("[sponsor] execute request", {
			digest: req.params.digest,
			claimer: session.address,
			signatureSnippet:
				typeof parse.data.signature === "string"
					? `${parse.data.signature.slice(0, 16)}...`
					: null,
		});

		console.info("[sponsor] execute request", {
			digest: req.params.digest,
			claimer: session.address,
			signatureLength:
				typeof parse.data.signature === "string"
					? parse.data.signature.length
					: null,
		});

		const pending = transactionCache.get(req.params.digest);
		if (!pending) {
			return res.status(404).json({ error: "Sponsored transaction not found" });
		}

		const claimer = normalizeSuiAddress(session.address);
		if (pending.claimer !== claimer) {
			return res
				.status(403)
				.json({
					error: "Session does not match sponsored transaction claimer",
				});
		}

		try {
			const execution = await sponsorService.executeSponsoredTransaction(
				req.params.digest,
				parse.data.signature,
			);
			res.json({ data: { digest: execution.digest } });
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Failed to execute sponsored transaction";
			console.error("[sponsor] execute failed", {
				digest: req.params.digest,
				claimer,
				error,
				errorData: (error as any)?.data,
			});
			res.status(400).json({ error: message });
		}
	},
);

export default router;
