/* ============================================
   TACTICAL COMMAND - COMBAT SYSTEM
   Different attack effects per unit type
   ============================================ */

const EFFECTS = {
    bullet: { color: '#ffff00', speed: 2500, size: 4, trail: 3 },
    machinegun: { color: '#ffaa00', speed: 2800, size: 3, trail: 5 },
    sniper: { color: '#ff0000', speed: 3500, size: 2, trail: 10 },
    cannon: { color: '#ffdd00', speed: 1500, size: 12, trail: 6 },
    heavyCannon: { color: '#ffcc00', speed: 1200, size: 18, trail: 8 },
    rocket: { color: '#ff6600', speed: 800, size: 10, trail: 15, smoke: true },
    missile: { color: '#ff3300', speed: 1200, size: 12, trail: 20, smoke: true },
    artillery: { color: '#ff8800', speed: 600, size: 20, trail: 10, arc: true },
    mlrs: { color: '#ff4400', speed: 700, size: 8, trail: 12, smoke: true },
    bomb: { color: '#444444', speed: 400, size: 30, trail: 5 },
    torpedo: { color: '#00ffff', speed: 500, size: 15, trail: 20 },
    none: null
};

const Combat = {
    projectiles: [],
    explosions: [],
    damageNumbers: [],
    
    init() {
        this.projectiles = [];
        this.explosions = [];
        this.damageNumbers = [];
    },
    
    dealDamage(attacker, target, damage) {
        let actualDamage = damage;
        
        // Armor reduction
        if (target.entityType === 'unit') {
            const def = UNITS[target.type];
            if (def.armor) {
                actualDamage = damage * (100 / (100 + def.armor));
            }
        }
        
        target.hp -= actualDamage;
        
        const tx = target.entityType === 'building' ? target.x + target.size/2 : target.x;
        const ty = target.entityType === 'building' ? target.y + target.size/2 : target.y;
        
        this.createDamageNumber(tx, ty, actualDamage);
        
        if (target.hp <= 0) {
            target.hp = 0;
            this.createExplosion(tx, ty, target.entityType === 'building' ? 150 : 80);
        }
    },
    
    createProjectile(fx, fy, tx, ty, owner, effectType = 'bullet') {
        if (this.projectiles.length > 200) this.projectiles.shift();
        
        const effect = EFFECTS[effectType] || EFFECTS.bullet;
        if (!effect) return;
        
        this.projectiles.push({
            x: fx, y: fy,
            targetX: tx, targetY: ty,
            owner, effectType,
            speed: effect.speed,
            trail: []
        });
    },
    
    createExplosion(x, y, radius = 100) {
        this.explosions.push({ x, y, radius, maxRadius: radius, alpha: 1, phase: 0 });
    },
    
    createDamageNumber(x, y, damage) {
        this.damageNumbers.push({
            x: x + Utils.random(-30, 30),
            y, damage: Math.floor(damage),
            alpha: 1, offsetY: 0
        });
    },
    
    update(dt) {
        // Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            const effect = EFFECTS[p.effectType] || EFFECTS.bullet;
            
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > (effect.trail || 5)) p.trail.shift();
            
            const dx = p.targetX - p.x;
            const dy = p.targetY - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 30) {
                this.createExplosion(p.x, p.y, effect.size * 2);
                this.projectiles.splice(i, 1);
            } else {
                p.x += (dx / dist) * p.speed * dt;
                p.y += (dy / dist) * p.speed * dt;
            }
        }
        
        // Explosions
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const e = this.explosions[i];
            e.phase += dt * 3;
            e.alpha = Math.max(0, 1 - e.phase / 1.5);
            e.radius = e.maxRadius * (1 + e.phase * 0.5);
            if (e.alpha <= 0) this.explosions.splice(i, 1);
        }
        
        // Damage numbers
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            const n = this.damageNumbers[i];
            n.offsetY -= dt * 120;
            n.alpha -= dt * 1.5;
            if (n.alpha <= 0) this.damageNumbers.splice(i, 1);
        }
    },
    
    getEffects() {
        return {
            projectiles: this.projectiles,
            explosions: this.explosions,
            damageNumbers: this.damageNumbers,
            effectDefs: EFFECTS
        };
    }
};

if (typeof window !== 'undefined') window.Combat = Combat;
