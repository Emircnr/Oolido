/* ============================================
   TACTICAL COMMAND - AI SYSTEM
   Enemy AI for single player mode
   ============================================ */

const AISystem = {
    difficulty: 'normal',
    dollars: 0,
    lastUpdate: 0,
    updateInterval: 2,
    buildCooldown: 0,
    attackCooldown: 0,
    
    init(difficulty = 'normal') {
        this.difficulty = difficulty;
        this.dollars = CONFIG.STARTING_DOLLARS;
        this.lastUpdate = 0;
        this.buildCooldown = 10;
        this.attackCooldown = 60;
    },
    
    update(dt) {
        if (GameState.isMultiplayer) return;
        
        // Resource income from captured resource buildings
        const owned = MapSystem.getResourceBuildingsForOwner('enemy');
        for (const rb of owned) {
            const def = BUILDINGS[rb.type];
            if (def.resourceType) {
                const production = MapSystem.getResourceBuildingProduction(rb);
                // Convert to dollars based on base price
                const basePrice = CONFIG.RESOURCES[def.resourceType].basePrice;
                this.dollars += (production / 60) * dt * basePrice * 0.01;
            }
        }
        
        // Base income
        this.dollars += dt * 10;
        
        this.lastUpdate += dt;
        if (this.lastUpdate < this.updateInterval) return;
        this.lastUpdate = 0;
        
        this.buildCooldown -= this.updateInterval;
        this.attackCooldown -= this.updateInterval;
        
        // AI decisions
        this.manageBuildings();
        this.manageProduction();
        this.manageUnits();
    },
    
    manageBuildings() {
        if (this.buildCooldown > 0) return;
        
        const ownedTiles = MapSystem.getOwnedTiles('enemy');
        if (ownedTiles.length === 0) return;
        
        const buildings = GameState.buildings.filter(b => b.owner === 'enemy');
        
        // Count building types
        const counts = {};
        for (const b of buildings) {
            counts[b.type] = (counts[b.type] || 0) + 1;
        }
        
        // Priority: barracks -> armorFactory -> airbase
        let toBuild = null;
        
        if (!counts.barracks || counts.barracks < 2) {
            toBuild = 'barracks';
        } else if (!counts.armorFactory || counts.armorFactory < 2) {
            toBuild = 'armorFactory';
        } else if (!counts.airbase) {
            toBuild = 'airbase';
        } else if (!counts.hospital) {
            toBuild = 'hospital';
        } else if (!counts.radar) {
            toBuild = 'radar';
        } else if (Math.random() < 0.3) {
            // Random defensive building
            toBuild = Math.random() < 0.5 ? 'mgTurret' : 'missileTurret';
        }
        
        if (!toBuild) return;
        
        const def = BUILDINGS[toBuild];
        if (this.dollars < def.cost.dollars) return;
        
        // Find placement
        for (let attempt = 0; attempt < 20; attempt++) {
            const tile = ownedTiles[Math.floor(Math.random() * ownedTiles.length)];
            const x = tile.x + Utils.randomInt(100, CONFIG.TILE_SIZE - def.size - 100);
            const y = tile.y + Utils.randomInt(100, CONFIG.TILE_SIZE - def.size - 100);
            
            const check = this.canBuildAt(toBuild, x, y);
            if (check) {
                this.dollars -= def.cost.dollars;
                const building = EntitySystem.createBuilding(toBuild, x, y, 'enemy');
                GameState.buildings.push(building);
                this.buildCooldown = 15;
                return;
            }
        }
    },
    
    canBuildAt(buildingType, x, y) {
        const def = BUILDINGS[buildingType];
        const size = def.size || 200;
        
        const tile = MapSystem.getTileAtPosition(x + size/2, y + size/2);
        if (!tile || tile.owner !== 'enemy') return false;
        
        for (const building of GameState.buildings) {
            if (Utils.rectsOverlap(x, y, size, size, building.x, building.y, building.size, building.size)) {
                return false;
            }
        }
        
        for (const rb of MapSystem.resourceBuildings) {
            const rbHalf = rb.size / 2;
            if (Utils.rectsOverlap(x, y, size, size, rb.x - rbHalf, rb.y - rbHalf, rb.size, rb.size)) {
                return false;
            }
        }
        
        return true;
    },
    
    manageProduction() {
        const buildings = GameState.buildings.filter(b => b.owner === 'enemy');
        
        for (const building of buildings) {
            const def = BUILDINGS[building.type];
            if (!def.units || building.productionQueue.length >= 3) continue;
            
            // Choose unit to produce
            let unitType = null;
            
            if (building.type === 'barracks') {
                const roll = Math.random();
                if (roll < 0.4) unitType = 'rifleman';
                else if (roll < 0.6) unitType = 'machinegunner';
                else if (roll < 0.75) unitType = 'rocketeer';
                else if (roll < 0.85) unitType = 'sniper';
                else unitType = 'medic';
            } else if (building.type === 'armorFactory') {
                const roll = Math.random();
                if (roll < 0.3) unitType = 'apc';
                else if (roll < 0.6) unitType = 'tank';
                else if (roll < 0.8) unitType = 'heavyTank';
                else unitType = 'antiAir';
            } else if (building.type === 'airbase') {
                const roll = Math.random();
                if (roll < 0.3) unitType = 'helicopter';
                else if (roll < 0.6) unitType = 'siha';
                else if (roll < 0.8) unitType = 'attackHeli';
                else unitType = 'fighter';
            }
            
            if (!unitType) continue;
            
            const unitDef = UNITS[unitType];
            if (this.dollars >= unitDef.cost.dollars) {
                this.dollars -= unitDef.cost.dollars;
                building.productionQueue.push(unitType);
            }
        }
        
        // Process production
        for (const building of buildings) {
            if (building.productionQueue.length > 0) {
                const unitType = building.productionQueue[0];
                const unitDef = UNITS[unitType];
                
                building.productionProgress += this.updateInterval;
                
                if (building.productionProgress >= unitDef.buildTime) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = building.size + 80;
                    const x = building.x + building.size/2 + Math.cos(angle) * dist;
                    const y = building.y + building.size/2 + Math.sin(angle) * dist;
                    
                    const unit = EntitySystem.createUnit(unitType, x, y, 'enemy');
                    GameState.units.push(unit);
                    
                    building.productionQueue.shift();
                    building.productionProgress = 0;
                }
            }
        }
    },
    
    manageUnits() {
        const myUnits = GameState.units.filter(u => u.owner === 'enemy');
        const enemyUnits = GameState.units.filter(u => u.owner === 'player');
        const enemyBuildings = GameState.buildings.filter(b => b.owner === 'player');
        
        // Group units for attack
        const idleUnits = myUnits.filter(u => !u.moveTarget && !u.attackTarget);
        
        if (idleUnits.length >= 10 && this.attackCooldown <= 0) {
            // Find target
            let target = null;
            
            // Prioritize HQ
            const playerHQ = enemyBuildings.find(b => b.type === 'headquarters');
            if (playerHQ) {
                target = { x: playerHQ.x + playerHQ.size/2, y: playerHQ.y + playerHQ.size/2 };
            } else if (enemyBuildings.length > 0) {
                const randBuilding = enemyBuildings[Math.floor(Math.random() * enemyBuildings.length)];
                target = { x: randBuilding.x + randBuilding.size/2, y: randBuilding.y + randBuilding.size/2 };
            } else if (enemyUnits.length > 0) {
                const randUnit = enemyUnits[Math.floor(Math.random() * enemyUnits.length)];
                target = { x: randUnit.x, y: randUnit.y };
            }
            
            if (target) {
                for (const unit of idleUnits) {
                    const offset = Utils.random(-200, 200);
                    unit.moveTarget = { 
                        x: target.x + offset, 
                        y: target.y + offset 
                    };
                }
                this.attackCooldown = 45;
            }
        }
        
        // Capture neutral/enemy tiles
        const capturers = idleUnits.filter(u => UNITS[u.type].canCapture);
        
        for (const unit of capturers.slice(0, 5)) {
            const currentTile = MapSystem.getTileAtPosition(unit.x, unit.y);
            
            if (currentTile && currentTile.owner !== 'enemy') {
                continue; // Stay to capture
            }
            
            // Find adjacent neutral tile
            const adjacentTiles = currentTile ? MapSystem.getAdjacentTiles(currentTile) : [];
            const targetTile = adjacentTiles.find(t => t.owner !== 'enemy');
            
            if (targetTile) {
                unit.moveTarget = { x: targetTile.centerX, y: targetTile.centerY };
            }
        }
    }
};

if (typeof window !== 'undefined') {
    window.AISystem = AISystem;
}
