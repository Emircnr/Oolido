// Harita Sistemi
class MapSystem {
    constructor() {
        this.tiles = [];
        this.resourceBuildings = [];
        this.towerCounts = {}; // Her karedeki kule sayısı
    }
    
    // Haritayı oluştur
    generate() {
        this.tiles = [];
        this.resourceBuildings = [];
        this.towerCounts = {};
        
        // 32x32 harita oluştur
        for (let y = 0; y < CONFIG.MAP_HEIGHT; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < CONFIG.MAP_WIDTH; x++) {
                this.tiles[y][x] = {
                    x,
                    y,
                    owner: null,
                    terrain: this.generateTerrain(x, y),
                    captureProgress: 0,
                    capturingPlayer: null
                };
                // Kule sayacı başlat
                this.towerCounts[`${x},${y}`] = 0;
            }
        }
        
        // Kaynak binalarını yerleştir
        this.placeResourceBuildings();
        
        return this.tiles;
    }
    
    // Arazi tipi oluştur
    generateTerrain(x, y) {
        // Basit procedural terrain
        const noise = Math.sin(x * 0.3) * Math.cos(y * 0.3) + Math.random() * 0.3;
        if (noise > 0.6) return 'hills';
        if (noise < -0.4) return 'water';
        return 'plains';
    }
    
    // Kaynak binalarını haritaya yerleştir
    placeResourceBuildings() {
        const counts = CONFIG.RESOURCE_BUILDING_COUNTS;
        
        // Tüm geçerli kareleri al (su olmayan)
        const validTiles = [];
        for (let y = 0; y < CONFIG.MAP_HEIGHT; y++) {
            for (let x = 0; x < CONFIG.MAP_WIDTH; x++) {
                if (this.tiles[y][x].terrain !== 'water') {
                    validTiles.push({ x, y });
                }
            }
        }
        
        // Kareleri karıştır
        const shuffled = shuffleArray(validTiles);
        
        let index = 0;
        
        // Petrol rafinerileri
        for (let i = 0; i < counts.oil && index < shuffled.length; i++, index++) {
            const tile = shuffled[index];
            this.resourceBuildings.push({
                id: generateId(),
                type: 'oilRefinery',
                x: tile.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                y: tile.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                tileX: tile.x,
                tileY: tile.y,
                owner: null,
                hp: BUILDINGS.oilRefinery.hp,
                maxHp: BUILDINGS.oilRefinery.hp,
                level: 1
            });
        }
        
        // Değirmenler
        for (let i = 0; i < counts.wheat && index < shuffled.length; i++, index++) {
            const tile = shuffled[index];
            this.resourceBuildings.push({
                id: generateId(),
                type: 'mill',
                x: tile.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                y: tile.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                tileX: tile.x,
                tileY: tile.y,
                owner: null,
                hp: BUILDINGS.mill.hp,
                maxHp: BUILDINGS.mill.hp,
                level: 1
            });
        }
        
        // Dolar madenleri
        for (let i = 0; i < counts.dollars && index < shuffled.length; i++, index++) {
            const tile = shuffled[index];
            this.resourceBuildings.push({
                id: generateId(),
                type: 'dollarMine',
                x: tile.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                y: tile.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                tileX: tile.x,
                tileY: tile.y,
                owner: null,
                hp: BUILDINGS.dollarMine.hp,
                maxHp: BUILDINGS.dollarMine.hp,
                level: 1
            });
        }
        
        return this.resourceBuildings;
    }
    
    // Kare sahibini ayarla
    setTileOwner(tileX, tileY, playerId) {
        if (!isInBounds(tileX, tileY)) return false;
        
        const oldOwner = this.tiles[tileY][tileX].owner;
        this.tiles[tileY][tileX].owner = playerId;
        
        // O karedeki kaynak binalarının sahipliğini güncelle
        for (const building of this.resourceBuildings) {
            if (building.tileX === tileX && building.tileY === tileY) {
                building.owner = playerId;
            }
        }
        
        return oldOwner !== playerId;
    }
    
    // Kare sahibini al
    getTileOwner(tileX, tileY) {
        if (!isInBounds(tileX, tileY)) return null;
        return this.tiles[tileY][tileX].owner;
    }
    
    // Karedeki kule sayısını al
    getTowerCount(tileX, tileY) {
        return this.towerCounts[`${tileX},${tileY}`] || 0;
    }
    
    // Kule sayısını artır
    addTower(tileX, tileY) {
        const key = `${tileX},${tileY}`;
        const current = this.towerCounts[key] || 0;
        if (current >= CONFIG.MAX_TOWERS_PER_TILE) return false;
        this.towerCounts[key] = current + 1;
        return true;
    }
    
    // Kule sayısını azalt
    removeTower(tileX, tileY) {
        const key = `${tileX},${tileY}`;
        const current = this.towerCounts[key] || 0;
        if (current > 0) {
            this.towerCounts[key] = current - 1;
        }
    }
    
    // Bir oyuncunun toplam kare sayısını al
    countPlayerTiles(playerId) {
        let count = 0;
        for (let y = 0; y < CONFIG.MAP_HEIGHT; y++) {
            for (let x = 0; x < CONFIG.MAP_WIDTH; x++) {
                if (this.tiles[y][x].owner === playerId) {
                    count++;
                }
            }
        }
        return count;
    }
    
    // Bir oyuncunun kaynak binalarını al
    getPlayerResourceBuildings(playerId) {
        return this.resourceBuildings.filter(b => b.owner === playerId);
    }
    
    // Kare yakalama ilerlemesini güncelle
    updateCapture(tileX, tileY, playerId, deltaTime) {
        if (!isInBounds(tileX, tileY)) return false;
        
        const tile = this.tiles[tileY][tileX];
        
        // Zaten bu oyuncunun mı?
        if (tile.owner === playerId) return false;
        
        // Farklı oyuncu yakalamaya başladıysa sıfırla
        if (tile.capturingPlayer !== playerId) {
            tile.capturingPlayer = playerId;
            tile.captureProgress = 0;
        }
        
        // İlerlemeyi artır
        tile.captureProgress += deltaTime;
        
        // Yakalama tamamlandı mı?
        if (tile.captureProgress >= CONFIG.CAPTURE_TIME) {
            this.setTileOwner(tileX, tileY, playerId);
            tile.captureProgress = 0;
            tile.capturingPlayer = null;
            return true;
        }
        
        return false;
    }
    
    // Durumu kaydet
    getState() {
        const tilesState = [];
        for (let y = 0; y < CONFIG.MAP_HEIGHT; y++) {
            tilesState[y] = [];
            for (let x = 0; x < CONFIG.MAP_WIDTH; x++) {
                tilesState[y][x] = {
                    owner: this.tiles[y][x].owner,
                    captureProgress: this.tiles[y][x].captureProgress,
                    capturingPlayer: this.tiles[y][x].capturingPlayer
                };
            }
        }
        
        return {
            tiles: tilesState,
            resourceBuildings: this.resourceBuildings.map(b => ({
                id: b.id,
                type: b.type,
                x: b.x,
                y: b.y,
                tileX: b.tileX,
                tileY: b.tileY,
                owner: b.owner,
                hp: b.hp,
                maxHp: b.maxHp,
                level: b.level
            })),
            towerCounts: { ...this.towerCounts }
        };
    }
    
    // Durumu yükle
    loadState(state) {
        if (!state) return;
        
        if (state.tiles) {
            for (let y = 0; y < CONFIG.MAP_HEIGHT && y < state.tiles.length; y++) {
                for (let x = 0; x < CONFIG.MAP_WIDTH && x < state.tiles[y].length; x++) {
                    const savedTile = state.tiles[y][x];
                    if (this.tiles[y] && this.tiles[y][x]) {
                        this.tiles[y][x].owner = savedTile.owner;
                        this.tiles[y][x].captureProgress = savedTile.captureProgress || 0;
                        this.tiles[y][x].capturingPlayer = savedTile.capturingPlayer || null;
                    }
                }
            }
        }
        
        if (state.resourceBuildings) {
            // Kaynak binalarını güncelle
            for (const savedBuilding of state.resourceBuildings) {
                const building = this.resourceBuildings.find(b => b.id === savedBuilding.id);
                if (building) {
                    building.owner = savedBuilding.owner;
                    building.hp = savedBuilding.hp;
                    building.level = savedBuilding.level || 1;
                }
            }
        }
        
        if (state.towerCounts) {
            this.towerCounts = { ...state.towerCounts };
        }
    }
    
    // Başlangıç pozisyonlarını al (oyuncu spawn noktaları)
    getStartPositions(playerCount) {
        const positions = [];
        const margin = 3; // Kenardan uzaklık
        
        // 4 köşe ve 4 kenar ortası
        const candidates = [
            { x: margin, y: margin }, // Sol üst
            { x: CONFIG.MAP_WIDTH - margin - 1, y: margin }, // Sağ üst
            { x: margin, y: CONFIG.MAP_HEIGHT - margin - 1 }, // Sol alt
            { x: CONFIG.MAP_WIDTH - margin - 1, y: CONFIG.MAP_HEIGHT - margin - 1 }, // Sağ alt
            { x: CONFIG.MAP_WIDTH / 2, y: margin }, // Üst orta
            { x: CONFIG.MAP_WIDTH / 2, y: CONFIG.MAP_HEIGHT - margin - 1 }, // Alt orta
            { x: margin, y: CONFIG.MAP_HEIGHT / 2 }, // Sol orta
            { x: CONFIG.MAP_WIDTH - margin - 1, y: CONFIG.MAP_HEIGHT / 2 } // Sağ orta
        ];
        
        for (let i = 0; i < playerCount && i < candidates.length; i++) {
            const pos = candidates[i];
            positions.push({
                tileX: Math.floor(pos.x),
                tileY: Math.floor(pos.y),
                worldX: pos.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                worldY: pos.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2
            });
        }
        
        return positions;
    }
}

window.MapSystem = MapSystem;
