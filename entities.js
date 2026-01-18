/* ============================================
   TACTICAL COMMAND - ENTITY SYSTEM
   Units, buildings, hospital healing
   ============================================ */

const EntitySystem = {
    createBuilding(type, x, y, owner) {
        const def = BUILDINGS[type];
        return {
            id: Utils.generateId(),
            entityType: 'building',
            type, x, y, owner,
            hp: def.hp,
            maxHp: def.hp,
            size: def.size || 200,
            productionQueue: [],
            productionProgress: 0,
            rallyPoint: null,
            lastAttack: 0
        };
    },
    
    createUnit(type, x, y, owner) {
        const def = UNITS[type];
        return {
            id: Utils.generateId(),
            entityType: 'unit',
            type, x, y, owner,
            hp: def.hp,
            maxHp: def.hp,
            damage: def.damage,
            attackRange: def.attackRange,
            speed: def.speed,
            selected: false,
            moveTarget: null,
            attackTarget: null,
            lastAttack: 0,
            angle: Math.random() * Math.PI * 2
        };
    },
    
    updateBuilding(building, dt) {
        const def = BUILDINGS[building.type];
        
        // Production queue
        if (building.productionQueue.length > 0 && building.owner === GameState.myId) {
            const unitType = building.productionQueue[0];
            const unitDef = UNITS[unitType];
            
            building.productionProgress += dt;
            
            if (building.productionProgress >= unitDef.buildTime) {
                const angle = Math.random() * Math.PI * 2;
                const dist = building.size + 80;
                const spawnX = building.x + building.size / 2 + Math.cos(angle) * dist;
                const spawnY = building.y + building.size / 2 + Math.sin(angle) * dist;
                
                const unit = this.createUnit(unitType, spawnX, spawnY, building.owner);
                GameState.units.push(unit);
                
                if (building.rallyPoint) {
                    unit.moveTarget = { ...building.rallyPoint };
                }
                
                building.productionQueue.shift();
                building.productionProgress = 0;
                UI.notify(`${unitDef.name} hazır!`, 'success');
            }
        }
        
        // Defensive turrets attack
        if (def.damage && def.attackRange && building.hp > 0) {
            const now = performance.now() / 1000;
            
            if (now - building.lastAttack >= (def.attackSpeed || 1)) {
                const target = Utils.findNearest(
                    building.x + building.size / 2,
                    building.y + building.size / 2,
                    GameState.units,
                    u => {
                        if (u.owner === building.owner || u.hp <= 0) return false;
                        const unitDef = UNITS[u.type];
                        if (def.antiAir && !unitDef.isAir) return false;
                        if (!def.antiAir && unitDef.isAir) return false;
                        
                        const dist = Utils.distance(
                            building.x + building.size / 2,
                            building.y + building.size / 2,
                            u.x, u.y
                        );
                        return dist <= def.attackRange;
                    }
                );
                
                if (target) {
                    Combat.dealDamage(building, target, def.damage);
                    building.lastAttack = now;
                    Combat.createProjectile(
                        building.x + building.size / 2,
                        building.y + building.size / 2,
                        target.x, target.y,
                        building.owner,
                        def.antiAir ? 'missile' : 'machinegun'
                    );
                }
            }
        }
        
        // Hospital healing
        if (def.healRange && def.healRate && building.hp > 0) {
            const cx = building.x + building.size / 2;
            const cy = building.y + building.size / 2;
            
            for (const unit of GameState.units) {
                if (unit.owner !== building.owner) continue;
                if (unit.hp >= unit.maxHp) continue;
                
                if (Utils.distance(cx, cy, unit.x, unit.y) <= def.healRange) {
                    unit.hp = Math.min(unit.maxHp, unit.hp + def.healRate * dt);
                }
            }
        }
    },
    
    updateUnit(unit, dt) {
        const def = UNITS[unit.type];
        
        // Movement
        if (unit.moveTarget) {
            const dx = unit.moveTarget.x - unit.x;
            const dy = unit.moveTarget.y - unit.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 25) {
                unit.angle = Math.atan2(dy, dx);
                const moveSpeed = unit.speed * dt;
                unit.x += (dx / dist) * moveSpeed;
                unit.y += (dy / dist) * moveSpeed;
                
                const bounds = MapSystem.getBounds();
                unit.x = Utils.clamp(unit.x, 50, bounds.width - 50);
                unit.y = Utils.clamp(unit.y, 50, bounds.height - 50);
            } else {
                unit.moveTarget = null;
            }
        }
        
        // Auto-acquire target
        if (!unit.attackTarget && unit.damage > 0) {
            const searchRange = unit.attackRange * 1.2;
            
            const enemy = Utils.findNearest(unit.x, unit.y, GameState.units,
                u => u.owner !== unit.owner && u.hp > 0 && 
                     Utils.distance(unit.x, unit.y, u.x, u.y) <= searchRange
            );
            
            if (enemy) {
                unit.attackTarget = enemy;
            } else {
                const building = Utils.findNearest(unit.x, unit.y, GameState.buildings,
                    b => b.owner !== unit.owner && b.hp > 0 &&
                         Utils.distance(unit.x, unit.y, b.x + b.size/2, b.y + b.size/2) <= searchRange
                );
                if (building) unit.attackTarget = building;
            }
        }
        
        // Attack
        if (unit.attackTarget && unit.damage > 0) {
            const target = unit.attackTarget;
            if (target.hp <= 0) {
                unit.attackTarget = null;
                return;
            }
            
            const tx = target.entityType === 'building' ? target.x + target.size/2 : target.x;
            const ty = target.entityType === 'building' ? target.y + target.size/2 : target.y;
            const dist = Utils.distance(unit.x, unit.y, tx, ty);
            const minRange = def.minRange || 0;
            
            if (dist <= unit.attackRange && dist >= minRange) {
                const now = performance.now() / 1000;
                
                if (now - unit.lastAttack >= def.attackSpeed) {
                    let damage = unit.damage;
                    
                    if (def.bonusVsVehicle && target.entityType === 'unit') {
                        const targetDef = UNITS[target.type];
                        if (targetDef?.category === 'vehicle') {
                            damage *= def.bonusVsVehicle;
                        }
                    }
                    
                    if (def.bonusVsBuilding && target.entityType === 'building') {
                        damage *= def.bonusVsBuilding;
                    }
                    
                    Combat.dealDamage(unit, target, damage);
                    unit.lastAttack = now;
                    Combat.createProjectile(unit.x, unit.y, tx, ty, unit.owner, def.effectType || 'bullet');
                    unit.angle = Math.atan2(ty - unit.y, tx - unit.x);
                }
            } else if (!unit.moveTarget) {
                unit.moveTarget = { x: tx, y: ty };
            }
        }
        
        // Medic healing
        if (def.healRate && def.healRange) {
            for (const ally of GameState.units) {
                if (ally.owner !== unit.owner || ally.id === unit.id) continue;
                if (ally.hp >= ally.maxHp) continue;
                
                if (Utils.distance(unit.x, unit.y, ally.x, ally.y) <= def.healRange) {
                    ally.hp = Math.min(ally.maxHp, ally.hp + def.healRate * dt);
                }
            }
        }
    },
    
    queueUnit(building, unitType) {
        const def = BUILDINGS[building.type];
        const unitDef = UNITS[unitType];
        
        if (!def.units?.includes(unitType)) {
            UI.notify('Bu yapı bu birimi üretemez!', 'error');
            return false;
        }
        
        if (GameState.dollars < unitDef.cost.dollars) {
            UI.notify('Yetersiz dolar!', 'error');
            return false;
        }
        
        GameState.dollars -= unitDef.cost.dollars;
        building.productionQueue.push(unitType);
        return true;
    },
    
    canBuildAt(type, x, y) {
        const def = BUILDINGS[type];
        const size = def.size || 200;
        
        const tile = MapSystem.getTileAtPosition(x + size/2, y + size/2);
        if (!tile || tile.owner !== GameState.myId) {
            return { can: false, reason: 'Kendi bölgenizde inşa edin!' };
        }
        
        for (const b of GameState.buildings) {
            if (Utils.rectsOverlap(x, y, size, size, b.x, b.y, b.size, b.size)) {
                return { can: false, reason: 'Yapı ile çakışıyor!' };
            }
        }
        
        for (const rb of MapSystem.resourceBuildings) {
            const half = rb.size / 2;
            if (Utils.rectsOverlap(x, y, size, size, rb.x - half, rb.y - half, rb.size, rb.size)) {
                return { can: false, reason: 'Kaynak ile çakışıyor!' };
            }
        }
        
        return { can: true };
    },
    
    placeBuilding(type, x, y) {
        const def = BUILDINGS[type];
        const check = this.canBuildAt(type, x, y);
        
        if (!check.can) {
            UI.notify(check.reason, 'error');
            return false;
        }
        
        if (GameState.dollars < def.cost.dollars) {
            UI.notify('Yetersiz dolar!', 'error');
            return false;
        }
        
        GameState.dollars -= def.cost.dollars;
        const building = this.createBuilding(type, x, y, GameState.myId);
        GameState.buildings.push(building);
        UI.notify(`${def.name} inşa edildi!`, 'success');
        return true;
    },
    
    getEntityAtPoint(x, y) {
        for (const unit of GameState.units) {
            if (Utils.distance(x, y, unit.x, unit.y) < 50) return unit;
        }
        
        for (const b of GameState.buildings) {
            if (Utils.pointInRect(x, y, b.x, b.y, b.size, b.size)) return b;
        }
        
        const rb = MapSystem.getResourceBuildingAtPoint(x, y);
        if (rb) return { ...rb, entityType: 'resourceBuilding' };
        
        return null;
    },
    
    removeDeadEntities() {
        // Check HQ
        const myHQ = GameState.buildings.find(b => b.owner === GameState.myId && b.type === 'headquarters');
        if (!myHQ || myHQ.hp <= 0) {
            Game.endGame(false);
            return;
        }
        
        if (!Multiplayer.isMultiplayer) {
            const enemyHQ = GameState.buildings.find(b => b.owner === 'enemy' && b.type === 'headquarters');
            if (!enemyHQ || enemyHQ.hp <= 0) {
                Game.endGame(true);
                return;
            }
        }
        
        GameState.buildings = GameState.buildings.filter(b => b.hp > 0);
        GameState.units = GameState.units.filter(u => u.hp > 0);
        GameState.selectedUnits = GameState.selectedUnits.filter(u => u.hp > 0 && GameState.units.includes(u));
        
        if (GameState.selectedBuilding && !GameState.buildings.includes(GameState.selectedBuilding)) {
            GameState.selectedBuilding = null;
        }
    }
};

if (typeof window !== 'undefined') window.EntitySystem = EntitySystem;
