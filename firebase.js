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
    
    async createServer(playerName, countryId, maxPlayers = 8) {
        const code = this.generateServerCode();
        const serverRef = this.db.collection('servers').doc(code);
        await serverRef.set({
            code,
            hostId: this.userId,
            status: 'waiting',
            maxPlayers,
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
        if (server.players.some(p => p.country === countryId)) throw new Error('Ülke seçilmiş');
        await serverRef.update({
            players: firebase.firestore.FieldValue.arrayUnion({ id: this.userId, name: playerName, country: countryId, ready: false, connected: true })
        });
        this.serverCode = code;
        return server;
    },
    
    subscribeToServer(code, callback) {
        const unsub = this.db.collection('servers').doc(code).onSnapshot(doc => { if (doc.exists) callback(doc.data()); });
        this.unsubscribers.push(unsub);
        return unsub;
    },
    
    subscribeToChat(code, callback) {
        const unsub = this.db.collection('servers').doc(code).collection('messages')
            .orderBy('timestamp', 'asc').limitToLast(100)
            .onSnapshot(snapshot => {
                const messages = [];
                snapshot.forEach(doc => {
                    const msg = doc.data();
                    if (!msg.private || msg.senderId === this.userId || msg.targetId === this.userId) {
                        messages.push({ id: doc.id, ...msg });
                    }
                });
                callback(messages);
            });
        this.unsubscribers.push(unsub);
        return unsub;
    },
    
    async sendMessage(message, isPrivate, targetId, targetName) {
        if (!this.serverCode) return;
        await this.db.collection('servers').doc(this.serverCode).collection('messages').add({
            senderId: this.userId,
            senderName: Multiplayer.playerName,
            message,
            private: isPrivate,
            targetId,
            targetName,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    },
    
    async setReady(ready) {
        if (!this.serverCode) return;
        const serverRef = this.db.collection('servers').doc(this.serverCode);
        const doc = await serverRef.get();
        const players = doc.data().players.map(p => p.id === this.userId ? { ...p, ready } : p);
        await serverRef.update({ players });
    },
    
    async startGame() {
        if (!this.serverCode) return false;
        const serverRef = this.db.collection('servers').doc(this.serverCode);
        const doc = await serverRef.get();
        const server = doc.data();
        if (server.hostId !== this.userId) return false;
        const gameState = { startedAt: firebase.firestore.FieldValue.serverTimestamp(), players: {} };
        server.players.forEach((player, i) => {
            gameState.players[player.id] = {
                dollars: CONFIG.STARTING_DOLLARS,
                resources: { oil: 0, gold: 0, wheat: 0, iron: 0, copper: 0, uranium: 0 },
                startAngle: (i / server.players.length) * Math.PI * 2 - Math.PI / 2,
                alive: true
            };
        });
        await serverRef.update({ status: 'playing', gameState });
        return true;
    },
    
    async leaveServer() {
        if (!this.serverCode) return;
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];
        const serverRef = this.db.collection('servers').doc(this.serverCode);
        const doc = await serverRef.get();
        if (doc.exists) {
            const server = doc.data();
            const players = server.players.filter(p => p.id !== this.userId);
            if (players.length === 0) await serverRef.delete();
            else await serverRef.update({ players, hostId: server.hostId === this.userId ? players[0].id : server.hostId });
        }
        this.serverCode = null;
    }
};

window.FirebaseModule = FirebaseModule;
