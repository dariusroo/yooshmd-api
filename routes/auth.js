const express = require('express');
const axios = require('axios');
const { persistTokens, tokenStore } = require('../middleware/drchrono');

const router = express.Router();

const AUTH_URL = 'https://drchrono.com/o/authorize/';
const TOKEN_URL = 'https://drchrono.com/o/token/';

// Step 1: Redirect user to DrChrono for authorization
// Visit this URL in your browser: GET /api/auth/login
router.get('/login', (req, res) => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.CLIENT_ID,
    redirect_uri: process.env.REDIRECT_URI,
  });

  res.redirect(`${AUTH_URL}?${params.toString()}`);
});

// Step 2: DrChrono redirects here with ?code=
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).json({ error, description: req.query.error_description, all_params: req.query });
  }
  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code', all_params: req.query });
  }

  try {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.REDIRECT_URI,
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
    });

    const response = await axios.post(TOKEN_URL, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const { access_token, refresh_token, expires_in } = response.data;

    tokenStore.accessToken = access_token;
    tokenStore.refreshToken = refresh_token;
    persistTokens(access_token, refresh_token);

    const onVercel = !!process.env.VERCEL;
    res.json({
      message: onVercel
        ? 'OAuth successful! Copy these tokens into your Vercel environment variables, then redeploy.'
        : 'OAuth successful! Tokens saved to .env.',
      expires_in,
      ...(onVercel && { ACCESS_TOKEN: access_token, REFRESH_TOKEN: refresh_token }),
    });
  } catch (err) {
    const detail = err.response?.data || err.message;
    res.status(500).json({ error: 'Token exchange failed', detail });
  }
});

// Check current auth status
router.get('/status', (req, res) => {
  const hasAccess = !!(tokenStore.accessToken || process.env.ACCESS_TOKEN);
  const hasRefresh = !!(tokenStore.refreshToken || process.env.REFRESH_TOKEN);
  res.json({ authenticated: hasAccess, hasRefreshToken: hasRefresh });
});

module.exports = router;
