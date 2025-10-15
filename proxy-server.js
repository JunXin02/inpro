const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { SocksProxyAgent } = require('socks-proxy-agent');

const app = express();
const PORT = process.env.PORT || 3000;

const proxyAgent = new SocksProxyAgent(
  'socks5h://@bdiix_bypass:@bdiix_bypass@circle.bypassempire.com:1080'
);

// 🎯 This route attempts to proxy a single, hardcoded link.
app.use('/play/static_channel', (req, res, next) => {

  // ⚠️ WARNING: THE LINK BELOW IS EXPIRED AND WILL NOT WORK.
  // This is the source of the failure. The server at 'd15.epicquesthero.com'
  // will see the old expiration date and reject the connection.
  const EXPIRED_TARGET_URL = 'https://d15.epicquesthero.com:999/hls/star1in.m3u8?md5=WU2BMsOyX10ZIIe1Ck8uBg&expires=1760536410';

  // The proxy middleware is configured correctly, but it cannot
  // make an expired link valid again.
  return createProxyMiddleware({
    target: EXPIRED_TARGET_URL,
    changeOrigin: true,
    agent: proxyAgent,
    // We rewrite the path because the target is a full URL
    pathRewrite: () => '',
    onProxyReq: (proxyReq) => {
      // These headers are set correctly, but it doesn't matter
      // because the target URL is already dead.
      proxyReq.setHeader('Origin', 'https://stylisheleg4nt.com');
      proxyReq.setHeader('Referer', 'https://stylisheleg4nt.com');
      proxyReq.setHeader('User-Agent', 'Mozilla/5.0');
    },
    onError: (err, req, res) => {
      // You will likely see an error here in your console (e.g., 403 Forbidden).
      console.error('Proxy error:', err.message);
      res.status(500).send('Proxy failed to connect to the target. The target link is likely expired or invalid.');
    }
  })(req, res, next);
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log("❌ The link below will NOT work because the source URL is expired:");
  console.log(`http://localhost:${PORT}/play/static_channel`);
});
