/**
 * paxMechanics.js - Règles économiques et technologiques
 */

// --- ÉTAT DU JOUEUR ---
let playerGold = 50; 
let playerIncome = 0; // Calculé par seconde

// Multiplicateurs de base
let combatStats = {
    attackMultiplier: 1.0,
    defenseMultiplier: 1.2, // Bonus de défense naturel
    attackLvl: 0,
    defenseLvl: 0
};

// Coûts initiaux
let costs = { attack: 50, defense: 50 };

// --- FONCTIONS ÉCONOMIQUES ---

// Appelé chaque seconde par le moteur de jeu
function processEconomy(playerTerritoriesCount) {
    // Dans Pax Historia, l'or vient des territoires contrôlés
    playerIncome = playerTerritoriesCount * 2; // +2 Or par territoire
    playerGold += playerIncome;
    updateTechUI();
}

function buyTech(type) {
    if (type === 'attack' && playerGold >= costs.attack) {
        playerGold -= costs.attack;
        combatStats.attackMultiplier += 0.2; // +20%
        combatStats.attackLvl++;
        costs.attack = Math.floor(costs.attack * 1.5); // Inflation du coût (Règle classique de stratégie)
    } 
    else if (type === 'defense' && playerGold >= costs.defense) {
        playerGold -= costs.defense;
        combatStats.defenseMultiplier += 0.25; // +25%
        combatStats.defenseLvl++;
        costs.defense = Math.floor(costs.defense * 1.5);
    }
    updateTechUI();
}

function resetMechanics() {
    playerGold = 50;
    combatStats = { attackMultiplier: 1.0, defenseMultiplier: 1.2, attackLvl: 0, defenseLvl: 0 };
    costs = { attack: 50, defense: 50 };
    updateTechUI();
}

// --- MISE À JOUR DE L'INTERFACE ---
function updateTechUI() {
    document.getElementById('goldDisplay').innerText = `${playerGold} 💰`;
    document.getElementById('goldIncomeDisplay').innerText = `+${playerIncome}/sec`;

    // Attaque
    document.getElementById('lvlAttack').innerText = combatStats.attackLvl;
    document.getElementById('costAttack').innerText = `${costs.attack} 💰`;
    const btnAttack = document.getElementById('btnTechAttack');
    playerGold >= costs.attack ? btnAttack.classList.remove('disabled-tech') : btnAttack.classList.add('disabled-tech');

    // Défense
    document.getElementById('lvlDefense').innerText = combatStats.defenseLvl;
    document.getElementById('costDefense').innerText = `${costs.defense} 💰`;
    const btnDefense = document.getElementById('btnTechDefense');
    playerGold >= costs.defense ? btnDefense.classList.remove('disabled-tech') : btnDefense.classList.add('disabled-tech');
}

// Écouteurs d'évènements pour les boutons
document.getElementById('btnTechAttack').addEventListener('click', () => buyTech('attack'));
document.getElementById('btnTechDefense').addEventListener('click', () => buyTech('defense'));