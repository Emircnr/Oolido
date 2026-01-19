// Combat System - handles projectiles, damage, and explosions
const Combat = {
    // Create a projectile
    createProjectile: function(startX, startY, targetX, targetY, damage, owner, target, fromTower) {
        var dx = targetX - startX;
        var dy = targetY - startY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var speed = 2000;
        
        return {
            x: startX,
            y: startY,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed,
            damage: damage,
            owner: owner,
            target: target,
            fromTower: fromTower || false,
            lifetime: 5 // seconds
        };
    },
    
    // Update combat system
    update: function(gameState, dt) {
        // Initialize projectiles array if needed
        if (!gameState.projectiles) {
            gameState.projectiles = [];
        }
        if (!gameState.explosions) {
            gameState.explosions = [];
        }
        
        // Update projectiles
        this.updateProjectiles(gameState, dt);
        
        // Clean up dead units and buildings
        this.cleanupDead(gameState);
    },
    
    // Update all projectiles
    updateProjectiles: function(gameState, dt) {
        for (var i = gameState.projectiles.length - 1; i >= 0; i--) {
            var p = gameState.projectiles[i];
            
            // Move projectile
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.lifetime -= dt;
            
            // Check if projectile hit target
            if (p.target) {
                var dist = Utils.distance(p.x, p.y, p.target.x, p.target.y);
                if (dist < CONFIG.TILE_SIZE * 0.03) {
                    // Hit!
                    this.onHit(gameState, p);
                    gameState.projectiles.splice(i, 1);
                    continue;
                }
            }
            
            // Remove if lifetime expired or out of bounds
            if (p.lifetime <= 0 || 
                p.x < 0 || p.x > CONFIG.MAP_WIDTH * CONFIG.TILE_SIZE ||
                p.y < 0 || p.y > CONFIG.MAP_HEIGHT * CONFIG.TILE_SIZE) {
                gameState.projectiles.splice(i, 1);
            }
        }
    },
    
    // Handle projectile hit
    onHit: function(gameState, projectile) {
        var target = projectile.target;
        if (!target || target.hp <= 0) return;
        
        // Apply damage (considering armor for units)
        var damage = projectile.damage;
        if (target.type && UNITS[target.type]) {
            var armor = UNITS[target.type].armor || 0;
            damage = Math.max(1, damage - armor);
        }
        
        target.hp -= damage;
        
        // Create explosion
        gameState.explosions.push({
            x: target.x,
            y: target.y,
            size: projectile.fromTower ? CONFIG.TILE_SIZE * 0.05 : CONFIG.TILE_SIZE * 0.03,
            time: 0,
            duration: 300
        });
        
        // Play sound
        if (target.hp <= 0) {
            SoundManager.play('explosion');
        } else {
            SoundManager.play('hit');
        }
    },
    
    // Clean up dead entities
    cleanupDead: function(gameState) {
        // Remove dead units
        for (var i = gameState.units.length - 1; i >= 0; i--) {
            if (gameState.units[i].hp <= 0) {
                // Create death explosion
                gameState.explosions.push({
                    x: gameState.units[i].x,
                    y: gameState.units[i].y,
                    size: CONFIG.TILE_SIZE * 0.06,
                    time: 0,
                    duration: 500
                });
                gameState.units.splice(i, 1);
            }
        }
        
        // Remove dead buildings
        for (var i = gameState.buildings.length - 1; i >= 0; i--) {
            var building = gameState.buildings[i];
            if (building.hp <= 0) {
                // Create big explosion for buildings
                gameState.explosions.push({
                    x: building.x,
                    y: building.y,
                    size: CONFIG.TILE_SIZE * 0.1,
                    time: 0,
                    duration: 800
                });
                
                // Decrease tower count if it was a tower
                if (building.type === 'defenseTower') {
                    var tileX = Math.floor(building.x / CONFIG.TILE_SIZE);
                    var tileY = Math.floor(building.y / CONFIG.TILE_SIZE);
                    if (gameState.map.tiles[tileY] && gameState.map.tiles[tileY][tileX]) {
                        gameState.map.tiles[tileY][tileX].towerCount = Math.max(0, 
                            (gameState.map.tiles[tileY][tileX].towerCount || 0) - 1);
                    }
                }
                
                gameState.buildings.splice(i, 1);
            }
        }
    },
    
    // Add projectile to game state
    addProjectile: function(gameState, projectile) {
        if (!gameState.projectiles) {
            gameState.projectiles = [];
        }
        gameState.projectiles.push(projectile);
    }
};

window.Combat = Combat;
