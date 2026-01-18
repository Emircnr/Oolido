/* ============================================
   TACTICAL COMMAND - MULTIPLAYER MODULE
   Server lobby and player management
   ============================================ */

const Multiplayer = {
    isHost: false,
    isMultiplayer: false,
    serverCode: null,
    playerName: '',
    playerId: null,
    selectedCountry: null,
    players: [],
    chatMessages: [],
    
    init() {
        this.playerId = FirebaseModule.userId;
        this.setupCountryGrid();
        this.setupEventListeners();
    },
    
    setupCountryGrid() {
        const grid = document.getElementById('countryGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        for (const [id, country] of Object.entries(COUNTRIES)) {
            const div = document.createElement('div');
            div.className = 'country-option';
            div.dataset.id = id;
            div.innerHTML = `
                <span class="country-flag">${country.flag}</span>
                <span class="country-name">${country.name}</span>
            `;
            div.addEventListener('click', () => this.selectCountry(id));
            grid.appendChild(div);
        }
    },
    
    setupEventListeners() {
        document.getElementById('createServerBtn')?.addEventListener('click', () => this.createServer());
        document.getElementById('joinServerBtn')?.addEventListener('click', () => this.joinServer());
        document.getElementById('startGameBtn')?.addEventListener('click', () => this.startGameAsHost());
        document.getElementById('readyBtn')?.addEventListener('click', () => this.toggleReady());
        document.getElementById('leaveServerBtn')?.addEventListener('click', () => this.leaveServer());
        document.getElementById('sendChatBtn')?.addEventListener('click', () => this.sendChat());
        document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChat();
        });
    },
    
    selectCountry(countryId) {
        this.selectedCountry = countryId;
        document.querySelectorAll('.country-option').forEach(el => {
            el.classList.toggle('selected', el.dataset.id === countryId);
        });
        
        const country = COUNTRIES[countryId];
        const preview = document.getElementById('selectedCountryPreview');
        if (preview && country) {
            preview.innerHTML = `<span class="flag">${country.flag}</span> ${country.name}`;
        }
        
        this.checkCanProceed();
    },
    
    checkCanProceed() {
        const nameInput = document.getElementById('playerNameInput');
        const codeInput = document.getElementById('serverCodeInput');
        const name = nameInput?.value.trim();
        const canCreate = name && name.length >= 2 && this.selectedCountry;
        const canJoin = canCreate && codeInput?.value.trim();
        
        const createBtn = document.getElementById('createServerBtn');
        const joinBtn = document.getElementById('joinServerBtn');
        if (createBtn) createBtn.disabled = !canCreate;
        if (joinBtn) joinBtn.disabled = !canJoin;
    },
    
    async createServer() {
        const nameInput = document.getElementById('playerNameInput');
        this.playerName = nameInput?.value.trim() || 'Oyuncu';
        
        if (!this.selectedCountry) {
            UI.notify('Bir ülke seçin!', 'error');
            return;
        }
        
        try {
            UI.showScreen('loadingScreen');
            UI.updateLoadingProgress(30, 'Server oluşturuluyor...');
            
            const code = await FirebaseModule.createServer(this.playerName, this.selectedCountry);
            this.serverCode = code;
            this.isHost = true;
            this.isMultiplayer = true;
            this.playerId = FirebaseModule.userId;
            
            UI.updateLoadingProgress(100, 'Server hazır!');
            setTimeout(() => {
                this.showLobby();
                this.subscribeToServer();
            }, 500);
        } catch (err) {
            UI.notify('Hata: ' + err.message, 'error');
            UI.showScreen('menuScreen');
        }
    },
    
    async joinServer() {
        const nameInput = document.getElementById('playerNameInput');
        const codeInput = document.getElementById('serverCodeInput');
        
        this.playerName = nameInput?.value.trim() || 'Oyuncu';
        const code = codeInput?.value.trim().toUpperCase();
        
        if (!code) {
            UI.notify('Server kodu girin!', 'error');
            return;
        }
        
        if (!this.selectedCountry) {
            UI.notify('Bir ülke seçin!', 'error');
            return;
        }
        
        try {
            UI.showScreen('loadingScreen');
            UI.updateLoadingProgress(30, 'Bağlanıyor...');
            
            await FirebaseModule.joinServer(code, this.playerName, this.selectedCountry);
            this.serverCode = code;
            this.isHost = false;
            this.isMultiplayer = true;
            this.playerId = FirebaseModule.userId;
            
            UI.updateLoadingProgress(100, 'Bağlandı!');
            setTimeout(() => {
                this.showLobby();
                this.subscribeToServer();
            }, 500);
        } catch (err) {
            UI.notify('Hata: ' + err.message, 'error');
            UI.showScreen('menuScreen');
        }
    },
    
    showLobby() {
        UI.showScreen('lobbyScreen');
        document.getElementById('lobbyServerCode').textContent = this.serverCode;
        document.getElementById('startGameBtn').style.display = this.isHost ? 'block' : 'none';
        document.getElementById('readyBtn').style.display = this.isHost ? 'none' : 'block';
    },
    
    subscribeToServer() {
        FirebaseModule.subscribeToServer(this.serverCode, (server) => {
            this.players = server.players;
            this.updateLobbyUI(server);
            
            if (server.status === 'playing' && !GameState.isRunning) {
                this.startGame(server);
            }
        });
        
        FirebaseModule.subscribeToChat(this.serverCode, (messages) => {
            this.chatMessages = messages;
            this.updateChatUI();
        });
    },
    
    updateLobbyUI(server) {
        const list = document.getElementById('lobbyPlayersList');
        if (!list) return;
        
        list.innerHTML = server.players.map(p => {
            const country = COUNTRIES[p.country];
            const isMe = p.id === this.playerId;
            const isHost = p.id === server.hostId;
            
            return `
                <div class="lobby-player ${isMe ? 'me' : ''} ${p.ready ? 'ready' : ''}">
                    <span class="player-flag">${country?.flag || '🏳️'}</span>
                    <span class="player-name">${p.name}</span>
                    ${isHost ? '<span class="host-badge">👑</span>' : ''}
                    ${p.ready ? '<span class="ready-badge">✓</span>' : ''}
                </div>
            `;
        }).join('');
        
        document.getElementById('lobbyPlayerCount').textContent = `${server.players.length}/${server.maxPlayers}`;
        
        // Check if all ready
        if (this.isHost) {
            const allReady = server.players.length >= 2 && 
                           server.players.filter(p => p.id !== server.hostId).every(p => p.ready);
            document.getElementById('startGameBtn').disabled = !allReady;
        }
    },
    
    updateChatUI() {
        const chatBox = document.getElementById('chatMessages');
        if (!chatBox) return;
        
        chatBox.innerHTML = this.chatMessages.map(msg => {
            const isMe = msg.senderId === this.playerId;
            return `
                <div class="chat-message ${isMe ? 'mine' : ''} ${msg.private ? 'private' : ''}">
                    <span class="sender">${msg.senderName}${msg.private ? ' (özel)' : ''}:</span>
                    <span class="text">${msg.message}</span>
                </div>
            `;
        }).join('');
        
        chatBox.scrollTop = chatBox.scrollHeight;
    },
    
    async toggleReady() {
        const player = this.players.find(p => p.id === this.playerId);
        if (player) {
            await FirebaseModule.setReady(!player.ready);
        }
    },
    
    async sendChat() {
        const input = document.getElementById('chatInput');
        let message = input?.value.trim();
        if (!message) return;
        
        // Check for private message: @name message
        let isPrivate = false;
        let targetId = null;
        let targetName = null;
        
        if (message.startsWith('@')) {
            const spaceIdx = message.indexOf(' ');
            if (spaceIdx > 0) {
                const name = message.substring(1, spaceIdx);
                const target = this.players.find(p => 
                    p.name.toLowerCase() === name.toLowerCase()
                );
                
                if (target && target.id !== this.playerId) {
                    isPrivate = true;
                    targetId = target.id;
                    targetName = target.name;
                    message = message.substring(spaceIdx + 1);
                }
            }
        }
        
        await FirebaseModule.sendMessage(message, isPrivate, targetId, targetName);
        input.value = '';
    },
    
    async startGameAsHost() {
        if (!this.isHost) return;
        
        const success = await FirebaseModule.startGame();
        if (!success) {
            UI.notify('Oyun başlatılamadı!', 'error');
        }
    },
    
    startGame(server) {
        const myState = server.gameState.players[this.playerId];
        const myPlayer = server.players.find(p => p.id === this.playerId);
        
        Game.startMultiplayer(server, myPlayer, myState);
    },
    
    getMyCountry() {
        const player = this.players.find(p => p.id === this.playerId);
        if (player) {
            return COUNTRIES[player.country];
        }
        return null;
    },
    
    getPlayerCountry(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (player) {
            return COUNTRIES[player.country];
        }
        return null;
    },
    
    getOtherPlayers() {
        return this.players.filter(p => p.id !== this.playerId);
    },
    
    async sendResources(targetId, resourceType, amount) {
        const result = await FirebaseModule.sendResources(targetId, resourceType, amount);
        
        if (result.success) {
            const target = this.players.find(p => p.id === targetId);
            const res = CONFIG.RESOURCES[resourceType];
            UI.notify(`${amount} ${res.symbol} gönderildi: ${target?.name}`, 'success');
        } else {
            UI.notify(result.error || 'Gönderilemedi', 'error');
        }
    },
    
    async leaveServer() {
        await FirebaseModule.leaveServer();
        this.serverCode = null;
        this.players = [];
        this.isHost = false;
        this.isMultiplayer = false;
        location.reload();
    },
    
    async syncGameState() {
        if (!this.isMultiplayer || !this.serverCode) return;
        // Sync handled by FirebaseModule
    }
};

if (typeof window !== 'undefined') window.Multiplayer = Multiplayer;
