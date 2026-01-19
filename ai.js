const AI = {
    players: [],
    lastUpdate: {},
    
    init: function(gameState) {
        var self = this;
        gameState.players.forEach(function(player, index) {
            if (player.isAI) {
                self.players.push(index);
                self.lastUpdate[index] = {
                    build: 0,
                    attack: 0,
                    expand: 0
                };
            }
        });
    },
    
    update: function(gameState, economy, dt) {
        var self = this;
        var now = Date.now();
        
        this.players.forEach(function(playerIndex) {
            var player = gameState.players[playerIndex];
            var timers = self.lastUpdate[playerIndex];
            
            // Build units every 5 seconds
            if (now - timers.build > 5000) {
                self.tryBuildUnits(gameState, playerIndex);
                timers.build = now;
            }
            
            // Attack every 10 seconds
            if (now - timers.attack > 10000) {
                self.manageAttacks(gameState, playerIndex);
                timers.attack = now;
            }
            
            // Expand every 15 seconds
            if (now - timers.expand > 15000) {
                self.tryExpand(gameState, playerIndex);
                timers.expand = now;
            }
            
            // Update unit behavior
            self.updateUnits(gameState, playerIndex);
        });
    },
    
    tryBuildUnits: function(gameState, playerIndex) {
        var economy = gameState.economies[playerIndex];
        if (!economy) return;
        
        var res = economy.resources;
        var barracks = gameState.buildings.filter(function(b) {
            return b.type === 'barracks' && b.owner === playerIndex;
        });
        
        if (barracks.length === 0) return;
        
        // Count current units
        var unitCount = gameState.units.filter(function(u) {
            return u.owner === playerIndex;
        }).length;
        
        // Don't build too many
        if (unitCount >= 30) return;
        
        // Choose unit type based on resources
        var unitType = null;
        var unitTypes = ['infantry', 'heavy', 'sniper', 'scout'];
        
        // Prioritize based on what we can afford
        for (var i = 0; i < unitTypes.length; i++) {
            var type = unitTypes[i];
            var cost = CONFIG.UNITS[type].cost;
            if (res.dollars >= cost.dollars && res.oil >= cost.oil && res.wheat >= cost.wheat) {
                unitType = type;
                break;
            }
        }
        
        if (!unitType) return;
        
        // Build at random barracks
        var b = barracks[Math.floor(Math.random() * barracks.length)];
        var cost = CONFIG.UNITS[unitType].cost;
        
        // Deduct cost
        res.dollars -= cost.dollars;
        res.oil -= cost.oil;
        res.wheat -= cost.wheat;
        
        // Create unit
        var offset = CONFIG.TILE_SIZE * 0.2;
        var unit = Entities.createUnit(
            unitType,
            b.x + (Math.random() - 0.5) * offset,
            b.y + (Math.random() - 0.5) * offset,
            playerIndex
        );
        gameState.units.push(unit);
    },
    
    manageAttacks: function(gameState, playerIndex) {
        var myUnits = gameState.units.filter(function(u) {
            return u.owner === playerIndex && !u.target;
        });
        
        if (myUnits.length < 5) return; // Need at least 5 units to attack
        
        // Find enemy targets
        var enemies = gameState.units.filter(function(u) {
            return u.owner !== playerIndex;
        });
        
        var enemyBuildings = gameState.buildings.filter(function(b) {
            return b.owner !== playerIndex && b.owner !== null;
        });
        
        // Choose target
        var target = null;
        if (enemies.length > 0) {
            target = enemies[Math.floor(Math.random() * enemies.length)];
        } else if (enemyBuildings.length > 0) {
            target = enemyBuildings[Math.floor(Math.random() * enemyBuildings.length)];
        }
        
        if (!target) return;
        
        // Send units to attack
        var attackForce = myUnits.slice(0, Math.min(10, myUnits.length));
        attackForce.forEach(function(unit) {
            unit.target = target;
            unit.moveTarget = null;
        });
    },
    
    tryExpand: function(gameState, playerIndex) {
        var economy = gameState.economies[playerIndex];
        if (!economy) return;
        
        var res = economy.resources;
        
        // Try to build defense tower
        if (res.dollars >= 150 && res.oil >= 30 && res.wheat >= 50) {
            var myTiles = [];
            for (var y = 0; y < CONFIG.MAP_HEIGHT; y++) {
                for (var x = 0; x < CONFIG.MAP_WIDTH; x++) {
                    if (gameState.map.tiles[y][x].owner === playerIndex) {
                        myTiles.push({x: x, y: y});
                    }
                }
            }
            
            if (myTiles.length === 0) return;
            
            // Find tile with fewer towers
            var bestTile = null;
            var minTowers = Infinity;
            
            myTiles.forEach(function(tile) {
                var count = gameState.map.tiles[tile.y][tile.x].towerCount || 0;
                if (count < minTowers && count < CONFIG.MAX_TOWERS_PER_TILE) {
                    minTowers = count;
                    bestTile = tile;
                }
            });
            
            if (bestTile && minTowers < 5) {
                var cost = CONFIG.BUILDINGS.defenseTower.cost;
                res.dollars -= cost.dollars;
                res.oil -= cost.oil;
                res.wheat -= cost.wheat;
                
                var px = bestTile.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE * (0.2 + Math.random() * 0.6);
                var py = bestTile.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE * (0.2 + Math.random() * 0.6);
                
                var tower = Entities.createBuilding('defenseTower', px, py, playerIndex);
                gameState.buildings.push(tower);
                gameState.map.tiles[bestTile.y][bestTile.x].towerCount = (gameState.map.tiles[bestTile.y][bestTile.x].towerCount || 0) + 1;
            }
        }
        
        // Try to upgrade towers
        var myTowers = gameState.buildings.filter(function(b) {
            return b.type === 'defenseTower' && b.owner === playerIndex && b.level < CONFIG.MAX_TOWER_LEVEL;
        });
        
        if (myTowers.length > 0 && res.dollars >= 200) {
            var tower = myTowers[Math.floor(Math.random() * myTowers.length)];
            var upgradeCost = Entities.getTowerUpgradeCost(tower.level);
            
            if (res.dollars >= upgradeCost.dollars && res.oil >= upgradeCost.oil && res.wheat >= upgradeCost.wheat) {
                res.dollars -= upgradeCost.dollars;
                res.oil -= upgradeCost.oil;
                res.wheat -= upgradeCost.wheat;
                Entities.upgradeTower(tower);
            }
        }
    },
    
    updateUnits: function(gameState, playerIndex) {
        var self = this;
        
        gameState.units.forEach(function(unit) {
            if (unit.owner !== playerIndex) return;
            
            // If no target, find nearby enemies
            if (!unit.target && !unit.moveTarget) {
                var config = CONFIG.UNITS[unit.type];
                var range = config.range * 1.5;
                
                // Find nearest enemy
                var nearest = null;
                var nearestDist = Infinity;
                
                gameState.units.forEach(function(enemy) {
                    if (enemy.owner === playerIndex) return;
                    var dist = Utils.distance(unit.x, unit.y, enemy.x, enemy.y);
                    if (dist < range && dist < nearestDist) {
                        nearestDist = dist;
                        nearest = enemy;
                    }
                });
                
                // Also check buildings
                gameState.buildings.forEach(function(building) {
                    if (building.owner === playerIndex || building.owner === null) return;
                    var dist = Utils.distance(unit.x, unit.y, building.x, building.y);
                    if (dist < range && dist < nearestDist) {
                        nearestDist = dist;
                        nearest = building;
                    }
                });
                
                if (nearest) {
                    unit.target = nearest;
                }
            }
            
            // Retreat if low health
            if (unit.hp < unit.maxHp * 0.2 && unit.target) {
                unit.target = null;
                // Find friendly building to retreat to
                var friendlyBuilding = gameState.buildings.find(function(b) {
                    return b.owner === playerIndex;
                });
                if (friendlyBuilding) {
                    unit.moveTarget = {
                        x: friendlyBuilding.x + (Math.random() - 0.5) * CONFIG.TILE_SIZE * 0.3,
                        y: friendlyBuilding.y + (Math.random() - 0.5) * CONFIG.TILE_SIZE * 0.3
                    };
                }
            }
        });
    },
    
    // Utility method to get AI player count
    getAICount: function() {
        return this.players.length;
    }
};

window.AI = AI;
