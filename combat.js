const CombatSystem = {
    projectiles: [],
    explosions: [],
    damageNumbers: [],
    
    init() {
        this.projectiles = [];
        this.explosions = [];
        this.damageNumbers = [];
    },
    
    update(dt) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.trail) {
                p.trail.push({ x: p.x, y: p.y });
                if (p.trail.length > 10) p.trail.shift();
            }
            if (p.life <= 0 || this.checkHit(p)) {
                this.projectiles.splice(i, 1);
            }
        }
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const e = this.explosions[i];
            e.life -= dt;
            e.radius += dt * 200;
            e.alpha = e.life / e.maxLife;
            if (e.life <= 0) this.explosions.splice(i, 1);
        }
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            const d = this.damageNumbers[i];
            d.life -= dt;
            d.offsetY -= dt * 50;
            d.alpha = d.life / d.maxLife;
            if (d.life <= 0) this.damageNumbers.splice(i, 1);
        }
    },
    
    checkHit(projectile) {
        if (!projectile.target) return false;
        const dist = Utils.distance(projectile.x, projectile.y, projectile.target.x, projectile.target.y);
        if (dist < 30) {
            this.applyDamage(projectile.target, projectile.damage, projectile.attacker);
            this.createExplosion(projectile.x, projectile.y, 'small');
            return true;
        }
        return false;
    },
    
    applyDamage(target, damage, attacker) {
        if (!target || target.hp <= 0) return;
        const armor = target.armor || 0;
        const finalDamage = Math.max(1, damage - armor);
        target.hp -= finalDamage;
        this.createDamageNumber(target.x, target.y, finalDamage);
        if (target.hp <= 0) {
            target.hp = 0;
        }
    },
    
    createProjectile(attacker, target, damage, effectType) {
        if (this.projectiles.length > 300) return;
        const speed = 800;
        const dx = target.x - attacker.x;
        const dy = target.y - attacker.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const vx = (dx / dist) * speed;
        const vy = (dy / dist) * speed;
        this.projectiles.push({
            x: attacker.x,
            y: attacker.y,
            vx, vy,
            damage,
            attacker,
            target,
            effectType: effectType || 'bullet',
            life: 3,
            trail: []
        });
    },
    
    createExplosion(x, y, size) {
        const sizes = { small: 30, medium: 60, large: 100 };
        this.explosions.push({
            x, y,
            radius: 5,
            maxRadius: sizes[size] || 30,
            life: 0.3,
            maxLife: 0.3,
            alpha: 1
        });
    },
    
    createDamageNumber(x, y, damage) {
        this.damageNumbers.push({
            x, y,
            damage: Math.floor(damage),
            offsetY: 0,
            life: 1,
            maxLife: 1,
            alpha: 1
        });
    },
    
    getEffects() {
        return {
            projectiles: this.projectiles,
            explosions: this.explosions,
            damageNumbers: this.damageNumbers
        };
    }
};

window.CombatSystem = CombatSystem;
