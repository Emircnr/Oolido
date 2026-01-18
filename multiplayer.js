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
            div.innerHTML = '<span class="country-flag">' + country.flag + '</span><span class="country-name">' + country.name + '</span>';
            div.addEventListener('click', () => this.selectCountry(id));
            grid.appendChild(div);
        }
    },
    
    setupEventListeners() {
        const createBtn = document.getElementById('createServerBtn');
        const joinBtn = document.getElementById('joinServerBtn');
        const startBtn = document.getElementById('startGameBtn');
        const readyBtn = document.getElementById('readyBtn');
        const leaveBtn = document.getElementById('leaveServerBtn');
        if (createBtn) createBtn.addEventListener('click', () => this.createServer());
        if (joinBtn) joinBtn.addEventListener('click', () => this.joinServer());
        if (startBtn) startBtn.addEventListener('click', () => this.startGameAsHost());
        if (readyBtn) readyBtn.addEventListener('click', () => this.toggleReady());
        if (leaveBtn) leaveBtn.addEventListener('click', () => this.leaveServer());
    },
    
    selectCountry(countryId) {
        this.selectedCountry = countryId;
        document.querySelectorAll('.country-option').forEach(el => {
            el.classList.toggle('selected', el.dataset.id === countryId);
        });
        const country = COUNTRIES[countryId];
        const preview = document.getElementById('selectedCountryPreview');
        if (preview && country) {
            preview.innerHTML = country.flag + ' ' + country.name;
        }
        this.checkCanProceed();
    },
    
    checkCanProceed() {
        const nameInput = document.getElementById('playerNameInput');
        const codeInput = document.getElementById('serverCodeInput');
        const name = nameInput ? nameInput.value.trim() : '';
        const canCreate = name.length >= 2 && this.selectedCountry;
        const canJoin = canCreate && codeInput && codeInput.value.trim().length >= 4;
        const createBtn = document.getElementById('createServerBtn');
        const joinBtn = document.getElementById('joinServerBtn');
        if (createBtn) createBtn.disabled = !canCreate;
        if (joinBtn) joinBtn.disabled = !canJoin;
    },
    
    async createServer() {
        const nameInput = document.getElementById('playerNameInput');
        this.playerName = nameInput ? nameInput.value.trim() : 'Oyuncu';
        if (!this.selectedCountry) { alert('Ülke seçin!'); return; }
        try {
            const code = await FirebaseModule.createServer(this.playerName, this.selectedCountry);
            this.serverCode = code;
            this.isHost = true;
            this.isMultiplayer = true;
            this.playerId = FirebaseModule.userId;
            this.showLobby();
            this.subscribeToServer();
        } catch (err) {
            alert('Hata: ' + err.message);
        }
    },
    
    async joinServer() {
        const nameInput = document.getElementById('playerNameInput');
        const codeInput = document.getElementById('serverCodeInput');
        this.playerName = nameInput ? nameInput.value.trim() : 'Oyuncu';
        const code = codeInput ? codeInput.value.trim().toUpperCase() : '';
        if (!code) { alert('Kod girin!'); return; }
        if (!this.selectedCountry) { alert('Ülke seçin!'); return; }
        try {
            await FirebaseModule.joinServer(code, this.playerName, this.selectedCountry);
            this.serverCode = code;
            this.isHost = false;
            this.isMultiplayer = true;
            this.playerId = FirebaseModule.userId;
            this.showLobby();
            this.subscribeToServer();
        } catch (err) {
            alert('Hata: ' + err.message);
        }
    },
    
    showLobby() {
        document.getElementById('loadingScreen').classList.remove('active');
        document.getElementById('menuScreen').classList.remove('active');
        document.getElementById('lobbyScreen').classList.add('active');
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
    },
    
    updateLobbyUI(server) {
        const list = document.getElementById('lobbyPlayersList');
        if (!list) return;
        list.innerHTML = server.players.map(p => {
            const country = COUNTRIES[p.country];
            const isMe = p.id === this.playerId;
            const isHost = p.id === server.hostId;
            return '<div class="lobby-player ' + (isMe ? 'me' : '') + ' ' + (p.ready ? 'ready' : '') + '">' +
                '<span class="player-flag">' + (country ? country.flag : '🏳️') + '</span>' +
                '<span class="player-name">' + p.name + '</span>' +
                (isHost ? '<span class="host-badge">👑</span>' : '') +
                (p.ready ? '<span class="ready-badge">✓</span>' : '') +
                '</div>';
        }).join('');
        document.getElementById('lobbyPlayerCount').textContent = server.players.length + '/' + server.maxPlayers;
        if (this.isHost) {
            const allReady = server.players.length >= 2 && server.players.filter(p => p.id !== server.hostId).every(p => p.ready);
            document.getElementById('startGameBtn').disabled = !allReady;
        }
    },
    
    async toggleReady() {
        const player = this.players.find(p => p.id === this.playerId);
        if (player) await FirebaseModule.setReady(!player.ready);
    },
    
    async startGameAsHost() {
        if (!this.isHost) return;
        await FirebaseModule.startGame();
    },
    
    startGame(server) {
        const myPlayer = server.players.find(p => p.id === this.playerId);
        Game.startMultiplayer(server, myPlayer);
    },
    
    getOtherPlayers() {
        return this.players.filter(p => p.id !== this.playerId);
    },
    
    async leaveServer() {
        await FirebaseModule.leaveServer();
        location.reload();
    },
    
    syncGameState() {}
};

window.Multiplayer = Multiplayer;
