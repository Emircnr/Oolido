const Renderer = {
    canvas: null,
    ctx: null,
    minimapCanvas: null,
    minimapCtx: null,
    playerColors: {},
    
    init: function(canvas, minimapCanvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.minimapCanvas = minimapCanvas;
        this.minimapCtx = minimapCanvas.getContext('2d');
        this.resize();
    },
    
    setPlayerColors: function(players) {
        var self = this;
        this.playerColors = {};
        players.forEach(function(p) {
            var country = COUNTRIES[p.country];
            if (country) {
                self.playerColors[p.id] = { primary: country.color, secondary: country.secondary, flag: country.flag };
            }
        });
        this.playerColors['player'] = this.playerColors[Multiplayer.playerId] || { primary: '#0088ff', secondary: '#ffffff', flag: '🎮' };
        this.playerColors['enemy'] = { primary: '#ff2244', secondary: '#ffffff', flag: '👾' };
    },
    
    getPlayerColor: function(owner) {
        return this.playerColors[owner] || { primary: '#888888', secondary: '#ffffff', flag: '❓' };
    },
    
    resize: function() {
        var container = document.getElementById('gameContainer');
        if (!container) return;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
    },
    
    render: function(camera) {
        var ctx = this.ctx;
        ctx.fillStyle = '#e8e8e8';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        ctx.save();
        ctx.scale(camera.zoom, camera.zoom);
        ctx.translate(-camera.x, -camera.y);
        
        this.renderTiles(camera);
        this.renderGrid(camera);
        this.renderResourceBuildings(camera);
        this.renderBuildings(camera);
        this.renderUnits(camera);
        this.renderEffects(camera);
        this.renderBuildPreview(camera);
        
        ctx.restore();
        
        this.renderSelectionBox();
        this.renderMinimap(camera);
    },
    
    renderTiles: function(camera) {
        var ctx = this.ctx;
        var self = this;
        var tileSize = CONFIG.TILE_SIZE;
        var visibleTiles = MapSystem.getVisibleTiles(camera, this.canvas);
        
        visibleTiles.forEach(function(tile) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(tile.x, tile.y, tileSize, tileSize);
            
            if (tile.owner) {
                var color = self.getPlayerColor(tile.owner);
                ctx.fillStyle = Utils.hexToRgba(color.primary, CONFIG.TERRITORY_OPACITY);
                ctx.fillRect(tile.x, tile.y, tileSize, tileSize);
                
                ctx.strokeStyle = Utils.hexToRgba(color.primary, 0.4);
                ctx.lineWidth = 6;
                ctx.strokeRect(tile.x + 3, tile.y + 3, tileSize - 6, tileSize - 6);
                
                ctx.font = '200px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.globalAlpha = 0.12;
                ctx.fillText(color.flag, tile.centerX, tile.centerY);
                ctx.globalAlpha = 1;
            }
            
            if (tile.captureProgress > 0 && tile.capturingTeam) {
                var capColor = self.getPlayerColor(tile.capturingTeam);
                ctx.strokeStyle = capColor.primary;
                ctx.lineWidth = 32;
                ctx.beginPath();
                ctx.arc(tile.centerX, tile.centerY, tileSize * 0.1, -Math.PI / 2, -Math.PI / 2 + tile.captureProgress * Math.PI * 2);
                ctx.stroke();
                
                ctx.fillStyle = '#000';
                ctx.font = 'bold 100px Arial';
                ctx.fillText(Math.floor(tile.captureProgress * 100) + '%', tile.centerX, tile.centerY);
            }
        });
    },
    
    renderGrid: function(camera) {
        var ctx = this.ctx;
        var tileSize = CONFIG.TILE_SIZE;
        var bounds = MapSystem.getBounds();
        
        ctx.strokeStyle = CONFIG.GRID_COLOR;
        ctx.lineWidth = 4;
        ctx.beginPath();
        
        for (var x = 0; x <= bounds.width; x += tileSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, bounds.height);
        }
        for (var y = 0; y <= bounds.height; y += tileSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(bounds.width, y);
        }
        ctx.stroke();
    },
    
    renderResourceBuildings: function(camera) {
        var ctx = this.ctx;
        var self = this;
        
        MapSystem.resourceBuildings.forEach(function(rb) {
            if (!Utils.isOnScreen(rb.x, rb.y, camera, self.canvas, rb.size + 100)) return;
            
            var resInfo = CONFIG.RESOURCES[rb.resourceType];
            var tile = MapSystem.getTileById(rb.tileId);
            var borderColor = tile && tile.owner ? self.getPlayerColor(tile.owner).primary : '#666666';
            var halfSize = rb.size / 2;
            
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.arc(rb.x + 8, rb.y + 8, halfSize, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = resInfo.color;
            ctx.beginPath();
            ctx.arc(rb.x, rb.y, halfSize, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = Math.max(3, rb.size / 25);
            ctx.stroke();
            
            ctx.fillStyle = '#fff';
            ctx.font = (rb.size * 0.5) + 'px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(resInfo.symbol, rb.x, rb.y);
            
            ctx.fillStyle = '#333';
            ctx.font = 'bold ' + Math.max(18, rb.size * 0.18) + 'px Arial';
            ctx.fillText(rb.production + '/m', rb.x, rb.y + halfSize + 25);
            
            if (GameState.selectedResourceBuilding && GameState.selectedResourceBuilding.id === rb.id) {
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 5;
                ctx.setLineDash([15, 8]);
                ctx.beginPath();
                ctx.arc(rb.x, rb.y, halfSize + 15, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        });
    },
    
    renderBuildings: function(camera) {
        var ctx = this.ctx;
        var self = this;
        
        GameState.buildings.forEach(function(building) {
            if (!Utils.isOnScreen(building.x, building.y, camera, self.canvas, building.size + 200)) return;
            
            var def = BUILDINGS[building.type];
            var color = self.getPlayerColor(building.owner);
            var size = building.size;
            
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(building.x + 10, building.y + 10, size, size);
            
            ctx.fillStyle = color.primary;
            ctx.fillRect(building.x, building.y, size, size);
            
            ctx.strokeStyle = color.secondary;
            ctx.lineWidth = 4;
            ctx.strokeRect(building.x, building.y, size, size);
            
            ctx.fillStyle = '#fff';
            ctx.font = (size * 0.4) + 'px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(def.symbol, building.x + size/2, building.y + size/2);
            
            if (building.hp < building.maxHp) {
                var barWidth = size;
                var barHeight = 16;
                var barY = building.y - 35;
                var hpPercent = building.hp / building.maxHp;
                
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(building.x, barY, barWidth, barHeight);
                
                ctx.fillStyle = hpPercent > 0.5 ? '#00ff88' : hpPercent > 0.25 ? '#ffaa00' : '#ff3355';
                ctx.fillRect(building.x, barY, barWidth * hpPercent, barHeight);
            }
            
            if (GameState.selectedBuilding === building) {
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 5;
                ctx.setLineDash([15, 8]);
                ctx.strokeRect(building.x - 12, building.y - 12, size + 24, size + 24);
                ctx.setLineDash([]);
            }
        });
    },
    
    renderUnits: function(camera) {
        var ctx = this.ctx;
        var self = this;
        var rendered = 0;
        
        GameState.units.forEach(function(unit) {
            if (rendered >= CONFIG.MAX_UNITS_RENDER) return;
            if (!Utils.isOnScreen(unit.x, unit.y, camera, self.canvas, 150)) return;
            
            var def = UNITS[unit.type];
            var color = self.getPlayerColor(unit.owner);
            var isAir = def.isAir;
            var drawY = unit.y - (isAir ? 70 : 0);
            
            if (isAir) {
                ctx.fillStyle = 'rgba(0,0,0,0.25)';
                ctx.beginPath();
                ctx.ellipse(unit.x, unit.y + 25, 45, 18, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            
            var unitSize = 50;
            ctx.fillStyle = color.primary;
            ctx.beginPath();
            ctx.arc(unit.x, drawY, unitSize, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = color.secondary;
            ctx.lineWidth = 4;
            ctx.stroke();
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 38px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(def.symbol, unit.x, drawY);
            
            var hpPercent = unit.hp / unit.maxHp;
            if (hpPercent < 1) {
                var barWidth = 70;
                var barHeight = 10;
                var barY = drawY - unitSize - 20;
                
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(unit.x - barWidth/2, barY, barWidth, barHeight);
                
                ctx.fillStyle = hpPercent > 0.5 ? '#00ff88' : hpPercent > 0.25 ? '#ffaa00' : '#ff3355';
                ctx.fillRect(unit.x - barWidth/2, barY, barWidth * hpPercent, barHeight);
            }
            
            if (unit.selected) {
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(unit.x, drawY, unitSize + 12, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            rendered++;
        });
    },
    
    renderEffects: function(camera) {
        var ctx = this.ctx;
        var effects = CombatSystem.getEffects();
        
        effects.projectiles.forEach(function(proj) {
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, 8, 0, Math.PI * 2);
            ctx.fill();
        });
        
        effects.explosions.forEach(function(exp) {
            var gradient = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, exp.radius);
            gradient.addColorStop(0, 'rgba(255,220,100,' + exp.alpha + ')');
            gradient.addColorStop(0.4, 'rgba(255,120,50,' + (exp.alpha * 0.6) + ')');
            gradient.addColorStop(1, 'rgba(255,50,0,0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
            ctx.fill();
        });
        
        effects.damageNumbers.forEach(function(num) {
            ctx.fillStyle = '#ff3333';
            ctx.globalAlpha = num.alpha;
            ctx.font = 'bold 40px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('-' + num.damage, num.x, num.y + num.offsetY);
            ctx.globalAlpha = 1;
        });
    },
    
    renderBuildPreview: function(camera) {
        if (!GameState.buildMode) return;
        var ctx = this.ctx;
        var def = BUILDINGS[GameState.buildMode];
        var size = def.size || 200;
        var gridSize = CONFIG.BUILDING_GRID;
        var x = Math.floor(GameState.mouse.worldX / gridSize) * gridSize;
        var y = Math.floor(GameState.mouse.worldY / gridSize) * gridSize;
        var check = EntitySystem.canBuildAt(GameState.buildMode, x, y);
        
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = check.can ? '#00ff88' : '#ff3355';
        ctx.fillRect(x, y, size, size);
        ctx.globalAlpha = 1;
        
        ctx.fillStyle = '#fff';
        ctx.font = (size * 0.4) + 'px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(def.symbol, x + size/2, y + size/2);
    },
    
    renderSelectionBox: function() {
        if (!GameState.selectionBox) return;
        var ctx = this.ctx;
        var box = GameState.selectionBox;
        
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(box.x1, box.y1, box.x2 - box.x1, box.y2 - box.y1);
        ctx.setLineDash([]);
        
        ctx.fillStyle = 'rgba(0,212,255,0.12)';
        ctx.fillRect(box.x1, box.y1, box.x2 - box.x1, box.y2 - box.y1);
    },
    
    renderMinimap: function(camera) {
        var ctx = this.minimapCtx;
        var canvas = this.minimapCanvas;
        var self = this;
        
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        var bounds = MapSystem.getBounds();
        var scaleX = canvas.width / bounds.width;
        var scaleY = canvas.height / bounds.height;
        
        MapSystem.tiles.forEach(function(tile) {
            if (tile.owner) {
                ctx.fillStyle = Utils.hexToRgba(self.getPlayerColor(tile.owner).primary, 0.6);
            } else {
                ctx.fillStyle = '#e0e0e0';
            }
            ctx.fillRect(tile.x * scaleX, tile.y * scaleY, CONFIG.TILE_SIZE * scaleX + 1, CONFIG.TILE_SIZE * scaleY + 1);
        });
        
        MapSystem.resourceBuildings.forEach(function(rb) {
            var resInfo = CONFIG.RESOURCES[rb.resourceType];
            ctx.fillStyle = resInfo.color;
            ctx.beginPath();
            ctx.arc(rb.x * scaleX, rb.y * scaleY, 2, 0, Math.PI * 2);
            ctx.fill();
        });
        
        GameState.buildings.forEach(function(b) {
            ctx.fillStyle = self.getPlayerColor(b.owner).primary;
            ctx.fillRect(b.x * scaleX - 2, b.y * scaleY - 2, 5, 5);
        });
        
        GameState.units.forEach(function(u) {
            ctx.fillStyle = self.getPlayerColor(u.owner).primary;
            ctx.fillRect(u.x * scaleX - 1, u.y * scaleY - 1, 3, 3);
        });
        
        var viewX = camera.x * scaleX;
        var viewY = camera.y * scaleY;
        var viewW = (self.canvas.width / camera.zoom) * scaleX;
        var viewH = (self.canvas.height / camera.zoom) * scaleY;
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.strokeRect(viewX, viewY, viewW, viewH);
    }
};

window.Renderer = Renderer;
