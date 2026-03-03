const express = require('express');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const qrcode = require('qrcode-terminal');
const cookieParser = require('cookie-parser');
const https = require('https');
const selfsigned = require('selfsigned');
const { Server } = require('socket.io');
const { loadDB, saveDB, hashPassword, verifyPassword } = require('./auth');

const app = express();

// LAN IP Detection Rules
let lanIp = '127.0.0.1';
const args = process.argv.slice(2);
const hostArgIndex = args.indexOf('--host');

if (hostArgIndex !== -1 && args[hostArgIndex + 1]) {
    lanIp = args[hostArgIndex + 1];
} else {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        // Filter out virtual nets
        if (name.toLowerCase().includes('vethernet') ||
            name.toLowerCase().includes('wsl') ||
            name.toLowerCase().includes('docker')) {
            continue;
        }

        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                lanIp = iface.address;
                break;
            }
        }
        if (lanIp !== '127.0.0.1') break;
    }
}

const port = process.env.PORT || 3000;
const host = '0.0.0.0';

// In-memory pairings
const pairingTokens = {};

// Middleware Setup
app.use(express.json());
app.use(cookieParser());

// Guest Pairing Interceptor
app.use((req, res, next) => {
    if (req.path === '/' && req.query.pair) {
        const token = req.query.pair;
        if (pairingTokens[token]) {
            const sessionId = crypto.randomBytes(32).toString('hex');
            const db = loadDB();
            // Assign a guest session so the mobile phone bypasses full system login dynamically
            db.sessions[sessionId] = 'guest_device';
            saveDB(db);
            res.cookie('sessionId', sessionId, { httpOnly: true, sameSite: 'strict', maxAge: 86400000 * 365 });
            req.cookies.sessionId = sessionId; // Forward to requireAuth seamlessly
        }
    }
    next();
});

// Authorization Middleware Restricting Resources
const requireAuth = (req, res, next) => {
    const { sessionId } = req.cookies;
    if (!sessionId) {
        return res.status(401).redirect('login.html');
    }
    const db = loadDB();
    if (!db.sessions[sessionId]) {
        res.clearCookie('sessionId');
        return res.status(401).redirect('login.html');
    }
    req.userId = db.sessions[sessionId];
    next();
};

// --- AUTHENTICATION API --- //

app.post('/api/auth/register', (req, res) => {
    const { email, password, inviteToken } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const db = loadDB();

    // Check if First User (Admin bypass)
    let role = 'user';
    let status = 'pending';

    if (db.users.length === 0) {
        role = 'admin';
        status = 'approved';
    } else {
        // Enforce Invite Code constraints
        const validInviteIndex = db.invites.findIndex(i => i.token === inviteToken && i.status === 'unused');
        if (validInviteIndex === -1) {
            return res.status(403).json({ error: 'Invalid or missing invite token' });
        }
        db.invites[validInviteIndex].status = 'used';
    }

    const newUser = {
        id: crypto.randomUUID(),
        email,
        password: hashPassword(password),
        role,
        status
    };

    db.users.push(newUser);
    saveDB(db);

    res.status(201).json({ message: 'User registered successfully', role, status });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const db = loadDB();

    const user = db.users.find(u => u.email === email);
    if (!user || !verifyPassword(password, user.password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status !== 'approved') {
        return res.status(403).json({ error: 'Account pending admin approval' });
    }

    const sessionId = crypto.randomBytes(32).toString('hex');
    db.sessions[sessionId] = user.id;
    saveDB(db);

    res.cookie('sessionId', sessionId, { httpOnly: true, sameSite: 'strict', maxAge: 86400000 });
    res.status(200).json({ message: 'Logged in successfully' });
});

app.post('/api/auth/logout', (req, res) => {
    const { sessionId } = req.cookies;
    if (sessionId) {
        const db = loadDB();
        delete db.sessions[sessionId];
        saveDB(db);
        res.clearCookie('sessionId');
    }
    res.status(200).json({ message: 'Logged out' });
});

app.post('/api/admin/invite', requireAuth, (req, res) => {
    const db = loadDB();
    const adminUser = db.users.find(u => u.id === req.userId);

    if (!adminUser || adminUser.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    const token = crypto.randomBytes(8).toString('hex');
    db.invites.push({
        token,
        createdBy: req.userId,
        status: 'unused',
        createdAt: Date.now()
    });
    saveDB(db);

    res.status(201).json({ inviteToken: token });
});

app.post('/api/admin/approve/:id', requireAuth, (req, res) => {
    const db = loadDB();
    const adminUser = db.users.find(u => u.id === req.userId);

    if (!adminUser || adminUser.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    const userToApprove = db.users.find(u => u.id === req.params.id);
    if (!userToApprove) return res.status(404).json({ error: 'User not found' });

    userToApprove.status = 'approved';
    saveDB(db);

    res.status(200).json({ message: 'User approved' });
});

// Serve frontend assets mapping logic:
// Open static pages for login flows
app.use('/login.html', express.static(path.join(__dirname, 'public/login.html')));
app.use('/register.html', express.static(path.join(__dirname, 'public/register.html')));
app.use('/styles.css', express.static(path.join(__dirname, 'public/styles.css')));

// LAN config endpoint (no auth needed — mobile devices call this to get the correct IP)
app.get('/api/lan-config', (req, res) => {
    const httpPort = parseInt(port) + 1;
    res.json({ lanIp, httpPort, httpsPort: port });
});

// Protect the rest of the application using middleware
app.use(requireAuth);
app.use(express.static('public'));

// Server Initialization Wrap
(async function startServer() {
    const isProduction = process.env.NODE_ENV === 'production';
    let server;

    if (isProduction) {
        // In production (Render, Railway etc) the platform handles HTTPS → plain HTTP inside
        const http = require('http');
        server = http.createServer(app);
        console.log('Production mode: using plain HTTP (HTTPS handled by platform)');
    } else {
        console.log("Generating 2048-bit SHA-256 self-signed Local TLS payload. This may take a few seconds...");
        const pems = await selfsigned.generate(
            [{ name: 'commonName', value: lanIp }],
            {
                keySize: 2048,
                days: 365,
                algorithm: 'sha256',
                extensions: [{ name: 'subjectAltName', altNames: [{ type: 7, ip: lanIp }, { type: 2, value: 'localhost' }] }]
            }
        );
        const https = require('https');
        server = https.createServer({ key: pems.private, cert: pems.cert }, app);
        console.log(`Dev mode: self-signed HTTPS at https://${lanIp}:${port}`);
    }

    const io = new Server(server, {
        cors: { origin: '*' },
        transports: ['websocket', 'polling']
    });

    // Socket.io Signaling Server
    io.on('connection', (socket) => {
        const room = 'lan_network';
        socket.join(room);

        socket.on('generate_pairing', (callback) => {
            const token = crypto.randomBytes(8).toString('hex');
            pairingTokens[token] = { createdAt: Date.now() };
            callback({ token });
        });

        socket.on('pair_join', (data) => {
            const { token, deviceData } = data;
            if (pairingTokens[token]) {
                delete pairingTokens[token];
                socket.to(room).emit('device_joined', { id: socket.id, deviceData });
            }
        });

        socket.on('pair_device', (data, callback) => {
            const { token, deviceData } = data;
            if (pairingTokens[token]) {
                delete pairingTokens[token];
                socket.to(room).emit('device_joined', { id: socket.id, deviceData });
                callback({ success: true });
            } else {
                callback({ success: false, error: 'Invalid or expired pairing token.' });
            }
        });

        socket.on('device_reconnected', (deviceData) => {
            socket.to(room).emit('device_joined', { id: socket.id, deviceData });
        });

        socket.on('request_sync', () => {
            socket.to(room).emit('request_sync_dispatch', { requesterId: socket.id });
        });

        socket.on('sync_response', (data) => {
            io.to(data.requesterId).emit('device_joined', { id: socket.id, deviceData: data.deviceData });
        });

        socket.on('disconnect', () => {
            socket.to(room).emit('device_left', { id: socket.id });
            socket.leave(room);
        });

        socket.on('signal', (data) => {
            socket.to(data.to).emit('signal', { from: socket.id, signal: data.signal });
        });
    });

    server.listen(port, host, () => {
        console.log(`\nServer listening on port ${port}`);
        if (!isProduction) {
            console.log(`HTTPS: https://${lanIp}:${port}`);

            // Also start a plain HTTP server for mobile devices (self-signed certs fail on phones)
            const http = require('http');
            const httpPort = parseInt(port) + 1; // 3001
            const httpServer = http.createServer(app);

            // CRITICAL: Attach the SAME Socket.io instance to the HTTP server
            // This way PC (HTTPS) and phone (HTTP) share the same rooms and can pair
            io.attach(httpServer);

            httpServer.listen(httpPort, host, () => {
                console.log(`HTTP (mobile): http://${lanIp}:${httpPort}\n`);
                if (os.platform() === 'win32') {
                    console.log('--- Windows Firewall Warning ---');
                    console.log(`netsh advfirewall firewall add rule name="BeamDrop" dir=in action=allow protocol=TCP localport=${port}`);
                    console.log(`netsh advfirewall firewall add rule name="BeamDrop-HTTP" dir=in action=allow protocol=TCP localport=${httpPort}\n`);
                }
                // QR code now points to HTTP for mobile compatibility
                console.log('Scan this QR code on your phone:');
                qrcode.generate(`http://${lanIp}:${httpPort}`, { small: true });
            });
        } else {
            console.log('BeamDrop running in production mode');
        }
    });
})();
