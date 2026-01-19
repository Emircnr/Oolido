// Ekonomi Yönetim Sistemi
class Economy {
    constructor(playerId) {
        this.playerId = playerId;
        this.resources = {
            dollars: CONFIG.STARTING_DOLLARS,
            oil: CONFIG.STARTING_OIL,
            wheat: CONFIG.STARTING_WHEAT
        };
        this.ammo = CONFIG.STARTING_AMMO;
        this.movement = CONFIG.STARTING_MOVEMENT;
        this.production = {
            dollars: 0,
            oil: 0,
            wheat: 0
        };
        this.marketListings = []; // Oyuncunun marketteki ilanları
    }
    
    // Kaynak ekleme
    addResource(type, amount) {
        if (this.resources.hasOwnProperty(type)) {
            this.resources[type] += amount;
            return true;
        }
        return false;
    }
    
    // Kaynak harcama
    spendResource(type, amount) {
        if (this.resources.hasOwnProperty(type) && this.resources[type] >= amount) {
            this.resources[type] -= amount;
            return true;
        }
        return false;
    }
    
    // Birden fazla kaynak harcama
    spendResources(costs) {
        // Önce yeterli kaynak var mı kontrol et
        for (const [type, amount] of Object.entries(costs)) {
            if (type === 'ammo') {
                if (this.ammo < amount) return false;
            } else if (type === 'movement') {
                if (this.movement < amount) return false;
            } else if (!this.resources.hasOwnProperty(type) || this.resources[type] < amount) {
                return false;
            }
        }
        
        // Hepsini harca
        for (const [type, amount] of Object.entries(costs)) {
            if (type === 'ammo') {
                this.ammo -= amount;
            } else if (type === 'movement') {
                this.movement -= amount;
            } else {
                this.resources[type] -= amount;
            }
        }
        return true;
    }
    
    // Kaynak yeterli mi?
    canAfford(costs) {
        for (const [type, amount] of Object.entries(costs)) {
            if (type === 'ammo') {
                if (this.ammo < amount) return false;
            } else if (type === 'movement') {
                if (this.movement < amount) return false;
            } else if (!this.resources.hasOwnProperty(type) || this.resources[type] < amount) {
                return false;
            }
        }
        return true;
    }
    
    // Mermi ekleme
    addAmmo(amount) {
        this.ammo += amount;
    }
    
    // Mermi harcama
    spendAmmo(amount) {
        if (this.ammo >= amount) {
            this.ammo -= amount;
            return true;
        }
        return false;
    }
    
    // Hareket puanı ekleme
    addMovement(amount) {
        this.movement += amount;
    }
    
    // Hareket puanı harcama
    spendMovement(amount) {
        if (this.movement >= amount) {
            this.movement -= amount;
            return true;
        }
        return false;
    }
    
    // Marketten mermi satın al
    buyAmmo(quantity) {
        const cost = {
            wheat: CONFIG.MARKET.ammo.cost.wheat * quantity,
            oil: CONFIG.MARKET.ammo.cost.oil * quantity
        };
        
        if (this.canAfford(cost)) {
            this.spendResources(cost);
            this.addAmmo(quantity);
            return true;
        }
        return false;
    }
    
    // Marketten hareket puanı satın al
    buyMovement(quantity) {
        const cost = {
            dollars: CONFIG.MARKET.movement.cost.dollars * quantity,
            wheat: CONFIG.MARKET.movement.cost.wheat * quantity,
            oil: CONFIG.MARKET.movement.cost.oil * quantity
        };
        
        if (this.canAfford(cost)) {
            this.spendResources(cost);
            this.addMovement(quantity);
            return true;
        }
        return false;
    }
    
    // Kaynak sat (dolar karşılığı)
    sellResource(type, quantity) {
        let sellPrice = 0;
        let success = false;
        
        if (type === 'oil' && this.resources.oil >= quantity) {
            sellPrice = Math.floor(CONFIG.RESOURCES.oil.basePrice * CONFIG.SELL_RATES.oil * quantity);
            this.resources.oil -= quantity;
            success = true;
        } else if (type === 'wheat' && this.resources.wheat >= quantity) {
            sellPrice = Math.floor(CONFIG.RESOURCES.wheat.basePrice * CONFIG.SELL_RATES.wheat * quantity);
            this.resources.wheat -= quantity;
            success = true;
        } else if (type === 'ammo' && this.ammo >= quantity) {
            sellPrice = CONFIG.SELL_RATES.ammo * quantity;
            this.ammo -= quantity;
            success = true;
        } else if (type === 'movement' && this.movement >= quantity) {
            sellPrice = CONFIG.SELL_RATES.movement * quantity;
            this.movement -= quantity;
            success = true;
        }
        
        if (success) {
            this.resources.dollars += sellPrice;
            return sellPrice;
        }
        return 0;
    }
    
    // Market ilanı oluştur (multiplayer için)
    createListing(resourceType, quantity, pricePerUnit) {
        // Kaynağı kontrol et ve ayır
        let hasResource = false;
        if (resourceType === 'oil' && this.resources.oil >= quantity) {
            this.resources.oil -= quantity;
            hasResource = true;
        } else if (resourceType === 'wheat' && this.resources.wheat >= quantity) {
            this.resources.wheat -= quantity;
            hasResource = true;
        } else if (resourceType === 'ammo' && this.ammo >= quantity) {
            this.ammo -= quantity;
            hasResource = true;
        } else if (resourceType === 'movement' && this.movement >= quantity) {
            this.movement -= quantity;
            hasResource = true;
        }
        
        if (hasResource) {
            const listing = {
                id: generateId(),
                sellerId: this.playerId,
                resourceType,
                quantity,
                pricePerUnit,
                totalPrice: quantity * pricePerUnit,
                timestamp: Date.now()
            };
            this.marketListings.push(listing);
            return listing;
        }
        return null;
    }
    
    // Market ilanını iptal et
    cancelListing(listingId) {
        const index = this.marketListings.findIndex(l => l.id === listingId);
        if (index === -1) return false;
        
        const listing = this.marketListings[index];
        
        // Kaynağı geri ver
        if (listing.resourceType === 'oil') {
            this.resources.oil += listing.quantity;
        } else if (listing.resourceType === 'wheat') {
            this.resources.wheat += listing.quantity;
        } else if (listing.resourceType === 'ammo') {
            this.ammo += listing.quantity;
        } else if (listing.resourceType === 'movement') {
            this.movement += listing.quantity;
        }
        
        this.marketListings.splice(index, 1);
        return true;
    }
    
    // Üretim oranını güncelle
    updateProduction(resourceType, rate) {
        if (this.production.hasOwnProperty(resourceType)) {
            this.production[resourceType] = rate;
        }
    }
    
    // Üretimi uygula (her dakika çağrılır)
    applyProduction(deltaMinutes) {
        for (const [type, rate] of Object.entries(this.production)) {
            if (rate > 0) {
                this.resources[type] += rate * deltaMinutes;
            }
        }
    }
    
    // Kaynak gönder (multiplayer)
    sendResources(targetPlayerId, resourceType, amount) {
        if (resourceType === 'ammo') {
            if (this.ammo >= amount) {
                this.ammo -= amount;
                return { type: resourceType, amount, from: this.playerId, to: targetPlayerId };
            }
        } else if (resourceType === 'movement') {
            if (this.movement >= amount) {
                this.movement -= amount;
                return { type: resourceType, amount, from: this.playerId, to: targetPlayerId };
            }
        } else if (this.resources[resourceType] >= amount) {
            this.resources[resourceType] -= amount;
            return { type: resourceType, amount, from: this.playerId, to: targetPlayerId };
        }
        return null;
    }
    
    // Kaynak al (multiplayer)
    receiveResources(resourceType, amount) {
        if (resourceType === 'ammo') {
            this.ammo += amount;
        } else if (resourceType === 'movement') {
            this.movement += amount;
        } else if (this.resources.hasOwnProperty(resourceType)) {
            this.resources[resourceType] += amount;
        }
    }
    
    // Durumu kaydet
    getState() {
        return {
            resources: { ...this.resources },
            ammo: this.ammo,
            movement: this.movement,
            production: { ...this.production },
            marketListings: [...this.marketListings]
        };
    }
    
    // Durumu yükle
    loadState(state) {
        if (state.resources) {
            this.resources = { ...state.resources };
        }
        if (typeof state.ammo === 'number') {
            this.ammo = state.ammo;
        }
        if (typeof state.movement === 'number') {
            this.movement = state.movement;
        }
        if (state.production) {
            this.production = { ...state.production };
        }
        if (state.marketListings) {
            this.marketListings = [...state.marketListings];
        }
    }
    
    // Özet bilgi
    getSummary() {
        return {
            dollars: Math.floor(this.resources.dollars),
            oil: Math.floor(this.resources.oil),
            wheat: Math.floor(this.resources.wheat),
            ammo: Math.floor(this.ammo),
            movement: Math.floor(this.movement),
            dollarsPerMin: this.production.dollars,
            oilPerMin: this.production.oil,
            wheatPerMin: this.production.wheat
        };
    }
}

window.Economy = Economy;
