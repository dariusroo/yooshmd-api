const axios = require('axios');
const fs = require('fs');
const path = require('path');

const TOKEN_URL = 'https://drchrono.com/o/token/';
const ENV_PATH = path.join(__dirname, '..', '.env');
const IS_VERCEL = !!process.env.VERCEL;

// In-memory token store — source of truth at runtime
let tokenStore = {
  accessToken: process.env.ACCESS_TOKEN || '',
  refreshToken: process.env.REFRESH_TOKEN || '',
};

async function refreshAccessToken() {
  if (!tokenStore.refreshToken) {
    throw new Error('No refresh token available. Complete OAuth flow first: GET /api/auth/login');
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: tokenStore.refreshToken,
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
  });

  const response = await axios.post(TOKEN_URL, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  tokenStore.accessToken = response.data.access_token;
  if (response.data.refresh_token) {
    tokenStore.refreshToken = response.data.refresh_token;
  }

  persistTokens(tokenStore.accessToken, tokenStore.refreshToken);
  return tokenStore.accessToken;
}

function persistTokens(accessToken, refreshToken) {
  // Always keep process.env in sync for this instance
  process.env.ACCESS_TOKEN = accessToken;
  process.env.REFRESH_TOKEN = refreshToken;

  if (IS_VERCEL) {
    // Vercel filesystem is read-only — tokens live in memory until the next
    // cold start. Update them in the Vercel dashboard after each OAuth flow.
    console.log('[drchrono] Tokens refreshed (in-memory only on Vercel).');
    console.log('[drchrono] ACCESS_TOKEN:', accessToken);
    console.log('[drchrono] REFRESH_TOKEN:', refreshToken);
    return;
  }

  // Local dev — write back to .env
  try {
    let contents = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
    contents = contents
      .split('\n')
      .filter((l) => !l.startsWith('ACCESS_TOKEN=') && !l.startsWith('REFRESH_TOKEN='))
      .join('\n');
    contents += `\nACCESS_TOKEN=${accessToken}\nREFRESH_TOKEN=${refreshToken}\n`;
    fs.writeFileSync(ENV_PATH, contents.replace(/\n{3,}/g, '\n\n').trim() + '\n');
  } catch (err) {
    console.warn('Could not persist tokens to .env:', err.message);
  }
}

// Middleware: attaches an authenticated axios instance to req.drchrono
async function drchronoAuth(req, res, next) {
  if (!tokenStore.accessToken) tokenStore.accessToken = process.env.ACCESS_TOKEN || '';
  if (!tokenStore.refreshToken) tokenStore.refreshToken = process.env.REFRESH_TOKEN || '';

  if (!tokenStore.accessToken) {
    return res.status(401).json({
      error: 'Not authenticated. Visit GET /api/auth/login to start the OAuth flow.',
    });
  }

  const makeClient = (token) =>
    axios.create({
      baseURL: 'https://app.drchrono.com/api',
      headers: { Authorization: `Bearer ${token}` },
    });

  req.drchrono = makeClient(tokenStore.accessToken);

  // Intercept 401s to attempt one token refresh
  req.drchrono.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        try {
          const newToken = await refreshAccessToken();
          error.config.headers['Authorization'] = `Bearer ${newToken}`;
          req.drchrono = makeClient(newToken);
          return axios(error.config);
        } catch (refreshError) {
          return Promise.reject(refreshError);
        }
      }
      return Promise.reject(error);
    }
  );

  next();
}

module.exports = { drchronoAuth, refreshAccessToken, persistTokens, tokenStore };
