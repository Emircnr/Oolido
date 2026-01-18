const Multiplayer = {
    isHost: false,
    isMultiplayer: false,
    serverCode: null,
    playerName: '',
    playerId: null,
    selectedCountry: null,
    players: [],
    
    init: function() {
        this.playerId = FirebaseModule.userId;
        this.setupCountryGrid();
        this.setupEventListeners();
    },
    
    setupCountryGrid: function() {
        var grid = document.getElementById('countryGrid');
        if (!grid) return;
        grid.innerHTML = '';
        var self = this;
        Object.keys(COUNTRIES).forEach(function(id) {
            var country = COUNTRIES[id];
            var div = document.createElement('div');
            div.className = 'country-option';
            div.dataset.id = id;
            div.innerHTML = '<span class="country-flag">' + country.flag + '</span><span class="country-name">' + country.name + '</span>';
            div.addEventListener('click', function() { self.selectCountry(id); });
            grid.appendChild(div);
        });
    },
    
    setupEventListeners: function() {
        var self = this;
        var createBtn = document.getElementById('createServerBtn');
        var joinBtn = document.getElementById('joinServerBtn');
        var startBtn = document.getElementById('startGameBtn');
        var readyBtn = document.getElementById('readyBtn');
        var leaveBtn = document.getElementById('leaveServerBtn');
        
        if (createBtn) createBtn.addEventListener('click', function() { self.createServer(); });
        if (joinBtn) joinBtn.addEventListener('click', function() { self.joinServer(); });
        if (startBtn) startBtn.addEventListener('click', function() { self.startGameAsHost(); });
        if (readyBtn) readyBtn.addEventListener('click', function() { self.toggleReady(); });
        if (leaveBtn) leaveBtn.addEventListener('click', function() { self.leaveServer(); });
    },
    
    selectCountry: function(countryId) {
        this.selectedCountry = countryId;
        document.querySelectorAll('.country-option').forEach(function(el) {
            el.classList.toggle('selected', el.dataset.id === countryId);
        });
        var country = COUNTRIES[countryId];
        var preview = document.getElementById('selectedCountryPreview');
        if (preview && country) preview.innerHTML = country.flag + ' ' + country.name;
        this.checkCanProceed();
    },
    
    checkCanProceed: function() {
        var nameInput = document.getElementById('playerNameInput');
        var codeInput = document.getElementById('serverCodeInput');
        var name = nameInput ? nameInput.value.trim() : '';
        var canCreate = name.length >= 2 && this.selectedCountry;
        var canJoin = canCreate && codeInput && codeInput.value.trim().length >= 4;
        var createBtn = document.getElementById('createServerBtn');
        var joinBtn = document.getElementById('joinServerBtn');
        if (createBtn) createBtn.disabled = !canCreate;
        if (joinBtn) joinBtn.disabled = !canJoin;
    },
    
    createServer: function() {
        var nameInput = document.getElementById('playerNameInput');
        this.playerName = nameInput ? nameInput.value.trim() : 'Oyuncu';
        if (!this.selectedCountry) { alert('Ülke seçin!'); return; }
        
        var self = this;
        FirebaseModule.createServer(this.playerName, this.selectedCountry).then(function(code) {
            self.serverCode = code;
            self.isHost = true;
            self.isMultiplayer = true;
            self.playerId = FirebaseModule.userId;
            self.showLobby();
            self.subscribeToServer();
        }).catch(function(err) {
            alert('Hata: ' + err.message);
        });
    },
    
    joinServer: function() {
        var nameInput = document.getElementById('playerNameInput');
        var codeInput = document.getElementById('serverCodeInput');
        this.playerName = nameInput ? nameInput.value.trim() : 'Oyuncu';
        var code = codeInput ? codeInput.value.trim().toUpperCase() : '';
        if (!code) { alert('Kod girin!'); return; }
        if (!this.selectedCountry) { alert('Ülke seçin!'); return; }
        
        var self = this;
        FirebaseModule.joinServer(code, this.playerName, this.selectedCountry).then(function() {
            self.serverCode = code;
            self.isHost = false;
            self.isMultiplayer = true;
            self.playerId = FirebaseModule.userId;
            self.showLobby();
            self.subscribeToServer();
        }).catch(function(err) {
            alert('Hata: ' + err.message);
        });
    },
    
    showLobby: function() {
        document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
        document.getElementById('lobbyScreen').classList.add('active');
        document.getElementById('lobbyServerCode').textContent = this.serverCode;
        document.getElementById('startGameBtn').style.display = this.isHost ? 'block' : 'none';
        document.getElementById('readyBtn').style.display = this.isHost ? 'none' : 'block';
    },
    
    subscribeToServer: function() {
        var self = this;
        FirebaseModule.subscribeToServer(this.serverCode, function(server) {
            self.players = server.players;
            self.updateLobbyUI(server);
            if (server.status === 'playing' && !GameState.isRunning) {
                self.startGame(server);
            }
        });
    },
    
    updateLobbyUI: function(server) {
        var list = document.getElementById('lobbyPlayersList');
        if (!list) return;
        var self = this;
        
        list.innerHTML = server.players.map(function(p) {
            var country = COUNTRIES[p.country];
            var isMe = p.id === self.playerId;
            var isHost = p.id === server.hostId;
            return '<div class="lobby-player ' + (isMe ? 'me' : '') + ' ' + (p.ready ? 'ready' : '') + '">' +
                '<span class="player-flag">' + (country ? country.flag : '🏳️') + '</span>' +
                '<span class="player-name">' + p.name + '</span>' +
                (isHost ? '<span class="host-badge">👑</span>' : '') +
                (p.ready ? '<span class="ready-badge">✓</span>' : '') + '</div>';
        }).join('');
        
        document.getElementById('lobbyPlayerCount').textContent = server.players.length + '/' + server.maxPlayers;
        
        if (this.isHost) {
            var allReady = server.players.length >= 2 && server.players.filter(function(p) { return p.id !== server.hostId; }).every(function(p) { return p.ready; });
            document.getElementById('startGameBtn').disabled = !allReady;
        }
    },
    
    toggleReady: function() {
        var self = this;
        var player = this.players.find(function(p) { return p.id === self.playerId; });
        if (player) FirebaseModule.setReady(!player.ready);
    },
    
    startGameAsHost: function() {
        if (!this.isHost) return;
        FirebaseModule.startGame();
    },
    
    startGame: function(server) {
        var myPlayer = server.players.find(function(p) { return p.id === Multiplayer.playerId; });
        Game.startMultiplayer(server, myPlayer);
    },
    
    getOtherPlayers: function() {
        var self = this;
        return this.players.filter(function(p) { return p.id !== self.playerId; });
    },
    
    leaveServer: function() {
        FirebaseModule.leaveServer().then(function() {
            location.reload();
        });
    },
    
    syncGameState: function() {}
};

window.Multiplayer = Multiplayer;
