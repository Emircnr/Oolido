// Yardımcı fonksiyonlar

const Utils = {
    distance: function(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    },
    
    clamp: function(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },
    
    lerp: function(start, end, t) {
        return start + (end - start) * t;
    },
    
    randomInt: function(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    
    randomFloat: function(min, max) {
        return Math.random() * (max - min) + min;
    },
    
    formatNumber: function(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return Math.floor(num).toString();
    },
    
    formatTime: function(seconds) {
        var mins = Math.floor(seconds / 60);
        var secs = Math.floor(seconds % 60);
        return mins + ':' + (secs < 10 ? '0' : '') + secs;
    },
    
    generateId: function() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },
    
    generateRoomCode: function() {
        var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        var code = '';
        for (var i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    },
    
    worldToTile: function(x, y) {
        return {
            tileX: Math.floor(x / CONFIG.TILE_SIZE),
            tileY: Math.floor(y / CONFIG.TILE_SIZE)
        };
    },
    
    tileToWorld: function(tileX, tileY) {
        return {
            x: tileX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
            y: tileY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2
        };
    },
    
    isInBounds: function(tileX, tileY) {
        return tileX >= 0 && tileX < CONFIG.MAP_WIDTH && 
               tileY >= 0 && tileY < CONFIG.MAP_HEIGHT;
    },
    
    hexToRgba: function(hex, alpha) {
        var r = parseInt(hex.slice(1, 3), 16);
        var g = parseInt(hex.slice(3, 5), 16);
        var b = parseInt(hex.slice(5, 7), 16);
        return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
    },
    
    lightenColor: function(color, amount) {
        // Handle hex colors
        if (color.charAt(0) === '#') {
            var r = parseInt(color.slice(1, 3), 16);
            var g = parseInt(color.slice(3, 5), 16);
            var b = parseInt(color.slice(5, 7), 16);
            
            r = Math.min(255, r + amount);
            g = Math.min(255, g + amount);
            b = Math.min(255, b + amount);
            
            return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        }
        return color;
    },
    
    darkenColor: function(color, amount) {
        // Handle hex colors
        if (color.charAt(0) === '#') {
            var r = parseInt(color.slice(1, 3), 16);
            var g = parseInt(color.slice(3, 5), 16);
            var b = parseInt(color.slice(5, 7), 16);
            
            r = Math.max(0, r - amount);
            g = Math.max(0, g - amount);
            b = Math.max(0, b - amount);
            
            return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        }
        return color;
    },
    
    shuffleArray: function(array) {
        var shuffled = array.slice();
        for (var i = shuffled.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = shuffled[i];
            shuffled[i] = shuffled[j];
            shuffled[j] = temp;
        }
        return shuffled;
    }
};

// Legacy function exports for compatibility
function distance(x1, y1, x2, y2) {
    return Utils.distance(x1, y1, x2, y2);
}

function clamp(value, min, max) {
    return Utils.clamp(value, min, max);
}

function generateId() {
    return Utils.generateId();
}

window.Utils = Utils;
window.distance = distance;
window.clamp = clamp;
window.generateId = generateId;
