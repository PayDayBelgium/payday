// Safety-rail strings: risk alerts on existing positions and didactic
// wizard warnings. Alerts are ALWAYS shown (never level-gated).
export const safetyRails = {
  en: {
    nakedCallAlert:
      'Naked call on {{ticker}}: not covered by shares or a LEAPS — unlimited risk.\nStrike ${{strike}} × {{contracts}} contract(s). Consider buying shares or closing the position.',
  },
  nl: {
    nakedCallAlert:
      'Naked call op {{ticker}}: niet gedekt door aandelen of een LEAPS — onbeperkt risico.\nStrike ${{strike}} × {{contracts}} contract(en). Overweeg aandelen te kopen of de positie te sluiten.',
  },
  fr: {
    nakedCallAlert:
      "Call nu sur {{ticker}} : non couvert par des actions ou un LEAPS — risque illimité.\nStrike {{strike}} $ × {{contracts}} contrat(s). Envisagez d'acheter des actions ou de clôturer la position.",
  },
};
