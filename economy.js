const Economy = {
    dollars: 0,
    resources: {},
    market: {},
    priceHistory: {},
    lastPriceUpdate: 0,
    
    init: function() {
        this.dollars = CONFIG.STARTING_DOLLARS;
        this.resources = { oil: 0, gold: 0, wheat: 0, iron: 0, copper: 0, uranium: 0 };
        var self = this;
        Object.keys(CONFIG.RESOURCES).forEach(function(key) {
            var res = CONFIG.RESOURCES[key];
            self.market[key] = {
                price: res.basePrice,
                basePrice: res.basePrice,
                change: 0,
                changePercent: 0,
                volume: 0
            };
            self.priceHistory[key] = [res.basePrice];
        });
    },
    
    update: function(dt) {
        this.lastPriceUpdate += dt;
        if (this.lastPriceUpdate >= 10) {
            this.updatePrices();
            this.lastPriceUpdate = 0;
        }
    },
    
    updatePrices: function() {
        var self = this;
        Object.keys(CONFIG.RESOURCES).forEach(function(key) {
            var market = self.market[key];
            var oldPrice = market.price;
            var change = (Math.random() - 0.5) * 0.04 * market.price;
            market.price = Math.max(market.basePrice * 0.3, Math.min(market.basePrice * 5, market.price + change));
            market.change = market.price - oldPrice;
            market.changePercent = (market.change / oldPrice) * 100;
            self.priceHistory[key].push(market.price);
            if (self.priceHistory[key].length > 100) self.priceHistory[key].shift();
        });
    },
    
    sellResource: function(resourceType, amount) {
        if (this.resources[resourceType] < amount) return false;
        var market = this.market[resourceType];
        var value = market.price * amount * 0.995;
        this.resources[resourceType] -= amount;
        this.dollars += value;
        market.volume += amount;
        return true;
    },
    
    buyResource: function(resourceType, amount) {
        var market = this.market[resourceType];
        var cost = market.price * amount * 1.005;
        if (this.dollars < cost) return false;
        this.dollars -= cost;
        this.resources[resourceType] += amount;
        market.volume += amount;
        return true;
    },
    
    addResource: function(resourceType, amount) {
        this.resources[resourceType] += amount;
    },
    
    canAfford: function(cost) {
        return this.dollars >= (cost.dollars || 0);
    },
    
    spend: function(cost) {
        if (cost.dollars) this.dollars -= cost.dollars;
    },
    
    formatDollars: function(amount) {
        if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(2) + 'M';
        if (amount >= 1000) return '$' + (amount / 1000).toFixed(1) + 'K';
        return '$' + amount.toFixed(0);
    }
};

window.Economy = Economy;
