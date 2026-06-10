export const toolsPages = {
  en: {
    // Shared
    searchTicker: 'Search ticker...',
    add: 'Add',
    cancel: 'Cancel',
    company: 'Company name',
    optionsAvailable: 'Options available',
    stock: 'Stock',
    etf: 'ETF',

    // CapitalGainsTaxCalculator
    cgt: {
      pageTitle: 'Capital gains tax simulator',
      pageSubtitle: 'Belgian tax on stock capital gains (2026+)',
      hideExplanation: 'Hide explanation',
      showExplanation: 'Show explanation',
      notApplicable: 'Not applicable',
      notApplicableBody:
        'This calculator is specific to Belgian taxpayers. Your current nationality is set to {{nationality}}. These rules may not apply to you.',
      whatIsTax: 'What is the capital gains tax?',
      whatIsTaxBody:
        'From 1 January 2026, Belgium levies a tax of <strong>10%</strong> on realized capital gains on shares. This means that when you sell shares at a profit, you must pay tax on it.',
      rateLabel: 'Rate:',
      rateValue: ' 10% on the realized capital gain',
      exemptionLabel: 'Exemption:',
      exemptionValue: ' The first €10,000 of capital gain per year is exempt',
      maxBenefitLabel: 'Maximum benefit:',
      maxBenefitValue: ' Up to €1,000 in tax savings from the exemption',
      realizedGainLabel: 'Realized capital gain:',
      realizedGainValue: ' Only profit on sale counts, not unsold positions',
      calcTitle: 'Calculate your tax',
      inputLabel: 'Total realized capital gain (€)',
      inputPlaceholder: 'For example: 25000',
      inputHelp:
        'The total profit you realized by selling shares in a calendar year',
      realizedGain: 'Realized capital gain',
      exemption: 'Exemption',
      taxableAmount: 'Taxable amount',
      taxDue: 'Tax due (10%)',
      effectiveRate: 'Effective rate',
      netGain: 'Net capital gain after tax',
      examples: 'Examples',
      scenario1Title: 'Scenario 1: €5,000 capital gain',
      scenario1Body: 'Tax: <strong>€0</strong> (below the €10,000 exemption)',
      scenario2Title: 'Scenario 2: €15,000 capital gain',
      scenario2Body:
        'Taxable amount: €5,000 (€15,000 - €10,000)<br />Tax: <strong>€500</strong> (10% of €5,000)<br />Net capital gain: €14,500',
      scenario3Title: 'Scenario 3: €50,000 capital gain',
      scenario3Body:
        'Taxable amount: €40,000 (€50,000 - €10,000)<br />Tax: <strong>€4,000</strong> (10% of €40,000)<br />Net capital gain: €46,000<br />Effective rate: 8%',
      importantNotes: 'Important notes',
      note1:
        '• This tax only applies to <strong>realized</strong> capital gains (sold positions)',
      note2: '• Unrealized gains (shares you still hold) are not taxed',
      note3: '• The €10,000 exemption applies per calendar year',
      note4:
        '• This calculator is informational - consult a tax advisor for personal advice',
      note5: '• Losses may be offset - check the current legislation',
    },

    // CoveredCallSimulator
    cc: {
      pageTitle: 'Covered Call Simulator',
      pageSubtitle: 'Calculate your potential return on covered calls',
      tooltipTotalPremium:
        'Total premium = Premium per contract × Number of contracts × 100\n\nThis is the amount you receive directly when selling the covered calls.',
      tooltipPremiumReturn:
        'Premium Return = (Total Premium / Total Invested) × 100%\n\nThis is the return you achieve purely from the premium, regardless of what happens to the price.',
      tooltipAnnualizedPremiumReturn:
        'Annualized Return = Premium Return × (365 / Days to Expiration)\n\nThis shows what you would earn if you repeated this return for the whole year. Note: this is theoretical.',
      tooltipDistanceToStrike:
        'Difference Strike - Current Price\n\nThis is how much the stock must rise before your shares are called away (assigned).',
      tooltipBreakEven:
        'Break-even = Current Price - Premium per Share\n\nUp to this point you are protected by the premium received. Below this point you start making a loss.',
      tooltipReturnIfCalled:
        'Return If Called = (Total Profit / Cost Basis) × 100%\n\nTotal profit = Premium + (Strike - Cost Basis) × Shares\n\nThis is your total return if the option is exercised and you sell your shares.',
      tooltipNewCostBasis:
        'New Cost Basis = Original Cost Basis - Premium per Share\n\nThe premium received effectively lowers your purchase price.',
      tooltipContracts:
        'Number of Contracts = Number of Shares / 100\n\nEach option contract represents 100 shares.',
      whatIsCoveredCall:
        '<strong>What is a Covered Call?</strong> You sell a call option on shares you own. You receive premium as income, but if the price rises above the strike, your shares may be called away.',
      inputParameters: 'Input Parameters',
      stock: 'Stock',
      tickerPlaceholder: 'Ticker symbol (e.g. AAPL)',
      currentStockPrice: 'Current Stock Price ($)',
      numberOfShares: 'Number of Shares',
      contractsCount: '{{count}} contract(s)',
      minSharesHint: 'At least 100 shares for 1 contract',
      costBasisPerShare: 'Cost Basis per Share ($)',
      costBasisTooltip:
        'The price you paid for the shares. Empty = current price.',
      optional: 'Optional',
      strikePrice: 'Strike Price ($)',
      aboveCurrent: '{{percent}}% above current price (OTM)',
      belowCurrent: '{{percent}}% below current price (ITM)',
      premiumPerContract: 'Premium per Contract ($)',
      expirationDate: 'Expiration Date',
      premiumIncome: 'Premium Income',
      return: 'Return',
      annualized: '{{percent}}% annualized',
      premiumDetails: 'Premium Details',
      totalPremium: 'Total Premium',
      premiumPerShare: 'Premium per Share',
      numberOfContracts: 'Number of Contracts',
      daysToExpiration: 'Days to Expiration',
      daysValue: '{{count}} days',
      strikeAnalysis: 'Strike Analysis',
      priceMustRise: 'Price must rise',
      breakEvenDown: 'Break-even (downward)',
      protectionByPremium: 'Protection from premium',
      ifCalledAway: 'If Shares Are Called Away',
      stockGain: 'Stock Gain',
      totalProfitPlusPremium: 'Total Profit (+ Premium)',
      returnIfCalled: 'Return If Called',
      annualizedReturn: 'Annualized Return',
      costBasisImpact: 'Cost Basis Impact',
      newEffectiveCostBasis: 'New Effective Cost Basis',
      costBasisReduction: 'Cost Basis Reduction',
      perShare: 'per share',
      fillAllFields: 'Fill in all fields to calculate the results',
    },

    // PMCCCalculator
    pmcc: {
      addNewTicker: 'Add new ticker',
      tickerSymbolRequired: 'Ticker Symbol *',
      type: 'Type',
      companyNameRequired: 'Company name *',
      addTicker: 'Add Ticker',
      tooltipInitialInvestment:
        'Initial Investment = LEAP Premium × 100\n\nThis is the amount you pay for the LEAP call option. It is your maximum risk in this strategy.',
      tooltipLeapBreakEven:
        'Break-Even = LEAP Strike + LEAP Premium\n\nThe price the stock must reach so that your LEAP call is break-even at expiration.',
      tooltipPeriods:
        'Number of periods you can sell covered calls before the LEAP expires.\n\nPeriods = Days to LEAP expiration / Days per period',
      tooltipExtrinsicValue:
        'Extrinsic Value = LEAP Premium - Intrinsic Value\n\nIntrinsic Value = max(0, Price - Strike)\n\nThis is the time-value portion you pay that slowly decays.',
      tooltipResidualValue:
        'Residual Value = max(0, Price - Strike) × 100\n\nThe intrinsic value of your LEAP at expiration if the price stays the same.',
      tooltipPremiumCollected:
        'Premium Collected = Premium per Call × 100 × Number of Periods\n\nThe total premium you receive by selling covered calls.',
      tooltipNetPnL:
        'Net Profit/Loss = Residual Value + Premium Collected - Initial Investment\n\nYour total return on the PMCC strategy.',
      tooltipRoi:
        'ROI = (Net Profit/Loss / Initial Investment) × 100%\n\nThe percentage return on your investment.',
      tooltipAnnualizedRoi:
        'Annualized ROI = ROI × (365 / Days)\n\nThe return normalized to a full year. This gives a better comparison between strategies with different durations.',
    },

    // OptionCheck
    oc: {
      pageTitle: 'Option Check',
      pageSubtitle: 'Is this ticker suitable for options?',
      disclaimer:
        'The option figures below are <strong>simulated</strong> (the app has no live option feed) and are for illustration only.',
      ticker: 'Ticker',
      symbolPlaceholder: 'Symbol (e.g. AAPL)',
      namePlaceholder: 'Name (e.g. Apple Inc.)',
      tickerSelectorPlaceholder: 'Search or add a ticker…',
      statusGood: 'Good',
      statusOk: 'Fair',
      statusBad: 'Weak',
      verdictExcellent: 'Excellent candidate',
      verdictSuitable: 'Suitable candidate',
      verdictMediocre: 'Mediocre candidate',
      verdictUnsuitable: 'Unsuitable',
      suitabilityScore: 'Suitability score',
      verdict: 'Verdict',
      optionFigures: 'Option figures',
      simulated: 'Simulated',
      ivRank: 'IV rank',
      openInterest: 'Open interest',
      volumePerDay: 'Volume/day',
      bidAskSpread: 'Bid-ask spread',
      premiumAnnualized: 'Premium (ann.)',
      earningsIn: 'Earnings in',
      chooseTicker: 'Choose or add a ticker to start the check.',
    },

    // PnLSimulator
    pnl: {
      underlying: 'Underlying',
      price: 'Price ($)',
      range: 'Range: ±{{percent}}%',
      addOption: 'Add Option',
      longBuy: 'Long (Buy)',
      shortSell: 'Short (Sell)',
      expirationOptional: 'Expiration (optional)',
      addLeg: 'Add',
      activePositions: 'Active Positions ({{count}})',
      showIndividualLegPnL: 'Show individual leg P&L',
      maxProfit: 'Max Profit',
      maxLoss: 'Max Loss',
      unlimited: '∞ Unlimited',
      netPremium: 'Net Premium',
      breakEven: 'Break-even',
      pnlAtExpiration: 'P&L at Expiration',
      noPositions: 'No positions',
      addOptionsToSeeChart: 'Add options to see the P&L chart',
      popularStrategies: 'Popular Strategies',
      tooltipPrice: 'Price: ${{price}}',
      chartProfit: 'Profit',
      chartLoss: 'Loss',
    },
  },

  nl: {
    // Shared
    searchTicker: 'Zoek ticker...',
    add: 'Toevoegen',
    cancel: 'Annuleren',
    company: 'Bedrijfsnaam',
    optionsAvailable: 'Opties beschikbaar',
    stock: 'Aandeel',
    etf: 'ETF',

    // CapitalGainsTaxCalculator
    cgt: {
      pageTitle: 'Meerwaardebelasting simulator',
      pageSubtitle: 'Belgische belasting op meerwaarden aandelen (2026+)',
      hideExplanation: 'Verberg uitleg',
      showExplanation: 'Toon uitleg',
      notApplicable: 'Niet van toepassing',
      notApplicableBody:
        'Deze calculator is specifiek voor Belgische belastingplichtigen. Je huidige nationaliteit is ingesteld op {{nationality}}. Deze regels zijn mogelijk niet van toepassing op jou.',
      whatIsTax: 'Wat is de meerwaardebelasting?',
      whatIsTaxBody:
        'Vanaf 1 januari 2026 wordt in België een belasting van <strong>10%</strong> geheven op gerealiseerde meerwaarden op aandelen. Dit betekent dat wanneer je aandelen verkoopt met winst, je hierover belasting moet betalen.',
      rateLabel: 'Tarief:',
      rateValue: ' 10% op de gerealiseerde meerwaarde',
      exemptionLabel: 'Vrijstelling:',
      exemptionValue: ' De eerste €10.000 meerwaarde per jaar is vrijgesteld',
      maxBenefitLabel: 'Maximum voordeel:',
      maxBenefitValue: ' Tot €1.000 belastingbesparing door de vrijstelling',
      realizedGainLabel: 'Gerealiseerde meerwaarde:',
      realizedGainValue:
        ' Alleen winst bij verkoop telt, niet onverkochte posities',
      calcTitle: 'Bereken je belasting',
      inputLabel: 'Totale gerealiseerde meerwaarde (€)',
      inputPlaceholder: 'Bijvoorbeeld: 25000',
      inputHelp:
        'De totale winst die je hebt gerealiseerd door aandelen te verkopen in een kalenderjaar',
      realizedGain: 'Gerealiseerde meerwaarde',
      exemption: 'Vrijstelling',
      taxableAmount: 'Belastbaar bedrag',
      taxDue: 'Verschuldigde belasting (10%)',
      effectiveRate: 'Effectief tarief',
      netGain: 'Netto meerwaarde na belasting',
      examples: 'Voorbeelden',
      scenario1Title: 'Scenario 1: €5.000 meerwaarde',
      scenario1Body:
        'Belasting: <strong>€0</strong> (onder de vrijstelling van €10.000)',
      scenario2Title: 'Scenario 2: €15.000 meerwaarde',
      scenario2Body:
        'Belastbaar bedrag: €5.000 (€15.000 - €10.000)<br />Belasting: <strong>€500</strong> (10% van €5.000)<br />Netto meerwaarde: €14.500',
      scenario3Title: 'Scenario 3: €50.000 meerwaarde',
      scenario3Body:
        'Belastbaar bedrag: €40.000 (€50.000 - €10.000)<br />Belasting: <strong>€4.000</strong> (10% van €40.000)<br />Netto meerwaarde: €46.000<br />Effectief tarief: 8%',
      importantNotes: 'Belangrijke opmerkingen',
      note1:
        '• Deze belasting is alleen van toepassing op <strong>gerealiseerde</strong> meerwaarden (verkochte posities)',
      note2:
        '• Niet-gerealiseerde winsten (aandelen die je nog bezit) worden niet belast',
      note3: '• De vrijstelling van €10.000 geldt per kalenderjaar',
      note4:
        '• Deze calculator is informatief - raadpleeg een belastingadviseur voor persoonlijk advies',
      note5:
        '• Verliezen kunnen mogelijk verrekend worden - check de actuele wetgeving',
    },

    // CoveredCallSimulator
    cc: {
      pageTitle: 'Covered Call Simulator',
      pageSubtitle: 'Bereken je potentiële rendement op covered calls',
      tooltipTotalPremium:
        'Totale premium = Premium per contract × Aantal contracten × 100\n\nDit is het bedrag dat je direct ontvangt bij het verkopen van de covered calls.',
      tooltipPremiumReturn:
        'Premium Return = (Totale Premium / Totaal Geïnvesteerd) × 100%\n\nDit is het rendement dat je behaalt puur door de premium, ongeacht wat er met de koers gebeurt.',
      tooltipAnnualizedPremiumReturn:
        'Annualized Return = Premium Return × (365 / Dagen tot Expiratie)\n\nDit toont wat je zou verdienen als je dit rendement het hele jaar zou herhalen. Let op: dit is theoretisch.',
      tooltipDistanceToStrike:
        'Verschil Strike - Huidige Koers\n\nDit is hoeveel het aandeel moet stijgen voordat je aandelen worden weggeroepen (assigned).',
      tooltipBreakEven:
        'Break-even = Huidige Koers - Premium per Aandeel\n\nTot dit punt ben je beschermd door de ontvangen premium. Onder dit punt begin je verlies te maken.',
      tooltipReturnIfCalled:
        'Return If Called = (Totale Winst / Kostprijs) × 100%\n\nTotale winst = Premium + (Strike - Kostprijs) × Aandelen\n\nDit is je totale rendement als de optie wordt uitgeoefend en je aandelen verkoopt.',
      tooltipNewCostBasis:
        'Nieuwe Kostprijs = Originele Kostprijs - Premium per Aandeel\n\nDoor de ontvangen premium daalt effectief je aankoopprijs.',
      tooltipContracts:
        'Aantal Contracten = Aantal Aandelen / 100\n\nElk optiecontract vertegenwoordigt 100 aandelen.',
      whatIsCoveredCall:
        '<strong>Wat is een Covered Call?</strong> Je verkoopt een call optie op aandelen die je bezit. Je ontvangt premium als inkomen, maar als de koers boven de strike komt, worden je aandelen mogelijk weggeroepen.',
      inputParameters: 'Input Parameters',
      stock: 'Aandeel',
      tickerPlaceholder: 'Ticker symbol (bijv. AAPL)',
      currentStockPrice: 'Huidige Aandelenprijs ($)',
      numberOfShares: 'Aantal Aandelen',
      contractsCount: '{{count}} contract(en)',
      minSharesHint: 'Minimaal 100 aandelen voor 1 contract',
      costBasisPerShare: 'Kostprijs per Aandeel ($)',
      costBasisTooltip:
        'De prijs die je betaald hebt voor de aandelen. Leeg = huidige prijs.',
      optional: 'Optioneel',
      strikePrice: 'Strike Prijs ($)',
      aboveCurrent: '{{percent}}% boven huidige prijs (OTM)',
      belowCurrent: '{{percent}}% onder huidige prijs (ITM)',
      premiumPerContract: 'Premium per Contract ($)',
      expirationDate: 'Expiratie Datum',
      premiumIncome: 'Premium Inkomen',
      return: 'Rendement',
      annualized: '{{percent}}% annualized',
      premiumDetails: 'Premium Details',
      totalPremium: 'Totale Premium',
      premiumPerShare: 'Premium per Aandeel',
      numberOfContracts: 'Aantal Contracten',
      daysToExpiration: 'Dagen tot Expiratie',
      daysValue: '{{count}} dagen',
      strikeAnalysis: 'Strike Analyse',
      priceMustRise: 'Koers moet stijgen',
      breakEvenDown: 'Break-even (neerwaarts)',
      protectionByPremium: 'Bescherming door premium',
      ifCalledAway: 'Als Aandelen Worden Weggeroepen',
      stockGain: 'Koerswinst op Aandelen',
      totalProfitPlusPremium: 'Totale Winst (+ Premium)',
      returnIfCalled: 'Return If Called',
      annualizedReturn: 'Annualized Return',
      costBasisImpact: 'Kostprijs Impact',
      newEffectiveCostBasis: 'Nieuwe Effectieve Kostprijs',
      costBasisReduction: 'Kostprijs Verlaging',
      perShare: 'per aandeel',
      fillAllFields: 'Vul alle velden in om de resultaten te berekenen',
    },

    // PMCCCalculator
    pmcc: {
      addNewTicker: 'Nieuwe ticker toevoegen',
      tickerSymbolRequired: 'Ticker Symbool *',
      type: 'Type',
      companyNameRequired: 'Bedrijfsnaam *',
      addTicker: 'Ticker Toevoegen',
      tooltipInitialInvestment:
        'Initiële Investering = LEAP Premium × 100\n\nDit is het bedrag dat je betaalt voor de LEAP call optie. Het is je maximale risico in deze strategie.',
      tooltipLeapBreakEven:
        'Break-Even = LEAP Strike + LEAP Premium\n\nDe koers die het aandeel moet bereiken zodat je LEAP call op expiratie break-even is.',
      tooltipPeriods:
        'Aantal periodes dat je covered calls kunt verkopen voordat de LEAP expireert.\n\nPeriodes = Dagen tot LEAP expiratie / Dagen per periode',
      tooltipExtrinsicValue:
        'Extrinsieke Waarde = LEAP Premium - Intrinsieke Waarde\n\nIntrinsieke Waarde = max(0, Koers - Strike)\n\nDit is het tijdswaarde-gedeelte dat je betaalt en dat langzaam vervalt.',
      tooltipResidualValue:
        'Restwaarde = max(0, Koers - Strike) × 100\n\nDe intrinsieke waarde van je LEAP op expiratie als de koers gelijk blijft.',
      tooltipPremiumCollected:
        'Ontvangen Premium = Premium per Call × 100 × Aantal Periodes\n\nDe totale premium die je ontvangt door het verkopen van covered calls.',
      tooltipNetPnL:
        'Netto Winst/Verlies = Restwaarde + Ontvangen Premium - Initiële Investering\n\nJe totale rendement op de PMCC strategie.',
      tooltipRoi:
        'ROI = (Netto Winst/Verlies / Initiële Investering) × 100%\n\nHet procentuele rendement op je investering.',
      tooltipAnnualizedRoi:
        'Annualized ROI = ROI × (365 / Dagen)\n\nHet rendement genormaliseerd naar een volledig jaar. Dit geeft een betere vergelijking tussen strategieën met verschillende looptijden.',
    },

    // OptionCheck
    oc: {
      pageTitle: 'Optie-Check',
      pageSubtitle: 'Is deze ticker geschikt voor opties?',
      disclaimer:
        'De optie-cijfers hieronder zijn <strong>gesimuleerd</strong> (de app heeft geen live optie-feed) en dienen enkel ter illustratie.',
      ticker: 'Ticker',
      symbolPlaceholder: 'Symbool (bv. AAPL)',
      namePlaceholder: 'Naam (bv. Apple Inc.)',
      tickerSelectorPlaceholder: 'Zoek of voeg een ticker toe…',
      statusGood: 'Goed',
      statusOk: 'Matig',
      statusBad: 'Zwak',
      verdictExcellent: 'Uitstekende kandidaat',
      verdictSuitable: 'Geschikte kandidaat',
      verdictMediocre: 'Matige kandidaat',
      verdictUnsuitable: 'Ongeschikt',
      suitabilityScore: 'Geschiktheidsscore',
      verdict: 'Verdict',
      optionFigures: 'Optie-cijfers',
      simulated: 'Gesimuleerd',
      ivRank: 'IV-rank',
      openInterest: 'Open interest',
      volumePerDay: 'Volume/dag',
      bidAskSpread: 'Bid-ask spread',
      premiumAnnualized: 'Premie (gean.)',
      earningsIn: 'Earnings over',
      chooseTicker: 'Kies of voeg een ticker toe om de check te starten.',
    },

    // PnLSimulator
    pnl: {
      underlying: 'Underlying',
      price: 'Prijs ($)',
      range: 'Bereik: ±{{percent}}%',
      addOption: 'Voeg Optie Toe',
      longBuy: 'Long (Kopen)',
      shortSell: 'Short (Verkopen)',
      expirationOptional: 'Expiratie (optioneel)',
      addLeg: 'Voeg Toe',
      activePositions: 'Actieve Posities ({{count}})',
      showIndividualLegPnL: 'Toon individuele leg P&L',
      maxProfit: 'Max Winst',
      maxLoss: 'Max Verlies',
      unlimited: '∞ Onbeperkt',
      netPremium: 'Netto Premium',
      breakEven: 'Break-even',
      pnlAtExpiration: 'P&L bij Expiratie',
      noPositions: 'Geen posities',
      addOptionsToSeeChart: 'Voeg opties toe om de P&L grafiek te zien',
      popularStrategies: 'Populaire Strategieën',
      tooltipPrice: 'Prijs: ${{price}}',
      chartProfit: 'Winst',
      chartLoss: 'Verlies',
    },
  },

  fr: {
    // Shared
    searchTicker: 'Rechercher un ticker...',
    add: 'Ajouter',
    cancel: 'Annuler',
    company: "Nom de l'entreprise",
    optionsAvailable: 'Options disponibles',
    stock: 'Action',
    etf: 'ETF',

    // CapitalGainsTaxCalculator
    cgt: {
      pageTitle: 'Simulateur de taxe sur les plus-values',
      pageSubtitle: 'Taxe belge sur les plus-values boursières (2026+)',
      hideExplanation: "Masquer l'explication",
      showExplanation: "Afficher l'explication",
      notApplicable: 'Non applicable',
      notApplicableBody:
        "Ce calculateur est spécifique aux contribuables belges. Votre nationalité actuelle est définie sur {{nationality}}. Ces règles peuvent ne pas s'appliquer à vous.",
      whatIsTax: 'Quʼest-ce que la taxe sur les plus-values ?',
      whatIsTaxBody:
        'À partir du 1er janvier 2026, la Belgique prélève une taxe de <strong>10 %</strong> sur les plus-values réalisées sur les actions. Cela signifie que lorsque vous vendez des actions avec un bénéfice, vous devez payer une taxe dessus.',
      rateLabel: 'Taux :',
      rateValue: ' 10 % sur la plus-value réalisée',
      exemptionLabel: 'Exonération :',
      exemptionValue:
        ' Les premiers 10 000 € de plus-value par an sont exonérés',
      maxBenefitLabel: 'Avantage maximum :',
      maxBenefitValue:
        " Jusqu'à 1 000 € d'économie d'impôt grâce à l'exonération",
      realizedGainLabel: 'Plus-value réalisée :',
      realizedGainValue:
        ' Seul le bénéfice à la vente compte, pas les positions non vendues',
      calcTitle: 'Calculez votre taxe',
      inputLabel: 'Plus-value totale réalisée (€)',
      inputPlaceholder: 'Par exemple : 25000',
      inputHelp:
        'Le bénéfice total que vous avez réalisé en vendant des actions au cours dʼune année civile',
      realizedGain: 'Plus-value réalisée',
      exemption: 'Exonération',
      taxableAmount: 'Montant imposable',
      taxDue: 'Taxe due (10 %)',
      effectiveRate: 'Taux effectif',
      netGain: 'Plus-value nette après taxe',
      examples: 'Exemples',
      scenario1Title: 'Scénario 1 : 5 000 € de plus-value',
      scenario1Body:
        "Taxe : <strong>0 €</strong> (sous l'exonération de 10 000 €)",
      scenario2Title: 'Scénario 2 : 15 000 € de plus-value',
      scenario2Body:
        'Montant imposable : 5 000 € (15 000 € - 10 000 €)<br />Taxe : <strong>500 €</strong> (10 % de 5 000 €)<br />Plus-value nette : 14 500 €',
      scenario3Title: 'Scénario 3 : 50 000 € de plus-value',
      scenario3Body:
        'Montant imposable : 40 000 € (50 000 € - 10 000 €)<br />Taxe : <strong>4 000 €</strong> (10 % de 40 000 €)<br />Plus-value nette : 46 000 €<br />Taux effectif : 8 %',
      importantNotes: 'Remarques importantes',
      note1:
        '• Cette taxe ne s’applique qu’aux plus-values <strong>réalisées</strong> (positions vendues)',
      note2:
        '• Les plus-values non réalisées (actions que vous détenez encore) ne sont pas taxées',
      note3: "• L'exonération de 10 000 € s'applique par année civile",
      note4:
        '• Ce calculateur est informatif - consultez un conseiller fiscal pour un avis personnel',
      note5:
        '• Les pertes peuvent éventuellement être compensées - vérifiez la législation en vigueur',
    },

    // CoveredCallSimulator
    cc: {
      pageTitle: 'Simulateur de Covered Call',
      pageSubtitle: 'Calculez votre rendement potentiel sur les covered calls',
      tooltipTotalPremium:
        'Prime totale = Prime par contrat × Nombre de contrats × 100\n\nCʼest le montant que vous recevez directement en vendant les covered calls.',
      tooltipPremiumReturn:
        'Rendement de la prime = (Prime totale / Total investi) × 100 %\n\nCʼest le rendement que vous obtenez uniquement grâce à la prime, quel que soit le mouvement du cours.',
      tooltipAnnualizedPremiumReturn:
        "Rendement annualisé = Rendement de la prime × (365 / Jours jusqu'à l'expiration)\n\nCela montre ce que vous gagneriez si vous répétiez ce rendement toute l'année. Note : c'est théorique.",
      tooltipDistanceToStrike:
        'Différence Strike - Cours actuel\n\nCʼest de combien lʼaction doit monter avant que vos actions soient assignées (called away).',
      tooltipBreakEven:
        'Seuil de rentabilité = Cours actuel - Prime par action\n\nJusquʼà ce point, vous êtes protégé par la prime reçue. En dessous, vous commencez à perdre.',
      tooltipReturnIfCalled:
        "Rendement si assigné = (Bénéfice total / Prix de revient) × 100 %\n\nBénéfice total = Prime + (Strike - Prix de revient) × Actions\n\nC'est votre rendement total si l'option est exercée et que vous vendez vos actions.",
      tooltipNewCostBasis:
        "Nouveau prix de revient = Prix de revient initial - Prime par action\n\nLa prime reçue réduit effectivement votre prix d'achat.",
      tooltipContracts:
        "Nombre de contrats = Nombre d'actions / 100\n\nChaque contrat d'option représente 100 actions.",
      whatIsCoveredCall:
        "<strong>Qu'est-ce qu'un Covered Call ?</strong> Vous vendez une option call sur des actions que vous détenez. Vous recevez une prime comme revenu, mais si le cours dépasse le strike, vos actions peuvent être assignées.",
      inputParameters: "Paramètres d'entrée",
      stock: 'Action',
      tickerPlaceholder: 'Symbole du ticker (par ex. AAPL)',
      currentStockPrice: "Cours actuel de l'action ($)",
      numberOfShares: "Nombre d'actions",
      contractsCount: '{{count}} contrat(s)',
      minSharesHint: 'Au moins 100 actions pour 1 contrat',
      costBasisPerShare: 'Prix de revient par action ($)',
      costBasisTooltip:
        'Le prix que vous avez payé pour les actions. Vide = cours actuel.',
      optional: 'Facultatif',
      strikePrice: 'Prix dʼexercice ($)',
      aboveCurrent: '{{percent}} % au-dessus du cours actuel (OTM)',
      belowCurrent: '{{percent}} % en dessous du cours actuel (ITM)',
      premiumPerContract: 'Prime par contrat ($)',
      expirationDate: "Date d'expiration",
      premiumIncome: 'Revenu de prime',
      return: 'Rendement',
      annualized: '{{percent}} % annualisé',
      premiumDetails: 'Détails de la prime',
      totalPremium: 'Prime totale',
      premiumPerShare: 'Prime par action',
      numberOfContracts: 'Nombre de contrats',
      daysToExpiration: "Jours jusqu'à l'expiration",
      daysValue: '{{count}} jours',
      strikeAnalysis: 'Analyse du strike',
      priceMustRise: 'Le cours doit monter',
      breakEvenDown: 'Seuil de rentabilité (à la baisse)',
      protectionByPremium: 'Protection par la prime',
      ifCalledAway: 'Si les actions sont assignées',
      stockGain: 'Gain sur les actions',
      totalProfitPlusPremium: 'Bénéfice total (+ Prime)',
      returnIfCalled: 'Rendement si assigné',
      annualizedReturn: 'Rendement annualisé',
      costBasisImpact: 'Impact sur le prix de revient',
      newEffectiveCostBasis: 'Nouveau prix de revient effectif',
      costBasisReduction: 'Réduction du prix de revient',
      perShare: 'par action',
      fillAllFields: 'Remplissez tous les champs pour calculer les résultats',
    },

    // PMCCCalculator
    pmcc: {
      addNewTicker: 'Ajouter un nouveau ticker',
      tickerSymbolRequired: 'Symbole du ticker *',
      type: 'Type',
      companyNameRequired: "Nom de l'entreprise *",
      addTicker: 'Ajouter le ticker',
      tooltipInitialInvestment:
        "Investissement initial = Prime LEAP × 100\n\nC'est le montant que vous payez pour l'option call LEAP. C'est votre risque maximum dans cette stratégie.",
      tooltipLeapBreakEven:
        "Seuil de rentabilité = Strike LEAP + Prime LEAP\n\nLe cours que l'action doit atteindre pour que votre call LEAP soit à l'équilibre à l'expiration.",
      tooltipPeriods:
        "Nombre de périodes pendant lesquelles vous pouvez vendre des covered calls avant l'expiration du LEAP.\n\nPériodes = Jours jusqu'à l'expiration du LEAP / Jours par période",
      tooltipExtrinsicValue:
        'Valeur extrinsèque = Prime LEAP - Valeur intrinsèque\n\nValeur intrinsèque = max(0, Cours - Strike)\n\nCʼest la partie valeur-temps que vous payez et qui se déprécie lentement.',
      tooltipResidualValue:
        "Valeur résiduelle = max(0, Cours - Strike) × 100\n\nLa valeur intrinsèque de votre LEAP à l'expiration si le cours reste identique.",
      tooltipPremiumCollected:
        'Prime collectée = Prime par Call × 100 × Nombre de périodes\n\nLa prime totale que vous recevez en vendant des covered calls.',
      tooltipNetPnL:
        'Profit/Perte net = Valeur résiduelle + Prime collectée - Investissement initial\n\nVotre rendement total sur la stratégie PMCC.',
      tooltipRoi:
        'ROI = (Profit/Perte net / Investissement initial) × 100 %\n\nLe rendement en pourcentage de votre investissement.',
      tooltipAnnualizedRoi:
        'ROI annualisé = ROI × (365 / Jours)\n\nLe rendement normalisé sur une année complète. Cela permet une meilleure comparaison entre des stratégies de durées différentes.',
    },

    // OptionCheck
    oc: {
      pageTitle: 'Vérification d’option',
      pageSubtitle: 'Ce ticker est-il adapté aux options ?',
      disclaimer:
        "Les chiffres d'option ci-dessous sont <strong>simulés</strong> (l'app n'a pas de flux d'options en direct) et sont fournis à titre d'illustration uniquement.",
      ticker: 'Ticker',
      symbolPlaceholder: 'Symbole (par ex. AAPL)',
      namePlaceholder: 'Nom (par ex. Apple Inc.)',
      tickerSelectorPlaceholder: 'Rechercher ou ajouter un ticker…',
      statusGood: 'Bon',
      statusOk: 'Moyen',
      statusBad: 'Faible',
      verdictExcellent: 'Excellent candidat',
      verdictSuitable: 'Candidat approprié',
      verdictMediocre: 'Candidat médiocre',
      verdictUnsuitable: 'Inapproprié',
      suitabilityScore: "Score d'adéquation",
      verdict: 'Verdict',
      optionFigures: "Chiffres d'option",
      simulated: 'Simulé',
      ivRank: 'Rang IV',
      openInterest: 'Open interest',
      volumePerDay: 'Volume/jour',
      bidAskSpread: 'Spread bid-ask',
      premiumAnnualized: 'Prime (ann.)',
      earningsIn: 'Résultats dans',
      chooseTicker:
        'Choisissez ou ajoutez un ticker pour lancer la vérification.',
    },

    // PnLSimulator
    pnl: {
      underlying: 'Sous-jacent',
      price: 'Prix ($)',
      range: 'Plage : ±{{percent}} %',
      addOption: 'Ajouter une option',
      longBuy: 'Long (Acheter)',
      shortSell: 'Short (Vendre)',
      expirationOptional: 'Expiration (facultatif)',
      addLeg: 'Ajouter',
      activePositions: 'Positions actives ({{count}})',
      showIndividualLegPnL: 'Afficher le P&L de chaque jambe',
      maxProfit: 'Profit max',
      maxLoss: 'Perte max',
      unlimited: '∞ Illimité',
      netPremium: 'Prime nette',
      breakEven: 'Seuil de rentabilité',
      pnlAtExpiration: "P&L à l'expiration",
      noPositions: 'Aucune position',
      addOptionsToSeeChart:
        'Ajoutez des options pour voir le graphique P&L',
      popularStrategies: 'Stratégies populaires',
      tooltipPrice: 'Prix : ${{price}}',
      chartProfit: 'Profit',
      chartLoss: 'Perte',
    },
  },
};
