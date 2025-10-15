const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { SocksProxyAgent } = require('socks-proxy-agent');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// The URL for your dynamic channel list
const API_URL = 'https://raw.githubusercontent.com/abusaeeidx/CricHd-playlists-Auto-Update-permanent/refs/heads/main/api.json';

// ✅ How often (in minutes) to refresh the channel list from the API
const UPDATE_INTERVAL_MINUTES = 30;

// This will hold our channel data for quick lookups
const channelMap = new Map();

const proxyAgent = new SocksProxyAgent(
  'socks5h://@bdiix_bypass:@bdiix_bypass@circle.bypassempire.com:1080'
);

/**
 * Fetches the channel list from the API_URL and caches it in the channelMap.
 * This function is now called periodically.
 */
async function fetchAndCacheChannels() {
  try {
    console.log('🔄 Fetching and updating channel list from API...');
    const response = await axios.get(API_URL);
    const channels = response.data;

    const newMap = new Map();
    for (const channel of channels) {
      if (channel.id && channel.url) {
        newMap.set(channel.id, channel.url);
      }
    }

    // Atomically update the map so we don't have a partially updated list
    channelMap.clear();
    newMap.forEach((url, id) => channelMap.set(id, url));

    console.log(`✅ Successfully cached ${channelMap.size} channels.`);
  } catch (error) {
    console.error('❌ Failed to fetch or cache channel data:', error.message);
  }
}

// Helper route to list all available channel IDs
app.get('/', (req, res) => {
  if (channelMap.size === 0) {
    return res.status(503).json({
      error: 'Channel list is not available. Check server logs.'
    });
  }
  res.status(200).json({
    message: 'Proxy is running. Use /play/{id} to access a channel.',
    available_channel_ids: Array.from(channelMap.keys())
  });
});

// Dynamic Proxy Route: /play/:id
app.use('/play/:id', (req, res, next) => {
  const { id } = req.params;
  const targetUrl = channelMap.get(id);

  if (!targetUrl) {
    return res.status(404).send(`Channel with ID '${id}' not found.`);
  }

  return createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    agent: proxyAgent,
    pathRewrite: () => '',
    onProxyReq: (proxyReq) => {
      proxyReq.setHeader('Origin', 'https://stylisheleg4nt.com');
      proxyReq.setHeader('Referer', 'https://stylisheleg4nt.com');
      proxyReq.setHeader('User-Agent', 'Mozilla/5.0');
    },
    onError: (err, req, res) => {
      console.error('Proxy error:', err);
      res.status(500).send('Proxy encountered an error.');
    }
  })(req, res, next);
});

// --- Main Server Start ---

// 1. Fetch the channels immediately on startup.
fetchAndCacheChannels().then(() => {
  // 2. After the initial fetch, start the server.
  app.listen(PORT, () => {
    console.log(`📡 Proxy server listening on http://localhost:${PORT}`);
    console.log(`▶️  Example usage: http://localhost:${PORT}/play/ts-1`);

    // 3. Set up the automatic refresh interval.
    // It will run every X minutes to update the links.
    const intervalMilliseconds = UPDATE_INTERVAL_MINUTES * 60 * 1000;
    setInterval(fetchAndCacheChannels, intervalMilliseconds);
    console.log(`ℹ️  Channel list will auto-update every ${UPDATE_INTERVAL_MINUTES} minutes.`);
  });
}).catch(error => {
    console.error("❌ Critical error on initial channel fetch. Server cannot start.", error);
    process.exit(1); // Exit if we can't get the initial list
});
