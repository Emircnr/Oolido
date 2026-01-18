var GameState = {
    isRunning: false,
    isPaused: false,
    isMultiplayer: false,
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

var Game = {
    canvas: null,
    camera: { x: 0, y: 0, zoom: 0.08 },
    lastTime: 0,
    frameCount: 0,
    fps: 0,
    fpsTime: 0,
    
    init: function() {
        console.log('Initializing game...');
        var self = this;
        
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) { console.error('Canvas not found!'); return; }
        
        UI.showScreen('loadingScreen');
        UI.updateLoadingProgress(10, 'Firebase bağlanıyor...');
        
        FirebaseModule.init().then(function(ready) {
            if (!ready) {
                UI.updateLoadingProgress(100, 'Offline mod...');
            } else {
                UI.updateLoadingProgress(30, 'Bağlantı başarılı!');
            }
            
            UI.updateLoadingProgress(50, 'Sistemler başlatılıyor...');
            Renderer.init(self.canvas, document.getElementById('minimap'));
            InputSystem.init(self.canvas);
            CombatSystem.init();
            
            UI.updateLoadingProgress(100, 'Hazır!');
            setTimeout(function() {
                UI.showScreen('menuScreen');
                Multiplayer.init();
            }, 500);
            
            console.log('Game initialized');
        });
        
        window.addEventListener('resize', function() { Renderer.resize(); });
    },
    
    startSinglePlayer: function(mapSize) {
        GameState.isMultiplayer = false;
        this.initializeGame(mapSize);
        
        var playerCountry = Multiplayer.selectedCountry || 'turkey';
        Renderer.setPlayerColors([
            { id: 'player', country: playerCountry },
            { id: 'enemy', country: 'russia' }
        ]);
        
        AISystem.init();
        var startPos = MapSystem.setStartingTerritories();
        this.createStartingUnits(startPos.player, 'player');
        this.createStartingUnits(startPos.enemy, 'enemy');
        this.startGameLoop();
    },
    
    startMultiplayer: function(server, myPlayer) {
        GameState.isMultiplayer = true;
        this.initializeGame(512);
        
        Renderer.setPlayerColors(server.players);
        var positions = MapSystem.setStartingTerritories(server.players);
        
        var self = this;
        server.players.forEach(function(player) {
            var tile = positions[player.id];
            if (tile) self.createStartingUnits(tile, player.id);
        });
        
        var myPos = positions[Multiplayer.playerId];
        if (myPos) {
            this.camera.x = myPos.centerX - this.canvas.width / this.camera.zoom / 2;
            this.camera.y = myPos.centerY - this.canvas.height / this.camera.zoom / 2;
        }
        
        this.startGameLoop();
    },
    
    initializeGame: function(mapSize) {
        GameState.units = [];
        GameState.buildings = [];
        GameState.selectedUnits = [];
        GameState.selectedBuilding = null;
        GameState.selectedResourceBuilding = null;
        GameState.buildMode = null;
        GameState.controlGroups = {};
        GameState.isRunning = true;
        GameState.isPaused = false;
        
        Economy.init();
        ResourceSystem.init();
        MapSystem.generate(mapSize);
        UI.init();
        UI.showScreen('gameScreen');
        
        var bounds = MapSystem.getBounds();
        this.camera.x = bounds.width / 2 - this.canvas.width / this.camera.zoom / 2;
        this.camera.y = bounds.height / 2 - this.canvas.height / this.camera.zoom / 2;
    },
    
    createStartingUnits: function(tile, owner) {
        if (!tile) return;
        
        var hqX = tile.centerX - 150;
        var hqY = tile.centerY - 150;
        var hq = EntitySystem.createBuilding('headquarters', hqX, hqY, owner);
        GameState.buildings.push(hq);
        
        var barracks = EntitySystem.createBuilding('barracks', hqX + 400, hqY, owner);
        GameState.buildings.push(barracks);
        
        for (var i = 0; i < 5; i++) {
            var angle = (i / 5) * Math.PI * 2;
            var dist = 350;
            var unit = EntitySystem.createUnit('rifleman', tile.centerX + Math.cos(angle) * dist, tile.centerY + Math.sin(angle) * dist, owner);
            GameState.units.push(unit);
        }
    },
    
    startGameLoop: function() {
        this.lastTime = performance.now();
        this.fpsTime = this.lastTime;
        this.frameCount = 0;
        var self = this;
        
        function gameLoop(currentTime) {
            if (!GameState.isRunning) return;
            
            var dt = (currentTime - self.lastTime) / 1000;
            dt = Math.min(dt, 0.1);
            self.lastTime = currentTime;
            
            self.frameCount++;
            if (currentTime - self.fpsTime >= 1000) {
                self.fps = self.frameCount;
                self.frameCount = 0;
                self.fpsTime = currentTime;
            }
            
            if (!GameState.isPaused) self.update(dt);
            self.render();
            
            requestAnimationFrame(gameLoop);
        }
        
        requestAnimationFrame(gameLoop);
    },
    
    update: function(dt) {
        InputSystem.update(dt);
        Economy.update(dt);
        ResourceSystem.update(dt);
        
        MapSystem.tiles.forEach(function(tile) {
            MapSystem.updateCapture(tile, dt, CONFIG.CAPTURE_TIME);
        });
        
        GameState.buildings.forEach(function(building) {
            EntitySystem.updateBuilding(building, dt);
        });
        
        var maxUpdate = Math.min(GameState.units.length, 1000);
        for (var i = 0; i < maxUpdate; i++) {
            EntitySystem.updateUnit(GameState.units[i], dt);
        }
        
        CombatSystem.update(dt);
        
        if (!GameState.isMultiplayer) AISystem.update(dt);
        
        EntitySystem.removeDeadEntities();
        UI.updateGameUI();
    },
    
    render: function() {
        InputSystem.updateMouseWorld(this.camera);
        Renderer.render(this.camera);
        
        var ctx = Renderer.ctx;
        ctx.fillStyle = '#333';
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('FPS: ' + this.fps + ' | Units: ' + GameState.units.length, 10, 20);
    }
};

document.addEventListener('DOMContentLoaded', function() {
    Game.init();
});

window.GameState = GameState;
window.Game = Game;
