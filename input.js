const Input = {
    camera: {
        x: 0,
        y: 0,
        zoom: 0.05,
        targetZoom: 0.05,
        dragging: false,
        lastX: 0,
        lastY: 0
    },
    
    selection: {
        active: false,
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0
    },
    
    keys: {},
    mouseX: 0,
    mouseY: 0,
    canvas: null,
    gameState: null,
    
    init: function(canvas, gameState) {
        this.canvas = canvas;
        this.gameState = gameState;
        
        var self = this;
        
        // Keyboard
        window.addEventListener('keydown', function(e) {
            self.keys[e.code] = true;
            self.handleKeyDown(e);
        });
        
        window.addEventListener('keyup', function(e) {
            self.keys[e.code] = false;
        });
        
        // Mouse
        canvas.addEventListener('mousedown', function(e) {
            self.handleMouseDown(e);
        });
        
        canvas.addEventListener('mousemove', function(e) {
            self.handleMouseMove(e);
        });
        
        canvas.addEventListener('mouseup', function(e) {
            self.handleMouseUp(e);
        });
        
        canvas.addEventListener('wheel', function(e) {
            self.handleWheel(e);
        });
        
        canvas.addEventListener('contextmenu', function(e) {
            e.preventDefault();
        });
        
        // Center camera initially
        this.centerCamera();
    },
    
    centerCamera: function() {
        var mapWidth = CONFIG.MAP_WIDTH * CONFIG.TILE_SIZE;
        var mapHeight = CONFIG.MAP_HEIGHT * CONFIG.TILE_SIZE;
        this.camera.x = mapWidth / 2 - this.canvas.width / (2 * this.camera.zoom);
        this.camera.y = mapHeight / 2 - this.canvas.height / (2 * this.camera.zoom);
    },
    
    handleKeyDown: function(e) {
        // ESC - close panels
        if (e.code === 'Escape') {
            UI.closeAllPanels();
            this.deselectAll();
        }
        
        // Space - center on selected units
        if (e.code === 'Space') {
            this.centerOnSelected();
        }
        
        // B - toggle build panel
        if (e.code === 'KeyB') {
            UI.togglePanel('build');
        }
        
        // M - toggle market
        if (e.code === 'KeyM') {
            UI.togglePanel('market');
        }
        
        // Delete - delete selected units
        if (e.code === 'Delete') {
            this.deleteSelected();
        }
        
        // Number keys for unit groups
        if (e.code >= 'Digit1' && e.code <= 'Digit9') {
            var groupNum = parseInt(e.code.replace('Digit', ''));
            if (e.ctrlKey) {
                this.saveGroup(groupNum);
            } else {
                this.loadGroup(groupNum);
            }
        }
    },
    
    handleMouseDown: function(e) {
        var rect = this.canvas.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        
        if (e.button === 1 || (e.button === 0 && e.altKey)) {
            // Middle click or Alt+Left click - start panning
            this.camera.dragging = true;
            this.camera.lastX = e.clientX;
            this.camera.lastY = e.clientY;
        } else if (e.button === 0) {
            // Left click - start selection
            var worldPos = this.screenToWorld(x, y);
            this.selection.active = true;
            this.selection.startX = worldPos.x;
            this.selection.startY = worldPos.y;
            this.selection.endX = worldPos.x;
            this.selection.endY = worldPos.y;
        } else if (e.button === 2) {
            // Right click - command
            var worldPos = this.screenToWorld(x, y);
            this.issueCommand(worldPos.x, worldPos.y);
        }
    },
    
    handleMouseMove: function(e) {
        var rect = this.canvas.getBoundingClientRect();
        this.mouseX = e.clientX - rect.left;
        this.mouseY = e.clientY - rect.top;
        
        if (this.camera.dragging) {
            var dx = e.clientX - this.camera.lastX;
            var dy = e.clientY - this.camera.lastY;
            this.camera.x -= dx / this.camera.zoom;
            this.camera.y -= dy / this.camera.zoom;
            this.camera.lastX = e.clientX;
            this.camera.lastY = e.clientY;
            this.clampCamera();
        }
        
        if (this.selection.active) {
            var worldPos = this.screenToWorld(this.mouseX, this.mouseY);
            this.selection.endX = worldPos.x;
            this.selection.endY = worldPos.y;
        }
    },
    
    handleMouseUp: function(e) {
        if (e.button === 1 || (e.button === 0 && e.altKey)) {
            this.camera.dragging = false;
        }
        
        if (e.button === 0 && this.selection.active) {
            this.selection.active = false;
            this.processSelection();
        }
    },
    
    handleWheel: function(e) {
        e.preventDefault();
        
        var worldBefore = this.screenToWorld(this.mouseX, this.mouseY);
        
        var zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
        this.camera.zoom *= zoomDelta;
        this.camera.zoom = Math.max(CONFIG.MIN_ZOOM, Math.min(CONFIG.MAX_ZOOM, this.camera.zoom));
        
        var worldAfter = this.screenToWorld(this.mouseX, this.mouseY);
        
        this.camera.x += worldBefore.x - worldAfter.x;
        this.camera.y += worldBefore.y - worldAfter.y;
        
        this.clampCamera();
    },
    
    screenToWorld: function(screenX, screenY) {
        // Account for centering offset
        var mapPixelWidth = CONFIG.MAP_WIDTH * CONFIG.TILE_SIZE * this.camera.zoom;
        var mapPixelHeight = CONFIG.MAP_HEIGHT * CONFIG.TILE_SIZE * this.camera.zoom;
        var offsetX = 0;
        var offsetY = 0;
        
        if (mapPixelWidth < this.canvas.width) {
            offsetX = (this.canvas.width - mapPixelWidth) / 2;
        }
        if (mapPixelHeight < this.canvas.height) {
            offsetY = (this.canvas.height - mapPixelHeight) / 2;
        }
        
        return {
            x: (screenX - offsetX) / this.camera.zoom + this.camera.x,
            y: (screenY - offsetY) / this.camera.zoom + this.camera.y
        };
    },
    
    worldToScreen: function(worldX, worldY) {
        var mapPixelWidth = CONFIG.MAP_WIDTH * CONFIG.TILE_SIZE * this.camera.zoom;
        var mapPixelHeight = CONFIG.MAP_HEIGHT * CONFIG.TILE_SIZE * this.camera.zoom;
        var offsetX = 0;
        var offsetY = 0;
        
        if (mapPixelWidth < this.canvas.width) {
            offsetX = (this.canvas.width - mapPixelWidth) / 2;
        }
        if (mapPixelHeight < this.canvas.height) {
            offsetY = (this.canvas.height - mapPixelHeight) / 2;
        }
        
        return {
            x: (worldX - this.camera.x) * this.camera.zoom + offsetX,
            y: (worldY - this.camera.y) * this.camera.zoom + offsetY
        };
    },
    
    clampCamera: function() {
        var mapWidth = CONFIG.MAP_WIDTH * CONFIG.TILE_SIZE;
        var mapHeight = CONFIG.MAP_HEIGHT * CONFIG.TILE_SIZE;
        var viewWidth = this.canvas.width / this.camera.zoom;
        var viewHeight = this.canvas.height / this.camera.zoom;
        
        // Allow some padding
        var padding = CONFIG.TILE_SIZE;
        
        this.camera.x = Math.max(-padding, Math.min(mapWidth - viewWidth + padding, this.camera.x));
        this.camera.y = Math.max(-padding, Math.min(mapHeight - viewHeight + padding, this.camera.y));
    },
    
    processSelection: function() {
        var minX = Math.min(this.selection.startX, this.selection.endX);
        var maxX = Math.max(this.selection.startX, this.selection.endX);
        var minY = Math.min(this.selection.startY, this.selection.endY);
        var maxY = Math.max(this.selection.startY, this.selection.endY);
        
        var isClick = Math.abs(maxX - minX) < 100 && Math.abs(maxY - minY) < 100;
        
        // Deselect all first
        if (!this.keys['ShiftLeft'] && !this.keys['ShiftRight']) {
            this.deselectAll();
        }
        
        var selectedUnits = [];
        var playerIndex = this.gameState.currentPlayer;
        
        if (isClick) {
            // Click selection - find nearest unit
            var clickX = (this.selection.startX + this.selection.endX) / 2;
            var clickY = (this.selection.startY + this.selection.endY) / 2;
            var nearestDist = Infinity;
            var nearestUnit = null;
            
            this.gameState.units.forEach(function(unit) {
                if (unit.owner !== playerIndex) return;
                var dist = Utils.distance(unit.x, unit.y, clickX, clickY);
                if (dist < CONFIG.TILE_SIZE * 0.1 && dist < nearestDist) {
                    nearestDist = dist;
                    nearestUnit = unit;
                }
            });
            
            if (nearestUnit) {
                nearestUnit.selected = true;
                selectedUnits.push(nearestUnit);
            } else {
                // Check for building click
                this.gameState.buildings.forEach(function(building) {
                    if (building.owner !== playerIndex) return;
                    var dist = Utils.distance(building.x, building.y, clickX, clickY);
                    if (dist < CONFIG.TILE_SIZE * 0.2) {
                        building.selected = true;
                    }
                });
            }
        } else {
            // Box selection
            this.gameState.units.forEach(function(unit) {
                if (unit.owner !== playerIndex) return;
                if (unit.x >= minX && unit.x <= maxX && unit.y >= minY && unit.y <= maxY) {
                    unit.selected = true;
                    selectedUnits.push(unit);
                }
            });
        }
        
        UI.showUnitInfo(selectedUnits);
    },
    
    deselectAll: function() {
        this.gameState.units.forEach(function(unit) {
            unit.selected = false;
        });
        this.gameState.buildings.forEach(function(building) {
            building.selected = false;
        });
        UI.hideUnitInfo();
    },
    
    getSelectedUnits: function() {
        return this.gameState.units.filter(function(u) { return u.selected; });
    },
    
    issueCommand: function(worldX, worldY) {
        var selectedUnits = this.getSelectedUnits();
        if (selectedUnits.length === 0) return;
        
        // Check for enemy target
        var target = null;
        var self = this;
        
        this.gameState.units.forEach(function(unit) {
            if (unit.owner === self.gameState.currentPlayer) return;
            var dist = Utils.distance(unit.x, unit.y, worldX, worldY);
            if (dist < CONFIG.TILE_SIZE * 0.1) {
                target = unit;
            }
        });
        
        if (!target) {
            this.gameState.buildings.forEach(function(building) {
                if (building.owner === self.gameState.currentPlayer) return;
                var dist = Utils.distance(building.x, building.y, worldX, worldY);
                if (dist < CONFIG.TILE_SIZE * 0.2) {
                    target = building;
                }
            });
        }
        
        // Issue commands
        selectedUnits.forEach(function(unit, index) {
            if (target) {
                unit.target = target;
                unit.moveTarget = null;
            } else {
                // Formation movement
                var cols = Math.ceil(Math.sqrt(selectedUnits.length));
                var row = Math.floor(index / cols);
                var col = index % cols;
                var spacing = CONFIG.TILE_SIZE * 0.08;
                
                unit.moveTarget = {
                    x: worldX + (col - cols/2) * spacing,
                    y: worldY + (row - Math.floor(selectedUnits.length / cols) / 2) * spacing
                };
                unit.target = null;
            }
        });
        
        // Play sound
        if (window.SoundManager) {
            SoundManager.play('build');
        }
    },
    
    centerOnSelected: function() {
        var selected = this.getSelectedUnits();
        if (selected.length === 0) return;
        
        var avgX = 0, avgY = 0;
        selected.forEach(function(u) {
            avgX += u.x;
            avgY += u.y;
        });
        avgX /= selected.length;
        avgY /= selected.length;
        
        this.camera.x = avgX - this.canvas.width / (2 * this.camera.zoom);
        this.camera.y = avgY - this.canvas.height / (2 * this.camera.zoom);
        this.clampCamera();
    },
    
    deleteSelected: function() {
        var self = this;
        this.gameState.units = this.gameState.units.filter(function(u) {
            return !u.selected || u.owner !== self.gameState.currentPlayer;
        });
        UI.hideUnitInfo();
    },
    
    saveGroup: function(num) {
        var selected = this.getSelectedUnits();
        selected.forEach(function(u) {
            u.group = num;
        });
        UI.showMessage('Grup ' + num + ' kaydedildi', 'info');
    },
    
    loadGroup: function(num) {
        this.deselectAll();
        var groupUnits = [];
        this.gameState.units.forEach(function(u) {
            if (u.group === num && u.owner === this.gameState.currentPlayer) {
                u.selected = true;
                groupUnits.push(u);
            }
        }, this);
        
        if (groupUnits.length > 0) {
            UI.showUnitInfo(groupUnits);
        }
    },
    
    update: function(dt) {
        // Keyboard camera movement
        var speed = CONFIG.TILE_SIZE * 2 * dt;
        
        if (this.keys['KeyW'] || this.keys['ArrowUp']) {
            this.camera.y -= speed / this.camera.zoom;
        }
        if (this.keys['KeyS'] || this.keys['ArrowDown']) {
            this.camera.y += speed / this.camera.zoom;
        }
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
            this.camera.x -= speed / this.camera.zoom;
        }
        if (this.keys['KeyD'] || this.keys['ArrowRight']) {
            this.camera.x += speed / this.camera.zoom;
        }
        
        // Zoom keys
        if (this.keys['Equal'] || this.keys['NumpadAdd']) {
            this.camera.zoom *= 1.02;
        }
        if (this.keys['Minus'] || this.keys['NumpadSubtract']) {
            this.camera.zoom *= 0.98;
        }
        
        this.camera.zoom = Math.max(CONFIG.MIN_ZOOM, Math.min(CONFIG.MAX_ZOOM, this.camera.zoom));
        this.clampCamera();
        
        // Update selection state for renderer
        this.gameState.selection = {
            active: this.selection.active,
            startX: this.selection.startX,
            startY: this.selection.startY,
            endX: this.selection.endX,
            endY: this.selection.endY
        };
    }
};

window.Input = Input;
