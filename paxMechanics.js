/**
 * paxMechanics.js - Règles et Fluctuation des effectifs
 */

let playerGold = 0; 
let playerIncome = 0;
let totalArmyPersonnel = 0; // Nouvel indicateur d'effectif

// Stats modifiées par les technologies
let combatStats = {
    attackMultiplier: 1.0,
    defenseMultiplier: 1.2,
    recruitmentBoost: 0, // Conscription
    maxTroopsBoost: 0, // Logistique
    attackLvl: 0, defenseLvl: 0, conscriptLvl: 0, logisticsLvl: 0
};

let costs = { attack: 50, defense: 50, conscript: 80, logistics: 100 };

// Fluctuation : Économie et Recrutement appelés chaque seconde
function processEconomyAndArmy(gridArray, playerFactionId) {
    let terrCount = 0;
    totalArmyPersonnel = 0;

    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            let tile = gridArray[c][r];
            if (tile.isLand && tile.owner === playerFactionId) {
                terrCount++;
                totalArmyPersonnel += Math.floor(tile.troops);
            }
        }
    }

    // Calcul de l'or
    playerIncome = terrCount * 2;
    playerGold += playerIncome;
    
    // Maj de l'interface Effectifs
    document.getElementById('armyTotalDisplay').innerText = totalArmyPersonnel.toLocaleString() + " soldats";

    updateTechUI();
}

function buyTech(type) {
    if (type === 'attack' && playerGold >= costs.attack) {
        playerGold -= costs.attack; combatStats.attackMultiplier += 0.2; combatStats.attackLvl++;
        costs.attack = Math.floor(costs.attack * 1.5);
    } 
    else if (type === 'defense' && playerGold >= costs.defense) {
        playerGold -= costs.defense; combatStats.defenseMultiplier += 0.25; combatStats.defenseLvl++;
        costs.defense = Math.floor(costs.defense * 1.5);
    }
    else if (type === 'conscript' && playerGold >= costs.conscript) {
        playerGold -= costs.conscript; combatStats.recruitmentBoost += 1; combatStats.conscriptLvl++;
        costs.conscript = Math.floor(costs.conscript * 1.8); // Coûte plus cher vite
    }
    else if (type === 'logistics' && playerGold >= costs.logistics) {
        playerGold -= costs.logistics; combatStats.maxTroopsBoost += 50; combatStats.logisticsLvl++;
        costs.logistics = Math.floor(costs.logistics * 1.6);
    }
    updateTechUI();
}

function resetMechanics() {
    playerGold = 50; totalArmyPersonnel = 0;
    combatStats = { attackMultiplier: 1.0, defenseMultiplier: 1.2, recruitmentBoost: 0, maxTroopsBoost: 0, attackLvl: 0, defenseLvl: 0, conscriptLvl: 0, logisticsLvl: 0 };
    costs = { attack: 50, defense: 50, conscript: 80, logistics: 100 };
    updateTechUI();
}

function updateTechUI() {
    document.getElementById('goldDisplay').innerText = `${Math.floor(playerGold)} 💰`;
    document.getElementById('goldIncomeDisplay').innerText = `+${playerIncome}/sec`;

    const techMap = [
        { id: 'Attack', lvl: combatStats.attackLvl, cost: costs.attack },
        { id: 'Defense', lvl: combatStats.defenseLvl, cost: costs.defense },
        { id: 'Conscript', lvl: combatStats.conscriptLvl, cost: costs.conscript },
        { id: 'Logistics', lvl: combatStats.logisticsLvl, cost: costs.logistics }
    ];

    techMap.forEach(tech => {
        document.getElementById(`lvl${tech.id}`).innerText = tech.lvl;
        document.getElementById(`cost${tech.id}`).innerText = `${tech.cost} 💰`;
        const btn = document.getElementById(`btnTech${tech.id}`);
        playerGold >= tech.cost ? btn.classList.remove('disabled-tech') : btn.classList.add('disabled-tech');
    });
}

// Écouteurs Techs
document.getElementById('btnTechAttack').addEventListener('click', () => buyTech('attack'));
document.getElementById('btnTechDefense').addEventListener('click', () => buyTech('defense'));
document.getElementById('btnTechConscript').addEventListener('click', () => buyTech('conscript'));
document.getElementById('btnTechLogistics').addEventListener('click', () => buyTech('logistics'));