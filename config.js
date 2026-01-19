// Ülkeler ve bayrakları
const COUNTRIES = {
    turkey: { name: 'Türkiye', flag: '🇹🇷', color: '#E30A17', secondary: '#FFFFFF' },
    usa: { name: 'ABD', flag: '🇺🇸', color: '#3C3B6E', secondary: '#B22234' },
    russia: { name: 'Rusya', flag: '🇷🇺', color: '#0039A6', secondary: '#D52B1E' },
    china: { name: 'Çin', flag: '🇨🇳', color: '#DE2910', secondary: '#FFDE00' },
    germany: { name: 'Almanya', flag: '🇩🇪', color: '#000000', secondary: '#FFCC00' },
    france: { name: 'Fransa', flag: '🇫🇷', color: '#002395', secondary: '#ED2939' },
    uk: { name: 'İngiltere', flag: '🇬🇧', color: '#012169', secondary: '#C8102E' },
    japan: { name: 'Japonya', flag: '🇯🇵', color: '#BC002D', secondary: '#FFFFFF' },
    brazil: { name: 'Brezilya', flag: '🇧🇷', color: '#009739', secondary: '#FEDD00' },
    india: { name: 'Hindistan', flag: '🇮🇳', color: '#FF9933', secondary: '#138808' }
};

// Ana oyun ayarları
const CONFIG = {
    // Harita ayarları - 32x32, her kare 10x büyük (800 -> 8000)
    TILE_SIZE: 8000,
    MAP_WIDTH: 32,
    MAP_HEIGHT: 32,
    
    // Başlangıç kaynakları
    STARTING_DOLLARS: 5000,
    STARTING_OIL: 500,
    STARTING_WHEAT: 500,
    STARTING_AMMO: 100,
    STARTING_MOVEMENT: 1000,
    
    // Oyun mekanikleri
    CAPTURE_TIME: 20,
    TERRITORY_OPACITY: 0.3,
    GRID_COLOR: 'rgba(0,0,0,0.15)',
    BUILDING_GRID: 400,
    
    // Kamera ayarları - büyük harita için ayarlandı
    MIN_ZOOM: 0.004,
    MAX_ZOOM: 0.5,
    ZOOM_SPEED: 0.0008,
    PAN_SPEED: 2000,
    EDGE_PAN_MARGIN: 40,
    EDGE_PAN_SPEED: 1500,
    
    // Birim hızı çarpanı (yavaşlatma)
    UNIT_SPEED_MULTIPLIER: 0.4,
    
    // Kaydetme
    AUTO_SAVE_INTERVAL: 30,
    MAX_UNITS_RENDER: 500,
    
    // Savunma kulesi limiti
    MAX_TOWERS_PER_TILE: 25,
    MAX_TOWER_LEVEL: 10,
    
    // Kaynak binaları sayısı (harita başına)
    RESOURCE_BUILDING_COUNTS: { 
        oil: 40, 
        wheat: 50, 
        dollars: 35 
    },
    
    // Kaynaklar - sadece petrol, buğday ve dolar
    RESOURCES: {
        dollars: { name: 'Dolar', symbol: '💵', color: '#2e7d32', basePrice: 1 },
        oil: { name: 'Petrol', symbol: '🛢️', color: '#1a1a1a', basePrice: 10 },
        wheat: { name: 'Buğday', symbol: '🌾', color: '#daa520', basePrice: 5 }
    },
    
    // Market fiyatları
    MARKET: {
        ammo: {
            name: 'Mermi',
            symbol: '🔹',
            // Mermi almak için: buğdaya daha çok ihtiyaç var
            cost: { wheat: 3, oil: 1 },
            sellPrice: 2 // Dolar karşılığı satış
        },
        movement: {
            name: 'Hareket',
            symbol: '👟',
            // Hareket almak için: petrole daha çok ihtiyaç var
            cost: { dollars: 5, wheat: 1, oil: 3 },
            sellPrice: 3 // Dolar karşılığı satış
        }
    },
    
    // Kaynak satış oranları (markette satarken)
    SELL_RATES: {
        oil: 0.8,      // Petrol satınca base price'ın %80'i
        wheat: 0.8,    // Buğday satınca base price'ın %80'i
        ammo: 2,       // Mermi başına 2 dolar
        movement: 3    // Hareket başına 3 dolar
    }
};

// Bina kategorileri
const BUILDING_CATEGORIES = {
    military: { name: 'Askeri', icon: '⚔️' },
    defense: { name: 'Savunma', icon: '🛡️' },
    support: { name: 'Destek', icon: '🔧' },
    resource: { name: 'Kaynak', icon: '📦' }
};

// Binalar
const BUILDINGS = {
    // Ana bina
    headquarters: { 
        id: 'headquarters', 
        name: 'Karargah', 
        symbol: '🏛️', 
        category: 'military', 
        size: 2500, 
        hp: 10000, 
        canBuild: false, 
        cost: { dollars: 0 } 
    },
    
    // Kışla - sadece 4 çeşit asker üretir
    barracks: { 
        id: 'barracks', 
        name: 'Kışla', 
        symbol: '🏠', 
        category: 'military', 
        size: 1800, 
        hp: 3000, 
        canBuild: true, 
        cost: { dollars: 1500, oil: 200, wheat: 150 }, 
        units: ['infantry', 'heavy', 'sniper', 'scout'] 
    },
    
    // Savunma Kulesi - 10 seviyeye kadar geliştirilebilir
    defenseTower: { 
        id: 'defenseTower', 
        name: 'Savunma Kulesi', 
        symbol: '🗼', 
        category: 'defense', 
        size: 1200, 
        hp: 2000, 
        canBuild: true, 
        cost: { dollars: 800, oil: 100, wheat: 50 },
        maxLevel: 10,
        attackRange: 3000,
        attackDamage: 40,
        attackSpeed: 1.0,
        // Her seviye artışında
        levelBonus: {
            damage: 0.15,    // +15% hasar
            range: 0.10,     // +10% menzil
            hp: 0.10         // +10% HP
        },
        upgradeCostMultiplier: 1.2 // Her seviye %20 daha pahalı
    },
    
    // Radar
    radar: { 
        id: 'radar', 
        name: 'Radar', 
        symbol: '📡', 
        category: 'support', 
        size: 1400, 
        hp: 1500, 
        canBuild: true, 
        cost: { dollars: 1200, oil: 150 }, 
        radarRange: 15000 
    },
    
    // Kaynak binaları - haritada otomatik oluşur, geliştirilebilir
    oilRefinery: { 
        id: 'oilRefinery', 
        name: 'Petrol Rafinerisi', 
        symbol: '🛢️', 
        category: 'resource',
        resourceType: 'oil', 
        size: 1500, 
        hp: 1200, 
        canBuild: false,
        baseProduction: 10, // Dakikada üretim
        maxLevel: 20,
        levelBonus: 0.05, // Her seviye %5 artış
        upgradeCost: { dollars: 500, oil: 100 },
        upgradeCostMultiplier: 1.05
    },
    
    mill: { 
        id: 'mill', 
        name: 'Değirmen', 
        symbol: '🌾', 
        category: 'resource',
        resourceType: 'wheat', 
        size: 1500, 
        hp: 1000, 
        canBuild: false,
        baseProduction: 15,
        maxLevel: 20,
        levelBonus: 0.05,
        upgradeCost: { dollars: 400, wheat: 80 },
        upgradeCostMultiplier: 1.05
    },
    
    dollarMine: { 
        id: 'dollarMine', 
        name: 'Dolar Madeni', 
        symbol: '💵', 
        category: 'resource',
        resourceType: 'dollars', 
        size: 1500, 
        hp: 1000, 
        canBuild: false,
        baseProduction: 20,
        maxLevel: 20,
        levelBonus: 0.05,
        upgradeCost: { dollars: 300, oil: 50, wheat: 50 },
        upgradeCostMultiplier: 1.05
    }
};

// Askerler - 4 çeşit, her biri farklı güçlü
const UNITS = {
    // Piyade - Dengeli
    infantry: { 
        id: 'infantry', 
        name: 'Piyade', 
        symbol: '🔫', 
        hp: 120, 
        damage: 20, 
        range: 800,  // Orta menzil
        speed: 80,   // Orta hız
        armor: 2, 
        cost: { dollars: 200, oil: 30, wheat: 50 }, 
        buildTime: 8, 
        canCapture: true,
        ammoCost: 1,      // Her atışta 1 mermi
        movementCost: 1   // Her harekette 1 hareket puanı
    },
    
    // Ağır Asker - Yavaş ama güçlü ve dayanıklı
    heavy: { 
        id: 'heavy', 
        name: 'Ağır Piyade', 
        symbol: '💪', 
        hp: 250, 
        damage: 45, 
        range: 600,  // Kısa menzil
        speed: 40,   // Yavaş
        armor: 8, 
        cost: { dollars: 400, oil: 80, wheat: 100 }, 
        buildTime: 15, 
        canCapture: true,
        ammoCost: 2,
        movementCost: 2
    },
    
    // Keskin Nişancı - Uzun menzil, yüksek hasar, düşük HP
    sniper: { 
        id: 'sniper', 
        name: 'Keskin Nişancı', 
        symbol: '🎯', 
        hp: 60, 
        damage: 80, 
        range: 2000, // Çok uzun menzil
        speed: 50,   // Yavaş
        armor: 0, 
        cost: { dollars: 500, oil: 50, wheat: 80 }, 
        buildTime: 12, 
        canCapture: true,
        ammoCost: 1,
        movementCost: 0.5
    },
    
    // Keşifçi - Çok hızlı, düşük hasar
    scout: { 
        id: 'scout', 
        name: 'Keşifçi', 
        symbol: '🏃', 
        hp: 80, 
        damage: 15, 
        range: 500,  // Kısa menzil
        speed: 150,  // Çok hızlı
        armor: 0, 
        cost: { dollars: 150, oil: 20, wheat: 30 }, 
        buildTime: 5, 
        canCapture: true,
        ammoCost: 1,
        movementCost: 0.5
    }
};

// Ses efektleri ayarları
const SOUND_CONFIG = {
    enabled: true,
    volume: 0.3,
    effects: {
        shoot: { frequency: 800, duration: 0.1, type: 'square' },
        explosion: { frequency: 100, duration: 0.3, type: 'sawtooth' },
        hit: { frequency: 300, duration: 0.05, type: 'triangle' },
        build: { frequency: 500, duration: 0.2, type: 'sine' },
        upgrade: { frequency: 600, duration: 0.3, type: 'sine' }
    }
};

// Global'e aktar
window.COUNTRIES = COUNTRIES;
window.CONFIG = CONFIG;
window.BUILDING_CATEGORIES = BUILDING_CATEGORIES;
window.BUILDINGS = BUILDINGS;
window.UNITS = UNITS;
window.SOUND_CONFIG = SOUND_CONFIG;
