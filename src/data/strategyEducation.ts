export interface StrategyExample {
  scenario: string;
  setup: string;
  outcome: string;
}

export interface StrategyEducation {
  title: string;
  description: string;
  howItWorks: string[];
  examples: StrategyExample[];
  risks: string[];
  riskManagement: string[];
  whenToUse: string[];
  profitPotential: string;
  maxLoss: string;
}

export const strategyEducation: Record<string, StrategyEducation> = {
  pmcc: {
    title: "Poor Man's Covered Call (PMCC)",
    description: "Een kapitaalefficiënte strategie die long-term LEAP call opties gebruikt als vervanging voor het bezitten van 100 aandelen. Je verkoopt vervolgens short-term covered calls tegen deze LEAP positie.",

    howItWorks: [
      "1. Koop een deep in-the-money (ITM) LEAP call optie met lange expiratie (meestal 1+ jaar)",
      "2. Verkoop short-term out-of-the-money (OTM) call opties tegen deze LEAP positie",
      "3. Verzamel premium van de verkochte calls terwijl je profiteert van de LEAP waardestijging",
      "4. Bij expiratie van de short call: rol de positie of laat expireren",
    ],

    examples: [
      {
        scenario: "Bullish op AAPL",
        setup: "Koop 1 AAPL LEAP call $140 strike, expiratie Jan 2026 voor $35.00 ($3,500). Verkoop maandelijkse $170 call voor $2.00 ($200).",
        outcome: "Als AAPL onder $170 blijft: behoud je $200 premium. Als AAPL stijgt: je LEAP stijgt in waarde. Totale investering: $3,500 vs $17,000 voor 100 aandelen.",
      },
      {
        scenario: "Steady income generatie",
        setup: "LEAP positie in SPY $400 call (365 DTE, delta 0.80). Verkoop wekelijkse $450 calls voor premium.",
        outcome: "Verzamel 4x $50-100 premium per maand = $200-400/maand op $4,000 kapitaal investering.",
      },
    ],

    risks: [
      "LEAP kan in waarde dalen als de onderliggende aandeel daalt",
      "Time decay (theta) werkt tegen je LEAP positie",
      "Als short call ITM gaat, kan je gedwongen worden te sluiten met verlies",
      "Vroege assignment risk op short calls (vooral bij dividenden)",
      "Spreiding tussen LEAP en short call kan verkleinen bij volatiliteitsveranderingen",
    ],

    riskManagement: [
      "Kies LEAP met hoge delta (0.70-0.85) en minimaal 1 jaar expiratie",
      "Verkoop calls minimaal 5-10% OTM om upside te behouden",
      "Monitor de extrinsic value van je LEAP - moet voldoende blijven",
      "Zet stop-loss op 50% van LEAP waarde",
      "Rol of sluit short calls voor 50-80% max profit",
      "Vermijd earnings announcements voor short call expiratie",
    ],

    whenToUse: [
      "Als je bullish bent op een aandeel maar beperkt kapitaal hebt",
      "Voor het genereren van regelmatig inkomen op kapitaalefficiënte manier",
      "In een stabiele tot licht stijgende markt",
      "Als IV (Implied Volatility) redelijk hoog is voor premiums",
    ],

    profitPotential: "Beperkt tot strike van short call + verzamelde premiums. ROI kan 20-40% per jaar zijn op LEAP investering.",
    maxLoss: "Volledige waarde van LEAP als onderliggende naar $0 gaat. In praktijk: meestal beperkt tot 30-50% bij goede risk management.",
  },

  coveredCalls: {
    title: "Covered Calls",
    description: "Een conservatieve income strategie waarbij je call opties verkoopt tegen aandelen die je bezit. Je verzamelt premium in ruil voor het afgeven van upside boven de strike price.",

    howItWorks: [
      "1. Bezit 100 aandelen (of veelvouden) van een aandeel",
      "2. Verkoop 1 call optie per 100 aandelen",
      "3. Verzamel premium van de verkochte call",
      "4. Bij expiratie: behoud premium en aandelen (OTM) of verkoop aandelen aan strike (ITM)",
    ],

    examples: [
      {
        scenario: "Income op stabiele positie",
        setup: "Bezit 100 MSFT aandelen @ $350. Verkoop maandelijkse $370 call voor $5.00 ($500 premium).",
        outcome: "Als MSFT < $370: behoud $500 + aandelen. Als MSFT > $370: verkoop aandelen @ $370 + $500 premium = $2,000 profit + $500.",
      },
      {
        scenario: "Dividend capture + premium",
        setup: "Bezit 500 JNJ aandelen @ $160. Verkoop 5 calls $170 voor $2.50 = $1,250. Ontvang ook $625 dividend.",
        outcome: "Totale income: $1,250 (premium) + $625 (dividend) = $1,875 op $80,000 positie = 2.3% in 1 maand.",
      },
    ],

    risks: [
      "Gemiste upside als aandeel sterk stijgt boven strike",
      "Aandelen kunnen nog steeds in waarde dalen (premium biedt beperkte bescherming)",
      "Assignment risk - gedwongen verkoop van aandelen",
      "Opportunity cost als markt sterk stijgt",
    ],

    riskManagement: [
      "Verkoop calls 5-10% OTM voor upside behoud",
      "Gebruik 30-45 DTE voor optimale theta decay",
      "Sluit calls bij 50-80% max profit en rol naar volgende maand",
      "Vermijd calls verkopen over earnings of ex-dividend date",
      "Diversifieer over meerdere aandelen",
    ],

    whenToUse: [
      "Op aandelen die je long-term wilt houden",
      "In een zijwaartse of licht stijgende markt",
      "Voor het genereren van extra inkomen op bestaande posities",
      "Als je OK bent met verkoop aan strike price",
    ],

    profitPotential: "Beperkt tot strike price + premium. Typisch 1-3% per maand op aandelenwaarde.",
    maxLoss: "Volledige waarde van aandelen als onderliggende naar $0 gaat. Premium vermindert cost basis licht.",
  },

  csp: {
    title: "Cash Secured Puts (CSP)",
    description: "Een bullish strategie waarbij je put opties verkoopt en daarmee verplicht bent om aandelen te kopen aan de strike price. Je verzamelt premium en bent bereid de aandelen te bezitten.",

    howItWorks: [
      "1. Verkoop een put optie aan een strike waar je bereid bent te kopen",
      "2. Houd voldoende cash beschikbaar (strike × 100 per contract)",
      "3. Verzamel premium van de verkochte put",
      "4. Bij expiratie: behoud premium (OTM) of koop aandelen aan strike (ITM)",
    ],

    examples: [
      {
        scenario: "Aandelen kopen met 'korting'",
        setup: "Wil AAPL kopen @ $170. Verkoop $165 put (30 DTE) voor $3.50 premium. Effectieve aankoopprijs = $161.50.",
        outcome: "Als AAPL > $165: behoud $350 premium. Als AAPL < $165: koop 100 aandelen @ $165 maar echte cost = $161.50.",
      },
      {
        scenario: "Premium income generatie",
        setup: "Verkoop wekelijkse SPY $440 puts voor $2.00 terwijl SPY @ $450. Herhaal 4× per maand.",
        outcome: "Verzamel 4 × $200 = $800/maand. Op $44,000 buying power = 1.8% maandelijks return.",
      },
    ],

    risks: [
      "Gedwongen aandelen kopen als markt daalt",
      "Aandelen kunnen verder dalen na assignment",
      "Capital vereist: moet volledige aankoopprijs in cash hebben",
      "Beperkte profit (premium) vs onbeperkt downside risico",
    ],

    riskManagement: [
      "Verkoop alleen puts op aandelen die je wilt bezitten",
      "Gebruik strikes waar je comfortabel mee bent (10-20% OTM)",
      "Houd extra cash reserve voor verdere dalingen",
      "Zet maximum aantal contracts per aandeel (diversificatie)",
      "Sluit positie bij 50-80% max profit",
      "Vermijd puts verkopen voor earnings announcements",
    ],

    whenToUse: [
      "Als je aandelen wilt kopen aan een lagere prijs",
      "Voor income generatie in stabiele tot stijgende markten",
      "Als je bullish bent maar patient kan zijn",
      "Als IV hoog is (hogere premiums)",
    ],

    profitPotential: "Beperkt tot verzamelde premium. Typisch 1-3% per maand op capital at risk.",
    maxLoss: "Strike price × 100 minus verzamelde premium (als aandeel naar $0 gaat).",
  },

  spreads: {
    title: "Vertical Spreads",
    description: "Een gedefinieerd-risico strategie waarbij je tegelijkertijd een optie koopt en verkoopt op verschillende strikes maar zelfde expiratie. Beperkt zowel winst als verlies.",

    howItWorks: [
      "Credit Spread: Verkoop optie dichterbij at-the-money, koop verder OTM → ontvang net credit",
      "Debit Spread: Koop optie dichterbij at-the-money, verkoop verder OTM → betaal net debit",
      "Beide hebben gedefinieerd max profit en max loss",
    ],

    examples: [
      {
        scenario: "Bull Put Spread",
        setup: "SPY @ $450. Verkoop $440 put voor $3.00, koop $435 put voor $1.50. Net credit = $150. Max risk = $500 - $150 = $350.",
        outcome: "Als SPY > $440: behoud $150. Als SPY < $435: verlies $350. Break-even: $438.50.",
      },
      {
        scenario: "Bear Call Spread",
        setup: "TSLA @ $250. Verkoop $260 call voor $4.00, koop $270 call voor $2.00. Net credit = $200. Max risk = $800.",
        outcome: "Als TSLA < $260: behoud $200. Als TSLA > $270: verlies $800.",
      },
    ],

    risks: [
      "Beperkte profit potential",
      "Vroege assignment risico op short leg",
      "Pin risk bij expiratie (prijs tussen strikes)",
      "Moeilijker te rollen bij problemen",
    ],

    riskManagement: [
      "Gebruik risk/reward ratio minimum 1:2 (bijv. max profit $200 vs max loss $300)",
      "Sluit bij 50-75% max profit",
      "Vermijd holding tot expiratie",
      "Gebruik 30-45 DTE voor optimale theta",
      "Diversifieer over meerdere underlyings",
    ],

    whenToUse: [
      "Als je richting verwacht maar risico wilt beperken",
      "In hoge IV omgevingen",
      "Met beperkt kapitaal",
      "Voor consistente small wins",
    ],

    profitPotential: "Beperkt tot net credit ontvangen (credit spreads) of width minus debit (debit spreads).",
    maxLoss: "Verschil tussen strikes minus net credit (credit) of net debit betaald (debit).",
  },

  kaching: {
    title: "KaChing Strategy (Protective Puts + Selling)",
    description: "Een geavanceerde strategie die aandelen combineert met protective puts voor downside bescherming, terwijl je covered calls verkoopt voor income. Geeft gedefinieerd risico met income generatie.",

    howItWorks: [
      "1. Koop 100 aandelen",
      "2. Koop protective put (insurance) voor downside bescherming",
      "3. Verkoop call opties voor income generatie",
      "4. Resultaat: beperkt verlies, beperkte winst, steady income",
    ],

    examples: [
      {
        scenario: "Protected income trade",
        setup: "Koop 100 NVDA @ $500 ($50,000). Koop $480 put (90 DTE) voor $15 ($1,500). Verkoop $530 call (30 DTE) voor $8 ($800).",
        outcome: "Max loss: $20 + $15 - $8 = $2,700. Max profit: $30 - $15 + $8 = $2,300. Genereer $800/maand while protected.",
      },
      {
        scenario: "Volatility event protection",
        setup: "Voor earnings: bezit SPY @ $450. Koop $440 put voor $5. Verkoop $465 call voor $3. Max downside = $15/share.",
        outcome: "Beschermd tot $440 ondanks earnings. Verzamel premium van call sales.",
      },
    ],

    risks: [
      "Put premium kost - vermindert total returns",
      "Beide legs kunnen verlies maken in volatiele markets",
      "Complexiteit - vereist monitoring van meerdere positions",
      "Calls kunnen gedwongen worden",
    ],

    riskManagement: [
      "Kies put strike met acceptable max loss (5-10% onder huidige prijs)",
      "Gebruik langere DTE puts (60-90 dagen) voor betere cost efficiency",
      "Verkoop calls regelmatig (weekly/monthly) om put cost te offsetten",
      "Monitor total position cost vs protection level",
      "Pas aan bij 50% van DTE of grote price moves",
    ],

    whenToUse: [
      "Bij volatile aandelen waar je bescherming wilt",
      "Rond earnings of belangrijke events",
      "Als je bullish bent maar wilt beschermen tegen crashes",
      "Voor psychologisch comfort met gedefinieerd risico",
    ],

    profitPotential: "Beperkt tot strike van call minus put cost. Typisch 5-15% ROI per trade.",
    maxLoss: "Verschil tussen aankoopprijs en put strike + put cost - call premium. Volledig gedefinieerd en beperkt.",
  },
};
