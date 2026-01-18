const FirebaseModule = {
    app: null,
    db: null,
    auth: null,
    userId: null,
    serverCode: null,
    unsubscribers: [],
    
    async init() {
        if (typeof firebase === 'undefined') {
            console.error('Firebase SDK not loaded');
            return false;
        }
        try {
            const config = {
                apiKey: "AIzaSyCbolraCD1nrOqcIE5GHPAaX9SRhHQXYIY",
                authDomain: "videoanlyze.firebaseapp.com",
                projectId: "videoanlyze",
                storageBucket: "videoanlyze.firebasestorage.app",
                messagingSenderId: "1053069335615",
                appId: "1:1053069335615:web:5dbf8f2345a5bf18b1ac8a"
            };
            if (!firebase.apps.length) {
                this.app = firebase.initializeApp(config);
            } else {
                this.app = firebase.apps[0];
            }
            this.db = firebase.firestore();
            this.auth = firebase.auth();
            const cred = await this.auth.signInAnonymously();
            this.userId = cred.user.uid;
            console.log('Firebase initialized, userId:', this.userId);
            return true;
        } catch (err) {
            console.error('Firebase init error:', err);
            return false;
        }
    },
    
    generateServerCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
        return code;
    },
    
    async createServer(playerName, countryId, maxPlayers) {
        maxPlayers = maxPlayers || 8;
        const code = this.generateServerCode();
        const serverRef = this.db.collection('servers').doc(code);
        await serverRef.set({
            code: code,
            hostId: this.userId,
            status: 'waiting',
            maxPlayers: maxPlayers,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            players: [{ id: this.userId, name: playerName, country: countryId, ready: true, connected: true }]
        });
        this.serverCode = code;
        return code;
    },
    
    async joinServer(code, playerName, countryId) {
        const serverRef = this.db.collection('servers').doc(code);
        const doc = await serverRef.get();
        if (!doc.exists) throw new Error('Server bulunamadı');
        const server = doc.data();
        if (server.status !== 'waiting') throw new Error('Oyun başlamış');
        if (server.players.length >= server.maxPlayers) throw new Error('Server dolu');
        if (server.players.some(function(p) { return p.country === countryId; })) throw new Error('Ülke seçilmiş');
        await serverRef.update({
            players: firebase.firestore.FieldValue.arrayUnion({ id: this.userId, name: playerName, country: countryId, ready: false, connected: true })
        });
        this.serverCode = code;
        return server;
    },
    
    subscribeToServer(code, callback) {
        var self = this;
        var unsub = this.db.collection('servers').doc(code).onSnapshot(function(doc) { 
            if (doc.exists) callback(doc.data()); 
        });
        this.unsubscribers.push(unsub);
        return unsub;
    },
    
    async setReady(ready) {
        if (!this.serverCode) return;
        var self = this;
        var serverRef = this.db.collection('servers').doc(this.serverCode);
        var doc = await serverRef.get();
        var players = doc.data().players.map(function(p) { 
            return p.id === self.userId ? Object.assign({}, p, { ready: ready }) : p; 
        });
        await serverRef.update({ players: players });
    },
    
    async startGame() {
        if (!this.serverCode) return false;
        var serverRef = this.db.collection('servers').doc(this.serverCode);
        var doc = await serverRef.get();
        var server = doc.data();
        if (server.hostId !== this.userId) return false;
        var gameState = { startedAt: firebase.firestore.FieldValue.serverTimestamp(), players: {} };
        server.players.forEach(function(player, i) {
            gameState.players[player.id] = {
                dollars: CONFIG.STARTING_DOLLARS,
                resources: { oil: 0, gold: 0, wheat: 0, iron: 0, copper: 0, uranium: 0 },
                startAngle: (i / server.players.length) * Math.PI * 2 - Math.PI / 2,
                alive: true
            };
        });
        await serverRef.update({ status: 'playing', gameState: gameState });
        return true;
    },
    
    async leaveServer() {
        if (!this.serverCode) return;
        var self = this;
        this.unsubscribers.forEach(function(unsub) { unsub(); });
        this.unsubscribers = [];
        var serverRef = this.db.collection('servers').doc(this.serverCode);
        var doc = await serverRef.get();
        if (doc.exists) {
            var server = doc.data();
            var players = server.players.filter(function(p) { return p.id !== self.userId; });
            if (players.length === 0) {
                await serverRef.delete();
            } else {
                var newHostId = server.hostId === self.userId ? players[0].id : server.hostId;
                await serverRef.update({ players: players, hostId: newHostId });
            }
        }
        this.serverCode = null;
    }
};

window.FirebaseModule = FirebaseModule;
