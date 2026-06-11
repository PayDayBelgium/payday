export const widgetsA = {
  en: {
    widgetsA: {
      // CampaignCard
      collateral: 'Collateral',
      shares: 'shares',
      totalProfit: 'Total Profit',
      purchaseCost: 'Purchase cost',
      premiumsReceived: 'Premiums received',
      deleteWheel: 'Delete Wheel',
      colTicker: 'Ticker',
      colExpiration: 'Expiration',
      colStrike: 'Strike',
      colStockPrice: 'Stock price',
      colDifference: 'Difference',
      colOpen: 'Open',
      colCurrent: 'Current',
      colProfitLoss: 'Profit/Loss',
      colAdjusted: 'Adjusted',
      colCollateral: 'Collateral',
      colActions: 'Actions',
      basisPosition: 'Basis position',
      active: 'Active',
      activePuts: 'Puts',
      activeOption: 'Option',
      activeCalls: 'Calls',
      coveredCallStockDesc:
        'This call is covered by {{kind}} ({{count}} units). On assignment you deliver the shares, no cash needed.',
      kindShares: 'shares',
      kindEtf: 'ETF',
      coveredCallLeapsDesc:
        'This call is covered by your LEAPS call option. The LEAPS acts as collateral instead of shares.',
      kachingPutDesc: 'This put requires {{amount}} cash as collateral for possible assignment.',
      wheelCspDesc:
        'This Cash Secured Put requires {{amount}} cash as collateral for possible assignment.',
      wheelCallDesc:
        'This covered call is covered by your shares. On assignment you deliver the shares.',
      history: 'History',
      sold: 'Sold',
      boughtBack: 'Bought back',
      profit: 'Profit',
      // CampaignView - empty states
      noCoveredCalls: 'No Covered Calls',
      noCoveredCallsDesc:
        'Write calls on shares you own and receive premium. Your shares serve as collateral.',
      noCoveredCallsRisk:
        'Risk: You miss out on potential profit if the stock rises sharply above your strike.',
      buyShares: 'Buy Shares',
      noPmcc: "No Poor Man's Covered Calls",
      noPmccDesc:
        'Buy a LEAPS call and write short-term calls. The LEAPS acts as cheaper collateral instead of shares.',
      noPmccRisk:
        'Risk: Your LEAPS can expire worthless. Limited loss = LEAPS cost - premiums received.',
      buyLeaps: 'Buy LEAPS',
      noKaching: 'No KaChing Campaigns',
      noKachingDesc:
        'Buy a protective put and write weekly puts with higher strikes. Your long put protects against large drops.',
      noKachingRisk:
        'Risk: The spread between your protective put and written put × 100. Limited but defined loss.',
      buyProtectivePut: 'Buy Protective Put',
      noWheel: 'No wheel campaigns',
      noWheelDesc:
        'Sell Cash Secured Puts until assignment, then write covered calls until sale, and repeat. Continuously receive premium.',
      noWheelRisk:
        'Risk: You buy shares on assignment. On a large drop you are stuck with a losing position.',
      startWheel: 'Start wheel',
      // CampaignView - delete wheel modal
      deleteWheelTitle: 'Delete Wheel',
      deleteWheelConfirm: 'Are you sure you want to delete this Wheel?',
      deleteWheelWarningLabel: 'Note:',
      deleteWheelWarning:
        'Only the Wheel campaign is deleted. Your underlying positions (Cash Secured Puts, shares, covered calls) are preserved.',
      cancel: 'Cancel',
      delete: 'Delete',
      // CampaignFilterTabs
      newWheel: 'New wheel',
      // StockRow
      writeCoveredCallsOpportunity: 'Opportunity: Sell {{count}} covered call(s) for extra income',
      opportunity: 'Opportunity',
      stockBadge: 'STOCK',
      // StockETFCard
      priceAlertsTitle: 'Price alerts - The price has changed significantly',
      ruleAlertsTitle: 'Alerts - Rules that require attention',
      ruleOpportunitiesTitle: 'Opportunities - Possibilities to trade',
      coveredCallPossibleTitle: 'Covered Calls possible - Enough shares to write covered calls',
      close: 'Close',
      deleteAlertTitle: 'Delete Alert',
      deleteAlertMessage:
        'Are you sure you want to dismiss this alert?\n\n"{{message}}"\n\nIt will not come back.',
      // SpreadSummaryRow
      today: 'Today',
      expired: 'Expired',
      width: 'Width: ${{value}}',
      rollSpread: 'Roll Spread',
      closeSpread: 'Close Spread',
      // PositionActionButtons
      rollOption: 'Roll Option',
      closePosition: 'Close position',
      assignment: 'Assignment',
      edit: 'Edit',
      viewCampaign: 'View Campaign',
    },
  },
  nl: {
    widgetsA: {
      // CampaignCard
      collateral: 'Onderpand',
      shares: 'aandelen',
      totalProfit: 'Totale Winst',
      purchaseCost: 'Aankoopkost',
      premiumsReceived: 'Ontvangen premies',
      deleteWheel: 'Verwijder Wheel',
      colTicker: 'Ticker',
      colExpiration: 'Expiratie',
      colStrike: 'Strike',
      colStockPrice: 'Stock prijs',
      colDifference: 'Verschil',
      colOpen: 'Open',
      colCurrent: 'Huidige',
      colProfitLoss: 'Winst/Verlies',
      colAdjusted: 'Aangepast',
      colCollateral: 'Onderpand',
      colActions: 'Actions',
      basisPosition: 'Basis positie',
      active: 'Actieve',
      activePuts: 'Puts',
      activeOption: 'Optie',
      activeCalls: 'Calls',
      coveredCallStockDesc:
        'Deze call is gedekt door {{kind}} ({{count}} stuks). Bij assignment lever je de aandelen, geen cash nodig.',
      kindShares: 'aandelen',
      kindEtf: 'ETF',
      coveredCallLeapsDesc:
        'Deze call is gedekt door je LEAPS call optie. De LEAPS fungeert als onderpand in plaats van aandelen.',
      kachingPutDesc: 'Deze put vereist {{amount}} cash als onderpand voor mogelijke assignment.',
      wheelCspDesc:
        'Deze Cash Secured Put vereist {{amount}} cash als onderpand voor mogelijke assignment.',
      wheelCallDesc:
        'Deze covered call is gedekt door je aandelen. Bij assignment lever je de aandelen.',
      history: 'Geschiedenis',
      sold: 'Verkocht',
      boughtBack: 'Teruggekocht',
      profit: 'Winst',
      // CampaignView - empty states
      noCoveredCalls: 'Geen Covered Calls',
      noCoveredCallsDesc:
        'Schrijf calls op aandelen die je bezit en ontvang premie. Je aandelen dienen als onderpand.',
      noCoveredCallsRisk:
        'Risico: Je loopt potentiële winst mis als het aandeel sterk stijgt boven je strike.',
      buyShares: 'Koop Aandelen',
      noPmcc: "Geen Poor Man's Covered Calls",
      noPmccDesc:
        'Koop een LEAPS call en schrijf korte termijn calls. De LEAPS fungeert als goedkoper onderpand i.p.v. aandelen.',
      noPmccRisk:
        'Risico: Je LEAPS kan waardeloos aflopen. Beperkt verlies = LEAPS kostprijs - ontvangen premies.',
      buyLeaps: 'Koop LEAPS',
      noKaching: 'Geen KaChing Campagnes',
      noKachingDesc:
        'Koop een protective put en schrijf wekelijks puts met hogere strikes. Je long put beschermt tegen grote dalingen.',
      noKachingRisk:
        'Risico: De spread tussen je protective put en geschreven put × 100. Beperkt maar gedefinieerd verlies.',
      buyProtectivePut: 'Koop Protective Put',
      noWheel: 'Geen wheel campagnes',
      noWheelDesc:
        'Verkoop Cash Secured Puts tot assignment, schrijf dan covered calls tot verkoop, en herhaal. Continu premie ontvangen.',
      noWheelRisk:
        'Risico: Je koopt aandelen bij assignment. Bij grote daling zit je vast met verliesgevende positie.',
      startWheel: 'Start wheel',
      // CampaignView - delete wheel modal
      deleteWheelTitle: 'Wheel Verwijderen',
      deleteWheelConfirm: 'Weet je zeker dat je deze Wheel wilt verwijderen?',
      deleteWheelWarningLabel: 'Let op:',
      deleteWheelWarning:
        'Alleen de Wheel campagne wordt verwijderd. Je onderliggende posities (Cash Secured Puts, aandelen, covered calls) blijven behouden.',
      cancel: 'Annuleren',
      delete: 'Verwijderen',
      // CampaignFilterTabs
      newWheel: 'Nieuw wheel',
      // StockRow
      writeCoveredCallsOpportunity:
        'Opportunity: Verkoop {{count}} covered call(s) voor extra inkomen',
      opportunity: 'Opportunity',
      stockBadge: 'AANDEEL',
      // StockETFCard
      priceAlertsTitle: 'Prijs waarschuwingen - De prijs is significant veranderd',
      ruleAlertsTitle: 'Waarschuwingen - Regels die aandacht vereisen',
      ruleOpportunitiesTitle: 'Kansen - Mogelijkheden om te handelen',
      coveredCallPossibleTitle:
        'Covered Calls mogelijk - Voldoende aandelen om covered calls te schrijven',
      close: 'Sluiten',
      deleteAlertTitle: 'Alert Verwijderen',
      deleteAlertMessage:
        'Weet je zeker dat je deze alert wilt sluiten?\n\n"{{message}}"\n\nDeze komt niet meer terug.',
      // SpreadSummaryRow
      today: 'Vandaag',
      expired: 'Verlopen',
      width: 'Breedte: ${{value}}',
      rollSpread: 'Spread Rollen',
      closeSpread: 'Spread Sluiten',
      // PositionActionButtons
      rollOption: 'Roll Optie',
      closePosition: 'Positie sluiten',
      assignment: 'Assignment',
      edit: 'Bewerken',
      viewCampaign: 'Bekijk Campagne',
    },
  },
  fr: {
    widgetsA: {
      // CampaignCard
      collateral: 'Garantie',
      shares: 'actions',
      totalProfit: 'Profit total',
      purchaseCost: "Coût d'achat",
      premiumsReceived: 'Primes reçues',
      deleteWheel: 'Supprimer la Wheel',
      colTicker: 'Ticker',
      colExpiration: 'Expiration',
      colStrike: 'Strike',
      colStockPrice: "Prix de l'action",
      colDifference: 'Différence',
      colOpen: 'Ouverture',
      colCurrent: 'Actuel',
      colProfitLoss: 'Profit/Perte',
      colAdjusted: 'Ajusté',
      colCollateral: 'Garantie',
      colActions: 'Actions',
      basisPosition: 'Position de base',
      active: 'Actifs',
      activePuts: 'Puts',
      activeOption: 'Option',
      activeCalls: 'Calls',
      coveredCallStockDesc:
        "Ce call est couvert par {{kind}} ({{count}} unités). À l'assignation vous livrez les actions, pas de cash nécessaire.",
      kindShares: 'actions',
      kindEtf: 'ETF',
      coveredCallLeapsDesc:
        'Ce call est couvert par votre option call LEAPS. Le LEAPS sert de garantie au lieu des actions.',
      kachingPutDesc:
        'Ce put nécessite {{amount}} en cash comme garantie pour une assignation possible.',
      wheelCspDesc:
        'Ce Cash Secured Put nécessite {{amount}} en cash comme garantie pour une assignation possible.',
      wheelCallDesc:
        "Ce covered call est couvert par vos actions. À l'assignation vous livrez les actions.",
      history: 'Historique',
      sold: 'Vendu',
      boughtBack: 'Racheté',
      profit: 'Profit',
      // CampaignView - empty states
      noCoveredCalls: 'Aucun Covered Call',
      noCoveredCallsDesc:
        'Écrivez des calls sur les actions que vous possédez et recevez une prime. Vos actions servent de garantie.',
      noCoveredCallsRisk:
        "Risque : Vous manquez un profit potentiel si l'action monte fortement au-dessus de votre strike.",
      buyShares: 'Acheter des actions',
      noPmcc: "Aucun Poor Man's Covered Call",
      noPmccDesc:
        'Achetez un call LEAPS et écrivez des calls à court terme. Le LEAPS sert de garantie moins chère que les actions.',
      noPmccRisk:
        'Risque : Votre LEAPS peut expirer sans valeur. Perte limitée = coût du LEAPS - primes reçues.',
      buyLeaps: 'Acheter un LEAPS',
      noKaching: 'Aucune campagne KaChing',
      noKachingDesc:
        'Achetez un put protecteur et écrivez des puts hebdomadaires avec des strikes plus élevés. Votre put long protège contre les fortes baisses.',
      noKachingRisk:
        'Risque : Le spread entre votre put protecteur et le put écrit × 100. Perte limitée mais définie.',
      buyProtectivePut: 'Acheter un put protecteur',
      noWheel: 'Aucune campagne wheel',
      noWheelDesc:
        "Vendez des Cash Secured Puts jusqu'à l'assignation, écrivez ensuite des covered calls jusqu'à la vente, et répétez. Recevez continuellement des primes.",
      noWheelRisk:
        "Risque : Vous achetez des actions à l'assignation. En cas de forte baisse vous restez coincé avec une position perdante.",
      startWheel: 'Démarrer la wheel',
      // CampaignView - delete wheel modal
      deleteWheelTitle: 'Supprimer la Wheel',
      deleteWheelConfirm: 'Êtes-vous sûr de vouloir supprimer cette Wheel ?',
      deleteWheelWarningLabel: 'Attention :',
      deleteWheelWarning:
        'Seule la campagne Wheel est supprimée. Vos positions sous-jacentes (Cash Secured Puts, actions, covered calls) sont conservées.',
      cancel: 'Annuler',
      delete: 'Supprimer',
      // CampaignFilterTabs
      newWheel: 'Nouvelle wheel',
      // StockRow
      writeCoveredCallsOpportunity:
        'Opportunité : Vendez {{count}} covered call(s) pour un revenu supplémentaire',
      opportunity: 'Opportunité',
      stockBadge: 'ACTION',
      // StockETFCard
      priceAlertsTitle: 'Alertes de prix - Le prix a changé de manière significative',
      ruleAlertsTitle: "Alertes - Règles nécessitant de l'attention",
      ruleOpportunitiesTitle: 'Opportunités - Possibilités de trader',
      coveredCallPossibleTitle:
        "Covered Calls possibles - Assez d'actions pour écrire des covered calls",
      close: 'Fermer',
      deleteAlertTitle: "Supprimer l'alerte",
      deleteAlertMessage:
        'Êtes-vous sûr de vouloir fermer cette alerte ?\n\n"{{message}}"\n\nElle ne reviendra pas.',
      // SpreadSummaryRow
      today: "Aujourd'hui",
      expired: 'Expiré',
      width: 'Largeur : ${{value}}',
      rollSpread: 'Rouler le spread',
      closeSpread: 'Fermer le spread',
      // PositionActionButtons
      rollOption: "Rouler l'option",
      closePosition: 'Fermer la position',
      assignment: 'Assignation',
      edit: 'Modifier',
      viewCampaign: 'Voir la campagne',
    },
  },
};
