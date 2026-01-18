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
        this.playerId = Firebase.userId;
    },
    
    selectCountry(countryId) {
        this.selectedCountry = countryId;
        document.querySelectorAll('.country-option').forEach(el => {
            el.classList.toggle('selected', el.dataset.id === countryId);
        });
    },
    
    async createServer() {
        const nameInput = document.getElementById('playerName');
        this.playerName = nameInput?.value.trim() || 'Oyuncu';
        
        if (!this.selectedCountry) {
            UI.notify('Bir ülke seçin!', 'error');
            return;
        }
        
        try {
            UI.showLoading('Server oluşturuluyor...');
            const code = await Firebase.createServer(this.playerName, this.selectedCountry);
            this.serverCode = code;
            this.isHost = true;
            this.isMultiplayer = true;
            this.showLobby();
            this.subscribeToServer();
        } catch (err) {
            UI.notify('Hata: ' + err.message, 'error');
            UI.hideLoading();
        }
    },
    
    async joinServer() {
        const nameInput = document.getElementById('playerName');
        const codeInput = document.getElementById('serverCode');
        
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
            UI.showLoading('Bağlanıyor...');
            await Firebase.joinServer(code, this.playerName, this.selectedCountry);
            this.serverCode = code;
            this.isHost = false;
            this.isMultiplayer = true;
            this.showLobby();
            this.subscribeToServer();
        } catch (err) {
            UI.notify('Hata: ' + err.message, 'error');
            UI.hideLoading();
        }
    },
    
    showLobby() {
        UI.hideLoading();
        document.getElementById('menuScreen').style.display = 'none';
        document.getElementById('lobbyScreen').style.display = 'flex';
        document.getElementById('lobbyCode').textContent = this.serverCode;
        
        document.getElementById('startGameBtn').style.display = this.isHost ? 'block' : 'none';
        document.getElementById('readyBtn').style.display = this.isHost ? 'none' : 'block';
    },
    
    subscribeToServer() {
        Firebase.subscribeToServer(this.serverCode, (server) => {
            this.players = server.players;
            this.updateLobbyUI(server);
            
            if (server.status === 'playing' && !GameState.isRunning) {
                this.startGame(server);
            }
        });
        
        Firebase.subscribeToChat(this.serverCode, (messages) => {
            this.chatMessages = messages;
            this.updateChatUI();
        });
    },
    
    updateLobbyUI(server) {
        const list = document.getElementById('playerList');
        if (!list) return;
        
        list.innerHTML = server.players.map(p => {
            const country = COUNTRIES.find(c => c.id === p.country);
            const isMe = p.id === this.playerId;
            const isHost = p.id === server.hostId;
            
            return `
                <div class="lobby-player ${isMe ? 'me' : ''} ${p.ready ? 'ready' : ''}">
                    <span class="flag">${country?.flag || '🏳️'}</span>
                    <span class="name">${p.name}</span>
                    ${isHost ? '<span class="badge host">👑</span>' : ''}
                    ${p.ready ? '<span class="badge ready">✓</span>' : ''}
                </div>
            `;
        }).join('');
        
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
                <div class="chat-msg ${isMe ? 'mine' : ''} ${msg.private ? 'private' : ''}">
                    <span class="sender">${msg.senderName}${msg.private ? ' (özel → ' + msg.targetName + ')' : ''}:</span>
                    <span class="text">${msg.message}</span>
                </div>
            `;
        }).join('');
        
        chatBox.scrollTop = chatBox.scrollHeight;
    },
    
    async toggleReady() {
        const player = this.players.find(p => p.id === this.playerId);
        if (player) {
            await Firebase.setReady(!player.ready);
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
        
        await Firebase.sendMessage(message, isPrivate, targetId, targetName);
        input.value = '';
    },
    
    async startGameAsHost() {
        if (!this.isHost) return;
        
        const success = await Firebase.startGame();
        if (!success) {
            UI.notify('Oyun başlatılamadı!', 'error');
        }
    },
    
    startGame(server) {
        document.getElementById('lobbyScreen').style.display = 'none';
        
        const myState = server.gameState.players[this.playerId];
        const myPlayer = server.players.find(p => p.id === this.playerId);
        
        Game.startMultiplayer(server, myPlayer, myState);
    },
    
    getMyCountry() {
        const player = this.players.find(p => p.id === this.playerId);
        if (player) {
            return COUNTRIES.find(c => c.id === player.country);
        }
        return null;
    },
    
    getPlayerCountry(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (player) {
            return COUNTRIES.find(c => c.id === player.country);
        }
        return null;
    },
    
    getOtherPlayers() {
        return this.players.filter(p => p.id !== this.playerId);
    },
    
    async sendResources(targetId, resourceType, amount) {
        const result = await Firebase.sendResources(targetId, resourceType, amount);
        
        if (result.success) {
            const target = this.players.find(p => p.id === targetId);
            UI.notify(`${amount} ${RESOURCES[resourceType].symbol} gönderildi: ${target?.name}`, 'success');
        } else {
            UI.notify(result.error || 'Gönderilemedi', 'error');
        }
    },
    
    async leaveServer() {
        await Firebase.leaveServer();
        this.serverCode = null;
        this.players = [];
        this.isHost = false;
        this.isMultiplayer = false;
        location.reload();
    }
};

if (typeof window !== 'undefined') window.Multiplayer = Multiplayer;
