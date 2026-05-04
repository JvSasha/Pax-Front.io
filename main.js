/**
 * main.js - Rendu, Intelligence Artificielle et Entrées
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let TILE_SIZE = 15; // Adaptatif selon l'écran pour le 70x30
let grid = [];
let selectedTile = null;
let lastTickTime = 0; let lastAITick = 0;
let gameState = 'menu'; // 'menu', 'playing', 'ended'
let animationFrameId;

// Paramètres de la partie
let gameSettings = { difficulty: 2, enemyCount: 3 };

class Tile {
    constructor(c, r, isLand) {
        this.c = c; this.r = r; this.isLand = isLand;
        this.owner = 0;
        this.troops = isLand ? Math.floor(Math.random() * 5) + 2 : 0; 
        this.baseMaxTroops = 100;
    }
    getMaxTroops() {
        return this.owner === 1 ? this.baseMaxTroops + combatStats.maxTroopsBoost : this.baseMaxTroops;
    }
}

// --- GESTION DU MENU ET DU REDÉMARRAGE ---

document.getElementById('startGameBtn').addEventListener('click', () => {
    gameSettings.difficulty = parseInt(document.getElementById('diffSelect').value);
    gameSettings.enemyCount = parseInt(document.getElementById('enemyCountSelect').value);
    
    document.getElementById('setupMenu').classList.add('hidden');
    document.getElementById('uiPanel').classList.remove('hidden-panel');
    initGame();
});

document.getElementById('modalRestartBtn').addEventListener('click', showSetupMenu);
document.getElementById('capitulateBtn').addEventListener('click', showSetupMenu);

function showSetupMenu() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId); // Arrêt propre de l'ancienne partie
    gameState = 'menu';
    document.getElementById('endGameModal').classList.add('hidden');
    document.getElementById('uiPanel').classList.add('hidden-panel');
    document.getElementById('setupMenu').classList.remove('hidden');
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Nettoie le fond
}

function initGame() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId); // Sécurité
    grid = []; selectedTile = null; gameState = 'playing';
    resetMechanics();
    
    for (let c = 0; c < COLS; c++) {
        grid[c] = [];
        for (let r = 0; r < ROWS; r++) {
            grid[c][r] = new Tile(c, r, earthMapASCII[r][c] === 'X');
        }
    }

    // Spawn Historique
    grid[35][8].owner = 1; grid[35][8].troops = 50; // Europe (Joueur)
    
    if (gameSettings.enemyCount >= 1) { grid[15][12].owner = 2; grid[15][12].troops = 50; } // Amériques (Rouge)
    if (gameSettings.enemyCount >= 2) { grid[55][10].owner = 3; grid[55][10].troops = 50; } // Asie (Vert)
    if (gameSettings.enemyCount >= 3) { grid[38][18].owner = 4; grid[38][18].troops = 50; } // Afrique (Jaune)

    lastTickTime = performance.now(); lastAITick = performance.now();
    resize();
    gameLoop(performance.now()); // Lancement propre de la boucle
}

function resize() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    TILE_SIZE = Math.min((canvas.width * 0.95) / COLS, (canvas.height * 0.95) / ROWS);
}
window.addEventListener('resize', resize);

// --- BOUCLE MOTEUR ---
function gameLoop(timestamp) {
    if (gameState !== 'playing') return; // Stoppe l'exécution si on n'est plus en jeu

    if (timestamp - lastTickTime > 1000) { 
        gameTick(); lastTickTime = timestamp;
    }
    
    // L'IA agit plus ou moins vite selon la difficulté
    let aiSpeed = gameSettings.difficulty === 1 ? 1500 : (gameSettings.difficulty === 2 ? 1000 : 600);
    if (timestamp - lastAITick > aiSpeed) { 
        processAI(); lastAITick = timestamp;
    }
    
    drawMap();
    checkEndGame();
    
    if (gameState === 'playing') {
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

function gameTick() {
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            let tile = grid[c][r];
            if (tile.isLand && tile.owner !== 0 && tile.troops < tile.getMaxTroops()) {
                // Taux de recrutement normalisé à 1 + bonus de conscription pour le joueur
                let rec = tile.owner === 1 ? 1 + combatStats.recruitmentBoost : 1 + (gameSettings.difficulty === 3 ? 1 : 0); // L'IA Hard a un bonus de recrutement naturel
                tile.troops += rec;
                if(tile.troops > tile.getMaxTroops()) tile.troops = tile.getMaxTroops();
            }
        }
    }
    processEconomyAndArmy(grid, 1);
}

// --- LOGIQUE DE COMBAT ET FLUCTUATION DES EFFECTIFS ---
function attack(sourceTile, targetTile) {
    if (!targetTile.isLand) return;

    let sentTroops = Math.floor(sourceTile.troops / 2);
    sourceTile.troops -= sentTroops;

    if (targetTile.owner === sourceTile.owner) {
        targetTile.troops = Math.min(targetTile.troops + sentTroops, targetTile.getMaxTroops());
    } else {
        let atkMod = sourceTile.owner === 1 ? combatStats.attackMultiplier : 1.0;
        let defMod = targetTile.owner === 1 ? combatStats.defenseMultiplier : (targetTile.owner !== 0 ? 1.2 : 1.0);

        let attackPower = sentTroops * atkMod;
        let defensePower = targetTile.troops * defMod;

        // Pertes militaires (calculées pour le lore/les effectifs)
        if (attackPower > defensePower) {
            targetTile.owner = sourceTile.owner;
            targetTile.troops = (attackPower - defensePower) / atkMod;
        } else {
            targetTile.troops -= (attackPower / defMod);
        }
    }
}

function getLandNeighbors(c, r) {
    let neighbors = [];
    if (c > 0 && grid[c-1][r].isLand) neighbors.push(grid[c-1][r]);
    if (c < COLS - 1 && grid[c+1][r].isLand) neighbors.push(grid[c+1][r]);
    if (r > 0 && grid[c][r-1].isLand) neighbors.push(grid[c][r-1]);
    if (r < ROWS - 1 && grid[c][r+1].isLand) neighbors.push(grid[c][r+1]);
    return neighbors;
}

// --- INTELLIGENCE ARTIFICIELLE ---
function processAI() {
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            let tile = grid[c][r];
            if (tile.owner > 1 && tile.troops > 20) {
                
                // Probabilité d'attaque selon la difficulté (10%, 30%, 60%)
                let attackChance = gameSettings.difficulty === 1 ? 0.1 : (gameSettings.difficulty === 2 ? 0.3 : 0.6);
                
                if (Math.random() < attackChance) {
                    let neighbors = getLandNeighbors(c, r).filter(n => n.owner !== tile.owner);
                    if (neighbors.length === 0) continue;

                    let target;
                    if (gameSettings.difficulty === 1) {
                        // IA Facile : Frappe au hasard
                        target = neighbors[Math.floor(Math.random() * neighbors.length)];
                    } else if (gameSettings.difficulty === 2) {
                        // IA Normale : Frappe le plus faible
                        target = neighbors.sort((a, b) => a.troops - b.troops)[0];
                    } else {
                        // IA Difficile : Priorise le joueur, sinon frappe le plus faible
                        let playerNeighbors = neighbors.filter(n => n.owner === 1);
                        if (playerNeighbors.length > 0) {
                            target = playerNeighbors[0];
                        } else {
                            target = neighbors.sort((a, b) => a.troops - b.troops)[0];
                        }
                    }
                    if (target) attack(tile, target);
                }
            }
        }
    }
}

// --- RENDU ET CONDITIONS DE VICTOIRE ---
function drawMap() {
    const offsetX = (canvas.width - (COLS * TILE_SIZE)) / 2;
    const offsetY = (canvas.height - (ROWS * TILE_SIZE)) / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            let tile = grid[c][r];
            if (!tile.isLand) continue; 

            let x = offsetX + c * TILE_SIZE; let y = offsetY + r * TILE_SIZE;

            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(x + 1, y + 1, TILE_SIZE - 1, TILE_SIZE - 1); // Ombre fine

            ctx.fillStyle = FACTIONS[tile.owner].color;
            ctx.fillRect(x, y, TILE_SIZE - 1, TILE_SIZE - 1); // Bordure inter-cases gérée par TILE_SIZE - 1

            if (selectedTile === tile) {
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
                ctx.strokeRect(x, y, TILE_SIZE - 1, TILE_SIZE - 1);
            }

            // On affiche le nombre de troupes uniquement si c'est suffisant ou si on zoome (pour éviter un fouillis visuel)
            if (tile.troops > 10 || tile.owner === 1) {
                ctx.fillStyle = 'white';
                ctx.font = `bold ${Math.max(8, TILE_SIZE * 0.4)}px Arial`; 
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(Math.floor(tile.troops), x + TILE_SIZE/2, y + TILE_SIZE/2);
            }
        }
    }
}

function checkEndGame() {
    let playerT = 0, enemyT = 0;
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            if (grid[c][r].isLand) {
                if (grid[c][r].owner === 1) playerT++;
                else if (grid[c][r].owner > 1) enemyT++;
            }
        }
    }
    if (playerT === 0) {
        gameState = 'ended';
        document.getElementById('endGameModal').classList.remove('hidden');
        document.getElementById('endGameBox').className = "bg-gray-800 p-8 rounded-xl shadow-2xl text-center border-4 border-red-500";
        document.getElementById('endGameTitle').innerText = "L'Europe est tombée.";
        document.getElementById('endGameStats').innerText = "Votre armée a été dissoute. Cliquez ci-dessous pour changer la destinée.";
    } else if (enemyT === 0 && playerT > 0) {
        gameState = 'ended';
        document.getElementById('endGameModal').classList.remove('hidden');
        document.getElementById('endGameBox').className = "bg-gray-800 p-8 rounded-xl shadow-2xl text-center border-4 border-blue-500";
        document.getElementById('endGameTitle').innerText = "Hégémonie Atteinte !";
        document.getElementById('endGameStats').innerText = `Le monde est unifié sous votre bannière avec ${totalArmyPersonnel.toLocaleString()} soldats.`;
    }
}

// Interactions Souris/Tactile
canvas.addEventListener('mousedown', (e) => {
    if (gameState !== 'playing') return;

    const offsetX = (canvas.width - (COLS * TILE_SIZE)) / 2; const offsetY = (canvas.height - (ROWS * TILE_SIZE)) / 2;
    const c = Math.floor((e.clientX - offsetX) / TILE_SIZE); const r = Math.floor((e.clientY - offsetY) / TILE_SIZE);

    if (c >= 0 && c < COLS && r >= 0 && r < ROWS && grid[c][r].isLand) {
        let clickedTile = grid[c][r];
        if (selectedTile) {
            if (selectedTile === clickedTile) selectedTile = null;
            else {
                let isAdj = Math.abs(selectedTile.c - clickedTile.c) + Math.abs(selectedTile.r - clickedTile.r) === 1;
                if (isAdj && selectedTile.owner === 1 && selectedTile.troops > 1) attack(selectedTile, clickedTile);
                else if (clickedTile.owner === 1) selectedTile = clickedTile;
                else selectedTile = null;
            }
        } else if (clickedTile.owner === 1) selectedTile = clickedTile;
    } else selectedTile = null;
});

// UI Drag
const uiPanel = document.getElementById('uiPanel'); const uiHeader = document.getElementById('uiHeader');
let isDragging = false, dragOffsetX = 0, dragOffsetY = 0;
uiHeader.addEventListener('mousedown', (e) => {
    if(e.target.id === 'closeMenuBtn') return;
    isDragging = true; dragOffsetX = e.clientX - uiPanel.offsetLeft; dragOffsetY = e.clientY - uiPanel.offsetTop;
});
document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    uiPanel.style.left = Math.max(0, Math.min(e.clientX - dragOffsetX, window.innerWidth - uiPanel.offsetWidth)) + 'px';
    uiPanel.style.top = Math.max(0, Math.min(e.clientY - dragOffsetY, window.innerHeight - uiPanel.offsetHeight)) + 'px';
});
document.addEventListener('mouseup', () => isDragging = false);

document.getElementById('closeMenuBtn').addEventListener('click', () => {
    uiPanel.classList.add('hidden-panel'); document.getElementById('openMenuBtn').classList.remove('hidden');
});
document.getElementById('openMenuBtn').addEventListener('click', () => {
    uiPanel.classList.remove('hidden-panel'); document.getElementById('openMenuBtn').classList.add('hidden');
});
uiPanel.addEventListener('mousedown', e => e.stopPropagation()); document.getElementById('openMenuBtn').addEventListener('mousedown', e => e.stopPropagation());