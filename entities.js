// Entities - Unit and Building management
const Entities = {
    // Create a unit
    createUnit: function(type, x, y, owner) {
        var config = UNITS[type];
        if (!config) return null;
        
        return {
            id: Utils.generateId(),
            type: type,
            x: x,
            y: y,
            owner: owner,
            hp: config.hp,
            maxHp: config.hp,
            target: null,
            moveTarget: null,
            lastAttack: 0,
            selected: false,
            group: null
        };
    },
    
    // Create a building
    createBuilding: function(type, x, y, owner) {
        var config = BUILDINGS[type];
        if (!config) return null;
        
        var building = {
            id: Utils.generateId(),
            type: type,
            x: x,
            y: y,
            owner: owner,
            hp: config.hp,
            maxHp: config.hp,
            level: 1,
            lastAttack: 0,
            angle: 0,
            selected: false
        };
        
        // Tower specific
        if (type === 'defenseTower') {
            building.attackCooldown = 0;
        }
        
        return building;
    },
    
    // Get tower upgrade cost
    getTowerUpgradeCost: function(currentLevel) {
        var config = BUILDINGS.defenseTower;
        var multiplier = Math.pow(config.upgradeCostMultiplier, currentLevel);
        
        return {
            dollars: Math.ceil(config.cost.dollars * multiplier),
            oil: Math.ceil(config.cost.oil * multiplier),
            wheat: Math.ceil(config.cost.wheat * multiplier)
        };
    },
    
    // Upgrade tower
    upgradeTower: function(tower) {
        if (tower.type !== 'defenseTower') return false;
        
        var config = BUILDINGS.defenseTower;
        if (tower.level >= config.maxLevel) return false;
        
        tower.level++;
        
        // Recalculate HP
        var hpMultiplier = 1 + (tower.level - 1) * config.levelBonus.hp;
        tower.maxHp = Math.floor(config.hp * hpMultiplier);
        tower.hp = tower.maxHp;
        
        return true;
    },
    
    // Get tower stats based on level
    getTowerStats: function(tower) {
        var config = BUILDINGS.defenseTower;
        var level = tower.level || 1;
        
        var damageMultiplier = 1 + (level - 1) * config.levelBonus.damage;
        var rangeMultiplier = 1 + (level - 1) * config.levelBonus.range;
        
        return {
            damage: Math.floor(config.attackDamage * damageMultiplier),
            range: Math.floor(config.attackRange * rangeMultiplier),
            attackSpeed: config.attackSpeed
        };
    },
    
    // Update all units
    updateUnits: function(gameState, dt) {
        var self = this;
        
        gameState.units.forEach(function(unit) {
            var config = UNITS[unit.type];
            if (!config) return;
            
            // Movement
            if (unit.moveTarget) {
                var dx = unit.moveTarget.x - unit.x;
                var dy = unit.moveTarget.y - unit.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var speed = config.speed * CONFIG.UNIT_SPEED_MULTIPLIER * dt * 60;
                
                if (dist <= speed) {
                    unit.x = unit.moveTarget.x;
                    unit.y = unit.moveTarget.y;
                    unit.moveTarget = null;
                } else {
                    unit.x += (dx / dist) * speed;
                    unit.y += (dy / dist) * speed;
                }
                
                // Keep within map bounds
                unit.x = Math.max(0, Math.min(CONFIG.MAP_WIDTH * CONFIG.TILE_SIZE, unit.x));
                unit.y = Math.max(0, Math.min(CONFIG.MAP_HEIGHT * CONFIG.TILE_SIZE, unit.y));
            }
            
            // Attack target
            if (unit.target) {
                // Check if target still exists
                var targetExists = false;
                if (unit.target.type) {
                    // It's a unit or building
                    targetExists = gameState.units.indexOf(unit.target) !== -1 || 
                                   gameState.buildings.indexOf(unit.target) !== -1;
                }
                
                if (!targetExists || unit.target.hp <= 0) {
                    unit.target = null;
                    return;
                }
                
                var targetDist = Utils.distance(unit.x, unit.y, unit.target.x, unit.target.y);
                
                if (targetDist <= config.range) {
                    // In range - attack
                    var now = Date.now();
                    var attackInterval = 1000; // 1 attack per second
                    
                    if (now - unit.lastAttack >= attackInterval) {
                        unit.lastAttack = now;
                        
                        // Create projectile and add to game state
                        var projectile = Combat.createProjectile(
                            unit.x, unit.y,
                            unit.target.x, unit.target.y,
                            config.damage,
                            unit.owner,
                            unit.target,
                            false
                        );
                        if (!gameState.projectiles) gameState.projectiles = [];
                        gameState.projectiles.push(projectile);
                        
                        SoundManager.play('shoot');
                    }
                } else {
                    // Move toward target
                    var dx = unit.target.x - unit.x;
                    var dy = unit.target.y - unit.y;
                    var dist = Math.sqrt(dx * dx + dy * dy);
                    var speed = config.speed * CONFIG.UNIT_SPEED_MULTIPLIER * dt * 60;
                    
                    unit.x += (dx / dist) * speed;
                    unit.y += (dy / dist) * speed;
                }
            }
        });
        
        // Update tower attacks
        gameState.buildings.forEach(function(building) {
            if (building.type !== 'defenseTower') return;
            
            var stats = self.getTowerStats(building);
            var now = Date.now();
            var attackInterval = 1000 / stats.attackSpeed;
            
            if (now - building.lastAttack < attackInterval) return;
            
            // Find nearest enemy
            var nearestEnemy = null;
            var nearestDist = stats.range;
            
            gameState.units.forEach(function(unit) {
                if (unit.owner === building.owner) return;
                var dist = Utils.distance(building.x, building.y, unit.x, unit.y);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestEnemy = unit;
                }
            });
            
            if (nearestEnemy) {
                building.lastAttack = now;
                
                // Update tower angle
                building.angle = Math.atan2(
                    nearestEnemy.y - building.y,
                    nearestEnemy.x - building.x
                );
                
                // Create projectile and add to game state
                var projectile = Combat.createProjectile(
                    building.x, building.y,
                    nearestEnemy.x, nearestEnemy.y,
                    stats.damage,
                    building.owner,
                    nearestEnemy,
                    true
                );
                if (!gameState.projectiles) gameState.projectiles = [];
                gameState.projectiles.push(projectile);
                
                SoundManager.play('shoot');
            }
        });
        
        // Territory capture
        self.updateTerritoryCapture(gameState, dt);
    },
    
    // Update territory capture based on unit positions
    updateTerritoryCapture: function(gameState, dt) {
        // Count units per tile per player
        var tileCounts = {};
        
        gameState.units.forEach(function(unit) {
            var config = UNITS[unit.type];
            if (!config || !config.canCapture) return;
            
            var tileX = Math.floor(unit.x / CONFIG.TILE_SIZE);
            var tileY = Math.floor(unit.y / CONFIG.TILE_SIZE);
            var key = tileX + ',' + tileY;
            
            if (!tileCounts[key]) {
                tileCounts[key] = {};
            }
            tileCounts[key][unit.owner] = (tileCounts[key][unit.owner] || 0) + 1;
        });
        
        // Process captures
        Object.keys(tileCounts).forEach(function(key) {
            var parts = key.split(',');
            var tileX = parseInt(parts[0]);
            var tileY = parseInt(parts[1]);
            
            if (tileX < 0 || tileX >= CONFIG.MAP_WIDTH || tileY < 0 || tileY >= CONFIG.MAP_HEIGHT) return;
            
            var tile = gameState.map.tiles[tileY][tileX];
            var counts = tileCounts[key];
            
            // Find dominant player
            var maxCount = 0;
            var dominant = null;
            
            Object.keys(counts).forEach(function(owner) {
                if (counts[owner] > maxCount) {
                    maxCount = counts[owner];
                    dominant = parseInt(owner);
                }
            });
            
            // Capture if different owner and enough units
            if (dominant !== null && tile.owner !== dominant && maxCount >= 1) {
                tile.captureProgress = (tile.captureProgress || 0) + dt * maxCount;
                tile.captureBy = dominant;
                
                if (tile.captureProgress >= CONFIG.CAPTURE_TIME) {
                    tile.owner = dominant;
                    tile.captureProgress = 0;
                    tile.captureBy = null;
                }
            } else if (tile.owner !== null && dominant === tile.owner) {
                // Reset capture progress if owner has units there
                tile.captureProgress = 0;
                tile.captureBy = null;
            }
        });
    }
};

window.Entities = Entities;
