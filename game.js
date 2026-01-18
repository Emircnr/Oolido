/* ============================================
   TACTICAL COMMAND - MAIN GAME CONTROLLER
   Multiplayer support, auto-save, performance
   ============================================ */

const GameState = {
    isRunning: false,
    isPaused: false,
    isMultiplayer: false,
    serverCode: null,
    multiplayerState: null,
    
    units: [],
    buildings: [],
    
    selectedUnits: [],
    selectedBuilding: null,
    selectedResourceBuilding: null,
    
    buildMode: null,
    selectionBox: null,
    controlGroups: {},
    
    mouse: { x: 0, y: 0, worldX: 0, worldY: 0 },
    
    lastSave: 0
};

const Game = {
    canvas: null,
    camera: { x: 0, y: 0, zoom: 0.08 },
    lastTime: 0,
    frameCount: 0,
    fps: 0,
    fpsTime: 0,
    
    async init() {
        console.log('Initializing game...');
        
        // Get canvas
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            console.error('Canvas not found!');
            return;
        }
        
        // Initialize Firebase
        UI.showScreen('loadingScreen');
        UI.updateLoadingProgress(10, 'Firebase bağlanıyor...');
        
        const firebaseReady = await FirebaseModule.init();
        if (!firebaseReady) {
            UI.updateLoadingProgress(100, 'Offline mod...');
        } else {
            UI.updateLoadingProgress(30, 'Bağlantı başarılı!');
        }
        
        // Initialize systems
        UI.updateLoadingProgress(50, 'Sistemler başlatılıyor...');
        
        Renderer.init(this.canvas, document.getElementById('minimap'));
        InputSystem.init(this.canvas);
        CombatSystem.init();
        
        UI.updateLoadingProgress(80, 'Menü hazırlanıyor...');
        
        // Check for saved game
        const savedGame = this.loadSavedGame();
        if (savedGame) {
            UI.updateLoadingProgress(100, 'Oyun yüklendi!');
            setTimeout(() => {
                if (confirm('Kaydedilmiş oyun bulundu. Devam etmek ister misiniz?')) {
                    this.restoreGame(savedGame);
                } else {
                    UI.showScreen('menuScreen');
                    Multiplayer.init();
                }
            }, 500);
        } else {
            UI.updateLoadingProgress(100, 'Hazır!');
            setTimeout(() => {
                UI.showScreen('menuScreen');
                Multiplayer.init();
            }, 500);
        }
        
        // Window resize
        window.addEventListener('resize', () => {
            Renderer.resize();
        });
        
        console.log('Game initialized');
    },
    
    // Start single player game
    startSinglePlayer(mapSize = 512) {
        GameState.isMultiplayer = false;
        GameState.serverCode = null;
        
        this.initializeGame(mapSize);
        
        // Set player colors for single player
        const playerCountry = Multiplayer.selectedCountry || 'turkey';
        Renderer.setPlayerColors([
            { id: 'player', country: playerCountry },
            { id: 'enemy', country: 'russia' }
        ]);
        
        // Initialize AI
        AISystem.init('normal');
        
        // Create starting units
        const startPos = MapSystem.setStartingTerritories();
        this.createStartingUnits(startPos.player, 'player');
        this.createStartingUnits(startPos.enemy, 'enemy');
        
        // Start game loop
        this.startGameLoop();
    },
    
    // Start multiplayer game
    startMultiplayer(server, myState) {
        GameState.isMultiplayer = true;
        GameState.serverCode = server.code;
        GameState.multiplayerState = server.gameState;
        
        this.initializeGame(server.mapSize);
        
        // Set player colors
        Renderer.setPlayerColors(server.players);
        
        // Set starting territories for all players
        const positions = MapSystem.setStartingTerritories(server.players);
        
        // Create starting units for all players
        for (const player of server.players) {
            const tile = positions[player.id];
            if (tile) {
                this.createStartingUnits(tile, player.id);
            }
        }
        
        // Move camera to my position
        const myPos = positions[Multiplayer.playerId];
        if (myPos) {
            this.camera.x = myPos.centerX - this.canvas.width / this.camera.zoom / 2;
            this.camera.y = myPos.centerY - this.canvas.height / this.camera.zoom / 2;
        }
        
        // Subscribe to game updates
        this.subscribeToGameUpdates();
        
        this.startGameLoop();
    },
    
    initializeGame(mapSize) {
        // Reset state
        GameState.units = [];
        GameState.buildings = [];
        GameState.selectedUnits = [];
        GameState.selectedBuilding = null;
        GameState.selectedResourceBuilding = null;
        GameState.buildMode = null;
        GameState.controlGroups = {};
        GameState.isRunning = true;
        GameState.isPaused = false;
        
        // Initialize systems
        Economy.init();
        ResourceSystem.init();
        MapSystem.generate(mapSize);
        
        // Initialize UI
        UI.init();
        UI.showScreen('gameScreen');
        
        // Center camera
        const bounds = MapSystem.getBounds();
        this.camera.x = bounds.width / 2 - this.canvas.width / this.camera.zoom / 2;
        this.camera.y = bounds.height / 2 - this.canvas.height / this.camera.zoom / 2;
    },
    
    createStartingUnits(tile, owner) {
        if (!tile) return;
        
        // Create headquarters
        const hqX = tile.centerX - 150;
        const hqY = tile.centerY - 150;
        const hq = EntitySystem.createBuilding('headquarters', hqX, hqY, owner);
        GameState.buildings.push(hq);
        
        // Create barracks
        const barracksX = hqX + 400;
        const barracksY = hqY;
        const barracks = EntitySystem.createBuilding('barracks', barracksX, barracksY, owner);
        GameState.buildings.push(barracks);
        
        // Create starting units
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const dist = 350;
            const unitX = tile.centerX + Math.cos(angle) * dist;
            const unitY = tile.centerY + Math.sin(angle) * dist;
            
            const unit = EntitySystem.createUnit('rifleman', unitX, unitY, owner);
            GameState.units.push(unit);
        }
    },
    
    startGameLoop() {
        this.lastTime = performance.now();
        this.fpsTime = this.lastTime;
        this.frameCount = 0;
        
        const gameLoop = (currentTime) => {
            if (!GameState.isRunning) return;
            
            // Calculate delta time (capped to prevent huge jumps)
            let dt = (currentTime - this.lastTime) / 1000;
            dt = Math.min(dt, 0.1); // Cap at 100ms
            this.lastTime = currentTime;
            
            // FPS counter
            this.frameCount++;
            if (currentTime - this.fpsTime >= 1000) {
                this.fps = this.frameCount;
                this.frameCount = 0;
                this.fpsTime = currentTime;
            }
            
            if (!GameState.isPaused) {
                this.update(dt);
            }
            
            this.render();
            
            requestAnimationFrame(gameLoop);
        };
        
        requestAnimationFrame(gameLoop);
    },
    
    update(dt) {
        // Input
        InputSystem.update(dt);
        
        // Economy & Resources
        Economy.update(dt);
        ResourceSystem.update(dt);
        
        // Map capture
        for (const tile of MapSystem.tiles) {
            MapSystem.updateCapture(tile, dt, CONFIG.CAPTURE_TIME);
        }
        
        // Buildings
        for (const building of GameState.buildings) {
            EntitySystem.updateBuilding(building, dt);
        }
        
        // Units (throttle if too many)
        const maxUpdate = Math.min(GameState.units.length, 1000);
        for (let i = 0; i < maxUpdate; i++) {
            EntitySystem.updateUnit(GameState.units[i], dt);
        }
        
        // Combat effects
        CombatSystem.update(dt);
        
        // AI (single player)
        if (!GameState.isMultiplayer) {
            AISystem.update(dt);
        }
        
        // Remove dead entities
        EntitySystem.removeDeadEntities();
        
        // Auto-save
        GameState.lastSave += dt;
        if (GameState.lastSave >= CONFIG.AUTO_SAVE_INTERVAL) {
            this.autoSave();
            GameState.lastSave = 0;
        }
        
        // Update UI
        UI.updateGameUI();
    },
    
    render() {
        InputSystem.updateMouseWorld(this.camera);
        Renderer.render(this.camera);
        
        // FPS display
        const ctx = Renderer.ctx;
        ctx.fillStyle = '#333';
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`FPS: ${this.fps} | Units: ${GameState.units.length}`, 10, 20);
    },
    
    autoSave() {
        if (GameState.isMultiplayer) {
            Multiplayer.syncGameState();
        } else {
            this.saveGame();
        }
    },
    
    saveGame() {
        const saveData = {
            timestamp: Date.now(),
            camera: this.camera,
            economy: {
                dollars: Economy.dollars,
                resources: Economy.resources,
                market: Economy.market
            },
            map: {
                tiles: MapSystem.tiles.map(t => ({
                    id: t.id,
                    owner: t.owner
                })),
                resourceBuildings: MapSystem.resourceBuildings
            },
            units: GameState.units.map(u => ({
                id: u.id, type: u.type, x: u.x, y: u.y,
                owner: u.owner, hp: u.hp, maxHp: u.maxHp
            })),
            buildings: GameState.buildings.map(b => ({
                id: b.id, type: b.type, x: b.x, y: b.y,
                owner: b.owner, hp: b.hp, maxHp: b.maxHp,
                productionQueue: b.productionQueue,
                productionProgress: b.productionProgress
            })),
            ai: {
                dollars: AISystem.dollars
            }
        };
        
        try {
            localStorage.setItem('tacticalCommand_save', JSON.stringify(saveData));
            console.log('Game saved');
        } catch (e) {
            console.error('Save failed:', e);
        }
    },
    
    loadSavedGame() {
        try {
            const data = localStorage.getItem('tacticalCommand_save');
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('Load failed:', e);
        }
        return null;
    },
    
    restoreGame(saveData) {
        GameState.isMultiplayer = false;
        GameState.isRunning = true;
        
        // Initialize systems
        Economy.init();
        ResourceSystem.init();
        MapSystem.generate(512);
        CombatSystem.init();
        UI.init();
        
        // Restore economy
        Economy.dollars = saveData.economy.dollars;
        Economy.resources = saveData.economy.resources;
        Economy.market = saveData.economy.market;
        
        // Restore map
        for (const tileData of saveData.map.tiles) {
            const tile = MapSystem.getTileById(tileData.id);
            if (tile) {
                tile.owner = tileData.owner;
            }
        }
        
        MapSystem.resourceBuildings = saveData.map.resourceBuildings;
        
        // Restore entities
        GameState.units = saveData.units.map(u => ({
            ...EntitySystem.createUnit(u.type, u.x, u.y, u.owner),
            id: u.id, hp: u.hp, maxHp: u.maxHp
        }));
        
        GameState.buildings = saveData.buildings.map(b => ({
            ...EntitySystem.createBuilding(b.type, b.x, b.y, b.owner),
            id: b.id, hp: b.hp, maxHp: b.maxHp,
            productionQueue: b.productionQueue || [],
            productionProgress: b.productionProgress || 0
        }));
        
        // Restore AI
        AISystem.init('normal');
        AISystem.dollars = saveData.ai.dollars;
        
        // Restore camera
        this.camera = saveData.camera;
        
        // Set colors
        Renderer.setPlayerColors([
            { id: 'player', country: 'turkey' },
            { id: 'enemy', country: 'russia' }
        ]);
        
        UI.showScreen('gameScreen');
        this.startGameLoop();
        
        UI.notify('Oyun yüklendi!', 'success');
    },
    
    subscribeToGameUpdates() {
        if (!GameState.isMultiplayer) return;
        
        FirebaseModule.subscribeToServer(GameState.serverCode, (server) => {
            if (server.status === 'ended') {
                this.endGame(false);
            }
            
            // Sync other players' state
            // ... (simplified for this version)
        });
    },
    
    endGame(victory) {
        GameState.isRunning = false;
        
        const message = victory ? '🎉 ZAFER! Düşmanı yendiniz!' : '💀 YENİLDİNİZ!';
        
        setTimeout(() => {
            alert(message);
            localStorage.removeItem('tacticalCommand_save');
            location.reload();
        }, 100);
    },
    
    pauseGame() {
        GameState.isPaused = !GameState.isPaused;
        UI.notify(GameState.isPaused ? 'Oyun duraklatıldı' : 'Oyun devam ediyor', 'info');
    }
};

// Start when DOM loaded
document.addEventListener('DOMContentLoaded', () => {
    Game.init();
});

if (typeof window !== 'undefined') {
    window.GameState = GameState;
    window.Game = Game;
}
