const COUNTRIES = {
    turkey: { name: 'Türkiye', flag: '🇹🇷', color: '#E30A17', secondary: '#FFFFFF' },
    usa: { name: 'ABD', flag: '🇺🇸', color: '#3C3B6E', secondary: '#FFFFFF' },
    russia: { name: 'Rusya', flag: '🇷🇺', color: '#0039A6', secondary: '#FFFFFF' },
    china: { name: 'Çin', flag: '🇨🇳', color: '#DE2910', secondary: '#FFDE00' },
    germany: { name: 'Almanya', flag: '🇩🇪', color: '#000000', secondary: '#FFCC00' },
    france: { name: 'Fransa', flag: '🇫🇷', color: '#002395', secondary: '#FFFFFF' },
    uk: { name: 'İngiltere', flag: '🇬🇧', color: '#012169', secondary: '#FFFFFF' },
    japan: { name: 'Japonya', flag: '🇯🇵', color: '#BC002D', secondary: '#FFFFFF' },
    brazil: { name: 'Brezilya', flag: '🇧🇷', color: '#009739', secondary: '#FEDD00' },
    india: { name: 'Hindistan', flag: '🇮🇳', color: '#FF9933', secondary: '#FFFFFF' }
};

const CONFIG = {
    TILE_SIZE: 800,
    MAP_WIDTH: 16,
    MAP_HEIGHT: 8,
    STARTING_DOLLARS: 10000,
    CAPTURE_TIME: 15,
    TERRITORY_OPACITY: 0.25,
    GRID_COLOR: 'rgba(0,0,0,0.1)',
    BUILDING_GRID: 50,
    MIN_ZOOM: 0.03,
    MAX_ZOOM: 1.5,
    ZOOM_SPEED: 0.001,
    PAN_SPEED: 800,
    EDGE_PAN_MARGIN: 30,
    EDGE_PAN_SPEED: 600,
    AUTO_SAVE_INTERVAL: 30,
    MAX_UNITS_RENDER: 500,
    RESOURCES: {
        oil: { name: 'Petrol', symbol: '🛢️', color: '#1a1a1a', basePrice: 80 },
        gold: { name: 'Altın', symbol: '🥇', color: '#ffd700', basePrice: 1800 },
        wheat: { name: 'Buğday', symbol: '🌾', color: '#daa520', basePrice: 25 },
        iron: { name: 'Demir', symbol: '⚙️', color: '#708090', basePrice: 120 },
        copper: { name: 'Bakır', symbol: '🔶', color: '#b87333', basePrice: 90 },
        uranium: { name: 'Uranyum', symbol: '☢️', color: '#32cd32', basePrice: 5000 }
    },
    RESOURCE_BUILDING_COUNTS: { oil: 20, gold: 15, wheat: 25, iron: 20, copper: 18, uranium: 8 }
};

const BUILDING_CATEGORIES = {
    military: { name: 'Askeri', icon: '⚔️' },
    defense: { name: 'Savunma', icon: '🛡️' },
    support: { name: 'Destek', icon: '🔧' }
};

const BUILDINGS = {
    headquarters: { id: 'headquarters', name: 'Karargah', symbol: '🏛️', category: 'military', size: 300, hp: 5000, canBuild: false, cost: { dollars: 0 } },
    barracks: { id: 'barracks', name: 'Kışla', symbol: '🏠', category: 'military', size: 200, hp: 1500, canBuild: true, cost: { dollars: 800 }, units: ['rifleman', 'machinegunner', 'sniper', 'rocketeer', 'medic'] },
    armorFactory: { id: 'armorFactory', name: 'Tank Fabrikası', symbol: '�icing', category: 'military', size: 250, hp: 2000, canBuild: true, cost: { dollars: 1500 }, units: ['apc', 'tank', 'heavyTank', 'artillery', 'antiAir'] },
    airbase: { id: 'airbase', name: 'Hava Üssü', symbol: '✈️', category: 'military', size: 300, hp: 2000, canBuild: true, cost: { dollars: 2000 }, units: ['helicopter', 'attackHeli', 'fighter', 'bomber', 'siha'] },
    mgTurret: { id: 'mgTurret', name: 'MG Taret', symbol: '🔫', category: 'defense', size: 100, hp: 800, canBuild: true, cost: { dollars: 400 }, attackRange: 500, attackDamage: 25, attackSpeed: 0.2 },
    missileTurret: { id: 'missileTurret', name: 'Füze Kulesi', symbol: '🚀', category: 'defense', size: 120, hp: 1000, canBuild: true, cost: { dollars: 700 }, attackRange: 700, attackDamage: 80, attackSpeed: 1.5 },
    radar: { id: 'radar', name: 'Radar', symbol: '📡', category: 'support', size: 150, hp: 600, canBuild: true, cost: { dollars: 600 }, radarRange: 3000 },
    hospital: { id: 'hospital', name: 'Hastane', symbol: '🏥', category: 'support', size: 200, hp: 1200, canBuild: true, cost: { dollars: 1000 }, healRange: 600, healRate: 25 },
    oilWell: { id: 'oilWell', name: 'Petrol Kuyusu', symbol: '🛢️', resourceType: 'oil', size: 100, hp: 500, canBuild: false },
    goldMine: { id: 'goldMine', name: 'Altın Madeni', symbol: '🥇', resourceType: 'gold', size: 100, hp: 500, canBuild: false },
    wheatFarm: { id: 'wheatFarm', name: 'Buğday Tarlası', symbol: '🌾', resourceType: 'wheat', size: 100, hp: 500, canBuild: false },
    ironMine: { id: 'ironMine', name: 'Demir Madeni', symbol: '⚙️', resourceType: 'iron', size: 100, hp: 500, canBuild: false },
    copperMine: { id: 'copperMine', name: 'Bakır Madeni', symbol: '🔶', resourceType: 'copper', size: 100, hp: 500, canBuild: false },
    uraniumMine: { id: 'uraniumMine', name: 'Uranyum Madeni', symbol: '☢️', resourceType: 'uranium', size: 100, hp: 500, canBuild: false }
};

const UNITS = {
    rifleman: { id: 'rifleman', name: 'Piyade', symbol: '🔫', hp: 100, damage: 15, range: 300, speed: 150, armor: 0, cost: { dollars: 100 }, buildTime: 5, canCapture: true },
    machinegunner: { id: 'machinegunner', name: 'Makineli', symbol: '💥', hp: 120, damage: 25, range: 350, speed: 120, armor: 1, cost: { dollars: 150 }, buildTime: 6, canCapture: true },
    sniper: { id: 'sniper', name: 'Keskin Nişancı', symbol: '🎯', hp: 60, damage: 80, range: 900, speed: 100, armor: 0, cost: { dollars: 250 }, buildTime: 8, canCapture: true },
    rocketeer: { id: 'rocketeer', name: 'Roketatar', symbol: '🚀', hp: 90, damage: 60, range: 400, speed: 110, armor: 0, cost: { dollars: 200 }, buildTime: 7, canCapture: true, bonusVsVehicle: 2 },
    medic: { id: 'medic', name: 'Sağlık Eri', symbol: '⚕️', hp: 80, damage: 0, range: 0, speed: 140, armor: 0, cost: { dollars: 180 }, buildTime: 6, canCapture: true, healRange: 200, healRate: 15 },
    apc: { id: 'apc', name: 'ZPT', symbol: '🚐', hp: 400, damage: 20, range: 350, speed: 200, armor: 5, cost: { dollars: 400 }, buildTime: 10, isVehicle: true },
    tank: { id: 'tank', name: 'Tank', symbol: '🛡️', hp: 800, damage: 60, range: 500, speed: 120, armor: 15, cost: { dollars: 800 }, buildTime: 15, isVehicle: true },
    heavyTank: { id: 'heavyTank', name: 'Ağır Tank', symbol: '💪', hp: 1200, damage: 90, range: 550, speed: 80, armor: 25, cost: { dollars: 1200 }, buildTime: 20, isVehicle: true },
    artillery: { id: 'artillery', name: 'Obüs', symbol: '💣', hp: 300, damage: 150, range: 1500, speed: 60, armor: 3, cost: { dollars: 1000 }, buildTime: 18, isVehicle: true },
    antiAir: { id: 'antiAir', name: 'Hava Savunma', symbol: '🔭', hp: 350, damage: 70, range: 800, speed: 100, armor: 5, cost: { dollars: 600 }, buildTime: 12, isVehicle: true, bonusVsAir: 3 },
    helicopter: { id: 'helicopter', name: 'Helikopter', symbol: '🚁', hp: 300, damage: 30, range: 400, speed: 250, armor: 2, cost: { dollars: 700 }, buildTime: 12, isAir: true },
    attackHeli: { id: 'attackHeli', name: 'Saldırı Heli', symbol: '🔥', hp: 400, damage: 70, range: 500, speed: 220, armor: 4, cost: { dollars: 1100 }, buildTime: 15, isAir: true },
    fighter: { id: 'fighter', name: 'Savaş Uçağı', symbol: '✈️', hp: 350, damage: 50, range: 600, speed: 400, armor: 3, cost: { dollars: 1500 }, buildTime: 18, isAir: true, bonusVsAir: 2 },
    bomber: { id: 'bomber', name: 'Bombardıman', symbol: '💥', hp: 500, damage: 200, range: 300, speed: 200, armor: 5, cost: { dollars: 2000 }, buildTime: 25, isAir: true, bonusVsBuilding: 2 },
    siha: { id: 'siha', name: 'SİHA (TB2)', symbol: '🛩️', hp: 250, damage: 100, range: 1000, speed: 180, armor: 1, cost: { dollars: 1300 }, buildTime: 16, isAir: true, bonusVsVehicle: 1.5 }
};

window.COUNTRIES = COUNTRIES;
window.CONFIG = CONFIG;
window.BUILDING_CATEGORIES = BUILDING_CATEGORIES;
window.BUILDINGS = BUILDINGS;
window.UNITS = UNITS;
