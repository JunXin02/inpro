const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { SocksProxyAgent } = require('socks-proxy-agent');
const axios = require('axios'); // You need to install this: npm install axios

const app = express();
const PORT = process.env.PORT || 3000;

// The URL for your dynamic channel list
const API_URL = 'https://raw.githubusercontent.com/abusaeeidx/CricHd-playlists-Auto-Update-permanent/refs/heads/main/api.json';

// This will hold our channel data for quick lookups (e.g., 'ts-1' -> 'http://...')
const channelMap = new Map();

const proxyAgent = new SocksProxyAgent(
  'socks5h://@bdiix_bypass:@bdiix_bypass@circle.bypassempire.com:1080'
);

/**
 * Fetches the channel list from the API_URL and caches it in the channelMap.
 */
async function fetchAndCacheChannels() {
  try {
    console.log('Fetching channel list from API...');
    const response = await axios.get(API_URL);
    const channels = response.data;

    // Clear the old map and populate it with new data
    channelMap.clear();
    for (const channel of channels) {
      if (channel.id && channel.url) {
        channelMap.set(channel.id, channel.url);
      }
    }
    console.log(`✅ Successfully cached ${channelMap.size} channels.`);
  } catch (error) {
    console.error('❌ Failed to fetch or cache channel data:', error.message);
  }
}

// Helper route to list all available channel IDs
app.get('/', (req, res) => {
  if (channelMap.size === 0) {
    return res.status(503).json({
      error: 'Channel list is not available. Please check server logs.'
    });
  }
  res.status(200).json({
    message: 'Proxy is running. Use /play/{id} to access a channel.',
    available_channel_ids: Array.from(channelMap.keys())
  });
});


// 🎯 New Dynamic Proxy Route: /play/:id
app.use('/play/:id', (req, res, next) => {
  const { id } = req.params;
  const targetUrl = channelMap.get(id);

  // If the channel ID doesn't exist in our map, return a 404 error.
  if (!targetUrl) {
    return res.status(404).send(`Channel with ID '${id}' not found.`);
  }

  // Create the proxy for the found URL
  return createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    agent: proxyAgent,
    // Since the target is a full URL, we rewrite the path to be empty
    pathRewrite: () => '',
    onProxyReq: (proxyReq) => {
      proxyReq.setHeader('Origin', 'https://stylisheleg4nt.com');
      proxyReq.setHeader('Referer', 'https://stylisheleg4nt.com');
      proxyReq.setHeader('User-Agent', 'Mozilla/5.0');
    },
    // Optional: More robust error handling for the proxy itself
    onError: (err, req, res) => {
      console.error('Proxy error:', err);
      res.status(500).send('Proxy encountered an error.');
    }
  })(req, res, next);
});

// We must fetch the channels *before* starting the server
fetchAndCacheChannels().then(() => {
  app.listen(PORT, () => {
    console.log(`📡 Proxy server listening on http://localhost:${PORT}`);
    console.log(`▶️  Example usage: http://localhost:${PORT}/play/ts-1`);
  });
});
