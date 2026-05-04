/**
 * main.js - Moteur, Rendu et Entrées Utilisateur
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let TILE_SIZE = 20; // Ajusté dynamiquement
let grid = [];
let selectedTile = null;
let lastTickTime = 0;
let lastAITick = 0;
let gameState = 'playing';

class Tile {
    constructor(c, r, isLand) {
        this.c = c;
        this.r = r;
        this.isLand = isLand;
        this.owner = 0;
        this.troops = isLand ? Math.floor(Math.random() * 5) + 5 : 0; 
        this.maxTroops = 200;
    }
}

// --- INITIALISATION ---
function initGame() {
    grid = [];
    selectedTile = null;
    gameState = 'playing';
    document.getElementById('endGameModal').classList.add('hidden');
    resetMechanics(); // Réinitialiser l'or et les techs
    
    // Création de la grille selon mapData.js
    for (let c = 0; c < COLS; c++) {
        grid[c] = [];
        for (let r = 0; r < ROWS; r++) {
            const isLand = earthMapASCII[r][c] === 'X';
            grid[c][r] = new Tile(c, r, isLand);
        }
    }

    // Capitales historiques (Basées sur les coordonnées de notre carte ASCII)
    // Joueur (Europe)
    grid[15][3].owner = 1; grid[15][3].troops = 50; 
    // IA Rouge (Amériques)
    grid[6][5].owner = 2; grid[6][5].troops = 50; 
    // IA Verte (Asie)
    grid[28][4].owner = 3; grid[28][4].troops = 50; 
    // IA Jaune (Afrique)
    grid[19][9].owner = 4; grid[19][9].troops = 50; 

    lastTickTime = performance.now();
    lastAITick = performance.now();
    resize();
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // La carte de la Terre prend 90% de l'écran pour garder des marges océaniques
    TILE_SIZE = Math.min((canvas.width * 0.9) / COLS, (canvas.height * 0.9) / ROWS);
}
window.addEventListener('resize', resize);

// --- BOUCLE PRINCIPALE ---
function gameLoop(timestamp) {
    if (gameState === 'playing') {
        if (timestamp - lastTickTime > 1000) { 
            gameTick();
            lastTickTime = timestamp;
        }
        if (timestamp - lastAITick > 800) { // IA légèrement plus lente (stratégique)
            processAI();
            lastAITick = timestamp;
        }
        checkEndGame();
    }
    drawMap();
    requestAnimationFrame(gameLoop);
}

function gameTick() {
    let playerTerritories = 0;

    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            let tile = grid[c][r];
            if (tile.isLand && tile.owner !== 0 && tile.troops < tile.maxTroops) {
                tile.troops += 1;
            }
            if (tile.owner === 1) playerTerritories++;
        }
    }
    // Appel de la mécanique de Pax Historia (Or)
    processEconomy(playerTerritories);
}

// --- LOGIQUE DE COMBAT ---
function attack(sourceTile, targetTile) {
    // Cas limite : On ne peut pas attaquer l'océan
    if (!targetTile.isLand) return;

    let sentTroops = Math.floor(sourceTile.troops / 2);
    sourceTile.troops -= sentTroops;

    if (targetTile.owner === sourceTile.owner) {
        targetTile.troops = Math.min(targetTile.troops + sentTroops, targetTile.maxTroops);
    } else {
        // Application des Technologies (Joueur vs IA)
        let atkMod = sourceTile.owner === 1 ? combatStats.attackMultiplier : 1.0;
        let defMod = targetTile.owner === 1 ? combatStats.defenseMultiplier : (targetTile.owner !== 0 ? 1.2 : 1.0);

        let attackPower = sentTroops * atkMod;
        let defensePower = targetTile.troops * defMod;

        if (attackPower > defensePower) {
            targetTile.owner = sourceTile.owner;
            // Conversion des troupes restantes
            targetTile.troops = (attackPower - defensePower) / atkMod;
        } else {
            targetTile.troops -= (attackPower / defMod);
        }
    }
}

// Obtenir voisins (Uniquement les terres)
function getLandNeighbors(c, r) {
    let neighbors = [];
    if (c > 0 && grid[c-1][r].isLand) neighbors.push(grid[c-1][r]);
    if (c < COLS - 1 && grid[c+1][r].isLand) neighbors.push(grid[c+1][r]);
    if (r > 0 && grid[c][r-1].isLand) neighbors.push(grid[c][r-1]);
    if (r < ROWS - 1 && grid[c][r+1].isLand) neighbors.push(grid[c][r+1]);
    return neighbors;
}

function processAI() {
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            let tile = grid[c][r];
            if (tile.owner > 1 && tile.troops > 20) {
                if (Math.random() < 0.2) {
                    let neighbors = getLandNeighbors(c, r);
                    let target = neighbors.sort((a, b) => a.troops - b.troops)[0]; // Vise le plus faible
                    if (target && target.owner !== tile.owner) {
                        attack(tile, target);
                    }
                }
            }
        }
    }
}

// --- RENDU CANVAS ---
function drawMap() {
    const offsetX = (canvas.width - (COLS * TILE_SIZE)) / 2;
    const offsetY = (canvas.height - (ROWS * TILE_SIZE)) / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            let tile = grid[c][r];
            if (!tile.isLand) continue; // On ne dessine pas l'océan !

            let x = offsetX + c * TILE_SIZE;
            let y = offsetY + r * TILE_SIZE;

            // Ombre portée
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(x + 2, y + 2, TILE_SIZE - 2, TILE_SIZE - 2);

            // Couleur de faction
            ctx.fillStyle = FACTIONS[tile.owner].color;
            ctx.fillRect(x, y, TILE_SIZE - 2, TILE_SIZE - 2);

            // Sélection
            if (selectedTile === tile) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 3;
                ctx.strokeRect(x, y, TILE_SIZE - 2, TILE_SIZE - 2);
            }

            // Textes des troupes (Seulement si > 0 pour éviter la surcharge visuelle)
            if (tile.troops > 0) {
                ctx.fillStyle = 'white';
                // Si on a plus de 40 cases, le texte doit être adapté
                ctx.font = `bold ${Math.max(8, TILE_SIZE * 0.4)}px Arial`; 
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
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
        gameState = 'defeat';
        document.getElementById('endGameModal').classList.remove('hidden');
        document.getElementById('endGameTitle').innerText = "L'Europe est tombée.";
    } else if (enemyT === 0 && playerT > 0) {
        gameState = 'victory';
        document.getElementById('endGameModal').classList.remove('hidden');
        document.getElementById('endGameTitle').innerText = "Hégémonie Mondiale Atteinte !";
    }
}

// --- ENTRÉES UTILISATEUR ---
canvas.addEventListener('mousedown', (e) => {
    if (gameState !== 'playing') return;

    const offsetX = (canvas.width - (COLS * TILE_SIZE)) / 2;
    const offsetY = (canvas.height - (ROWS * TILE_SIZE)) / 2;
    
    const c = Math.floor((e.clientX - offsetX) / TILE_SIZE);
    const r = Math.floor((e.clientY - offsetY) / TILE_SIZE);

    if (c >= 0 && c < COLS && r >= 0 && r < ROWS && grid[c][r].isLand) {
        let clickedTile = grid[c][r];

        if (selectedTile) {
            if (selectedTile === clickedTile) {
                selectedTile = null;
            } else {
                let isAdjacent = Math.abs(selectedTile.c - clickedTile.c) + Math.abs(selectedTile.r - clickedTile.r) === 1;
                if (isAdjacent && selectedTile.owner === 1 && selectedTile.troops > 1) {
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
    } else {
        selectedTile = null; // Clic dans l'océan annule la sélection
    }
});

// Code UI Drag & Drop
const uiPanel = document.getElementById('uiPanel');
const uiHeader = document.getElementById('uiHeader');
let isDragging = false, dragOffsetX = 0, dragOffsetY = 0;

uiHeader.addEventListener('mousedown', (e) => {
    if(e.target.id === 'closeMenuBtn') return;
    isDragging = true;
    dragOffsetX = e.clientX - uiPanel.offsetLeft;
    dragOffsetY = e.clientY - uiPanel.offsetTop;
});
document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    uiPanel.style.left = Math.max(0, Math.min(e.clientX - dragOffsetX, window.innerWidth - uiPanel.offsetWidth)) + 'px';
    uiPanel.style.top = Math.max(0, Math.min(e.clientY - dragOffsetY, window.innerHeight - uiPanel.offsetHeight)) + 'px';
});
document.addEventListener('mouseup', () => isDragging = false);

document.getElementById('closeMenuBtn').addEventListener('click', () => {
    uiPanel.classList.add('hidden-panel');
    document.getElementById('openMenuBtn').classList.remove('hidden');
});
document.getElementById('openMenuBtn').addEventListener('click', () => {
    uiPanel.classList.remove('hidden-panel');
    document.getElementById('openMenuBtn').classList.add('hidden');
});
uiPanel.addEventListener('mousedown', e => e.stopPropagation());
document.getElementById('openMenuBtn').addEventListener('mousedown', e => e.stopPropagation());

document.getElementById('restartBtn').addEventListener('click', initGame);
document.getElementById('modalRestartBtn').addEventListener('click', initGame);

// Lancement
initGame();
requestAnimationFrame(gameLoop);