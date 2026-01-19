// Varlık Yönetim Sistemi
class EntityManager {
    constructor(gameState) {
        this.gameState = gameState;
    }
    
    // Birim oluştur
    createUnit(type, x, y, owner) {
        const config = UNITS[type];
        if (!config) return null;
        
        const unit = {
            id: generateId(),
            type,
            x,
            y,
            owner,
            hp: config.hp,
            maxHp: config.hp,
            targetX: x,
            targetY: y,
            target: null,
            lastAttack: 0,
            isMoving: false,
            selected: false
        };
        
        this.gameState.units.push(unit);
        return unit;
    }
    
    // Bina oluştur
    createBuilding(type, x, y, owner) {
        const config = BUILDINGS[type];
        if (!config) return null;
        
        // Eğer savunma kulesi ise, karedeki kule sayısını kontrol et
        if (type === 'defenseTower') {
            const tile = worldToTile(x, y);
            const currentCount = this.gameState.mapSystem.getTowerCount(tile.tileX, tile.tileY);
            if (currentCount >= CONFIG.MAX_TOWERS_PER_TILE) {
                return null; // Limit aşıldı
            }
        }
        
        const building = {
            id: generateId(),
            type,
            x,
            y,
            owner,
            hp: config.hp,
            maxHp: config.hp,
            level: 1,
            lastAttack: 0,
            productionQueue: [],
            rallyPoint: null
        };
        
        this.gameState.buildings.push(building);
        
        // Kule ise sayacı artır
        if (type === 'defenseTower') {
            const tile = worldToTile(x, y);
            this.gameState.mapSystem.addTower(tile.tileX, tile.tileY);
        }
        
        return building;
    }
    
    // Birim satın al
    purchaseUnit(type, building, economy) {
        const config = UNITS[type];
        if (!config) return null;
        
        // Maliyet kontrolü
        if (!economy.canAfford(config.cost)) return null;
        
        // Ödeme yap
        economy.spendResources(config.cost);
        
        // Birimi oluştur (binanın yanında)
        const offset = randomFloat(-300, 300);
        const unit = this.createUnit(
            type,
            building.x + offset,
            building.y + BUILDINGS[building.type].size / 2 + 200,
            building.owner
        );
        
        return unit;
    }
    
    // Bina satın al
    purchaseBuilding(type, x, y, owner, economy) {
        const config = BUILDINGS[type];
        if (!config || !config.canBuild) return null;
        
        // Maliyet kontrolü
        if (!economy.canAfford(config.cost)) return null;
        
        // Kare sahibi kontrolü
        const tile = worldToTile(x, y);
        if (this.gameState.mapSystem.getTileOwner(tile.tileX, tile.tileY) !== owner) {
            return null; // Sadece kendi toprağında inşa edebilir
        }
        
        // Ödeme yap
        economy.spendResources(config.cost);
        
        // Binayı oluştur
        const building = this.createBuilding(type, x, y, owner);
        
        if (building && this.gameState.soundSystem) {
            this.gameState.soundSystem.playBuild();
        }
        
        return building;
    }
    
    // Savunma kulesini geliştir
    upgradeTower(tower, economy) {
        if (tower.type !== 'defenseTower') return false;
        
        const config = BUILDINGS.defenseTower;
        const currentLevel = tower.level || 1;
        
        if (currentLevel >= config.maxLevel) return false;
        
        // Geliştirme maliyetini hesapla
        const multiplier = Math.pow(config.upgradeCostMultiplier, currentLevel - 1);
        const cost = {
            dollars: Math.ceil(config.cost.dollars * multiplier),
            oil: Math.ceil(config.cost.oil * multiplier),
            wheat: Math.ceil(config.cost.wheat * multiplier)
        };
        
        if (!economy.canAfford(cost)) return false;
        
        economy.spendResources(cost);
        tower.level = currentLevel + 1;
        
        // HP'yi yeniden hesapla
        const hpMultiplier = 1 + (tower.level - 1) * config.levelBonus.hp;
        tower.maxHp = Math.floor(config.hp * hpMultiplier);
        tower.hp = tower.maxHp; // Geliştirince full HP
        
        if (this.gameState.soundSystem) {
            this.gameState.soundSystem.playUpgrade();
        }
        
        return true;
    }
    
    // Kulenin mevcut istatistiklerini al
    getTowerStats(tower) {
        const config = BUILDINGS.defenseTower;
        const level = tower.level || 1;
        
        const damageMultiplier = 1 + (level - 1) * config.levelBonus.damage;
        const rangeMultiplier = 1 + (level - 1) * config.levelBonus.range;
        const hpMultiplier = 1 + (level - 1) * config.levelBonus.hp;
        
        return {
            damage: Math.floor(config.attackDamage * damageMultiplier),
            range: Math.floor(config.attackRange * rangeMultiplier),
            hp: Math.floor(config.hp * hpMultiplier),
            attackSpeed: config.attackSpeed
        };
    }
    
    // Birim hareket ettir
    moveUnit(unit, targetX, targetY, economy) {
        const config = UNITS[unit.type];
        if (!config) return false;
        
        // Hareket puanı kontrolü (tam hareket için)
        // Hareket başladığında puan düşülür
        if (economy && config.movementCost) {
            if (!economy.spendMovement(config.movementCost)) {
                return false; // Hareket puanı yok
            }
        }
        
        unit.targetX = targetX;
        unit.targetY = targetY;
        unit.isMoving = true;
        
        return true;
    }
    
    // Birimleri güncelle
    updateUnits(deltaTime) {
        for (const unit of this.gameState.units) {
            if (!unit.isMoving) continue;
            
            const config = UNITS[unit.type];
            if (!config) continue;
            
            const speed = config.speed * CONFIG.UNIT_SPEED_MULTIPLIER * deltaTime;
            const dx = unit.targetX - unit.x;
            const dy = unit.targetY - unit.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist <= speed) {
                unit.x = unit.targetX;
                unit.y = unit.targetY;
                unit.isMoving = false;
            } else {
                unit.x += (dx / dist) * speed;
                unit.y += (dy / dist) * speed;
            }
            
            // Harita sınırları içinde tut
            unit.x = clamp(unit.x, 0, CONFIG.MAP_WIDTH * CONFIG.TILE_SIZE);
            unit.y = clamp(unit.y, 0, CONFIG.MAP_HEIGHT * CONFIG.TILE_SIZE);
        }
    }
    
    // Kare yakalamasını güncelle
    updateCapture(deltaTime) {
        for (const unit of this.gameState.units) {
            const config = UNITS[unit.type];
            if (!config || !config.canCapture) continue;
            
            // Birimin bulunduğu kare
            const tile = worldToTile(unit.x, unit.y);
            
            // Kare yakalama
            this.gameState.mapSystem.updateCapture(
                tile.tileX,
                tile.tileY,
                unit.owner,
                deltaTime
            );
        }
    }
    
    // Birimi sil
    removeUnit(unit) {
        const index = this.gameState.units.indexOf(unit);
        if (index !== -1) {
            this.gameState.units.splice(index, 1);
        }
    }
    
    // Binayı sil
    removeBuilding(building) {
        const index = this.gameState.buildings.indexOf(building);
        if (index !== -1) {
            this.gameState.buildings.splice(index, 1);
            
            // Kule ise sayacı azalt
            if (building.type === 'defenseTower') {
                const tile = worldToTile(building.x, building.y);
                this.gameState.mapSystem.removeTower(tile.tileX, tile.tileY);
            }
        }
    }
    
    // Belirli bir oyuncunun birimlerini al
    getPlayerUnits(playerId) {
        return this.gameState.units.filter(u => u.owner === playerId);
    }
    
    // Belirli bir oyuncunun binalarını al
    getPlayerBuildings(playerId) {
        return this.gameState.buildings.filter(b => b.owner === playerId);
    }
    
    // Belirli bir alandaki birimleri al
    getUnitsInArea(x, y, radius) {
        return this.gameState.units.filter(u => 
            distance(u.x, u.y, x, y) <= radius
        );
    }
    
    // Belirli bir alandaki binaları al
    getBuildingsInArea(x, y, radius) {
        return this.gameState.buildings.filter(b => 
            distance(b.x, b.y, x, y) <= radius
        );
    }
    
    // En yakın düşman birimi bul
    findNearestEnemy(unit, maxRange) {
        let nearest = null;
        let nearestDist = maxRange;
        
        for (const other of this.gameState.units) {
            if (other.owner === unit.owner) continue;
            
            const dist = distance(unit.x, unit.y, other.x, other.y);
            if (dist < nearestDist) {
                nearest = other;
                nearestDist = dist;
            }
        }
        
        return nearest;
    }
    
    // En yakın düşman binayı bul
    findNearestEnemyBuilding(x, y, owner, maxRange) {
        let nearest = null;
        let nearestDist = maxRange;
        
        for (const building of this.gameState.buildings) {
            if (building.owner === owner || building.owner === null) continue;
            
            const dist = distance(x, y, building.x, building.y);
            if (dist < nearestDist) {
                nearest = building;
                nearestDist = dist;
            }
        }
        
        return nearest;
    }
    
    // Oyuncu istatistikleri
    getPlayerStats(playerId) {
        const units = this.getPlayerUnits(playerId);
        const buildings = this.getPlayerBuildings(playerId);
        
        let totalUnitHp = 0;
        let unitCount = 0;
        
        for (const unit of units) {
            totalUnitHp += unit.hp;
            unitCount++;
        }
        
        let buildingCount = 0;
        let towerCount = 0;
        
        for (const building of buildings) {
            buildingCount++;
            if (building.type === 'defenseTower') {
                towerCount++;
            }
        }
        
        return {
            unitCount,
            totalUnitHp,
            buildingCount,
            towerCount,
            tiles: this.gameState.mapSystem.countPlayerTiles(playerId)
        };
    }
}

window.EntityManager = EntityManager;
