/* ============================================
   TACTICAL COMMAND - UI SYSTEM
   Stock market, chat, resource transfer
   ============================================ */

const UI = {
    notifications: [],
    chatMessages: [],
    stockMarketOpen: false,
    chatOpen: false,
    sendResourceOpen: false,
    selectedTradeResource: null,
    
    init() {
        this.setupBuildButtons();
        this.setupStockMarket();
        this.setupChat();
        this.setupResourceSending();
    },
    
    setupBuildButtons() {
        const container = document.getElementById('buildButtons');
        if (!container) return;
        
        container.innerHTML = '';
        
        for (const [catId, cat] of Object.entries(BUILDING_CATEGORIES)) {
            const catDiv = document.createElement('div');
            catDiv.className = 'build-category';
            catDiv.innerHTML = `<h4>${cat.icon} ${cat.name}</h4>`;
            
            const buildingsInCat = Object.values(BUILDINGS).filter(b => 
                b.category === catId && b.canBuild
            );
            
            for (const def of buildingsInCat) {
                const btn = document.createElement('button');
                btn.className = 'build-btn';
                btn.innerHTML = `
                    <span class="symbol">${def.symbol}</span>
                    <span class="name">${def.name}</span>
                    <span class="cost">$${def.cost.dollars}</span>
                `;
                btn.title = def.description;
                btn.addEventListener('click', () => this.selectBuildMode(def.id));
                catDiv.appendChild(btn);
            }
            
            if (buildingsInCat.length > 0) {
                container.appendChild(catDiv);
            }
        }
    },
    
    selectBuildMode(buildingType) {
        if (GameState.buildMode === buildingType) {
            GameState.buildMode = null;
        } else {
            GameState.buildMode = buildingType;
            GameState.selectedUnits = [];
            GameState.selectedBuilding = null;
            GameState.selectedResourceBuilding = null;
        }
        this.updateBuildButtons();
    },
    
    updateBuildButtons() {
        document.querySelectorAll('.build-btn').forEach(btn => {
            btn.classList.remove('active');
        });
    },
    
    setupStockMarket() {
        const marketBtn = document.getElementById('stockMarketBtn');
        if (marketBtn) {
            marketBtn.addEventListener('click', () => this.toggleStockMarket());
        }
        
        const closeBtn = document.getElementById('closeMarketBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.toggleStockMarket());
        }
    },
    
    toggleStockMarket() {
        this.stockMarketOpen = !this.stockMarketOpen;
        const panel = document.getElementById('stockMarketPanel');
        if (panel) {
            panel.style.display = this.stockMarketOpen ? 'block' : 'none';
        }
        if (this.stockMarketOpen) {
            this.updateStockMarket();
        }
    },
    
    updateStockMarket() {
        const container = document.getElementById('stockList');
        if (!container) return;
        
        let html = '';
        
        for (const [key, res] of Object.entries(CONFIG.RESOURCES)) {
            const market = Economy.market[key];
            const owned = Economy.resources[key];
            const changeClass = market.changePercent >= 0 ? 'positive' : 'negative';
            const arrow = market.changePercent >= 0 ? '▲' : '▼';
            
            html += `
                <div class="stock-item" data-resource="${key}">
                    <div class="stock-header">
                        <span class="stock-symbol">${res.symbol}</span>
                        <span class="stock-name">${res.name}</span>
                        <span class="stock-price">$${market.price.toFixed(2)}</span>
                        <span class="stock-change ${changeClass}">${arrow} ${Math.abs(market.changePercent).toFixed(2)}%</span>
                    </div>
                    <div class="stock-details">
                        <span class="owned">Sahip: ${owned.toFixed(0)}</span>
                        <span class="value">Değer: ${Economy.formatDollars(owned * market.price)}</span>
                    </div>
                    <div class="stock-chart">
                        <canvas id="chart-${key}" width="200" height="50"></canvas>
                    </div>
                    <div class="stock-actions">
                        <input type="number" id="amount-${key}" value="100" min="1" class="trade-amount">
                        <button class="buy-btn" onclick="UI.buyResource('${key}')">Al</button>
                        <button class="sell-btn" onclick="UI.sellResource('${key}')">Sat</button>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
        
        // Draw charts
        for (const key of Object.keys(CONFIG.RESOURCES)) {
            this.drawPriceChart(key);
        }
    },
    
    drawPriceChart(resourceType) {
        const canvas = document.getElementById(`chart-${resourceType}`);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const data = Economy.getPriceChart(resourceType, 20);
        
        if (data.length < 2) return;
        
        const min = Math.min(...data) * 0.95;
        const max = Math.max(...data) * 1.05;
        const range = max - min || 1;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw line
        const market = Economy.market[resourceType];
        ctx.strokeStyle = market.changePercent >= 0 ? '#00ff88' : '#ff3355';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let i = 0; i < data.length; i++) {
            const x = (i / (data.length - 1)) * canvas.width;
            const y = canvas.height - ((data[i] - min) / range) * canvas.height;
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        
        ctx.stroke();
    },
    
    buyResource(resourceType) {
        const input = document.getElementById(`amount-${resourceType}`);
        const amount = parseInt(input?.value || 100);
        Economy.buyResource(resourceType, amount);
        this.updateStockMarket();
        this.updateResourceDisplay();
    },
    
    sellResource(resourceType) {
        const input = document.getElementById(`amount-${resourceType}`);
        const amount = parseInt(input?.value || 100);
        Economy.sellResource(resourceType, amount);
        this.updateStockMarket();
        this.updateResourceDisplay();
    },
    
    setupChat() {
        const chatBtn = document.getElementById('chatBtn');
        if (chatBtn) {
            chatBtn.addEventListener('click', () => this.toggleChat());
        }
        
        const sendBtn = document.getElementById('sendChatBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendChatMessage());
        }
        
        const input = document.getElementById('chatInput');
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendChatMessage();
            });
        }
    },
    
    toggleChat() {
        this.chatOpen = !this.chatOpen;
        const panel = document.getElementById('chatPanel');
        if (panel) {
            panel.style.display = this.chatOpen ? 'block' : 'none';
        }
    },
    
    async sendChatMessage() {
        const input = document.getElementById('chatInput');
        const message = input?.value.trim();
        if (!message) return;
        
        if (GameState.isMultiplayer) {
            await Multiplayer.sendChat();
        } else {
            // Single player - local chat
            this.addChatMessage({
                senderName: 'Siz',
                message: message,
                isPrivate: false
            });
        }
        
        if (input) input.value = '';
    },
    
    addChatMessage(msg) {
        this.chatMessages.push(msg);
        this.updateChatDisplay();
    },
    
    updateChatDisplay() {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        container.innerHTML = this.chatMessages.slice(-50).map(msg => `
            <div class="chat-message ${msg.isPrivate ? 'private' : ''}">
                <span class="sender">${msg.senderName}${msg.isPrivate ? ' (özel)' : ''}:</span>
                <span class="text">${msg.message}</span>
            </div>
        `).join('');
        
        container.scrollTop = container.scrollHeight;
    },
    
    setupResourceSending() {
        const sendBtn = document.getElementById('sendResourceBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.toggleSendResource());
        }
    },
    
    toggleSendResource() {
        this.sendResourceOpen = !this.sendResourceOpen;
        const panel = document.getElementById('sendResourcePanel');
        if (panel) {
            panel.style.display = this.sendResourceOpen ? 'block' : 'none';
            if (this.sendResourceOpen) {
                this.updateSendResourcePanel();
            }
        }
    },
    
    updateSendResourcePanel() {
        const container = document.getElementById('sendResourceContent');
        if (!container || !GameState.isMultiplayer) return;
        
        const players = Multiplayer.getOtherPlayers();
        
        let html = `
            <div class="send-resource-form">
                <label>Oyuncu:</label>
                <select id="targetPlayer">
                    ${players.map(p => `<option value="${p.id}">${COUNTRIES[p.country].flag} ${p.name}</option>`).join('')}
                </select>
                
                <label>Kaynak:</label>
                <select id="sendResourceType">
                    ${Object.entries(CONFIG.RESOURCES).map(([key, res]) => 
                        `<option value="${key}">${res.symbol} ${res.name} (${Economy.resources[key].toFixed(0)})</option>`
                    ).join('')}
                </select>
                
                <label>Miktar:</label>
                <input type="number" id="sendResourceAmount" value="100" min="1">
                
                <button onclick="UI.executeSendResource()">Gönder</button>
            </div>
        `;
        
        container.innerHTML = html;
    },
    
    async executeSendResource() {
        const targetId = document.getElementById('targetPlayer')?.value;
        const resourceType = document.getElementById('sendResourceType')?.value;
        const amount = parseInt(document.getElementById('sendResourceAmount')?.value || 0);
        
        if (!targetId || !resourceType || amount <= 0) {
            this.notify('Geçersiz değerler!', 'error');
            return;
        }
        
        await Multiplayer.sendResources(targetId, resourceType, amount);
        this.updateSendResourcePanel();
    },
    
    updateResourceDisplay() {
        const container = document.getElementById('resourceDisplay');
        if (!container) return;
        
        let html = `<div class="resource dollars">💵 ${Economy.formatDollars(Economy.dollars)}</div>`;
        
        for (const [key, res] of Object.entries(CONFIG.RESOURCES)) {
            const amount = Economy.resources[key];
            const rate = ResourceSystem.getProductionRate(key);
            const rateStr = rate > 0 ? `+${(rate * 60).toFixed(0)}/m` : '';
            
            html += `
                <div class="resource ${key}">
                    <span class="symbol">${res.symbol}</span>
                    <span class="amount">${amount.toFixed(0)}</span>
                    <span class="rate">${rateStr}</span>
                </div>
            `;
        }
        
        container.innerHTML = html;
    },
    
    updateSelectionPanel() {
        const panel = document.getElementById('selectionPanel');
        if (!panel) return;
        
        // Resource building selected
        if (GameState.selectedResourceBuilding) {
            const rb = GameState.selectedResourceBuilding;
            const def = BUILDINGS[rb.type];
            const resInfo = CONFIG.RESOURCES[rb.resourceType];
            const production = MapSystem.getResourceBuildingProduction(rb);
            const upgradeCost = ResourceSystem.getUpgradeCost(rb);
            
            panel.innerHTML = `
                <div class="selection-header">
                    <span class="symbol">${resInfo.symbol}</span>
                    <span class="name">${def.name}</span>
                </div>
                <div class="selection-stats">
                    <div class="stat">
                        <span class="label">Seviye</span>
                        <span class="value">${rb.level} / ${rb.maxLevel}</span>
                    </div>
                    <div class="stat">
                        <span class="label">Üretim</span>
                        <span class="value">${production.toFixed(0)}/dk ${resInfo.name}</span>
                    </div>
                    <div class="stat">
                        <span class="label">HP</span>
                        <span class="value">${rb.hp} / ${rb.maxHp}</span>
                    </div>
                </div>
                ${rb.level < rb.maxLevel ? `
                    <button class="upgrade-btn" onclick="UI.upgradeResourceBuilding()">
                        Yükselt (${Economy.formatDollars(upgradeCost.dollars)})
                    </button>
                ` : '<div class="max-level">MAKS SEVİYE</div>'}
            `;
            panel.style.display = 'block';
            return;
        }
        
        // Building selected
        if (GameState.selectedBuilding) {
            const building = GameState.selectedBuilding;
            const def = BUILDINGS[building.type];
            const myId = GameState.isMultiplayer ? Multiplayer.playerId : 'player';
            
            let html = `
                <div class="selection-header">
                    <span class="symbol">${def.symbol}</span>
                    <span class="name">${def.name}</span>
                </div>
                <div class="selection-stats">
                    <div class="stat">
                        <span class="label">HP</span>
                        <span class="value">${building.hp} / ${building.maxHp}</span>
                    </div>
                </div>
            `;
            
            // Production queue
            if (def.units && building.owner === myId) {
                html += '<div class="unit-buttons">';
                for (const unitType of def.units) {
                    const unitDef = UNITS[unitType];
                    html += `
                        <button class="unit-btn" onclick="UI.produceUnit('${unitType}')">
                            <span class="symbol">${unitDef.symbol}</span>
                            <span class="name">${unitDef.name}</span>
                            <span class="cost">$${unitDef.cost.dollars}</span>
                        </button>
                    `;
                }
                html += '</div>';
                
                // Queue
                if (building.productionQueue.length > 0) {
                    html += '<div class="production-queue"><h4>Sıra:</h4>';
                    building.productionQueue.forEach((type, i) => {
                        const unitDef = UNITS[type];
                        const progress = i === 0 ? 
                            Math.floor((building.productionProgress / unitDef.buildTime) * 100) : 0;
                        html += `
                            <div class="queue-item">
                                <span>${unitDef.symbol} ${unitDef.name}</span>
                                ${i === 0 ? `<span class="progress">${progress}%</span>` : ''}
                                <button onclick="UI.cancelProduction(${i})">×</button>
                            </div>
                        `;
                    });
                    html += '</div>';
                }
            }
            
            panel.innerHTML = html;
            panel.style.display = 'block';
            return;
        }
        
        // Units selected
        if (GameState.selectedUnits.length > 0) {
            const units = GameState.selectedUnits;
            const types = {};
            
            for (const unit of units) {
                if (!types[unit.type]) types[unit.type] = 0;
                types[unit.type]++;
            }
            
            let html = `<div class="selection-header">
                <span class="count">${units.length} birim seçili</span>
            </div><div class="unit-list">`;
            
            for (const [type, count] of Object.entries(types)) {
                const def = UNITS[type];
                html += `
                    <div class="unit-type">
                        <span class="symbol">${def.symbol}</span>
                        <span class="name">${def.name}</span>
                        <span class="count">x${count}</span>
                    </div>
                `;
            }
            
            html += '</div>';
            panel.innerHTML = html;
            panel.style.display = 'block';
            return;
        }
        
        panel.style.display = 'none';
    },
    
    produceUnit(unitType) {
        if (GameState.selectedBuilding) {
            EntitySystem.queueUnit(GameState.selectedBuilding, unitType);
            this.updateSelectionPanel();
        }
    },
    
    cancelProduction(index) {
        if (GameState.selectedBuilding) {
            EntitySystem.cancelProduction(GameState.selectedBuilding, index);
            this.updateSelectionPanel();
        }
    },
    
    upgradeResourceBuilding() {
        if (GameState.selectedResourceBuilding) {
            MapSystem.upgradeResourceBuilding(GameState.selectedResourceBuilding);
            this.updateSelectionPanel();
        }
    },
    
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const screen = document.getElementById(screenId);
        if (screen) screen.classList.add('active');
    },
    
    updateLoadingProgress(percent, text) {
        const bar = document.getElementById('loadingBar');
        const label = document.getElementById('loadingText');
        if (bar) bar.style.width = percent + '%';
        if (label) label.textContent = text;
    },
    
    notify(message, type = 'info') {
        const container = document.getElementById('notifications');
        if (!container) return;
        
        const notif = document.createElement('div');
        notif.className = `notification ${type}`;
        notif.textContent = message;
        container.appendChild(notif);
        
        setTimeout(() => notif.classList.add('show'), 10);
        setTimeout(() => {
            notif.classList.remove('show');
            setTimeout(() => notif.remove(), 300);
        }, 3000);
    },
    
    updateGameUI() {
        this.updateResourceDisplay();
        this.updateSelectionPanel();
        
        // Territory count
        const myId = GameState.isMultiplayer ? Multiplayer.playerId : 'player';
        const territoryCount = document.getElementById('territoryCount');
        if (territoryCount) {
            territoryCount.textContent = MapSystem.getTerritoryCount(myId);
        }
    }
};

if (typeof window !== 'undefined') {
    window.UI = UI;
}
