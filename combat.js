const CombatSystem = {
    projectiles: [],
    explosions: [],
    damageNumbers: [],
    
    init: function() {
        this.projectiles = [];
        this.explosions = [];
        this.damageNumbers = [];
    },
    
    update: function(dt) {
        var self = this;
        for (var i = this.projectiles.length - 1; i >= 0; i--) {
            var p = this.projectiles[i];
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
        for (var i = this.explosions.length - 1; i >= 0; i--) {
            var e = this.explosions[i];
            e.life -= dt;
            e.radius += dt * 200;
            e.alpha = e.life / e.maxLife;
            if (e.life <= 0) this.explosions.splice(i, 1);
        }
        for (var i = this.damageNumbers.length - 1; i >= 0; i--) {
            var d = this.damageNumbers[i];
            d.life -= dt;
            d.offsetY -= dt * 50;
            d.alpha = d.life / d.maxLife;
            if (d.life <= 0) this.damageNumbers.splice(i, 1);
        }
    },
    
    checkHit: function(projectile) {
        if (!projectile.target || projectile.target.hp <= 0) return true;
        var dist = Utils.distance(projectile.x, projectile.y, projectile.target.x, projectile.target.y);
        if (dist < 40) {
            this.applyDamage(projectile.target, projectile.damage, projectile.attacker);
            this.createExplosion(projectile.x, projectile.y, 'small');
            return true;
        }
        return false;
    },
    
    applyDamage: function(target, damage, attacker) {
        if (!target || target.hp <= 0) return;
        var armor = target.armor || 0;
        var finalDamage = Math.max(1, damage - armor);
        target.hp -= finalDamage;
        this.createDamageNumber(target.x, target.y, finalDamage);
        if (target.hp <= 0) target.hp = 0;
    },
    
    createProjectile: function(attacker, target, damage, effectType) {
        if (this.projectiles.length > 300) return;
        var speed = 800;
        var dx = target.x - attacker.x;
        var dy = target.y - attacker.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return;
        this.projectiles.push({
            x: attacker.x,
            y: attacker.y,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed,
            damage: damage,
            attacker: attacker,
            target: target,
            effectType: effectType || 'bullet',
            life: 3,
            trail: []
        });
    },
    
    createExplosion: function(x, y, size) {
        var sizes = { small: 30, medium: 60, large: 100 };
        this.explosions.push({
            x: x,
            y: y,
            radius: 5,
            maxRadius: sizes[size] || 30,
            life: 0.3,
            maxLife: 0.3,
            alpha: 1
        });
    },
    
    createDamageNumber: function(x, y, damage) {
        this.damageNumbers.push({
            x: x,
            y: y,
            damage: Math.floor(damage),
            offsetY: 0,
            life: 1,
            maxLife: 1,
            alpha: 1
        });
    },
    
    getEffects: function() {
        return {
            projectiles: this.projectiles,
            explosions: this.explosions,
            damageNumbers: this.damageNumbers
        };
    }
};

window.CombatSystem = CombatSystem;
