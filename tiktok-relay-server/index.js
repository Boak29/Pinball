const WebSocket = require('ws');
const { TikTokLive } = require('tiktok-live-connector');

const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port: PORT });

console.log('TikTok Pinball Relay Server started on port ' + PORT);

// Store active TikTok connections keyed by WebSocket client ID
const clients = new Map();

wss.on('connection', function(ws) {
    const clientId = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    let tiktokClient = null;
    let currentUsername = null;

    console.log('Client connected: ' + clientId);

    ws.on('message', function(message) {
        try {
            const data = JSON.parse(message);

            if (data.type === 'join' && data.username) {
                currentUsername = data.username;

                // Disconnect existing TikTok connection if any
                if (tiktokClient) {
                    try { tiktokClient.disconnect(); } catch(e) {}
                }

                // Connect to TikTok LIVE
                tiktokClient = new TikTokLive({
                    username: currentUsername,
                    processInitialData: false
                });

                tiktokClient.on('connected', function() {
                    console.log('Connected to TikTok LIVE: @' + currentUsername);
                    sendToClient(ws, { type: 'connected', username: currentUsername });
                });

                tiktokClient.on('gift', function(giftData) {
                    const event = {
                        type: 'gift',
                        uniqueId: giftData.uniqueId || '',
                        nickname: giftData.nickname || giftData.uniqueId || 'Viewer',
                        giftName: giftData.giftName || 'Gift',
                        diamondCount: giftData.diamondCount || 0,
                        repeatCount: giftData.repeatCount || 1
                    };
                    console.log('Gift from @' + event.nickname + ': ' + event.giftName + ' x' + event.repeatCount);
                    sendToClient(ws, event);
                });

                tiktokClient.on('comment', function(commentData) {
                    // Optional: handle comments
                });

                tiktokClient.on('error', function(err) {
                    console.error('TikTok error for @' + currentUsername + ':', err.message);
                    sendToClient(ws, { type: 'error', message: 'TikTok connection error: ' + err.message });
                });

                tiktokClient.on('disconnected', function() {
                    console.log('Disconnected from TikTok LIVE: @' + currentUsername);
                });

                tiktokClient.connect().catch(function(err) {
                    console.error('Connection failed for @' + currentUsername + ':', err.message);
                    sendToClient(ws, { type: 'error', message: 'Failed to connect: ' + err.message });
                });

                clients.set(clientId, { ws: ws, username: currentUsername });
            }
        } catch(e) {
            console.error('Invalid message:', e.message);
        }
    });

    ws.on('close', function() {
        console.log('Client disconnected: ' + clientId + ' (@' + (currentUsername || 'unknown') + ')');
        if (tiktokClient) {
            try { tiktokClient.disconnect(); } catch(e) {}
        }
        clients.delete(clientId);
    });

    ws.on('error', function(err) {
        console.error('WebSocket error for client ' + clientId + ':', err.message);
    });

    // Send heartbeat
    const heartbeat = setInterval(function() {
        if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
        } else {
            clearInterval(heartbeat);
        }
    }, 30000);
});

function sendToClient(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    }
}

// Health check endpoint via HTTP (for uptime monitoring)
const http = require('http');
const server = http.createServer(function(req, res) {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            clients: clients.size,
            uptime: process.uptime()
        }));
    } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>TikTok Pinball Relay Server</h1><p>Status: running</p><p>Active connections: ' + clients.size + '</p>');
    }
});
server.listen(PORT + 1, function() {
    console.log('HTTP server listening on port ' + (PORT + 1));
});
