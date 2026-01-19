// Yardımcı fonksiyonlar

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function lerp(start, end, t) {
    return start + (end - start) * t;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return Math.floor(num).toString();
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function worldToTile(x, y) {
    return {
        tileX: Math.floor(x / CONFIG.TILE_SIZE),
        tileY: Math.floor(y / CONFIG.TILE_SIZE)
    };
}

function tileToWorld(tileX, tileY) {
    return {
        x: tileX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
        y: tileY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2
    };
}

function isInBounds(tileX, tileY) {
    return tileX >= 0 && tileX < CONFIG.MAP_WIDTH && 
           tileY >= 0 && tileY < CONFIG.MAP_HEIGHT;
}

function getAdjacentTiles(tileX, tileY) {
    const adjacent = [];
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dx, dy] of directions) {
        const nx = tileX + dx;
        const ny = tileY + dy;
        if (isInBounds(nx, ny)) {
            adjacent.push({ tileX: nx, tileY: ny });
        }
    }
    return adjacent;
}

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Debounce fonksiyonu
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle fonksiyonu
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

window.distance = distance;
window.clamp = clamp;
window.lerp = lerp;
window.randomInt = randomInt;
window.randomFloat = randomFloat;
window.formatNumber = formatNumber;
window.formatTime = formatTime;
window.generateId = generateId;
window.generateRoomCode = generateRoomCode;
window.worldToTile = worldToTile;
window.tileToWorld = tileToWorld;
window.isInBounds = isInBounds;
window.getAdjacentTiles = getAdjacentTiles;
window.hexToRgba = hexToRgba;
window.shuffleArray = shuffleArray;
window.debounce = debounce;
window.throttle = throttle;
