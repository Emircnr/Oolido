const EntitySystem = {
    createUnit: function(type, x, y, owner) {
        var def = UNITS[type];
        return {
            id: Utils.generateId(),
            entityType: 'unit',
            type: type,
            x: x,
            y: y,
            owner: owner,
            hp: def.hp,
            maxHp: def.hp,
            damage: def.damage,
            range: def.range,
            attackRange: def.range,
            speed: def.speed,
            armor: def.armor || 0,
            selected: false,
            moveTarget: null,
            attackTarget: null,
            attackCooldown: 0
        };
    },
    
    createBuilding: function(type, x, y, owner) {
        var def = BUILDINGS[type];
        return {
            id: Utils.generateId(),
            entityType: 'building',
            type: type,
            x: x,
            y: y,
            owner: owner,
            size: def.size || 200,
            hp: def.hp,
            maxHp: def.hp,
            productionQueue: [],
            productionProgress: 0,
            rallyPoint: null,
            attackCooldown: 0
        };
    },
    
    updateUnit: function(unit, dt) {
        var def = UNITS[unit.type];
        
        // Healing from medic
        if (def.healRange && def.healRate) {
            var nearbyUnits = GameState.units.filter(function(u) {
                return u.owner === unit.owner && u.id !== unit.id && u.hp < u.maxHp &&
                       Utils.distance(unit.x, unit.y, u.x, u.y) <= def.healRange;
            });
            nearbyUnits.forEach(function(u) {
                u.hp = Math.min(u.maxHp, u.hp + def.healRate * dt);
            });
        }
        
        // Attack cooldown
        if (unit.attackCooldown > 0) unit.attackCooldown -= dt;
        
        // Attack target
        if (unit.attackTarget && unit.attackTarget.hp > 0 && def.damage > 0) {
            var dist = Utils.distance(unit.x, unit.y, unit.attackTarget.x, unit.attackTarget.y);
            if (dist <= def.range) {
                if (unit.attackCooldown <= 0) {
                    var damage = def.damage;
                    if (def.bonusVsVehicle && unit.attackTarget.isVehicle) damage *= def.bonusVsVehicle;
                    if (def.bonusVsAir && unit.attackTarget.isAir) damage *= def.bonusVsAir;
                    CombatSystem.createProjectile(unit, unit.attackTarget, damage, 'bullet');
                    unit.attackCooldown = 1;
                }
                return;
            } else {
                unit.moveTarget = { x: unit.attackTarget.x, y: unit.attackTarget.y };
            }
        }
        
        // Move to target
        if (unit.moveTarget) {
            var dx = unit.moveTarget.x - unit.x;
            var dy = unit.moveTarget.y - unit.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 10) {
                unit.moveTarget = null;
            } else {
                var moveSpeed = def.speed * dt;
                unit.x += (dx / dist) * moveSpeed;
                unit.y += (dy / dist) * moveSpeed;
            }
        }
        
        // Auto attack nearby enemies
        if (!unit.attackTarget && !unit.moveTarget && def.damage > 0) {
            var enemies = GameState.units.filter(function(u) {
                return u.owner !== unit.owner && u.hp > 0;
            }).concat(GameState.buildings.filter(function(b) {
                return b.owner !== unit.owner && b.hp > 0;
            }));
            
            var closest = null;
            var closestDist = def.range;
            enemies.forEach(function(e) {
                var d = Utils.distance(unit.x, unit.y, e.x, e.y);
                if (d < closestDist) {
                    closestDist = d;
                    closest = e;
                }
            });
            
            if (closest) unit.attackTarget = closest;
        }
    },
    
    updateBuilding: function(building, dt) {
        var def = BUILDINGS[building.type];
        
        // Hospital healing
        if (def.healRange && def.healRate) {
            GameState.units.filter(function(u) {
                return u.owner === building.owner && u.hp < u.maxHp &&
                       Utils.distance(building.x + building.size/2, building.y + building.size/2, u.x, u.y) <= def.healRange;
            }).forEach(function(u) {
                u.hp = Math.min(u.maxHp, u.hp + def.healRate * dt);
            });
        }
        
        // Defensive attack
        if (def.attackRange && def.attackDamage) {
            if (building.attackCooldown > 0) building.attackCooldown -= dt;
            
            if (building.attackCooldown <= 0) {
                var enemies = GameState.units.filter(function(u) {
                    return u.owner !== building.owner && u.hp > 0 &&
                           Utils.distance(building.x + building.size/2, building.y + building.size/2, u.x, u.y) <= def.attackRange;
                });
                
                if (enemies.length > 0) {
                    var target = enemies[0];
                    CombatSystem.createProjectile(
                        { x: building.x + building.size/2, y: building.y + building.size/2 },
                        target,
                        def.attackDamage,
                        'bullet'
                    );
                    building.attackCooldown = def.attackSpeed || 1;
                }
            }
        }
        
        // Production
        if (building.productionQueue.length > 0) {
            var unitType = building.productionQueue[0];
            var unitDef = UNITS[unitType];
            building.productionProgress += dt;
            
            if (building.productionProgress >= unitDef.buildTime) {
                var angle = Math.random() * Math.PI * 2;
                var dist = building.size + 50;
                var x = building.x + building.size/2 + Math.cos(angle) * dist;
                var y = building.y + building.size/2 + Math.sin(angle) * dist;
                
                var unit = this.createUnit(unitType, x, y, building.owner);
                GameState.units.push(unit);
                
                if (building.rallyPoint) {
                    unit.moveTarget = { x: building.rallyPoint.x, y: building.rallyPoint.y };
                }
                
                building.productionQueue.shift();
                building.productionProgress = 0;
            }
        }
    },
    
    queueUnit: function(building, unitType) {
        var def = UNITS[unitType];
        if (!Economy.canAfford(def.cost)) return false;
        Economy.spend(def.cost);
        building.productionQueue.push(unitType);
        return true;
    },
    
    cancelProduction: function(building, index) {
        if (index >= 0 && index < building.productionQueue.length) {
            var unitType = building.productionQueue[index];
            var def = UNITS[unitType];
            Economy.dollars += def.cost.dollars * 0.75;
            building.productionQueue.splice(index, 1);
            if (index === 0) building.productionProgress = 0;
        }
    },
    
    canBuildAt: function(buildingType, x, y) {
        var def = BUILDINGS[buildingType];
        var size = def.size || 200;
        var playerId = GameState.isMultiplayer ? Multiplayer.playerId : 'player';
        
        var tile = MapSystem.getTileAtPosition(x + size/2, y + size/2);
        if (!tile || tile.owner !== playerId) return { can: false, reason: 'Bölge size ait değil' };
        
        if (!Economy.canAfford(def.cost)) return { can: false, reason: 'Yetersiz para' };
        
        for (var i = 0; i < GameState.buildings.length; i++) {
            var b = GameState.buildings[i];
            if (Utils.rectsOverlap(x, y, size, size, b.x, b.y, b.size, b.size)) {
                return { can: false, reason: 'Başka bina var' };
            }
        }
        
        for (var i = 0; i < MapSystem.resourceBuildings.length; i++) {
            var rb = MapSystem.resourceBuildings[i];
            var rbHalf = rb.size / 2;
            if (Utils.rectsOverlap(x, y, size, size, rb.x - rbHalf, rb.y - rbHalf, rb.size, rb.size)) {
                return { can: false, reason: 'Kaynak binası var' };
            }
        }
        
        return { can: true };
    },
    
    placeBuilding: function(buildingType, x, y) {
        var check = this.canBuildAt(buildingType, x, y);
        if (!check.can) return false;
        
        var def = BUILDINGS[buildingType];
        var playerId = GameState.isMultiplayer ? Multiplayer.playerId : 'player';
        
        Economy.spend(def.cost);
        var building = this.createBuilding(buildingType, x, y, playerId);
        GameState.buildings.push(building);
        return true;
    },
    
    getEntityAtPoint: function(x, y) {
        // Check units
        for (var i = 0; i < GameState.units.length; i++) {
            var u = GameState.units[i];
            if (Utils.distance(x, y, u.x, u.y) < 50) return u;
        }
        
        // Check buildings
        for (var i = 0; i < GameState.buildings.length; i++) {
            var b = GameState.buildings[i];
            if (Utils.pointInRect(x, y, b.x, b.y, b.size, b.size)) return b;
        }
        
        // Check resource buildings
        for (var i = 0; i < MapSystem.resourceBuildings.length; i++) {
            var rb = MapSystem.resourceBuildings[i];
            if (Utils.distance(x, y, rb.x, rb.y) < rb.size / 2) {
                rb.entityType = 'resourceBuilding';
                return rb;
            }
        }
        
        return null;
    },
    
    removeDeadEntities: function() {
        GameState.units = GameState.units.filter(function(u) { return u.hp > 0; });
        GameState.buildings = GameState.buildings.filter(function(b) { return b.hp > 0; });
    }
};

window.EntitySystem = EntitySystem;
