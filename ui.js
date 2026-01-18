const UI = {
    stockMarketOpen: false,
    chatOpen: false,
    
    init: function() {
        this.setupBuildButtons();
        this.setupStockMarket();
        this.setupChat();
    },
    
    setupBuildButtons: function() {
        var container = document.getElementById('buildButtons');
        if (!container) return;
        container.innerHTML = '';
        
        Object.keys(BUILDING_CATEGORIES).forEach(function(catId) {
            var cat = BUILDING_CATEGORIES[catId];
            var catDiv = document.createElement('div');
            catDiv.className = 'build-category';
            catDiv.innerHTML = '<h4>' + cat.icon + ' ' + cat.name + '</h4>';
            
            Object.keys(BUILDINGS).forEach(function(bId) {
                var def = BUILDINGS[bId];
                if (def.category === catId && def.canBuild) {
                    var btn = document.createElement('button');
                    btn.className = 'build-btn';
                    btn.innerHTML = '<span class="symbol">' + def.symbol + '</span>' +
                        '<span class="name">' + def.name + '</span>' +
                        '<span class="cost">$' + def.cost.dollars + '</span>';
                    btn.addEventListener('click', function() { UI.selectBuildMode(def.id); });
                    catDiv.appendChild(btn);
                }
            });
            
            if (catDiv.querySelectorAll('.build-btn').length > 0) {
                container.appendChild(catDiv);
            }
        });
    },
    
    selectBuildMode: function(buildingType) {
        if (GameState.buildMode === buildingType) {
            GameState.buildMode = null;
        } else {
            GameState.buildMode = buildingType;
            GameState.selectedUnits = [];
            GameState.selectedBuilding = null;
            GameState.selectedResourceBuilding = null;
        }
    },
    
    setupStockMarket: function() {
        var marketBtn = document.getElementById('stockMarketBtn');
        var closeBtn = document.getElementById('closeMarketBtn');
        var self = this;
        if (marketBtn) marketBtn.addEventListener('click', function() { self.toggleStockMarket(); });
        if (closeBtn) closeBtn.addEventListener('click', function() { self.toggleStockMarket(); });
    },
    
    toggleStockMarket: function() {
        this.stockMarketOpen = !this.stockMarketOpen;
        var panel = document.getElementById('stockMarketPanel');
        if (panel) panel.style.display = this.stockMarketOpen ? 'block' : 'none';
        if (this.stockMarketOpen) this.updateStockMarket();
    },
    
    updateStockMarket: function() {
        var container = document.getElementById('stockList');
        if (!container) return;
        
        var html = '';
        Object.keys(CONFIG.RESOURCES).forEach(function(key) {
            var res = CONFIG.RESOURCES[key];
            var market = Economy.market[key];
            var owned = Economy.resources[key];
            var changeClass = market.changePercent >= 0 ? 'positive' : 'negative';
            var arrow = market.changePercent >= 0 ? '▲' : '▼';
            
            html += '<div class="stock-item">' +
                '<div class="stock-header">' +
                '<span class="stock-symbol">' + res.symbol + '</span>' +
                '<span class="stock-name">' + res.name + '</span>' +
                '<span class="stock-price">$' + market.price.toFixed(2) + '</span>' +
                '<span class="stock-change ' + changeClass + '">' + arrow + ' ' + Math.abs(market.changePercent).toFixed(2) + '%</span>' +
                '</div>' +
                '<div class="stock-details">' +
                '<span>Sahip: ' + owned.toFixed(0) + '</span>' +
                '<span>Değer: ' + Economy.formatDollars(owned * market.price) + '</span>' +
                '</div>' +
                '<div class="stock-actions">' +
                '<input type="number" id="amount-' + key + '" value="100" min="1" class="trade-amount">' +
                '<button class="buy-btn" onclick="UI.buyResource(\'' + key + '\')">Al</button>' +
                '<button class="sell-btn" onclick="UI.sellResource(\'' + key + '\')">Sat</button>' +
                '</div></div>';
        });
        container.innerHTML = html;
    },
    
    buyResource: function(resourceType) {
        var input = document.getElementById('amount-' + resourceType);
        var amount = parseInt(input ? input.value : 100);
        if (Economy.buyResource(resourceType, amount)) {
            this.notify(amount + ' ' + CONFIG.RESOURCES[resourceType].symbol + ' alındı', 'success');
        } else {
            this.notify('Yetersiz para!', 'error');
        }
        this.updateStockMarket();
        this.updateResourceDisplay();
    },
    
    sellResource: function(resourceType) {
        var input = document.getElementById('amount-' + resourceType);
        var amount = parseInt(input ? input.value : 100);
        if (Economy.sellResource(resourceType, amount)) {
            this.notify(amount + ' ' + CONFIG.RESOURCES[resourceType].symbol + ' satıldı', 'success');
        } else {
            this.notify('Yetersiz kaynak!', 'error');
        }
        this.updateStockMarket();
        this.updateResourceDisplay();
    },
    
    setupChat: function() {
        var chatBtn = document.getElementById('chatBtn');
        var self = this;
        if (chatBtn) chatBtn.addEventListener('click', function() { self.toggleChat(); });
    },
    
    toggleChat: function() {
        this.chatOpen = !this.chatOpen;
        var panel = document.getElementById('chatPanel');
        if (panel) panel.style.display = this.chatOpen ? 'block' : 'none';
    },
    
    updateResourceDisplay: function() {
        var container = document.getElementById('resourceDisplay');
        if (!container) return;
        
        var html = '<div class="resource dollars">💵 ' + Economy.formatDollars(Economy.dollars) + '</div>';
        Object.keys(CONFIG.RESOURCES).forEach(function(key) {
            var res = CONFIG.RESOURCES[key];
            var amount = Economy.resources[key];
            var rate = ResourceSystem.getProductionRate(key);
            var rateStr = rate > 0 ? '+' + (rate * 60).toFixed(0) + '/m' : '';
            html += '<div class="resource">' +
                '<span class="symbol">' + res.symbol + '</span>' +
                '<span class="amount">' + amount.toFixed(0) + '</span>' +
                '<span class="rate">' + rateStr + '</span></div>';
        });
        container.innerHTML = html;
    },
    
    updateSelectionPanel: function() {
        var panel = document.getElementById('selectionPanel');
        if (!panel) return;
        
        if (GameState.selectedResourceBuilding) {
            var rb = GameState.selectedResourceBuilding;
            var resInfo = CONFIG.RESOURCES[rb.resourceType];
            panel.innerHTML = '<div class="selection-header"><span class="symbol">' + resInfo.symbol + '</span><span class="name">' + resInfo.name + ' Üreticisi</span></div>' +
                '<div class="selection-stats"><div class="stat"><span>Üretim</span><span>' + rb.production + '/dk</span></div>' +
                '<div class="stat"><span>Seviye</span><span>' + rb.level + '/' + rb.maxLevel + '</span></div></div>';
            panel.style.display = 'block';
            return;
        }
        
        if (GameState.selectedBuilding) {
            var building = GameState.selectedBuilding;
            var def = BUILDINGS[building.type];
            var myId = GameState.isMultiplayer ? Multiplayer.playerId : 'player';
            
            var html = '<div class="selection-header"><span class="symbol">' + def.symbol + '</span><span class="name">' + def.name + '</span></div>' +
                '<div class="selection-stats"><div class="stat"><span>HP</span><span>' + building.hp + '/' + building.maxHp + '</span></div></div>';
            
            if (def.units && building.owner === myId) {
                html += '<div class="unit-buttons">';
                def.units.forEach(function(unitType) {
                    var unitDef = UNITS[unitType];
                    html += '<button class="unit-btn" onclick="UI.produceUnit(\'' + unitType + '\')">' +
                        '<span class="symbol">' + unitDef.symbol + '</span>' +
                        '<span class="name">' + unitDef.name + '</span>' +
                        '<span class="cost">$' + unitDef.cost.dollars + '</span></button>';
                });
                html += '</div>';
                
                if (building.productionQueue.length > 0) {
                    html += '<div class="production-queue"><h4>Sıra:</h4>';
                    building.productionQueue.forEach(function(type, i) {
                        var unitDef = UNITS[type];
                        var progress = i === 0 ? Math.floor((building.productionProgress / unitDef.buildTime) * 100) : 0;
                        html += '<div class="queue-item"><span>' + unitDef.symbol + ' ' + unitDef.name + '</span>' +
                            (i === 0 ? '<span class="progress">' + progress + '%</span>' : '') +
                            '<button onclick="UI.cancelProduction(' + i + ')">×</button></div>';
                    });
                    html += '</div>';
                }
            }
            
            panel.innerHTML = html;
            panel.style.display = 'block';
            return;
        }
        
        if (GameState.selectedUnits.length > 0) {
            var types = {};
            GameState.selectedUnits.forEach(function(u) {
                types[u.type] = (types[u.type] || 0) + 1;
            });
            
            var html = '<div class="selection-header"><span>' + GameState.selectedUnits.length + ' birim seçili</span></div><div class="unit-list">';
            Object.keys(types).forEach(function(type) {
                var def = UNITS[type];
                html += '<div class="unit-type"><span class="symbol">' + def.symbol + '</span><span class="name">' + def.name + '</span><span class="count">x' + types[type] + '</span></div>';
            });
            html += '</div>';
            panel.innerHTML = html;
            panel.style.display = 'block';
            return;
        }
        
        panel.style.display = 'none';
    },
    
    produceUnit: function(unitType) {
        if (GameState.selectedBuilding) {
            if (EntitySystem.queueUnit(GameState.selectedBuilding, unitType)) {
                this.notify(UNITS[unitType].name + ' üretime alındı', 'info');
            } else {
                this.notify('Yetersiz para!', 'error');
            }
            this.updateSelectionPanel();
        }
    },
    
    cancelProduction: function(index) {
        if (GameState.selectedBuilding) {
            EntitySystem.cancelProduction(GameState.selectedBuilding, index);
            this.updateSelectionPanel();
        }
    },
    
    showScreen: function(screenId) {
        document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
        var screen = document.getElementById(screenId);
        if (screen) screen.classList.add('active');
    },
    
    updateLoadingProgress: function(percent, text) {
        var bar = document.getElementById('loadingBar');
        var label = document.getElementById('loadingText');
        if (bar) bar.style.width = percent + '%';
        if (label) label.textContent = text;
    },
    
    notify: function(message, type) {
        var container = document.getElementById('notifications');
        if (!container) return;
        
        var notif = document.createElement('div');
        notif.className = 'notification ' + (type || 'info');
        notif.textContent = message;
        container.appendChild(notif);
        
        setTimeout(function() { notif.classList.add('show'); }, 10);
        setTimeout(function() {
            notif.classList.remove('show');
            setTimeout(function() { notif.remove(); }, 300);
        }, 3000);
    },
    
    updateGameUI: function() {
        this.updateResourceDisplay();
        this.updateSelectionPanel();
        var myId = GameState.isMultiplayer ? Multiplayer.playerId : 'player';
        var tc = document.getElementById('territoryCount');
        if (tc) tc.textContent = MapSystem.getTerritoryCount(myId);
    }
};

window.UI = UI;
