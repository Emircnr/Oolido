const Game = {
    canvas: null,
    minimapCanvas: null,
    state: null,
    running: false,
    lastTime: 0,
    saveInterval: null,
    currentServerCode: null,
    isMultiplayer: false,
    
    init: function() {
        var self = this;
        
        // Setup canvases
        this.canvas = document.getElementById('game-canvas');
        this.minimapCanvas = document.getElementById('minimap-canvas');
        
        this.resizeCanvas();
        window.addEventListener('resize', function() {
            self.resizeCanvas();
        });
        
        // Initialize modules
        Renderer.init(this.canvas, this.minimapCanvas);
        UI.init();
        SoundManager.init();
        
        // Setup UI events
        this.setupUIEvents();
        
        // Initialize Firebase
        FirebaseModule.init().then(function(connected) {
            if (connected) {
                console.log('Firebase connected');
            } else {
                console.log('Offline mode');
            }
        });
    },
    
    resizeCanvas: function() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },
    
    setupUIEvents: function() {
        var self = this;
        
        // Single player
        document.getElementById('btn-single').addEventListener('click', function() {
            self.startSinglePlayer();
        });
        
        // Create server
        document.getElementById('btn-create').addEventListener('click', function() {
            self.createServer();
        });
        
        // Join server
        document.getElementById('btn-join').addEventListener('click', function() {
            self.joinServer();
        });
        
        // Ready button
        document.getElementById('btn-ready').addEventListener('click', function() {
            FirebaseModule.setReady(true);
        });
        
        // Start button
        document.getElementById('btn-start').addEventListener('click', function() {
            FirebaseModule.startGame();
        });
        
        // Leave button
        document.getElementById('btn-leave').addEventListener('click', function() {
            FirebaseModule.leaveServer().then(function() {
                UI.showServerPanel();
                self.currentServerCode = null;
            });
        });
        
        // Build panel items
        document.getElementById('build-panel').addEventListener('click', function(e) {
            var item = e.target.closest('.build-item');
            if (item) {
                var type = item.dataset.type;
                var category = item.dataset.category;
                self.handleBuild(type, category);
            }
        });
        
        // Market buy buttons
        document.getElementById('market-panel').addEventListener('click', function(e) {
            if (e.target.classList.contains('buy-btn')) {
                var item = e.target.dataset.item;
                self.handleMarketBuy(item);
            }
        });
        
        // Exchange sell buttons
        document.getElementById('exchange-panel').addEventListener('click', function(e) {
            if (e.target.classList.contains('sell-btn')) {
                var resource = e.target.dataset.resource;
                self.handleExchangeSell(resource);
            }
        });
        
        // Unit action buttons
        document.getElementById('btn-attack').addEventListener('click', function() {
            // Toggle attack mode
            UI.showMessage('Saldırı modu: Hedef seçin', 'info');
        });
        
        document.getElementById('btn-stop').addEventListener('click', function() {
            var selected = Input.getSelectedUnits();
            selected.forEach(function(u) {
                u.target = null;
                u.moveTarget = null;
            });
        });
        
        // Sound toggle
        var soundBtn = document.createElement('button');
        soundBtn.id = 'sound-toggle';
        soundBtn.textContent = '🔊';
        soundBtn.addEventListener('click', function() {
            var enabled = SoundManager.toggle();
            this.textContent = enabled ? '🔊' : '🔇';
        });
        document.body.appendChild(soundBtn);
    },
    
    startSinglePlayer: function() {
        var playerName = document.getElementById('player-name').value || 'Oyuncu';
        var country = document.getElementById('country-select').value;
        
        this.isMultiplayer = false;
        this.initializeGame([
            { name: playerName, country: country, isAI: false },
            { name: 'Düşman 1', country: 'russia', isAI: true },
            { name: 'Düşman 2', country: 'china', isAI: true }
        ], 0);
        
        UI.hideServerPanel();
        this.start();
    },
    
    createServer: function() {
        var self = this;
        var playerName = document.getElementById('player-name').value || 'Oyuncu';
        var country = document.getElementById('country-select').value;
        
        if (!playerName) {
            UI.showMessage('Lütfen bir isim girin', 'error');
            return;
        }
        
        FirebaseModule.createServer(playerName, country).then(function(code) {
            self.currentServerCode = code;
            UI.showLobby(code);
            
            FirebaseModule.subscribeToServer(code, function(data) {
                self.handleServerUpdate(data);
            });
            
            UI.showMessage('Server oluşturuldu: ' + code, 'success');
        }).catch(function(err) {
            UI.showMessage('Hata: ' + err.message, 'error');
        });
    },
    
    joinServer: function() {
        var self = this;
        var code = document.getElementById('server-code').value.toUpperCase();
        var playerName = document.getElementById('player-name').value || 'Oyuncu';
        var country = document.getElementById('country-select').value;
        
        if (!code || code.length !== 6) {
            UI.showMessage('Geçerli bir kod girin', 'error');
            return;
        }
        
        FirebaseModule.joinServer(code, playerName, country).then(function() {
            self.currentServerCode = code;
            UI.showLobby(code);
            
            FirebaseModule.subscribeToServer(code, function(data) {
                self.handleServerUpdate(data);
            });
            
            UI.showMessage('Servera katıldınız', 'success');
        }).catch(function(err) {
            UI.showMessage('Hata: ' + err.message, 'error');
        });
    },
    
    handleServerUpdate: function(data) {
        var isHost = FirebaseModule.isHost(data);
        UI.updateLobby(data, isHost);
        
        if (data.status === 'playing' && !this.running) {
            // Game starting
            var myIndex = data.players.findIndex(function(p) {
                return p.id === FirebaseModule.userId;
            });
            
            var players = data.players.map(function(p) {
                return {
                    name: p.name,
                    country: p.country,
                    isAI: false
                };
            });
            
            this.isMultiplayer = true;
            this.initializeGame(players, myIndex);
            UI.hideServerPanel();
            this.start();
        }
    },
    
    initializeGame: function(players, currentPlayerIndex) {
        // Generate map
        var map = MapSystem.generate();
        
        // Create game state
        this.state = {
            map: map,
            players: players,
            currentPlayer: currentPlayerIndex,
            units: [],
            buildings: [],
            projectiles: [],
            explosions: [],
            economies: [],
            selection: null
        };
        
        // Initialize economies for each player
        var self = this;
        players.forEach(function(player, index) {
            var economy = Object.create(Economy);
            economy.init();
            self.state.economies.push(economy);
        });
        
        // Place starting positions
        this.placeStartingPositions(players);
        
        // Initialize input
        Input.init(this.canvas, this.state);
        
        // Initialize AI
        AI.init(this.state);
        
        // Start auto-save
        this.startAutoSave();
    },
    
    placeStartingPositions: function(players) {
        var positions = [
            { x: 2, y: 2 },
            { x: CONFIG.MAP_WIDTH - 3, y: CONFIG.MAP_HEIGHT - 3 },
            { x: 2, y: CONFIG.MAP_HEIGHT - 3 },
            { x: CONFIG.MAP_WIDTH - 3, y: 2 },
            { x: Math.floor(CONFIG.MAP_WIDTH / 2), y: 2 },
            { x: Math.floor(CONFIG.MAP_WIDTH / 2), y: CONFIG.MAP_HEIGHT - 3 },
            { x: 2, y: Math.floor(CONFIG.MAP_HEIGHT / 2) },
            { x: CONFIG.MAP_WIDTH - 3, y: Math.floor(CONFIG.MAP_HEIGHT / 2) }
        ];
        
        var self = this;
        players.forEach(function(player, index) {
            if (index >= positions.length) return;
            
            var pos = positions[index];
            var px = pos.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
            var py = pos.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
            
            // Claim starting tiles
            for (var dy = -1; dy <= 1; dy++) {
                for (var dx = -1; dx <= 1; dx++) {
                    var tx = pos.x + dx;
                    var ty = pos.y + dy;
                    if (tx >= 0 && tx < CONFIG.MAP_WIDTH && ty >= 0 && ty < CONFIG.MAP_HEIGHT) {
                        self.state.map.tiles[ty][tx].owner = index;
                    }
                }
            }
            
            // Place HQ
            var hq = Entities.createBuilding('headquarters', px, py, index);
            self.state.buildings.push(hq);
            
            // Place barracks
            var barracks = Entities.createBuilding('barracks', px + CONFIG.TILE_SIZE * 0.4, py, index);
            self.state.buildings.push(barracks);
            
            // Starting units
            for (var i = 0; i < 3; i++) {
                var unit = Entities.createUnit(
                    'infantry',
                    px + (Math.random() - 0.5) * CONFIG.TILE_SIZE * 0.3,
                    py + CONFIG.TILE_SIZE * 0.3 + i * CONFIG.TILE_SIZE * 0.05,
                    index
                );
                self.state.units.push(unit);
            }
        });
    },
    
    start: function() {
        this.running = true;
        this.lastTime = performance.now();
        this.gameLoop();
    },
    
    stop: function() {
        this.running = false;
        if (this.saveInterval) {
            clearInterval(this.saveInterval);
        }
    },
    
    gameLoop: function() {
        if (!this.running) return;
        
        var self = this;
        var now = performance.now();
        var dt = (now - this.lastTime) / 1000;
        this.lastTime = now;
        
        // Cap delta time
        dt = Math.min(dt, 0.1);
        
        this.update(dt);
        this.render();
        
        requestAnimationFrame(function() {
            self.gameLoop();
        });
    },
    
    update: function(dt) {
        // Update input
        Input.update(dt);
        
        // Update economy
        var currentEconomy = this.state.economies[this.state.currentPlayer];
        if (currentEconomy) {
            // Count buildings for production
            var buildings = this.state.buildings.filter(function(b) {
                return b.owner === this.state.currentPlayer;
            }, this);
            currentEconomy.update(dt, buildings);
            UI.updateResources(currentEconomy);
        }
        
        // Update units
        Entities.updateUnits(this.state, dt);
        
        // Update combat
        Combat.update(this.state, dt);
        
        // Update AI
        AI.update(this.state, currentEconomy, dt);
        
        // Update explosions
        this.updateExplosions(dt);
        
        // Update players panel
        if (UI.panels.players) {
            UI.updatePlayers(this.state.players, this.state.buildings, this.state.units, this.state.map.tiles);
        }
        
        // Check win condition
        this.checkWinCondition();
    },
    
    updateExplosions: function(dt) {
        for (var i = this.state.explosions.length - 1; i >= 0; i--) {
            var e = this.state.explosions[i];
            e.time += dt * 1000;
            if (e.time >= e.duration) {
                this.state.explosions.splice(i, 1);
            }
        }
    },
    
    render: function() {
        Renderer.render(this.state, Input.camera);
    },
    
    handleBuild: function(type, category) {
        var economy = this.state.economies[this.state.currentPlayer];
        if (!economy) return;
        
        if (category === 'building') {
            var config = CONFIG.BUILDINGS[type];
            if (!config) return;
            
            if (!economy.canAfford(config.cost)) {
                UI.showMessage('Yetersiz kaynak!', 'error');
                return;
            }
            
            // For now, place near HQ
            var hq = this.state.buildings.find(function(b) {
                return b.type === 'headquarters' && b.owner === this.state.currentPlayer;
            }, this);
            
            if (!hq) return;
            
            // Check tile ownership
            var tileX = Math.floor(hq.x / CONFIG.TILE_SIZE);
            var tileY = Math.floor(hq.y / CONFIG.TILE_SIZE);
            
            // Find a valid position
            var placed = false;
            for (var dy = -2; dy <= 2 && !placed; dy++) {
                for (var dx = -2; dx <= 2 && !placed; dx++) {
                    var tx = tileX + dx;
                    var ty = tileY + dy;
                    
                    if (tx < 0 || tx >= CONFIG.MAP_WIDTH || ty < 0 || ty >= CONFIG.MAP_HEIGHT) continue;
                    if (this.state.map.tiles[ty][tx].owner !== this.state.currentPlayer) continue;
                    
                    if (type === 'defenseTower') {
                        var towerCount = this.state.map.tiles[ty][tx].towerCount || 0;
                        if (towerCount >= CONFIG.MAX_TOWERS_PER_TILE) continue;
                    }
                    
                    var px = tx * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE * (0.3 + Math.random() * 0.4);
                    var py = ty * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE * (0.3 + Math.random() * 0.4);
                    
                    economy.spend(config.cost);
                    var building = Entities.createBuilding(type, px, py, this.state.currentPlayer);
                    this.state.buildings.push(building);
                    
                    if (type === 'defenseTower') {
                        this.state.map.tiles[ty][tx].towerCount = (this.state.map.tiles[ty][tx].towerCount || 0) + 1;
                    }
                    
                    SoundManager.play('build');
                    UI.showMessage(config.name + ' inşa edildi', 'success');
                    placed = true;
                }
            }
            
            if (!placed) {
                UI.showMessage('İnşa edilecek yer yok!', 'error');
            }
        } else if (category === 'unit') {
            var config = CONFIG.UNITS[type];
            if (!config) return;
            
            if (!economy.canAfford(config.cost)) {
                UI.showMessage('Yetersiz kaynak!', 'error');
                return;
            }
            
            // Find barracks
            var barracks = this.state.buildings.find(function(b) {
                return b.type === 'barracks' && b.owner === this.state.currentPlayer;
            }, this);
            
            if (!barracks) {
                UI.showMessage('Kışla gerekli!', 'error');
                return;
            }
            
            economy.spend(config.cost);
            var unit = Entities.createUnit(
                type,
                barracks.x + (Math.random() - 0.5) * CONFIG.TILE_SIZE * 0.2,
                barracks.y + CONFIG.TILE_SIZE * 0.1,
                this.state.currentPlayer
            );
            this.state.units.push(unit);
            
            SoundManager.play('build');
            UI.showMessage(config.name + ' eğitildi', 'success');
        }
    },
    
    handleMarketBuy: function(item) {
        var economy = this.state.economies[this.state.currentPlayer];
        if (!economy) return;
        
        if (item === 'ammo') {
            var amount = parseInt(document.getElementById('buy-ammo-amount').value) || 1;
            var cost = { wheat: amount * 3, oil: amount };
            
            if (!economy.canAfford(cost)) {
                UI.showMessage('Yetersiz kaynak!', 'error');
                return;
            }
            
            economy.spend(cost);
            economy.resources.ammo += amount;
            UI.showMessage(amount + ' mühimmat satın alındı', 'success');
        } else if (item === 'movement') {
            var amount = parseInt(document.getElementById('buy-movement-amount').value) || 1;
            var cost = { dollars: amount * 5, wheat: amount, oil: amount * 3 };
            
            if (!economy.canAfford(cost)) {
                UI.showMessage('Yetersiz kaynak!', 'error');
                return;
            }
            
            economy.spend(cost);
            economy.resources.movement += amount;
            UI.showMessage(amount + ' hareket puanı satın alındı', 'success');
        }
    },
    
    handleExchangeSell: function(resource) {
        var economy = this.state.economies[this.state.currentPlayer];
        if (!economy) return;
        
        var amount = parseInt(document.getElementById('sell-' + resource + '-amount').value) || 1;
        
        if (economy.resources[resource] < amount) {
            UI.showMessage('Yetersiz ' + resource + '!', 'error');
            return;
        }
        
        var rate = CONFIG.EXCHANGE_RATES[resource] || 1;
        var dollars = Math.floor(amount * rate * 0.8);
        
        economy.resources[resource] -= amount;
        economy.resources.dollars += dollars;
        
        UI.showMessage(amount + ' ' + resource + ' → ' + dollars + ' dolar', 'success');
    },
    
    checkWinCondition: function() {
        // Count HQs per player
        var hqCounts = {};
        this.state.buildings.forEach(function(b) {
            if (b.type === 'headquarters') {
                hqCounts[b.owner] = (hqCounts[b.owner] || 0) + 1;
            }
        });
        
        // Check if only one player has HQ
        var playersWithHQ = Object.keys(hqCounts).filter(function(p) {
            return hqCounts[p] > 0;
        });
        
        if (playersWithHQ.length === 1) {
            var winnerId = parseInt(playersWithHQ[0]);
            var winner = this.state.players[winnerId];
            if (winnerId === this.state.currentPlayer) {
                UI.showMessage('🏆 ZAFER! ' + winner.name + ' kazandı!', 'success');
            } else {
                UI.showMessage('💀 YENİLGİ! ' + winner.name + ' kazandı!', 'error');
            }
            this.stop();
        }
    },
    
    startAutoSave: function() {
        var self = this;
        this.saveInterval = setInterval(function() {
            self.saveGame();
        }, 30000);
    },
    
    saveGame: function() {
        var saveData = {
            map: MapSystem.save(this.state.map),
            players: this.state.players,
            currentPlayer: this.state.currentPlayer,
            units: this.state.units.map(function(u) {
                return {
                    type: u.type,
                    x: u.x,
                    y: u.y,
                    hp: u.hp,
                    owner: u.owner
                };
            }),
            buildings: this.state.buildings.map(function(b) {
                return {
                    type: b.type,
                    x: b.x,
                    y: b.y,
                    hp: b.hp,
                    level: b.level,
                    owner: b.owner
                };
            }),
            economies: this.state.economies.map(function(e) {
                return e.save();
            })
        };
        
        try {
            localStorage.setItem('tacticalCommand_save', JSON.stringify(saveData));
            console.log('Game saved');
        } catch (e) {
            console.log('Save failed:', e);
        }
    },
    
    loadGame: function() {
        try {
            var saveData = JSON.parse(localStorage.getItem('tacticalCommand_save'));
            if (!saveData) return false;
            
            // Restore state
            this.state = {
                map: MapSystem.load(saveData.map),
                players: saveData.players,
                currentPlayer: saveData.currentPlayer,
                units: saveData.units.map(function(u) {
                    var unit = Entities.createUnit(u.type, u.x, u.y, u.owner);
                    unit.hp = u.hp;
                    return unit;
                }),
                buildings: saveData.buildings.map(function(b) {
                    var building = Entities.createBuilding(b.type, b.x, b.y, b.owner);
                    building.hp = b.hp;
                    building.level = b.level || 1;
                    return building;
                }),
                projectiles: [],
                explosions: [],
                economies: saveData.economies.map(function(e) {
                    var economy = Object.create(Economy);
                    economy.load(e);
                    return economy;
                }),
                selection: null
            };
            
            return true;
        } catch (e) {
            console.log('Load failed:', e);
            return false;
        }
    }
};

// Start game when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    Game.init();
});

window.Game = Game;
