const InputSystem = {
    keys: {},
    mouse: { x: 0, y: 0, worldX: 0, worldY: 0 },
    isDragging: false,
    dragStart: null,
    canvas: null,
    
    init: function(canvas) {
        this.canvas = canvas;
        var self = this;
        
        canvas.addEventListener('mousedown', function(e) { self.onMouseDown(e); });
        canvas.addEventListener('mousemove', function(e) { self.onMouseMove(e); });
        canvas.addEventListener('mouseup', function(e) { self.onMouseUp(e); });
        canvas.addEventListener('wheel', function(e) { self.onWheel(e); });
        canvas.addEventListener('contextmenu', function(e) { e.preventDefault(); });
        
        document.addEventListener('keydown', function(e) { self.keys[e.key] = true; });
        document.addEventListener('keyup', function(e) { self.keys[e.key] = false; });
        
        var minimap = document.getElementById('minimap');
        if (minimap) {
            minimap.addEventListener('click', function(e) { self.onMinimapClick(e); });
        }
    },
    
    updateMouseWorld: function(camera) {
        this.mouse.worldX = this.mouse.x / camera.zoom + camera.x;
        this.mouse.worldY = this.mouse.y / camera.zoom + camera.y;
        GameState.mouse = { x: this.mouse.x, y: this.mouse.y, worldX: this.mouse.worldX, worldY: this.mouse.worldY };
    },
    
    onMouseDown: function(e) {
        var rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
        this.updateMouseWorld(Game.camera);
        
        if (e.button === 0) this.onLeftClick();
        else if (e.button === 2) this.onRightClick();
    },
    
    onLeftClick: function() {
        var myId = GameState.isMultiplayer ? Multiplayer.playerId : 'player';
        
        if (GameState.buildMode) {
            var gridSize = CONFIG.BUILDING_GRID;
            var x = Math.floor(this.mouse.worldX / gridSize) * gridSize;
            var y = Math.floor(this.mouse.worldY / gridSize) * gridSize;
            EntitySystem.placeBuilding(GameState.buildMode, x, y);
            if (!this.keys['Shift']) GameState.buildMode = null;
            return;
        }
        
        var entity = EntitySystem.getEntityAtPoint(this.mouse.worldX, this.mouse.worldY);
        
        if (entity) {
            if (entity.entityType === 'resourceBuilding') {
                GameState.selectedUnits.forEach(function(u) { u.selected = false; });
                GameState.selectedUnits = [];
                GameState.selectedBuilding = null;
                GameState.selectedResourceBuilding = entity;
                UI.updateSelectionPanel();
                return;
            }
            
            if (entity.entityType === 'building' && entity.owner === myId) {
                GameState.selectedUnits.forEach(function(u) { u.selected = false; });
                GameState.selectedUnits = [];
                GameState.selectedBuilding = entity;
                GameState.selectedResourceBuilding = null;
                UI.updateSelectionPanel();
                return;
            }
            
            if (entity.entityType === 'unit' && entity.owner === myId) {
                if (!this.keys['Shift']) {
                    GameState.selectedUnits.forEach(function(u) { u.selected = false; });
                    GameState.selectedUnits = [];
                }
                entity.selected = true;
                GameState.selectedUnits.push(entity);
                GameState.selectedBuilding = null;
                GameState.selectedResourceBuilding = null;
                UI.updateSelectionPanel();
                return;
            }
        }
        
        this.isDragging = true;
        this.dragStart = { x: this.mouse.x, y: this.mouse.y };
        GameState.selectionBox = { x1: this.mouse.x, y1: this.mouse.y, x2: this.mouse.x, y2: this.mouse.y };
        
        if (!this.keys['Shift']) {
            GameState.selectedUnits.forEach(function(u) { u.selected = false; });
            GameState.selectedUnits = [];
            GameState.selectedBuilding = null;
            GameState.selectedResourceBuilding = null;
        }
    },
    
    onRightClick: function() {
        GameState.buildMode = null;
        var myId = GameState.isMultiplayer ? Multiplayer.playerId : 'player';
        
        if (GameState.selectedUnits.length > 0) {
            var entity = EntitySystem.getEntityAtPoint(this.mouse.worldX, this.mouse.worldY);
            
            if (entity && entity.owner !== myId && entity.entityType !== 'resourceBuilding') {
                GameState.selectedUnits.forEach(function(unit) {
                    unit.attackTarget = entity;
                    unit.moveTarget = null;
                });
            } else {
                var self = this;
                var spacing = 80;
                var unitsPerRow = Math.ceil(Math.sqrt(GameState.selectedUnits.length));
                GameState.selectedUnits.forEach(function(unit, i) {
                    var row = Math.floor(i / unitsPerRow);
                    var col = i % unitsPerRow;
                    var offsetX = (col - unitsPerRow / 2) * spacing;
                    var offsetY = (row - Math.floor(GameState.selectedUnits.length / unitsPerRow) / 2) * spacing;
                    unit.moveTarget = { x: self.mouse.worldX + offsetX, y: self.mouse.worldY + offsetY };
                    unit.attackTarget = null;
                });
            }
        } else if (GameState.selectedBuilding) {
            GameState.selectedBuilding.rallyPoint = { x: this.mouse.worldX, y: this.mouse.worldY };
            UI.notify('Toplanma noktası belirlendi', 'info');
        }
    },
    
    onMouseMove: function(e) {
        var rect = this.canvas.getBoundingClientRect();
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
    
    onMouseUp: function(e) {
        if (this.isDragging && this.dragStart) this.finishSelection();
        this.isDragging = false;
        this.dragStart = null;
        GameState.selectionBox = null;
    },
    
    finishSelection: function() {
        if (!GameState.selectionBox) return;
        var box = GameState.selectionBox;
        var camera = Game.camera;
        var myId = GameState.isMultiplayer ? Multiplayer.playerId : 'player';
        
        var minX = Math.min(box.x1, box.x2) / camera.zoom + camera.x;
        var maxX = Math.max(box.x1, box.x2) / camera.zoom + camera.x;
        var minY = Math.min(box.y1, box.y2) / camera.zoom + camera.y;
        var maxY = Math.max(box.y1, box.y2) / camera.zoom + camera.y;
        
        if (Math.abs(maxX - minX) < 20 && Math.abs(maxY - minY) < 20) return;
        
        if (!this.keys['Shift']) {
            GameState.selectedUnits.forEach(function(u) { u.selected = false; });
            GameState.selectedUnits = [];
        }
        
        GameState.units.forEach(function(unit) {
            if (unit.owner === myId && unit.x >= minX && unit.x <= maxX && unit.y >= minY && unit.y <= maxY) {
                unit.selected = true;
                GameState.selectedUnits.push(unit);
            }
        });
        
        GameState.selectedBuilding = null;
        GameState.selectedResourceBuilding = null;
        UI.updateSelectionPanel();
    },
    
    onWheel: function(e) {
        e.preventDefault();
        var zoomDelta = -e.deltaY * CONFIG.ZOOM_SPEED;
        var newZoom = Utils.clamp(Game.camera.zoom + zoomDelta, CONFIG.MIN_ZOOM, CONFIG.MAX_ZOOM);
        
        var mouseWorldX = this.mouse.x / Game.camera.zoom + Game.camera.x;
        var mouseWorldY = this.mouse.y / Game.camera.zoom + Game.camera.y;
        
        Game.camera.zoom = newZoom;
        Game.camera.x = mouseWorldX - this.mouse.x / newZoom;
        Game.camera.y = mouseWorldY - this.mouse.y / newZoom;
    },
    
    onMinimapClick: function(e) {
        var rect = e.target.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        var bounds = MapSystem.getBounds();
        var scaleX = bounds.width / e.target.width;
        var scaleY = bounds.height / e.target.height;
        Game.camera.x = x * scaleX - this.canvas.width / Game.camera.zoom / 2;
        Game.camera.y = y * scaleY - this.canvas.height / Game.camera.zoom / 2;
    },
    
    update: function(dt) {
        var margin = CONFIG.EDGE_PAN_MARGIN;
        var speed = CONFIG.EDGE_PAN_SPEED * dt;
        
        if (this.mouse.x < margin) Game.camera.x -= speed;
        if (this.mouse.x > this.canvas.width - margin) Game.camera.x += speed;
        if (this.mouse.y < margin) Game.camera.y -= speed;
        if (this.mouse.y > this.canvas.height - margin) Game.camera.y += speed;
        
        var keySpeed = CONFIG.PAN_SPEED * dt;
        if (this.keys['ArrowLeft'] || this.keys['a']) Game.camera.x -= keySpeed;
        if (this.keys['ArrowRight'] || this.keys['d']) Game.camera.x += keySpeed;
        if (this.keys['ArrowUp'] || this.keys['w']) Game.camera.y -= keySpeed;
        if (this.keys['ArrowDown'] || this.keys['s']) Game.camera.y += keySpeed;
        
        var bounds = MapSystem.getBounds();
        Game.camera.x = Utils.clamp(Game.camera.x, 0, bounds.width - this.canvas.width / Game.camera.zoom);
        Game.camera.y = Utils.clamp(Game.camera.y, 0, bounds.height - this.canvas.height / Game.camera.zoom);
    }
};

window.InputSystem = InputSystem;
