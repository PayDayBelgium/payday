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
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
        <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
          <GraduationCap className="w-5 h-5" />
          Onze Aanpak
        </h4>
        <p className="text-sm text-blue-700 dark:text-blue-400 mb-3">
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
      <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-700">
        <p className="text-sm text-amber-800 dark:text-amber-300">
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
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2">Wat kun je doen?</h4>
              <ul className="list-disc list-inside text-sm text-green-700 dark:text-green-400 space-y-1">
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
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-800 dark:text-blue-300 text-sm mb-1">Aandelen</h4>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Individuele bedrijven zoals Apple, Microsoft, of ASML.
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                <h4 className="font-semibold text-purple-800 dark:text-purple-300 text-sm mb-1">ETFs</h4>
                <p className="text-xs text-purple-700 dark:text-purple-400">
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
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border-l-4 border-green-500">
                <h4 className="font-semibold text-green-800 dark:text-green-300 text-sm mb-1">CALL optie</h4>
                <p className="text-xs text-green-700 dark:text-green-400">
                  Recht om te <strong>kopen</strong> tegen de strike prijs.
                </p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border-l-4 border-red-500">
                <h4 className="font-semibold text-red-800 dark:text-red-300 text-sm mb-1">PUT optie</h4>
                <p className="text-xs text-red-700 dark:text-red-400">
                  Recht om te <strong>verkopen</strong> tegen de strike prijs.
                </p>
              </div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
              <p className="text-xs text-amber-800 dark:text-amber-300">
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
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Voorbeeld:</h4>
              <ol className="list-decimal list-inside text-sm text-blue-700 dark:text-blue-400 space-y-1">
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
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <h4 className="font-semibold text-purple-800 dark:text-purple-300 mb-2">Voorbeeld:</h4>
              <ol className="list-decimal list-inside text-sm text-purple-700 dark:text-purple-400 space-y-1">
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
                <span className="bg-purple-100 dark:bg-purple-900/50 px-3 py-1 rounded-full">1. Verkoop CSP</span>
                <span className="text-gray-400">→</span>
                <span className="bg-blue-100 dark:bg-blue-900/50 px-3 py-1 rounded-full">2. Assignment</span>
                <span className="text-gray-400">→</span>
                <span className="bg-green-100 dark:bg-green-900/50 px-3 py-1 rounded-full">3. Verkoop CC</span>
                <span className="text-gray-400">→</span>
                <span className="bg-amber-100 dark:bg-amber-900/50 px-3 py-1 rounded-full">4. Called away</span>
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
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
              <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">Voordelen van LEAPS:</h4>
              <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-400 space-y-1">
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
            <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 p-4 rounded-lg">
              <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">Hoe werkt het?</h4>
              <ol className="list-decimal list-inside text-sm text-red-700 dark:text-red-400 space-y-1">
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
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-800 dark:text-blue-300 text-sm">Delta (Δ)</h4>
                <p className="text-xs text-blue-700 dark:text-blue-400">Koersgevoeligheid</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                <h4 className="font-semibold text-purple-800 dark:text-purple-300 text-sm">Theta (Θ)</h4>
                <p className="text-xs text-purple-700 dark:text-purple-400">Tijdsverval</p>
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
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
              <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">Wanneer rollen?</h4>
              <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-400 space-y-1">
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
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                <h4 className="font-semibold text-green-800 dark:text-green-300 text-sm">Bull Call Spread</h4>
                <p className="text-xs text-green-700 dark:text-green-400">Bullish met beperkt risico</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                <h4 className="font-semibold text-red-800 dark:text-red-300 text-sm">Bear Put Spread</h4>
                <p className="text-xs text-red-700 dark:text-red-400">Bearish met beperkt risico</p>
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
                <p className="text-red-600 dark:text-red-400">• Koop put (laagste strike)</p>
                <p className="text-red-600 dark:text-red-400">• Verkoop put (lager-midden)</p>
                <p className="text-green-600 dark:text-green-400">• Verkoop call (hoger-midden)</p>
                <p className="text-green-600 dark:text-green-400">• Koop call (hoogste strike)</p>
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
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-300">Ka-Ching Features</h4>
              </div>
              <ul className="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
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
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                <h4 className="font-semibold text-purple-800 dark:text-purple-300 text-sm">Gamma Risk</h4>
                <p className="text-xs text-purple-700 dark:text-purple-400">
                  Hoge gamma bij korte DTE = snelle delta veranderingen
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-800 dark:text-blue-300 text-sm">IV Crush</h4>
                <p className="text-xs text-blue-700 dark:text-blue-400">
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

  const slopeColorClasses = {
    green: 'from-green-500 to-emerald-600',
    blue: 'from-blue-500 to-indigo-600',
    red: 'from-red-500 to-rose-600',
    black: 'from-gray-700 to-gray-900',
  }[content.slopeColor] || 'from-gray-500 to-gray-600';

  const tabColorClasses = {
    green: 'border-green-500 text-green-700 dark:text-green-400',
    blue: 'border-blue-500 text-blue-700 dark:text-blue-400',
    red: 'border-red-500 text-red-700 dark:text-red-400',
    black: 'border-gray-700 text-gray-700 dark:text-gray-300',
  }[content.slopeColor] || 'border-gray-500 text-gray-700';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {/* Fixed size container */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col m-4">
        {/* Header - Fixed height */}
        <div className={`bg-gradient-to-r ${slopeColorClasses} p-4 text-white relative rounded-t-2xl shrink-0`}>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <span className="text-3xl">{content.slopeIcon}</span>
            <div>
              <h2 className="text-xl font-bold">{content.welcomeTitle}</h2>
              <p className="text-white/80 text-sm">{content.welcomeSubtitle}</p>
            </div>
          </div>
        </div>

        {/* Tabs - Fixed height */}
        <div className="border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex overflow-x-auto px-2 -mb-px">
            {content.steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => {
                  setCurrentStep(index);
                  setShowGlossary(false);
                }}
                className={`
                  px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors
                  ${index === currentStep
                    ? tabColorClasses
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
              >
                {step.shortTitle}
              </button>
            ))}
          </div>
        </div>

        {/* Content - Scrollable with fixed height */}
        <div className="flex-1 overflow-y-auto p-5 min-h-0">
          {/* Step Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg bg-gradient-to-r ${slopeColorClasses} text-white shrink-0`}>
              {currentStepData.icon}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {currentStepData.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
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

        {/* Footer - Fixed height */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 shrink-0">
          <div className="flex items-center justify-between">
            {/* Don't show again checkbox */}
            {showDontShowAgain && (
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                />
                <span>Niet meer tonen voor dit niveau</span>
              </label>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-2 ml-auto">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-1 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Vorige
                </button>
              )}
              <button
                onClick={handleNext}
                className={`flex items-center gap-1 px-4 py-2 bg-gradient-to-r ${slopeColorClasses} text-white rounded-lg font-medium hover:opacity-90 transition-opacity`}
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
