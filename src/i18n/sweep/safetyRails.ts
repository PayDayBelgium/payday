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
    itmCallAlert:
      'Short call is ITM: price ${{price}} > strike ${{strike}}\nAssignment risk — intrinsic value: ${{intrinsic}}',
    cspCashWarnTitle: 'Not enough free cash',
    cspCashWarnMessage:
      'Selling this put reserves {{required}} as cash collateral, but this portfolio only has {{freeCash}} free ({{shortfall}} short). A cash-secured put should be fully covered by cash — if the put is assigned you must buy the shares. Create it anyway?',
    cspCashWarnConfirm: 'Create anyway',
    campaignUnlockHint: 'This strategy unlocks at the {{slope}} ({{level}} level).',
    campaignOpportunityLocked:
      'More options for this campaign unlock at the {{slope}} ({{level}} level). Your positions stay fully visible.',
    tradeIdeaLocked: 'Unlock this strategy at the {{slope}} ({{level}} level) to place this trade.',
    featureLockedToast: 'This action is locked — unlock it at the {{slope}} ({{level}} level).',
    errorBoundaryTitle: 'Something went wrong',
    errorBoundaryMessage:
      'An unexpected error occurred while displaying this page. Your data is safe — reloading usually fixes it.',
    errorBoundaryChunkMessage:
      'Part of the app failed to load. This usually happens after an update — reload to get the latest version.',
    errorBoundaryReload: 'Reload',
    expirationInPast: 'This expiration is in the past — pick today or a later date.',
  },
  nl: {
    nakedCallAlert:
      'Naked call op {{ticker}}: niet gedekt door aandelen of een LEAPS — onbeperkt risico.\nStrike ${{strike}} × {{contracts}} contract(en). Overweeg aandelen te kopen of de positie te sluiten.',
    nakedCallWarnTitle: 'Ongedekte (naked) call',
    nakedCallWarnMessage:
      'Deze call is niet gedekt door aandelen of een LEAPS. Een naked short call heeft een onbeperkt verliesrisico als het aandeel stijgt. Toch aanmaken?',
    nakedCallWarnConfirm: 'Toch aanmaken',
    itmCallAlert:
      'Short call is ITM: koers ${{price}} > strike ${{strike}}\nAssignment-risico — intrinsieke waarde: ${{intrinsic}}',
    cspCashWarnTitle: 'Onvoldoende vrije cash',
    cspCashWarnMessage:
      'Deze put verkopen reserveert {{required}} als cash-onderpand, maar deze portefeuille heeft slechts {{freeCash}} vrij ({{shortfall}} tekort). Een cash-secured put hoort volledig door cash gedekt te zijn — bij assignment moet je de aandelen kopen. Toch aanmaken?',
    cspCashWarnConfirm: 'Toch aanmaken',
    campaignUnlockHint: 'Deze strategie ontgrendel je op de {{slope}} (niveau {{level}}).',
    campaignOpportunityLocked:
      'Meer mogelijkheden voor deze campagne ontgrendel je op de {{slope}} (niveau {{level}}). Je posities blijven volledig zichtbaar.',
    tradeIdeaLocked:
      'Ontgrendel deze strategie op de {{slope}} (niveau {{level}}) om deze trade te plaatsen.',
    featureLockedToast:
      'Deze actie is vergrendeld — ontgrendel ze op de {{slope}} (niveau {{level}}).',
    errorBoundaryTitle: 'Er ging iets mis',
    errorBoundaryMessage:
      'Er trad een onverwachte fout op bij het tonen van deze pagina. Je gegevens zijn veilig — herladen lost het meestal op.',
    errorBoundaryChunkMessage:
      'Een deel van de app kon niet geladen worden. Dit gebeurt meestal na een update — herlaad om de nieuwste versie op te halen.',
    errorBoundaryReload: 'Herladen',
    expirationInPast: 'Deze expiratie ligt in het verleden — kies vandaag of een latere datum.',
  },
  fr: {
    nakedCallAlert:
      "Call nu sur {{ticker}} : non couvert par des actions ou un LEAPS — risque illimité.\nStrike {{strike}} $ × {{contracts}} contrat(s). Envisagez d'acheter des actions ou de clôturer la position.",
    nakedCallWarnTitle: 'Call non couvert (naked)',
    nakedCallWarnMessage:
      "Ce call n'est couvert ni par des actions ni par un LEAPS. Un call vendu à découvert présente un risque de perte illimité si l'action monte. Le créer quand même ?",
    nakedCallWarnConfirm: 'Créer quand même',
    itmCallAlert:
      "Call vendu ITM : cours {{price}} $ > strike {{strike}} $\nRisque d'assignation — valeur intrinsèque : {{intrinsic}} $",
    cspCashWarnTitle: 'Liquidités libres insuffisantes',
    cspCashWarnMessage:
      "Vendre ce put réserve {{required}} en garantie de liquidités, mais ce portefeuille ne dispose que de {{freeCash}} libres (il manque {{shortfall}}). Un put cash-secured doit être entièrement couvert par des liquidités — en cas d'assignation vous devez acheter les actions. Le créer quand même ?",
    cspCashWarnConfirm: 'Créer quand même',
    campaignUnlockHint: 'Cette stratégie se débloque sur la {{slope}} (niveau {{level}}).',
    campaignOpportunityLocked:
      'Plus de possibilités pour cette campagne se débloquent sur la {{slope}} (niveau {{level}}). Vos positions restent entièrement visibles.',
    tradeIdeaLocked:
      'Débloquez cette stratégie sur la {{slope}} (niveau {{level}}) pour passer ce trade.',
    featureLockedToast:
      'Cette action est verrouillée — débloquez-la sur la {{slope}} (niveau {{level}}).',
    errorBoundaryTitle: 'Une erreur est survenue',
    errorBoundaryMessage:
      "Une erreur inattendue s'est produite lors de l'affichage de cette page. Vos données sont en sécurité — recharger résout généralement le problème.",
    errorBoundaryChunkMessage:
      "Une partie de l'application n'a pas pu être chargée. Cela arrive généralement après une mise à jour — rechargez pour obtenir la dernière version.",
    errorBoundaryReload: 'Recharger',
    expirationInPast:
      "Cette échéance est dans le passé — choisissez aujourd'hui ou une date ultérieure.",
  },
};
