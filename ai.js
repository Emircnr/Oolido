const AISystem = {
    dollars: 0,
    lastUpdate: 0,
    buildCooldown: 0,
    attackCooldown: 0,
    
    init: function() {
        this.dollars = CONFIG.STARTING_DOLLARS;
        this.buildCooldown = 10;
        this.attackCooldown = 60;
    },
    
    update: function(dt) {
        if (GameState.isMultiplayer) return;
        
        this.dollars += dt * 20;
        var owned = MapSystem.getResourceBuildingsForOwner('enemy');
        var self = this;
        owned.forEach(function(rb) {
            self.dollars += (rb.production / 60) * dt * 0.5;
        });
        
        this.lastUpdate += dt;
        if (this.lastUpdate < 2) return;
        this.lastUpdate = 0;
        
        this.buildCooldown -= 2;
        this.attackCooldown -= 2;
        
        this.manageBuildings();
        this.manageProduction();
        this.manageUnits();
    },
    
    manageBuildings: function() {
        if (this.buildCooldown > 0) return;
        
        var ownedTiles = MapSystem.getOwnedTiles('enemy');
        if (ownedTiles.length === 0) return;
        
        var buildings = GameState.buildings.filter(function(b) { return b.owner === 'enemy'; });
        var counts = {};
        buildings.forEach(function(b) { counts[b.type] = (counts[b.type] || 0) + 1; });
        
        var toBuild = null;
        if (!counts.barracks || counts.barracks < 2) toBuild = 'barracks';
        else if (!counts.armorFactory) toBuild = 'armorFactory';
        else if (!counts.airbase) toBuild = 'airbase';
        else if (Math.random() < 0.3) toBuild = Math.random() < 0.5 ? 'mgTurret' : 'missileTurret';
        
        if (!toBuild) return;
        var def = BUILDINGS[toBuild];
        if (this.dollars < def.cost.dollars) return;
        
        var tile = ownedTiles[Math.floor(Math.random() * ownedTiles.length)];
        var x = tile.x + Utils.randomInt(100, CONFIG.TILE_SIZE - def.size - 100);
        var y = tile.y + Utils.randomInt(100, CONFIG.TILE_SIZE - def.size - 100);
        
        this.dollars -= def.cost.dollars;
        var building = EntitySystem.createBuilding(toBuild, x, y, 'enemy');
        GameState.buildings.push(building);
        this.buildCooldown = 15;
    },
    
    manageProduction: function() {
        var self = this;
        var buildings = GameState.buildings.filter(function(b) { return b.owner === 'enemy'; });
        
        buildings.forEach(function(building) {
            var def = BUILDINGS[building.type];
            if (!def.units || building.productionQueue.length >= 3) return;
            
            var unitType = null;
            if (building.type === 'barracks') {
                var roll = Math.random();
                if (roll < 0.4) unitType = 'rifleman';
                else if (roll < 0.6) unitType = 'machinegunner';
                else if (roll < 0.8) unitType = 'rocketeer';
                else unitType = 'sniper';
            } else if (building.type === 'armorFactory') {
                var roll = Math.random();
                if (roll < 0.4) unitType = 'tank';
                else if (roll < 0.7) unitType = 'heavyTank';
                else unitType = 'antiAir';
            } else if (building.type === 'airbase') {
                var roll = Math.random();
                if (roll < 0.4) unitType = 'helicopter';
                else if (roll < 0.7) unitType = 'attackHeli';
                else unitType = 'siha';
            }
            
            if (!unitType) return;
            var unitDef = UNITS[unitType];
            if (self.dollars >= unitDef.cost.dollars) {
                self.dollars -= unitDef.cost.dollars;
                building.productionQueue.push(unitType);
            }
        });
    },
    
    manageUnits: function() {
        var myUnits = GameState.units.filter(function(u) { return u.owner === 'enemy'; });
        var enemyUnits = GameState.units.filter(function(u) { return u.owner === 'player'; });
        var enemyBuildings = GameState.buildings.filter(function(b) { return b.owner === 'player'; });
        
        var idleUnits = myUnits.filter(function(u) { return !u.moveTarget && !u.attackTarget; });
        
        if (idleUnits.length >= 8 && this.attackCooldown <= 0) {
            var target = null;
            var playerHQ = enemyBuildings.find(function(b) { return b.type === 'headquarters'; });
            
            if (playerHQ) {
                target = { x: playerHQ.x + playerHQ.size/2, y: playerHQ.y + playerHQ.size/2 };
            } else if (enemyBuildings.length > 0) {
                var randB = enemyBuildings[Math.floor(Math.random() * enemyBuildings.length)];
                target = { x: randB.x + randB.size/2, y: randB.y + randB.size/2 };
            }
            
            if (target) {
                idleUnits.forEach(function(unit) {
                    unit.moveTarget = { x: target.x + Utils.random(-200, 200), y: target.y + Utils.random(-200, 200) };
                });
                this.attackCooldown = 45;
            }
        }
    }
};

window.AISystem = AISystem;
