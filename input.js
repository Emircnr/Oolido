/* ============================================
   TACTICAL COMMAND - INPUT SYSTEM
   Mouse, keyboard, touch controls
   ============================================ */

const InputSystem = {
    keys: {},
    mouse: { x: 0, y: 0, worldX: 0, worldY: 0 },
    isDragging: false,
    dragStart: null,
    selectionBox: null,
    
    init(canvas) {
        this.canvas = canvas;
        
        // Mouse events
        canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        canvas.addEventListener('wheel', (e) => this.onWheel(e));
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Keyboard events
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        
        // Touch events
        canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
        canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
        canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));
        
        // Minimap click
        const minimap = document.getElementById('minimap');
        if (minimap) {
            minimap.addEventListener('click', (e) => this.onMinimapClick(e));
        }
    },
    
    updateMouseWorld(camera) {
        this.mouse.worldX = this.mouse.x / camera.zoom + camera.x;
        this.mouse.worldY = this.mouse.y / camera.zoom + camera.y;
        GameState.mouse = { ...this.mouse };
    },
    
    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
        this.updateMouseWorld(Game.camera);
        
        if (e.button === 0) {
            this.onLeftClick();
        } else if (e.button === 2) {
            this.onRightClick();
        }
    },
    
    onLeftClick() {
        // Build mode
        if (GameState.buildMode) {
            const gridSize = CONFIG.BUILDING_GRID;
            const x = Math.floor(this.mouse.worldX / gridSize) * gridSize;
            const y = Math.floor(this.mouse.worldY / gridSize) * gridSize;
            
            EntitySystem.placeBuilding(GameState.buildMode, x, y);
            
            if (!this.keys['Shift']) {
                GameState.buildMode = null;
            }
            return;
        }
        
        // Check for entity selection
        const entity = EntitySystem.getEntityAtPoint(this.mouse.worldX, this.mouse.worldY);
        const myId = GameState.isMultiplayer ? Multiplayer.playerId : 'player';
        
        if (entity) {
            if (entity.entityType === 'resourceBuilding') {
                GameState.selectedUnits = [];
                GameState.selectedBuilding = null;
                GameState.selectedResourceBuilding = entity;
                UI.updateSelectionPanel();
                return;
            }
            
            if (entity.entityType === 'building' && entity.owner === myId) {
                GameState.selectedUnits = [];
                GameState.selectedBuilding = entity;
                GameState.selectedResourceBuilding = null;
                UI.updateSelectionPanel();
                return;
            }
            
            if (entity.entityType === 'unit' && entity.owner === myId) {
                if (this.keys['Shift']) {
                    if (entity.selected) {
                        entity.selected = false;
                        GameState.selectedUnits = GameState.selectedUnits.filter(u => u !== entity);
                    } else {
                        entity.selected = true;
                        GameState.selectedUnits.push(entity);
                    }
                } else {
                    GameState.selectedUnits.forEach(u => u.selected = false);
                    GameState.selectedUnits = [entity];
                    entity.selected = true;
                }
                GameState.selectedBuilding = null;
                GameState.selectedResourceBuilding = null;
                UI.updateSelectionPanel();
                return;
            }
        }
        
        // Start selection box
        this.isDragging = true;
        this.dragStart = { x: this.mouse.x, y: this.mouse.y };
        GameState.selectionBox = {
            x1: this.mouse.x,
            y1: this.mouse.y,
            x2: this.mouse.x,
            y2: this.mouse.y
        };
        
        // Clear selection if not shift
        if (!this.keys['Shift']) {
            GameState.selectedUnits.forEach(u => u.selected = false);
            GameState.selectedUnits = [];
            GameState.selectedBuilding = null;
            GameState.selectedResourceBuilding = null;
        }
    },
    
    onRightClick() {
        GameState.buildMode = null;
        
        const myId = GameState.isMultiplayer ? Multiplayer.playerId : 'player';
        
        if (GameState.selectedUnits.length > 0) {
            // Check for attack target
            const entity = EntitySystem.getEntityAtPoint(this.mouse.worldX, this.mouse.worldY);
            
            if (entity && entity.owner !== myId && entity.entityType !== 'resourceBuilding') {
                // Attack command
                for (const unit of GameState.selectedUnits) {
                    unit.attackTarget = entity;
                    unit.moveTarget = null;
                }
                CombatSystem.createExplosion(this.mouse.worldX, this.mouse.worldY, 'small');
            } else {
                // Move command
                const center = this.calculateFormationCenter();
                const spacing = 80;
                const unitsPerRow = Math.ceil(Math.sqrt(GameState.selectedUnits.length));
                
                GameState.selectedUnits.forEach((unit, i) => {
                    const row = Math.floor(i / unitsPerRow);
                    const col = i % unitsPerRow;
                    const offsetX = (col - unitsPerRow / 2) * spacing;
                    const offsetY = (row - Math.floor(GameState.selectedUnits.length / unitsPerRow) / 2) * spacing;
                    
                    unit.moveTarget = {
                        x: this.mouse.worldX + offsetX,
                        y: this.mouse.worldY + offsetY
                    };
                    unit.attackTarget = null;
                });
            }
        } else if (GameState.selectedBuilding) {
            // Set rally point
            GameState.selectedBuilding.rallyPoint = {
                x: this.mouse.worldX,
                y: this.mouse.worldY
            };
            UI.notify('Toplanma noktası belirlendi.', 'info');
        }
    },
    
    calculateFormationCenter() {
        if (GameState.selectedUnits.length === 0) return { x: 0, y: 0 };
        
        let sumX = 0, sumY = 0;
        for (const unit of GameState.selectedUnits) {
            sumX += unit.x;
            sumY += unit.y;
        }
        
        return {
            x: sumX / GameState.selectedUnits.length,
            y: sumY / GameState.selectedUnits.length
        };
    },
    
    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
        this.updateMouseWorld(Game.camera);
        
        if (this.isDragging && this.dragStart) {
            GameState.selectionBox = {
                x1: Math.min(this.dragStart.x, this.mouse.x),
                y1: Math.min(this.dragStart.y, this.mouse.y),
                x2: Math.max(this.dragStart.x, this.mouse.x),
                y2: Math.max(this.dragStart.y, this.mouse.y)
            };
        }
    },
    
    onMouseUp(e) {
        if (this.isDragging && this.dragStart) {
            this.finishSelection();
        }
        this.isDragging = false;
        this.dragStart = null;
        GameState.selectionBox = null;
    },
    
    finishSelection() {
        if (!GameState.selectionBox) return;
        
        const box = GameState.selectionBox;
        const camera = Game.camera;
        const myId = GameState.isMultiplayer ? Multiplayer.playerId : 'player';
        
        const worldBox = {
            x1: box.x1 / camera.zoom + camera.x,
            y1: box.y1 / camera.zoom + camera.y,
            x2: box.x2 / camera.zoom + camera.x,
            y2: box.y2 / camera.zoom + camera.y
        };
        
        const minX = Math.min(worldBox.x1, worldBox.x2);
        const maxX = Math.max(worldBox.x1, worldBox.x2);
        const minY = Math.min(worldBox.y1, worldBox.y2);
        const maxY = Math.max(worldBox.y1, worldBox.y2);
        
        // Only select if box is big enough
        if (Math.abs(maxX - minX) < 20 && Math.abs(maxY - minY) < 20) return;
        
        if (!this.keys['Shift']) {
            GameState.selectedUnits.forEach(u => u.selected = false);
            GameState.selectedUnits = [];
        }
        
        for (const unit of GameState.units) {
            if (unit.owner === myId &&
                unit.x >= minX && unit.x <= maxX &&
                unit.y >= minY && unit.y <= maxY) {
                unit.selected = true;
                if (!GameState.selectedUnits.includes(unit)) {
                    GameState.selectedUnits.push(unit);
                }
            }
        }
        
        GameState.selectedBuilding = null;
        GameState.selectedResourceBuilding = null;
        UI.updateSelectionPanel();
    },
    
    onWheel(e) {
        e.preventDefault();
        const zoomDelta = -e.deltaY * CONFIG.ZOOM_SPEED;
        const newZoom = Utils.clamp(
            Game.camera.zoom + zoomDelta,
            CONFIG.MIN_ZOOM,
            CONFIG.MAX_ZOOM
        );
        
        // Zoom toward mouse position
        const mouseWorldX = this.mouse.x / Game.camera.zoom + Game.camera.x;
        const mouseWorldY = this.mouse.y / Game.camera.zoom + Game.camera.y;
        
        Game.camera.zoom = newZoom;
        
        Game.camera.x = mouseWorldX - this.mouse.x / newZoom;
        Game.camera.y = mouseWorldY - this.mouse.y / newZoom;
    },
    
    onKeyDown(e) {
        this.keys[e.key] = true;
        
        // Hotkeys
        if (e.key === 'Escape') {
            GameState.buildMode = null;
            GameState.selectedUnits.forEach(u => u.selected = false);
            GameState.selectedUnits = [];
            GameState.selectedBuilding = null;
            GameState.selectedResourceBuilding = null;
            UI.updateSelectionPanel();
        }
        
        // Control groups (1-9)
        if (e.key >= '1' && e.key <= '9') {
            const group = parseInt(e.key);
            
            if (e.ctrlKey) {
                // Set control group
                GameState.controlGroups[group] = [...GameState.selectedUnits];
                UI.notify(`Grup ${group} kaydedildi.`, 'info');
            } else {
                // Select control group
                if (GameState.controlGroups[group] && GameState.controlGroups[group].length > 0) {
                    GameState.selectedUnits.forEach(u => u.selected = false);
                    GameState.selectedUnits = GameState.controlGroups[group].filter(u => 
                        u.hp > 0 && GameState.units.includes(u)
                    );
                    GameState.selectedUnits.forEach(u => u.selected = true);
                    GameState.selectedBuilding = null;
                    UI.updateSelectionPanel();
                }
            }
        }
        
        // Select all units (Ctrl+A)
        if (e.key === 'a' && e.ctrlKey) {
            e.preventDefault();
            const myId = GameState.isMultiplayer ? Multiplayer.playerId : 'player';
            GameState.selectedUnits = GameState.units.filter(u => u.owner === myId);
            GameState.selectedUnits.forEach(u => u.selected = true);
            UI.updateSelectionPanel();
        }
        
        // Delete selected
        if (e.key === 'Delete') {
            // Sell/destroy selected building
            if (GameState.selectedBuilding && GameState.selectedBuilding.type !== 'headquarters') {
                const building = GameState.selectedBuilding;
                const def = BUILDINGS[building.type];
                Economy.dollars += Math.floor((def.cost?.dollars || 0) * 0.5);
                building.hp = 0;
                UI.notify(`${def.name} satıldı.`, 'info');
            }
        }
    },
    
    onKeyUp(e) {
        this.keys[e.key] = false;
    },
    
    onTouchStart(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = touch.clientX - rect.left;
            this.mouse.y = touch.clientY - rect.top;
            this.updateMouseWorld(Game.camera);
            this.onLeftClick();
        }
    },
    
    onTouchMove(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = touch.clientX - rect.left;
            this.mouse.y = touch.clientY - rect.top;
            this.updateMouseWorld(Game.camera);
        }
    },
    
    onTouchEnd(e) {
        e.preventDefault();
        this.onMouseUp({ button: 0 });
    },
    
    onMinimapClick(e) {
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const bounds = MapSystem.getBounds();
        const scaleX = bounds.width / e.target.width;
        const scaleY = bounds.height / e.target.height;
        
        Game.camera.x = x * scaleX - this.canvas.width / Game.camera.zoom / 2;
        Game.camera.y = y * scaleY - this.canvas.height / Game.camera.zoom / 2;
    },
    
    update(dt) {
        // Edge panning
        const margin = CONFIG.EDGE_PAN_MARGIN;
        const speed = CONFIG.EDGE_PAN_SPEED * dt;
        
        if (this.mouse.x < margin) Game.camera.x -= speed;
        if (this.mouse.x > this.canvas.width - margin) Game.camera.x += speed;
        if (this.mouse.y < margin) Game.camera.y -= speed;
        if (this.mouse.y > this.canvas.height - margin) Game.camera.y += speed;
        
        // Keyboard panning
        const keySpeed = CONFIG.PAN_SPEED * dt;
        if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) Game.camera.x -= keySpeed;
        if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) Game.camera.x += keySpeed;
        if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) Game.camera.y -= keySpeed;
        if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) Game.camera.y += keySpeed;
        
        // Clamp camera
        const bounds = MapSystem.getBounds();
        Game.camera.x = Utils.clamp(Game.camera.x, 0, bounds.width - this.canvas.width / Game.camera.zoom);
        Game.camera.y = Utils.clamp(Game.camera.y, 0, bounds.height - this.canvas.height / Game.camera.zoom);
    }
};

if (typeof window !== 'undefined') {
    window.InputSystem = InputSystem;
}
