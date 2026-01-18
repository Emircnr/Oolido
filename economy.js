/* ============================================
   TACTICAL COMMAND - ECONOMY / STOCK MARKET
   Dynamic pricing based on supply/demand
   ============================================ */

const Economy = {
    dollars: 0,
    resources: {},
    market: {},
    priceHistory: {},
    lastPriceUpdate: 0,
    priceUpdateInterval: 10,
    supplyDemand: {},
    warFactor: 1.0,
    
    init() {
        this.dollars = CONFIG.STARTING_DOLLARS;
        this.resources = { oil: 0, gold: 0, wheat: 0, iron: 0, copper: 0, uranium: 0 };
        
        for (const [key, res] of Object.entries(CONFIG.RESOURCES)) {
            this.market[key] = {
                price: res.basePrice,
                basePrice: res.basePrice,
                change: 0,
                changePercent: 0,
                high24h: res.basePrice,
                low24h: res.basePrice,
                volume: 0
            };
            this.priceHistory[key] = [res.basePrice];
            this.supplyDemand[key] = { supply: 0, demand: 0 };
        }
    },
    
    update(dt) {
        this.lastPriceUpdate += dt;
        if (this.lastPriceUpdate >= this.priceUpdateInterval) {
            this.updatePrices();
            this.lastPriceUpdate = 0;
        }
    },
    
    updatePrices() {
        for (const [key, res] of Object.entries(CONFIG.RESOURCES)) {
            const market = this.market[key];
            const sd = this.supplyDemand[key];
            
            const totalActivity = sd.supply + sd.demand + 1;
            const demandRatio = (sd.demand - sd.supply) / totalActivity;
            
            let priceChange = demandRatio * 0.05 * market.price;
            
            if ((key === 'oil' || key === 'iron') && this.warFactor > 1.0) {
                priceChange += market.price * (this.warFactor - 1) * 0.02;
            }
            
            priceChange += (Math.random() - 0.5) * 0.02 * market.price;
            
            const oldPrice = market.price;
            market.price = Math.max(res.basePrice * 0.3, Math.min(res.basePrice * 5, market.price + priceChange));
            
            market.change = market.price - oldPrice;
            market.changePercent = (market.change / oldPrice) * 100;
            
            if (market.price > market.high24h) market.high24h = market.price;
            if (market.price < market.low24h) market.low24h = market.price;
            
            this.priceHistory[key].push(market.price);
            if (this.priceHistory[key].length > 100) this.priceHistory[key].shift();
            
            this.supplyDemand[key] = { supply: 0, demand: 0 };
        }
        
        if (typeof UI !== 'undefined' && UI.stockMarketOpen) UI.updateStockMarket();
    },
    
    sellResource(resourceType, amount) {
        if (this.resources[resourceType] < amount) {
            UI.notify('Yetersiz kaynak!', 'error');
            return { success: false };
        }
        
        const market = this.market[resourceType];
        const totalValue = market.price * amount * 0.995;
        
        this.resources[resourceType] -= amount;
        this.dollars += totalValue;
        
        market.volume += amount;
        this.supplyDemand[resourceType].supply += amount;
        
        UI.notify(`${amount} ${CONFIG.RESOURCES[resourceType].symbol} satıldı: $${totalValue.toFixed(2)}`, 'success');
        return { success: true, earned: totalValue };
    },
    
    buyResource(resourceType, amount) {
        const market = this.market[resourceType];
        const totalCost = market.price * amount * 1.005;
        
        if (this.dollars < totalCost) {
            UI.notify('Yetersiz dolar!', 'error');
            return { success: false };
        }
        
        this.dollars -= totalCost;
        this.resources[resourceType] += amount;
        
        market.volume += amount;
        this.supplyDemand[resourceType].demand += amount;
        
        UI.notify(`${amount} ${CONFIG.RESOURCES[resourceType].symbol} alındı: $${totalCost.toFixed(2)}`, 'success');
        return { success: true, spent: totalCost };
    },
    
    addResource(resourceType, amount) {
        this.resources[resourceType] += amount;
    },
    
    canAfford(cost) {
        return this.dollars >= (cost.dollars || 0);
    },
    
    spend(cost) {
        if (cost.dollars) this.dollars -= cost.dollars;
    },
    
    getMarketState() {
        return { market: this.market, priceHistory: this.priceHistory };
    },
    
    getPriceChart(resourceType, points = 20) {
        const history = this.priceHistory[resourceType];
        if (!history || history.length === 0) return [];
        if (history.length <= points) return history.slice();
        
        const step = Math.floor(history.length / points);
        const data = [];
        for (let i = 0; i < points; i++) {
            data.push(history[Math.min(i * step, history.length - 1)]);
        }
        return data;
    },
    
    formatDollars(amount) {
        if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(2) + 'M';
        if (amount >= 1000) return '$' + (amount / 1000).toFixed(1) + 'K';
        return '$' + amount.toFixed(2);
    }
};

if (typeof window !== 'undefined') window.Economy = Economy;
