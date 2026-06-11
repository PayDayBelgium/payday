// Safety-rail strings: risk alerts on existing positions and didactic
// wizard warnings. Alerts are ALWAYS shown (never level-gated).
export const safetyRails = {
  en: {
    nakedCallAlert:
      'Naked call on {{ticker}}: not covered by shares or a LEAPS — unlimited risk.\nStrike ${{strike}} × {{contracts}} contract(s). Consider buying shares or closing the position.',
    nakedCallWarnTitle: 'Uncovered (naked) call',
    nakedCallWarnMessage:
      'This call is not covered by shares or a LEAPS. A naked short call has unlimited loss risk if the stock rises. Create it anyway?',
    nakedCallWarnConfirm: 'Create anyway',
  },
  nl: {
    nakedCallAlert:
      'Naked call op {{ticker}}: niet gedekt door aandelen of een LEAPS — onbeperkt risico.\nStrike ${{strike}} × {{contracts}} contract(en). Overweeg aandelen te kopen of de positie te sluiten.',
    nakedCallWarnTitle: 'Ongedekte (naked) call',
    nakedCallWarnMessage:
      'Deze call is niet gedekt door aandelen of een LEAPS. Een naked short call heeft een onbeperkt verliesrisico als het aandeel stijgt. Toch aanmaken?',
    nakedCallWarnConfirm: 'Toch aanmaken',
  },
  fr: {
    nakedCallAlert:
      "Call nu sur {{ticker}} : non couvert par des actions ou un LEAPS — risque illimité.\nStrike {{strike}} $ × {{contracts}} contrat(s). Envisagez d'acheter des actions ou de clôturer la position.",
    nakedCallWarnTitle: 'Call non couvert (naked)',
    nakedCallWarnMessage:
      "Ce call n'est couvert ni par des actions ni par un LEAPS. Un call vendu à découvert présente un risque de perte illimité si l'action monte. Le créer quand même ?",
    nakedCallWarnConfirm: 'Créer quand même',
  },
};
