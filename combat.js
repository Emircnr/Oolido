// Savaş Sistemi
class CombatSystem {
    constructor(gameState) {
        this.gameState = gameState;
        this.projectiles = [];
    }
    
    // Savaşı güncelle
    update(deltaTime) {
        // Birim saldırıları
        this.updateUnitCombat(deltaTime);
        
        // Kule saldırıları
        this.updateTowerCombat(deltaTime);
        
        // Mermileri güncelle
        this.updateProjectiles(deltaTime);
        
        // Ölü birimleri temizle
        this.cleanupDead();
    }
    
    // Birim savaşını güncelle
    updateUnitCombat(deltaTime) {
        for (const unit of this.gameState.units) {
            const config = UNITS[unit.type];
            if (!config || config.damage <= 0) continue;
            
            // Saldırı beklemesi
            const now = Date.now() / 1000;
            const attackCooldown = 1; // 1 saniye
            if (now - unit.lastAttack < attackCooldown) continue;
            
            // Menzildeki düşman bul
            const target = this.findTarget(unit, config.range);
            if (!target) continue;
            
            // Mermi kontrolü
            const economy = this.gameState.economies[unit.owner];
            if (economy && config.ammoCost) {
                if (!economy.spendAmmo(config.ammoCost)) {
                    continue; // Mermi yok
                }
            }
            
            // Saldırı yap
            this.attack(unit, target, config);
            unit.lastAttack = now;
        }
    }
    
    // Kule savaşını güncelle
    updateTowerCombat(deltaTime) {
        for (const building of this.gameState.buildings) {
            if (building.type !== 'defenseTower') continue;
            if (!building.owner) continue;
            
            const stats = this.gameState.entityManager.getTowerStats(building);
            
            // Saldırı beklemesi
            const now = Date.now() / 1000;
            if (now - building.lastAttack < stats.attackSpeed) continue;
            
            // Menzildeki düşman bul
            const target = this.findTowerTarget(building, stats.range);
            if (!target) continue;
            
            // Saldırı yap
            this.towerAttack(building, target, stats);
            building.lastAttack = now;
        }
    }
    
    // Hedef bul (birim için)
    findTarget(unit, range) {
        let nearest = null;
        let nearestDist = range;
        
        // Önce düşman birimleri
        for (const other of this.gameState.units) {
            if (other.owner === unit.owner) continue;
            
            const dist = distance(unit.x, unit.y, other.x, other.y);
            if (dist <= nearestDist) {
                nearest = other;
                nearestDist = dist;
            }
        }
        
        // Sonra düşman binaları
        if (!nearest) {
            for (const building of this.gameState.buildings) {
                if (building.owner === unit.owner || building.owner === null) continue;
                
                const dist = distance(unit.x, unit.y, building.x, building.y);
                if (dist <= nearestDist) {
                    nearest = building;
                    nearestDist = dist;
                }
            }
        }
        
        return nearest;
    }
    
    // Hedef bul (kule için)
    findTowerTarget(tower, range) {
        let nearest = null;
        let nearestDist = range;
        
        // Düşman birimleri
        for (const unit of this.gameState.units) {
            if (unit.owner === tower.owner) continue;
            
            const dist = distance(tower.x, tower.y, unit.x, unit.y);
            if (dist <= nearestDist) {
                nearest = unit;
                nearestDist = dist;
            }
        }
        
        return nearest;
    }
    
    // Birim saldırısı
    attack(attacker, target, config) {
        // Mermi oluştur
        this.createProjectile(
            attacker.x,
            attacker.y,
            target.x,
            target.y,
            config.damage,
            target,
            attacker.owner,
            'unit'
        );
        
        // Ses çal
        if (this.gameState.soundSystem) {
            this.gameState.soundSystem.playShoot();
        }
    }
    
    // Kule saldırısı
    towerAttack(tower, target, stats) {
        // Mermi oluştur
        this.createProjectile(
            tower.x,
            tower.y - 500, // Kulenin üstünden
            target.x,
            target.y,
            stats.damage,
            target,
            tower.owner,
            'tower'
        );
        
        // Ses çal
        if (this.gameState.soundSystem) {
            this.gameState.soundSystem.playShoot();
        }
    }
    
    // Mermi oluştur
    createProjectile(startX, startY, targetX, targetY, damage, target, owner, sourceType) {
        const projectile = {
            id: generateId(),
            x: startX,
            y: startY,
            startX,
            startY,
            targetX,
            targetY,
            damage,
            target,
            owner,
            sourceType,
            speed: 1500,
            trail: []
        };
        
        this.projectiles.push(projectile);
    }
    
    // Mermileri güncelle
    updateProjectiles(deltaTime) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            
            // İz ekle
            proj.trail.push({ x: proj.x, y: proj.y });
            if (proj.trail.length > 10) {
                proj.trail.shift();
            }
            
            // Hedefe doğru hareket
            const dx = proj.targetX - proj.x;
            const dy = proj.targetY - proj.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            const moveSpeed = proj.speed * deltaTime;
            
            if (dist <= moveSpeed) {
                // Hedefe ulaştı
                this.onProjectileHit(proj);
                this.projectiles.splice(i, 1);
            } else {
                proj.x += (dx / dist) * moveSpeed;
                proj.y += (dy / dist) * moveSpeed;
            }
        }
    }
    
    // Mermi çarptığında
    onProjectileHit(projectile) {
        const target = projectile.target;
        if (!target) return;
        
        // Hasar uygula
        this.applyDamage(target, projectile.damage);
        
        // Ses çal
        if (this.gameState.soundSystem) {
            this.gameState.soundSystem.playHit();
        }
        
        // Patlama efekti oluştur
        this.createExplosion(projectile.targetX, projectile.targetY, projectile.sourceType);
    }
    
    // Hasar uygula
    applyDamage(target, damage) {
        // Zırh hesapla (birimler için)
        let actualDamage = damage;
        if (target.type && UNITS[target.type]) {
            const armor = UNITS[target.type].armor || 0;
            actualDamage = Math.max(1, damage - armor);
        }
        
        target.hp -= actualDamage;
        
        // Ölüm kontrolü
        if (target.hp <= 0) {
            target.hp = 0;
            
            // Patlama sesi
            if (this.gameState.soundSystem) {
                this.gameState.soundSystem.playExplosion();
            }
        }
    }
    
    // Patlama efekti
    createExplosion(x, y, type) {
        if (!this.gameState.explosions) {
            this.gameState.explosions = [];
        }
        
        this.gameState.explosions.push({
            x,
            y,
            type,
            startTime: Date.now(),
            duration: 300,
            radius: type === 'tower' ? 150 : 100
        });
    }
    
    // Ölü varlıkları temizle
    cleanupDead() {
        // Ölü birimler
        for (let i = this.gameState.units.length - 1; i >= 0; i--) {
            if (this.gameState.units[i].hp <= 0) {
                this.gameState.entityManager.removeUnit(this.gameState.units[i]);
            }
        }
        
        // Ölü binalar
        for (let i = this.gameState.buildings.length - 1; i >= 0; i--) {
            if (this.gameState.buildings[i].hp <= 0) {
                this.gameState.entityManager.removeBuilding(this.gameState.buildings[i]);
            }
        }
        
        // Biten patlamalar
        if (this.gameState.explosions) {
            const now = Date.now();
            this.gameState.explosions = this.gameState.explosions.filter(
                e => now - e.startTime < e.duration
            );
        }
    }
    
    // Mermileri al (render için)
    getProjectiles() {
        return this.projectiles;
    }
}

window.CombatSystem = CombatSystem;
