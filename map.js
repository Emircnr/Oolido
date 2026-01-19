// Map System - generates and manages game map
const MapSystem = {
    // Generate a new map
    generate: function() {
        var tiles = [];
        
        // Create 32x32 map
        for (var y = 0; y < CONFIG.MAP_HEIGHT; y++) {
            tiles[y] = [];
            for (var x = 0; x < CONFIG.MAP_WIDTH; x++) {
                tiles[y][x] = {
                    x: x,
                    y: y,
                    owner: null,
                    terrain: this.generateTerrain(x, y),
                    resource: this.generateResource(x, y),
                    captureProgress: 0,
                    captureBy: null,
                    towerCount: 0
                };
            }
        }
        
        return { tiles: tiles };
    },
    
    // Generate terrain type for a tile
    generateTerrain: function(x, y) {
        // Simple noise-based terrain
        var noise = Math.sin(x * 0.3) * Math.cos(y * 0.3) + Math.random() * 0.3;
        
        // Water at edges and some random spots
        if (x === 0 || y === 0 || x === CONFIG.MAP_WIDTH - 1 || y === CONFIG.MAP_HEIGHT - 1) {
            return 'water';
        }
        
        if (noise < -0.5) return 'water';
        if (noise > 0.7) return 'mountain';
        return 'grass';
    },
    
    // Generate resource for a tile
    generateResource: function(x, y) {
        // Don't place resources on edges
        if (x < 2 || y < 2 || x >= CONFIG.MAP_WIDTH - 2 || y >= CONFIG.MAP_HEIGHT - 2) {
            return null;
        }
        
        var rand = Math.random();
        
        // 5% oil, 8% wheat, 4% dollars
        if (rand < 0.05) return 'oil';
        if (rand < 0.13) return 'wheat';
        if (rand < 0.17) return 'dollars';
        
        return null;
    },
    
    // Save map state
    save: function(map) {
        var savedTiles = [];
        
        for (var y = 0; y < CONFIG.MAP_HEIGHT; y++) {
            savedTiles[y] = [];
            for (var x = 0; x < CONFIG.MAP_WIDTH; x++) {
                var tile = map.tiles[y][x];
                savedTiles[y][x] = {
                    owner: tile.owner,
                    towerCount: tile.towerCount || 0
                };
            }
        }
        
        return { tiles: savedTiles };
    },
    
    // Load map state
    load: function(savedMap) {
        var map = this.generate();
        
        if (savedMap && savedMap.tiles) {
            for (var y = 0; y < CONFIG.MAP_HEIGHT; y++) {
                for (var x = 0; x < CONFIG.MAP_WIDTH; x++) {
                    if (savedMap.tiles[y] && savedMap.tiles[y][x]) {
                        map.tiles[y][x].owner = savedMap.tiles[y][x].owner;
                        map.tiles[y][x].towerCount = savedMap.tiles[y][x].towerCount || 0;
                    }
                }
            }
        }
        
        return map;
    }
};

window.MapSystem = MapSystem;
