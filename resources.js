const ResourceSystem = {
    productionRates: {},
    
    init: function() {
        var self = this;
        Object.keys(CONFIG.RESOURCES).forEach(function(key) {
            self.productionRates[key] = 0;
        });
    },
    
    update: function(dt) {
        var self = this;
        Object.keys(CONFIG.RESOURCES).forEach(function(key) {
            self.productionRates[key] = 0;
        });
        var playerId = GameState.isMultiplayer ? Multiplayer.playerId : 'player';
        var owned = MapSystem.getResourceBuildingsForOwner(playerId);
        owned.forEach(function(rb) {
            if (rb.resourceType) {
                var production = rb.production || 100;
                self.productionRates[rb.resourceType] += production / 60;
                Economy.addResource(rb.resourceType, (production / 60) * dt);
            }
        });
    },
    
    getProductionRate: function(resourceType) {
        return this.productionRates[resourceType] || 0;
    }
};

window.ResourceSystem = ResourceSystem;
