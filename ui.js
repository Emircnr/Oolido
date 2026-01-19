const UI = {
    elements: {},
    panels: {
        build: false,
        market: false,
        exchange: false,
        players: false
    },
    
    init: function() {
        this.createResourceBar();
        this.createPanelButtons();
        this.createBuildPanel();
        this.createMarketPanel();
        this.createExchangePanel();
        this.createPlayersPanel();
        this.createUnitInfo();
        this.createServerPanel();
    },
    
    createResourceBar: function() {
        var bar = document.createElement('div');
        bar.id = 'resource-bar';
        bar.innerHTML = `
            <div class="resource" id="res-dollars">
                <span class="icon">💵</span>
                <span class="value">0</span>
                <span class="rate">+0/d</span>
            </div>
            <div class="resource" id="res-oil">
                <span class="icon">🛢️</span>
                <span class="value">0</span>
                <span class="rate">+0/d</span>
            </div>
            <div class="resource" id="res-wheat">
                <span class="icon">🌾</span>
                <span class="value">0</span>
                <span class="rate">+0/d</span>
            </div>
            <div class="resource" id="res-ammo">
                <span class="icon">🔹</span>
                <span class="value">0</span>
            </div>
            <div class="resource" id="res-movement">
                <span class="icon">👟</span>
                <span class="value">0</span>
            </div>
        `;
        document.body.appendChild(bar);
        this.elements.resourceBar = bar;
    },
    
    createPanelButtons: function() {
        var container = document.createElement('div');
        container.id = 'panel-buttons';
        container.innerHTML = `
            <button class="panel-btn" data-panel="build">🏗️ İnşa</button>
            <button class="panel-btn" data-panel="market">🛒 Market</button>
            <button class="panel-btn" data-panel="exchange">💱 Borsa</button>
            <button class="panel-btn" data-panel="players">👥 Oyuncular</button>
        `;
        document.body.appendChild(container);
        
        var self = this;
        container.querySelectorAll('.panel-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var panel = btn.dataset.panel;
                self.togglePanel(panel);
            });
        });
    },
    
    createBuildPanel: function() {
        var panel = document.createElement('div');
        panel.id = 'build-panel';
        panel.className = 'popup-panel hidden';
        panel.innerHTML = `
            <div class="panel-header">
                <h3>🏗️ İnşa Menüsü</h3>
                <button class="close-btn">✕</button>
            </div>
            <div class="panel-content">
                <div class="build-section">
                    <h4>Binalar</h4>
                    <div class="build-grid" id="buildings-grid"></div>
                </div>
                <div class="build-section">
                    <h4>Birimler</h4>
                    <div class="build-grid" id="units-grid"></div>
                </div>
            </div>
        `;
        document.body.appendChild(panel);
        this.elements.buildPanel = panel;
        
        var self = this;
        panel.querySelector('.close-btn').addEventListener('click', function() {
            self.togglePanel('build');
        });
        
        this.populateBuildPanel();
    },
    
    populateBuildPanel: function() {
        var buildingsGrid = document.getElementById('buildings-grid');
        var unitsGrid = document.getElementById('units-grid');
        
        // Buildings
        var buildableBuildings = ['barracks', 'defenseTower', 'radar'];
        buildableBuildings.forEach(function(type) {
            var config = BUILDINGS[type];
            if (!config) return;
            
            var item = document.createElement('div');
            item.className = 'build-item';
            item.dataset.type = type;
            item.dataset.category = 'building';
            item.innerHTML = `
                <span class="build-icon">${config.symbol}</span>
                <span class="build-name">${config.name}</span>
                <div class="build-cost">
                    ${config.cost.dollars ? '<span>💵' + config.cost.dollars + '</span>' : ''}
                    ${config.cost.oil ? '<span>🛢️' + config.cost.oil + '</span>' : ''}
                    ${config.cost.wheat ? '<span>🌾' + config.cost.wheat + '</span>' : ''}
                </div>
            `;
            buildingsGrid.appendChild(item);
        });
        
        // Units
        Object.keys(UNITS).forEach(function(type) {
            var config = UNITS[type];
            var item = document.createElement('div');
            item.className = 'build-item';
            item.dataset.type = type;
            item.dataset.category = 'unit';
            item.innerHTML = `
                <span class="build-icon">${config.symbol}</span>
                <span class="build-name">${config.name}</span>
                <div class="build-cost">
                    ${config.cost.dollars ? '<span>💵' + config.cost.dollars + '</span>' : ''}
                    ${config.cost.oil ? '<span>🛢️' + config.cost.oil + '</span>' : ''}
                    ${config.cost.wheat ? '<span>🌾' + config.cost.wheat + '</span>' : ''}
                </div>
            `;
            unitsGrid.appendChild(item);
        });
    },
    
    createMarketPanel: function() {
        var panel = document.createElement('div');
        panel.id = 'market-panel';
        panel.className = 'popup-panel hidden';
        panel.innerHTML = `
            <div class="panel-header">
                <h3>🛒 Market</h3>
                <button class="close-btn">✕</button>
            </div>
            <div class="panel-content">
                <div class="market-item">
                    <div class="market-info">
                        <span class="market-icon">🔹</span>
                        <span class="market-name">Mühimmat</span>
                        <span class="market-price">3🌾 + 1🛢️ = 1🔹</span>
                    </div>
                    <div class="market-controls">
                        <input type="number" id="buy-ammo-amount" value="10" min="1" max="100">
                        <button class="buy-btn" data-item="ammo">Satın Al</button>
                    </div>
                </div>
                <div class="market-item">
                    <div class="market-info">
                        <span class="market-icon">👟</span>
                        <span class="market-name">Hareket Puanı</span>
                        <span class="market-price">5💵 + 1🌾 + 3🛢️ = 1👟</span>
                    </div>
                    <div class="market-controls">
                        <input type="number" id="buy-movement-amount" value="10" min="1" max="100">
                        <button class="buy-btn" data-item="movement">Satın Al</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(panel);
        this.elements.marketPanel = panel;
        
        var self = this;
        panel.querySelector('.close-btn').addEventListener('click', function() {
            self.togglePanel('market');
        });
    },
    
    createExchangePanel: function() {
        var panel = document.createElement('div');
        panel.id = 'exchange-panel';
        panel.className = 'popup-panel hidden';
        panel.innerHTML = `
            <div class="panel-header">
                <h3>💱 Borsa</h3>
                <button class="close-btn">✕</button>
            </div>
            <div class="panel-content">
                <p class="exchange-info">Kaynaklarınızı dolara çevirin (80% değer)</p>
                <div class="exchange-item">
                    <span class="exchange-icon">🛢️</span>
                    <span class="exchange-name">Petrol</span>
                    <input type="number" id="sell-oil-amount" value="10" min="1">
                    <button class="sell-btn" data-resource="oil">Sat</button>
                    <span class="exchange-rate" id="oil-rate">= 0💵</span>
                </div>
                <div class="exchange-item">
                    <span class="exchange-icon">🌾</span>
                    <span class="exchange-name">Buğday</span>
                    <input type="number" id="sell-wheat-amount" value="10" min="1">
                    <button class="sell-btn" data-resource="wheat">Sat</button>
                    <span class="exchange-rate" id="wheat-rate">= 0💵</span>
                </div>
            </div>
        `;
        document.body.appendChild(panel);
        this.elements.exchangePanel = panel;
        
        var self = this;
        panel.querySelector('.close-btn').addEventListener('click', function() {
            self.togglePanel('exchange');
        });
        
        // Update rates on input change
        document.getElementById('sell-oil-amount').addEventListener('input', function() {
            var amount = parseInt(this.value) || 0;
            document.getElementById('oil-rate').textContent = '= ' + Math.floor(amount * CONFIG.EXCHANGE_RATES.oil * 0.8) + '💵';
        });
        document.getElementById('sell-wheat-amount').addEventListener('input', function() {
            var amount = parseInt(this.value) || 0;
            document.getElementById('wheat-rate').textContent = '= ' + Math.floor(amount * CONFIG.EXCHANGE_RATES.wheat * 0.8) + '💵';
        });
    },
    
    createPlayersPanel: function() {
        var panel = document.createElement('div');
        panel.id = 'players-panel';
        panel.className = 'popup-panel hidden';
        panel.innerHTML = `
            <div class="panel-header">
                <h3>👥 Oyuncular</h3>
                <button class="close-btn">✕</button>
            </div>
            <div class="panel-content" id="players-list">
            </div>
        `;
        document.body.appendChild(panel);
        this.elements.playersPanel = panel;
        
        var self = this;
        panel.querySelector('.close-btn').addEventListener('click', function() {
            self.togglePanel('players');
        });
    },
    
    createUnitInfo: function() {
        var info = document.createElement('div');
        info.id = 'unit-info';
        info.className = 'hidden';
        info.innerHTML = `
            <div class="unit-header">
                <span class="unit-icon"></span>
                <span class="unit-name"></span>
            </div>
            <div class="unit-stats">
                <div><span>❤️</span> <span class="stat-hp"></span></div>
                <div><span>⚔️</span> <span class="stat-damage"></span></div>
                <div><span>🎯</span> <span class="stat-range"></span></div>
            </div>
            <div class="unit-actions">
                <button id="btn-attack">⚔️ Saldır</button>
                <button id="btn-stop">🛑 Dur</button>
            </div>
        `;
        document.body.appendChild(info);
        this.elements.unitInfo = info;
    },
    
    createServerPanel: function() {
        var panel = document.createElement('div');
        panel.id = 'server-panel';
        panel.innerHTML = `
            <div class="server-content">
                <h2>🎮 Taktik Komuta</h2>
                <div class="server-options">
                    <div class="player-setup">
                        <input type="text" id="player-name" placeholder="Oyuncu Adı" maxlength="20">
                        <select id="country-select"></select>
                    </div>
                    <div class="server-buttons">
                        <button id="btn-single">🎯 Tek Oyunculu</button>
                        <button id="btn-create">🌐 Sunucu Oluştur</button>
                        <div class="join-section">
                            <input type="text" id="server-code" placeholder="Kod" maxlength="6">
                            <button id="btn-join">🔗 Katıl</button>
                        </div>
                    </div>
                </div>
                <div id="lobby" class="hidden">
                    <h3>Lobi <span id="lobby-code"></span></h3>
                    <div id="lobby-players"></div>
                    <div class="lobby-actions">
                        <button id="btn-ready">✓ Hazır</button>
                        <button id="btn-start" class="hidden">▶️ Başlat</button>
                        <button id="btn-leave">🚪 Çık</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(panel);
        this.elements.serverPanel = panel;
        
        // Populate country select
        var select = document.getElementById('country-select');
        Object.keys(CONFIG.COUNTRIES).forEach(function(key) {
            var country = CONFIG.COUNTRIES[key];
            var option = document.createElement('option');
            option.value = key;
            option.textContent = country.flag + ' ' + country.name;
            select.appendChild(option);
        });
    },
    
    togglePanel: function(panel) {
        var panelEl = this.elements[panel + 'Panel'];
        if (!panelEl) return;
        
        // Close other panels
        var self = this;
        Object.keys(this.panels).forEach(function(p) {
            if (p !== panel && self.panels[p]) {
                self.panels[p] = false;
                self.elements[p + 'Panel'].classList.add('hidden');
            }
        });
        
        this.panels[panel] = !this.panels[panel];
        panelEl.classList.toggle('hidden', !this.panels[panel]);
    },
    
    closeAllPanels: function() {
        var self = this;
        Object.keys(this.panels).forEach(function(p) {
            self.panels[p] = false;
            if (self.elements[p + 'Panel']) {
                self.elements[p + 'Panel'].classList.add('hidden');
            }
        });
    },
    
    updateResources: function(economy) {
        var res = economy.resources;
        var prod = economy.production;
        
        document.querySelector('#res-dollars .value').textContent = Math.floor(res.dollars);
        document.querySelector('#res-oil .value').textContent = Math.floor(res.oil);
        document.querySelector('#res-wheat .value').textContent = Math.floor(res.wheat);
        document.querySelector('#res-ammo .value').textContent = Math.floor(res.ammo);
        document.querySelector('#res-movement .value').textContent = Math.floor(res.movement);
        
        document.querySelector('#res-dollars .rate').textContent = '+' + prod.dollars.toFixed(1) + '/d';
        document.querySelector('#res-oil .rate').textContent = '+' + prod.oil.toFixed(1) + '/d';
        document.querySelector('#res-wheat .rate').textContent = '+' + prod.wheat.toFixed(1) + '/d';
    },
    
    updatePlayers: function(players, buildings, units, mapTiles) {
        var list = document.getElementById('players-list');
        list.innerHTML = '';
        
        players.forEach(function(player, index) {
            var country = CONFIG.COUNTRIES[player.country];
            
            // Count territories
            var territories = 0;
            for (var y = 0; y < mapTiles.length; y++) {
                for (var x = 0; x < mapTiles[y].length; x++) {
                    if (mapTiles[y][x].owner === index) territories++;
                }
            }
            
            // Count buildings and units
            var buildingCount = buildings.filter(function(b) { return b.owner === index; }).length;
            var unitCount = units.filter(function(u) { return u.owner === index; }).length;
            
            var item = document.createElement('div');
            item.className = 'player-item';
            item.style.borderLeft = '4px solid ' + country.primary;
            item.innerHTML = `
                <div class="player-header">
                    <span class="player-flag">${country.flag}</span>
                    <span class="player-name">${player.name}</span>
                </div>
                <div class="player-stats">
                    <span>🗺️ ${territories}</span>
                    <span>🏠 ${buildingCount}</span>
                    <span>👥 ${unitCount}</span>
                </div>
            `;
            list.appendChild(item);
        });
    },
    
    showUnitInfo: function(units) {
        if (units.length === 0) {
            this.elements.unitInfo.classList.add('hidden');
            return;
        }
        
        var unit = units[0];
        var config = CONFIG.UNITS[unit.type];
        if (!config) return;
        
        this.elements.unitInfo.classList.remove('hidden');
        this.elements.unitInfo.querySelector('.unit-icon').textContent = config.icon;
        this.elements.unitInfo.querySelector('.unit-name').textContent = config.name + (units.length > 1 ? ' (+' + (units.length - 1) + ')' : '');
        this.elements.unitInfo.querySelector('.stat-hp').textContent = unit.hp + '/' + unit.maxHp;
        this.elements.unitInfo.querySelector('.stat-damage').textContent = config.damage;
        this.elements.unitInfo.querySelector('.stat-range').textContent = config.range;
    },
    
    hideUnitInfo: function() {
        this.elements.unitInfo.classList.add('hidden');
    },
    
    showLobby: function(code) {
        document.querySelector('.server-options').classList.add('hidden');
        document.getElementById('lobby').classList.remove('hidden');
        document.getElementById('lobby-code').textContent = code;
    },
    
    hideLobby: function() {
        document.querySelector('.server-options').classList.remove('hidden');
        document.getElementById('lobby').classList.add('hidden');
    },
    
    updateLobby: function(data, isHost) {
        var container = document.getElementById('lobby-players');
        container.innerHTML = '';
        
        data.players.forEach(function(player) {
            var country = CONFIG.COUNTRIES[player.country];
            var item = document.createElement('div');
            item.className = 'lobby-player' + (player.ready ? ' ready' : '');
            item.innerHTML = `
                <span class="player-flag">${country.flag}</span>
                <span class="player-name">${player.name}</span>
                <span class="player-status">${player.ready ? '✓' : '⏳'}</span>
            `;
            container.appendChild(item);
        });
        
        // Show start button only for host when all ready
        var allReady = data.players.every(function(p) { return p.ready; });
        document.getElementById('btn-start').classList.toggle('hidden', !isHost || !allReady || data.players.length < 2);
    },
    
    hideServerPanel: function() {
        this.elements.serverPanel.classList.add('hidden');
    },
    
    showServerPanel: function() {
        this.elements.serverPanel.classList.remove('hidden');
        this.hideLobby();
    },
    
    showMessage: function(text, type) {
        var msg = document.createElement('div');
        msg.className = 'game-message ' + (type || 'info');
        msg.textContent = text;
        document.body.appendChild(msg);
        
        setTimeout(function() {
            msg.classList.add('fade-out');
            setTimeout(function() {
                msg.remove();
            }, 500);
        }, 3000);
    }
};

window.UI = UI;
