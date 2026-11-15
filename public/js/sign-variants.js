// Hidden Easter eggs: a crowd sign changes when someone in the match has a particular name (anywhere
// in it, any case, so "sharmila.parthiban@…" counts). Keyed by the sign they replace; see crowdSigns().
// The online demo build replaces this file with an empty list.

export const SIGN_VARIANTS = {
  blame: { match: 'megha', lines: ['I blame', 'Megha again for', 'not being clear.'] },
  deadButtons: { match: 'paul', lines: ["Let's Watch Paul", 'click dead buttons'] },
  clock: { match: 'betcy', lines: ['Can you hear me?', "I can't hear you", 'Can you hear me?'] },
  weightClass: { match: 'sharmila', lines: ['I order all wrestlers', 'must weigh', '12 to 15 chars only!'] },
};
