/* ============================================
   TACTICAL COMMAND - MAP SYSTEM
   6 Resource types, multiplayer positioning
   ============================================ */

const MapSystem = {
    tiles: [],
    mapWidth: 0,
    mapHeight: 0,
    resourceBuildings: [],
    radarSignals: [],
    
    generate(totalTiles = 512) {
        this.resourceBuildings = [];
        this.radarSignals = [];
        
        if (totalTiles === 256) { this.mapWidth = 16; this.mapHeight = 16; }
        else if (totalTiles === 512) { this.mapWidth = 32; this.mapHeight = 16; }
        else { this.mapWidth = 32; this.mapHeight = 32; }
        
        this.tiles = [];
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                this.tiles.push({
                    id: y * this.mapWidth + x,
                    gridX: x, gridY: y,
                    x: x * CONFIG.TILE_SIZE,
                    y: y * CONFIG.TILE_SIZE,
                    width: CONFIG.TILE_SIZE,
                    height: CONFIG.TILE_SIZE,
                    centerX: x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                    centerY: y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                    owner: null,
                    captureProgress: 0,
                    capturingTeam: null,
                    unitsPresent: {}
                });
            }
        }
        
        this.generateResourceBuildings();
        return this.tiles;
    },
    
    generateResourceBuildings() {
        const buildingTypes = [
            { type: 'oilWell', resource: 'oil' },
            { type: 'goldMine', resource: 'gold' },
            { type: 'wheatFarm', resource: 'wheat' },
            { type: 'ironMine', resource: 'iron' },
            { type: 'copperMine', resource: 'copper' },
            { type: 'uraniumMine', resource: 'uranium' }
        ];
        
        for (const { type, resource } of buildingTypes) {
            const count = CONFIG.RESOURCE_BUILDING_COUNTS[type] || 15;
            const def = BUILDINGS[type];
            
            for (let i = 0; i < count; i++) {
                let placed = false;
                let attempts = 0;
                
                while (!placed && attempts < 100) {
                    const gridX = Utils.randomInt(0, this.mapWidth - 1);
                    const gridY = Utils.randomInt(0, this.mapHeight - 1);
                    const tile = this.getTileByGrid(gridX, gridY);
                    
                    if (tile) {
                        const margin = 400;
                        const x = tile.x + Utils.random(margin, CONFIG.TILE_SIZE - margin);
                        const y = tile.y + Utils.random(margin, CONFIG.TILE_SIZE - margin);
                        
                        const overlap = this.resourceBuildings.some(rb => 
                            Utils.distance(x, y, rb.x, rb.y) < 500
                        );
                        
                        if (!overlap) {
                            const production = Utils.randomInt(
                                CONFIG.RESOURCE_MIN_PRODUCTION,
                                CONFIG.RESOURCE_MAX_PRODUCTION
                            );
                            
                            const scale = 1 + (production - CONFIG.RESOURCE_MIN_PRODUCTION) / 
                                         (CONFIG.RESOURCE_MAX_PRODUCTION - CONFIG.RESOURCE_MIN_PRODUCTION) * 3;
                            const size = Math.floor((def.baseSize || 80) * Math.sqrt(scale));
                            
                            this.resourceBuildings.push({
                                id: Utils.generateId(),
                                type, resourceType: resource,
                                x, y, size, production,
                                tileId: tile.id,
                                hp: def.hp,
                                maxHp: def.hp,
                                level: 1,
                                maxLevel: 10
                            });
                            placed = true;
                        }
                    }
                    attempts++;
                }
            }
        }
    },
    
    getTileByGrid(gridX, gridY) {
        if (gridX < 0 || gridX >= this.mapWidth || gridY < 0 || gridY >= this.mapHeight) return null;
        return this.tiles[gridY * this.mapWidth + gridX];
    },
    
    getTileAtPosition(x, y) {
        const gridX = Math.floor(x / CONFIG.TILE_SIZE);
        const gridY = Math.floor(y / CONFIG.TILE_SIZE);
        return this.getTileByGrid(gridX, gridY);
    },
    
    getTileById(id) {
        return this.tiles[id] || null;
    },
    
    getAdjacentTiles(tile) {
        const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
        return dirs.map(d => this.getTileByGrid(tile.gridX + d[0], tile.gridY + d[1])).filter(t => t);
    },
    
    isAdjacentToTerritory(tile, owner) {
        return this.getAdjacentTiles(tile).some(adj => adj.owner === owner);
    },
    
    getOwnedTiles(owner) {
        return this.tiles.filter(t => t.owner === owner);
    },
    
    getTerritoryCount(owner) {
        return this.tiles.filter(t => t.owner === owner).length;
    },
    
    getResourceBuildingsForOwner(owner) {
        return this.resourceBuildings.filter(rb => {
            const tile = this.getTileById(rb.tileId);
            return tile && tile.owner === owner;
        });
    },
    
    getResourceBuildingAtPoint(x, y) {
        for (const rb of this.resourceBuildings) {
            const half = rb.size / 2;
            if (x >= rb.x - half && x <= rb.x + half && y >= rb.y - half && y <= rb.y + half) {
                return rb;
            }
        }
        return null;
    },
    
    getResourceBuildingProduction(rb) {
        return rb.production * (1 + (rb.level - 1) * 0.2);
    },
    
    upgradeResourceBuilding(rb) {
        if (rb.level >= rb.maxLevel) {
            UI.notify('Maksimum seviye!', 'warning');
            return false;
        }
        
        const cost = 500 * Math.pow(1.5, rb.level - 1);
        if (GameState.dollars < cost) {
            UI.notify('Yetersiz dolar!', 'error');
            return false;
        }
        
        GameState.dollars -= cost;
        rb.level++;
        UI.notify(`Seviye ${rb.level}!`, 'success');
        return true;
    },
    
    updateCapture(tile, dt) {
        if (!tile.unitsPresent) tile.unitsPresent = {};
        
        // Reset counts
        for (const key of Object.keys(tile.unitsPresent)) {
            tile.unitsPresent[key] = 0;
        }
        
        // Count units
        for (const unit of GameState.units) {
            const def = UNITS[unit.type];
            if (!def.canCapture) continue;
            
            const unitTile = this.getTileAtPosition(unit.x, unit.y);
            if (unitTile && unitTile.id === tile.id) {
                tile.unitsPresent[unit.owner] = (tile.unitsPresent[unit.owner] || 0) + 1;
            }
        }
        
        const owners = Object.entries(tile.unitsPresent).filter(([k, v]) => v > 0);
        
        if (owners.length === 1) {
            const [capturingOwner, count] = owners[0];
            
            if (tile.owner !== capturingOwner) {
                if (this.isAdjacentToTerritory(tile, capturingOwner) || tile.owner === null) {
                    if (tile.capturingTeam !== capturingOwner) {
                        tile.capturingTeam = capturingOwner;
                        tile.captureProgress = 0;
                    }
                    
                    tile.captureProgress += (dt / CONFIG.CAPTURE_TIME) * (1 + (count - 1) * 0.3);
                    
                    if (tile.captureProgress >= 1) {
                        tile.owner = capturingOwner;
                        tile.captureProgress = 0;
                        tile.capturingTeam = null;
                        
                        if (capturingOwner === GameState.myId) {
                            const resources = this.resourceBuildings.filter(rb => rb.tileId === tile.id);
                            if (resources.length > 0) {
                                UI.notify(`Bölge alındı! +${resources.length} kaynak!`, 'success');
                            }
                        }
                    }
                }
            }
        } else {
            tile.captureProgress = Math.max(0, tile.captureProgress - dt * 0.3);
            if (tile.captureProgress === 0) tile.capturingTeam = null;
        }
    },
    
    // Set starting territories for multiplayer
    setStartingTerritories(players) {
        const positions = {};
        const numPlayers = players.length;
        const centerX = this.mapWidth / 2;
        const centerY = this.mapHeight / 2;
        const radius = Math.min(this.mapWidth, this.mapHeight) * 0.35;
        
        players.forEach((player, i) => {
            const angle = (i / numPlayers) * Math.PI * 2 - Math.PI / 2;
            const gridX = Math.floor(centerX + Math.cos(angle) * radius);
            const gridY = Math.floor(centerY + Math.sin(angle) * radius);
            
            const tile = this.getTileByGrid(
                Utils.clamp(gridX, 1, this.mapWidth - 2),
                Utils.clamp(gridY, 1, this.mapHeight - 2)
            );
            
            if (tile) {
                tile.owner = player.id;
                this.getAdjacentTiles(tile).forEach(t => {
                    if (!t.owner) t.owner = player.id;
                });
                positions[player.id] = tile;
            }
        });
        
        return positions;
    },
    
    // Single player starting territories
    setSinglePlayerTerritories() {
        const pTile = this.getTileByGrid(1, this.mapHeight - 2);
        if (pTile) {
            pTile.owner = 'player';
            this.getAdjacentTiles(pTile).forEach(t => t.owner = 'player');
        }
        
        const eTile = this.getTileByGrid(this.mapWidth - 2, 1);
        if (eTile) {
            eTile.owner = 'enemy';
            this.getAdjacentTiles(eTile).forEach(t => t.owner = 'enemy');
        }
        
        return { player: pTile, enemy: eTile };
    },
    
    getBounds() {
        return {
            width: this.mapWidth * CONFIG.TILE_SIZE,
            height: this.mapHeight * CONFIG.TILE_SIZE
        };
    },
    
    getVisibleTiles(camera, canvas) {
        const startX = Math.floor(camera.x / CONFIG.TILE_SIZE) - 1;
        const startY = Math.floor(camera.y / CONFIG.TILE_SIZE) - 1;
        const endX = Math.ceil((camera.x + canvas.width / camera.zoom) / CONFIG.TILE_SIZE) + 1;
        const endY = Math.ceil((camera.y + canvas.height / camera.zoom) / CONFIG.TILE_SIZE) + 1;
        
        const visible = [];
        for (let y = Math.max(0, startY); y < Math.min(this.mapHeight, endY); y++) {
            for (let x = Math.max(0, startX); x < Math.min(this.mapWidth, endX); x++) {
                const tile = this.getTileByGrid(x, y);
                if (tile) visible.push(tile);
            }
        }
        return visible;
    },
    
    // Radar detection
    checkRadarDetection(myId) {
        this.radarSignals = [];
        
        const myRadars = GameState.buildings.filter(b => 
            b.owner === myId && b.type === 'radar' && b.hp > 0
        );
        
        for (const radar of myRadars) {
            const cx = radar.x + radar.size / 2;
            const cy = radar.y + radar.size / 2;
            const range = BUILDINGS.radar.radarRange;
            
            for (const unit of GameState.units) {
                if (unit.owner === myId) continue;
                
                if (Utils.distance(cx, cy, unit.x, unit.y) <= range) {
                    this.radarSignals.push({
                        x: unit.x,
                        y: unit.y,
                        type: unit.type,
                        time: Date.now()
                    });
                }
            }
        }
    },
    
    isInRadarRange(x, y, myId) {
        for (const building of GameState.buildings) {
            if (building.owner !== myId || building.type !== 'radar') continue;
            
            const cx = building.x + building.size / 2;
            const cy = building.y + building.size / 2;
            
            if (Utils.distance(cx, cy, x, y) <= BUILDINGS.radar.radarRange) {
                return true;
            }
        }
        return false;
    }
};

if (typeof window !== 'undefined') window.MapSystem = MapSystem;
