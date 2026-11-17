// Costume recipes for the free Universal Base Characters rigs. Dimensions are in game units;
// clothes and props are authored in the base model's bind space in wrestler-models.js.
export const WRESTLER_LOOKS = {
  bhima: {
    height: 2.68, width: 1.25, depth: 1.12, skin: '#b78c72', cloth: '#df611d', trim: '#e2b554', sash: '#f2bf50',
    hair: 'long', crown: 'band', gem: '#e9a839', mustache: 'thick', weapon: 'mace',
    description: 'A broad power wrestler in saffron and gold, with a curled mustache and an iron mace.',
  },
  jarasandha: {
    height: 2.62, width: 1.15, depth: 1.08, skin: '#b48970', cloth: '#821c3b', trim: '#e2b554', sash: '#ddad43',
    hair: 'long', crown: 'tall', gem: '#c92840', beard: true, mustache: 'thick', seam: true,
    description: 'Maroon robes, a ruby crown and a full beard. A seam down his torso recalls his joined halves.',
  },
  duryodhana: {
    height: 2.52, width: 1.08, depth: 1.05, skin: '#d5a98b', cloth: '#1e3975', trim: '#e2b554', sash: '#e9e6dd',
    hair: 'long', crown: 'tall', gem: '#318de0', mustache: 'thin', weapon: 'goldMace', cape: '#902746',
    description: 'Royal-blue dhoti, jeweled crown, crimson cape and golden mace: a prince who plays to the crowd.',
  },
  kichaka: {
    height: 2.69, width: 1.19, depth: 1.13, skin: '#bc9173', cloth: '#29512f', trim: '#c9a657', sash: '#c6a25c',
    hair: 'long', crown: 'band', gem: '#d4ac4b', mustache: 'thick', weapon: 'sword',
    description: 'A heavy bruiser in forest green, with a thick mustache, gold headband and a sheathed sword.',
  },
  arjuna: {
    height: 2.42, width: 0.96, depth: 0.98, skin: '#c59777', cloth: '#e5b52b', trim: '#b72f37', sash: '#2462a5',
    hair: 'long', crown: 'mukuta', gem: '#3ca775', mustache: 'thin', weapon: 'bow',
    description: 'Yellow pitambara with red trim, a blue angavastram, pointed crown, Gandiva bow and a quiver of arrows.',
  },
  karna: {
    height: 2.52, width: 1.04, depth: 1.03, skin: '#e2b492', cloth: '#9b282b', trim: '#edc06a', sash: '#e6bc62',
    hair: 'long', crown: 'tall', gem: '#ee8f3f', mustache: 'thin', armor: true, bigEarrings: true, weapon: 'bow',
    description: 'Crimson and gold, fitted kavacha armor with a sun emblem, and the large kundala earrings of the sun god’s son.',
  },
  abhimanyu: {
    height: 2.18, width: 0.86, depth: 0.94, skin: '#d6aa88', cloth: '#278bc5', trim: '#e2b554', sash: '#e6edef',
    hair: 'parted', crown: 'mukuta', gem: '#c52f64', weapon: 'shield', shield: '#13539b',
    description: 'The smallest warrior in sky blue, a white angavastram, a small jeweled mukuta and a round blue shield.',
  },
  ghatotkacha: {
    height: 3.05, width: 1.12, depth: 1.06, skin: '#ac8170', darkSkin: true, cloth: '#422059', trim: '#bca2ee', sash: '#785298',
    hair: 'wild', crown: 'band', gem: '#ac7aff', mustache: 'thick', tusks: true, amulet: true, weapon: 'mace',
    description: 'The tallest warrior: wild hair, tusks, a luminous amulet, purple and lilac garments and a mace.',
  },
  hidimbi: {
    body: 'female', height: 2.43, width: 1, depth: 1, skin: '#bc947d', darkSkin: true,
    cloth: '#087757', top: '#339a55', trim: '#e2b554', sash: '#d4b668',
    hair: 'long', crown: 'tiara', gem: '#a48bdc', braid: true, noseRing: true, bigEarrings: true,
    description: 'A green choli and skirt, long braid, jeweled tiara, nose ring and gold earrings for the shapeshifter.',
  },
  dushasana: {
    height: 2.56, width: 1.10, depth: 1.05, skin: '#c69879', cloth: '#194c3d', trim: '#e2b554', sash: '#dbb34e',
    hair: 'long', crown: 'tall', gem: '#3aa166', mustache: 'thick', beard: true, shortBeard: true, weapon: 'goldMace',
    description: 'Kaurava green and gold, an emerald crown, short beard and a golden mace strapped to his back.',
  },
  shikhandi: {
    height: 2.45, width: 1, depth: 1, skin: '#c69b7b', cloth: '#6843b5', trim: '#e2b554', sash: '#dedee8',
    hair: 'long', crown: 'mukuta', gem: '#559ed4', mustache: 'thin', weapon: 'shield', shield: '#5536a5',
    description: 'Violet garments, a pale sash, pointed crown and purple shield distinguish the composed grappler.',
  },
  satyaki: {
    height: 2.39, width: 0.97, depth: 0.98, skin: '#c69b79', cloth: '#0c757a', trim: '#e2b554', sash: '#e2bd4d',
    hair: 'long', crown: 'band', gem: '#3184a0', mustache: 'thin', feather: true, weapon: 'sword',
    description: 'Teal and gold, a peacock feather in his headband and a sword for the fast-footed Yadava ally.',
  },
};

export const WRESTLER_MODEL_IDS = Object.keys(WRESTLER_LOOKS);
