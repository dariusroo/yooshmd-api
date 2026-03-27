const express = require('express');
const axios = require('axios');
const { refreshAccessToken, tokenStore } = require('../middleware/drchrono');

const router = express.Router();

/**
 * GET /api/cron/refresh-token
 *
 * Called every 12 hours by Vercel cron.
 * Refreshes the DrChrono access token and persists the new tokens
 * back to Vercel environment variables so they survive cold starts.
 *
 * Requires these Vercel env vars:
 *   CRON_SECRET      — a random string you set; Vercel sends it as Bearer token
 *   VERCEL_TOKEN     — your Vercel API token (from vercel.com/account/tokens)
 *   VERCEL_PROJECT_ID — found in your project settings on Vercel
 *   VERCEL_TEAM_ID   — (optional) only needed if project is under a team
 */
router.get('/refresh-token', async (req, res) => {
  // Verify the request is from Vercel cron (or you manually hitting it)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization || '';
    if (auth !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const newToken = await refreshAccessToken();

    // Push new tokens to Vercel env vars so cold starts pick them up
    await updateVercelEnvVars({
      ACCESS_TOKEN: tokenStore.accessToken,
      REFRESH_TOKEN: tokenStore.refreshToken,
    });

    res.json({
      ok: true,
      message: 'Token refreshed and Vercel env vars updated.',
      access_token_preview: `${newToken.slice(0, 6)}…`,
    });
  } catch (err) {
    console.error('[cron] Token refresh failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

async function updateVercelEnvVars(vars) {
  const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
  const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
  const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID; // optional

  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    console.warn('[cron] VERCEL_TOKEN or VERCEL_PROJECT_ID not set — skipping env var update.');
    return;
  }

  const base = `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env`;
  const teamQuery = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : '';
  const headers = { Authorization: `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' };

  // Fetch existing env vars to get their IDs
  const listResp = await axios.get(`${base}${teamQuery}`, { headers });
  const existingEnvs = listResp.data.envs || [];

  for (const [key, value] of Object.entries(vars)) {
    const existing = existingEnvs.find(e => e.key === key);
    if (existing) {
      // Update existing env var
      await axios.patch(`${base}/${existing.id}${teamQuery}`, { value, target: existing.target }, { headers });
    } else {
      // Create new env var targeting all environments
      await axios.post(`${base}${teamQuery}`, { key, value, type: 'plain', target: ['production', 'preview', 'development'] }, { headers });
    }
  }
}

module.exports = router;
