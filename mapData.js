/**
 * mapData.js - Topographie Monde (70x30)
 * ES6+ Constantes
 */
const COLS = 70;
const ROWS = 30;

// X = Terre, . = Océan
const earthMapASCII = [
    "......................................................................",
    ".......XXXXXXXXXXX.....................XXXXXXXXXXXXXXXXXXXX...........",
    "......XXXXXXXXXXXXX...................XXXXXXXXXXXXXXXXXXXXXXX.........",
    ".....XXXXXXXXXXXXXXX.................XXXXXXXXXXXXXXXXXXXXXXXXX........",
    "....XXXXXXXXXXXXXXXX.................XXXXXXXXXXXXXXXXXXXXXXXXXXX......",
    "....XXXXXXXXXXXXXXXXX................XXXXXXXXXXXXXXXXXXXXXXXXXXX......",
    "....XXXXXXXXXXXXXXXX.................XXXXXXXXXXXXXXXXXXXXXXXXXXXX.....",
    "....XXXXXXXXXXXXXXXXX..............XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.....",
    ".....XXXXXXXXXXXXXXXXX............XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX....",
    "......XXXXXXXXXXXXXXXX...........XX..XXXXXXXXXXXXXXXXXXXXXXXXXXXXX....",
    ".......XXXXXXXXXXXXXXX..........XXXX..XXXXXXXXXXXXXXXXXXXXXXXXXXXX....",
    "........XXXXXXXXXXXXX...........XXXXX...XXXXXXXXXXXXXXXXXXXXXXXXXX....",
    ".........XXXXXXXXXX..............XXXX...XXXXXXXXXXXXXXXXXXXXXXXXX.....",
    "..........XXXXXXXXX...............XXX....XXXXXXXXXXXXXXXXXXXXXXX......",
    "...........XXXXXXX................XXX.......XXXXXXXXXXXXXXXXXXX.......",
    "............XXXXX.................XXXX........XXXXXXXXXXXXXXXX........",
    ".............XXXX.................XXXXX........XXXXXXXXXXXXX..........",
    "..............XXXX................XXXXX.........XXXXXXXXXX............",
    "..............XXXXX...............XXXXXX..........XXXXXX..............",
    "...............XXXXX..............XXXXXX...........XXXX.......XXX.....",
    "...............XXXXX...............XXXXX....................XXXXXX....",
    "................XXXX................XXXX....................XXXXXX....",
    "................XXX..................XX......................XXXXX....",
    ".................XX...........................................XXX.....",
    "......................................................................",
    "......................................................................",
    "......................................................................",
    "......................................................................",
    "........XXXXXXXXXXXXXXXXXXX.............XXXXXXXXXXXXXXXXXXXXXXX.......",
    "......................................................................"
];

const FACTIONS = {
    0: { color: '#4a5568', name: 'Régions Neutres' }, // Gris
    1: { color: '#3182ce', name: 'Alliance Européenne' }, // Bleu (Joueur)
    2: { color: '#e53e3e', name: 'Fédération Américaine' }, // Rouge
    3: { color: '#38a169', name: 'Empire Asiatique' }, // Vert
    4: { color: '#d69e2e', name: 'Coalition Africaine' }  // Jaune
};