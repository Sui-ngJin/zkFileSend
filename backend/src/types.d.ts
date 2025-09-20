declare module "cors" {
	import type { RequestHandler } from "express";

	export interface CorsOptions {
		origin?: boolean | string | RegExp | (string | RegExp)[];
		credentials?: boolean;
		methods?: string | string[];
		allowedHeaders?: string | string[];
		exposedHeaders?: string | string[];
		maxAge?: number;
		preflightContinue?: boolean;
		optionsSuccessStatus?: number;
	}

	export type CorsOptionsDelegate = (
		req: import("http").IncomingMessage,
		callback: (err: Error | null, options?: CorsOptions) => void,
	) => void;

	const cors: {
		(options?: CorsOptions | CorsOptionsDelegate): RequestHandler;
	};

	export default cors;
}
