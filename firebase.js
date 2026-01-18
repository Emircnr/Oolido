/* ============================================
   TACTICAL COMMAND - FIREBASE MODULE
   Firestore for multiplayer & persistence
   ============================================ */

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCbolraCD1nrOqcIE5GHPAaX9SRhHQXYIY",
    authDomain: "videoanlyze.firebaseapp.com",
    projectId: "videoanlyze",
    storageBucket: "videoanlyze.firebasestorage.app",
    messagingSenderId: "1053069335615",
    appId: "1:1053069335615:web:5dbf8f2345a5bf18b1ac8a",
    measurementId: "G-TLEWYXX05H"
};

const FirebaseModule = {
    app: null,
    db: null,
    auth: null,
    userId: null,
    currentUser: null,
    serverCode: null,
    unsubscribers: [],
    
    async init() {
        if (typeof firebase === 'undefined') {
            console.error('Firebase SDK not loaded');
            return false;
        }
        
        try {
            if (!firebase.apps.length) {
                this.app = firebase.initializeApp(FIREBASE_CONFIG);
            } else {
                this.app = firebase.apps[0];
            }
            
            this.db = firebase.firestore();
            this.auth = firebase.auth();
            
            // Anonymous auth
            const cred = await this.auth.signInAnonymously();
            this.userId = cred.user.uid;
            this.currentUser = cred.user;
            
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
        for (let i = 0; i < 6; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    },
    
    // Create new server
    async createServer(playerName, countryId, maxPlayers = 8) {
        const code = this.generateServerCode();
        const serverRef = this.db.collection('servers').doc(code);
        
        const serverData = {
            code,
            hostId: this.userId,
            status: 'waiting',
            maxPlayers,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            players: [{
                id: this.userId,
                name: playerName,
                country: countryId,
                ready: true,
                connected: true
            }],
            market: this.initMarket(),
            chat: []
        };
        
        await serverRef.set(serverData);
        this.serverCode = code;
        return code;
    },
    
    // Join existing server
    async joinServer(code, playerName, countryId) {
        const serverRef = this.db.collection('servers').doc(code);
        const doc = await serverRef.get();
        
        if (!doc.exists) {
            throw new Error('Server bulunamadı');
        }
        
        const server = doc.data();
        
        if (server.status !== 'waiting') {
            throw new Error('Oyun zaten başlamış');
        }
        
        if (server.players.length >= server.maxPlayers) {
            throw new Error('Server dolu');
        }
        
        const countryTaken = server.players.some(p => p.country === countryId);
        if (countryTaken) {
            throw new Error('Bu ülke seçilmiş');
        }
        
        await serverRef.update({
            players: firebase.firestore.FieldValue.arrayUnion({
                id: this.userId,
                name: playerName,
                country: countryId,
                ready: false,
                connected: true
            })
        });
        
        this.serverCode = code;
        return server;
    },
    
    // Subscribe to server updates
    subscribeToServer(code, callback) {
        const unsub = this.db.collection('servers').doc(code)
            .onSnapshot(doc => {
                if (doc.exists) callback(doc.data());
            });
        this.unsubscribers.push(unsub);
        return unsub;
    },
    
    // Subscribe to chat
    subscribeToChat(code, callback) {
        const unsub = this.db.collection('servers').doc(code)
            .collection('messages')
            .orderBy('timestamp', 'asc')
            .limitToLast(100)
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
    
    // Send chat message
    async sendMessage(message, isPrivate = false, targetId = null, targetName = null) {
        if (!this.serverCode) return;
        
        await this.db.collection('servers').doc(this.serverCode)
            .collection('messages').add({
                senderId: this.userId,
                senderName: Multiplayer.playerName,
                message,
                private: isPrivate,
                targetId,
                targetName,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
    },
    
    // Set player ready
    async setReady(ready) {
        if (!this.serverCode) return;
        
        const serverRef = this.db.collection('servers').doc(this.serverCode);
        const doc = await serverRef.get();
        const server = doc.data();
        
        const players = server.players.map(p => {
            if (p.id === this.userId) return { ...p, ready };
            return p;
        });
        
        await serverRef.update({ players });
    },
    
    // Start game (host only)
    async startGame() {
        if (!this.serverCode) return false;
        
        const serverRef = this.db.collection('servers').doc(this.serverCode);
        const doc = await serverRef.get();
        const server = doc.data();
        
        if (server.hostId !== this.userId) return false;
        
        // Initialize game state
        const gameState = {
            startedAt: firebase.firestore.FieldValue.serverTimestamp(),
            players: {},
            market: this.initMarket()
        };
        
        // Set starting positions
        const numPlayers = server.players.length;
        for (let i = 0; i < numPlayers; i++) {
            const player = server.players[i];
            const angle = (i / numPlayers) * Math.PI * 2 - Math.PI / 2;
            
            gameState.players[player.id] = {
                dollars: CONFIG.STARTING_DOLLARS,
                resources: { oil: 0, gold: 0, wheat: 0, iron: 0, copper: 0, uranium: 0 },
                startAngle: angle,
                alive: true
            };
        }
        
        await serverRef.update({
            status: 'playing',
            gameState
        });
        
        return true;
    },
    
    // Save game state
    async saveGameState(state) {
        if (!this.serverCode) return;
        
        await this.db.collection('servers').doc(this.serverCode).update({
            gameState: state,
            lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
        });
    },
    
    // Update market prices
    async updateMarket(market) {
        if (!this.serverCode) return;
        
        await this.db.collection('servers').doc(this.serverCode).update({
            'gameState.market': market
        });
    },
    
    // Send resources to player
    async sendResources(targetId, resourceType, amount) {
        if (!this.serverCode) return { success: false };
        
        const serverRef = this.db.collection('servers').doc(this.serverCode);
        
        return this.db.runTransaction(async (transaction) => {
            const doc = await transaction.get(serverRef);
            const gameState = doc.data().gameState;
            
            const sender = gameState.players[this.userId];
            const receiver = gameState.players[targetId];
            
            if (!sender || !receiver) return { success: false, error: 'Oyuncu bulunamadı' };
            if ((sender.resources[resourceType] || 0) < amount) return { success: false, error: 'Yetersiz kaynak' };
            
            sender.resources[resourceType] -= amount;
            receiver.resources[resourceType] = (receiver.resources[resourceType] || 0) + amount;
            
            transaction.update(serverRef, { gameState });
            return { success: true };
        });
    },
    
    // Leave server
    async leaveServer() {
        if (!this.serverCode) return;
        
        // Unsubscribe all listeners
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];
        
        const serverRef = this.db.collection('servers').doc(this.serverCode);
        const doc = await serverRef.get();
        
        if (doc.exists) {
            const server = doc.data();
            const players = server.players.filter(p => p.id !== this.userId);
            
            if (players.length === 0) {
                await serverRef.delete();
            } else {
                const newHostId = server.hostId === this.userId ? players[0].id : server.hostId;
                await serverRef.update({ players, hostId: newHostId });
            }
        }
        
        this.serverCode = null;
    },
    
    initMarket() {
        const market = {};
        for (const [key, res] of Object.entries(CONFIG.RESOURCES)) {
            market[key] = {
                price: res.basePrice,
                change: 0,
                changePercent: 0,
                volume: 0,
                high: res.basePrice,
                low: res.basePrice,
                history: [res.basePrice]
            };
        }
        return market;
    },
    
    // Single player save/load
    async saveLocalGame(gameData) {
        try {
            localStorage.setItem('tacticalCommand_save', JSON.stringify({
                ...gameData,
                savedAt: Date.now()
            }));
            return true;
        } catch (e) {
            console.error('Save error:', e);
            return false;
        }
    },
    
    loadLocalGame() {
        try {
            const data = localStorage.getItem('tacticalCommand_save');
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Load error:', e);
            return null;
        }
    },
    
    clearLocalGame() {
        localStorage.removeItem('tacticalCommand_save');
    }
};

if (typeof window !== 'undefined') window.FirebaseModule = FirebaseModule;
