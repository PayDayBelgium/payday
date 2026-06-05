import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Sparkles, BookOpen, TrendingUp, Target, Zap, GraduationCap, CheckCircle, Mountain } from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectCurrentLevel } from '../../store/slices/userProgressSlice';
import type { UserLevel } from '../../types';

// Wizard content types
interface GlossaryTerm {
  term: string;
  definition: string;
  example?: string;
}

interface WizardStep {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  glossaryTerms?: GlossaryTerm[];
}

interface LevelWizardContent {
  level: UserLevel;
  welcomeTitle: string;
  welcomeSubtitle: string;
  slopeIcon: string;
  slopeColor: string;
  steps: WizardStep[];
}

// Glossary terms per level
const BEGINNER_TERMS: GlossaryTerm[] = [
  {
    term: 'Broker',
    definition: 'Een financiële tussenpersoon die je orders op de beurs uitvoert. Denk aan Saxo Bank, DEGIRO, of Interactive Brokers.',
    example: 'Je plaatst een order om 10 aandelen Apple te kopen, en je broker voert dit uit op de beurs.',
  },
  {
    term: 'Portfolio',
    definition: 'Je verzameling van beleggingen - alle aandelen, ETFs en andere posities die je bezit.',
    example: 'Je portfolio kan bestaan uit 50 aandelen Apple, 100 aandelen Microsoft, en een S&P500 ETF.',
  },
  {
    term: 'Aandeel',
    definition: 'Een klein stukje eigendom in een bedrijf. Als je een aandeel koopt, word je mede-eigenaar van dat bedrijf.',
    example: 'Als Apple 1 miljard aandelen heeft en jij er 100 bezit, bezit je 0.00001% van Apple.',
  },
  {
    term: 'ETF',
    definition: 'Exchange Traded Fund - een mandje van verschillende aandelen dat je als één geheel kunt kopen.',
    example: 'De S&P500 ETF bevat de 500 grootste Amerikaanse bedrijven in één product.',
  },
  {
    term: 'Ticker',
    definition: 'De korte code waarmee een aandeel of ETF op de beurs wordt aangeduid.',
    example: 'Apple = AAPL, Microsoft = MSFT, Tesla = TSLA',
  },
  {
    term: 'Dividend',
    definition: 'Een deel van de winst dat bedrijven uitkeren aan aandeelhouders.',
    example: 'Apple keert elk kwartaal circa $0.24 per aandeel uit aan dividend.',
  },
];

const MEDIOR_TERMS: GlossaryTerm[] = [
  {
    term: 'Optie',
    definition: 'Een contract dat je het recht geeft om aandelen te kopen (call) of verkopen (put) tegen een vooraf bepaalde prijs.',
    example: 'Een call optie op Apple met strike $150 geeft je het recht om Apple te kopen voor $150.',
  },
  {
    term: 'Strike Price',
    definition: 'De vooraf bepaalde prijs waartegen je het aandeel kunt kopen of verkopen via de optie.',
    example: 'Bij een strike van $150 kun je de aandelen kopen/verkopen voor exact $150.',
  },
  {
    term: 'Premium',
    definition: 'De prijs die je betaalt of ontvangt voor een optiecontract.',
    example: 'Je verkoopt een put optie en ontvangt $2.50 premium per aandeel ($250 totaal voor 100 aandelen).',
  },
  {
    term: 'DTE (Days To Expiration)',
    definition: 'Het aantal dagen tot de optie verloopt/expireert.',
    example: 'Een optie met 30 DTE verloopt over 30 dagen.',
  },
  {
    term: 'Covered Call',
    definition: 'Een strategie waarbij je een call optie verkoopt op aandelen die je al bezit, om extra inkomen te genereren.',
    example: 'Je bezit 100 Apple aandelen en verkoopt een call met strike $160 voor $3 premium.',
  },
  {
    term: 'Cash Secured Put',
    definition: 'Een put optie verkopen met genoeg cash om de aandelen te kunnen kopen als de optie wordt uitgeoefend.',
    example: 'Je verkoopt een put op Apple met strike $140 en houdt $14.000 cash achter als onderpand.',
  },
  {
    term: 'Wheel Strategy',
    definition: 'Afwisselend puts en calls verkopen: eerst CSP tot assignment, dan covered calls tot aandelen worden weggeroepen.',
    example: 'Verkoop CSP → krijg aandelen → verkoop covered calls → aandelen weg → herhaal.',
  },
  {
    term: 'Assignment',
    definition: 'Wanneer de koper van een optie zijn recht uitoefent en jij moet leveren (calls) of ontvangen (puts).',
    example: 'Je verkochte put op Apple wordt assigned: je moet nu 100 aandelen kopen voor de strike prijs.',
  },
];

const SENIOR_TERMS: GlossaryTerm[] = [
  {
    term: 'LEAP',
    definition: 'Long-term Equity Anticipation Securities - opties met een looptijd van meer dan 1 jaar.',
    example: 'Een LEAP call op Apple met expiratie januari 2026 heeft een looptijd van meer dan 12 maanden.',
  },
  {
    term: 'Delta',
    definition: 'Hoeveel de optieprijs verandert voor elke $1 beweging in de onderliggende aandelen (0.00 tot 1.00).',
    example: 'Een optie met delta 0.70 stijgt met $0.70 als het aandeel $1 stijgt.',
  },
  {
    term: 'PMCC',
    definition: 'Poor Man\'s Covered Call - een covered call strategie met een LEAP als onderpand in plaats van aandelen.',
    example: 'Koop een deep ITM LEAP call en verkoop korte termijn calls ertegen.',
  },
  {
    term: 'ITM/ATM/OTM',
    definition: 'In The Money, At The Money, Out of The Money - beschrijft waar de strike is t.o.v. huidige koers.',
    example: 'Apple staat op $150: call strike $140 is ITM, strike $150 is ATM, strike $160 is OTM.',
  },
  {
    term: 'Theta',
    definition: 'De tijdswaarde die een optie per dag verliest door tijdsverloop.',
    example: 'Een optie met theta -0.05 verliest $5 per dag aan tijdswaarde (per contract).',
  },
  {
    term: 'Roll',
    definition: 'Een bestaande optiepositie sluiten en tegelijk een nieuwe openen met andere strike of expiratie.',
    example: 'Roll je covered call van strike $160 naar $165 om meer upside te behouden.',
  },
  {
    term: 'Extrinsieke Waarde',
    definition: 'Het deel van de optieprijs dat bestaat uit tijdswaarde en volatiliteit, niet intrinsieke waarde.',
    example: 'Een call van $5 met $3 intrinsieke waarde heeft $2 extrinsieke waarde.',
  },
];

const EXPERT_TERMS: GlossaryTerm[] = [
  {
    term: 'Spread',
    definition: 'Een optiestrategie met meerdere legs - tegelijk kopen en verkopen van opties.',
    example: 'Bull call spread: koop call strike $150, verkoop call strike $160.',
  },
  {
    term: 'Iron Condor',
    definition: 'Een neutrale strategie met 4 legs die profiteert als de koers binnen een range blijft.',
    example: 'Verkoop put $140, koop put $135, verkoop call $160, koop call $165.',
  },
  {
    term: 'Ka-Ching',
    definition: 'Een geavanceerde premium-genererende strategie specifiek voor dit platform.',
    example: 'Combinatie van meerdere optiestrategieën voor optimale premium income.',
  },
  {
    term: 'Gamma',
    definition: 'De snelheid waarmee delta verandert - belangrijk bij korte termijn opties.',
    example: 'Hoge gamma betekent dat delta snel kan veranderen bij kleine koersbewegingen.',
  },
  {
    term: 'Vega',
    definition: 'Hoeveel de optieprijs verandert bij 1% verandering in implied volatility.',
    example: 'Een optie met vega 0.15 stijgt $15 per contract als IV met 1% stijgt.',
  },
  {
    term: 'IV (Implied Volatility)',
    definition: 'De door de markt verwachte toekomstige beweeglijkheid van een aandeel.',
    example: 'Hoge IV = dure opties, lage IV = goedkope opties.',
  },
];

const OFFPISTE_TERMS: GlossaryTerm[] = [
  {
    term: 'Quant Trading',
    definition: 'Kwantitatief beleggen: beslissingen nemen op basis van data, statistiek en vaste regels in plaats van onderbuikgevoel.',
    example: 'Een model koopt automatisch als een aandeel 2 standaarddeviaties onder zijn gemiddelde zakt.',
  },
  {
    term: 'Edge',
    definition: 'Een statistisch voordeel: een herhaalbare reden waarom je strategie op lange termijn winst maakt.',
    example: 'Historisch stijgt deze ETF vaker na 3 dalende dagen — dat is een edge.',
  },
  {
    term: 'Backtest',
    definition: 'Een strategie testen op historische data om te zien hoe ze zou hebben gepresteerd, vóór je echt geld inzet.',
    example: 'Je test je regels op 10 jaar koersdata en meet rendement, drawdown en aantal trades.',
  },
  {
    term: 'Sharpe Ratio',
    definition: 'Rendement gecorrigeerd voor risico. Hoe hoger, hoe meer rendement je krijgt per eenheid risico.',
    example: 'Een Sharpe van 1.5 is sterk; onder 1 is matig.',
  },
  {
    term: 'Drawdown',
    definition: 'De maximale daling van piek naar dal in je portefeuillewaarde — de pijn die je moet kunnen uitzitten.',
    example: 'Een strategie met 40% max drawdown verloor ooit 40% vanaf de top.',
  },
  {
    term: 'Mean Reversion',
    definition: 'De aanname dat een koers na een extreme beweging terugkeert naar zijn gemiddelde.',
    example: 'Koop bij oversold, verkoop bij overbought.',
  },
  {
    term: 'Momentum',
    definition: 'De aanname dat stijgende koersen blijven stijgen en dalende blijven dalen.',
    example: 'Koop de sterkste aandelen van de afgelopen 6 maanden.',
  },
  {
    term: 'Slippage',
    definition: 'Het verschil tussen de verwachte en de werkelijk uitgevoerde prijs van een order.',
    example: 'Je model rekent op $100, maar je order vult op $100,15 — dat is slippage.',
  },
  {
    term: 'Position Sizing',
    definition: 'Bepalen hoeveel kapitaal je per trade inzet om risico te beheersen.',
    example: 'Riskeer nooit meer dan 1% van je portefeuille per trade.',
  },
];

// Intro step content (same for all levels, but styled per level)
const createIntroStep = (level: UserLevel): WizardStep => ({
  id: 'intro',
  title: 'Welkom bij PayDay',
  shortTitle: 'Intro',
  description: 'Leer beleggen zoals je leert skiën',
  icon: <Mountain className="w-6 h-6" />,
  content: (
    <div className="space-y-4">
      <p className="text-gray-700 dark:text-gray-300">
        <strong>PayDay</strong> is gebouwd met één doel: jou stap voor stap leren beleggen,
        net zoals je leert skiën op de piste.
      </p>
      <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg border border-primary-200 dark:border-primary-700">
        <h4 className="font-semibold text-primary-700 dark:text-primary-300 mb-2 flex items-center gap-2">
          <GraduationCap className="w-5 h-5" />
          Onze Aanpak
        </h4>
        <p className="text-sm text-primary-700 dark:text-primary-300 mb-3">
          Net zoals bij skiën begin je op de groene piste met de basis, en werk je
          stap voor stap naar de zwarte piste met geavanceerde strategieën.
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-lg">🟢</span>
            <span className="text-gray-700 dark:text-gray-300">Groene Piste - Basis</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🔵</span>
            <span className="text-gray-700 dark:text-gray-300">Blauwe Piste - Opties</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🔴</span>
            <span className="text-gray-700 dark:text-gray-300">Rode Piste - LEAPS</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">⚫</span>
            <span className="text-gray-700 dark:text-gray-300">Zwarte Piste - Expert</span>
          </div>
        </div>
      </div>
      <div className="bg-caution-50 dark:bg-caution-600/15 p-3 rounded-lg border border-caution-500/30 dark:border-caution-600/40">
        <p className="text-sm text-caution-600 dark:text-caution-500">
          <strong>Tip:</strong> Je ontgrendelt nieuwe niveaus door te leren en credits te verdienen.
          Elke stap brengt je dichter bij financiële vrijheid!
        </p>
      </div>
    </div>
  ),
});

// Wizard content per level
const WIZARD_CONTENT: LevelWizardContent[] = [
  {
    level: 'beginner',
    welcomeTitle: 'Welkom bij PayDay!',
    welcomeSubtitle: 'Jouw reis naar financiële vrijheid begint hier',
    slopeIcon: '🟢',
    slopeColor: 'green',
    steps: [
      createIntroStep('beginner'),
      {
        id: 'portfolio',
        title: 'Jouw Portfolio Beheren',
        shortTitle: 'Portfolio',
        description: 'Leer hoe je je beleggingen bijhoudt en organiseert',
        icon: <TrendingUp className="w-6 h-6" />,
        content: (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              In PayDay kun je al je beleggingsrekeningen (portfolios) op één plek bijhouden.
              Elk portfolio vertegenwoordigt een account bij een broker.
            </p>
            <div className="bg-positive-50 dark:bg-positive-700/15 p-4 rounded-lg">
              <h4 className="font-semibold text-positive-700 dark:text-positive-500 mb-2">Wat kun je doen?</h4>
              <ul className="list-disc list-inside text-sm text-positive-700 dark:text-positive-500 space-y-1">
                <li>Meerdere broker accounts toevoegen</li>
                <li>Aandelen en ETFs bijhouden</li>
                <li>Je totale vermogen overzichtelijk zien</li>
                <li>Winst en verlies per positie bekijken</li>
              </ul>
            </div>
          </div>
        ),
        glossaryTerms: BEGINNER_TERMS.slice(0, 3),
      },
      {
        id: 'stocks',
        title: 'Aandelen & ETFs',
        shortTitle: 'Aandelen',
        description: 'De bouwstenen van je portfolio',
        icon: <Target className="w-6 h-6" />,
        content: (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Begin met het opbouwen van je portfolio door aandelen en ETFs toe te voegen.
              Dit vormt de basis van je beleggingsstrategie.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-primary-50 dark:bg-primary-900/20 p-3 rounded-lg">
                <h4 className="font-semibold text-primary-700 dark:text-primary-300 text-sm mb-1">Aandelen</h4>
                <p className="text-xs text-primary-700 dark:text-primary-300">
                  Individuele bedrijven zoals Apple, Microsoft, of ASML.
                </p>
              </div>
              <div className="bg-surface-subtle dark:bg-trading-dark-700 p-3 rounded-lg">
                <h4 className="font-semibold text-ink-800 dark:text-ink-200 text-sm mb-1">ETFs</h4>
                <p className="text-xs text-ink-700 dark:text-ink-300">
                  Gespreide fondsen zoals S&P500 of World ETF.
                </p>
              </div>
            </div>
          </div>
        ),
        glossaryTerms: BEGINNER_TERMS.slice(2, 6),
      },
      {
        id: 'journey',
        title: 'Jouw Leertraject',
        shortTitle: 'Leertraject',
        description: 'Groei stap voor stap naar expert niveau',
        icon: <GraduationCap className="w-6 h-6" />,
        content: (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              PayDay groeit met je mee. Je begint op de <strong>Groene Piste</strong> en
              kunt doorgroeien naar geavanceerdere strategieën.
            </p>
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Hoe ontgrendel je nieuwe levels?</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>Voltooi lessen en verdien credits</li>
                <li>Behaal achievements</li>
                <li>Bouw een dagelijkse streak op</li>
                <li>Of koop een level direct</li>
              </ul>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    level: 'medior',
    welcomeTitle: 'Welkom op de Blauwe Piste!',
    welcomeSubtitle: 'Ontdek de wereld van opties en premium income',
    slopeIcon: '🔵',
    slopeColor: 'blue',
    steps: [
      createIntroStep('medior'),
      {
        id: 'options-intro',
        title: 'Introductie Opties',
        shortTitle: 'Opties',
        description: 'Wat zijn opties en hoe werken ze?',
        icon: <Sparkles className="w-6 h-6" />,
        content: (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Opties geven je het <strong>recht</strong> (geen verplichting) om aandelen te kopen of verkopen
              tegen een vooraf bepaalde prijs. Je kunt ze ook <strong>verkopen</strong> om inkomen te genereren.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-positive-50 dark:bg-positive-700/15 p-3 rounded-lg border-l-4 border-positive-500">
                <h4 className="font-semibold text-positive-700 dark:text-positive-500 text-sm mb-1">CALL optie</h4>
                <p className="text-xs text-positive-700 dark:text-positive-500">
                  Recht om te <strong>kopen</strong> tegen de strike prijs.
                </p>
              </div>
              <div className="bg-negative-50 dark:bg-negative-700/15 p-3 rounded-lg border-l-4 border-negative-500">
                <h4 className="font-semibold text-negative-700 dark:text-negative-500 text-sm mb-1">PUT optie</h4>
                <p className="text-xs text-negative-700 dark:text-negative-500">
                  Recht om te <strong>verkopen</strong> tegen de strike prijs.
                </p>
              </div>
            </div>
            <div className="bg-caution-50 dark:bg-caution-600/15 p-3 rounded-lg">
              <p className="text-xs text-caution-600 dark:text-caution-500">
                <strong>Tip:</strong> 1 optiecontract = 100 aandelen
              </p>
            </div>
          </div>
        ),
        glossaryTerms: MEDIOR_TERMS.slice(0, 4),
      },
      {
        id: 'covered-calls',
        title: 'Covered Calls',
        shortTitle: 'Covered Calls',
        description: 'Genereer inkomen op je bestaande aandelen',
        icon: <TrendingUp className="w-6 h-6" />,
        content: (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Als je 100+ aandelen bezit, kun je <strong>covered calls</strong> verkopen.
              Je ontvangt premium en geeft de koper het recht om je aandelen te kopen.
            </p>
            <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg">
              <h4 className="font-semibold text-primary-700 dark:text-primary-300 mb-2">Voorbeeld:</h4>
              <ol className="list-decimal list-inside text-sm text-primary-700 dark:text-primary-300 space-y-1">
                <li>Je bezit 100 Apple aandelen @ $150</li>
                <li>Je verkoopt een call met strike $160</li>
                <li>Je ontvangt $3 premium ($300 totaal)</li>
                <li>Als Apple onder $160 blijft: je houdt alles</li>
              </ol>
            </div>
          </div>
        ),
        glossaryTerms: [MEDIOR_TERMS[4]],
      },
      {
        id: 'csp',
        title: 'Cash Secured Puts',
        shortTitle: 'CSP',
        description: 'Word betaald om aandelen te kopen',
        icon: <Target className="w-6 h-6" />,
        content: (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Met een <strong>Cash Secured Put</strong> verkoop je het recht aan iemand om jou aandelen te
              verkopen. Je ontvangt premium en koopt mogelijk de aandelen met korting.
            </p>
            <div className="bg-surface-subtle dark:bg-trading-dark-700 p-4 rounded-lg">
              <h4 className="font-semibold text-ink-800 dark:text-ink-200 mb-2">Voorbeeld:</h4>
              <ol className="list-decimal list-inside text-sm text-ink-700 dark:text-ink-300 space-y-1">
                <li>Apple staat op $150, je wilt kopen voor $140</li>
                <li>Je verkoopt een put met strike $140</li>
                <li>Je ontvangt $2.50 premium ($250 totaal)</li>
                <li>Als Apple daalt: je koopt voor $137.50 effectief</li>
              </ol>
            </div>
          </div>
        ),
        glossaryTerms: [MEDIOR_TERMS[5], MEDIOR_TERMS[7]],
      },
      {
        id: 'wheel',
        title: 'De Wheel Strategie',
        shortTitle: 'Wheel',
        description: 'Combineer CSP en Covered Calls',
        icon: <Zap className="w-6 h-6" />,
        content: (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              De <strong>Wheel</strong> is een eindeloze cyclus van premium ontvangen door CSPs
              en covered calls af te wisselen.
            </p>
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
              <div className="flex flex-wrap justify-center gap-2 text-xs">
                <span className="bg-surface-muted dark:bg-trading-dark-700 px-3 py-1 rounded-full">1. Verkoop CSP</span>
                <span className="text-gray-400">→</span>
                <span className="bg-primary-50 dark:bg-primary-900/30 px-3 py-1 rounded-full">2. Assignment</span>
                <span className="text-gray-400">→</span>
                <span className="bg-positive-50 dark:bg-positive-700/25 px-3 py-1 rounded-full">3. Verkoop CC</span>
                <span className="text-gray-400">→</span>
                <span className="bg-caution-50 dark:bg-caution-600/25 px-3 py-1 rounded-full">4. Called away</span>
                <span className="text-gray-400">→</span>
                <span className="text-gray-500">herhaal</span>
              </div>
            </div>
          </div>
        ),
        glossaryTerms: [MEDIOR_TERMS[6]],
      },
    ],
  },
  {
    level: 'senior',
    welcomeTitle: 'Welkom op de Rode Piste!',
    welcomeSubtitle: 'LEAPS, PMCC en geavanceerde strategieën',
    slopeIcon: '🔴',
    slopeColor: 'red',
    steps: [
      createIntroStep('senior'),
      {
        id: 'leaps',
        title: 'LEAPS Opties',
        shortTitle: 'LEAPS',
        description: 'Lange termijn opties met meer mogelijkheden',
        icon: <TrendingUp className="w-6 h-6" />,
        content: (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              <strong>LEAPS</strong> zijn opties met een looptijd van meer dan 1 jaar. Ze bieden
              leverage met minder tijdsrisico dan korte termijn opties.
            </p>
            <div className="bg-negative-50 dark:bg-negative-700/15 p-4 rounded-lg">
              <h4 className="font-semibold text-negative-700 dark:text-negative-500 mb-2">Voordelen van LEAPS:</h4>
              <ul className="list-disc list-inside text-sm text-negative-700 dark:text-negative-500 space-y-1">
                <li>Lagere theta decay (tijdsverlies)</li>
                <li>Meer tijd voor je thesis om uit te komen</li>
                <li>Kunnen dienen als onderpand voor andere strategieën</li>
              </ul>
            </div>
          </div>
        ),
        glossaryTerms: SENIOR_TERMS.slice(0, 2),
      },
      {
        id: 'pmcc',
        title: 'PMCC Strategie',
        shortTitle: 'PMCC',
        description: 'Poor Man\'s Covered Call uitgelegd',
        icon: <Target className="w-6 h-6" />,
        content: (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              De <strong>PMCC</strong> is een covered call strategie waarbij je een LEAP call
              gebruikt als onderpand in plaats van aandelen.
            </p>
            <div className="bg-gradient-to-r from-negative-50 to-caution-50 dark:from-red-900/20 dark:to-orange-900/20 p-4 rounded-lg">
              <h4 className="font-semibold text-negative-700 dark:text-negative-500 mb-2">Hoe werkt het?</h4>
              <ol className="list-decimal list-inside text-sm text-negative-700 dark:text-negative-500 space-y-1">
                <li>Koop een deep ITM LEAP call (delta 0.70+)</li>
                <li>Verkoop korte termijn OTM calls ertegen</li>
                <li>Ontvang premium terwijl je LEAP in waarde stijgt</li>
              </ol>
            </div>
          </div>
        ),
        glossaryTerms: [SENIOR_TERMS[2], SENIOR_TERMS[3]],
      },
      {
        id: 'greeks',
        title: 'Greeks Begrijpen',
        shortTitle: 'Greeks',
        description: 'Delta, Theta en meer',
        icon: <BookOpen className="w-6 h-6" />,
        content: (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              De <strong>Greeks</strong> zijn meetwaarden die beschrijven hoe een optie reageert
              op verschillende factoren.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-primary-50 dark:bg-primary-900/20 p-3 rounded-lg">
                <h4 className="font-semibold text-primary-700 dark:text-primary-300 text-sm">Delta (Δ)</h4>
                <p className="text-xs text-primary-700 dark:text-primary-300">Koersgevoeligheid</p>
              </div>
              <div className="bg-surface-subtle dark:bg-trading-dark-700 p-3 rounded-lg">
                <h4 className="font-semibold text-ink-800 dark:text-ink-200 text-sm">Theta (Θ)</h4>
                <p className="text-xs text-ink-700 dark:text-ink-300">Tijdsverval</p>
              </div>
            </div>
          </div>
        ),
        glossaryTerms: SENIOR_TERMS.slice(1, 5),
      },
      {
        id: 'rolling',
        title: 'Roll Management',
        shortTitle: 'Rollen',
        description: 'Posities aanpassen en beheren',
        icon: <Zap className="w-6 h-6" />,
        content: (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Rollen</strong> betekent een bestaande optiepositie sluiten en tegelijk een
              nieuwe openen. Dit helpt bij het beheren van posities.
            </p>
            <div className="bg-negative-50 dark:bg-negative-700/15 p-4 rounded-lg">
              <h4 className="font-semibold text-negative-700 dark:text-negative-500 mb-2">Wanneer rollen?</h4>
              <ul className="list-disc list-inside text-sm text-negative-700 dark:text-negative-500 space-y-1">
                <li><strong>Roll up:</strong> Koers stijgt, verhoog strike</li>
                <li><strong>Roll out:</strong> Verleng expiratie voor meer premium</li>
                <li><strong>Roll down:</strong> Koers daalt, verlaag strike</li>
              </ul>
            </div>
          </div>
        ),
        glossaryTerms: [SENIOR_TERMS[5], SENIOR_TERMS[6]],
      },
    ],
  },
  {
    level: 'expert',
    welcomeTitle: 'Welkom op de Zwarte Piste!',
    welcomeSubtitle: 'Je hebt alle strategieën ontgrendeld',
    slopeIcon: '⚫',
    slopeColor: 'black',
    steps: [
      createIntroStep('expert'),
      {
        id: 'spreads',
        title: 'Spreads',
        shortTitle: 'Spreads',
        description: 'Multi-leg strategieën voor beperkt risico',
        icon: <Target className="w-6 h-6" />,
        content: (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Spreads</strong> combineren meerdere opties om risico te beperken en
              specifieke marktvisies uit te drukken.
            </p>
            <div className="space-y-2">
              <div className="bg-positive-50 dark:bg-positive-700/15 p-3 rounded-lg">
                <h4 className="font-semibold text-positive-700 dark:text-positive-500 text-sm">Bull Call Spread</h4>
                <p className="text-xs text-positive-700 dark:text-positive-500">Bullish met beperkt risico</p>
              </div>
              <div className="bg-negative-50 dark:bg-negative-700/15 p-3 rounded-lg">
                <h4 className="font-semibold text-negative-700 dark:text-negative-500 text-sm">Bear Put Spread</h4>
                <p className="text-xs text-negative-700 dark:text-negative-500">Bearish met beperkt risico</p>
              </div>
            </div>
          </div>
        ),
        glossaryTerms: [EXPERT_TERMS[0]],
      },
      {
        id: 'iron-condor',
        title: 'Iron Condor',
        shortTitle: 'Iron Condor',
        description: 'Profiteer van zijwaartse markten',
        icon: <Zap className="w-6 h-6" />,
        content: (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              De <strong>Iron Condor</strong> is een neutrale strategie die wint als de koers
              binnen een range blijft.
            </p>
            <div className="bg-gray-100 dark:bg-gray-700/50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">4 Legs:</h4>
              <div className="space-y-1 text-sm">
                <p className="text-negative-600 dark:text-negative-500">• Koop put (laagste strike)</p>
                <p className="text-negative-600 dark:text-negative-500">• Verkoop put (lager-midden)</p>
                <p className="text-positive-600 dark:text-positive-500">• Verkoop call (hoger-midden)</p>
                <p className="text-positive-600 dark:text-positive-500">• Koop call (hoogste strike)</p>
              </div>
            </div>
          </div>
        ),
        glossaryTerms: [EXPERT_TERMS[1]],
      },
      {
        id: 'kaching',
        title: 'Ka-Ching Strategie',
        shortTitle: 'Ka-Ching',
        description: 'Maximaliseer je premium income',
        icon: <Sparkles className="w-6 h-6" />,
        content: (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              De <strong>Ka-Ching</strong> strategie combineert meerdere technieken voor
              optimale premium generatie.
            </p>
            <div className="bg-caution-50 dark:bg-caution-600/15 p-4 rounded-lg border border-caution-500/30 dark:border-caution-600/40">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-caution-600 dark:text-caution-500" />
                <h4 className="font-semibold text-caution-600 dark:text-caution-500">Ka-Ching Features</h4>
              </div>
              <ul className="list-disc list-inside text-sm text-caution-600 dark:text-caution-500 space-y-1">
                <li>Geoptimaliseerde strike selectie</li>
                <li>Automatische roll suggesties</li>
                <li>Premium tracking per positie</li>
              </ul>
            </div>
          </div>
        ),
        glossaryTerms: [EXPERT_TERMS[2]],
      },
      {
        id: 'advanced-greeks',
        title: 'Geavanceerde Greeks',
        shortTitle: 'Greeks+',
        description: 'Gamma, Vega en IV beheer',
        icon: <BookOpen className="w-6 h-6" />,
        content: (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Op expert niveau is begrip van <strong>Gamma</strong>, <strong>Vega</strong> en
              <strong> Implied Volatility</strong> essentieel.
            </p>
            <div className="space-y-2">
              <div className="bg-surface-subtle dark:bg-trading-dark-700 p-3 rounded-lg">
                <h4 className="font-semibold text-ink-800 dark:text-ink-200 text-sm">Gamma Risk</h4>
                <p className="text-xs text-ink-700 dark:text-ink-300">
                  Hoge gamma bij korte DTE = snelle delta veranderingen
                </p>
              </div>
              <div className="bg-primary-50 dark:bg-primary-900/20 p-3 rounded-lg">
                <h4 className="font-semibold text-primary-700 dark:text-primary-300 text-sm">IV Crush</h4>
                <p className="text-xs text-primary-700 dark:text-primary-300">
                  Na earnings daalt IV snel - timing is alles
                </p>
              </div>
            </div>
          </div>
        ),
        glossaryTerms: EXPERT_TERMS.slice(3),
      },
    ],
  },
  {
    level: 'offpiste',
    welcomeTitle: 'Welkom Off-piste!',
    welcomeSubtitle: 'Kwantitatief en data-gedreven traden voorbij de geprepareerde piste',
    slopeIcon: '🟠',
    slopeColor: 'orange',
    steps: [
      createIntroStep('offpiste'),
      {
        id: 'quant-intro',
        title: 'Wat is Quant Trading?',
        shortTitle: 'Quant',
        description: 'Data en regels in plaats van onderbuikgevoel',
        icon: <Zap className="w-6 h-6" />,
        content: (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Quant trading</strong> (kwantitatief beleggen) vervangt onderbuikgevoel door
              <strong> data, statistiek en vaste regels</strong>. Je bouwt een hypothese, test die op
              historische data, en laat de cijfers — niet je emoties — beslissen.
            </p>
            <div className="bg-caution-50 dark:bg-caution-600/15 p-4 rounded-lg border border-caution-500/30 dark:border-caution-600/40">
              <h4 className="font-semibold text-caution-600 dark:text-caution-500 mb-2">Discretionair vs. kwantitatief</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="font-semibold text-ink-700 dark:text-ink-200 mb-1">Discretionair</p>
                  <p className="text-ink-600 dark:text-ink-400">Beslissen per geval, op gevoel en nieuws.</p>
                </div>
                <div>
                  <p className="font-semibold text-caution-600 dark:text-caution-500 mb-1">Kwantitatief</p>
                  <p className="text-caution-600 dark:text-caution-500">Vaste, geteste regels die je consistent volgt.</p>
                </div>
              </div>
            </div>
            <div className="bg-negative-50 dark:bg-negative-700/15 p-3 rounded-lg">
              <p className="text-xs text-negative-700 dark:text-negative-500">
                <strong>Let op:</strong> off-piste betekent meer vrijheid én meer risico. Zonder discipline
                en risicobeheer kan een model je sneller pijn doen dan helpen.
              </p>
            </div>
          </div>
        ),
        glossaryTerms: OFFPISTE_TERMS.slice(0, 3),
      },
      {
        id: 'edge-backtest',
        title: 'Edge & Backtesting',
        shortTitle: 'Backtest',
        description: 'Een voordeel vinden en het bewijzen op historische data',
        icon: <Target className="w-6 h-6" />,
        content: (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Een winstgevende strategie heeft een <strong>edge</strong>: een herhaalbare, statistische
              reden waarom ze werkt. Die toon je aan met een <strong>backtest</strong> op historische data.
            </p>
            <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg">
              <h4 className="font-semibold text-primary-700 dark:text-primary-300 mb-2">Twee klassieke edges</h4>
              <ul className="list-disc list-inside text-sm text-primary-700 dark:text-primary-300 space-y-1">
                <li><strong>Mean reversion:</strong> koop het oversold, verkoop het overbought.</li>
                <li><strong>Momentum:</strong> rijd mee met wat al sterk stijgt.</li>
              </ul>
            </div>
            <div className="bg-surface-subtle dark:bg-trading-dark-700 p-3 rounded-lg">
              <p className="text-xs text-ink-700 dark:text-ink-300">
                <strong>Valkuil:</strong> overfitting. Een model dat perfect op het verleden past, faalt
                vaak in de praktijk. Houd je regels simpel en test op data die je niet gebruikt hebt om te bouwen.
              </p>
            </div>
          </div>
        ),
        glossaryTerms: [OFFPISTE_TERMS[1], OFFPISTE_TERMS[2], OFFPISTE_TERMS[5], OFFPISTE_TERMS[6]],
      },
      {
        id: 'risk-metrics',
        title: 'Risico & Metrics',
        shortTitle: 'Risico',
        description: 'Sharpe, drawdown en position sizing',
        icon: <BookOpen className="w-6 h-6" />,
        content: (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Rendement zonder risicobesef is gevaarlijk. Beoordeel een strategie altijd op
              <strong> voor risico gecorrigeerde</strong> maatstaven, niet alleen op winst.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-positive-50 dark:bg-positive-700/15 p-3 rounded-lg">
                <h4 className="font-semibold text-positive-700 dark:text-positive-500 text-sm">Sharpe Ratio</h4>
                <p className="text-xs text-positive-700 dark:text-positive-500">Rendement per eenheid risico. Hoger = beter.</p>
              </div>
              <div className="bg-negative-50 dark:bg-negative-700/15 p-3 rounded-lg">
                <h4 className="font-semibold text-negative-700 dark:text-negative-500 text-sm">Max Drawdown</h4>
                <p className="text-xs text-negative-700 dark:text-negative-500">Grootste val van piek naar dal. Kun je die uitzitten?</p>
              </div>
            </div>
            <div className="bg-caution-50 dark:bg-caution-600/15 p-3 rounded-lg border border-caution-500/30 dark:border-caution-600/40">
              <p className="text-xs text-caution-600 dark:text-caution-500">
                <strong>Position sizing:</strong> bepaal vóór elke trade hoeveel je riskeert (bv. max 1% per trade).
                Goede sizing houdt je in het spel, ook na een reeks verliezen.
              </p>
            </div>
          </div>
        ),
        glossaryTerms: [OFFPISTE_TERMS[3], OFFPISTE_TERMS[4], OFFPISTE_TERMS[8]],
      },
      {
        id: 'execution',
        title: 'Van Model naar Uitvoering',
        shortTitle: 'Uitvoering',
        description: 'Discipline, automatisering en valkuilen',
        icon: <Sparkles className="w-6 h-6" />,
        content: (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Een edge op papier is niets waard zonder <strong>gedisciplineerde uitvoering</strong>. De
              echte wereld voegt kosten en wrijving toe die je backtest vaak onderschat.
            </p>
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Houd rekening met</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li><strong>Slippage & kosten:</strong> elke trade kost iets; te vaak handelen vreet je edge op.</li>
                <li><strong>Regels volgen:</strong> de moeilijkste trade is die je model neemt en jij niet zou durven.</li>
                <li><strong>Blijf monitoren:</strong> markten veranderen — een edge kan uitdoven.</li>
              </ul>
            </div>
            <div className="bg-caution-50 dark:bg-caution-600/15 p-3 rounded-lg">
              <p className="text-xs text-caution-600 dark:text-caution-500">
                <strong>Tip:</strong> begin klein, log elke trade, en vergelijk je live resultaten met je backtest.
                Wijkt het sterk af? Onderzoek waarom vóór je opschaalt.
              </p>
            </div>
          </div>
        ),
        glossaryTerms: [OFFPISTE_TERMS[7]],
      },
    ],
  },
];

interface OnboardingWizardProps {
  level?: UserLevel;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  showDontShowAgain?: boolean;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  level,
  isOpen,
  onClose,
  onComplete,
  showDontShowAgain = true,
}) => {
  const currentUserLevel = useAppSelector(selectCurrentLevel);
  const wizardLevel = level || currentUserLevel;

  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);

  // Get content for this level
  const content = WIZARD_CONTENT.find(c => c.level === wizardLevel) || WIZARD_CONTENT[0];
  const totalSteps = content.steps.length;
  const currentStepData = content.steps[currentStep];

  // Reset step when wizard opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setShowGlossary(false);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
      setShowGlossary(false);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setShowGlossary(false);
    }
  };

  const handleComplete = () => {
    if (dontShowAgain) {
      // Store in localStorage that user doesn't want to see this level's wizard again
      const completed = JSON.parse(localStorage.getItem('wizard-completed') || '{}');
      completed[wizardLevel] = true;
      localStorage.setItem('wizard-completed', JSON.stringify(completed));
    }
    onComplete();
  };

  if (!isOpen) return null;

  // Piste marker shape that matches the mountain visualization.
  // Uses currentColor so it inherits from the parent.
  const PisteMarker: React.FC<{ size?: number }> = ({ size = 22 }) => {
    const color = content.slopeColor;
    return (
      <svg width={size} height={size} viewBox="-12 -12 24 24" aria-hidden="true">
        {color === 'green'  && <circle cx="0" cy="0" r="7.5" fill="currentColor" />}
        {color === 'blue'   && <rect x="-7" y="-7" width="14" height="14" fill="currentColor" />}
        {color === 'red'    && <rect x="-6.5" y="-6.5" width="13" height="13" fill="currentColor" transform="rotate(45)" />}
        {color === 'black'  && (
          <>
            <rect x="-10.5" y="-4.5" width="8.5" height="8.5" fill="currentColor" transform="rotate(45 -6.25 0)" />
            <rect x="2"     y="-4.5" width="8.5" height="8.5" fill="currentColor" transform="rotate(45 6.25 0)" />
          </>
        )}
        {color === 'orange' && <path d="M0,-9 L9,7 L-9,7 Z" fill="currentColor" />}
      </svg>
    );
  };

  const slopeColorClasses = {
    green: 'bg-positive-700',
    blue: 'bg-primary-700',
    red: 'bg-negative-700',
    black: 'bg-ink-900',
    orange: 'bg-caution-600',
  }[content.slopeColor] || 'bg-ink-700';

  const tabColorClasses = {
    green: 'border-positive-500 text-positive-700 dark:text-positive-500',
    blue: 'border-primary-500 text-primary-700 dark:text-primary-300',
    red: 'border-negative-500 text-negative-700 dark:text-negative-500',
    black: 'border-ink-800 text-ink-700 dark:text-ink-300',
    orange: 'border-caution-500 text-caution-600 dark:text-caution-500',
  }[content.slopeColor] || 'border-ink-500 text-ink-700';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {/* Fixed size container */}
      <div className="bg-white dark:bg-trading-dark-800 rounded-xl shadow-2xl w-full max-w-2xl h-[620px] flex flex-col m-4 overflow-hidden border border-[var(--line)] dark:border-trading-dark-700">
        {/* Header — restrained editorial bar with the slope's piste marker */}
        <div className={`${slopeColorClasses} px-6 py-5 text-white relative shrink-0`}>
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 p-1.5 hover:bg-white/15 rounded-md transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-md bg-white/10 ring-1 ring-white/20 flex items-center justify-center text-white shrink-0">
              <PisteMarker size={22} />
            </div>
            <div className="leading-tight">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/65 mb-1">PayDay · Curriculum</p>
              <h2 className="text-lg font-semibold tracking-tight">{content.welcomeTitle}</h2>
              <p className="text-white/75 text-[13px] mt-0.5">{content.welcomeSubtitle}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-[var(--line)] dark:border-trading-dark-700 bg-surface dark:bg-trading-dark-800/60 shrink-0">
          <div className="flex overflow-x-auto px-4 -mb-px">
            {content.steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => {
                  setCurrentStep(index);
                  setShowGlossary(false);
                }}
                className={`
                  px-3.5 py-2.5 text-[11px] uppercase tracking-[0.08em] font-semibold whitespace-nowrap border-b-2 transition-colors
                  ${index === currentStep
                    ? tabColorClasses
                    : 'border-transparent text-ink-400 hover:text-ink-700 dark:text-ink-400 dark:hover:text-ink-200'
                  }
                `}
              >
                {step.shortTitle}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          {/* Step Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className={`w-9 h-9 rounded-md ${slopeColorClasses} text-white flex items-center justify-center shrink-0`}>
              {currentStepData.icon}
            </div>
            <div className="leading-tight">
              <p className="text-[10px] uppercase tracking-[0.16em] text-ink-400 mb-0.5">
                Stap {currentStep + 1} van {totalSteps}
              </p>
              <h3 className="text-base font-semibold text-ink-900 dark:text-white tracking-tight">
                {currentStepData.title}
              </h3>
              <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">
                {currentStepData.description}
              </p>
            </div>
          </div>

          {/* Step Content */}
          <div className="mb-4">
            {currentStepData.content}
          </div>

          {/* Glossary Section */}
          {currentStepData.glossaryTerms && currentStepData.glossaryTerms.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <button
                onClick={() => setShowGlossary(!showGlossary)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors w-full"
              >
                <BookOpen className="w-4 h-4" />
                <span>Begrippen ({currentStepData.glossaryTerms.length})</span>
                <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${showGlossary ? 'rotate-90' : ''}`} />
              </button>

              {showGlossary && (
                <div className="mt-3 space-y-2">
                  {currentStepData.glossaryTerms.map((term, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3"
                    >
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                        {term.term}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {term.definition}
                      </p>
                      {term.example && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 italic">
                          Voorbeeld: {term.example}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--line)] dark:border-trading-dark-700 bg-surface dark:bg-trading-dark-800/60 px-6 py-3.5 shrink-0">
          <div className="flex items-center justify-between gap-4">
            {showDontShowAgain && (
              <label className="flex items-center gap-2 text-xs text-ink-500 dark:text-ink-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-ink-200 text-primary-700 focus:ring-primary-500"
                />
                <span>Niet meer tonen voor dit niveau</span>
              </label>
            )}

            <div className="flex gap-2 ml-auto items-center">
              <span className="text-[11px] text-ink-400 mr-1 tabular-nums">
                {currentStep + 1} / {totalSteps}
              </span>
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-ink-700 dark:text-ink-300 hover:bg-surface-subtle dark:hover:bg-trading-dark-700 rounded-md transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Vorige
                </button>
              )}
              <button
                onClick={handleNext}
                className={`inline-flex items-center gap-1.5 px-4 py-2 ${slopeColorClasses} text-white rounded-md text-sm font-semibold tracking-tight shadow-sm hover:opacity-95 transition-opacity`}
              >
                {currentStep === totalSteps - 1 ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Afronden
                  </>
                ) : (
                  <>
                    Volgende
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Export helper to check if wizard should be shown
export const shouldShowWizard = (level: UserLevel): boolean => {
  const completed = JSON.parse(localStorage.getItem('wizard-completed') || '{}');
  return !completed[level];
};

// Export helper to reset wizard for a level
export const resetWizardForLevel = (level: UserLevel): void => {
  const completed = JSON.parse(localStorage.getItem('wizard-completed') || '{}');
  delete completed[level];
  localStorage.setItem('wizard-completed', JSON.stringify(completed));
};

// Export helper to reset all wizards
export const resetAllWizards = (): void => {
  localStorage.removeItem('wizard-completed');
};
