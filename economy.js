// Economy System - resource management
const Economy = {
    resources: null,
    production: null,
    
    // Initialize economy
    init: function() {
        this.resources = {
            dollars: CONFIG.STARTING_DOLLARS,
            oil: CONFIG.STARTING_OIL,
            wheat: CONFIG.STARTING_WHEAT,
            ammo: CONFIG.STARTING_AMMO,
            movement: CONFIG.STARTING_MOVEMENT
        };
        this.production = {
            dollars: 0,
            oil: 0,
            wheat: 0
        };
    },
    
    // Update production based on owned buildings
    update: function(dt, buildings) {
        // Calculate production rates
        var dollarsRate = 0;
        var oilRate = 0;
        var wheatRate = 0;
        
        buildings.forEach(function(building) {
            var config = BUILDINGS[building.type];
            if (!config || !config.resourceType) return;
            
            var baseProduction = config.baseProduction || 0;
            var levelBonus = 1 + ((building.level || 1) - 1) * (config.levelBonus || 0.05);
            var production = baseProduction * levelBonus;
            
            if (config.resourceType === 'dollars') {
                dollarsRate += production;
            } else if (config.resourceType === 'oil') {
                oilRate += production;
            } else if (config.resourceType === 'wheat') {
                wheatRate += production;
            }
        });
        
        this.production.dollars = dollarsRate;
        this.production.oil = oilRate;
        this.production.wheat = wheatRate;
        
        // Apply production (per minute, so divide by 60)
        this.resources.dollars += dollarsRate * dt / 60;
        this.resources.oil += oilRate * dt / 60;
        this.resources.wheat += wheatRate * dt / 60;
    },
    
    // Check if can afford cost
    canAfford: function(cost) {
        if (cost.dollars && this.resources.dollars < cost.dollars) return false;
        if (cost.oil && this.resources.oil < cost.oil) return false;
        if (cost.wheat && this.resources.wheat < cost.wheat) return false;
        if (cost.ammo && this.resources.ammo < cost.ammo) return false;
        if (cost.movement && this.resources.movement < cost.movement) return false;
        return true;
    },
    
    // Spend resources
    spend: function(cost) {
        if (!this.canAfford(cost)) return false;
        
        if (cost.dollars) this.resources.dollars -= cost.dollars;
        if (cost.oil) this.resources.oil -= cost.oil;
        if (cost.wheat) this.resources.wheat -= cost.wheat;
        if (cost.ammo) this.resources.ammo -= cost.ammo;
        if (cost.movement) this.resources.movement -= cost.movement;
        
        return true;
    },
    
    // Add resources
    add: function(type, amount) {
        if (this.resources.hasOwnProperty(type)) {
            this.resources[type] += amount;
            return true;
        }
        return false;
    },
    
    // Save state
    save: function() {
        return {
            resources: {
                dollars: this.resources.dollars,
                oil: this.resources.oil,
                wheat: this.resources.wheat,
                ammo: this.resources.ammo,
                movement: this.resources.movement
            },
            production: {
                dollars: this.production.dollars,
                oil: this.production.oil,
                wheat: this.production.wheat
            }
        };
    },
    
    // Load state
    load: function(state) {
        if (state.resources) {
            this.resources = {
                dollars: state.resources.dollars || CONFIG.STARTING_DOLLARS,
                oil: state.resources.oil || CONFIG.STARTING_OIL,
                wheat: state.resources.wheat || CONFIG.STARTING_WHEAT,
                ammo: state.resources.ammo || CONFIG.STARTING_AMMO,
                movement: state.resources.movement || CONFIG.STARTING_MOVEMENT
            };
        }
        if (state.production) {
            this.production = {
                dollars: state.production.dollars || 0,
                oil: state.production.oil || 0,
                wheat: state.production.wheat || 0
            };
        }
    }
};

window.Economy = Economy;
