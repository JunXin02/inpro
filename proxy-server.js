const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Load your channel data from the JSON file
const channels = require('./channels.json');

const app = express();
const PORT = process.env.PORT || 3000;

// Create a simple Map for fast channel lookups by ID
const channelMap = new Map();
channels.forEach(channel => {
  channelMap.set(channel.id, channel);
});

console.log(`✅ Loaded ${channelMap.size} channels.`);

// A helper route to see which channels are loaded
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Proxy is running. Use /play/{id} to get a stream.',
    available_channels: Array.from(channelMap.keys())
  });
});

// The main proxy route
app.use('/play/:id', (req, res, next) => {
  const { id } = req.params;
  const channelInfo = channelMap.get(id);

  // If we can't find the channel, return a 404 error
  if (!channelInfo) {
    return res.status(404).send(`Channel with ID '${id}' not found.`);
  }

  // Create the proxy specifically for this request
  return createProxyMiddleware({
    target: channelInfo.link,
    changeOrigin: true,
    // This function adds the required headers
    onProxyReq: (proxyReq) => {
      proxyReq.setHeader('Referer', channelInfo.referer);
      proxyReq.setHeader('Origin', channelInfo.origin);
      // We don't need to set User-Agent unless required
    },
    onError: (err, req, res) => {
      console.error('Proxy Error:', err);
      res.status(500).send('Proxy encountered an error.');
    }
  })(req, res, next);
});

app.listen(PORT, () => {
  console.log(`📡 Server live on http://localhost:${PORT}`);
});
