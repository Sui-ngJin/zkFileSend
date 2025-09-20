import { Router } from 'express';
import type { Request, Response } from 'express';
import { config } from '../config.js';
import { startGoogleAuth, completeGoogleAuth, extractHashFromRequest } from '../services/enoki-service.js';
import { createZkLoginSignatureForTransaction } from '../services/signature-service.js';
import { requireSession, type AuthenticatedRequest } from '../middleware/session.js';
import { sessionStore } from '../utils/session-store.js';

const router = Router();

router.get('/google/start', async (_req: Request, res: Response) => {
  try {
    const { url, state } = await startGoogleAuth();
    res.json({ authorizationUrl: url, state });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start Google login';
    res.status(500).json({ error: message });
  }
});

router.get('/google/callback', (_req, res) => {
  const finalizeUrl = `${config.publicBaseUrl || ''}/api/auth/google/complete`;
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Completing login…</title>
  </head>
  <body>
    <script>
      (async () => {
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        const queryParams = new URLSearchParams(window.location.search);
        const state = hashParams.get('state') || queryParams.get('state');
        const response = await fetch('${finalizeUrl}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ state, hash: window.location.hash })
        });
        const payload = await response.json();
        if (window.opener) {
          window.opener.postMessage({ type: 'enoki:login', payload }, '*');
          window.close();
        } else {
          try {
            window.close();
          } catch (e) {
            // ignore
          }
          if (!window.closed) {
            document.body.innerText = JSON.stringify(payload);
          }
        }
      })();
    </script>
  </body>
</html>`;
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

router.post('/google/complete', async (req: Request, res: Response) => {
  try {
    const state = req.body?.state ?? req.query?.state;
    if (!state || typeof state !== 'string') {
      return res.status(400).json({ error: 'Missing state parameter' });
    }
    const hash = extractHashFromRequest(req);
    const result = await completeGoogleAuth(state, hash);

    res.cookie('zkSession', result.sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.publicBaseUrl?.startsWith('https://') ?? false,
      maxAge: result.expiresAt - Date.now(),
    });

    res.json({
      address: result.address,
      salt: result.salt,
      publicKey: result.publicKey,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to complete login';
    res.status(400).json({ error: message });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  const sessionId = req.cookies?.zkSession;
  if (sessionId && typeof sessionId === 'string') {
    sessionStore.deleteSession(sessionId);
  }
  res.clearCookie('zkSession');
  res.status(204).end();
});

router.get('/session', (req: Request, res: Response) => {
  const sessionId = req.cookies?.zkSession;
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(401).json({ error: 'No active session' });
  }
  const session = sessionStore.getSession(sessionId);
  if (!session) {
    return res.status(401).json({ error: 'Session expired' });
  }
  res.json({ address: session.address, expiresAt: session.expiresAt });
});

router.post('/sign', requireSession, async (req: Request, res: Response) => {
  const { session } = req as AuthenticatedRequest;
  const transactionBlock = req.body?.transactionBlock;
  if (!transactionBlock || typeof transactionBlock !== 'string') {
    return res.status(400).json({ error: 'transactionBlock must be a base64 string' });
  }

  try {
    const signature = await createZkLoginSignatureForTransaction(session, transactionBlock);
    res.json({ signature });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to sign transaction';
    res.status(400).json({ error: message });
  }
});

export default router;
