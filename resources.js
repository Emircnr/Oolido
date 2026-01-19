// Kaynak Üretim Sistemi
class ResourceSystem {
    constructor(gameState) {
        this.gameState = gameState;
        this.lastUpdate = Date.now();
    }
    
    // Bir oyuncunun toplam üretimini hesapla
    calculateProduction(playerId) {
        const production = {
            dollars: 0,
            oil: 0,
            wheat: 0
        };
        
        // Oyuncunun binalarını kontrol et
        for (const building of this.gameState.buildings) {
            if (building.owner !== playerId) continue;
            
            const config = BUILDINGS[building.type];
            if (!config || !config.resourceType) continue;
            
            // Seviye bonusunu hesapla
            const level = building.level || 1;
            const levelMultiplier = 1 + (level - 1) * config.levelBonus;
            const baseProduction = config.baseProduction || 0;
            
            production[config.resourceType] += baseProduction * levelMultiplier;
        }
        
        return production;
    }
    
    // Tüm oyuncuların üretimini güncelle
    updateAllProduction() {
        const players = this.gameState.players || {};
        
        for (const playerId of Object.keys(players)) {
            const economy = this.gameState.economies[playerId];
            if (!economy) continue;
            
            const production = this.calculateProduction(playerId);
            economy.updateProduction('dollars', production.dollars);
            economy.updateProduction('oil', production.oil);
            economy.updateProduction('wheat', production.wheat);
        }
    }
    
    // Kaynakları üret (periyodik olarak çağrılır)
    update() {
        const now = Date.now();
        const deltaMs = now - this.lastUpdate;
        const deltaMinutes = deltaMs / 60000;
        
        if (deltaMinutes < 0.01) return; // Çok kısa sürede güncelleme yapma
        
        this.lastUpdate = now;
        
        // Her oyuncunun ekonomisini güncelle
        const players = this.gameState.players || {};
        
        for (const playerId of Object.keys(players)) {
            const economy = this.gameState.economies[playerId];
            if (!economy) continue;
            
            // Üretimi uygula
            economy.applyProduction(deltaMinutes);
        }
    }
    
    // Kaynak binası geliştirme maliyetini hesapla
    getUpgradeCost(building) {
        const config = BUILDINGS[building.type];
        if (!config || !config.upgradeCost) return null;
        
        const level = building.level || 1;
        const multiplier = Math.pow(config.upgradeCostMultiplier, level - 1);
        
        const cost = {};
        for (const [resource, amount] of Object.entries(config.upgradeCost)) {
            cost[resource] = Math.ceil(amount * multiplier);
        }
        
        return cost;
    }
    
    // Kaynak binasını geliştir
    upgradeBuilding(building, economy) {
        const config = BUILDINGS[building.type];
        if (!config || !config.maxLevel) return false;
        
        const currentLevel = building.level || 1;
        if (currentLevel >= config.maxLevel) return false;
        
        const cost = this.getUpgradeCost(building);
        if (!cost) return false;
        
        if (!economy.canAfford(cost)) return false;
        
        economy.spendResources(cost);
        building.level = currentLevel + 1;
        
        // Üretimi yeniden hesapla
        this.updateAllProduction();
        
        return true;
    }
    
    // Bir kaynağın toplam üretim kapasitesini al
    getTotalProduction(playerId, resourceType) {
        const production = this.calculateProduction(playerId);
        return production[resourceType] || 0;
    }
    
    // Belirli türdeki kaynak binalarını say
    countResourceBuildings(playerId, resourceType) {
        let count = 0;
        for (const building of this.gameState.buildings) {
            if (building.owner !== playerId) continue;
            const config = BUILDINGS[building.type];
            if (config && config.resourceType === resourceType) {
                count++;
            }
        }
        return count;
    }
}

window.ResourceSystem = ResourceSystem;
