/* ============================================
   TACTICAL COMMAND - UTILITIES
   ============================================ */

const Utils = {
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },
    
    random(min, max) {
        return Math.random() * (max - min) + min;
    },
    
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    
    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },
    
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },
    
    lerp(a, b, t) {
        return a + (b - a) * t;
    },
    
    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },
    
    darkenColor(hex, percent) {
        const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - percent);
        const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - percent);
        const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - percent);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    },
    
    pointInRect(px, py, rx, ry, rw, rh) {
        return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    },
    
    rectsOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
    },
    
    isOnScreen(x, y, camera, canvas, margin = 100) {
        const screenX = (x - camera.x) * camera.zoom;
        const screenY = (y - camera.y) * camera.zoom;
        return screenX >= -margin && screenX <= canvas.width + margin &&
               screenY >= -margin && screenY <= canvas.height + margin;
    },
    
    findNearest(x, y, entities, filter = () => true) {
        let nearest = null;
        let nearestDist = Infinity;
        for (const entity of entities) {
            if (!filter(entity)) continue;
            const dist = this.distance(x, y, entity.x, entity.y);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = entity;
            }
        }
        return nearest;
    },
    
    findAllInRange(x, y, entities, range, filter = () => true) {
        return entities.filter(e => {
            if (!filter(e)) return false;
            return this.distance(x, y, e.x, e.y) <= range;
        });
    },
    
    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return Math.floor(num).toString();
    },
    
    formatMoney(num) {
        return '$' + this.formatNumber(num);
    },
    
    throttle(func, limit) {
        let lastFunc;
        let lastRan;
        return function(...args) {
            if (!lastRan) {
                func.apply(this, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(function() {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(this, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    }
};

if (typeof window !== 'undefined') window.Utils = Utils;
