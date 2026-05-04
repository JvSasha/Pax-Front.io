/**
 * mapData.js - Topographie de la Terre
 * '.' = Océan (Infranchissable)
 * 'X' = Terre
 */

const COLS = 40;
const ROWS = 20;

const earthMapASCII = [
    "........................................", // 0 (Arctique)
    "....XXXXXX............XXXXXXXXXXXX......", // 1 (Nord Can/Russie)
    "...XXXXXXXX...........XXXXXXXXXXXXX.....", // 2
    "...XXXXXXXXX.........XXXXXXXXXXXXXX.....", // 3 (USA / Europe / Asie)
    "....XXXXXXXXX........XXXXXXXXXXXXXXX....", // 4
    ".....XXXXXXXX........XXXXXXXXXXXXXXX....", // 5 (Mexique / Afrique Nord / Chine)
    "......XXXXXXX........XXXXXXXXXXXXXXXX...", // 6
    "........XXXXX........XXXXXXXXXXXXXXX....", // 7
    ".........XXX..........XXXXXXXXXXXX......", // 8 (Amérique Centrale / Inde)
    ".........XXXX..........XXXXXXXXX........", // 9 (Amérique du Sud / Afrique)
    "..........XXX..........XXXXXXX..........", // 10
    "..........XXX...........XXXXX...........", // 11
    "...........XX............XXX.......XXX..", // 12 (Brésil / Madagascar / Australie)
    "............X.....................XXXX..", // 13
    "..................................XXXXX.", // 14
    "..................................XXXX..", // 15
    "...................................XX...", // 16
    "........................................", // 17
    "........................................", // 18
    ".......XXXXXXXXXXX.......XXXXXXXXX......"  // 19 (Antarctique)
];

const FACTIONS = {
    0: { color: '#4a5568', name: 'Territoires Sauvages' }, 
    1: { color: '#3182ce', name: 'Ligue Bleue (Joueur)' }, 
    2: { color: '#e53e3e', name: 'Empire Rouge (Amériques)' }, 
    3: { color: '#38a169', name: 'Hégémonie Verte (Asie)' }, 
    4: { color: '#d69e2e', name: 'Dynastie Jaune (Afrique)' }  
};