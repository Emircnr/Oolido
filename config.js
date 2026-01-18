/* ============================================
   TACTICAL COMMAND - CONFIGURATION
   Multiplayer, 6 Resources, Stock Market
   ============================================ */

const CONFIG = {
    TILE_SIZE: 4000,
    MIN_ZOOM: 0.02,
    MAX_ZOOM: 0.5,
    ZOOM_SPEED: 0.0003,
    PAN_SPEED: 2000,
    EDGE_PAN_MARGIN: 40,
    EDGE_PAN_SPEED: 1500,
    CAPTURE_TIME: 5,
    STARTING_DOLLARS: 10000,
    GRID_COLOR: '#d0d0d0',
    MAP_BG_COLOR: '#ffffff',
    TERRITORY_OPACITY: 0.12,
    FLAG_OPACITY: 0.08,
    BUILDING_GRID: 400,
    RESOURCE_BUILDING_COUNTS: { oilWell: 20, goldMine: 15, wheatFarm: 25, ironMine: 18, copperMine: 12, uraniumMine: 8 },
    RESOURCE_MIN_PRODUCTION: 100,
    RESOURCE_MAX_PRODUCTION: 2000,
    MARKET_UPDATE_INTERVAL: 30,
    AUTO_SAVE_INTERVAL: 60,
    HOSPITAL_HEAL_RATE: 50,
    HOSPITAL_HEAL_RANGE: 800,
    RADAR_RANGE: 3000
};

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCbolraCD1nrOqcIE5GHPAaX9SRhHQXYIY",
    authDomain: "videoanlyze.firebaseapp.com",
    projectId: "videoanlyze",
    storageBucket: "videoanlyze.firebasestorage.app",
    messagingSenderId: "1053069335615",
    appId: "1:1053069335615:web:5dbf8f2345a5bf18b1ac8a"
};

const COUNTRIES = [
    { id: 'turkey', name: 'Türkiye', flag: '🇹🇷', color: '#E30A17' },
    { id: 'usa', name: 'Amerika', flag: '🇺🇸', color: '#3C3B6E' },
    { id: 'russia', name: 'Rusya', flag: '🇷🇺', color: '#0039A6' },
    { id: 'china', name: 'Çin', flag: '🇨🇳', color: '#DE2910' },
    { id: 'germany', name: 'Almanya', flag: '🇩🇪', color: '#DD0000' },
    { id: 'france', name: 'Fransa', flag: '🇫🇷', color: '#002395' },
    { id: 'uk', name: 'İngiltere', flag: '🇬🇧', color: '#012169' },
    { id: 'japan', name: 'Japonya', flag: '🇯🇵', color: '#BC002D' },
    { id: 'brazil', name: 'Brezilya', flag: '🇧🇷', color: '#009C3B' },
    { id: 'israel', name: 'İsrail', flag: '🇮🇱', color: '#0038B8' }
];

const RESOURCES = {
    oil: { id: 'oil', name: 'Petrol', symbol: '🛢️', basePrice: 80, minPrice: 20, maxPrice: 200, volatility: 0.15, color: '#1a1a1a' },
    gold: { id: 'gold', name: 'Altın', symbol: '🥇', basePrice: 1800, minPrice: 1000, maxPrice: 3000, volatility: 0.08, color: '#FFD700' },
    wheat: { id: 'wheat', name: 'Buğday', symbol: '🌾', basePrice: 8, minPrice: 3, maxPrice: 20, volatility: 0.12, color: '#DEB887' },
    iron: { id: 'iron', name: 'Demir', symbol: '⚙️', basePrice: 120, minPrice: 50, maxPrice: 300, volatility: 0.10, color: '#708090' },
    copper: { id: 'copper', name: 'Bakır', symbol: '🔶', basePrice: 9, minPrice: 4, maxPrice: 20, volatility: 0.11, color: '#B87333' },
    uranium: { id: 'uranium', name: 'Uranyum', symbol: '☢️', basePrice: 50, minPrice: 20, maxPrice: 150, volatility: 0.20, color: '#32CD32' }
};

const BUILDINGS = {
    headquarters: { id: 'headquarters', name: 'Karargah', symbol: '🏛️', category: 'base', canBuild: false, hp: 50000, size: 300, cost: { dollars: 0 } },
    barracks: { id: 'barracks', name: 'Kışla', symbol: '🎖️', category: 'military', canBuild: true, hp: 8000, size: 200, cost: { dollars: 2000 }, units: ['rifleman', 'machinegunner', 'sniper', 'rocketeer', 'medic', 'engineer'] },
    tankFactory: { id: 'tankFactory', name: 'Tank Fabrikası', symbol: '🏭', category: 'military', canBuild: true, hp: 15000, size: 280, cost: { dollars: 8000 }, units: ['apc', 'lightTank', 'mbt', 'heavyTank', 'artillery', 'mlrs', 'antiAir'] },
    airfield: { id: 'airfield', name: 'Hava Üssü', symbol: '🛫', category: 'military', canBuild: true, hp: 12000, size: 350, cost: { dollars: 15000 }, units: ['scoutHeli', 'attackHeli', 'fighter', 'bomber', 'siha'] },
    navalYard: { id: 'navalYard', name: 'Tersane', symbol: '⚓', category: 'military', canBuild: true, hp: 18000, size: 320, cost: { dollars: 12000 }, units: ['patrolBoat', 'frigate', 'destroyer', 'submarine', 'carrier'] },
    hospital: { id: 'hospital', name: 'Hastane', symbol: '🏥', category: 'support', canBuild: true, hp: 5000, size: 200, cost: { dollars: 3000 }, healRange: 800, healRate: 50 },
    radar: { id: 'radar', name: 'Radar', symbol: '📡', category: 'support', canBuild: true, hp: 3000, size: 180, cost: { dollars: 5000 }, radarRange: 3000 },
    mgTurret: { id: 'mgTurret', name: 'MG Taret', symbol: '🔫', category: 'military', canBuild: true, hp: 2000, size: 120, cost: { dollars: 1500 }, damage: 25, attackRange: 600, attackSpeed: 0.2 },
    samSite: { id: 'samSite', name: 'SAM', symbol: '🚀', category: 'military', canBuild: true, hp: 3500, size: 150, cost: { dollars: 6000 }, damage: 200, attackRange: 1200, attackSpeed: 1.5, antiAir: true },
    oilWell: { id: 'oilWell', name: 'Petrol Kuyusu', symbol: '🛢️', category: 'resource', canBuild: false, hp: 4000, baseSize: 80, resourceType: 'oil', isResourceBuilding: true },
    goldMine: { id: 'goldMine', name: 'Altın Madeni', symbol: '🥇', category: 'resource', canBuild: false, hp: 5000, baseSize: 80, resourceType: 'gold', isResourceBuilding: true },
    wheatFarm: { id: 'wheatFarm', name: 'Buğday Tarlası', symbol: '🌾', category: 'resource', canBuild: false, hp: 2000, baseSize: 90, resourceType: 'wheat', isResourceBuilding: true },
    ironMine: { id: 'ironMine', name: 'Demir Madeni', symbol: '⚙️', category: 'resource', canBuild: false, hp: 5500, baseSize: 80, resourceType: 'iron', isResourceBuilding: true },
    copperMine: { id: 'copperMine', name: 'Bakır Madeni', symbol: '🔶', category: 'resource', canBuild: false, hp: 4500, baseSize: 75, resourceType: 'copper', isResourceBuilding: true },
    uraniumMine: { id: 'uraniumMine', name: 'Uranyum Madeni', symbol: '☢️', category: 'resource', canBuild: false, hp: 6000, baseSize: 70, resourceType: 'uranium', isResourceBuilding: true }
};

const UNITS = {
    rifleman: { id: 'rifleman', name: 'Tüfekçi', symbol: '🔫', category: 'infantry', hp: 100, damage: 15, attackRange: 350, attackSpeed: 0.8, speed: 150, cost: { dollars: 100 }, buildTime: 5, canCapture: true, effectType: 'bullet' },
    machinegunner: { id: 'machinegunner', name: 'Makineli', symbol: '💥', category: 'infantry', hp: 120, damage: 8, attackRange: 400, attackSpeed: 0.15, speed: 120, cost: { dollars: 200 }, buildTime: 7, canCapture: true, effectType: 'machinegun' },
    sniper: { id: 'sniper', name: 'Keskin Nişancı', symbol: '🎯', category: 'infantry', hp: 60, damage: 150, attackRange: 900, attackSpeed: 2.5, speed: 100, cost: { dollars: 400 }, buildTime: 10, canCapture: true, effectType: 'sniper' },
    rocketeer: { id: 'rocketeer', name: 'Roketatar', symbol: '🚀', category: 'infantry', hp: 80, damage: 200, attackRange: 500, attackSpeed: 3, speed: 110, cost: { dollars: 350 }, buildTime: 8, canCapture: true, bonusVsVehicle: 2.5, effectType: 'rocket' },
    medic: { id: 'medic', name: 'Sağlık Eri', symbol: '⚕️', category: 'infantry', hp: 70, damage: 0, attackRange: 0, attackSpeed: 0, speed: 140, cost: { dollars: 250 }, buildTime: 6, canCapture: true, healRate: 20, healRange: 200, effectType: 'none' },
    engineer: { id: 'engineer', name: 'Mühendis', symbol: '🔧', category: 'infantry', hp: 80, damage: 10, attackRange: 200, attackSpeed: 1, speed: 130, cost: { dollars: 300 }, buildTime: 8, canCapture: true, repairRate: 30, effectType: 'bullet' },
    apc: { id: 'apc', name: 'ZPT', symbol: '🚐', category: 'vehicle', hp: 400, damage: 20, attackRange: 350, attackSpeed: 0.3, speed: 200, armor: 30, cost: { dollars: 1500 }, buildTime: 15, effectType: 'machinegun' },
    lightTank: { id: 'lightTank', name: 'Hafif Tank', symbol: '🚙', category: 'vehicle', hp: 600, damage: 80, attackRange: 500, attackSpeed: 1.5, speed: 180, armor: 50, cost: { dollars: 3000 }, buildTime: 20, effectType: 'cannon' },
    mbt: { id: 'mbt', name: 'MBT', symbol: '🛡️', category: 'vehicle', hp: 1200, damage: 150, attackRange: 600, attackSpeed: 2, speed: 120, armor: 100, cost: { dollars: 6000 }, buildTime: 30, effectType: 'cannon' },
    heavyTank: { id: 'heavyTank', name: 'Ağır Tank', symbol: '💪', category: 'vehicle', hp: 2000, damage: 200, attackRange: 550, attackSpeed: 2.5, speed: 80, armor: 150, cost: { dollars: 10000 }, buildTime: 45, effectType: 'heavyCannon' },
    artillery: { id: 'artillery', name: 'Obüs', symbol: '💣', category: 'vehicle', hp: 300, damage: 300, attackRange: 1500, attackSpeed: 5, speed: 60, armor: 20, minRange: 400, cost: { dollars: 5000 }, buildTime: 25, effectType: 'artillery' },
    mlrs: { id: 'mlrs', name: 'ÇNRA', symbol: '🎆', category: 'vehicle', hp: 250, damage: 100, attackRange: 1800, attackSpeed: 0.5, speed: 70, armor: 15, splashRadius: 200, cost: { dollars: 7000 }, buildTime: 30, effectType: 'mlrs' },
    antiAir: { id: 'antiAir', name: 'Hava Sav.', symbol: '🔺', category: 'vehicle', hp: 350, damage: 120, attackRange: 1000, attackSpeed: 0.8, speed: 100, armor: 25, antiAir: true, cost: { dollars: 4000 }, buildTime: 20, effectType: 'missile' },
    scoutHeli: { id: 'scoutHeli', name: 'Keşif Heli', symbol: '🚁', category: 'aircraft', isAir: true, hp: 150, damage: 15, attackRange: 400, attackSpeed: 0.4, speed: 300, cost: { dollars: 2000 }, buildTime: 15, effectType: 'machinegun' },
    attackHeli: { id: 'attackHeli', name: 'Saldırı Heli', symbol: '🔱', category: 'aircraft', isAir: true, hp: 350, damage: 100, attackRange: 600, attackSpeed: 1.5, speed: 220, bonusVsVehicle: 2, cost: { dollars: 8000 }, buildTime: 25, effectType: 'rocket' },
    fighter: { id: 'fighter', name: 'Savaş Uçağı', symbol: '✈️', category: 'aircraft', isAir: true, hp: 250, damage: 80, attackRange: 800, attackSpeed: 1, speed: 450, antiAir: true, cost: { dollars: 12000 }, buildTime: 30, effectType: 'missile' },
    bomber: { id: 'bomber', name: 'Bombardıman', symbol: '💨', category: 'aircraft', isAir: true, hp: 400, damage: 400, attackRange: 300, attackSpeed: 4, speed: 280, splashRadius: 250, bonusVsBuilding: 2, cost: { dollars: 15000 }, buildTime: 40, effectType: 'bomb' },
    siha: { id: 'siha', name: 'SİHA (TB2)', symbol: '🛸', category: 'aircraft', isAir: true, hp: 120, damage: 150, attackRange: 1000, attackSpeed: 3, speed: 180, bonusVsVehicle: 2.5, cost: { dollars: 6000 }, buildTime: 20, effectType: 'missile' },
    patrolBoat: { id: 'patrolBoat', name: 'Devriye Botu', symbol: '🚤', category: 'naval', isNaval: true, hp: 200, damage: 30, attackRange: 400, attackSpeed: 0.5, speed: 250, cost: { dollars: 1500 }, buildTime: 12, effectType: 'machinegun' },
    frigate: { id: 'frigate', name: 'Fırkateyn', symbol: '🚢', category: 'naval', isNaval: true, hp: 800, damage: 80, attackRange: 700, attackSpeed: 1.5, speed: 150, armor: 40, cost: { dollars: 8000 }, buildTime: 35, effectType: 'cannon' },
    destroyer: { id: 'destroyer', name: 'Muhrip', symbol: '⛴️', category: 'naval', isNaval: true, hp: 1500, damage: 150, attackRange: 900, attackSpeed: 2, speed: 120, armor: 60, antiAir: true, cost: { dollars: 15000 }, buildTime: 50, effectType: 'missile' },
    submarine: { id: 'submarine', name: 'Denizaltı', symbol: '🐋', category: 'naval', isNaval: true, hp: 600, damage: 300, attackRange: 600, attackSpeed: 5, speed: 100, stealth: true, cost: { dollars: 12000 }, buildTime: 45, effectType: 'torpedo' },
    carrier: { id: 'carrier', name: 'Uçak Gemisi', symbol: '🛳️', category: 'naval', isNaval: true, hp: 3000, damage: 20, attackRange: 500, attackSpeed: 0.5, speed: 80, armor: 80, cost: { dollars: 30000 }, buildTime: 90, effectType: 'machinegun' }
};

if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
    window.FIREBASE_CONFIG = FIREBASE_CONFIG;
    window.COUNTRIES = COUNTRIES;
    window.RESOURCES = RESOURCES;
    window.BUILDINGS = BUILDINGS;
    window.UNITS = UNITS;
}
