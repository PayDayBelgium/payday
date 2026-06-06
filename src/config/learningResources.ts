import type { TradingTip, RecommendedBook, VideoTutorial, ExternalResource, LevelResources, UserLevel } from '../types';

// =====================================================
// BEGINNER LEVEL - Green Slope
// =====================================================

const beginnerTips: TradingTip[] = [
  {
    id: 'tip-b-1',
    level: 'beginner',
    title: 'Start met een Demo Account',
    content: 'Voordat je echt geld investeert, oefen eerst met een paper trading account. De meeste brokers bieden dit gratis aan. Zo leer je de platform kennen zonder risico.',
    category: 'general',
    icon: '🎯',
  },
  {
    id: 'tip-b-2',
    level: 'beginner',
    title: 'Investeer Alleen Wat Je Kunt Missen',
    content: 'De gouden regel: investeer nooit geld dat je nodig hebt voor je dagelijkse uitgaven. Begin klein en bouw langzaam op naarmate je meer ervaring krijgt.',
    category: 'risk',
    icon: '💰',
  },
  {
    id: 'tip-b-3',
    level: 'beginner',
    title: 'Diversificatie is Koning',
    content: 'Leg niet al je eieren in één mandje. Spreid je investeringen over verschillende sectoren en bedrijven. ETFs zijn hier perfect voor als beginner.',
    category: 'strategy',
    icon: '🥚',
  },
  {
    id: 'tip-b-4',
    level: 'beginner',
    title: 'Kies een Betrouwbare Broker',
    content: 'Voor Belgische beleggers zijn DEGIRO, Bolero (KBC), en Interactive Brokers populaire keuzes. Let op de kosten per transactie en beschikbare markten.',
    category: 'tool',
    icon: '🏦',
  },
  {
    id: 'tip-b-5',
    level: 'beginner',
    title: 'Dividenden Herinvesteren',
    content: 'DRIP (Dividend Reinvestment Plan) laat je dividenden automatisch herinvesteren. Dit zorgt voor compound groei op lange termijn.',
    category: 'strategy',
    icon: '🔄',
    relatedFeatures: ['dividends'],
  },
  {
    id: 'tip-b-6',
    level: 'beginner',
    title: 'Ken de Belgische Belastingregels',
    content: 'België kent de TOB (Taks op Beursverrichtingen), roerende voorheffing op dividenden (30%), en mogelijke meerwaardebelasting. Houd hier rekening mee!',
    category: 'tax',
    icon: '📋',
  },
];

const beginnerBooks: RecommendedBook[] = [
  {
    id: 'book-b-1',
    level: 'beginner',
    title: 'The Simple Path to Wealth',
    author: 'JL Collins',
    description: 'De perfecte introductie tot passief beleggen. Collins legt uit waarom index fondsen de beste keuze zijn voor de meeste beleggers.',
    category: 'beginner',
    rating: 5,
    difficulty: 'easy',
    amazonUrl: 'https://www.amazon.com/Simple-Path-Wealth-financial-independence/dp/1533667926',
  },
  {
    id: 'book-b-2',
    level: 'beginner',
    title: 'A Random Walk Down Wall Street',
    author: 'Burton Malkiel',
    description: 'Een klassieker die de basis legt voor het begrijpen van markten en waarom timing de markt bijna onmogelijk is.',
    category: 'beginner',
    rating: 5,
    difficulty: 'easy',
    amazonUrl: 'https://www.amazon.com/Random-Walk-Down-Wall-Street/dp/1324002182',
  },
  {
    id: 'book-b-3',
    level: 'beginner',
    title: 'The Intelligent Investor',
    author: 'Benjamin Graham',
    description: 'Het bijbel van waardebeleggen, geschreven door de mentor van Warren Buffett. Focus op de hoofdstukken over margin of safety.',
    category: 'beginner',
    rating: 5,
    difficulty: 'medium',
    amazonUrl: 'https://www.amazon.com/Intelligent-Investor-Definitive-Investing-Essentials/dp/0060555661',
  },
];

const beginnerVideos: VideoTutorial[] = [
  {
    id: 'vid-b-1',
    level: 'beginner',
    title: 'Beleggen voor Beginners',
    description: 'Volledige introductie tot de beurs: wat zijn aandelen, ETFs, en hoe werkt een broker.',
    duration: '25:00',
    platform: 'youtube',
    category: 'basics',
    creditsAwarded: 25,
  },
  {
    id: 'vid-b-2',
    level: 'beginner',
    title: 'Je Eerste ETF Kopen',
    description: 'Stap-voor-stap handleiding om je eerste ETF te kopen via een broker.',
    duration: '15:00',
    platform: 'youtube',
    category: 'platform',
    creditsAwarded: 15,
  },
];

const beginnerResources: ExternalResource[] = [
  {
    id: 'res-b-1',
    level: 'beginner',
    title: 'JustETF',
    description: 'Vergelijk alle ETFs beschikbaar in Europa. Filter op kosten, dividend, en meer.',
    url: 'https://www.justetf.com/en/',
    type: 'tool',
    isFree: true,
  },
  {
    id: 'res-b-2',
    level: 'beginner',
    title: 'DEGIRO',
    description: 'Populaire low-cost broker voor Belgische beleggers met toegang tot wereldwijde markten.',
    url: 'https://www.degiro.be/',
    type: 'broker',
    isFree: true,
  },
];

// =====================================================
// MEDIOR LEVEL - Blue Slope
// =====================================================

const mediorTips: TradingTip[] = [
  {
    id: 'tip-m-1',
    level: 'medior',
    title: 'De 30-45 DTE Sweet Spot',
    content: 'Verkoop opties met 30-45 dagen tot expiratie. Dit is de sweet spot waar theta decay het snelst werkt terwijl je nog voldoende premium ontvangt.',
    category: 'strategy',
    icon: '📅',
    relatedFeatures: ['covered_calls', 'cash_secured_puts'],
  },
  {
    id: 'tip-m-2',
    level: 'medior',
    title: 'Delta 0.30 voor Covered Calls',
    content: 'Kies strikes met een delta rond 0.30 voor covered calls. Dit geeft ~70% kans dat de optie waardeloos expireert terwijl je nog mooie premium ontvangt.',
    category: 'strategy',
    icon: '📊',
    relatedFeatures: ['covered_calls'],
  },
  {
    id: 'tip-m-3',
    level: 'medior',
    title: 'Sluit Winnaars Vroeg',
    content: 'Sluit opties wanneer je 50-75% van de maximale winst hebt. Dit beperkt je risico en maakt kapitaal vrij voor nieuwe trades.',
    category: 'strategy',
    icon: '✅',
  },
  {
    id: 'tip-m-4',
    level: 'medior',
    title: 'Wheel Strategie Basis',
    content: 'De Wheel: verkoop CSPs tot assignment, schrijf dan CCs op je aandelen. Herhaal. Focus op kwaliteitsaandelen die je ook wilt bezitten.',
    category: 'strategy',
    icon: '🎡',
    relatedFeatures: ['wheel_strategy'],
  },
  {
    id: 'tip-m-5',
    level: 'medior',
    title: 'Premie vs Risico',
    content: 'Hoge premie = hoge volatiliteit = hoger risico. Kies liever lagere maar consistente premie op stabiele aandelen.',
    category: 'risk',
    icon: '⚖️',
  },
  {
    id: 'tip-m-6',
    level: 'medior',
    title: 'Cash Reserve Behouden',
    content: 'Houd altijd 20-30% van je portfolio in cash. Dit geeft je flexibiliteit om kansen te pakken en om te rollen bij tegenslag.',
    category: 'risk',
    icon: '💵',
  },
  {
    id: 'tip-m-7',
    level: 'medior',
    title: 'Earnings Vermijden',
    content: 'Vermijd opties die over earnings heen lopen, tenzij je bewust op volatiliteit speelt. De onvoorspelbare bewegingen kunnen je trade ruïneren.',
    category: 'risk',
    icon: '📰',
  },
];

const mediorBooks: RecommendedBook[] = [
  {
    id: 'book-m-1',
    level: 'medior',
    title: 'Options as a Strategic Investment',
    author: 'Lawrence McMillan',
    description: 'De bijbel voor options traders. Zeer uitgebreid maar essentieel voor wie serieus met opties wil handelen.',
    category: 'options',
    rating: 5,
    difficulty: 'advanced',
    amazonUrl: 'https://www.amazon.com/Options-Strategic-Investment-Lawrence-McMillan/dp/0735204659',
  },
  {
    id: 'book-m-2',
    level: 'medior',
    title: 'The Options Playbook',
    author: 'Brian Overby',
    description: 'Praktische gids met 40 optiestrategieën uitgelegd met duidelijke grafieken. Perfect als naslagwerk.',
    category: 'options',
    rating: 4,
    difficulty: 'medium',
    amazonUrl: 'https://www.amazon.com/Options-Playbook-Expanded-2nd-strategies/dp/0615308147',
  },
  {
    id: 'book-m-3',
    level: 'medior',
    title: 'Get Rich with Options',
    author: 'Lee Lowell',
    description: 'Focust op income-strategieën zoals covered calls en cash secured puts. Praktisch en toegankelijk.',
    category: 'income',
    rating: 4,
    difficulty: 'medium',
    amazonUrl: 'https://www.amazon.com/Get-Rich-Options-Powerful-Strategies/dp/0470046619',
  },
];

const mediorVideos: VideoTutorial[] = [
  {
    id: 'vid-m-1',
    level: 'medior',
    title: 'Covered Calls Masterclass',
    description: 'Alles over covered calls: wanneer verkopen, welke strike kiezen, en hoe te rollen.',
    duration: '45:00',
    platform: 'youtube',
    category: 'strategy',
    creditsAwarded: 50,
  },
  {
    id: 'vid-m-2',
    level: 'medior',
    title: 'Cash Secured Puts Strategie',
    description: 'Leer hoe je betaald wordt om aandelen te kopen tegen jouw gewenste prijs.',
    duration: '30:00',
    platform: 'youtube',
    category: 'strategy',
    creditsAwarded: 35,
  },
  {
    id: 'vid-m-3',
    level: 'medior',
    title: 'The Wheel Strategy Explained',
    description: 'Complete uitleg van de Wheel strategie met praktijkvoorbeelden.',
    duration: '40:00',
    platform: 'youtube',
    category: 'strategy',
    creditsAwarded: 45,
  },
];

const mediorResources: ExternalResource[] = [
  {
    id: 'res-m-1',
    level: 'medior',
    title: 'Option Alpha',
    description: 'Uitstekende gratis cursussen over options trading. Begin met hun beginner track.',
    url: 'https://optionalpha.com/',
    type: 'website',
    isFree: true,
  },
  {
    id: 'res-m-2',
    level: 'medior',
    title: 'tastytrade',
    description: 'Gratis education platform met dagelijkse live shows over options trading.',
    url: 'https://www.tastytrade.com/',
    type: 'website',
    isFree: true,
  },
  {
    id: 'res-m-3',
    level: 'medior',
    title: 'OptionStrat',
    description: 'Visualiseer je optie trades met P&L grafieken voordat je ze uitvoert.',
    url: 'https://optionstrat.com/',
    type: 'tool',
    isFree: true,
  },
];

// =====================================================
// SENIOR LEVEL - Red Slope
// =====================================================

const seniorTips: TradingTip[] = [
  {
    id: 'tip-s-1',
    level: 'senior',
    title: 'LEAPS als Stock Replacement',
    content: 'Koop deep ITM LEAPS (delta 0.80+) met 1-2 jaar tot expiratie. Dit geeft je hefboom met minder kapitaal dan 100 aandelen kopen.',
    category: 'strategy',
    icon: '🎯',
    relatedFeatures: ['leaps'],
  },
  {
    id: 'tip-s-2',
    level: 'senior',
    title: 'PMCC Strike Selection',
    content: 'Voor PMCC: koop LEAP met delta 0.70-0.80, verkoop calls met delta 0.20-0.30. Zorg dat je short call strike boven je LEAP break-even ligt.',
    category: 'strategy',
    icon: '📈',
    relatedFeatures: ['pmcc', 'leaps'],
  },
  {
    id: 'tip-s-3',
    level: 'senior',
    title: 'Roll Timing',
    content: 'Roll je short calls wanneer ze ITM gaan OF wanneer er nog maar 7-10 dagen resteren. Wacht niet tot expiratie.',
    category: 'strategy',
    icon: '🔄',
    relatedFeatures: ['roll_management'],
  },
  {
    id: 'tip-s-4',
    level: 'senior',
    title: 'Delta Neutral Balanceren',
    content: 'Monitor je totale portfolio delta. Bij te veel bullish exposure, voeg bearish trades toe of vice versa.',
    category: 'risk',
    icon: '⚖️',
    relatedFeatures: ['delta_management'],
  },
  {
    id: 'tip-s-5',
    level: 'senior',
    title: 'LEAP Extrinsic Value',
    content: 'Koop LEAPs wanneer IV laag is. De extrinsieke waarde (tijdswaarde) is dan goedkoper. Check de IV percentile.',
    category: 'strategy',
    icon: '📊',
    relatedFeatures: ['leaps'],
  },
  {
    id: 'tip-s-6',
    level: 'senior',
    title: 'Assignment Risk bij PMCC',
    content: 'Als je short call wordt geassigned, verlies je je LEAP. Rol altijd op tijd! Early assignment risico is hoger bij dividend-betalende aandelen.',
    category: 'risk',
    icon: '⚠️',
    relatedFeatures: ['pmcc'],
  },
];

const seniorBooks: RecommendedBook[] = [
  {
    id: 'book-s-1',
    level: 'senior',
    title: 'INTRINSIC: Opties voor Iedereen',
    author: 'Maarten Verheyen',
    description: 'Nederlandstalig boek specifiek over LEAPS en lange termijn optiestrategieën. Perfect voor de Belgische belegger.',
    category: 'leaps',
    rating: 5,
    difficulty: 'medium',
    bolUrl: 'https://www.bol.com/be/nl/p/intrinsic/9300000090431878/',
  },
  {
    id: 'book-s-2',
    level: 'senior',
    title: 'Option Volatility and Pricing',
    author: 'Sheldon Natenberg',
    description: 'De gouden standaard voor het begrijpen van implied volatility en options pricing. Essentieel voor gevorderde traders.',
    category: 'options',
    rating: 5,
    difficulty: 'advanced',
    amazonUrl: 'https://www.amazon.com/Option-Volatility-Pricing-Strategies-Techniques/dp/0071818774',
  },
  {
    id: 'book-s-3',
    level: 'senior',
    title: 'Trading Options Greeks',
    author: 'Dan Passarelli',
    description: 'Diepgaande uitleg van delta, gamma, theta, vega en hoe je ze gebruikt in je trading.',
    category: 'options',
    rating: 4,
    difficulty: 'advanced',
    amazonUrl: 'https://www.amazon.com/Trading-Options-Greeks-Bloomberg-Financial/dp/1118133161',
  },
];

const seniorVideos: VideoTutorial[] = [
  {
    id: 'vid-s-1',
    level: 'senior',
    title: 'LEAPS Deep Dive',
    description: 'Alles over het kopen van LEAPS: strike selectie, timing, en risicobeheer.',
    duration: '55:00',
    platform: 'youtube',
    category: 'strategy',
    creditsAwarded: 60,
  },
  {
    id: 'vid-s-2',
    level: 'senior',
    title: 'Poor Mans Covered Call Strategie',
    description: 'Complete PMCC masterclass: van setup tot management en rolling.',
    duration: '60:00',
    platform: 'youtube',
    category: 'strategy',
    creditsAwarded: 70,
  },
  {
    id: 'vid-s-3',
    level: 'senior',
    title: 'Delta Management voor je Portfolio',
    description: 'Leer hoe je je portfolio delta beheert voor consistent rendement.',
    duration: '35:00',
    platform: 'youtube',
    category: 'analysis',
    creditsAwarded: 40,
  },
];

const seniorResources: ExternalResource[] = [
  {
    id: 'res-s-1',
    level: 'senior',
    title: 'Barchart Options',
    description: 'Gratis options screener en chain data. Ideaal voor het vinden van LEAPS.',
    url: 'https://www.barchart.com/options',
    type: 'tool',
    isFree: true,
  },
  {
    id: 'res-s-2',
    level: 'senior',
    title: 'Market Chameleon',
    description: 'Geavanceerde options analytics en unusual activity tracker.',
    url: 'https://marketchameleon.com/',
    type: 'tool',
    isFree: false,
  },
];

// =====================================================
// EXPERT LEVEL - Black Slope
// =====================================================

const expertTips: TradingTip[] = [
  {
    id: 'tip-e-1',
    level: 'expert',
    title: 'Iron Condor Sizing',
    content: 'Houd je iron condor width consistent (bv. altijd $5 wide). Dit maakt risicobeheer voorspelbaar. Max 2-3% van portfolio per trade.',
    category: 'strategy',
    icon: '🦅',
    relatedFeatures: ['iron_condors'],
  },
  {
    id: 'tip-e-2',
    level: 'expert',
    title: 'KaChing Bescherming',
    content: 'Bij KaChing: koop je protective put 6-8 weken uit, verkoop wekelijks puts erboven. Na 4-5 weken is je bescherming "gratis".',
    category: 'strategy',
    icon: '🛡️',
    relatedFeatures: ['kaching'],
  },
  {
    id: 'tip-e-3',
    level: 'expert',
    title: 'Spreads bij Hoge IV',
    content: 'Verkoop spreads wanneer IV hoog is (IV rank > 50). De premium is dan rijker en theta werkt harder voor je.',
    category: 'strategy',
    icon: '📊',
    relatedFeatures: ['spreads'],
  },
  {
    id: 'tip-e-4',
    level: 'expert',
    title: 'Correlation Trading',
    content: 'Let op correlatie tussen je posities. Te veel tech-trades = hoge correlatie = hoger risico bij sector-correctie.',
    category: 'risk',
    icon: '🔗',
  },
  {
    id: 'tip-e-5',
    level: 'expert',
    title: 'VIX als Kompas',
    content: 'Gebruik VIX als indicator: < 15 = low IV (koop opties), > 25 = high IV (verkoop opties). > 30 = extreme fear (grote kansen).',
    category: 'strategy',
    icon: '🧭',
  },
  {
    id: 'tip-e-6',
    level: 'expert',
    title: 'Tax-Loss Harvesting',
    content: 'Realiseer verliezen strategisch voor belastingoptimalisatie. Let op de wash sale regel indien van toepassing.',
    category: 'tax',
    icon: '📋',
  },
  {
    id: 'tip-e-7',
    level: 'expert',
    title: 'Gamma Risk bij Expiratie',
    content: 'Gamma explodeert nabij expiratie voor ATM opties. Sluit posities of rol ze ruim voor expiratie om gamma risk te vermijden.',
    category: 'risk',
    icon: '⚡',
  },
];

const expertBooks: RecommendedBook[] = [
  {
    id: 'book-e-1',
    level: 'expert',
    title: 'Friday Payday',
    author: 'Multiple Authors',
    description: 'Specifiek over de KaChing/Friday strategie: beschermde put verkoop met wekelijkse premie-inkomsten.',
    category: 'income',
    rating: 5,
    difficulty: 'advanced',
  },
  {
    id: 'book-e-2',
    level: 'expert',
    title: 'The Volatility Edge in Options Trading',
    author: 'Jeff Augen',
    description: 'Geavanceerde volatility trading strategieën. Voor wie de technische details wil begrijpen.',
    category: 'options',
    rating: 4,
    difficulty: 'advanced',
    amazonUrl: 'https://www.amazon.com/Volatility-Edge-Options-Trading-Strategies/dp/0132354691',
  },
  {
    id: 'book-e-3',
    level: 'expert',
    title: 'Dynamic Hedging',
    author: 'Nassim Nicholas Taleb',
    description: 'Van de auteur van Black Swan. Diepgaande analyse van hedging en risk management.',
    category: 'options',
    rating: 4,
    difficulty: 'advanced',
    amazonUrl: 'https://www.amazon.com/Dynamic-Hedging-Managing-Vanilla-Options/dp/0471152803',
  },
  {
    id: 'book-e-4',
    level: 'expert',
    title: 'Trading in the Zone',
    author: 'Mark Douglas',
    description: 'De psychologie van trading. Essentieel voor wie consistent wil presteren.',
    category: 'psychology',
    rating: 5,
    difficulty: 'medium',
    amazonUrl: 'https://www.amazon.com/Trading-Zone-Confidence-Discipline-Attitude/dp/0735201447',
  },
];

const expertVideos: VideoTutorial[] = [
  {
    id: 'vid-e-1',
    level: 'expert',
    title: 'Iron Condor Masterclass',
    description: 'Complete gids voor iron condors: setup, adjustment, en wanneer te sluiten.',
    duration: '70:00',
    platform: 'youtube',
    category: 'strategy',
    creditsAwarded: 80,
  },
  {
    id: 'vid-e-2',
    level: 'expert',
    title: 'KaChing Strategie Deep Dive',
    description: 'Alles over de beschermde put-schrijf strategie met wekelijkse premie.',
    duration: '50:00',
    platform: 'youtube',
    category: 'strategy',
    creditsAwarded: 55,
  },
  {
    id: 'vid-e-3',
    level: 'expert',
    title: 'Portfolio Margin en Risk Management',
    description: 'Geavanceerd portfolio management voor actieve options traders.',
    duration: '45:00',
    platform: 'youtube',
    category: 'analysis',
    creditsAwarded: 50,
  },
];

const expertResources: ExternalResource[] = [
  {
    id: 'res-e-1',
    level: 'expert',
    title: 'Think or Swim',
    description: 'Gratis paper trading platform van TD Ameritrade met professionele tools.',
    url: 'https://www.tdameritrade.com/tools-and-platforms/thinkorswim.html',
    type: 'tool',
    isFree: true,
  },
  {
    id: 'res-e-2',
    level: 'expert',
    title: 'CBOE Options Institute',
    description: 'Educatie direct van de Chicago Board Options Exchange.',
    url: 'https://www.cboe.com/education/',
    type: 'website',
    isFree: true,
  },
  {
    id: 'res-e-3',
    level: 'expert',
    title: 'Interactive Brokers',
    description: 'Professionele broker met de laagste margin rates en meeste optiemogelijkheden.',
    url: 'https://www.interactivebrokers.com/',
    type: 'broker',
    isFree: true,
  },
];

// =====================================================
// OFF-PISTE LEVEL - Orange Route (Quant)
// =====================================================

const offpisteTips: TradingTip[] = [
  {
    id: 'tip-o-1',
    level: 'offpiste',
    title: 'Meet je Edge, Vertrouw hem Niet Blind',
    content: 'Off-piste trading draait om verwachtingswaarde. Onderbouw elke strategie met data en backtests, en herzie je aannames zodra de cijfers afwijken.',
    category: 'strategy',
    icon: '📊',
    relatedFeatures: ['quant_trading'],
  },
  {
    id: 'tip-o-2',
    level: 'offpiste',
    title: 'Vermijd Overfitting',
    content: 'Een model dat het verleden perfect verklaart, voorspelt de toekomst zelden. Test out-of-sample en gebruik walk-forward analyse voordat je live gaat.',
    category: 'risk',
    icon: '🧪',
    relatedFeatures: ['quant_trading'],
  },
  {
    id: 'tip-o-3',
    level: 'offpiste',
    title: 'Positiegrootte als Systeem',
    content: 'Laat je positiegrootte bepalen door een vaste, data-gedreven regel (bijvoorbeeld een fractie van Kelly) in plaats van door emotie.',
    category: 'psychology',
    icon: '🎚️',
    relatedFeatures: ['quant_trading'],
  },
];

const offpisteBooks: RecommendedBook[] = [
  {
    id: 'book-o-1',
    level: 'offpiste',
    title: 'Advances in Financial Machine Learning',
    author: 'Marcos López de Prado',
    description: 'Praktische methodes om kwantitatieve strategieën op te bouwen zonder in overfitting te trappen.',
    category: 'options',
    rating: 5,
    difficulty: 'advanced',
  },
  {
    id: 'book-o-2',
    level: 'offpiste',
    title: 'Trading Systems and Methods',
    author: 'Perry J. Kaufman',
    description: 'Standaardwerk over het systematisch ontwerpen, testen en beheren van kwantitatieve handelssystemen.',
    category: 'options',
    rating: 4,
    difficulty: 'advanced',
  },
];

const offpisteVideos: VideoTutorial[] = [
  {
    id: 'vid-o-1',
    level: 'offpiste',
    title: 'Een Edge Backtesten van A tot Z',
    description: 'Stap-voor-stap een hypothese omzetten in een toetsbare, data-gedreven strategie.',
    duration: '24:10',
    platform: 'youtube',
    category: 'analysis',
    creditsAwarded: 20,
  },
];

const offpisteResources: ExternalResource[] = [
  {
    id: 'res-o-1',
    level: 'offpiste',
    title: 'QuantConnect',
    description: 'Cloud-platform om kwantitatieve strategieën te backtesten en live te draaien.',
    url: 'https://www.quantconnect.com/',
    type: 'tool',
    isFree: true,
  },
  {
    id: 'res-o-2',
    level: 'offpiste',
    title: 'Quantitative Finance Stack Exchange',
    description: 'Community van quants over modellen, statistiek en data-gedreven trading.',
    url: 'https://quant.stackexchange.com/',
    type: 'community',
    isFree: true,
  },
];

// =====================================================
// EXPORT ALL RESOURCES
// =====================================================

export const LEVEL_RESOURCES: Record<UserLevel, LevelResources> = {
  beginner: {
    level: 'beginner',
    tips: beginnerTips,
    books: beginnerBooks,
    videos: beginnerVideos,
    externalResources: beginnerResources,
  },
  medior: {
    level: 'medior',
    tips: mediorTips,
    books: mediorBooks,
    videos: mediorVideos,
    externalResources: mediorResources,
  },
  senior: {
    level: 'senior',
    tips: seniorTips,
    books: seniorBooks,
    videos: seniorVideos,
    externalResources: seniorResources,
  },
  expert: {
    level: 'expert',
    tips: expertTips,
    books: expertBooks,
    videos: expertVideos,
    externalResources: expertResources,
  },
  offpiste: {
    level: 'offpiste',
    tips: offpisteTips,
    books: offpisteBooks,
    videos: offpisteVideos,
    externalResources: offpisteResources,
  },
};

// Helper function to get resources for a level and all unlocked levels
export const getResourcesForUnlockedLevels = (unlockedLevels: UserLevel[]): LevelResources => {
  const combinedResources: LevelResources = {
    level: 'beginner',
    tips: [],
    books: [],
    videos: [],
    externalResources: [],
  };

  for (const level of unlockedLevels) {
    const resources = LEVEL_RESOURCES[level];
    combinedResources.tips.push(...resources.tips);
    combinedResources.books.push(...resources.books);
    combinedResources.videos.push(...resources.videos);
    combinedResources.externalResources.push(...resources.externalResources);
  }

  return combinedResources;
};

// Get a random tip for the user's current level
export const getRandomTip = (level: UserLevel): TradingTip | null => {
  const tips = LEVEL_RESOURCES[level].tips;
  if (tips.length === 0) return null;
  return tips[Math.floor(Math.random() * tips.length)];
};

// Get all tips up to and including a level
export const getTipsUpToLevel = (maxLevel: UserLevel): TradingTip[] => {
  const levelOrder: UserLevel[] = ['beginner', 'medior', 'senior', 'expert'];
  const maxIndex = levelOrder.indexOf(maxLevel);

  return levelOrder
    .slice(0, maxIndex + 1)
    .flatMap(level => LEVEL_RESOURCES[level].tips);
};

// Get all books up to and including a level
export const getBooksUpToLevel = (maxLevel: UserLevel): RecommendedBook[] => {
  const levelOrder: UserLevel[] = ['beginner', 'medior', 'senior', 'expert'];
  const maxIndex = levelOrder.indexOf(maxLevel);

  return levelOrder
    .slice(0, maxIndex + 1)
    .flatMap(level => LEVEL_RESOURCES[level].books);
};
