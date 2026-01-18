/* ============================================
   TACTICAL COMMAND - RESOURCE SYSTEM
   Production from captured resource buildings
   ============================================ */

const ResourceSystem = {
    productionRates: {},
    
    init() {
        for (const key of Object.keys(CONFIG.RESOURCES)) {
            this.productionRates[key] = 0;
        }
    },
    
    update(dt) {
        for (const key of Object.keys(CONFIG.RESOURCES)) {
            this.productionRates[key] = 0;
        }
        
        const playerId = GameState.isMultiplayer ? Multiplayer.playerId : 'player';
        const owned = MapSystem.getResourceBuildingsForOwner(playerId);
        
        for (const rb of owned) {
            const def = BUILDINGS[rb.type];
            if (def.resourceType) {
                const production = MapSystem.getResourceBuildingProduction(rb);
                this.productionRates[def.resourceType] += production / 60;
                Economy.addResource(def.resourceType, (production / 60) * dt);
            }
        }
    },
    
    getProductionRate(resourceType) {
        return this.productionRates[resourceType] || 0;
    },
    
    canAfford(cost) {
        return Economy.canAfford(cost);
    },
    
    spend(cost) {
        Economy.spend(cost);
    },
    
    getUpgradeCost(rb) {
        const baseCost = 500;
        const multiplier = Math.pow(1.5, rb.level - 1);
        return { dollars: Math.floor(baseCost * multiplier) };
    }
};

if (typeof window !== 'undefined') window.ResourceSystem = ResourceSystem;
