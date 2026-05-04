/**
 * PAX HISTORIA : MODERN WARFARE
 * Moteur Global (Carte, Caméra, Économie, IA)
 * ES6+ Vanilla JavaScript
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- 1. DONNÉES DE LA CARTE (80x35) ---
// U: USA, F: France, G: Allemagne, R: Russie, C: Chine, X: Territoire neutre, . : Océan
const mapASCII = [
    "................................................................................",
    "....XXXXXXX.....................................XXXXXXXXXXXXXXXXXXXXXXXX........",
    "...XXXXXXXXXX..................................XXXXXXXXXXXXXXXXXXXXXXXXXXX......",
    "...XXXXXXXXXXXX...............................XXXXXXXXXXXXXXXXXXXXXXXXXXXXX.....",
    "....XXXXXXXXXXXXX............................XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX....",
    "....XXXXXXXXXXXXXX...........................XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX....",
    ".....UUUUUXXXXXXXXX........................XXXXRRRRRRRRRRRRRRRRRRRRRRRRXXXXX....",
    ".....UUUUUUUUUXXXXX........................XXXRRRRRRRRRRRRRRRRRRRRRRRRRXXXXX....",
    "......UUUUUUUUUUXXX........................XXRRRRRRRRRRRRRRRRRRRRRRRRRRXXXXX....",
    "......UUUUUUUUUUXX.........................XXGGRRRRRRRRRRRRRRRRRRRRRRRXXXXXX....",
    ".......UUUUUUUUXX.........................XXFFGGRRRRRRRRRRRRCCCCCXXXXX.XXXX.....",
    "........UUUUUUXX..........................XXFFGGRRXXXXXXXXXXCCCCCCCXXX..........",
    ".........XXXXXX............................XXXXXXXXXXXXXXXXXCCCCCCCCXX..........",
    "..........XXXX.............................XXXXXXXXXXXXXXXXXCCCCCCCCXX..........",
    "...........XX...............................XXXXXXXXXXXXXXXXXCCCCCCXXX..........",
    "............................................XXXXXXXXXXXXXXXXXCCCCCCXXX..........",
    ".............XXXX...........................XXXXXXXXXXXXXXXXXXCCCCXXXX..........",
    "............XXXXXXX..........................XXXXXXXXXXXXXXXXXXXXXXXX...........",
    "............XXXXXXXX.........................XXXXXXXXXXXXXXXXXXXXXX.............",
    ".............XXXXXXX..........................XXXXXXXXXXXXXXXXX.................",
    "..............XXXXX...........................XXXXXXXXXXXXXXXXX........XXXX.....",
    "..............XXXX.............................XXXXXXXXXXXXXXX.........XXXXX....",
    "...............XX...............................XXXXXXXXXXXXX..........XXXXXX...",
    ".................................................XXXXXXXXXX.............XXXX....",
    "..................................................XXXXXXX...............XXX.....",
    "....................................................XXX.........................",
    "................................................................................",
    "................................................................................",
    ".......XXXXXXXXXXXXXXXXXXXXXXXXX..................XXXXXXXXXXXXXXXXXXXXXXX.......",
    "........XXXXXXXXXXXXXXXXXXXXXXX....................XXXXXXXXXXXXXXXXXXXXX........"
];

const COLS = 80;
const ROWS = 30;
const BASE_TILE_SIZE = 30; // Taille de base d'une case

// Factions (Dynamiques)
const FACTIONS = {
    0: { color: '#374151', name: 'Neutre' }, // Gris foncé
    1: { color: '#3b82f6', name: 'Joueur' }, // Bleu
    2: { color: '#ef4444', name: 'IA 1' },   // Rouge
    3: { color: '#10b981', name: 'IA 2' },   // Vert
    4: { color: '#f59e0b', name: 'IA 3' },   // Jaune
    5: { color: '#8b5cf6', name: 'IA 4' }    // Violet
};

// --- 2. VARIABLES GLOBALES ET CAMÉRA ---
let grid = [];
let selectedTile = null;
let gameState = 'menu';
let animationId;
let lastTickTime = 0, lastAITick = 0;

// Caméra
let camera = { x: 0, y: 0, zoom: 1 };
let isPanning = false;
let panStartX = 0, panStartY = 0;

// Économie
let playerGold = 0, playerIncome = 0;
let techLevels = { attack: 0, defense: 0 };
let techCosts = { attack: 50, defense: 50 };

// Paramètres
let gameSettings = { playerCountry: 'F', difficulty: 2, enemies: 3 };

// --- 3. LOGIQUE DES CASES (PROVINCES) ---
class Tile {
    constructor(c, r, countryCode) {
        this.c = c; this.r = r;
        this.countryCode = countryCode; // Ex: 'F', 'U', 'X', '.'
        this.isLand = (countryCode !== '.');
        this.owner = 0; 
        this.troops = this.isLand ? Math.floor(Math.random() * 10) + 5 : 0;
        this.maxTroops = 250;
    }
}

// --- 4. INITIALISATION (RÉSOLUTION DU BUG "PAYS INJOUABLE") ---
function initGame() {
    if (animationId) cancelAnimationFrame(animationId);
    
    // Récupérer les paramètres
    gameSettings.playerCountry = document.getElementById('countrySelect').value;
    gameSettings.difficulty = parseInt(document.getElementById('diffSelect').value);
    gameSettings.enemies = parseInt(document.getElementById('enemyCountSelect').value);

    grid = []; selectedTile = null;
    playerGold = 50; techLevels = { attack: 0, defense: 0 }; techCosts = { attack: 50, defense: 50 };
    updateTechUI();

    // 4.1 Définir les pays majeurs disponibles
    let majorCountries = ['U', 'F', 'G', 'R', 'C'];
    
    // 4.2 Le joueur prend son pays
    let playerCode = gameSettings.playerCountry;
    // Retirer le pays du joueur de la liste
    majorCountries = majorCountries.filter(c => c !== playerCode);
    
    // 4.3 Assigner les IA aléatoirement aux autres pays majeurs
    let aiAssignments = {}; // { 'R': 2, 'C': 3 ... }
    for(let i = 1; i <= gameSettings.enemies; i++) {
        if(majorCountries.length > 0) {
            let randIndex = Math.floor(Math.random() * majorCountries.length);
            let aiCode = majorCountries.splice(randIndex, 1)[0];
            aiAssignments[aiCode] = i + 1; // IA commence à l'ID 2
        }
    }

    // 4.4 Construire la grille et assigner les propriétaires
    for (let c = 0; c < COLS; c++) {
        grid[c] = [];
        for (let r = 0; r < ROWS; r++) {
            let code = mapASCII[r][c];
            let tile = new Tile(c, r, code);
            
            // Si c'est le pays du joueur
            if (code === playerCode) {
                tile.owner = 1;
                tile.troops = 30; // Boost de départ
            } 
            // Si c'est un pays assigné à une IA
            else if (aiAssignments[code]) {
                tile.owner = aiAssignments[code];
                tile.troops = 30;
            }
            grid[c][r] = tile;
        }
    }

    // Centrer la caméra au milieu de la carte
    camera.zoom = Math.min(canvas.width / (COLS * BASE_TILE_SIZE * 0.8), 1.5);
    camera.x = (COLS * BASE_TILE_SIZE) / 2;
    camera.y = (ROWS * BASE_TILE_SIZE) / 2;

    gameState = 'playing';
    lastTickTime = performance.now();
    lastAITick = performance.now();
    gameLoop(performance.now());
}

// --- 5. MOTEUR DE CAMÉRA ---
function worldToScreen(wx, wy) {
    return {
        x: (wx - camera.x) * camera.zoom + canvas.width / 2,
        y: (wy - camera.y) * camera.zoom + canvas.height / 2
    };
}
function screenToWorld(sx, sy) {
    return {
        x: (sx - canvas.width / 2) / camera.zoom + camera.x,
        y: (sy - canvas.height / 2) / camera.zoom + camera.y
    };
}

// Zoom
canvas.addEventListener('wheel', (e) => {
    if (gameState !== 'playing') return;
    e.preventDefault();
    const zoomAmount = e.deltaY > 0 ? 0.9 : 1.1;
    camera.zoom *= zoomAmount;
    // Limites du zoom
    camera.zoom = Math.max(0.3, Math.min(camera.zoom, 3.0));
});

// Déplacement (Pan) - Clic droit ou clic dans le vide
canvas.addEventListener('contextmenu', e => e.preventDefault()); // Désactiver menu clic droit

canvas.addEventListener('mousedown', (e) => {
    if (gameState !== 'playing') return;
    
    const worldPos = screenToWorld(e.clientX, e.clientY);
    const c = Math.floor(worldPos.x / BASE_TILE_SIZE);
    const r = Math.floor(worldPos.y / BASE_TILE_SIZE);

    // Clic Droit = Déplacement Caméra
    if (e.button === 2 || (c < 0 || c >= COLS || r < 0 || r >= ROWS || !grid[c][r].isLand)) {
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        canvas.style.cursor = 'grabbing';
        return;
    }

    // Clic Gauche = Sélection / Attaque
    if (e.button === 0) {
        let clickedTile = grid[c][r];
        if (selectedTile) {
            if (selectedTile === clickedTile) {
                selectedTile = null; // Désélection
            } else {
                let isAdj = Math.abs(selectedTile.c - clickedTile.c) + Math.abs(selectedTile.r - clickedTile.r) === 1;
                if (isAdj && selectedTile.owner === 1 && selectedTile.troops > 1) {
                    attack(selectedTile, clickedTile);
                } else if (clickedTile.owner === 1) {
                    selectedTile = clickedTile;
                } else {
                    selectedTile = null;
                }
            }
        } else if (clickedTile.owner === 1) {
            selectedTile = clickedTile;
        }
    }
});

window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    const dx = (e.clientX - panStartX) / camera.zoom;
    const dy = (e.clientY - panStartY) / camera.zoom;
    camera.x -= dx;
    camera.y -= dy;
    panStartX = e.clientX;
    panStartY = e.clientY;
});

window.addEventListener('mouseup', () => {
    isPanning = false;
    canvas.style.cursor = 'default';
});

// --- 6. LOGIQUE GLOBALE (Économie & Combat) ---
function gameTick() {
    let terrCount = 0;
    let totalArmy = 0;

    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            let tile = grid[c][r];
            if (tile.isLand && tile.owner !== 0) {
                if(tile.troops < tile.maxTroops) {
                    // Recrutement
                    let recRate = (tile.owner === 1) ? 1 : (gameSettings.difficulty === 3 ? 2 : 1);
                    tile.troops += recRate;
                }
                if (tile.owner === 1) {
                    terrCount++;
                    totalArmy += Math.floor(tile.troops);
                }
            }
        }
    }
    
    // Cumul d'or (2 par territoire)
    playerIncome = terrCount * 2;
    playerGold += playerIncome;
    
    // Mise à jour de l'UI
    document.getElementById('goldDisplay').innerText = `${Math.floor(playerGold)} 💰`;
    document.getElementById('armyTotalDisplay').innerText = totalArmy.toLocaleString();
    updateTechUI();
}

function attack(source, target) {
    let sent = Math.floor(source.troops / 2);
    source.troops -= sent;

    if (target.owner === source.owner) {
        target.troops = Math.min(target.troops + sent, target.maxTroops);
    } else {
        // Application des technologies
        let atkMod = (source.owner === 1) ? 1.0 + (techLevels.attack * 0.2) : 1.0;
        let defMod = (target.owner === 1) ? 1.2 + (techLevels.defense * 0.25) : 1.2;

        let pAtk = sent * atkMod;
        let pDef = target.troops * defMod;

        if (pAtk > pDef) {
            target.owner = source.owner;
            target.troops = (pAtk - pDef) / atkMod;
        } else {
            target.troops -= (pAtk / defMod);
        }
    }
}

function processAI() {
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            let tile = grid[c][r];
            if (tile.owner > 1 && tile.troops > 15) {
                let chance = gameSettings.difficulty === 1 ? 0.2 : (gameSettings.difficulty === 2 ? 0.4 : 0.7);
                if (Math.random() < chance) {
                    let neighbors = [];
                    if (c>0 && grid[c-1][r].isLand) neighbors.push(grid[c-1][r]);
                    if (c<COLS-1 && grid[c+1][r].isLand) neighbors.push(grid[c+1][r]);
                    if (r>0 && grid[c][r-1].isLand) neighbors.push(grid[c][r-1]);
                    if (r<ROWS-1 && grid[c][r+1].isLand) neighbors.push(grid[c][r+1]);
                    
                    let enemies = neighbors.filter(n => n.owner !== tile.owner);
                    if (enemies.length > 0) {
                        // IA attaque la case la plus faible
                        enemies.sort((a,b) => a.troops - b.troops);
                        attack(tile, enemies[0]);
                    }
                }
            }
        }
    }
}

// --- 7. TECHNOLOGIES ---
function buyTech(type) {
    if (type === 'attack' && playerGold >= techCosts.attack) {
        playerGold -= techCosts.attack; techLevels.attack++; techCosts.attack *= 2;
    } else if (type === 'defense' && playerGold >= techCosts.defense) {
        playerGold -= techCosts.defense; techLevels.defense++; techCosts.defense *= 2;
    }
    updateTechUI();
}
function updateTechUI() {
    const btnAtk = document.getElementById('btnTechAttack');
    const btnDef = document.getElementById('btnTechDefense');
    btnAtk.children[1].innerText = `${techCosts.attack} 💰`;
    btnDef.children[1].innerText = `${techCosts.defense} 💰`;
    
    playerGold >= techCosts.attack ? btnAtk.classList.remove('disabled-tech') : btnAtk.classList.add('disabled-tech');
    playerGold >= techCosts.defense ? btnDef.classList.remove('disabled-tech') : btnDef.classList.add('disabled-tech');
}
document.getElementById('btnTechAttack').addEventListener('click', () => buyTech('attack'));
document.getElementById('btnTechDefense').addEventListener('click', () => buyTech('defense'));


// --- 8. RENDU ---
function drawMap() {
    // Fond global
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            let tile = grid[c][r];
            if (!tile.isLand) continue;

            // Conversion des coordonnées mondiales en coordonnées écran (Caméra)
            let worldX = c * BASE_TILE_SIZE;
            let worldY = r * BASE_TILE_SIZE;
            let screenPos = worldToScreen(worldX, worldY);
            let size = BASE_TILE_SIZE * camera.zoom;

            // Optimisation : Ne pas dessiner si hors de l'écran
            if (screenPos.x + size < 0 || screenPos.x > canvas.width || screenPos.y + size < 0 || screenPos.y > canvas.height) {
                continue; 
            }

            // Dessin case
            ctx.fillStyle = FACTIONS[tile.owner].color;
            // On laisse 1px de marge pour voir la grille
            ctx.fillRect(screenPos.x, screenPos.y, size - 1, size - 1);

            if (selectedTile === tile) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2 * camera.zoom;
                ctx.strokeRect(screenPos.x, screenPos.y, size - 1, size - 1);
            }

            // Troupes (Affichées seulement si le zoom est suffisant pour que ce soit lisible)
            if (size > 15 && tile.troops > 0) {
                ctx.fillStyle = 'white';
                ctx.font = `bold ${size * 0.4}px Arial`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(Math.floor(tile.troops), screenPos.x + size/2, screenPos.y + size/2);
            }
        }
    }
}

// --- BOUCLE D'ANIMATION ---
function gameLoop(timestamp) {
    if (gameState !== 'playing') return;

    if (timestamp - lastTickTime > 1000) { gameTick(); lastTickTime = timestamp; }
    
    let aiSpeed = gameSettings.difficulty === 1 ? 1500 : (gameSettings.difficulty === 2 ? 800 : 400);
    if (timestamp - lastAITick > aiSpeed) { processAI(); lastAITick = timestamp; }

    drawMap();
    checkWinCondition();
    animationId = requestAnimationFrame(gameLoop);
}

function checkWinCondition() {
    let pCount = 0, eCount = 0;
    for(let c=0; c<COLS; c++) {
        for(let r=0; r<ROWS; r++) {
            if(grid[c][r].isLand) {
                if(grid[c][r].owner === 1) pCount++;
                else if(grid[c][r].owner > 1) eCount++;
            }
        }
    }
    if (pCount === 0 || (eCount === 0 && pCount > 0)) {
        gameState = 'ended';
        document.getElementById('endGameModal').classList.remove('hidden');
        document.getElementById('endGameTitle').innerText = pCount === 0 ? "NATION VAINCUE" : "HÉGÉMONIE MONDIALE";
    }
}

// --- UTILITAIRES (Menus & Drag&Drop UI) ---
function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resize);
resize();

document.getElementById('startGameBtn').addEventListener('click', () => {
    document.getElementById('setupMenu').classList.add('hidden');
    document.querySelectorAll('.draggable-window').forEach(el => el.classList.remove('hidden-ui'));
    initGame();
});

function returnToMenu() {
    gameState = 'menu';
    if(animationId) cancelAnimationFrame(animationId);
    document.getElementById('endGameModal').classList.add('hidden');
    document.querySelectorAll('.draggable-window').forEach(el => el.classList.add('hidden-ui'));
    document.getElementById('setupMenu').classList.remove('hidden');
    ctx.clearRect(0,0,canvas.width, canvas.height);
}
document.getElementById('capitulateBtn').addEventListener('click', returnToMenu);
document.getElementById('modalRestartBtn').addEventListener('click', returnToMenu);

// Rendre les fenêtres déplaçables
document.querySelectorAll('.draggable-window').forEach(win => {
    let handle = win.querySelector('.drag-handle');
    let isDraggingWindow = false, offsetX = 0, offsetY = 0;
    
    handle.addEventListener('mousedown', e => {
        isDraggingWindow = true;
        let rect = win.getBoundingClientRect();
        offsetX = e.clientX - rect.left; offsetY = e.clientY - rect.top;
    });
    window.addEventListener('mousemove', e => {
        if(!isDraggingWindow) return;
        win.style.left = `${e.clientX - offsetX}px`;
        win.style.top = `${e.clientY - offsetY}px`;
        win.style.right = 'auto'; // Retire l'ancrage droit initial
    });
    window.addEventListener('mouseup', () => isDraggingWindow = false);
    // Empêcher le clic de traverser vers le jeu
    win.addEventListener('mousedown', e => e.stopPropagation());
    win.addEventListener('wheel', e => e.stopPropagation());
});