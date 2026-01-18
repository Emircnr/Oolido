/* ============================================
   TACTICAL COMMAND - RENDERER
   Country flags, multiplayer, radar
   ============================================ */

const Renderer = {
    canvas: null,
    ctx: null,
    minimapCanvas: null,
    minimapCtx: null,
    playerColors: {},
    radarPulse: 0,
    
    init(canvas, minimapCanvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.minimapCanvas = minimapCanvas;
        this.minimapCtx = minimapCanvas.getContext('2d');
        this.resize();
    },
    
    setPlayerColors(players) {
        this.playerColors = {};
        for (const player of players) {
            const country = COUNTRIES[player.country];
            if (country) {
                this.playerColors[player.id] = {
                    primary: country.color,
                    secondary: country.secondary,
                    flag: country.flag,
                    name: country.name
                };
            }
        }
        this.playerColors['player'] = this.playerColors[Multiplayer?.playerId] || 
            { primary: '#0088ff', secondary: '#ffffff', flag: '🎮', name: 'Oyuncu' };
        this.playerColors['enemy'] = { primary: '#ff2244', secondary: '#ffffff', flag: '👾', name: 'Düşman' };
    },
    
    getPlayerColor(ownerId) {
        return this.playerColors[ownerId] || { primary: '#888888', secondary: '#ffffff', flag: '❓', name: 'Bilinmiyor' };
    },
    
    resize() {
        const container = document.getElementById('gameContainer');
        if (!container) return;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
    },
    
    render(camera) {
        const ctx = this.ctx;
        
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
        
        this.radarPulse = (this.radarPulse + 0.02) % 1;
    },
    
    renderTiles(camera) {
        const ctx = this.ctx;
        const visibleTiles = MapSystem.getVisibleTiles(camera, this.canvas);
        const tileSize = CONFIG.TILE_SIZE;
        
        for (const tile of visibleTiles) {
            if (!tile) continue;
            
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(tile.x, tile.y, tileSize, tileSize);
            
            if (tile.owner) {
                const color = this.getPlayerColor(tile.owner);
                
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
                const color = this.getPlayerColor(tile.capturingTeam);
                const radius = tileSize * 0.1;
                
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.lineWidth = 40;
                ctx.beginPath();
                ctx.arc(tile.centerX, tile.centerY, radius, 0, Math.PI * 2);
                ctx.stroke();
                
                ctx.strokeStyle = color.primary;
                ctx.lineWidth = 32;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.arc(tile.centerX, tile.centerY, radius, -Math.PI / 2, -Math.PI / 2 + tile.captureProgress * Math.PI * 2);
                ctx.stroke();
                ctx.lineCap = 'butt';
                
                ctx.fillStyle = '#000';
                ctx.font = 'bold 100px Arial';
                ctx.fillText(`${Math.floor(tile.captureProgress * 100)}%`, tile.centerX, tile.centerY);
            }
        }
    },
    
    renderGrid(camera) {
        const ctx = this.ctx;
        const tileSize = CONFIG.TILE_SIZE;
        const bounds = MapSystem.getBounds();
        
        ctx.strokeStyle = CONFIG.GRID_COLOR;
        ctx.lineWidth = 4;
        ctx.beginPath();
        
        for (let x = 0; x <= bounds.width; x += tileSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, bounds.height);
        }
        for (let y = 0; y <= bounds.height; y += tileSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(bounds.width, y);
        }
        
        ctx.stroke();
    },
    
    renderResourceBuildings(camera) {
        const ctx = this.ctx;
        
        for (const rb of MapSystem.resourceBuildings) {
            if (!Utils.isOnScreen(rb.x, rb.y, camera, this.canvas, rb.size + 100)) continue;
            
            const resInfo = CONFIG.RESOURCES[rb.resourceType];
            const tile = MapSystem.getTileById(rb.tileId);
            const owner = tile ? tile.owner : null;
            
            let borderColor = owner ? this.getPlayerColor(owner).primary : '#666666';
            const halfSize = rb.size / 2;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
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
            ctx.font = `${rb.size * 0.5}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(resInfo.symbol, rb.x, rb.y);
            
            ctx.fillStyle = '#333';
            ctx.font = `bold ${Math.max(18, rb.size * 0.18)}px Arial`;
            ctx.fillText(`${rb.production}/m`, rb.x, rb.y + halfSize + 25);
            
            if (rb.level > 1) {
                ctx.fillStyle = '#ffd700';
                ctx.font = `bold ${Math.max(16, rb.size * 0.16)}px Arial`;
                ctx.fillText(`Lv.${rb.level}`, rb.x, rb.y - halfSize - 18);
            }
            
            if (GameState.selectedResourceBuilding && GameState.selectedResourceBuilding.id === rb.id) {
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 5;
                ctx.setLineDash([15, 8]);
                ctx.beginPath();
                ctx.arc(rb.x, rb.y, halfSize + 15, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    },
    
    renderBuildings(camera) {
        const ctx = this.ctx;
        
        for (const building of GameState.buildings) {
            if (!Utils.isOnScreen(building.x, building.y, camera, this.canvas, building.size + 200)) continue;
            
            const def = BUILDINGS[building.type];
            const size = building.size;
            const color = this.getPlayerColor(building.owner);
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(building.x + 10, building.y + 10, size, size);
            
            const gradient = ctx.createLinearGradient(building.x, building.y, building.x, building.y + size);
            gradient.addColorStop(0, color.primary);
            gradient.addColorStop(1, Utils.darkenColor(color.primary, 25));
            ctx.fillStyle = gradient;
            ctx.fillRect(building.x, building.y, size, size);
            
            ctx.strokeStyle = color.secondary;
            ctx.lineWidth = 4;
            ctx.strokeRect(building.x, building.y, size, size);
            
            ctx.fillStyle = '#fff';
            ctx.font = `${size * 0.4}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(def.symbol, building.x + size/2, building.y + size/2);
            
            if (building.hp < building.maxHp) {
                const barWidth = size;
                const barHeight = 16;
                const barY = building.y - 35;
                const hpPercent = building.hp / building.maxHp;
                
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.fillRect(building.x, barY, barWidth, barHeight);
                
                const hpColor = hpPercent > 0.5 ? '#00ff88' : hpPercent > 0.25 ? '#ffaa00' : '#ff3355';
                ctx.fillStyle = hpColor;
                ctx.fillRect(building.x, barY, barWidth * hpPercent, barHeight);
            }
            
            if (GameState.selectedBuilding === building) {
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 5;
                ctx.setLineDash([15, 8]);
                ctx.strokeRect(building.x - 12, building.y - 12, size + 24, size + 24);
                ctx.setLineDash([]);
                
                if (def.attackRange) {
                    ctx.strokeStyle = 'rgba(255, 80, 80, 0.5)';
                    ctx.fillStyle = 'rgba(255, 80, 80, 0.08)';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(building.x + size/2, building.y + size/2, def.attackRange, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                }
                
                if (def.healRange) {
                    ctx.strokeStyle = 'rgba(0, 255, 100, 0.5)';
                    ctx.fillStyle = 'rgba(0, 255, 100, 0.08)';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(building.x + size/2, building.y + size/2, def.healRange, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                }
                
                if (def.radarRange) {
                    ctx.strokeStyle = 'rgba(0, 200, 255, 0.4)';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([20, 10]);
                    ctx.beginPath();
                    ctx.arc(building.x + size/2, building.y + size/2, def.radarRange, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            }
        }
    },
    
    renderUnits(camera) {
        const ctx = this.ctx;
        let rendered = 0;
        
        for (const unit of GameState.units) {
            if (rendered >= CONFIG.MAX_UNITS_RENDER) break;
            if (!Utils.isOnScreen(unit.x, unit.y, camera, this.canvas, 150)) continue;
            
            const def = UNITS[unit.type];
            const color = this.getPlayerColor(unit.owner);
            const isAir = def.isAir;
            const drawY = unit.y - (isAir ? 70 : 0);
            
            if (isAir) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
                ctx.beginPath();
                ctx.ellipse(unit.x, unit.y + 25, 45, 18, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            
            const unitSize = 50;
            
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
            
            const hpPercent = unit.hp / unit.maxHp;
            if (hpPercent < 1) {
                const barWidth = 70;
                const barHeight = 10;
                const barY = drawY - unitSize - 20;
                
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.fillRect(unit.x - barWidth/2, barY, barWidth, barHeight);
                
                const hpColor = hpPercent > 0.5 ? '#00ff88' : hpPercent > 0.25 ? '#ffaa00' : '#ff3355';
                ctx.fillStyle = hpColor;
                ctx.fillRect(unit.x - barWidth/2, barY, barWidth * hpPercent, barHeight);
            }
            
            if (unit.selected) {
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(unit.x, drawY, unitSize + 12, 0, Math.PI * 2);
                ctx.stroke();
                
                if (unit.attackRange > 0) {
                    ctx.strokeStyle = 'rgba(255, 200, 0, 0.4)';
                    ctx.fillStyle = 'rgba(255, 200, 0, 0.06)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(unit.x, drawY, unit.attackRange, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                }
            }
            
            rendered++;
        }
    },
    
    renderEffects(camera) {
        const ctx = this.ctx;
        const effects = CombatSystem.getEffects();
        
        for (const proj of effects.projectiles) {
            const effect = ATTACK_EFFECTS[proj.effectType] || ATTACK_EFFECTS.bullet;
            if (!effect) continue;
            
            if (proj.trail && proj.trail.length > 1) {
                ctx.strokeStyle = Utils.hexToRgba(effect.color, 0.4);
                ctx.lineWidth = effect.size * 0.7;
                ctx.beginPath();
                ctx.moveTo(proj.trail[0].x, proj.trail[0].y);
                for (let i = 1; i < proj.trail.length; i++) {
                    ctx.lineTo(proj.trail[i].x, proj.trail[i].y);
                }
                ctx.stroke();
            }
            
            ctx.fillStyle = effect.color;
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, effect.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        for (const exp of effects.explosions) {
            const gradient = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, exp.radius);
            gradient.addColorStop(0, `rgba(255, 220, 100, ${exp.alpha})`);
            gradient.addColorStop(0.4, `rgba(255, 120, 50, ${exp.alpha * 0.6})`);
            gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        for (const num of effects.damageNumbers) {
            ctx.fillStyle = '#ff3333';
            ctx.globalAlpha = num.alpha;
            ctx.font = 'bold 40px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`-${num.damage}`, num.x, num.y + num.offsetY);
            ctx.globalAlpha = 1;
        }
    },
    
    renderBuildPreview(camera) {
        if (!GameState.buildMode) return;
        
        const ctx = this.ctx;
        const def = BUILDINGS[GameState.buildMode];
        const size = def.size || 200;
        
        const gridSize = CONFIG.BUILDING_GRID;
        const x = Math.floor(GameState.mouse.worldX / gridSize) * gridSize;
        const y = Math.floor(GameState.mouse.worldY / gridSize) * gridSize;
        
        const check = EntitySystem.canBuildAt(GameState.buildMode, x, y);
        
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = check.can ? '#00ff88' : '#ff3355';
        ctx.fillRect(x, y, size, size);
        
        ctx.strokeStyle = check.can ? '#00ff88' : '#ff3355';
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, size, size);
        
        ctx.fillStyle = '#fff';
        ctx.font = `${size * 0.4}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(def.symbol, x + size/2, y + size/2);
        
        ctx.globalAlpha = 1;
    },
    
    renderSelectionBox() {
        if (!GameState.selectionBox) return;
        
        const ctx = this.ctx;
        const box = GameState.selectionBox;
        const myColor = this.getPlayerColor(GameState.isMultiplayer ? Multiplayer.playerId : 'player');
        
        ctx.strokeStyle = myColor.primary;
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(box.x1, box.y1, box.x2 - box.x1, box.y2 - box.y1);
        ctx.setLineDash([]);
        
        ctx.fillStyle = Utils.hexToRgba(myColor.primary, 0.12);
        ctx.fillRect(box.x1, box.y1, box.x2 - box.x1, box.y2 - box.y1);
    },
    
    renderMinimap(camera) {
        const ctx = this.minimapCtx;
        const canvas = this.minimapCanvas;
        
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const mapBounds = MapSystem.getBounds();
        const scaleX = canvas.width / mapBounds.width;
        const scaleY = canvas.height / mapBounds.height;
        
        for (const tile of MapSystem.tiles) {
            if (tile.owner) {
                const color = this.getPlayerColor(tile.owner);
                ctx.fillStyle = Utils.hexToRgba(color.primary, 0.6);
            } else {
                ctx.fillStyle = '#e0e0e0';
            }
            ctx.fillRect(tile.x * scaleX, tile.y * scaleY, CONFIG.TILE_SIZE * scaleX + 1, CONFIG.TILE_SIZE * scaleY + 1);
        }
        
        for (const rb of MapSystem.resourceBuildings) {
            const resInfo = CONFIG.RESOURCES[rb.resourceType];
            ctx.fillStyle = resInfo.color;
            ctx.beginPath();
            ctx.arc(rb.x * scaleX, rb.y * scaleY, Math.max(2, rb.size * scaleX / 2), 0, Math.PI * 2);
            ctx.fill();
        }
        
        for (const building of GameState.buildings) {
            const color = this.getPlayerColor(building.owner);
            ctx.fillStyle = color.primary;
            ctx.fillRect(building.x * scaleX - 2, building.y * scaleY - 2, 5, 5);
        }
        
        const myId = GameState.isMultiplayer ? Multiplayer.playerId : 'player';
        for (const unit of GameState.units) {
            const color = this.getPlayerColor(unit.owner);
            ctx.fillStyle = color.primary;
            ctx.fillRect(unit.x * scaleX - 1, unit.y * scaleY - 1, 3, 3);
        }
        
        const viewX = camera.x * scaleX;
        const viewY = camera.y * scaleY;
        const viewW = (this.canvas.width / camera.zoom) * scaleX;
        const viewH = (this.canvas.height / camera.zoom) * scaleY;
        
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.strokeRect(viewX, viewY, viewW, viewH);
    }
};

if (typeof window !== 'undefined') window.Renderer = Renderer;
