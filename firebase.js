const FirebaseModule = {
    app: null,
    db: null,
    auth: null,
    userId: null,
    serverRef: null,
    unsubscribe: null,
    
    init: function() {
        var self = this;
        return new Promise(function(resolve) {
            try {
                var config = {
                    apiKey: "AIzaSyDemo1234567890",
                    authDomain: "tactical-command.firebaseapp.com",
                    projectId: "tactical-command",
                    storageBucket: "tactical-command.appspot.com",
                    messagingSenderId: "123456789",
                    appId: "1:123456789:web:abcdef"
                };
                
                if (typeof firebase !== 'undefined') {
                    if (!firebase.apps.length) {
                        self.app = firebase.initializeApp(config);
                    } else {
                        self.app = firebase.apps[0];
                    }
                    
                    self.db = firebase.firestore();
                    self.auth = firebase.auth();
                    
                    self.auth.signInAnonymously().then(function(result) {
                        self.userId = result.user.uid;
                        resolve(true);
                    }).catch(function(err) {
                        console.log('Auth error, using offline mode');
                        self.userId = 'offline_' + Math.random().toString(36).substr(2, 9);
                        resolve(false);
                    });
                } else {
                    console.log('Firebase not loaded, using offline mode');
                    self.userId = 'offline_' + Math.random().toString(36).substr(2, 9);
                    resolve(false);
                }
            } catch (e) {
                console.log('Firebase init error, using offline mode');
                self.userId = 'offline_' + Math.random().toString(36).substr(2, 9);
                resolve(false);
            }
        });
    },
    
    generateServerCode: function() {
        var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        var code = '';
        for (var i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    },
    
    createServer: function(playerName, country) {
        var self = this;
        var code = this.generateServerCode();
        
        return new Promise(function(resolve, reject) {
            if (!self.db) {
                reject(new Error('Veritabanı bağlantısı yok'));
                return;
            }
            
            var serverData = {
                code: code,
                hostId: self.userId,
                status: 'waiting',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                maxPlayers: 8,
                players: [{
                    id: self.userId,
                    name: playerName,
                    country: country,
                    ready: true
                }]
            };
            
            self.db.collection('servers').doc(code).set(serverData).then(function() {
                resolve(code);
            }).catch(function(err) {
                reject(err);
            });
        });
    },
    
    joinServer: function(code, playerName, country) {
        var self = this;
        
        return new Promise(function(resolve, reject) {
            if (!self.db) {
                reject(new Error('Veritabanı bağlantısı yok'));
                return;
            }
            
            var ref = self.db.collection('servers').doc(code);
            ref.get().then(function(doc) {
                if (!doc.exists) {
                    reject(new Error('Server bulunamadı'));
                    return;
                }
                
                var data = doc.data();
                if (data.status !== 'waiting') {
                    reject(new Error('Oyun başlamış'));
                    return;
                }
                
                if (data.players.length >= data.maxPlayers) {
                    reject(new Error('Server dolu'));
                    return;
                }
                
                var players = data.players;
                players.push({
                    id: self.userId,
                    name: playerName,
                    country: country,
                    ready: false
                });
                
                ref.update({ players: players }).then(function() {
                    resolve();
                }).catch(reject);
            }).catch(reject);
        });
    },
    
    subscribeToServer: function(code, callback) {
        var self = this;
        if (!this.db) return;
        
        if (this.unsubscribe) this.unsubscribe();
        
        this.serverRef = this.db.collection('servers').doc(code);
        this.unsubscribe = this.serverRef.onSnapshot(function(doc) {
            if (doc.exists) {
                callback(doc.data());
            }
        });
    },
    
    setReady: function(ready) {
        var self = this;
        if (!this.serverRef) return;
        
        this.serverRef.get().then(function(doc) {
            if (!doc.exists) return;
            var data = doc.data();
            var players = data.players.map(function(p) {
                if (p.id === self.userId) p.ready = ready;
                return p;
            });
            self.serverRef.update({ players: players });
        });
    },
    
    startGame: function() {
        if (!this.serverRef) return;
        this.serverRef.update({ status: 'playing' });
    },
    
    leaveServer: function() {
        var self = this;
        return new Promise(function(resolve) {
            if (!self.serverRef) {
                resolve();
                return;
            }
            
            self.serverRef.get().then(function(doc) {
                if (!doc.exists) {
                    resolve();
                    return;
                }
                
                var data = doc.data();
                var players = data.players.filter(function(p) {
                    return p.id !== self.userId;
                });
                
                if (players.length === 0 || data.hostId === self.userId) {
                    self.serverRef.delete().then(resolve);
                } else {
                    self.serverRef.update({ players: players }).then(resolve);
                }
            }).catch(resolve);
            
            if (self.unsubscribe) self.unsubscribe();
            self.serverRef = null;
        });
    },
    
    syncGameState: function(state) {
        if (!this.serverRef) return;
        this.serverRef.update({ gameState: state });
    },
    
    isHost: function(data) {
        return data && data.hostId === this.userId;
    }
};

window.FirebaseModule = FirebaseModule;
