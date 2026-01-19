const Renderer = {
    canvas: null,
    ctx: null,
    minimapCanvas: null,
    minimapCtx: null,
    
    init: function(canvas, minimapCanvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.minimapCanvas = minimapCanvas;
        this.minimapCtx = minimapCanvas.getContext('2d');
    },
    
    clear: function() {
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    },
    
    render: function(gameState, camera) {
        this.clear();
        this.ctx.save();
        
        // Calculate offset to center map when zoomed out
        var mapPixelWidth = CONFIG.MAP_WIDTH * CONFIG.TILE_SIZE * camera.zoom;
        var mapPixelHeight = CONFIG.MAP_HEIGHT * CONFIG.TILE_SIZE * camera.zoom;
        var offsetX = 0;
        var offsetY = 0;
        
        if (mapPixelWidth < this.canvas.width) {
            offsetX = (this.canvas.width - mapPixelWidth) / 2;
        }
        if (mapPixelHeight < this.canvas.height) {
            offsetY = (this.canvas.height - mapPixelHeight) / 2;
        }
        
        this.ctx.translate(offsetX - camera.x * camera.zoom, offsetY - camera.y * camera.zoom);
        this.ctx.scale(camera.zoom, camera.zoom);
        
        this.renderTerrain(gameState);
        this.renderResources(gameState);
        this.renderBuildings(gameState);
        this.renderUnits(gameState, camera);
        this.renderProjectiles(gameState);
        this.renderExplosions(gameState);
        this.renderSelection(gameState, camera);
        
        this.ctx.restore();
        
        this.renderMinimap(gameState, camera);
    },
    
    renderTerrain: function(gameState) {
        var ctx = this.ctx;
        var tiles = gameState.map.tiles;
        
        for (var y = 0; y < CONFIG.MAP_HEIGHT; y++) {
            for (var x = 0; x < CONFIG.MAP_WIDTH; x++) {
                var tile = tiles[y][x];
                var px = x * CONFIG.TILE_SIZE;
                var py = y * CONFIG.TILE_SIZE;
                
                // Base terrain
                var gradient = ctx.createLinearGradient(px, py, px, py + CONFIG.TILE_SIZE);
                if (tile.terrain === 'water') {
                    gradient.addColorStop(0, '#1e3a5f');
                    gradient.addColorStop(1, '#0d253f');
                } else if (tile.terrain === 'mountain') {
                    gradient.addColorStop(0, '#5a5a5a');
                    gradient.addColorStop(1, '#3a3a3a');
                } else {
                    gradient.addColorStop(0, '#2d4a2d');
                    gradient.addColorStop(1, '#1e3a1e');
                }
                
                ctx.fillStyle = gradient;
                ctx.fillRect(px, py, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
                
                // Owner overlay
                if (tile.owner !== null) {
                    var owner = gameState.players[tile.owner];
                    if (owner) {
                        var country = CONFIG.COUNTRIES[owner.country];
                        if (country) {
                            ctx.fillStyle = country.primary + '40';
                            ctx.fillRect(px, py, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
                            
                            // Flag watermark
                            ctx.font = (CONFIG.TILE_SIZE * 0.4) + 'px Arial';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillStyle = 'rgba(255,255,255,0.15)';
                            ctx.fillText(country.flag, px + CONFIG.TILE_SIZE/2, py + CONFIG.TILE_SIZE/2);
                        }
                    }
                }
                
                // Grid lines
                ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                ctx.lineWidth = 20;
                ctx.strokeRect(px, py, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
            }
        }
    },
    
    renderResources: function(gameState) {
        var ctx = this.ctx;
        var tiles = gameState.map.tiles;
        
        for (var y = 0; y < CONFIG.MAP_HEIGHT; y++) {
            for (var x = 0; x < CONFIG.MAP_WIDTH; x++) {
                var tile = tiles[y][x];
                if (!tile.resource) continue;
                
                var px = x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
                var py = y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
                var size = CONFIG.TILE_SIZE * 0.3;
                
                var resourceColors = {
                    oil: { primary: '#1a1a1a', secondary: '#4a4a4a', icon: '🛢️' },
                    wheat: { primary: '#d4a574', secondary: '#e8c89a', icon: '🌾' },
                    dollars: { primary: '#2d5a2d', secondary: '#4a8a4a', icon: '💵' }
                };
                
                var res = resourceColors[tile.resource];
                if (res) {
                    // Resource deposit
                    var glow = ctx.createRadialGradient(px, py, 0, px, py, size * 1.5);
                    glow.addColorStop(0, res.secondary + '80');
                    glow.addColorStop(1, 'transparent');
                    ctx.fillStyle = glow;
                    ctx.beginPath();
                    ctx.arc(px, py, size * 1.5, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.font = size + 'px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(res.icon, px, py);
                }
            }
        }
    },
    
    renderBuildings: function(gameState) {
        var ctx = this.ctx;
        var buildings = gameState.buildings;
        
        for (var i = 0; i < buildings.length; i++) {
            var b = buildings[i];
            var config = CONFIG.BUILDINGS[b.type];
            if (!config) continue;
            
            var owner = gameState.players[b.owner];
            var color = owner ? CONFIG.COUNTRIES[owner.country].primary : '#666';
            
            if (b.type === 'defenseTower') {
                this.renderDefenseTower(b, color);
            } else {
                this.renderStandardBuilding(b, config, color);
            }
        }
    },
    
    renderDefenseTower: function(tower, color) {
        var ctx = this.ctx;
        var x = tower.x;
        var y = tower.y;
        var size = CONFIG.TILE_SIZE * 0.08;
        var level = tower.level || 1;
        
        // Base platform
        var baseGrad = ctx.createLinearGradient(x - size, y + size/2, x + size, y + size/2);
        baseGrad.addColorStop(0, '#333');
        baseGrad.addColorStop(0.5, '#555');
        baseGrad.addColorStop(1, '#333');
        ctx.fillStyle = baseGrad;
        ctx.beginPath();
        ctx.ellipse(x, y + size * 0.8, size * 1.2, size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Tower body
        var towerGrad = ctx.createLinearGradient(x - size/2, y, x + size/2, y);
        towerGrad.addColorStop(0, color);
        towerGrad.addColorStop(0.3, Utils.lightenColor(color, 40));
        towerGrad.addColorStop(0.7, Utils.lightenColor(color, 40));
        towerGrad.addColorStop(1, Utils.darkenColor(color, 40));
        ctx.fillStyle = towerGrad;
        
        // Tapered tower shape
        ctx.beginPath();
        ctx.moveTo(x - size * 0.6, y + size * 0.6);
        ctx.lineTo(x - size * 0.4, y - size * 0.8);
        ctx.lineTo(x + size * 0.4, y - size * 0.8);
        ctx.lineTo(x + size * 0.6, y + size * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#222';
        ctx.lineWidth = size * 0.05;
        ctx.stroke();
        
        // Gun platform
        ctx.fillStyle = '#444';
        ctx.fillRect(x - size * 0.5, y - size * 0.9, size, size * 0.15);
        
        // Gun barrel
        ctx.fillStyle = '#222';
        var barrelLength = size * (0.6 + level * 0.05);
        ctx.save();
        ctx.translate(x, y - size * 0.85);
        ctx.rotate(tower.angle || 0);
        ctx.fillRect(0, -size * 0.08, barrelLength, size * 0.16);
        ctx.fillStyle = '#111';
        ctx.fillRect(barrelLength - size * 0.1, -size * 0.1, size * 0.15, size * 0.2);
        ctx.restore();
        
        // Level stars
        var starSize = size * 0.15;
        var starsPerRow = 5;
        var rows = Math.ceil(level / starsPerRow);
        ctx.fillStyle = '#ffd700';
        ctx.font = starSize + 'px Arial';
        ctx.textAlign = 'center';
        
        for (var row = 0; row < rows; row++) {
            var starsInRow = Math.min(starsPerRow, level - row * starsPerRow);
            var startX = x - (starsInRow - 1) * starSize * 0.6;
            for (var s = 0; s < starsInRow; s++) {
                ctx.fillText('★', startX + s * starSize * 1.2, y + size * 0.3 + row * starSize);
            }
        }
        
        // Health bar
        var healthPercent = tower.hp / tower.maxHp;
        var barWidth = size * 1.5;
        var barHeight = size * 0.12;
        ctx.fillStyle = '#333';
        ctx.fillRect(x - barWidth/2, y - size * 1.2, barWidth, barHeight);
        ctx.fillStyle = healthPercent > 0.5 ? '#4a4' : healthPercent > 0.25 ? '#aa4' : '#a44';
        ctx.fillRect(x - barWidth/2, y - size * 1.2, barWidth * healthPercent, barHeight);
    },
    
    renderStandardBuilding: function(building, config, color) {
        var ctx = this.ctx;
        var x = building.x;
        var y = building.y;
        var size = CONFIG.TILE_SIZE * 0.15;
        
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(x + size * 0.1, y + size * 0.9, size * 0.8, size * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Building body
        var gradient = ctx.createLinearGradient(x - size, y - size, x + size, y + size);
        gradient.addColorStop(0, Utils.lightenColor(color, 30));
        gradient.addColorStop(1, Utils.darkenColor(color, 30));
        ctx.fillStyle = gradient;
        
        if (building.type === 'headquarters') {
            // HQ - larger pentagon
            ctx.beginPath();
            for (var i = 0; i < 5; i++) {
                var angle = (i * 72 - 90) * Math.PI / 180;
                var px = x + Math.cos(angle) * size * 1.2;
                var py = y + Math.sin(angle) * size * 1.2;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = size * 0.08;
            ctx.stroke();
        } else if (building.type === 'barracks') {
            // Barracks - rectangle with details
            ctx.fillRect(x - size, y - size * 0.7, size * 2, size * 1.4);
            ctx.fillStyle = Utils.darkenColor(color, 50);
            ctx.fillRect(x - size * 0.8, y - size * 0.5, size * 0.4, size * 0.8);
            ctx.fillRect(x + size * 0.4, y - size * 0.5, size * 0.4, size * 0.8);
        } else if (building.type === 'radar') {
            // Radar dish
            ctx.beginPath();
            ctx.arc(x, y, size * 0.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(x, y, size * 0.5, Math.PI, Math.PI * 2);
            ctx.fill();
            // Antenna
            ctx.strokeStyle = '#666';
            ctx.lineWidth = size * 0.1;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y - size * 1.2);
            ctx.stroke();
        } else {
            // Resource buildings
            ctx.beginPath();
            ctx.arc(x, y, size * 0.9, 0, Math.PI * 2);
            ctx.fill();
            
            // Level badge
            if (building.level > 1) {
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.arc(x + size * 0.6, y - size * 0.6, size * 0.35, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#000';
                ctx.font = 'bold ' + (size * 0.4) + 'px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(building.level, x + size * 0.6, y - size * 0.55);
            }
        }
        
        // Icon
        ctx.font = (size * 0.8) + 'px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(config.icon, x, y);
    },
    
    renderUnits: function(gameState, camera) {
        var ctx = this.ctx;
        var units = gameState.units;
        
        for (var i = 0; i < units.length; i++) {
            var unit = units[i];
            var config = CONFIG.UNITS[unit.type];
            if (!config) continue;
            
            var owner = gameState.players[unit.owner];
            var color = owner ? CONFIG.COUNTRIES[owner.country].primary : '#666';
            var size = CONFIG.TILE_SIZE * 0.04;
            
            // Selection glow
            if (unit.selected) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = size * 0.15;
                ctx.beginPath();
                ctx.arc(unit.x, unit.y, size * 1.5, 0, Math.PI * 2);
                ctx.stroke();
                
                // Range indicator
                ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                ctx.lineWidth = size * 0.1;
                ctx.setLineDash([size * 0.3, size * 0.3]);
                ctx.beginPath();
                ctx.arc(unit.x, unit.y, config.range, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(unit.x + size * 0.1, unit.y + size * 0.8, size * 0.8, size * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Unit body with gradient
            var gradient = ctx.createRadialGradient(unit.x - size * 0.3, unit.y - size * 0.3, 0, unit.x, unit.y, size);
            gradient.addColorStop(0, Utils.lightenColor(color, 50));
            gradient.addColorStop(1, Utils.darkenColor(color, 30));
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(unit.x, unit.y, size, 0, Math.PI * 2);
            ctx.fill();
            
            // Border
            ctx.strokeStyle = Utils.darkenColor(color, 50);
            ctx.lineWidth = size * 0.1;
            ctx.stroke();
            
            // Icon
            ctx.font = (size * 1.2) + 'px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(config.icon, unit.x, unit.y);
            
            // Health bar
            var healthPercent = unit.hp / unit.maxHp;
            var barWidth = size * 2;
            var barHeight = size * 0.25;
            ctx.fillStyle = '#333';
            ctx.fillRect(unit.x - barWidth/2, unit.y - size * 1.5, barWidth, barHeight);
            ctx.fillStyle = healthPercent > 0.5 ? '#4a4' : healthPercent > 0.25 ? '#aa4' : '#a44';
            ctx.fillRect(unit.x - barWidth/2, unit.y - size * 1.5, barWidth * healthPercent, barHeight);
        }
    },
    
    renderProjectiles: function(gameState) {
        var ctx = this.ctx;
        var projectiles = gameState.projectiles || [];
        
        for (var i = 0; i < projectiles.length; i++) {
            var p = projectiles[i];
            var size = CONFIG.TILE_SIZE * 0.015;
            
            // Trail
            ctx.strokeStyle = p.fromTower ? '#ff6600' : '#ffff00';
            ctx.lineWidth = size * 0.5;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.moveTo(p.x - p.vx * 3, p.y - p.vy * 3);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            ctx.globalAlpha = 1;
            
            // Projectile
            var gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);
            gradient.addColorStop(0, '#fff');
            gradient.addColorStop(0.5, p.fromTower ? '#ff6600' : '#ffff00');
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    },
    
    renderExplosions: function(gameState) {
        var ctx = this.ctx;
        var explosions = gameState.explosions || [];
        
        for (var i = 0; i < explosions.length; i++) {
            var e = explosions[i];
            var progress = e.time / e.duration;
            var size = e.size * (1 + progress);
            var alpha = 1 - progress;
            
            // Outer glow
            var gradient = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, size);
            gradient.addColorStop(0, 'rgba(255,200,100,' + alpha + ')');
            gradient.addColorStop(0.3, 'rgba(255,100,50,' + (alpha * 0.8) + ')');
            gradient.addColorStop(0.6, 'rgba(200,50,0,' + (alpha * 0.5) + ')');
            gradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(e.x, e.y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    },
    
    renderSelection: function(gameState, camera) {
        var ctx = this.ctx;
        var selection = gameState.selection;
        
        if (selection && selection.active) {
            ctx.strokeStyle = '#0f0';
            ctx.lineWidth = 30;
            ctx.setLineDash([50, 30]);
            ctx.strokeRect(
                selection.startX,
                selection.startY,
                selection.endX - selection.startX,
                selection.endY - selection.startY
            );
            ctx.setLineDash([]);
        }
    },
    
    renderMinimap: function(gameState, camera) {
        var ctx = this.minimapCtx;
        var canvas = this.minimapCanvas;
        var scale = canvas.width / (CONFIG.MAP_WIDTH * CONFIG.TILE_SIZE);
        
        // Background
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Tiles
        var tiles = gameState.map.tiles;
        var tileW = canvas.width / CONFIG.MAP_WIDTH;
        var tileH = canvas.height / CONFIG.MAP_HEIGHT;
        
        for (var y = 0; y < CONFIG.MAP_HEIGHT; y++) {
            for (var x = 0; x < CONFIG.MAP_WIDTH; x++) {
                var tile = tiles[y][x];
                
                if (tile.terrain === 'water') {
                    ctx.fillStyle = '#1e3a5f';
                } else if (tile.terrain === 'mountain') {
                    ctx.fillStyle = '#5a5a5a';
                } else if (tile.owner !== null) {
                    var owner = gameState.players[tile.owner];
                    ctx.fillStyle = owner ? CONFIG.COUNTRIES[owner.country].primary : '#2d4a2d';
                } else {
                    ctx.fillStyle = '#2d4a2d';
                }
                
                ctx.fillRect(x * tileW, y * tileH, tileW, tileH);
            }
        }
        
        // Units
        ctx.fillStyle = '#fff';
        for (var i = 0; i < gameState.units.length; i++) {
            var u = gameState.units[i];
            ctx.fillRect(u.x * scale - 1, u.y * scale - 1, 3, 3);
        }
        
        // Buildings
        ctx.fillStyle = '#ff0';
        for (var i = 0; i < gameState.buildings.length; i++) {
            var b = gameState.buildings[i];
            ctx.fillRect(b.x * scale - 2, b.y * scale - 2, 4, 4);
        }
        
        // Camera viewport
        var viewWidth = this.canvas.width / camera.zoom;
        var viewHeight = this.canvas.height / camera.zoom;
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            camera.x * scale,
            camera.y * scale,
            viewWidth * scale,
            viewHeight * scale
        );
    }
};

window.Renderer = Renderer;
