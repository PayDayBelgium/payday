import type { EducationChapter, UserLevel } from '../types';

// =====================================================
// LEVEL 1: BEGINNER - Groene Piste
// De basis: Brokers, Aandelen, ETFs, Dividenden
// =====================================================

const beginnerChapters: EducationChapter[] = [
  {
    id: 'ch-b-1',
    level: 'beginner',
    title: 'Wat is een Broker?',
    description: 'Alles over brokers: wat ze doen, hoe je er eentje kiest, en het verschil tussen binnenlandse en buitenlandse brokers.',
    icon: '🏦',
    order: 1,
    estimatedDuration: '20 min',
    lessons: [
      {
        id: 'les-b-1-1',
        chapterId: 'ch-b-1',
        title: 'De Rol van een Broker',
        order: 1,
        creditsAwarded: 10,
        estimatedDuration: '8 min',
        content: [
          {
            type: 'heading',
            content: 'Wat doet een broker?'
          },
          {
            type: 'text',
            content: 'Een broker is een tussenpersoon die jou toegang geeft tot de financiële markten. Zonder broker kun je geen aandelen, ETFs of opties kopen. De broker voert jouw orders uit op de beurs en houdt je effecten veilig in bewaring.'
          },
          {
            type: 'analogy',
            content: 'Stel je voor dat de beurs een exclusieve club is. De broker is je lidmaatschap dat je toegang geeft. Zonder lidmaatschap kom je er simpelweg niet in.',
            caption: 'De Broker als Toegangspoort'
          },
          {
            type: 'definition',
            term: 'Broker',
            content: 'Een financiële instelling die als tussenpersoon fungeert tussen jou en de effectenbeurs. Ze voeren aan- en verkooporders uit namens klanten.'
          },
          {
            type: 'heading',
            content: 'Wat krijg je van een broker?'
          },
          {
            type: 'list',
            content: 'Diensten die een broker biedt:',
            items: [
              'Toegang tot beurzen (NYSE, NASDAQ, Euronext, etc.)',
              'Een effectenrekening om je beleggingen te bewaren',
              'Een handelsplatform (website of app) om orders te plaatsen',
              'Realtime koersen en marktinformatie',
              'Rapportages voor je belastingaangifte'
            ]
          },
          {
            type: 'callout',
            variant: 'info',
            content: 'Je effecten zijn juridisch van jou, niet van de broker. Als een broker failliet gaat, blijven jouw aandelen en ETFs beschermd. In de EU geldt een bescherming tot €20.000 via het depositogarantiestelsel voor effecten.'
          }
        ],
        quiz: {
          passingScore: 70,
          questions: [
            {
              id: 'q-b-1-1-1',
              question: 'Wat is de hoofdfunctie van een broker?',
              options: [
                'Beleggingsadvies geven',
                'Orders uitvoeren op de beurs namens klanten',
                'Aandelen uitgeven voor bedrijven',
                'Dividenden uitbetalen'
              ],
              correctIndex: 1,
              explanation: 'De hoofdfunctie van een broker is het uitvoeren van aan- en verkooporders op de beurs namens klanten. Advies en andere diensten zijn optioneel.'
            },
            {
              id: 'q-b-1-1-2',
              question: 'Wat gebeurt er met je aandelen als je broker failliet gaat?',
              options: [
                'Je verliest alles',
                'Je krijgt maximaal €100 terug',
                'Je effecten blijven van jou en zijn beschermd',
                'De overheid koopt je aandelen over'
              ],
              correctIndex: 2,
              explanation: 'Je effecten zijn juridisch jouw eigendom en worden gescheiden van het vermogen van de broker. Bij faillissement worden ze overgedragen naar een andere broker.'
            }
          ]
        }
      },
      {
        id: 'les-b-1-2',
        chapterId: 'ch-b-1',
        title: 'Binnenlandse vs Buitenlandse Brokers',
        order: 2,
        creditsAwarded: 15,
        estimatedDuration: '12 min',
        content: [
          {
            type: 'heading',
            content: 'Het grote verschil'
          },
          {
            type: 'text',
            content: 'Als Belgische belegger heb je de keuze tussen binnenlandse brokers (zoals Bolero van KBC, Keytrade, Binckbank) en buitenlandse brokers (zoals DEGIRO, Interactive Brokers, LYNX). Dit verschil heeft belangrijke gevolgen voor je administratie en belastingen.'
          },
          {
            type: 'comparison',
            content: 'Vergelijking brokers',
            leftTitle: '🇧🇪 Binnenlandse Broker',
            rightTitle: '🌍 Buitenlandse Broker',
            leftItems: [
              'Houdt automatisch TOB in',
              'Rapporteert aan Belgische fiscus',
              'Meestal hogere transactiekosten',
              'Geen extra administratie nodig',
              'Belgische klantenservice'
            ],
            rightItems: [
              'Jij moet zelf TOB betalen',
              'Je moet rekening aangeven (CAP-formulier)',
              'Vaak lagere transactiekosten',
              'Meer eigen administratie',
              'Bredere toegang tot markten'
            ]
          },
          {
            type: 'callout',
            variant: 'warning',
            content: 'Bij een buitenlandse broker moet je jaarlijks je rekening aangeven via het CAP-formulier (Centraal Aanspreekpunt van de Nationale Bank). Dit is verplicht voor alle buitenlandse rekeningen!'
          },
          {
            type: 'definition',
            term: 'CAP-formulier',
            content: 'Het formulier waarmee je buitenlandse rekeningen (inclusief effectenrekeningen) aangeeft bij de Nationale Bank van België. Deadline is meestal 30 juni voor rekeningen van het voorgaande jaar.'
          },
          {
            type: 'heading',
            content: 'Wat moet je doen bij een buitenlandse broker?'
          },
          {
            type: 'list',
            content: 'Verplichtingen bij een buitenlandse broker:',
            items: [
              'Rekening aangeven via CAP-formulier (Nationale Bank)',
              'Zelf TOB (Taks op Beursverrichtingen) berekenen en betalen',
              'Buitenlandse dividenden correct aangeven in je belastingaangifte',
              'Eventuele roerende voorheffing verrekenen'
            ]
          },
          {
            type: 'callout',
            variant: 'tip',
            content: 'Veel beleggers kiezen toch voor een buitenlandse broker vanwege de lagere kosten. Bij actief handelen kan dit duizenden euros per jaar schelen. De extra administratie is het vaak waard.'
          }
        ],
        quiz: {
          passingScore: 70,
          questions: [
            {
              id: 'q-b-1-2-1',
              question: 'Wat is een voordeel van een binnenlandse broker?',
              options: [
                'Lagere transactiekosten',
                'Automatische inhouding van TOB',
                'Meer beurzen beschikbaar',
                'Geen belastingaangifte nodig'
              ],
              correctIndex: 1,
              explanation: 'Binnenlandse brokers houden automatisch TOB in en rapporteren aan de fiscus, wat je administratie vereenvoudigt.'
            },
            {
              id: 'q-b-1-2-2',
              question: 'Wat moet je doen als je een buitenlandse broker gebruikt?',
              options: [
                'Niets speciaals',
                'Alleen de rekening afsluiten na elk jaar',
                'De rekening aangeven via het CAP-formulier',
                'Een Belgische mede-rekeninghouder toevoegen'
              ],
              correctIndex: 2,
              explanation: 'Bij een buitenlandse broker moet je de rekening verplicht aangeven via het CAP-formulier bij de Nationale Bank.'
            }
          ]
        }
      },
      {
        id: 'les-b-1-3',
        chapterId: 'ch-b-1',
        title: 'Broker Kiezen voor Opties',
        order: 3,
        creditsAwarded: 15,
        estimatedDuration: '10 min',
        content: [
          {
            type: 'heading',
            content: 'Niet elke broker ondersteunt opties!'
          },
          {
            type: 'text',
            content: 'Dit is een cruciaal punt dat veel beginners over het hoofd zien: niet alle brokers bieden opties aan. Als je later opties wilt verhandelen (wat je bij PayDay leert), moet je hier nu al rekening mee houden.'
          },
          {
            type: 'callout',
            variant: 'warning',
            content: 'Als je nu een broker kiest zonder optiemogelijkheden, moet je later je posities verhuizen naar een andere broker. Dit kost tijd, geld (transferkosten), en je mist ondertussen inkomsten die je had kunnen genereren.'
          },
          {
            type: 'heading',
            content: 'Waar moet je op letten?'
          },
          {
            type: 'list',
            content: 'Checklist bij het kiezen van een broker:',
            items: [
              'Worden opties ondersteund? (niet alleen aandelen en ETFs)',
              'Welke markten zijn beschikbaar? (VS-opties zijn het meest liquide)',
              'Wat zijn de kosten per optiecontract?',
              'Is er een minimum accountgrootte?',
              'Hoe goed is het handelsplatform voor opties?'
            ]
          },
          {
            type: 'table',
            content: 'Broker vergelijking voor opties',
            columns: ['Broker', 'Opties US', 'Opties EU', 'Kosten/contract', 'Geschikt voor'],
            rows: [
              ['Interactive Brokers', 'Ja', 'Ja', '±€1.25', 'Serieuze traders'],
              ['LYNX', 'Ja', 'Ja', '±€3.00', 'Nederlandstalige service'],
              ['DEGIRO', 'Beperkt', 'Ja', '±€0.75', 'Beginners (beperkte opties)'],
              ['Bolero', 'Nee', 'Beperkt', 'N/A', 'Alleen aandelen/ETFs'],
              ['Saxo Bank', 'Ja', 'Ja', '±€3.00', 'Uitgebreide markten']
            ]
          },
          {
            type: 'analogy',
            content: 'Money Left on the Table: Ik had jarenlang aandelen staan bij een broker zonder Amerikaanse opties. Het verplaatsen naar Interactive Brokers kostte me €200 aan transferkosten. Maar nu genereer ik elke maand meer dan €200 aan premium door covered calls te schrijven op diezelfde aandelen. Die €200 verhuiskosten heb ik in één maand terugverdiend - en sindsdien is het pure winst!',
            caption: 'Praktijkvoorbeeld'
          },
          {
            type: 'callout',
            variant: 'tip',
            content: 'Als je nu begint, kies direct een broker die opties ondersteunt. Ook al gebruik je ze nog niet - je bespaart jezelf later veel gedoe. Interactive Brokers en LYNX zijn populaire keuzes voor Belgische opties traders.'
          }
        ],
        quiz: {
          passingScore: 70,
          questions: [
            {
              id: 'q-b-1-3-1',
              question: 'Waarom is het belangrijk om nu al een broker te kiezen die opties ondersteunt?',
              options: [
                'Omdat opties verplicht zijn',
                'Om later niet te moeten verhuizen en inkomsten mis te lopen',
                'Omdat het goedkoper is',
                'Dat is niet belangrijk'
              ],
              correctIndex: 1,
              explanation: 'Als je later opties wilt gebruiken en je broker ondersteunt ze niet, moet je verhuizen. Dit kost geld en tijd, en je mist ondertussen potentieel inkomen.'
            }
          ]
        }
      }
    ]
  },
  {
    id: 'ch-b-0',
    level: 'beginner',
    title: 'De PayDay Filosofie',
    description: 'Voordat je begint: de belangrijkste principes voor succesvol en verantwoord beleggen.',
    icon: '🎯',
    order: 0,
    estimatedDuration: '25 min',
    lessons: [
      {
        id: 'les-b-0-1',
        chapterId: 'ch-b-0',
        title: 'Wat is PayDay?',
        order: 1,
        creditsAwarded: 15,
        estimatedDuration: '10 min',
        content: [
          {
            type: 'heading',
            content: 'Welkom bij PayDay'
          },
          {
            type: 'text',
            content: 'PayDay is gebouwd met één doel: je leren hoe je verantwoord met opties kunt omgaan. Niet om snel rijk te worden - dat is niet realistisch. Wel om consistent inkomen te genereren op een slimme, verantwoorde manier.'
          },
          {
            type: 'callout',
            variant: 'info',
            content: 'Het is niet moeilijk. Je moet gewoon even wat tijd nemen om de zaken te begrijpen. En daar helpt PayDay je bij, stap voor stap.'
          },
          {
            type: 'heading',
            content: 'Wat leer je hier?'
          },
          {
            type: 'list',
            content: 'De PayDay aanpak:',
            items: [
              'Je kapitaal beschermen met opties als verzekering',
              'Inkomen genereren op je bestaande aandelenportfolio',
              'Verantwoord omgaan met risico',
              'Emoties uit je trading halen met een regelgebaseerde aanpak',
              'Consistent kleine winsten maken in plaats van te gokken op grote slagen'
            ]
          },
          {
            type: 'comparison',
            content: 'PayDay vs Speculeren',
            leftTitle: '✅ PayDay Aanpak',
            rightTitle: '❌ Speculeren',
            leftItems: [
              'Consistent, klein inkomen',
              'Gedekt risico',
              'Lange termijn denken',
              'Regelgebaseerd handelen',
              'Je begrijpt wat je doet'
            ],
            rightItems: [
              'Hopen op grote winsten',
              'Onbeperkt risico',
              'Korte termijn gokken',
              'Emotionele beslissingen',
              'Tips van anderen volgen'
            ]
          },
          {
            type: 'callout',
            variant: 'tip',
            content: 'Een regelgebaseerde aanpak haalt de emotie uit je beslissingen. Je weet vooraf wanneer je instapt, wanneer je winst neemt, en wanneer je verlies accepteert. Dit maakt je veel consistenter.'
          }
        ]
      },
      {
        id: 'les-b-0-2',
        chapterId: 'ch-b-0',
        title: 'Gouden Regels voor Beleggen',
        order: 2,
        creditsAwarded: 20,
        estimatedDuration: '15 min',
        content: [
          {
            type: 'heading',
            content: 'Regel 1: Beleg alleen geld dat je kunt missen'
          },
          {
            type: 'text',
            content: 'Dit is de allerbelangrijkste regel. Beleg NOOIT geld dat je nodig hebt voor je dagelijkse uitgaven, je noodfonds, of grote aankopen op korte termijn. De beurs kan volatiel zijn - je moet kunnen wachten zonder gedwongen te verkopen.'
          },
          {
            type: 'callout',
            variant: 'warning',
            content: 'Heb je geen noodfonds van 3-6 maanden uitgaven? Bouw dat EERST op voordat je gaat beleggen. Een noodfonds moet liquide en veilig zijn - niet op de beurs.'
          },
          {
            type: 'heading',
            content: 'Regel 2: Doe je huiswerk'
          },
          {
            type: 'text',
            content: 'Koop geen aandelen omdat iemand het zegt, of omdat je het ergens gelezen hebt. Begrijp WAT je koopt en WAAROM. Heb je eigen overtuiging in een bedrijf? Snap je het businessmodel? Geloof je in de toekomst?'
          },
          {
            type: 'analogy',
            content: 'Denk aan beleggen als het kopen van een deel van een bedrijf - want dat is het letterlijk. Zou je een winkel kopen zonder te weten wat ze verkopen, wie de klanten zijn, en of ze winst maken? Natuurlijk niet. Behandel aandelen hetzelfde.',
            caption: 'Je Koopt Een Bedrijf'
          },
          {
            type: 'heading',
            content: 'Regel 3: Kies aandelen waar je achter staat'
          },
          {
            type: 'text',
            content: 'Selecteer aandelen waar je zelf overtuiging in hebt, waar je je goed bij voelt. Dit is belangrijk omdat je ze soms lang moet vasthouden, ook als de koers daalt. Als je niet gelooft in het bedrijf, verkoop je in paniek bij de eerste dip.'
          },
          {
            type: 'list',
            content: 'Vragen om jezelf te stellen:',
            items: [
              'Begrijp ik wat dit bedrijf doet?',
              'Gebruik ik hun producten of diensten zelf?',
              'Geloof ik dat dit bedrijf over 10 jaar nog bestaat en groeit?',
              'Zou ik meer kopen als de prijs 20% daalt?',
              'Kan ik rustig slapen met dit aandeel in mijn portfolio?'
            ]
          },
          {
            type: 'heading',
            content: 'Regel 4: Risico en Beloning in Balans'
          },
          {
            type: 'text',
            content: 'Vraag jezelf altijd af: is de potentiële beloning het risico waard? Soms is het slimmer om een positie te sluiten, ook al kun je nog wat verdienen.'
          },
          {
            type: 'example',
            content: 'Voorbeeld:\nJe hebt een optie verkocht en 80% van de winst al binnen. De resterende €15 verdien je in 2 weken.\n\nVraag: Is €15 extra het waard om 2 weken langer risico te lopen?\n\nSlimme keuze: Koop terug, neem de winst, en open een nieuwe positie. Je haalt het risico van tafel én je kunt direct nieuwe premium ontvangen.',
            caption: 'Risk-Reward Afweging'
          },
          {
            type: 'callout',
            variant: 'tip',
            content: 'Bij 50% winst sluiten is vaak slimmer dan wachten op 100%. De laatste 50% duurt vaak net zo lang als de eerste 50%, maar met meer risico. Time is money!'
          }
        ],
        quiz: {
          passingScore: 70,
          questions: [
            {
              id: 'q-b-0-2-1',
              question: 'Wanneer mag je geld beleggen?',
              options: [
                'Zodra je een inkomen hebt',
                'Alleen geld dat je kunt missen, na je noodfonds',
                'Je hele spaargeld voor maximaal rendement',
                'Geleend geld voor extra hefboom'
              ],
              correctIndex: 1,
              explanation: 'Beleg alleen geld dat je kunt missen. Zorg eerst voor een noodfonds van 3-6 maanden uitgaven voordat je begint met beleggen.'
            },
            {
              id: 'q-b-0-2-2',
              question: 'Je hebt 80% winst op een optie. Wat is vaak de slimste keuze?',
              options: [
                'Wachten op 100% winst',
                'De winst nemen en een nieuwe positie openen',
                'Nog meer bijkopen',
                'Wachten tot expiratie'
              ],
              correctIndex: 1,
              explanation: 'Bij 50-80% winst is het vaak slim om te sluiten. Je haalt risico van tafel en kunt direct nieuwe premium ontvangen. De laatste procenten kosten veel tijd en risico.'
            }
          ]
        }
      }
    ]
  },
  {
    id: 'ch-b-2',
    level: 'beginner',
    title: 'Wat zijn Aandelen?',
    description: 'Begrijp wat aandelen zijn, hoe je ze koopt, en wat bied- en laatprijzen betekenen.',
    icon: '📈',
    order: 2,
    estimatedDuration: '25 min',
    lessons: [
      {
        id: 'les-b-2-1',
        chapterId: 'ch-b-2',
        title: 'Aandelen Uitgelegd',
        order: 1,
        creditsAwarded: 10,
        estimatedDuration: '10 min',
        content: [
          {
            type: 'heading',
            content: 'Wat is een aandeel?'
          },
          {
            type: 'text',
            content: 'Een aandeel is een eigendomsbewijs van een stukje van een bedrijf. Als je 1 aandeel Apple koopt, ben je letterlijk mede-eigenaar van Apple. Je bezit dan een heel klein deel van alle gebouwen, producten, patenten en winsten van het bedrijf.'
          },
          {
            type: 'analogy',
            content: 'Stel je voor dat een bedrijf een pizza is die in 1 miljard stukjes is gesneden. Elk stukje is een aandeel. Als je 100 stukjes koopt, bezit je 100 miljoenste van de pizza - inclusief alle toppings (winsten)!',
            caption: 'De Pizza-Analogie'
          },
          {
            type: 'definition',
            term: 'Aandeel (Stock/Share)',
            content: 'Een effect dat eigendom vertegenwoordigt in een bedrijf. Aandeelhouders hebben recht op een deel van de winst (via dividend) en stemrecht op de aandeelhoudersvergadering.'
          },
          {
            type: 'heading',
            content: 'Waarom kopen mensen aandelen?'
          },
          {
            type: 'list',
            content: 'Redenen om aandelen te kopen:',
            items: [
              'Koerswinst: Je hoopt dat de prijs stijgt en je met winst kunt verkopen',
              'Dividend: Sommige bedrijven keren een deel van de winst uit aan aandeelhouders',
              'Bescherming tegen inflatie: Aandelen stijgen historisch sneller dan inflatie',
              'Mede-eigenaarschap: Je profiteert mee van het succes van bedrijven'
            ]
          },
          {
            type: 'callout',
            variant: 'info',
            content: 'Historisch gezien leveren aandelen gemiddeld 7-10% rendement per jaar op (inclusief dividend). Maar let op: in individuele jaren kan het rendement sterk variëren, van -40% tot +50%!'
          }
        ]
      },
      {
        id: 'les-b-2-2',
        chapterId: 'ch-b-2',
        title: 'Bied- en Laatprijs',
        order: 2,
        creditsAwarded: 15,
        estimatedDuration: '15 min',
        content: [
          {
            type: 'heading',
            content: 'De twee prijzen van een aandeel'
          },
          {
            type: 'text',
            content: 'Als je een aandeel wilt kopen of verkopen, zie je altijd twee prijzen: de biedprijs (bid) en de laatprijs (ask). Dit verschil heet de spread en is cruciaal om te begrijpen.'
          },
          {
            type: 'definition',
            term: 'Biedprijs (Bid)',
            content: 'De hoogste prijs die kopers op dit moment bereid zijn te betalen. Als jij wilt verkopen, krijg je de biedprijs.'
          },
          {
            type: 'definition',
            term: 'Laatprijs (Ask)',
            content: 'De laagste prijs waarvoor verkopers bereid zijn te verkopen. Als jij wilt kopen, betaal je de laatprijs.'
          },
          {
            type: 'definition',
            term: 'Spread',
            content: 'Het verschil tussen de bied- en laatprijs. Een kleinere spread betekent een meer liquide markt en lagere handelskosten voor jou.'
          },
          {
            type: 'example',
            content: 'Apple aandeel:\n• Biedprijs: $174.50 (hier kun je verkopen)\n• Laatprijs: $174.52 (hier kun je kopen)\n• Spread: $0.02 (0.01%)\n\nAls je koopt voor $174.52 en direct verkoopt, verlies je $0.02 per aandeel door de spread.',
            caption: 'Voorbeeld: Bied/Laat bij Apple'
          },
          {
            type: 'callout',
            variant: 'tip',
            content: 'Bij zeer liquide aandelen (Apple, Microsoft, etc.) is de spread vaak maar een paar cent. Bij kleine, weinig verhandelde aandelen kan de spread oplopen tot enkele procenten. Let hier altijd op!'
          },
          {
            type: 'heading',
            content: 'Order types'
          },
          {
            type: 'comparison',
            content: 'Soorten orders',
            leftTitle: 'Market Order',
            rightTitle: 'Limit Order',
            leftItems: [
              'Koopt/verkoopt direct tegen beste prijs',
              'Zekerheid van uitvoering',
              'Je betaalt de laatprijs (kopen)',
              'Je krijgt de biedprijs (verkopen)',
              'Risico op slechtere prijs bij lage liquiditeit'
            ],
            rightItems: [
              'Je specificeert exact je gewenste prijs',
              'Order wordt alleen uitgevoerd bij die prijs',
              'Mogelijk niet uitgevoerd als prijs niet bereikt wordt',
              'Beschermt tegen onverwachte prijsschommelingen',
              'Aanbevolen voor beginners'
            ]
          },
          {
            type: 'callout',
            variant: 'warning',
            content: 'Gebruik bij voorkeur limit orders, vooral bij minder liquide aandelen of in volatiele markten. Zo voorkom je dat je veel meer betaalt dan verwacht.'
          }
        ],
        quiz: {
          passingScore: 70,
          questions: [
            {
              id: 'q-b-2-2-1',
              question: 'Je wilt een aandeel kopen. Welke prijs betaal je bij een market order?',
              options: [
                'De biedprijs',
                'De laatprijs',
                'Het gemiddelde van bied en laat',
                'De slotkoers van gisteren'
              ],
              correctIndex: 1,
              explanation: 'Bij een market order om te kopen betaal je de laatprijs (ask), de laagste prijs waarvoor iemand bereid is te verkopen.'
            },
            {
              id: 'q-b-2-2-2',
              question: 'Wat is de spread?',
              options: [
                'De dagelijkse prijsverandering',
                'Het verschil tussen bied- en laatprijs',
                'De commissie van de broker',
                'Het dividend percentage'
              ],
              correctIndex: 1,
              explanation: 'De spread is het verschil tussen de biedprijs (bid) en laatprijs (ask). Dit is een verborgen kostenpost bij elke transactie.'
            }
          ]
        }
      },
      {
        id: 'les-b-2-3',
        chapterId: 'ch-b-2',
        title: 'Liquiditeit: Waarom Het Belangrijk Is',
        order: 3,
        creditsAwarded: 15,
        estimatedDuration: '10 min',
        content: [
          {
            type: 'heading',
            content: 'Wat is liquiditeit?'
          },
          {
            type: 'text',
            content: 'Liquiditeit meet hoe makkelijk je een aandeel kunt kopen of verkopen zonder de prijs significant te beïnvloeden. Hoge liquiditeit = veel kopers en verkopers = kleine spread = makkelijk handelen.'
          },
          {
            type: 'definition',
            term: 'Liquiditeit',
            content: 'De mate waarin een asset snel gekocht of verkocht kan worden tegen een stabiele prijs. Hoge liquiditeit betekent veel handelsvolume en een kleine spread.'
          },
          {
            type: 'heading',
            content: 'Waarom is liquiditeit cruciaal voor opties?'
          },
          {
            type: 'text',
            content: 'Voor opties trading is liquiditeit extra belangrijk. Niet alleen het aandeel moet liquide zijn, ook de opties zelf. Bij illiquide opties betaal je veel te veel (of krijg je veel te weinig) door de brede spread.'
          },
          {
            type: 'comparison',
            content: 'Liquide vs Illiquide',
            leftTitle: '💧 Liquide Aandeel (Apple)',
            rightTitle: '🏜️ Illiquide Aandeel (Klein bedrijf)',
            leftItems: [
              'Miljoenen aandelen per dag verhandeld',
              'Spread: $0.01 (0.005%)',
              'Opties beschikbaar met kleine spread',
              'Direct kopen/verkopen mogelijk',
              'Prijs beweegt niet door jouw order'
            ],
            rightItems: [
              'Duizenden aandelen per dag verhandeld',
              'Spread: $0.50 (2%+)',
              'Opties vaak niet beschikbaar of brede spread',
              'Kan dagen duren om te verkopen',
              'Jouw order kan de prijs beïnvloeden'
            ]
          },
          {
            type: 'callout',
            variant: 'warning',
            content: 'Voor optie trading: kies aandelen met gemiddeld dagelijks volume van minstens 1 miljoen aandelen. Dit garandeert ook liquide opties. Bekende namen als Apple, Microsoft, Amazon, Tesla hebben uitstekende liquiditeit.'
          },
          {
            type: 'list',
            content: 'Hoe herken je liquide aandelen:',
            items: [
              'Hoog gemiddeld dagelijks volume (>1 miljoen)',
              'Kleine bid-ask spread (<0.1%)',
              'Opties beschikbaar met wekelijkse expiraties',
              'Veel open interest in de optie chains',
              'Bekende bedrijven met grote marktkapitalisatie'
            ]
          },
          {
            type: 'callout',
            variant: 'tip',
            content: 'Begin met de meest liquide aandelen om opties te leren. Later, met meer ervaring, kun je kleinere namen overwegen. Maar onthoud: illiquiditeit kost geld!'
          }
        ],
        quiz: {
          passingScore: 70,
          questions: [
            {
              id: 'q-b-2-3-1',
              question: 'Waarom is liquiditeit extra belangrijk voor opties trading?',
              options: [
                'Omdat opties duurder zijn',
                'Omdat illiquide opties brede spreads hebben die je geld kosten',
                'Omdat je sneller rijk wordt',
                'Liquiditeit is niet belangrijk voor opties'
              ],
              correctIndex: 1,
              explanation: 'Bij illiquide opties is de spread breed, waardoor je te veel betaalt bij kopen en te weinig krijgt bij verkopen. Dit vreet aan je rendement.'
            }
          ]
        }
      }
    ]
  },
  {
    id: 'ch-b-3',
    level: 'beginner',
    title: 'Wat zijn ETFs?',
    description: 'Exchange Traded Funds: de ideale bouwstenen voor je portfolio.',
    icon: '📊',
    order: 3,
    estimatedDuration: '20 min',
    lessons: [
      {
        id: 'les-b-3-1',
        chapterId: 'ch-b-3',
        title: 'ETFs Uitgelegd',
        order: 1,
        creditsAwarded: 15,
        estimatedDuration: '12 min',
        content: [
          {
            type: 'heading',
            content: 'Wat is een ETF?'
          },
          {
            type: 'text',
            content: 'Een ETF (Exchange Traded Fund) is een mandje van beleggingen dat je als één geheel kunt kopen op de beurs. In plaats van 500 individuele aandelen te kopen, koop je één ETF die al die 500 aandelen bevat.'
          },
          {
            type: 'analogy',
            content: 'Een ETF is als een kant-en-klare fruitsalade in de supermarkt. In plaats van 10 verschillende stukken fruit apart te kopen, snijden en mengen, koop je gewoon de salade. Makkelijk, goedkoper, en je hebt direct diversificatie!',
            caption: 'ETF = Kant-en-klare Diversificatie'
          },
          {
            type: 'definition',
            term: 'ETF (Exchange Traded Fund)',
            content: 'Een beleggingsfonds dat op de beurs verhandeld wordt, net als een aandeel. Het volgt meestal een index (zoals de S&P 500) en biedt directe diversificatie.'
          },
          {
            type: 'heading',
            content: 'Voordelen van ETFs'
          },
          {
            type: 'list',
            content: 'Waarom ETFs populair zijn:',
            items: [
              'Directe diversificatie: één aankoop = honderden aandelen',
              'Lage kosten: veel goedkoper dan actief beheerde fondsen (0.03% - 0.50% per jaar)',
              'Transparant: je weet precies wat erin zit',
              'Liquide: je kunt ze kopen en verkopen wanneer de beurs open is',
              'Toegankelijk: je kunt al met kleine bedragen beginnen'
            ]
          },
          {
            type: 'example',
            content: 'Populaire ETFs voor beginners:\n\n• VWCE (Vanguard FTSE All-World): 3.600+ aandelen wereldwijd\n• IWDA (iShares Core MSCI World): 1.500+ aandelen ontwikkelde markten\n• CSPX (iShares S&P 500): 500 grootste Amerikaanse bedrijven\n\nMet één ETF heb je direct een gespreide wereldportfolio!',
            caption: 'Populaire ETFs'
          },
          {
            type: 'callout',
            variant: 'tip',
            content: 'Voor Belgische beleggers zijn accumulerende ETFs (die dividend herbeleggen) vaak fiscaal voordeliger dan distribuerende ETFs. Let op de toevoeging "Acc" of "Dist" in de naam.'
          }
        ],
        quiz: {
          passingScore: 70,
          questions: [
            {
              id: 'q-b-3-1-1',
              question: 'Wat is het belangrijkste voordeel van een ETF ten opzichte van individuele aandelen?',
              options: [
                'Hogere dividenden',
                'Directe diversificatie',
                'Geen transactiekosten',
                'Gegarandeerd rendement'
              ],
              correctIndex: 1,
              explanation: 'Een ETF biedt directe diversificatie omdat het een mandje van vele aandelen bevat. Eén aankoop geeft je blootstelling aan honderden of duizenden bedrijven.'
            }
          ]
        }
      },
      {
        id: 'les-b-3-2',
        chapterId: 'ch-b-3',
        title: 'ETFs vs Individuele Aandelen',
        order: 2,
        creditsAwarded: 10,
        estimatedDuration: '8 min',
        content: [
          {
            type: 'heading',
            content: 'Wanneer kies je wat?'
          },
          {
            type: 'comparison',
            content: 'ETFs versus Individuele Aandelen',
            leftTitle: 'ETFs',
            rightTitle: 'Individuele Aandelen',
            leftItems: [
              'Brede spreiding in één aankoop',
              'Lagere volatiliteit door diversificatie',
              'Minder research nodig',
              'Ideaal voor lange termijn en beginners',
              'Beperkt opwaarts potentieel (volgt de markt)'
            ],
            rightItems: [
              'Controle over welke bedrijven je bezit',
              'Potentieel hoger rendement (én verlies)',
              'Veel research en kennis vereist',
              'Geschikt voor ervaren beleggers',
              'Mogelijkheid om opties te schrijven'
            ]
          },
          {
            type: 'callout',
            variant: 'info',
            content: 'Een populaire strategie is de "core-satellite" aanpak: 80% in brede ETFs (de "core") en 20% in individuele aandelen die je interessant vindt (de "satellites"). Zo combineer je stabiliteit met selectieve kansen.'
          }
        ]
      }
    ]
  },
  {
    id: 'ch-b-4',
    level: 'beginner',
    title: 'Dividenden Begrijpen',
    description: 'Hoe werkt passief inkomen uit dividenden en wat zijn de fiscale gevolgen?',
    icon: '💰',
    order: 4,
    estimatedDuration: '25 min',
    lessons: [
      {
        id: 'les-b-4-1',
        chapterId: 'ch-b-4',
        title: 'Wat zijn Dividenden?',
        order: 1,
        creditsAwarded: 15,
        estimatedDuration: '12 min',
        content: [
          {
            type: 'heading',
            content: 'Dividend uitgelegd'
          },
          {
            type: 'text',
            content: 'Dividend is een deel van de winst dat een bedrijf uitkeert aan haar aandeelhouders. Niet elk bedrijf keert dividend uit - jonge groeibedrijven investeren vaak alle winst in groei, terwijl volwassen bedrijven (utilities, banken, consumentengoederen) vaak stabiele dividenden betalen.'
          },
          {
            type: 'definition',
            term: 'Dividend',
            content: 'Een uitkering van een deel van de bedrijfswinst aan aandeelhouders, meestal uitgedrukt per aandeel. Bijvoorbeeld: $0.88 per aandeel per kwartaal.'
          },
          {
            type: 'definition',
            term: 'Dividendrendement (Dividend Yield)',
            content: 'Het jaarlijkse dividend gedeeld door de aandelenprijs, uitgedrukt als percentage. Een aandeel van €100 met €3 jaarlijks dividend heeft een yield van 3%.'
          },
          {
            type: 'heading',
            content: 'Belangrijke dividend data'
          },
          {
            type: 'list',
            content: 'De vier belangrijke data bij dividend:',
            items: [
              'Declaration Date: Bedrijf kondigt dividend aan',
              'Ex-Dividend Date: Vanaf deze datum heeft een koper geen recht meer op het dividend',
              'Record Date: Peildatum voor wie dividend ontvangt',
              'Payment Date: Dividend wordt uitbetaald'
            ]
          },
          {
            type: 'callout',
            variant: 'warning',
            content: 'Let op de ex-dividend datum! Als je het aandeel koopt op of na deze datum, ontvang je het aangekondigde dividend niet. De koers daalt typisch met het dividendbedrag op de ex-datum.'
          },
          {
            type: 'example',
            content: 'Voorbeeld: Apple dividend\n• Je bezit 100 aandelen Apple\n• Apple keert $0.24 per aandeel per kwartaal uit\n• Per kwartaal ontvang je: 100 × $0.24 = $24\n• Per jaar: $96 passief inkomen\n\nLet op: hierop moet je nog belasting betalen!',
            caption: 'Dividend Berekening'
          }
        ]
      },
      {
        id: 'les-b-4-2',
        chapterId: 'ch-b-4',
        title: 'Belasting op Dividenden',
        order: 2,
        creditsAwarded: 20,
        estimatedDuration: '13 min',
        content: [
          {
            type: 'heading',
            content: 'Dividendbelasting in België'
          },
          {
            type: 'text',
            content: 'In België betaal je 30% roerende voorheffing op dividenden. Dit wordt meestal automatisch ingehouden door je broker. Maar let op: bij buitenlandse aandelen kan er ook bronheffing in het land van herkomst zijn.'
          },
          {
            type: 'table',
            content: 'Overzicht dividendbelasting',
            columns: ['Land', 'Bronheffing', 'Na verdrag', 'Belgische RV', 'Totaal'],
            rows: [
              ['België', '30%', '30%', '0%', '30%'],
              ['Nederland', '15%', '15%', '15%', '30%'],
              ['VS', '30%', '15%', '15%', '30%'],
              ['Duitsland', '26.375%', '15%', '15%', '30%'],
              ['Frankrijk', '30%', '15%', '15%', '30%']
            ]
          },
          {
            type: 'callout',
            variant: 'info',
            content: 'Dankzij dubbelbelastingverdragen wordt buitenlandse bronheffing vaak verlaagd. De VS en veel EU-landen passen het verdragstarief automatisch toe als je broker het W-8BEN formulier heeft ingediend.'
          },
          {
            type: 'definition',
            term: 'W-8BEN Formulier',
            content: 'Een fiscaal formulier voor niet-Amerikanen dat je bij je broker invult. Hiermee wordt Amerikaanse bronheffing op dividenden verlaagd van 30% naar 15%.'
          },
          {
            type: 'heading',
            content: 'Accumulerend vs Distribuerend'
          },
          {
            type: 'comparison',
            content: 'ETF dividend opties',
            leftTitle: 'Accumulerend (Acc)',
            rightTitle: 'Distribuerend (Dist)',
            leftItems: [
              'Dividend wordt automatisch herbelegd',
              'Geen dividenduitkering, geen directe belasting',
              'Fiscaal efficiënt voor Belgen',
              'Ideaal voor vermogensopbouw',
              'Compound effect werkt maximaal'
            ],
            rightItems: [
              'Dividend wordt uitbetaald',
              '30% roerende voorheffing op elke uitkering',
              'Passief inkomen beschikbaar',
              'Geschikt als je van de inkomsten wilt leven',
              'Minder fiscaal efficiënt bij herbeleggen'
            ]
          },
          {
            type: 'callout',
            variant: 'tip',
            content: 'Voor Belgische beleggers die vermogen opbouwen, zijn accumulerende ETFs fiscaal voordeliger. Je betaalt pas belasting bij verkoop, en er is momenteel geen meerwaardebelasting voor particulieren.'
          }
        ],
        quiz: {
          passingScore: 70,
          questions: [
            {
              id: 'q-b-4-2-1',
              question: 'Hoeveel roerende voorheffing betaal je in België op dividenden?',
              options: [
                '15%',
                '25%',
                '30%',
                '21%'
              ],
              correctIndex: 2,
              explanation: 'In België bedraagt de roerende voorheffing op dividenden 30%. Dit wordt meestal automatisch ingehouden door je broker.'
            },
            {
              id: 'q-b-4-2-2',
              question: 'Welk type ETF is fiscaal voordeliger voor Belgische vermogensopbouw?',
              options: [
                'Distribuerende ETF',
                'Accumulerende ETF',
                'Beide zijn gelijk',
                'Synthetische ETF'
              ],
              correctIndex: 1,
              explanation: 'Accumulerende ETFs herbeleggen dividend intern, waardoor je geen directe dividendbelasting betaalt. Je betaalt pas bij verkoop, en er is momenteel geen meerwaardebelasting.'
            }
          ]
        }
      }
    ]
  },
  {
    id: 'ch-b-5',
    level: 'beginner',
    title: 'Belastingen op Beleggen',
    description: 'Alles over TOB, meerwaardebelasting en je fiscale verplichtingen als belegger.',
    icon: '📋',
    order: 5,
    estimatedDuration: '30 min',
    lessons: [
      {
        id: 'les-b-5-1',
        chapterId: 'ch-b-5',
        title: 'De Taks op Beursverrichtingen (TOB)',
        order: 1,
        creditsAwarded: 20,
        estimatedDuration: '15 min',
        content: [
          {
            type: 'heading',
            content: 'Wat is de TOB?'
          },
          {
            type: 'text',
            content: 'De Taks op Beursverrichtingen (TOB) is een Belgische belasting die je betaalt bij elke aan- én verkoop van effecten. Het tarief hangt af van het type effect dat je verhandelt.'
          },
          {
            type: 'definition',
            term: 'TOB (Taks op Beursverrichtingen)',
            content: 'Een Belgische transactiebelasting bij de aan- en verkoop van effecten. Je betaalt TOB zowel bij aankoop als bij verkoop.'
          },
          {
            type: 'table',
            content: 'TOB Tarieven 2024',
            columns: ['Type Effect', 'Tarief', 'Maximum per transactie'],
            rows: [
              ['Belgische aandelen op Euronext', '0.35%', '€1,600'],
              ['Buitenlandse aandelen', '0.35%', '€1,600'],
              ['ETFs geregistreerd in BE', '0.12%', '€1,300'],
              ['Accumulerende ETFs (niet-BE)', '1.32%', '€4,000'],
              ['Distribuerende ETFs (niet-BE)', '0.12%', '€1,300'],
              ['Obligaties', '0.12%', '€1,300']
            ]
          },
          {
            type: 'callout',
            variant: 'warning',
            content: 'Let op het hoge tarief van 1.32% voor accumulerende ETFs die niet in België zijn geregistreerd! Dit geldt voor populaire ETFs zoals VWCE en IWDA. Dit kan bij grote bedragen significant zijn.'
          },
          {
            type: 'example',
            content: 'Je koopt €10,000 aan VWCE (accumurerend, Iers):\n• TOB bij aankoop: €10,000 × 1.32% = €132\n• TOB bij verkoop: €10,000 × 1.32% = €132\n• Totaal: €264 TOB\n\nVergelijk met distribuerende variant:\n• TOB: €10,000 × 0.12% × 2 = €24 totaal',
            caption: 'TOB Berekening'
          },
          {
            type: 'callout',
            variant: 'tip',
            content: 'Het hogere TOB-tarief voor accumulerende ETFs wordt vaak gecompenseerd door de fiscale voordelen op lange termijn. Reken dit door voor jouw situatie!'
          }
        ]
      },
      {
        id: 'les-b-5-2',
        chapterId: 'ch-b-5',
        title: 'Meerwaardebelasting en Aangifte',
        order: 2,
        creditsAwarded: 15,
        estimatedDuration: '15 min',
        content: [
          {
            type: 'heading',
            content: 'Meerwaardebelasting in België'
          },
          {
            type: 'text',
            content: 'Goed nieuws voor Belgische beleggers: er is momenteel geen meerwaardebelasting voor particulieren die "goede huisvader" beleggen. Dit betekent dat je winst op de verkoop van aandelen en ETFs niet wordt belast, mits je als een normale belegger handelt.'
          },
          {
            type: 'definition',
            term: 'Goede Huisvader Beheer',
            content: 'Een begrip in Belgisch fiscaal recht dat normaal, voorzichtig beleggingsgedrag beschrijft. Denk aan: diversificatie, lange termijn, geen excessieve speculatie, beleggen van eigen spaargeld.'
          },
          {
            type: 'callout',
            variant: 'warning',
            content: 'Als de fiscus oordeelt dat je speculatief handelt, kunnen meerwaarden belast worden tegen 33% (+ gemeentebelasting). Kenmerken van speculatie: zeer frequent handelen, gebruik van geleend geld, korte termijn winsten najagen.'
          },
          {
            type: 'heading',
            content: 'Je belastingaangifte'
          },
          {
            type: 'list',
            content: 'Wat moet je aangeven?',
            items: [
              'Buitenlandse rekeningen (via CAP-formulier + aangifte)',
              'Dividenden van buitenlandse aandelen waarop geen/te weinig RV is ingehouden',
              'Eventuele buitenlandse roerende inkomsten',
              'Je effectenrekening-saldo (indien > €1 miljoen voor effectentaks)'
            ]
          },
          {
            type: 'callout',
            variant: 'info',
            content: 'Bij een binnenlandse broker wordt de meeste belasting automatisch ingehouden en hoef je weinig zelf aan te geven. Bij een buitenlandse broker heb je meer verantwoordelijkheid.'
          }
        ],
        quiz: {
          passingScore: 70,
          questions: [
            {
              id: 'q-b-5-2-1',
              question: 'Is er meerwaardebelasting in België voor particuliere beleggers?',
              options: [
                'Ja, altijd 30%',
                'Ja, altijd 15%',
                'Nee, niet bij normaal "goede huisvader" beheer',
                'Alleen op aandelen, niet op ETFs'
              ],
              correctIndex: 2,
              explanation: 'Er is geen meerwaardebelasting voor particulieren die "goede huisvader" beleggen. Bij speculatief gedrag kan de fiscus wel belasten.'
            },
            {
              id: 'q-b-5-2-2',
              question: 'Wat is het TOB-tarief voor accumulerende ETFs niet geregistreerd in België?',
              options: [
                '0.12%',
                '0.35%',
                '1.32%',
                '0%'
              ],
              correctIndex: 2,
              explanation: 'Accumulerende ETFs die niet in België zijn geregistreerd, hebben een TOB-tarief van 1.32% - aanzienlijk hoger dan de 0.12% voor distribuerende ETFs.'
            }
          ]
        }
      }
    ]
  }
];

// =====================================================
// LEVEL 2: MEDIOR - Blauwe Piste
// Opties basis: Put/Call, Buy/Sell, de 4 vakken
// =====================================================

const mediorChapters: EducationChapter[] = [
  {
    id: 'ch-m-1',
    level: 'medior',
    title: 'Introductie tot Opties',
    description: 'De basis van opties: wat ze zijn, hoe ze werken, en waarom ze nuttig zijn.',
    icon: '🎯',
    order: 1,
    estimatedDuration: '35 min',
    lessons: [
      {
        id: 'les-m-1-1',
        chapterId: 'ch-m-1',
        title: 'Wat is een Optie?',
        order: 1,
        creditsAwarded: 20,
        estimatedDuration: '15 min',
        content: [
          {
            type: 'heading',
            content: 'Een optie is een recht, geen plicht'
          },
          {
            type: 'text',
            content: 'Een optie geeft de koper het RECHT (maar niet de plicht) om een onderliggend aandeel te kopen of verkopen tegen een vooraf bepaalde prijs, tot een bepaalde datum. De verkoper van de optie heeft wel een PLICHT als de koper zijn recht uitoefent.'
          },
          {
            type: 'analogy',
            content: 'Stel je voor dat je een huis wilt kopen dat nu €300.000 kost. Je betaalt de eigenaar €5.000 voor de OPTIE om het huis binnen 6 maanden te kopen voor €300.000. Als de huisprijs stijgt naar €350.000, koop je voor €300.000 en maak je €45.000 winst (€50k - €5k optiekosten). Als de prijs daalt, loop je weg en verlies je alleen de €5.000.',
            caption: 'De Huisoptie Analogie'
          },
          {
            type: 'definition',
            term: 'Optie',
            content: 'Een contract dat de koper het recht geeft om 100 aandelen te kopen (call) of verkopen (put) tegen een vaste prijs (strike) tot een bepaalde datum (expiratie).'
          },
          {
            type: 'heading',
            content: 'Belangrijke begrippen'
          },
          {
            type: 'definition',
            term: 'Strike Price',
            content: 'De vooraf bepaalde prijs waartegen je de aandelen kunt kopen of verkopen als je de optie uitoefent.'
          },
          {
            type: 'definition',
            term: 'Expiratie Datum',
            content: 'De laatste dag waarop de optie geldig is. Na deze datum is de optie waardeloos als hij niet is uitgeoefend.'
          },
          {
            type: 'definition',
            term: 'Premium',
            content: 'De prijs die je betaalt (als koper) of ontvangt (als verkoper) voor de optie. Dit is je maximale verlies als koper.'
          },
          {
            type: 'callout',
            variant: 'info',
            content: 'Eén optiecontract vertegenwoordigt altijd 100 aandelen. Als je 1 optie koopt voor $2 premium, betaal je dus $200 (1 × $2 × 100).'
          }
        ]
      },
      {
        id: 'les-m-1-2',
        chapterId: 'ch-m-1',
        title: 'Calls en Puts',
        order: 2,
        creditsAwarded: 25,
        estimatedDuration: '20 min',
        content: [
          {
            type: 'heading',
            content: 'De twee soorten opties'
          },
          {
            type: 'text',
            content: 'Er zijn maar twee soorten opties: CALL opties en PUT opties. Het verschil zit in het recht dat ze geven.'
          },
          {
            type: 'definition',
            term: 'Call Optie',
            content: 'Geeft de koper het RECHT om 100 aandelen te KOPEN tegen de strike price. Je koopt een call als je verwacht dat de koers STIJGT.'
          },
          {
            type: 'definition',
            term: 'Put Optie',
            content: 'Geeft de koper het RECHT om 100 aandelen te VERKOPEN tegen de strike price. Je koopt een put als je verwacht dat de koers DAALT (of als bescherming).'
          },
          {
            type: 'comparison',
            content: 'Call vs Put',
            leftTitle: '📈 CALL Optie',
            rightTitle: '📉 PUT Optie',
            leftItems: [
              'Recht om te KOPEN',
              'Profiteert van STIJGENDE koers',
              'Bullish strategie',
              'Koper hoopt dat koers > strike',
              'Voorbeeld: recht om AAPL te kopen voor $150'
            ],
            rightItems: [
              'Recht om te VERKOPEN',
              'Profiteert van DALENDE koers',
              'Bearish strategie (of hedge)',
              'Koper hoopt dat koers < strike',
              'Voorbeeld: recht om AAPL te verkopen voor $150'
            ]
          },
          {
            type: 'analogy',
            content: 'VERZEKERING ANALOGIE:\n\nEen PUT optie werkt precies zoals een verzekering. Je betaalt een premie voor bescherming tegen een negatieve gebeurtenis. Als je huis afbrandt (koers daalt), krijg je een uitkering. Als er niets gebeurt (koers stijgt), verlies je alleen de premie.\n\nEen CALL optie is als een reservering met aanbetaling. Je betaalt een klein bedrag om de prijs vast te leggen, met de optie om later te beslissen.',
            caption: 'Opties als Verzekering'
          },
          {
            type: 'callout',
            variant: 'tip',
            content: 'Onthoud: CALL = klimmen (Call to climb), PUT = naar beneden zetten (Put down). De koper van een call wil dat de prijs klimt, de koper van een put wil dat hij daalt.'
          }
        ],
        quiz: {
          passingScore: 70,
          questions: [
            {
              id: 'q-m-1-2-1',
              question: 'Je verwacht dat Apple stijgt van $150 naar $180. Welk type optie koop je?',
              options: [
                'Put optie',
                'Call optie',
                'Een aandeel',
                'Een obligatie'
              ],
              correctIndex: 1,
              explanation: 'Een call optie geeft je het recht om te kopen tegen een vaste prijs. Als de koers stijgt, wordt je optie meer waard.'
            },
            {
              id: 'q-m-1-2-2',
              question: 'Hoeveel aandelen vertegenwoordigt één optiecontract?',
              options: [
                '1 aandeel',
                '10 aandelen',
                '100 aandelen',
                '1000 aandelen'
              ],
              correctIndex: 2,
              explanation: 'Elk optiecontract vertegenwoordigt standaard 100 aandelen van de onderliggende waarde.'
            }
          ]
        }
      }
    ]
  },
  {
    id: 'ch-m-2',
    level: 'medior',
    title: 'De 4 Basis Posities',
    description: 'Kopen en verkopen van calls en puts: de 4 fundamentele optiestrategieën.',
    icon: '🎲',
    order: 2,
    estimatedDuration: '45 min',
    lessons: [
      {
        id: 'les-m-2-1',
        chapterId: 'ch-m-2',
        title: 'Het Optie Kwadrant',
        order: 1,
        creditsAwarded: 30,
        estimatedDuration: '20 min',
        content: [
          {
            type: 'heading',
            content: 'De 4 fundamentele posities'
          },
          {
            type: 'text',
            content: 'Bij opties kun je niet alleen KOPEN maar ook VERKOPEN. Dit geeft 4 mogelijke posities, elk met eigen risico/rendement profiel. Dit is het fundament van alle optiestrategieën.'
          },
          {
            type: 'table',
            content: 'Het Optie Kwadrant',
            columns: ['', 'CALL (recht om te KOPEN)', 'PUT (recht om te VERKOPEN)'],
            rows: [
              ['KOPEN (Long)', 'Long Call: Profiteert van stijging', 'Long Put: Profiteert van daling'],
              ['VERKOPEN (Short)', 'Short Call: Profiteert van zijwaarts/daling', 'Short Put: Profiteert van zijwaarts/stijging']
            ]
          },
          {
            type: 'callout',
            variant: 'info',
            content: 'KOPERS betalen premium en hebben RECHTEN.\nVERKOPERS ontvangen premium en hebben PLICHTEN.\n\nDit verschil is cruciaal: verkopers kunnen verplicht worden om te leveren!'
          },
          {
            type: 'heading',
            content: 'De 4 posities in detail'
          },
          {
            type: 'list',
            content: '1. LONG CALL (Call kopen):',
            items: [
              'Je verwacht: koers STIJGT',
              'Je betaalt: premium',
              'Max verlies: de betaalde premium',
              'Max winst: onbeperkt (koers kan blijven stijgen)',
              'Gebruik: speculeren op stijging met beperkt risico'
            ]
          },
          {
            type: 'list',
            content: '2. LONG PUT (Put kopen):',
            items: [
              'Je verwacht: koers DAALT',
              'Je betaalt: premium',
              'Max verlies: de betaalde premium',
              'Max winst: strike minus nul (koers kan naar €0)',
              'Gebruik: speculeren op daling OF bescherming (hedge)'
            ]
          },
          {
            type: 'list',
            content: '3. SHORT CALL (Call verkopen):',
            items: [
              'Je verwacht: koers BLIJFT GELIJK of daalt',
              'Je ontvangt: premium',
              'Max verlies: ONBEPERKT (koers kan blijven stijgen)',
              'Max winst: de ontvangen premium',
              'Gebruik: inkomen genereren (alleen "covered" aanbevolen!)'
            ]
          },
          {
            type: 'list',
            content: '4. SHORT PUT (Put verkopen):',
            items: [
              'Je verwacht: koers BLIJFT GELIJK of stijgt',
              'Je ontvangt: premium',
              'Max verlies: strike × 100 (als koers naar €0 gaat)',
              'Max winst: de ontvangen premium',
              'Gebruik: inkomen genereren of instappen tegen lagere prijs'
            ]
          }
        ]
      },
      {
        id: 'les-m-2-2',
        chapterId: 'ch-m-2',
        title: 'Koper vs Verkoper: Casino Analogie',
        order: 2,
        creditsAwarded: 25,
        estimatedDuration: '15 min',
        content: [
          {
            type: 'heading',
            content: 'Het Casino Perspectief'
          },
          {
            type: 'analogy',
            content: 'OPTIE KOPERS zijn als GOKKERS in een casino:\n• Ze betalen een kleine inzet (premium)\n• Ze hopen op een grote uitbetaling\n• Ze verliezen meestal (de meeste opties expireren waardeloos)\n• Maar één grote winst kan alle verliezen compenseren\n\nOPTIE VERKOPERS zijn als HET CASINO:\n• Ze ontvangen de inzetten (premiums)\n• Ze winnen meestal kleine bedragen\n• Ze hebben de statistiek aan hun kant\n• Maar incidenteel een grote uitbetaling kan pijn doen',
            caption: 'Casino vs Gokker'
          },
          {
            type: 'callout',
            variant: 'warning',
            content: 'BELANGRIJK: Wij bij PayDay focussen op de VERKOPER kant - we willen het casino zijn, niet de gokker. We verkopen opties voor consistent inkomen, NIET om te speculeren op richting.'
          },
          {
            type: 'heading',
            content: 'Wat we wel en niet doen'
          },
          {
            type: 'comparison',
            content: 'PayDay Filosofie',
            leftTitle: '✅ WAT WE WEL DOEN',
            rightTitle: '❌ WAT WE NIET DOEN',
            leftItems: [
              'Covered Calls verkopen op aandelen die we bezitten',
              'Cash Secured Puts verkopen op aandelen die we willen kopen',
              'LEAPS kopen als aandelen-vervanging (lange termijn)',
              'Premium inkomen genereren met gedekt risico',
              'Systematisch, consistent, op lange termijn'
            ],
            rightItems: [
              'Naakte (uncovered) opties verkopen',
              'Speculeren op korte termijn koersbewegingen',
              'Opties kopen voor snelle winst',
              'Alles inzetten op één trade',
              'Gokken op earnings of nieuws'
            ]
          },
          {
            type: 'callout',
            variant: 'tip',
            content: 'De statistieken zijn duidelijk: 70-80% van alle opties expireert waardeloos. Als verkoper heb je deze statistiek aan je kant. Maar dit betekent ook dat je risico goed moet managen!'
          }
        ],
        quiz: {
          passingScore: 70,
          questions: [
            {
              id: 'q-m-2-2-1',
              question: 'Je verkoopt een put optie. Wat is je verwachting voor de koers?',
              options: [
                'Je verwacht een sterke daling',
                'Je verwacht dat de koers gelijk blijft of stijgt',
                'Je verwacht een sterke stijging',
                'Je hebt geen mening over richting'
              ],
              correctIndex: 1,
              explanation: 'Als put verkoper profiteer je als de koers gelijk blijft of stijgt. Je ontvangt premium en hoopt dat de optie waardeloos expireert.'
            },
            {
              id: 'q-m-2-2-2',
              question: 'Waarom vergelijken we optie verkopers met een casino?',
              options: [
                'Omdat ze altijd winnen',
                'Omdat ze kleine, frequente winsten maken met de statistiek aan hun kant',
                'Omdat ze veel risico nemen',
                'Omdat het illegaal is'
              ],
              correctIndex: 1,
              explanation: 'Net als een casino, winnen optie verkopers meestal kleine bedragen (premiums) met de statistiek aan hun kant - de meeste opties expireren waardeloos.'
            }
          ]
        }
      },
      {
        id: 'les-m-2-3',
        chapterId: 'ch-m-2',
        title: 'Strike en Expiratie Kiezen',
        order: 3,
        creditsAwarded: 20,
        estimatedDuration: '10 min',
        content: [
          {
            type: 'heading',
            content: 'De twee cruciale keuzes'
          },
          {
            type: 'text',
            content: 'Bij elke optie trade maak je twee belangrijke keuzes: welke strike price en welke expiratie datum. Deze keuzes bepalen je risico, potentiële winst, en de premium die je betaalt of ontvangt.'
          },
          {
            type: 'definition',
            term: 'Strike Price',
            content: 'De prijs waartegen de optie kan worden uitgeoefend. Strikes zijn beschikbaar op vaste intervallen (bijv. elke $5 of $10 bij dure aandelen).'
          },
          {
            type: 'definition',
            term: 'Expiratie Datum',
            content: 'De dag waarop de optie afloopt. Populaire cycli zijn: weekly (wekelijks), monthly (maandelijks, 3e vrijdag), en LEAPS (1-2 jaar).'
          },
          {
            type: 'heading',
            content: 'Vuistregels'
          },
          {
            type: 'list',
            content: 'Strike keuze:',
            items: [
              'Hoe dichter bij de huidige koers, hoe duurder de optie',
              'Strikes ver weg zijn goedkoop maar hebben lage kans op uitbetaling',
              'Voor premium verkopen: kies strikes met ~70% kans om OTM te blijven'
            ]
          },
          {
            type: 'list',
            content: 'Expiratie keuze:',
            items: [
              'Langere looptijd = duurdere optie (meer tijdswaarde)',
              'Korte looptijd = sneller tijdswaarde verval (goed voor verkopers)',
              'Sweet spot voor verkopers: 30-45 dagen tot expiratie (DTE)'
            ]
          },
          {
            type: 'callout',
            variant: 'tip',
            content: 'In de volgende levels gaan we dieper in op OTM/ATM/ITM en hoe je de optimale strike en expiratie kiest voor verschillende strategieën.'
          }
        ]
      }
    ]
  }
];

// =====================================================
// LEVEL 3: SENIOR - Rode Piste
// OTM/ATM/ITM, Intrinsieke/Extrinsieke waarde, Tijdsverval, IV
// =====================================================

const seniorChapters: EducationChapter[] = [
  {
    id: 'ch-s-1',
    level: 'senior',
    title: 'In, At, en Out of the Money',
    description: 'Begrijp de cruciale concepten ITM, ATM en OTM voor betere optie keuzes.',
    icon: '🎯',
    order: 1,
    estimatedDuration: '30 min',
    lessons: [
      {
        id: 'les-s-1-1',
        chapterId: 'ch-s-1',
        title: 'ITM, ATM, OTM Uitgelegd',
        order: 1,
        creditsAwarded: 25,
        estimatedDuration: '15 min',
        content: [
          {
            type: 'heading',
            content: 'De drie zones van een optie'
          },
          {
            type: 'text',
            content: 'Elke optie bevindt zich in één van drie zones, afhankelijk van de relatie tussen de strike price en de huidige koers van het aandeel. Dit bepaalt of de optie "intrinsieke waarde" heeft.'
          },
          {
            type: 'definition',
            term: 'In The Money (ITM)',
            content: 'De optie heeft intrinsieke waarde. Voor een CALL: koers > strike. Voor een PUT: koers < strike. De optie zou nu winst opleveren bij uitoefening.'
          },
          {
            type: 'definition',
            term: 'At The Money (ATM)',
            content: 'De strike is (ongeveer) gelijk aan de huidige koers. De optie heeft geen intrinsieke waarde maar wel de hoogste tijdswaarde.'
          },
          {
            type: 'definition',
            term: 'Out of The Money (OTM)',
            content: 'De optie heeft geen intrinsieke waarde. Voor een CALL: koers < strike. Voor een PUT: koers > strike. De optie is waardeloos bij uitoefening nu.'
          },
          {
            type: 'example',
            content: 'Apple koers: $175\n\nCALL $170 → ITM (koers $175 > strike $170)\nCALL $175 → ATM (koers = strike)\nCALL $180 → OTM (koers $175 < strike $180)\n\nPUT $180 → ITM (koers $175 < strike $180)\nPUT $175 → ATM (koers = strike)\nPUT $170 → OTM (koers $175 > strike $170)',
            caption: 'ITM/ATM/OTM voor Calls en Puts'
          },
          {
            type: 'callout',
            variant: 'tip',
            content: 'Onthoud: bij een CALL wil je dat de koers BOVEN de strike komt (dan is hij ITM). Bij een PUT wil je dat de koers ONDER de strike komt.'
          }
        ]
      },
      {
        id: 'les-s-1-2',
        chapterId: 'ch-s-1',
        title: 'Waarom ITM/OTM Belangrijk Is',
        order: 2,
        creditsAwarded: 20,
        estimatedDuration: '15 min',
        content: [
          {
            type: 'heading',
            content: 'Keuzes maken op basis van moneyness'
          },
          {
            type: 'text',
            content: 'De keuze tussen ITM, ATM of OTM opties hangt af van je strategie, risicotolerantie en marktverwachting. Elk heeft voor- en nadelen.'
          },
          {
            type: 'table',
            content: 'Vergelijking ITM vs ATM vs OTM',
            columns: ['Kenmerk', 'ITM', 'ATM', 'OTM'],
            rows: [
              ['Premium', 'Hoog', 'Gemiddeld', 'Laag'],
              ['Intrinsieke waarde', 'Ja', 'Nee', 'Nee'],
              ['Tijdswaarde', 'Laag', 'Hoogst', 'Gemiddeld'],
              ['Delta (beweging)', '0.6-0.9', '~0.50', '0.1-0.4'],
              ['Kans op winst (verkoper)', 'Laag', 'Gemiddeld', 'Hoog'],
              ['Risico/reward', 'Conservatief', 'Neutraal', 'Agressief']
            ]
          },
          {
            type: 'heading',
            content: 'Praktische toepassing'
          },
          {
            type: 'list',
            content: 'Wanneer kies je welke strike:',
            items: [
              'ITM CALLS kopen: als je aandelen wilt vervangen (LEAPS) - meer zekerheid, minder hefboom',
              'OTM CALLS verkopen (covered calls): je behoudt het aandeel maar ontvangt premium',
              'OTM PUTS verkopen (CSP): je krijgt betaald om te wachten op een lagere instapprijs',
              'ATM: hoogste tijdswaarde, maar ook hoogste gamma risico bij expiratie'
            ]
          },
          {
            type: 'callout',
            variant: 'info',
            content: 'Bij PayDay strategieën verkopen we vaak OTM opties met ~70% kans om OTM te blijven (delta ~0.30). Dit geeft een goede balans tussen premium en veiligheid.'
          }
        ],
        quiz: {
          passingScore: 70,
          questions: [
            {
              id: 'q-s-1-2-1',
              question: 'Apple staat op $175. Een CALL met strike $180 is...',
              options: [
                'In The Money (ITM)',
                'At The Money (ATM)',
                'Out of The Money (OTM)',
                'Dit hangt af van de expiratie'
              ],
              correctIndex: 2,
              explanation: 'Een CALL is OTM als de koers onder de strike ligt. De koers ($175) is lager dan de strike ($180), dus de call is OTM.'
            },
            {
              id: 'q-s-1-2-2',
              question: 'Welke optie heeft de hoogste tijdswaarde?',
              options: [
                'Deep ITM',
                'ATM',
                'Far OTM',
                'Alle opties hebben evenveel tijdswaarde'
              ],
              correctIndex: 1,
              explanation: 'ATM opties hebben de hoogste tijdswaarde omdat de onzekerheid over of ze ITM of OTM zullen eindigen het grootst is.'
            }
          ]
        }
      }
    ]
  },
  {
    id: 'ch-s-2',
    level: 'senior',
    title: 'Optie Waarde Componenten',
    description: 'Intrinsieke waarde, extrinsieke waarde, tijdswaarde en hun samenhang.',
    icon: '💎',
    order: 2,
    estimatedDuration: '40 min',
    lessons: [
      {
        id: 'les-s-2-1',
        chapterId: 'ch-s-2',
        title: 'Intrinsieke en Extrinsieke Waarde',
        order: 1,
        creditsAwarded: 30,
        estimatedDuration: '20 min',
        content: [
          {
            type: 'heading',
            content: 'Waaruit bestaat de prijs van een optie?'
          },
          {
            type: 'text',
            content: 'De prijs (premium) van een optie bestaat uit twee componenten: intrinsieke waarde en extrinsieke waarde. Dit begrijpen is essentieel voor het evalueren of een optie duur of goedkoop is.'
          },
          {
            type: 'formula',
            content: 'Optie Premium = Intrinsieke Waarde + Extrinsieke Waarde'
          },
          {
            type: 'definition',
            term: 'Intrinsieke Waarde',
            content: 'Het verschil tussen de strike en de huidige koers, als dit positief is. Het is wat de optie "nu" waard zou zijn bij directe uitoefening. Alleen ITM opties hebben intrinsieke waarde.'
          },
          {
            type: 'definition',
            term: 'Extrinsieke Waarde (Tijdswaarde)',
            content: 'Het deel van de premium boven de intrinsieke waarde. Dit vertegenwoordigt de "hoop" dat de optie meer waard wordt. Extrinsieke waarde vervalt naar nul bij expiratie.'
          },
          {
            type: 'example',
            content: 'Apple koers: $175\nCALL strike $170, premium $8.50\n\n• Intrinsieke waarde: $175 - $170 = $5.00\n• Extrinsieke waarde: $8.50 - $5.00 = $3.50\n\nDe optie is $5 "echt" waard plus $3.50 voor tijd en onzekerheid.',
            caption: 'Waarde Componenten Voorbeeld'
          },
          {
            type: 'callout',
            variant: 'info',
            content: 'OTM opties hebben GEEN intrinsieke waarde - hun hele prijs is extrinsieke waarde. Dit maakt ze aantrekkelijk om te verkopen: al die extrinsieke waarde verdampt naar nul!'
          }
        ]
      },
      {
        id: 'les-s-2-2',
        chapterId: 'ch-s-2',
        title: 'Theta: Het Tijdsverval',
        order: 2,
        creditsAwarded: 30,
        estimatedDuration: '20 min',
        content: [
          {
            type: 'heading',
            content: 'Tijd is geld - letterlijk'
          },
          {
            type: 'text',
            content: 'Elke dag die verstrijkt, verliest een optie een stukje van zijn extrinsieke waarde. Dit heet theta decay of tijdsverval. Voor optie verkopers is dit je beste vriend - je verdient elke dag geld terwijl je slaapt!'
          },
          {
            type: 'definition',
            term: 'Theta',
            content: 'De "Greek" die meet hoeveel waarde een optie per dag verliest door tijdsverloop. Een theta van -0.05 betekent dat de optie $5 per dag verliest per contract.'
          },
          {
            type: 'heading',
            content: 'De Theta Curve'
          },
          {
            type: 'text',
            content: 'Theta werkt niet lineair - het versnelt naarmate expiratie nadert. Een optie verliest meer waarde in de laatste 2 weken dan in de eerste 2 maanden!'
          },
          {
            type: 'analogy',
            content: 'Stel je een ijsblokje voor dat smelt. In de koelkast (veel tijd tot expiratie) smelt het langzaam. Op het aanrecht (minder tijd) smelt het sneller. In de magnetron (laatste dagen) verdwijnt het razendsnel. Zo werkt theta!',
            caption: 'Het Smeltende IJsblokje'
          },
          {
            type: 'callout',
            variant: 'tip',
            content: 'De "sweet spot" voor optie verkopers is 30-45 dagen tot expiratie. Je vangt de versnelling van theta, maar hebt nog genoeg tijd om te reageren als de trade tegen je ingaat.'
          },
          {
            type: 'list',
            content: 'Theta strategie tips:',
            items: [
              'Verkoop opties met 30-45 DTE voor optimale theta',
              'Sluit posities bij 50% winst - de laatste 50% duurt lang',
              'ATM opties hebben de hoogste theta (meeste tijdswaarde)',
              'Weekend telt ook mee! Vrijdag na sluiting verlies je 3 dagen theta'
            ]
          }
        ],
        quiz: {
          passingScore: 70,
          questions: [
            {
              id: 'q-s-2-2-1',
              question: 'Wanneer versnelt theta (tijdsverval) het meest?',
              options: [
                'Direct na aankoop',
                'Halverwege de looptijd',
                'In de laatste 2 weken voor expiratie',
                'Theta is constant gedurende de looptijd'
              ],
              correctIndex: 2,
              explanation: 'Theta versnelt exponentieel naarmate expiratie nadert. De laatste 2 weken zien de snelste waardedaling door tijdsverval.'
            }
          ]
        }
      }
    ]
  },
  {
    id: 'ch-s-3',
    level: 'senior',
    title: 'Implied Volatility (IV)',
    description: 'De sleutel tot optie prijzen: begrijp volatiliteit en hoe je het gebruikt.',
    icon: '📊',
    order: 3,
    estimatedDuration: '45 min',
    lessons: [
      {
        id: 'les-s-3-1',
        chapterId: 'ch-s-3',
        title: 'Wat is Implied Volatility?',
        order: 1,
        creditsAwarded: 30,
        estimatedDuration: '20 min',
        content: [
          {
            type: 'heading',
            content: 'De verwachte beweging'
          },
          {
            type: 'text',
            content: 'Implied Volatility (IV) meet hoeveel beweging de markt verwacht in de onderliggende koers. Hoge IV = de markt verwacht grote bewegingen. Lage IV = de markt verwacht stabiliteit.'
          },
          {
            type: 'definition',
            term: 'Implied Volatility (IV)',
            content: 'Een maatstaf voor de verwachte toekomstige volatiliteit van een aandeel, afgeleid uit optieprijzen. Uitgedrukt als percentage op jaarbasis.'
          },
          {
            type: 'analogy',
            content: 'IV is als de "angstmeter" van de markt. Stel je voor dat je een vliegtuigreis boekt. De prijs van een annuleringsverzekering (= optie premium) is hoger voor een reis naar een oorlogsgebied (= hoge IV) dan naar een rustig vakantiepark (= lage IV). Meer onzekerheid = duurdere bescherming.',
            caption: 'IV = De Angstmeter'
          },
          {
            type: 'heading',
            content: 'Hoe IV de premium beïnvloedt'
          },
          {
            type: 'text',
            content: 'IV heeft een enorme impact op optieprijzen. Bij een verdubbeling van IV kan de optie prijs ook (bijna) verdubbelen, zonder dat het aandeel beweegt!'
          },
          {
            type: 'analogy',
            content: 'Denk aan IV als de lucht in een ballon (de optie premium). Als IV stijgt, blaast het de ballon op - de premium wordt groter. Als IV daalt, loopt de ballon leeg - de premium krimpt. Dit kan zelfs gebeuren terwijl het aandeel de "goede" kant op beweegt!',
            caption: 'De Ballon Analogie'
          },
          {
            type: 'callout',
            variant: 'warning',
            content: 'Dit is waarom opties kopen rond earnings vaak slecht afloopt: de IV is hoog (dure opties), en na de earnings zakt IV weer in (IV crush). Je aandeel kan stijgen, maar je optie daalt door de IV daling!'
          }
        ]
      },
      {
        id: 'les-s-3-2',
        chapterId: 'ch-s-3',
        title: 'IV en Earnings: De IV Crush',
        order: 2,
        creditsAwarded: 25,
        estimatedDuration: '15 min',
        content: [
          {
            type: 'heading',
            content: 'Waarom IV stijgt voor events'
          },
          {
            type: 'text',
            content: 'Voor belangrijke gebeurtenissen zoals earnings (kwartaalcijfers) stijgt de IV fors. De markt verwacht grote beweging na het nieuws, dus opties worden duurder. Na het event daalt IV vaak dramatisch - dit heet de "IV crush".'
          },
          {
            type: 'definition',
            term: 'IV Crush',
            content: 'De snelle daling van implied volatility na een verwacht event (zoals earnings). De onzekerheid is weg, dus de "angstpremie" verdwijnt uit de optieprijzen.'
          },
          {
            type: 'example',
            content: 'Tesla earnings voorbeeld:\n\nVoor earnings:\n• IV: 85% (zeer hoog)\n• Call premium: $15.00\n\nNa earnings (koers +2%):\n• IV: 45% (genormaliseerd)\n• Call premium: $8.00\n\nOndanks dat Tesla steeg, daalde je call met $7 door de IV crush!',
            caption: 'IV Crush in Actie'
          },
          {
            type: 'callout',
            variant: 'tip',
            content: 'Als VERKOPER kun je profiteren van IV crush. Verkoop opties voor earnings (ontvang hoge premium) en koop ze goedkoop terug na de IV crush. Maar pas op: de koersbeweging kan groter zijn dan de IV crush!'
          },
          {
            type: 'heading',
            content: 'IV Rank en IV Percentile'
          },
          {
            type: 'text',
            content: 'Om te weten of de huidige IV "hoog" of "laag" is, vergelijk je met het verleden. Hiervoor gebruiken we IV Rank of IV Percentile.'
          },
          {
            type: 'definition',
            term: 'IV Rank',
            content: 'Waar de huidige IV staat t.o.v. de range van het afgelopen jaar. IVR van 50% betekent dat IV precies halverwege de jaarrange zit.'
          },
          {
            type: 'list',
            content: 'Vuistregels:',
            items: [
              'IV Rank < 30%: IV is laag - opties zijn "goedkoop" - overweeg kopen',
              'IV Rank 30-50%: IV is normaal - geen sterke voorkeur',
              'IV Rank > 50%: IV is hoog - opties zijn "duur" - overweeg verkopen'
            ]
          }
        ],
        quiz: {
          passingScore: 70,
          questions: [
            {
              id: 'q-s-3-2-1',
              question: 'Wat gebeurt er typisch met IV na earnings?',
              options: [
                'IV stijgt verder',
                'IV blijft gelijk',
                'IV daalt snel (IV crush)',
                'IV hangt af van de resultaten'
              ],
              correctIndex: 2,
              explanation: 'Na earnings daalt IV typisch snel (IV crush) omdat de onzekerheid over het event weg is. Dit gebeurt ongeacht of de resultaten goed of slecht waren.'
            },
            {
              id: 'q-s-3-2-2',
              question: 'De IV van een aandeel is hoog (IV Rank 80%). Welke strategie is dan voordeliger?',
              options: [
                'Opties kopen',
                'Opties verkopen',
                'Aandelen kopen',
                'Niets doen'
              ],
              correctIndex: 1,
              explanation: 'Bij hoge IV zijn opties relatief duur. Als verkoper profiteer je van de hoge premium en eventuele IV daling. Als koper betaal je te veel.'
            }
          ]
        }
      }
    ]
  }
];

// =====================================================
// LEVEL 4: EXPERT - Zwarte Piste
// Geavanceerde concepten: IV Crush, Greeks, complexe strategieën
// =====================================================

const expertChapters: EducationChapter[] = [
  {
    id: 'ch-e-1',
    level: 'expert',
    title: 'De Greeks Beheersen',
    description: 'Delta, Gamma, Vega: begrijp hoe je optieposities zich gedragen.',
    icon: '🔬',
    order: 1,
    estimatedDuration: '50 min',
    lessons: [
      {
        id: 'les-e-1-1',
        chapterId: 'ch-e-1',
        title: 'Delta en Gamma',
        order: 1,
        creditsAwarded: 35,
        estimatedDuration: '25 min',
        content: [
          {
            type: 'heading',
            content: 'Delta: Je Koersgevoeligheid'
          },
          {
            type: 'text',
            content: 'Delta meet hoeveel de optieprijs verandert als het onderliggende aandeel $1 beweegt. Het is ook een ruwe indicatie van de kans dat de optie ITM expireert.'
          },
          {
            type: 'definition',
            term: 'Delta',
            content: 'De verandering in optieprijs per $1 beweging in het aandeel. Delta 0.50 betekent dat de optie $0.50 stijgt als het aandeel $1 stijgt. Calls hebben positieve delta (0 tot 1), puts hebben negatieve delta (-1 tot 0).'
          },
          {
            type: 'table',
            content: 'Delta interpretatie',
            columns: ['Delta', 'Moneyness', 'Kans ITM bij expiratie'],
            rows: [
              ['0.80-0.99', 'Deep ITM', '80-99%'],
              ['0.50', 'ATM', '~50%'],
              ['0.30', 'OTM', '~30%'],
              ['0.10', 'Far OTM', '~10%']
            ]
          },
          {
            type: 'callout',
            variant: 'tip',
            content: 'Voor covered calls verkopen we vaak delta 0.30 strikes - dit geeft ~70% kans dat onze aandelen niet worden weggeroepen, terwijl we nog goede premium ontvangen.'
          },
          {
            type: 'heading',
            content: 'Gamma: De Verandering van Delta'
          },
          {
            type: 'definition',
            term: 'Gamma',
            content: 'De snelheid waarmee delta verandert. Hoge gamma betekent dat delta snel kan wisselen bij kleine koersbewegingen. ATM opties hebben de hoogste gamma.'
          },
          {
            type: 'callout',
            variant: 'warning',
            content: 'Gamma risk: ATM opties vlak voor expiratie hebben extreme gamma. Een kleine beweging kan je positie van winstgevend naar verliesgevend draaien. Daarom sluiten we posities vaak voor de laatste week.'
          }
        ]
      },
      {
        id: 'les-e-1-2',
        chapterId: 'ch-e-1',
        title: 'Vega en Rho',
        order: 2,
        creditsAwarded: 25,
        estimatedDuration: '15 min',
        content: [
          {
            type: 'heading',
            content: 'Vega: Gevoeligheid voor Volatiliteit'
          },
          {
            type: 'definition',
            term: 'Vega',
            content: 'De verandering in optieprijs per 1% verandering in implied volatility. Vega 0.20 betekent dat als IV met 1% stijgt, de optie $20 duurder wordt per contract.'
          },
          {
            type: 'text',
            content: 'Vega is cruciaal voor het begrijpen van je exposure aan volatiliteitsveranderingen. Optie kopers zijn "long vega" (profiteren van IV stijging), verkopers zijn "short vega" (profiteren van IV daling).'
          },
          {
            type: 'list',
            content: 'Vega kenmerken:',
            items: [
              'ATM opties hebben de hoogste vega',
              'Langere looptijd = hogere vega',
              'Als verkoper wil je lage vega of dalende IV',
              'Vega exposure is belangrijk rond earnings'
            ]
          },
          {
            type: 'heading',
            content: 'Rho: Rentegevoeligheid'
          },
          {
            type: 'definition',
            term: 'Rho',
            content: 'De verandering in optieprijs per 1% verandering in rente. Voor de meeste retail traders is Rho de minst belangrijke Greek - rentewijzigingen zijn zeldzaam en de impact is klein.'
          },
          {
            type: 'callout',
            variant: 'info',
            content: 'Focus als optie verkoper op: Delta (richting risico), Theta (je vriend, tijdsverval), en Vega (volatiliteitsrisico). Gamma en Rho zijn minder kritisch voor inkomensstrategieën.'
          }
        ]
      },
      {
        id: 'les-e-1-3',
        chapterId: 'ch-e-1',
        title: 'Portfolio Greeks Managen',
        order: 3,
        creditsAwarded: 30,
        estimatedDuration: '10 min',
        content: [
          {
            type: 'heading',
            content: 'Je totale exposure bekijken'
          },
          {
            type: 'text',
            content: 'Net als individuele opties, heeft je hele portfolio een netto delta, theta, vega, etc. Dit helpt je begrijpen hoe je portfolio reageert op marktbewegingen en volatiliteit.'
          },
          {
            type: 'example',
            content: 'Portfolio Greeks voorbeeld:\n\n• Netto Delta: +150 (je profiteert als de markt $1 stijgt: +$150)\n• Netto Theta: +$45/dag (je verdient $45/dag aan tijdsverval)\n• Netto Vega: -$200 (als IV 1% stijgt, verlies je $200)\n\nDeze portfolio is bullish, profiteert van tijdsverval, maar is kwetsbaar voor volatiliteitsstijgingen.',
            caption: 'Portfolio Greeks Analyse'
          },
          {
            type: 'callout',
            variant: 'tip',
            content: 'Het balanceren van portfolio delta is belangrijk. Als je te veel positieve delta hebt (te bullish), overweeg bearish trades toe te voegen. Zo ben je minder afhankelijk van marktrichting.'
          }
        ],
        quiz: {
          passingScore: 70,
          questions: [
            {
              id: 'q-e-1-3-1',
              question: 'Welke Greek vertelt je hoeveel je verdient door tijdsverval?',
              options: [
                'Delta',
                'Gamma',
                'Theta',
                'Vega'
              ],
              correctIndex: 2,
              explanation: 'Theta meet het dagelijkse tijdsverval van een optie. Positieve theta (bij verkochte opties) betekent dat je verdient door het verstrijken van tijd.'
            },
            {
              id: 'q-e-1-3-2',
              question: 'Je hebt een portfolio met netto delta +500. Wat betekent dit?',
              options: [
                'Je portfolio verliest $500 per dag',
                'Je portfolio stijgt $500 als de markt $1 stijgt',
                'Je portfolio is delta neutraal',
                'Je portfolio profiteert van dalende IV'
              ],
              correctIndex: 1,
              explanation: 'Netto delta +500 betekent dat je portfolio $500 in waarde stijgt voor elke $1 stijging in de onderliggende posities. Je bent "long" de markt.'
            }
          ]
        }
      }
    ]
  },
  {
    id: 'ch-e-2',
    level: 'expert',
    title: 'Geavanceerde IV Strategieën',
    description: 'IV crush benutten, volatiliteit trading, en timing van trades.',
    icon: '⚡',
    order: 2,
    estimatedDuration: '40 min',
    lessons: [
      {
        id: 'les-e-2-1',
        chapterId: 'ch-e-2',
        title: 'IV Crush Strategieën',
        order: 1,
        creditsAwarded: 35,
        estimatedDuration: '20 min',
        content: [
          {
            type: 'heading',
            content: 'Profiteren van IV Crush'
          },
          {
            type: 'text',
            content: 'IV crush is de snelle daling van implied volatility na een verwacht event. Als verkoper kun je hier bewust op inspelen door opties te verkopen voor het event en terug te kopen na de IV crush.'
          },
          {
            type: 'example',
            content: 'IV Crush trade voorbeeld:\n\n1. Tesla earnings in 3 dagen, IV = 85%\n2. Verkoop een strangle (put + call) voor $8.00 premium\n3. Na earnings daalt IV naar 50%\n4. Koop de strangle terug voor $4.50\n5. Winst: $3.50 per contract ($350 per strangle)\n\nDit werkt zelfs als Tesla 5% beweegt!',
            caption: 'Earnings Trade met IV Crush'
          },
          {
            type: 'callout',
            variant: 'warning',
            content: 'IV crush strategieën zijn niet zonder risico! Als het aandeel meer beweegt dan de IV impliceerde, kun je alsnog verlies leiden. Gebruik altijd defined-risk strategieën zoals iron condors of strangles met stop-losses.'
          },
          {
            type: 'heading',
            content: 'Timing is cruciaal'
          },
          {
            type: 'list',
            content: 'Best practices voor IV trading:',
            items: [
              'Verkoop 1-3 dagen voor earnings (IV is dan vaak op zijn hoogst)',
              'Kies strikes waar je comfortabel mee bent als ze ITM gaan',
              'Plan vooraf wanneer je wilt sluiten (bij X% winst of na de IV daling)',
              'Overweeg alleen bij hoge IV Rank (> 50%) te verkopen',
              'Beperk positiegrootte - earnings kunnen verrassingen brengen'
            ]
          }
        ]
      },
      {
        id: 'les-e-2-2',
        chapterId: 'ch-e-2',
        title: 'Volatiliteit als Indicator',
        order: 2,
        creditsAwarded: 30,
        estimatedDuration: '20 min',
        content: [
          {
            type: 'heading',
            content: 'VIX: De Fear Index'
          },
          {
            type: 'definition',
            term: 'VIX',
            content: 'De CBOE Volatility Index meet de verwachte volatiliteit van de S&P 500 over 30 dagen. Het wordt de "angst index" genoemd omdat het stijgt bij marktdalingen.'
          },
          {
            type: 'table',
            content: 'VIX Niveaus en Betekenis',
            columns: ['VIX', 'Marktsentiment', 'Actie voor verkoper'],
            rows: [
              ['< 15', 'Rustig/Complacent', 'Voorzichtig, lage premium'],
              ['15-20', 'Normaal', 'Standaard strategieën'],
              ['20-30', 'Verhoogde angst', 'Goede verkoopkansen'],
              ['30-40', 'Hoge angst', 'Zeer hoge premiums, meer risico'],
              ['> 40', 'Paniek', 'Extreme kansen, extreme risicos']
            ]
          },
          {
            type: 'callout',
            variant: 'tip',
            content: 'VIX spikes zijn vaak goede momenten om puts te verkopen. De angst is meestal overdreven en je ontvangt hoge premium. Maar wacht niet op de absolute piek - "catching a falling knife" is gevaarlijk.'
          },
          {
            type: 'text',
            content: 'Volatiliteit is "mean reverting" - het keert altijd terug naar een gemiddelde. Zeer hoge IV daalt uiteindelijk, zeer lage IV stijgt uiteindelijk. Dit kun je benutten in je timing.'
          }
        ],
        quiz: {
          passingScore: 70,
          questions: [
            {
              id: 'q-e-2-2-1',
              question: 'De VIX staat op 35. Wat betekent dit voor optie verkopers?',
              options: [
                'Stop met handelen, te risicovol',
                'Premium is hoog, goede verkoopkansen met extra voorzichtigheid',
                'Premium is laag, wacht op betere tijden',
                'Dit heeft geen invloed op individuele aandelen'
              ],
              correctIndex: 1,
              explanation: 'Bij VIX 35 is er verhoogde angst in de markt, wat resulteert in hogere optiepremiums. Dit zijn goede verkoopkansen, maar met extra risicomanagement.'
            }
          ]
        }
      }
    ]
  },
  {
    id: 'ch-e-3',
    level: 'expert',
    title: 'Collateral Optimalisatie',
    description: 'Slimme technieken om meer te verdienen met dezelfde collateral.',
    icon: '💎',
    order: 3,
    estimatedDuration: '35 min',
    lessons: [
      {
        id: 'les-e-3-1',
        chapterId: 'ch-e-3',
        title: 'Van Spread naar Iron Condor',
        order: 1,
        creditsAwarded: 35,
        estimatedDuration: '20 min',
        content: [
          {
            type: 'heading',
            content: 'De Collateral Truc'
          },
          {
            type: 'text',
            content: 'Een van de slimste technieken in optie trading: je kunt van een credit spread een iron condor maken en zo extra inkomen genereren ZONDER extra collateral te gebruiken. Hoe? Omdat een aandeel niet tegelijk fors kan stijgen EN fors kan dalen.'
          },
          {
            type: 'definition',
            term: 'Iron Condor',
            content: 'Een strategie bestaande uit een put credit spread (bullish) EN een call credit spread (bearish) op hetzelfde aandeel met dezelfde expiratie. Je profiteert als het aandeel binnen een range blijft.'
          },
          {
            type: 'example',
            content: 'Voorbeeld: AAPL staat op $175\n\nStap 1 - Je hebt een Put Credit Spread:\n• Verkoop $170 put, koop $160 put\n• Premium ontvangen: $1.50\n• Collateral nodig: $1,000 (breedte $10 × 100)\n\nStap 2 - Voeg Call Credit Spread toe:\n• Verkoop $180 call, koop $190 call\n• Premium ontvangen: $1.00\n• Extra collateral: $0 (!)\n\nResultaat:\n• Totale premium: $2.50 ($250 per contract)\n• Collateral blijft: $1,000\n• Je verdient 67% meer met dezelfde collateral!',
            caption: 'Van Spread naar Iron Condor'
          },
          {
            type: 'callout',
            variant: 'info',
            content: 'Waarom geen extra collateral? Omdat AAPL niet tegelijk onder $160 EN boven $190 kan zijn. Je verliest maximaal aan één kant - nooit aan beide. Daarom mag de broker dezelfde collateral gebruiken voor beide spreads.'
          },
          {
            type: 'heading',
            content: 'Wanneer toepassen?'
          },
          {
            type: 'list',
            content: 'Best practices voor collateral optimalisatie:',
            items: [
              'Voeg de andere kant toe als je al een spread hebt en neutrale verwachting',
              'Kies strikes ver OTM (delta 0.10-0.20) voor de toegevoegde kant',
              'De extra premium is "gratis" rendement op je bestaande collateral',
              'Werkt het beste in stabiele, zijwaartse markten',
              'Wees voorzichtig rond earnings of grote events'
            ]
          },
          {
            type: 'callout',
            variant: 'tip',
            content: 'Zelfs een kleine premium van $0.30-0.50 aan de andere kant is interessant. Het is vrijwel "gratis geld" omdat je geen extra risico loopt - je collateral was toch al vastgezet.'
          }
        ],
        quiz: {
          passingScore: 70,
          questions: [
            {
              id: 'q-e-3-1-1',
              question: 'Waarom kost het toevoegen van een call spread aan een bestaande put spread geen extra collateral?',
              options: [
                'Omdat calls goedkoper zijn dan puts',
                'Omdat het aandeel niet tegelijk fors kan stijgen en dalen',
                'Omdat de broker korting geeft',
                'Dat klopt niet, je betaalt altijd extra collateral'
              ],
              correctIndex: 1,
              explanation: 'Een aandeel kan niet tegelijk boven je call strike EN onder je put strike eindigen. Daarom loopt je maximaal risico aan één kant, en mag de broker dezelfde collateral gebruiken.'
            }
          ]
        }
      },
      {
        id: 'les-e-3-2',
        chapterId: 'ch-e-3',
        title: 'Rendement Maximaliseren',
        order: 2,
        creditsAwarded: 25,
        estimatedDuration: '15 min',
        content: [
          {
            type: 'heading',
            content: 'Return on Capital (ROC)'
          },
          {
            type: 'text',
            content: 'Als ervaren trader focus je niet alleen op premium, maar op Return on Capital - hoeveel verdien je per euro die je vastzet als collateral? Dit is je echte rendement.'
          },
          {
            type: 'formula',
            content: 'ROC = (Ontvangen Premium / Collateral) × 100%'
          },
          {
            type: 'example',
            content: 'ROC vergelijking:\n\nEnkele Put Credit Spread:\n• Premium: $1.50 / Collateral: $1,000\n• ROC: 15% (op de looptijd)\n\nIron Condor (zelfde collateral):\n• Premium: $2.50 / Collateral: $1,000\n• ROC: 25% (op de looptijd)\n\nDat is 67% meer rendement door de andere kant toe te voegen!',
            caption: 'ROC Berekening'
          },
          {
            type: 'heading',
            content: 'Annualized Return'
          },
          {
            type: 'text',
            content: 'Om trades met verschillende looptijden te vergelijken, bereken je het geannualiseerde rendement. Dit laat zien wat je zou verdienen als je dit rendement een heel jaar zou behalen.'
          },
          {
            type: 'formula',
            content: 'Annualized ROC = ROC × (365 / DTE)'
          },
          {
            type: 'example',
            content: 'Voorbeeld annualized:\n\nTrade 1: 45 DTE, ROC 8%\n• Annualized: 8% × (365/45) = 64.9%\n\nTrade 2: 14 DTE, ROC 3%\n• Annualized: 3% × (365/14) = 78.2%\n\nTrade 2 heeft een lager absoluut rendement, maar een hoger annualized rendement!\n\nLet op: annualized is theoretisch - je kunt niet elke trade precies repliceren.',
            caption: 'Annualized Vergelijking'
          },
          {
            type: 'callout',
            variant: 'warning',
            content: 'Jaag niet blind op het hoogste annualized return. Korte DTE trades hebben hogere gamma risk en minder tijd om te adjusten. Balanceer rendement met risicomanagement.'
          }
        ]
      }
    ]
  }
];

// =====================================================
// EXPORT ALL CURRICULUM
// =====================================================

export const EDUCATION_CURRICULUM: Record<UserLevel, EducationChapter[]> = {
  beginner: beginnerChapters,
  medior: mediorChapters,
  senior: seniorChapters,
  expert: expertChapters,
};

// Helper functions
export const getAllChapters = (): EducationChapter[] => {
  return [
    ...beginnerChapters,
    ...mediorChapters,
    ...seniorChapters,
    ...expertChapters,
  ];
};

export const getChapterById = (id: string): EducationChapter | undefined => {
  return getAllChapters().find(ch => ch.id === id);
};

export const getLessonById = (lessonId: string): { chapter: EducationChapter; lesson: any } | undefined => {
  for (const chapter of getAllChapters()) {
    const lesson = chapter.lessons.find(l => l.id === lessonId);
    if (lesson) {
      return { chapter, lesson };
    }
  }
  return undefined;
};

export const getChaptersForLevel = (level: UserLevel): EducationChapter[] => {
  return EDUCATION_CURRICULUM[level] || [];
};

export const getTotalLessonsCount = (level: UserLevel): number => {
  const chapters = EDUCATION_CURRICULUM[level] || [];
  return chapters.reduce((sum, ch) => sum + ch.lessons.length, 0);
};

export const getTotalCreditsForLevel = (level: UserLevel): number => {
  const chapters = EDUCATION_CURRICULUM[level] || [];
  return chapters.reduce((sum, ch) =>
    sum + ch.lessons.reduce((lessonSum, l) => lessonSum + l.creditsAwarded, 0), 0
  );
};
