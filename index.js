const { WebSocketServer } = require('ws');

const port = process.env.PORT || 10000;
const wss = new WebSocketServer({ port }, () => {
    console.log(`Eaglercraft Relay running on port ${port}`);
});

// Track active LAN worlds being hosted
const worlds = new Map();

wss.on('connection', (ws) => {
    let currentWorldCode = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            // 1. Host opens a world to LAN
            if (data.type === 'host') {
                currentWorldCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                worlds.set(currentWorldCode, ws);
                ws.send(JSON.stringify({ type: 'code', code: currentWorldCode }));
                console.log(`New world hosted with code: ${currentWorldCode}`);
            } 
            
            // 2. Friend tries to join using a code
            else if (data.type === 'join') {
                const hostWs = worlds.get(data.code);
                if (hostWs) {
                    ws.hostWs = hostWs;
                    hostWs.send(JSON.stringify({ type: 'player_joined', playerCode: data.playerCode }));
                } else {
                    ws.send(JSON.stringify({ type: 'error', message: 'World not found' }));
                }
            } 
            
            // 3. Relay connection signals between players (WebRTC signaling)
            else if (data.target) {
                const hostWs = worlds.get(data.target) || ws.hostWs;
                if (hostWs) {
                    hostWs.send(JSON.stringify(data));
                }
            }
        } catch (err) {
            // Ignore malformed browser pings
        }
    });

    ws.on('close', () => {
        if (currentWorldCode && worlds.has(currentWorldCode)) {
            worlds.delete(currentWorldCode);
            console.log(`World ${currentWorldCode} closed.`);
        }
    });
});
