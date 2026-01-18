const MapSystem = {
    tiles: [],
    resourceBuildings: [],
    width: 0,
    height: 0,
    
    generate: function(mapSize) {
        this.tiles = [];
        this.resourceBuildings = [];
        mapSize = mapSize || 512;
        
        if (mapSize <= 256) {
            this.width = 8;
            this.height = 8;
        } else if (mapSize <= 512) {
            this.width = 16;
            this.height = 8;
        } else {
            this.width = 32;
            this.height = 16;
        }
        
        var tileSize = CONFIG.TILE_SIZE;
        for (var y = 0; y < this.height; y++) {
            for (var x = 0; x < this.width; x++) {
                this.tiles.push({
                    id: 'tile_' + x + '_' + y,
                    x: x * tileSize,
                    y: y * tileSize,
                    gridX: x,
                    gridY: y,
                    centerX: x * tileSize + tileSize / 2,
                    centerY: y * tileSize + tileSize / 2,
                    owner: null,
                    captureProgress: 0,
                    capturingTeam: null
                });
            }
        }
        
        this.generateResourceBuildings();
    },
    
    generateResourceBuildings: function() {
        var self = this;
        var resourceTypes = [
            { type: 'oilWell', resource: 'oil', count: 20 },
            { type: 'goldMine', resource: 'gold', count: 15 },
            { type: 'wheatFarm', resource: 'wheat', count: 25 },
            { type: 'ironMine', resource: 'iron', count: 20 },
            { type: 'copperMine', resource: 'copper', count: 18 },
            { type: 'uraniumMine', resource: 'uranium', count: 8 }
        ];
        
        resourceTypes.forEach(function(rt) {
            for (var i = 0; i < rt.count; i++) {
                var tile = self.tiles[Math.floor(Math.random() * self.tiles.length)];
                var production = Utils.randomInt(100, 500);
                var size = 60 + (production / 500) * 60;
                self.resourceBuildings.push({
                    id: Utils.generateId(),
                    type: rt.type,
                    resourceType: rt.resource,
                    x: tile.x + Utils.randomInt(100, CONFIG.TILE_SIZE - 100),
                    y: tile.y + Utils.randomInt(100, CONFIG.TILE_SIZE - 100),
                    tileId: tile.id,
                    production: production,
                    size: size,
                    level: 1,
                    maxLevel: 10,
                    hp: 500,
                    maxHp: 500
                });
            }
        });
    },
    
    getTileAtPosition: function(x, y) {
        var tileSize = CONFIG.TILE_SIZE;
        var gridX = Math.floor(x / tileSize);
        var gridY = Math.floor(y / tileSize);
        return this.tiles.find(function(t) { return t.gridX === gridX && t.gridY === gridY; });
    },
    
    getTileById: function(id) {
        return this.tiles.find(function(t) { return t.id === id; });
    },
    
    getVisibleTiles: function(camera, canvas) {
        var tileSize = CONFIG.TILE_SIZE;
        var startX = Math.floor(camera.x / tileSize);
        var startY = Math.floor(camera.y / tileSize);
        var endX = Math.ceil((camera.x + canvas.width / camera.zoom) / tileSize);
        var endY = Math.ceil((camera.y + canvas.height / camera.zoom) / tileSize);
        
        var visible = [];
        for (var y = startY - 1; y <= endY + 1; y++) {
            for (var x = startX - 1; x <= endX + 1; x++) {
                var tile = this.tiles.find(function(t) { return t.gridX === x && t.gridY === y; });
                if (tile) visible.push(tile);
            }
        }
        return visible;
    },
    
    getBounds: function() {
        return {
            width: this.width * CONFIG.TILE_SIZE,
            height: this.height * CONFIG.TILE_SIZE
        };
    },
    
    getOwnedTiles: function(owner) {
        return this.tiles.filter(function(t) { return t.owner === owner; });
    },
    
    getTerritoryCount: function(owner) {
        return this.tiles.filter(function(t) { return t.owner === owner; }).length;
    },
    
    getResourceBuildingsForOwner: function(owner) {
        var self = this;
        return this.resourceBuildings.filter(function(rb) {
            var tile = self.getTileById(rb.tileId);
            return tile && tile.owner === owner;
        });
    },
    
    updateCapture: function(tile, dt, captureTime) {
        var unitsOnTile = GameState.units.filter(function(u) {
            var unitTile = MapSystem.getTileAtPosition(u.x, u.y);
            return unitTile && unitTile.id === tile.id && UNITS[u.type] && UNITS[u.type].canCapture;
        });
        
        if (unitsOnTile.length === 0) {
            tile.captureProgress = Math.max(0, tile.captureProgress - dt / captureTime);
            if (tile.captureProgress === 0) tile.capturingTeam = null;
            return;
        }
        
        var teams = {};
        unitsOnTile.forEach(function(u) {
            teams[u.owner] = (teams[u.owner] || 0) + 1;
        });
        
        var dominantTeam = null;
        var maxCount = 0;
        Object.keys(teams).forEach(function(team) {
            if (teams[team] > maxCount) {
                maxCount = teams[team];
                dominantTeam = team;
            }
        });
        
        if (dominantTeam && dominantTeam !== tile.owner) {
            if (tile.capturingTeam !== dominantTeam) {
                tile.capturingTeam = dominantTeam;
                tile.captureProgress = 0;
            }
            tile.captureProgress += dt / captureTime * Math.min(maxCount, 5);
            if (tile.captureProgress >= 1) {
                tile.owner = dominantTeam;
                tile.captureProgress = 0;
                tile.capturingTeam = null;
            }
        }
    },
    
    setStartingTerritories: function(players) {
        var positions = {};
        var self = this;
        
        if (!players) {
            var playerTile = this.tiles[Math.floor(this.tiles.length * 0.25)];
            var enemyTile = this.tiles[Math.floor(this.tiles.length * 0.75)];
            playerTile.owner = 'player';
            enemyTile.owner = 'enemy';
            return { player: playerTile, enemy: enemyTile };
        }
        
        var numPlayers = players.length;
        players.forEach(function(player, i) {
            var angle = (i / numPlayers) * Math.PI * 2 - Math.PI / 2;
            var centerX = self.width / 2 + Math.cos(angle) * (self.width / 3);
            var centerY = self.height / 2 + Math.sin(angle) * (self.height / 3);
            var gridX = Math.floor(centerX);
            var gridY = Math.floor(centerY);
            var tile = self.tiles.find(function(t) { return t.gridX === gridX && t.gridY === gridY; });
            if (tile) {
                tile.owner = player.id;
                positions[player.id] = tile;
            }
        });
        
        return positions;
    }
};

window.MapSystem = MapSystem;
