# Gistrup Ande TV

[Åbn Ande TV](https://krauhe.github.io/DuckTV/) · [QR-kode til udskrift](https://krauhe.github.io/DuckTV/ande-tv-qr-print.pdf)

En browserprototype med fire løbeænder, græs, et blåt muslingebassin og justerbart vejr. Klik på græsset for at kaste pastaskruer. Hunnerne tøver og nærmer sig; hannen holder vagt og spiser aldrig. Hold venstre museknap og træk for at dreje kameraet; hold højre og træk for at flytte udsigten. Musehjulet zoomer. Piltast op/ned bevæger kameraet frem/tilbage langs græsset; venstre/højre panorerer sidelæns i forhold til synsretningen. Piltasterne afbryder automatisk kameraføring og respekterer havens grænser. Et kort venstreklik (højst 350 ms) kaster pasta på det valgte sted på græsset. Et kameratræk udløser aldrig et kast.

Haven har et aktivt areal på 10,5 × 8 sceneenheder og hæk på alle fire sider. Kameraet holdes inden for haven og højst 1,65 enheder over græsset, under hækkens top. Den hvide ands sorte hovedpletter er farvet på issen uden udstående geometri.

Efter 20 sekunder uden kamerabetjening følger kameraet langsomt flokken og retter blikket mod dens midte. Automatisk bevægelse er højst 0,24 sceneenheder i sekundet og holder mindst 1,9 enheders afstand til hver and, når afstanden allerede er til rådighed. Kommer en and selv tættere på, søger kameraet roligt væk uden at teleportere. Ved en blokeret rute bliver kameraet stående og følger med blikket. Muse-/berøringsbetjening, zoom og nulstilling af udsigten afbryder straks automatikken og starter ventetiden igen.

## Kør lokalt

### Separat træningslaboratorium (4. oktober 2026)

**Senere iteration samme dag:** Laboratoriet viser nu løbende generationsnummer, score, startstillingsprøver og gemte bevægelser i browseren. Data genindlæses hvert andet sekund. Afspilning kan standses, køres langsomt og granskes billede for billede; et valgt klip kan hentes som JSON. Den aktuelle rundes parametre og status findes i `public/training/result.json`; tidligere runder arkiveres privat i `.local/training/`. Et afsluttet træningsjob betyder ikke, at målet om realistisk andeadfærd er opfyldt.

Den første fysikmodel blev revideret efter ejerens korrektioner: Store svømmefødder skal give en rigtig støtteflade frem for støtte på benenes endepunkter. Hver fod har nu ankel, forfod og bagkant med afstands- og vinkelbegrænsninger, så fladen ikke kan vende på vrangen under belastning. Halsen har to bevægelige afsnit og søger at holde hovedet roligt, når kroppen korrigerer balancen; hovedet flyttes af de interne ledmotorer, ikke direkte af visningen. Halsen skal også være synligt lang og sammenhængende. De to halsafsnit giver stadig ikke en fuld anatomisk halshvirvelmodel.

Seneste ejerpræcisering: Føddernes store støtteareal er afgørende, og hovedet flyttes næsten ikke under balancekorrektioner. Den reviderede hals har længere fysiske afsnit og en sammenhængende synlig overflade. En lille testimpuls til brystet flytter kroppen, mens halsmotorerne holder hovedets position væsentligt roligere. Det er en intern ledstyring; næbbets retning i laboratoriets visning er fortsat en fast visuel orientering, ikke et fysisk simuleret kranieled.

`node node_modules/tsx/dist/cli.mjs scripts/train-bow.ts` optimerer et ekstra forsøg med rytmiske duk efter en afsluttet gangrunde. Tresekundersrytmen og den ønskede dukbevægelse er referenceinput fra ejeren; optimeringen justerer balanceparametre og opdager ikke selv rytmen. `pnpm export:duck-clips` gemmer en afsluttet rundes klip i `public/training/clips/` med navngivne led, knogler, referencepose, rodbevægelse, lokale koordinater, billedrate og valideringsdata. Alle er mærket `experimental-not-approved`; eksport betyder ikke, at de er realistiske eller integreret i pauseskærmen.

**Fortsat arbejde mod målet:** Et stabilt ståforsøg er opnået i korte prøver. Gang kræver stadig mindre glidning, troværdige skridt og validering over længere tid og ved forstyrrelser. Skridttælling skal skelne reelle skridt fra små gentagne kontaktudsving. Derefter mangler hurtig fremdrift med lav hals, fødesøgning, fjerpudsning, liggende hvile/søvn og de svage bassinind-/udstigninger samt glidende overgange. Social smitte mellem aktiviteter hører til flokkens adfærdsstyring. Intet af dette erklæres færdigt alene fordi et træningsjob er afsluttet eller en score er forbedret. Godkendte klip skal til sidst overføres til havens rigtige andemodel og kontrolleres der uden aktiv AI-træning.

En fejl i de første startstillingsprøver gav utilsigtet en stor begyndelseshastighed; den er rettet. »Uden fald« i dashboardet gælder fem korte startstillinger, ikke skub, ujævnt terræn eller langvarig balance. En separat test kontrollerer nu et lille skub til brystet og hovedets stabilisering. Gangscoren medtager skiftende fodløft/landinger og straffer glidning og unaturligt vippede støttefødder; visuel kontrol er stadig nødvendig, fordi en optimering kan udnytte mangler i sin bedømmelse.

Referencekontrol i denne iteration: Ejerens lokale videobillede ved 7 sekunder viser den oprejste and ved bassinet; løbevideoen `YNikukqaQnI` er igen set omkring 0:15 og tre efterfølgende billeder. Den lyse and til højre går med lavere krop og tydeligt skiftende fødder, mens andre står mere oprejst. Det bruges kvalitativt til at kontrollere forskellen mellem stilling og gang, ikke som målte ledvinkler eller automatisk motion capture. Ingen ny video er kopieret ind som webaktiv.

Åbn `training.html` på samme server som haven (lokalt fx http://127.0.0.1:5174/training.html). `pnpm train:duck` kører et afgrænset træningsforsøg og gemmer parametre, scorehistorik, validering og bevægelsesklip i `public/training/result.json`. Genbyg siden efter en ny træningsrunde, hvis den vises gennem preview-serveren. Træning er ikke aktiv under almindelig afspilning og ændrer ikke havens fire ænder.

Forsøget bruger et forenklet fysisk skelet i ét plan, vist i 3D: punktmasser, faste knoglelængder, interne ledmotorer, tyngdekraft og gulvkontakt. En reproducerbar evolutionær parametersøgning optimerer først ståstilling og derefter periodisk benbevægelse, 40 generationer med 24 kandidater pr. trin. Det er optimering af en lille bevægelsesstyring, ikke et neuralt netværk, en anatomisk muskelmodel eller fuld 3D-balance. Tidssteppet er fast på 1/120 sekund. Motorerne og gulvkontakten er en forenklet positionsbaseret fysik; naturlighed kan ikke konkluderes fra scoren.

Første kørsel: Ståforsøget forbedrede scoren fra −4,95 til 3,12, men væltede efter 2,87 sekunder. Gangforsøget forbedrede sin score fra −0,07 til 29,55, gennemførte seks sekunder uden registreret fald og rykkede 0,51 sceneenheder frem. Begge løsninger væltede ved de to ekstra prøver med en lille ændring af startstillingen. Resultatet er derfor **ikke robust og ikke klar til haven**. Næste nødvendige trin er feedback fra kropshældning/hastighed, træning på flere startstillinger og kontrol af fodglidning, balance og hovedstabilitet; en højere træningsscore alene er ikke accept.

De to skeletbilleder fra ejeren er kopieret til `input/anatomy/` som private, Git-ignorerede proportionelle referencer. Det vandmærkede billede er ikke et frit webaktiv. Knoglemål, ledgrænser, masser og muskelvedhæftninger er ikke udledt eller målt fra billederne.

**Pauseskærm uden AI:** Gem godkendte bevægelser som klip til stå, gang, løb, pudsning, søvn og bassinbesøg. En almindelig tilstandsmaskine vælger og blander dem ud fra adfærd, hastighed og retning. Fodplacering kan tilpasses med invers kinematik, og simple fjedre/fysik kan korrigere kontakt og hovedstilling. Det kræver ingen AI-model under normal kørsel. Klip alene reagerer ikke fysisk korrekt på alle forstyrrelser; de skal retargeteres til produktionsandens skelet og suppleres med overgange og kontaktkorrektioner. Laboratoriets JSON-klip demonstrerer lagring og afspilning, men er endnu ikke integration med havens andemodel. Et alternativ er at gemme en lært styring til lokal inference uden yderligere træning eller netforbindelse; dette bruger dog stadig en model ved kørsel.

Kræver Node.js 22.12+ (eller nyere understøttet LTS) og pnpm.

```sh
pnpm install
pnpm dev
```

Åbn den lokale adresse, som Vite viser. På denne pc kan `Start-Ande-TV.ps1` også bruges, når pakkerne er installeret.

```sh
pnpm test
pnpm build
pnpm preview
```

## Varig specifikation: ejerens observationer og ønsker

Samlet fra ejerens input frem til 4. oktober 2026. Dette afsnit er projektets hukommelse ved skift af 3D-model, animationssystem, fysikmotor eller programmeringssprog. Bevar adfærdsmålene nedenfor uafhængigt af den nuværende kode. En eksisterende konstant, test eller animation er ikke facit, hvis den strider mod ejerens observationer.

**Kildetyper:** Observationer beskriver ejerens egne ænder; ønsker beskriver den ønskede oplevelse. Formodninger skal forblive formodninger. De er ikke generelle biologiske konklusioner om alle løbeænder. Implementationsværdier er foreløbige, medmindre ejeren udtrykkeligt har angivet dem. Inspirationsvideoer og forskningsmetoder er referencer, ikke krav om at kopiere en bestemt teknologi.

| Emne | Viden eller ønsket adfærd, der skal bevares |
| --- | --- |
| Flokken | Fire individuelle løbeænder: én han med ring om halsen og tre hunner (tidligt beskrevet som 2–3). Udseende og individuelle forskelle skal følge ejerens billeder og videoer. De er meget sociale dyr. |
| Oprejst krop | De går ofte højt oprejst, lidt som pingviner, og ser da ret tynde ud. Krop og hals skal kunne skifte form og stilling; ikke en permanent rund krop. |
| Lav stilling | De kan også stå og gå lavere som en almindelig gråand. Skift skal være glidende og afhænge af aktiviteten. |
| Hoved under gang | Hovedet holdes roligt gennem halsens fjedring, mens kroppen bevæger sig. Det betyder stabilisering mod skridtenes vuggen, ikke at hovedet bliver stående på samme sted i haven. |
| Blik | De lægger nogle gange hovedet på skrå, når de kigger på betragteren. |
| Ben og gang | Benene må ikke være for lange. Ejeren beskriver forholdsvis strakte knæ under gang. Led skal give naturlige støtte- og fremføringsfaser; kroppen må ikke svæve løsrevet over benene. Brug gangvideoerne til kvalitativ kontrol. |
| Drejning | Ingen fastlåste ænder, der vender frem og tilbage mange gange i sekundet. Retningsvalg og kropsdrejning skal være stabile og have træghed. |
| Krop og hals | Ønske om elasticitet, masse, inerti og bevægelse via kræfter for at undgå urealistiske accelerationer. Dette er et middel til mere naturlige bevægelser, ikke et krav om maksimal deformation. |
| Bevægelige vinger | Tilføjet af ejeren 4. oktober 2026: Modellen bør senere have vinger, der kan bevæges ved løb, når anden rejser sig og basker eller strækker sig. De nuværende faste vingeformer er ikke tilstrækkelige til disse aktiviteter. Det er ikke fastlagt, at ænderne basker ved hvert løb; hyppighed, timing og omfang skal kontrolleres mod video. |
| Bassin | Det blå lave badebassin fra egne referencer er en central del af miljøet. Ænderne skal kunne besøge det og interagere i vandet. |
| Svage hop | Ejerens præcisering: De er meget dårlige til at hoppe og kan knap komme over kanten på den lave pool. Undgå atletiske spring og langsom svæven op og ned. Vis forberedelse, lille afsæt, minimal frihøjde og tyngdebestemt landing. Mislykkede forsøg er ikke specifikt observeret eller bestilt. |
| Fjerpudsning | De renser deres fjerdragt og kan ligge og nusse/pudse sig. Ejerens ord »nætter sig« forstås her som fjerpudsning; ret denne fortolkning, hvis senere input præciserer noget andet. |
| Før søvn | Ved meget aktivitet lægger de sig ofte ikke direkte til at sove: de begynder med at pudse sig. Skeln mellem vågen hvile, fjerpudsning og egentlig søvn; et lavt hoved er ikke automatisk søvn. |
| Social smitte | Ejeren oplever, at en ands fjerpudsning kan få andre til at følge efter. Hvile og søvn forekommer typisk i samme periode i flokken. Det er en observeret tendens/formodning om smitte, ikke et krav om identiske bevægelser eller simultan start. |
| Sovestilling | Hovedet hviler under/på eller ved vingen med toppen op og normal orientering. Det må hverken hænge ned eller falde bagover, heller ikke under overgangen ind i eller ud af søvn. |
| Kurmageri | Hannen laver rytmiske duk omtrent hvert tredje sekund før parring. Hvis hunnerne derefter gør det samme, kan parring finde sted. Et svar skal ikke udløse parring med sikkerhed. |
| Fødesøgning | De roder i jorden og jager nogle gange fluer/insekter. Under hurtig jagt sænkes og strækkes halsen. Synlige fluer eller biller er ønsket. Snegle som føde er ejerens formodning, ikke dokumenteret i egne gennemgåede optagelser. |
| Pasta | Et hurtigt klik kaster pastaskruer på det pågældende sted. Hunnerne er forbeholdne og drister sig gradvist frem for at spise. Hannen holder vagt og undlader at spise under denne fodringssituation. |
| Skyhed | De er ret bange for mennesker. Kameraet repræsenterer betragteren, som de helst holder mindst cirka én meters afstand til. Pasta tæt på kameraet skaber et dilemma mellem forsigtighed og lyst til at spise. |
| Udseende | Den hvide/brogede ands sorte pletter sidder oven på hovedet. De skal ikke ligne sorte ører eller udstående sidepletter. |
| Lyd | Brug ændernes rappen fra ejerens egen video. De nuværende klip er foreløbige og ikke lyttekontrollerede; behold denne usikkerhed ved senere udskiftning. |
| Have og udsigt | Udgangspunktet er familiens »ande-TV«, et hul i hækken, hvor især børn fra byen kigger ind. Den virtuelle version skal være et frit 3D-miljø med græs, eventuelt hæk, blå himmel og skyer; kameraet skal ikke nødvendigvis se gennem et hul. Haven ønskes mindre og overskuelig. Kameraet skal holdes under hækkens top. |
| Vejr | Ønske om at kunne simulere dagens vejr i 9260 Gistrup. Hold vejrdata, miljø og andeadfærd adskilt, så de kan erstattes hver for sig. |
| Betjening | Venstre museknap med træk drejer kameraet; højre med træk flytter det. Kort klik kaster pasta uden utilsigtet kast efter kameratræk. Piltast op/ned går frem/tilbage, venstre/højre panorerer sidelæns (tilføjet 4. oktober 2026). |
| Automatisk kamera | Efter en periode uden manuel kamerabevægelse følger udsigten langsomt gruppen uden at komme for tæt på. Manuel betjening overtager straks. Ventetiden 20 sekunder og autoafstanden 1,9 sceneenheder er nuværende designvalg, ikke ejerens målte værdier. |
| Tilgængelighed | Browser og GitHub foretrækkes, med en rolig pauseskærmsoplevelse. Repositorynavn DuckTV. Offentlig udgivelse er godkendt af ejeren 4. oktober 2026. |
| Private input | Egne billeder, fremtidige videoer og andet råt input skal være Git-ignoreret. Brug dem som lokale referencer; gem viden og kildehenvisninger i versionsstyret tekst. |
| Fremtidig kvalitet | Gradvis større (foto)realisme. Anatomisk skelet, muskelvedhæftninger og AI-trænet bevægelse er en undersøgt mulighed, ikke et besluttet teknologikrav. Ejeren kan optage mere video til justering af adfærd og bevægelse. |

### Senere modeltrin: udfoldelige vinger og stræk

Ejerens tilføjelse 4. oktober 2026 skal bevares ved teknologiskifte: Begge vinger skal kunne foldes ind langs kroppen og foldes ud, med led og fjerflader der følger bevægelsen. En foreslået forenkling er skulder, albue og håndled; dette er et modeldesign, ikke målte anatomiske data. Vingernes masse og træghed skal indgå, når den fysiske model udvides, så bask og stræk kan påvirke torso, fodstøtte og halsens hovedstabilisering.

Separate fremtidige trænings-/animationsforløb: rejse sig fra hvile, rejse sig og strække vingerne, et kort baskeforløb og tilbagefoldning samt eventuel brug af vinger under hurtig fremdrift. Overgange skal kunne kombineres med de eksisterende adfærdstilstande uden klip, gennemtrængning af kroppen eller tab af fodfæste. Gem senere godkendte klip med navngivne vingeled, så de kan afspilles og blandes uden AI under normal kørsel. Ingen flyvning er bestilt med dette ønske. Den nuværende plane træningsmodel har endnu ingen fysisk vingestyring; udfoldning til siderne kræver en udvidelse til bevægelse i tre dimensioner.

### Fælles fjerpudsning, hvile og søvn — implementeringsstatus

**Dokumenteret, endnu ikke implementeret:** Den nuværende kode vælger individuelle komfortpauser og holder mindst to ænder aktive. Det er et tidligere animationsvalg og skal ikke overføres som en biologisk regel. Det stemmer ikke fuldt med ejerens seneste beskrivelse af fælles hvile.

Ved en ny implementering bør hver and kunne være vågen og liggende, pudse sig og derefter falde i søvn. Aktivitet eller uro omkring flokken skal mindske tilbøjeligheden til at falde direkte i søvn. En nærliggende ands fjerpudsning/hvile skal kunne øge de andres tilbøjelighed til samme aktivitet med individuelle forsinkelser; der skal være mulighed for fælles hvile og søvn. Fjerpudsning er en sandsynlig optakt, ikke en obligatorisk sekvens hver gang. Bevar individuelle bevægelser og reaktioner på forstyrrelser. Præcise afstande, sandsynligheder, varigheder og hvilke stimuli der tæller som »meget aktivitet« er endnu ikke målt eller fastlagt.

Kontrollér visuelt ved genimplementering: Kan én and begynde at pudse sig og gradvist få selskab? Kan flokken falde til ro samtidig uden synkrone animationer? Gør aktivitet direkte søvn mindre sandsynlig? Forbliver sovende hoveder opret orienteret gennem hele overgangen? Disse er adfærdsmål, ikke påstande om, at den nuværende version allerede opfylder dem.

### Referenceoversigt og egne kilder

Videolinks opbevares i de lokale, Git-ignorerede referencenoter `andereferencer/inspirationsvideo-links.txt`. Nedenfor bevares titler, formål og observationer uden links til inspirationsvideoerne.

| Kilde | Formål |
| --- | --- |
| Egen video: `andereferencer/2025-09-09 14.15.35.mp4`; oprindeligt Downloads-mappen | Egne ænder, det blå bassin, bevægelse og rappen. Råvideoen forbliver privat og Git-ignoreret. |
| Egne fotos og øvrige udtrukne videobilleder i `andereferencer/`; lokalt register `andereferencer/kilder-og-vurdering.txt` | Individernes proportioner, farver, aftegninger og havens bassin. Nye rå input placeres i `input/`. |
| Havecenter: 1IbxRBVFPuQ | Adfærdsinspiration: fødesøgning, hvile og interesse for vand. |
| Løb: YNikukqaQnI | Gang/løb, kropsholdning og ben; delt via Google-videosøgning. |
| Fødesøgning: LW8hAfoDwXo | Hals, fødder og søgeadfærd; delt via Google-videosøgning. |
| Muskelbaseret bevægelse: pgaEE27nsQw | Inspiration til skelet, muskler, masse og optimering af bevægelse. |
| Elasticitet: higGxGmwDbs | Inspiration til elastisk krop/hals og volumenbevarende deformation. |
| Indlært samspil: SsJ_AusntiU | Inspiration til fysisk simulerede figurers lærte bevægelse og interaktion. |

Ved teknologiskifte læses dette afsnit først, derefter de detaljerede referencenoter nedenfor. Bevar skellet mellem observation, ønske, formodning og implementeret funktion. Tilføj nye korrektioner her med dato og kilde; lad ikke gamle kodebegrænsninger overskrive viden om de virkelige ænder.

## Projektets dele

- `src/simulation.ts`: adfærd og indstillinger i `BEHAVIOR`; kan testes uden grafik.
- `src/dynamics.ts`: begrænsede drivkræfter og dæmpede masse-fjedre.
- `src/duck-model.ts`: fire foreløbige, proceduralt byggede 3D-modeller og bevægelser.
- `src/environment.ts`: have, muslingebassin, vand, skyer og vejr.
- `src/weather.ts`: Open-Meteo for et punkt i Gistrup, lokal cache og fejlbehandling.
- `src/main.ts`: scene, kamera, kast og betjening.
- `andereferencer/`: private fotos og videoer. Ignoreres af Git og indgår ikke i webbygningen.

## Status og afgrænsning

Dette er en første kørbar prototype. Modellerne er fortolkninger af referencerne, ikke færdige Blender-modeller eller præcise rekonstruktioner. Animationerne er kodestyrede. Mere varieret fjerpudsning, realistisk fodkontakt, avanceret badning/sprøjt og en egentlig Windows-pauseskærm er senere trin. Vejret kan vælges manuelt eller følge Gistrup; realtidsvalget anvender vejrmodeldata, ikke en måler i haven. Aktuel dag/nat understøttes, mens præcis solbane og sne ikke er implementeret.

Hver besøgende kører sin egen simulation. Der er ingen fælles server eller login. Lydknappen aktiverer tre foreløbige udsnit fra ejerens video (3,20–3,85 s, 12,16–13,18 s og 19,72–20,88 s). De afspilles med 12–28 sekunders mellemrum, dæmpes med kameraafstanden og stopper i skjulte faner. Udvælgelsen er baseret på lydaktivitet, endnu ikke lyttekontrolleret; WAV-filerne i public/audio er derfor lokale og Git-ignorerede indtil kontrol. Originalvideoen forbliver i de ignorerede referencer.

### Masse, træghed og elasticitet

Gang og svømning styres nu gennem ønsket hastighed og en begrænset drivkraft: kraften ændrer hastigheden efter F = m·a. Hver and har en foreløbig modelmasse, og drejninger har vinkelhastighed, inertimoment og begrænset drejningsmoment. Start, retningsskift og stop sker derfor gradvist; anden bremser også ved pauser og kurmageri. Værdierne er indstillinger i sceneenheder, ikke målte vægte eller biologiske egenskaber.

Dæmpede masse-fjedre giver kroppen hældning ved acceleration og sving samt elastisk overgang mellem slank og lav kropsform. Halsen får en lille inertireaktion, samtidig med at hovedstabiliseringen kompenserer for skridtenes vuggen. Stivhed og dæmpning holder bevægelserne små og får dem til at falde til ro.

Benenes fæste følger et punkt inde i den formede krop, også under vuggen og stillingsskift. Hvert ben har nu lår, knæ, underben, hase og fod. Knæet ligger fremad og overvejende inde i fjerdragten; haseleddet bøjer bagud. [Anatomisk baggrund fra Reid Park Zoo](https://reidparkzoo.org/why-do-birds-knees-bend-backwards/). Proportionerne er stadig modelvalg, ikke målte andeknogler.

`src/duck-gait.ts` lader støttefoden holde sin position og retning i haven, mens kroppen passerer den. Den anden fod løftes, føres frem og sættes ned med glidende overgange. Skridtene udløses af faktisk bevægelse og drejning, og en påbegyndt fremføring afsluttes ved stop. Hurtig gang giver kortere fremføringstid; drejninger på stedet giver små omplaceringsskridt. Knæ og hase bøjes geometrisk mellem kroppen og fødderne. Det er fortsat en proceduralt styret gang på fladt underlag, ikke muskelstyring, fysisk balance eller videoindlært gang.

Efter ejerens korrektion og ny visuel kontrol af løbevideoen omkring 0:14 og 0:22 er benstykkerne forkortet, især stykket fra hase til fod (0,30 til 0,17 modelenheder). Kroppen ligger lidt lavere over fødderne i oprejst stilling. Knæet er næsten strakt under støtte og bøjer mere under fremføring. Videoen bruges til en kvalitativ sammenligning; længder og vinkler er ikke målt fra den.

Dette er en hybrid mellem adfærd, fysik og styrede animationer. Ved bassinkanten vender anden sig mod landingen og samler benene før et afsæt. Selve luftfasen følger nu en ballistisk bane med konstant tyngdeacceleration (9,81 i sceneenheder) og varer omtrent 0,6 sekunder. Impulsen tilpasses modelmassen og den nødvendige frihøjde. Der er ingen langsom ind-/udtoning af højden under flyvningen. Fødderne trækkes op, svømmestillingen forberedes på vej ned, og vandlandingen udløser en dæmpet dukkert og tydelige ringe. Afsæt og kontakt med vandet er fortsat forenklede. Fodkontakt, vandets opdrift og hele kroppen simuleres endnu ikke fysisk. Kollisionskorrektioner kan stadig flytte ænder direkte ved kontakt; accelerationens grænse gælder drivkraften i fri bevægelse. Der er endnu ikke et anatomisk skelet med fleksible led langs hele halsen.

Vejen mod større fotorealisme: (1) fodfæste og støttefaser, (2) anatomisk krop og hals med flere led og hud, der følger leddene, (3) individuelle fjerfarver og overfladedetaljer fra referencebilleder, (4) mere naturtro lys, skygger og vand. Fysik skal understøtte de observerede bevægelser; mere elasticitet alene giver ikke større realisme.

### Ejerens adfærdsobservationer, 4. oktober 2026

Løbeænderne veksler mellem oprejst, næsten pingvinagtig stilling og en lavere gråandestilling, også under gang. De lægger af og til hovedet på skrå, når de ser på en. Før parring laver hannen rytmiske duk omtrent hvert tredje sekund; efterfølgende duk fra hunnen kan gå forud for en parring.

Under gang holder de hovedet roligt ved at fjedre i halsen (ejerens præcisering). Ganganimationen kompenserer nu for kroppens lodrette bevægelse og vuggen gennem halsens retning og længde. Hovedet følger andens fremdrift, men hopper ikke med hvert skridt; bevidste blik, hovedhældninger, fødehak og kurmageriduk bevares.

Kropsformen følger også stillingen: oprejste ænder får et smallere, mere langstrakt bryst med tættere vinger, mens den lave stilling bliver fyldigere og længere vandret. Krop, vinger og hale formes samlet; hoved og fødder bevarer deres størrelse. Halsens fæste følger kroppens form, så hovedstabiliseringen stadig virker. Proportionerne er en foreløbig visuel fortolkning af ejerens beskrivelse.

Prototypen har nu glidende stillingsskift, hovedhældning mod betragteren og korte, gensidige kurmageriforløb. Hannens duk gentages hvert tredje sekund; en hun kan svare med forsinkelse eller undlade at svare. Fodring har forrang og afbryder forløbet. Selve parringen er endnu ikke animeret. Svarprocent, forsinkelse, hyppighed og forløbets længde er foreløbige designværdier i `BEHAVIOR`, ikke målte eller biologisk validerede tal. Video kan bruges til at justere dem.

### Fjerpudsning og søvn

Efter ejerens beskrivelse tager alle fire ænder nu individuelle pauser med korte pudsestrøg mod vingen og senere en lur: kroppen sænkes, benene foldes ind, øjnene lukkes, og hovedet lægges tilbage med næbbet mod vingen. Mindst to ænder forbliver aktive. Et pastakast afbryder pauserne, og hannen genoptager sin vagtrolle. De første pudsepauser kan optræde efter cirka 35 sekunder; søvn følger i senere pauser. Tiderne, fordelingen og bevægelserne er foreløbige animationsvalg. Sovestillingen er ikke sikkert observeret i de hidtil gennemgåede klip.

### Insektjagt og fødesøgning

Ejeren beskriver hurtige løb efter fluer med halsen sænket samt roden i jorden. Alle fire ænder kan nu tage korte jagtture med halsen frem og ned og hurtigere skridt, eller søge i jorden med små skridt og pauser med næbbet nede. Insekterne har først et fast sted i haven, som anden nærmer sig. Ved tæt afstand flygter insektet kort væk i sin egen retning. Under jagt strækkes hals og hoved frem i en mere strømlinet stilling. Dette følger ejerens observation; flugtafstand og hastighed er foreløbige animationsvalg, og fangst er endnu ikke simuleret. Jagten bruger samme begrænsede drivkraft som almindelig gang, en fast kort rute væk fra bassinet og efterfølgende opbremsning. Pasta afbryder aktiviteterne; hannen holder da vagt og spiser ikke pasta. Hastigheder, hyppigheder og varigheder er animationsvalg. Snegle som fødekilde er ejerens formodning og er endnu ikke modelleret.

### Forsigtighed over for kameraet

Ejeren beskriver ænderne som sky over for mennesker. Kameraets position på græsplanet fungerer derfor som betragterens position. Ænderne foretrækker mindst cirka én meters afstand: buff 1,05, han 1,10, brun 1,15 og broget 1,25 sceneenheder, foreløbigt fortolket som meter. Bevægelsen begynder at bremse før grænsen, og tilbagetrækning fortsætter lidt længere ud for at undgå gentagne retningsskift ved samme afstand.

Pasta inde ved kameraet kan friste hunnerne hen til grænsen, hvor de tøver; pasta helt tæt på bliver liggende. Hvis betragteren trækker sig, kan de fortsætte. Et kamera, der kommer tæt på, afbryder spisning, hvile og insektjagt; svømmende ænder søger væk inden for bassinet. Et igangværende hop afsluttes først. Dette er en ønsket afstand med begrænset acceleration, ikke en usynlig væg: hurtige kameraflytninger eller lidt plads ved bassin/hæk kan kortvarigt give mindre afstand. Hannen spiser fortsat ikke pasta.

## Nye videoer til kalibrering

### Muskelbaseret bevægelseslæring — forskningsreference

Ejerens YouTube-reference er til *Flexible Muscle-Based Locomotion for Bipedal Creatures* (Geijtenbeek, van de Panne og van der Stappen, SIGGRAPH Asia 2013). [Forfatternes projektside](https://www.cs.ubc.ca/~van/papers/2013-TOG-MuscleBasedBipeds/index.html) og [artikel](https://www.cs.ubc.ca/~van/papers/2013-TOG-MuscleBasedBipeds/2013-TOG-MuscleBasedBipeds.pdf).

Metoden optimerer styring, muskelforløb og muskelegenskaber inden for en angivet model. Den kan finde gangmønstre uden optagede referencebevægelser og kræver en tilnærmet skabelon for muskelvedhæftninger frem for en fuldt kendt anatomi. Det er et relevant spor til et separat forsøg med én fysisk løbeand. Resultaterne er ikke validering af andeanatomi eller garanti for en korrekt andegang. Den nuværende DuckTV-kode anvender endnu ikke denne metode. Referencen er kontrolleret via forskernes artikel; videoen er ikke gennemgået billede for billede eller hentet lokalt.

### Elasticitet og indlært styring — supplerende forskningsreferencer

Ejerens to yderligere videolinks er undersøgt gennem de tilhørende forskningskilder den 4. oktober 2026. Videoerne er ikke gennemgået billede for billede eller hentet lokalt.

- VIPER-video: *VIPER: Volume Invariant Position-based Elastic Rods* (Angles m.fl., 2019). [Artikel](https://arxiv.org/abs/1906.05260), [forskningskode](https://github.com/vcg-uvic/viper). Elastiske stave og bundter kan bøje, strække og deformere overfladen med bevaret volumen; eksempelvis bliver en strakt struktur tyndere. Relevant inspiration til hals og blødt væv omkring et skelet. Metoden leverer deformation, ikke i sig selv indlæring af gang. Den publicerede implementation bruger CUDA og er ikke en direkte browserkomponent. Repositoryets to demoaktiver har særskilte begrænsninger og skal ikke kopieres ind i DuckTV.
- Boksevideo fra Two Minute Papers: *Control Strategies for Physically Simulated Characters Performing Two-player Competitive Sports* (Won, Gopinath og Hodgins, 2021). [Publikation](https://doi.org/10.1145/3450626.3459761), [læst artikelkopi](https://hbryu.github.io/Control%20Strategies%20for%20Physically%20Simulated%20Characters%20Performing%20Two-player%20Competitive%20Sports.pdf). Figuren lærer først grundfærdigheder fra motion capture og derefter samspil gennem reinforcement learning. Styringen angiver ønskede ledvinkler, som omsættes til drejningsmomenter; den kræver ikke en komplet muskelmodel. Relevant inspiration til at adskille andens bevægelsesfærdigheder fra dens sociale beslutninger. Almindelig andevideo skal først omsættes til brugbare bevægelsesreferencer og svarer ikke direkte til artiklens motion capture-data.

Anbefalet forsøg for DuckTV: én and med et forenklet skelet, realistiske ledgrænser, massefordeling og fodkontakt. Træn balance, start/stop og gang med roligt hoved, og sammenlign med ejerens videoer. Tilføj derefter elastisk hals/krop og senere hop og vandkontakt. Træningen bør foregå separat; browserens første integrationsforsøg skal måle, om den færdige styring og fysikken kan køre stabilt med fire ænder. Muskelvedhæftninger kan undersøges senere, hvis enklere ledstyring ikke giver tilstrækkeligt naturtro bevægelser. Dette er en foreslået udviklingsretning, ikke implementeret AI-træning eller valideret andeanatomi.

### Bevægelsesreferencer: løb og fødesøgning

Ejerens to Google-videolinks peger på nedenstående YouTube-videoer. Udvalgte tidspunkter og korte sekvenser med fremrykning billede for billede blev gennemgået den 4. oktober 2026. Der er ikke foretaget en fuld videoanalyse eller måling af skridtfrekvens. Originalerne er ikke hentet ind i projektet.

| Reference | Gennemgået udsnit | Observation | Anvendelse i næste animationsiteration |
| --- | --- | --- | --- |
| Loopeenden die rennen ! — Fred Graspol, 1:02 | Omkring 0:13, inklusive successive billeder; desuden 0:18, 0:23 og 0:28 | En lys and bevæger sig mod højre med skiftevis fremført og støttende fod. Nogle ænder hælder fremad, mens andre er mere oprejste. Flokken har forskellig placering og skridtfase. | Tydelig forskel mellem rolig gang og hurtig fremdrift. Knyt skridtlængde og frekvens til hastigheden; giv foden en støttefase og en løftet fremføringsfase. Undgå synkron gang i flokken. |
| Indiske løbeænder – sneglespiser — Jon Bertelsen, 1:59 | 0:13, 0:18 og 0:23–0:24, sidstnævnte med successive billeder | Ænderne sænker og strækker halsen mod underlaget. Omkring 0:23–0:24 løfter den forreste brune and hovedet fra jorden og flytter en fod, mens den hvide fortsat søger lavt. En anden and står oprejst i baggrunden. | Små skridt og pauser under fødesøgning, med selvstændige hals- og næbbevægelser. Lad stillingen afhænge af aktivitet frem for kun et periodisk skift. |

Prioritet for bevægelsesarbejdet: (1) fodkontakt og hastighedstilpassede skridt, (2) langsom fødesøgning med halsen frem/ned, (3) tydelige overgange mellem pause, gang og hurtig bevægelse. Den allerede implementerede hovedstabilisering under gang bevares, mens bevidste søgebevægelser stadig kan flytte hovedet. Videoerne er kvalitative referencer; de bruges ikke som belæg for et helt ubevægeligt hoved, præcise hastigheder eller bestemt køn/vagtrolle. Ovenstående punkter om skridt og fødesøgning er dokumenterede forslag, endnu ikke implementerede ændringer.

### Videoreference: løbeænder i havecenter

Indiske løbeænder elsker dræbersnegle — Lyngby Havecenter, 1:12. Tilføjet af ejeren og visuelt gennemgået i udvalgte billeder den 4. oktober 2026. Observationerne gemmes her; videolinket ligger i de private referencenoter.

| Omtrentligt tidspunkt | Synligt i de gennemgåede billeder | Forslag til simulationen |
| --- | --- | --- |
| 0:10 | Flere ænder søger med næbbet nede i græsset; hovederne er i forskellige højder. | Selvstændig fødesøgning med korte skridt og usynkroniserede hak, også uden kastet pasta. |
| 0:21–0:26 | En lys and står højt oprejst, mens en anden hviler lavt i græsset. | En egentlig liggende hvilestilling med benene skjult under kroppen, adskilt fra lav gangstilling. |
| 0:31–0:36 | Flere ænder står tæt samlet omkring samme vandbeholder. | Fælles interesse for bassinet, med flere pladser langs kanten og individuel afstand. |
| 0:41–0:46 | Ænder ses tæt ved vand; ved 0:46 står to med næbbet ned mod vandoverfladen. | En separat drikkeadfærd ved kanten, så et vandbesøg ikke altid kræver svømning. Den fulde bevægelse skal kalibreres med et sammenhængende forløb. |
| 1:06 | Flere ænder ligger tæt samlet på jorden med forskellige hovedstillinger. | Små fælles hvileperioder, hvor ikke alle laver samme bevægelse samtidig. |

Fjerpudsning og en individuel liggende sovepause er siden tilføjet ud fra ejerens beskrivelse. Fælles hvileperioder, fødesøgning og drikning ved bassinkanten er fortsat forslag til næste iteration. De stikprøvevis gennemgåede billeder bruges ikke til at måle gangfrekvens, bestemme køn eller bekræfte kurmageriets tresekundersrytme. Den rytme stammer fortsat fra ejerens egne observationer.

Optag gerne et sammenhængende forløb før, under og efter et kast. Hele flokken og fødderne bør være synlige. Notér hvem der er hvem. Relevant: tøvetid, små stop, afstand til andre, hvem der følger hvem, hannens vagtposition, ind-/udstigning og kropsholdning i bassinet. Justér værdierne i `BEHAVIOR` og animationerne efter observerede forløb; de nuværende værdier er designvalg, ikke målte dyreadfærdsdata.

## GitHub og private input

Repository: [**DuckTV**](https://github.com/krauhe/DuckTV), offentligt efter ejerens godkendelse 4. oktober 2026. Push til main udløser test, build og udgivelse.

Læg alle nye billeder, videoer og øvrige rå input i `input/` (opret mappen lokalt efter behov). Hele mappen ignoreres, uanset filtype. `andereferencer/`, `inputs/`, `reference/` og `references/` er også ignoreret; almindelige foto-, video- og lydformater ignoreres desuden overalt i projektet. Referencer skal blive uden for `public/`, så de heller ikke kommer med i webbygningen. Kun bevidst udvalgte, færdige webaktiver bør senere tilføjes til Git.

## GitHub Pages

[Åbn Gistrup Ande TV](https://krauhe.github.io/DuckTV/). Workflowet i `.github/workflows/pages.yml` tester, bygger og udgiver ved push til main eller manuel kørsel. Siden bruger relative aktivstier og virker under `/DuckTV/`.

[QR-kode med logo](public/ande-tv-qr.png) · [QR til udskrift](public/ande-tv-qr-print.pdf). QR-koden åbner selve pauseskærmen. Private referencefiler og lydoptagelser er ikke med i den offentlige udgave. Træningslaboratoriets gemte forsøg kan afspilles, men træningen er pauset.

Vejr: [Open-Meteo](https://open-meteo.com/), CC BY 4.0. Den gratis API er til ikke-kommerciel brug inden for udbyderens grænser. Ved væsentligt flere besøgende bør vejrdata deles via en fælles cache. [Vilkår](https://open-meteo.com/en/terms).

## Validering

Simulationens tests kontrollerer blandt andet madgrænser, hannen som vagt, hunnernes spisning, tidssteg og bassinbesøg. Browserkontrol foretages mod den lokale Vite-server med den installerede Chrome/Playwright; lokale testartefakter ligger i `test-results/` og ignoreres af Git.

### Individuelle behov og social påvirkning
Hver and har sit eget badebehov, hvilebehov og sociale temperament. Behovene ændres løbende: svømning reducerer badebehovet, søvn reducerer hvilebehovet. Nære naboers hvile øger tilbøjeligheden til fjerpudsning og derefter søvn; aktivitet hæmmer den. Alle fire må hvile samtidig, og hannen kan også bade. Naboerne aflæses fra samme øjebliksbillede, så beslutninger ikke smitter gennem hele flokken på én opdatering. Hunnen vurderer en parringsinvitation efter en forsinkelse ud fra egne behov, afstand og kameraets nærhed. Pasta og utryghed kan afbryde. Navigation, kø ved bassinet og kollisionskorrektion er fortsat fælles tekniske regler; der er ingen fælles rute, som flytter hele flokken. Parametrene er foreløbige animationsvalg, ikke målte biologiske værdier. Dette erstatter den tidligere regel om højst to hvilende ænder.


### Døgn og aftenbur
Indstillinger findes nu i bundpanelet: vis det med musen, tabulator eller tryk på bjælken. Her findes vejr, grafik, lyd, automatisk kamerafølge, nulstilling, pasta og fuld skærm. Escape lukker panelet. Tid kan følge dansk klokkeslæt, vælges med slideren eller gennemløbe et døgn på fem minutter; slideren skifter automatisk til manuelt tidspunkt.

Solopgang og solnedgang beregnes lokalt for dagens dato ved Gistrup (56.995 N, 9.995 E) med [NOAA's tilnærmede solformler](https://gml.noaa.gov/grad/solcalc/solareqns.PDF) og Europe/Copenhagen, inklusive sommer-/vintertid. Lyset glider gennem skumringen. Tidspunkterne er omtrentlige visualiseringstider, ikke en præcis astronomisk almanak. Døgnforløbet gentager dagens lysforhold, ikke skiftende datoer.

Fra et kvarter før solnedgang søger hver and mod en egen hvileplads i det lille åbne bur i havens bageste venstre hjørne. Den går via forsiden, pudser fjer og sover. Ænder i bassinet afslutter hoppet og går op, før de søger hjem. Kameraet kan stadig skræmme dem, og nærliggende pasta kan kort forsinke hjemturen. Ved solopgang vågner de igen. Overgangen flytter ikke ænderne øjeblikkeligt, selv om tids-slideren springer flere timer. Tidsvalg er en sceneindstilling; simulationens bevægelseshastighed forbliver naturlig.

Logo: det valgte enkle forslag 1 med sort øje er gemt som godkendt projektgrafik i public/gistrup-ande-tv.png. Private billeder og lyd er fortsat ignoreret.

### Hovedstabilisering i vand
Ejerobservation: også under badning holdes hovedet roligt, mens kroppen gynger op og ned. Halsen skal optage denne bevægelse. Modellen kompenserer nu for 94 procent af vandets lodrette forskydning via halsen, mens hovedets størrelse og tilsigtede blikretning bevares. Procenten er et foreløbigt animationsvalg. Hoppene ind og ud kompenseres ikke som bølgebevægelse. En regressionstest kontrollerer alle fire modeller mod samme svømmepose uden bølger.


Søvnreference fra ejeren: andereferencer/sleep-head-upright-wing-reference.jpg (privat). Hovedet hviler opret ved vingen med næbbet i fjerene; det må ikke vælte bagover efter fjerpudsning. Overgangen fra fjerpudsning til søvn testes særskilt, fordi en korrekt slutstilling ikke alene sikrer en korrekt overgang.


Fjerdragt: fælles proceduregenererede farve- og reliefteksturer på krop, hals, hoved, hale og vinger. Fine fjerfaner og forskudte fjerrande giver overfladestruktur; vingerne har flere overlappende dækfjer og otte synlige svingfjer. Teksturerne modulerer de fire oprindelige farvetegninger og deles mellem modellerne. Det er fortsat stiliserede modeller, ikke fotoscannede fjer.


### Gangtræning: verificerede skridt
Ny træningsrunde bruger mindst 90 ms frit fodløft, 2,5 cm frihøjde, 4,5 cm fremføring og skiftevis landing før et skridt tælles. Den gamle tæller kunne belønne kontaktflimmer. Efter 12 generationer opnår kandidaten 1,60 sceneenheders fremdrift og 9 skridt på seks sekunder; 4/5 korte startstillinger holder balancen. En separat 30-sekunders prøve giver kun 3/5 uden fald (én falder efter 12,83 sekunder og én efter 1,40). Fodglidning er stadig betydelig. Klippet er eksperimentelt og ikke godkendt til den almindelige have; bøje-klippet fra den tidligere runde bevares i biblioteket. Sceneenheder og anatomi er fortsat ikke målt mod de virkelige ænder.


Den efterfølgende robusthedsrunde bruger fem startstillinger og 12 sekunders træning med stor straf for fald. Efter otte generationer klarer den nye kandidat alle fem separate 30-sekunders prøver uden fald. Den nominelle prøve giver 5,26 sceneenheders fremdrift, 49 registrerede skridt og 1,13 i den samlede fodglidningsmåling. Første seks sekunder: 0,96 fremdrift og 0,33 glidning (forrige kandidat 1,60 og 0,83). Hele 30-sekunders optagelsen og de længere valideringer gemmes nu i klipbiblioteket og vises i browseren. Dette er fortsat en plan model uden ydre skub; det beviser hverken anatomisk realisme eller færdig robusthed. Scores fra forskellige træningskriterier må ikke sammenlignes direkte.


### Balance efter ydre skub
En impuls kan nu tilføres brystets massepunkt via hastighedshistorikken uden at flytte punktet øjeblikkeligt. Gangpolitikken er afprøvet med skub ved 3 sekunder og samlet prøvelængde 15 sekunder. Impulser ±0,4 og ±0,8 klares uden fald; −1,6 medfører fald ved 3,88 sekunder og +1,6 ved 4,73 sekunder. Tallene er i modellens ukalibrerede enheder. Det er seks scenarier med samme grundstartstilling, ikke en generel robusthedsgaranti. Optagelserne Skub fremad og Skub bagud viser ±0,8 med en tidsmarkering ved påvirkningen. Begge gemmes i bevægelsesbiblioteket sammen med stå-, gang- og duk-klippene. Næste balancearbejde bør adressere opsamlingsskridt efter større forstyrrelser; den nuværende styring korrigerer primært via anklerne.


### Reaktiv hofte ved balancefejl
En separat søgning afprøver 28 kombinationer af hoftekorrektion og ekstra knæløft. Korrektionen aktiveres først ved større forventet kropshældning og virker via de interne ledmotorer på svingbenet. Den bedste afprøvede kombination er hoftefaktor −0,2 og intet ekstra knæløft. Ved impuls +1,6 efter tre sekunder klarer den nu 30 sekunder uden fald; tidligere faldt basisgangen ved 4,73 sekunder. Ved −1,6 falder den stadig ved 3,89 sekunder. Begge  optagelser findes som Balancereaktion fremad/bagud, inklusive fejlen og impulsmetadata. Denne kandidat erstatter ikke automatisk den oprindelige gang: den er kun afprøvet i få forstyrrelsesscenarier, og glidning er stadig synlig.


### Start, stop og genstart
Ny særskilt trænet sekvens: blød igangsætning, opbremsning fra 3,2 til 4 sekunder, pause indtil 6 sekunder og derefter genstart. Gangfasen sættes på pause, så den ikke springer til en tilfældig benstilling ved genstart. Efter otte generationer a 16 kandidater holder alle fem afprøvede startstillinger balancen gennem 12 sekunder. I den nominelle prøve flytter kroppen sig −0,00038 sceneenheder mellem 4,5 og 5,5 sekunder, mens tåpunkterne driver cirka −0,0076 og +0,0067. Fødderne er derfor ikke perfekt fastlåst. Sekvensen er gemt som start-stop-candidate, med instruktion og validering; den er endnu ikke godkendt til hovedscenen.

### Afprøvning af optagelser på havens model
Træningsafspilleren har et valgfrit felt “Havens andemodel (forsøg)”. Her driver optagelsens ankelpositioner modellens eksisterende ben-IK. Bækkenets position, kroppens hældning, hovedets position og føddernes vip følger nu optagelsen. Akser og skala oversættes i src/training/retarget.ts. Visningen følger anden, så hele lange forsøg kan ses. Afspilningen bruger kun gemte data og almindelig animation, ingen træning eller modelinferens.

Dette er en delvis overførsel: halsens kurve og knæets bøjeretning bruger stadig havens animationsrig. Hovedet holdes opret, da optagelsen ikke indeholder en målt kranierotation. Det skal derfor ikke vurderes som en fuldstændig gengivelse af fysikforsøget. Normalvisningen bevarer alle optagne led, og hovedscenen er endnu ikke skiftet til de eksperimentelle klip. Tests kontrollerer, at optagne fodmål faktisk bruges ved hastighed nul og at benlængderne bevares for de afprøvede bevægelser. Hvert tredje billede af det gemte 30-sekunders gangklip afprøves desuden for korrekt bækkenmidte, kropshældning og hovedposition.

### Længere start–stop-prøve og ny duk-runde
Start–stop-kandidaten er nu afprøvet i fem startstillinger over 30 sekunder: alle uden fald. Den nominelle optagelse har 5,15 sceneenheders fremdrift, 42 registrerede skridt og 1,15 i samlet fodglidning. Optagelsen og biblioteksklippet er forlænget til 900 billeder.

Rytmiske duk er genberegnet med 20 generationer a 12 kandidater. Den sekssekunders træningsscore steg kun fra 27,8999 til 27,9347; der er ikke grundlag for at kalde det en stor bevægelsesforbedring. Alle fem efterfølgende 30-sekunders prøver var uden fald. Den tresekunders rytme er en angivet målbane fra ejerens observation, ikke indlært fra videopixels. Det nye klip er gemt sammen med de øvrige syv, uden at overskrive skubforsøgene. Visuel kontrol viser fortsat en for sammenpresset hals i havemodellens dybe duk: den nuværende overførsel skalerer halsen mellem bryst og hoved og skal erstattes af en bøjet hals, der bevarer sin længde bedre.
### Bøjet hals ved afspilning
Havemodellens træningsvisning bruger nu en separat, sammenhængende halsoverflade gennem brysttilhæftning, krave, optaget halsled og hoved. Radius profilen bevares under duk; afstanden mellem bryst og hoved skalerer ikke længere fjerdragtens tykkelse. Halsroden starter inde i brystet. Kraniets position og oprette orientering følger samme optagelse som før. Det er geometrisk tilpasning af optagelsen, ikke en ny fysisk halsmodel eller en garanti for konstant buelængde.

Regressionstesten gennemløber hvert tredje billede af 30-sekunders duk-klippet og kontrollerer endepunkt ved hovedet, endelige koordinater, bevaret tykkelse, reel kurvatur samt skift tilbage til almindelig animation. Browserkontrollen ved 0,5 sekunder viser en bøjet hals frem for den tidligere korte stump. Den almindelige have bruger fortsat sin hidtidige halsanimation.
### Reference: enkelt muslingebassin og gulvkontakt i afspilleren
Ejerens bassin er én blå plastmuslingeskal, uden den anden låg-/bassindel. Privat produktreference: andereferencer/blue-single-shell-pool.webp. Bassinet har nu en flad bagkant, bølget forkant, tilpasset vandflade og vifteformede bundribber.

Ved duk viste afspilleren overdreven fodglidning, fordi den trak bækkenets position fra alle led, men lod gulvet stå stille. Det er rettet til fælles verdenskoordinater; kameraet følger først uden for en lille zone, så balancebevægelser ses mod et fast gulv. I det første tresekunders duk er optagelsens bækkenudsving 0,03145 sceneenheder og tåudsving 0,00258. Den lille resterende fysiske glidning er bevaret og ikke skjult med fastlåsning af optagelsen.
### Kollisioner mellem ænder og bur
Havens simulation har supplerende kollisionsvolumener for krop, hale, hals og hoved. Hovedets rækkevidde øges ved hak og insektjagt. Volumenerne følger drejningen, og kontakt løses efter rotationen, også for hvilende ænder. Burets to sider og bagvæg er faste vægge med sikkerhedsmargin; fronten er åben. Et hoved, der under en drejning har passeret en væg, føres tilbage til kroppens side af væggen. Hastighed ind i kontaktfladen fjernes.

Ænderne søger lidt til siden før sammenstød. En and på tilbagetog får mere plads af naboen, så kameraangst ikke låser den fast i flokken. Dette er geometriske tilnærmelser til de animerede modeller, ikke fjer-for-fjer-kollisioner. Tests dækker sammenfaldende og sovende ænder, fremstrakt hoved ved burets vægge, åben indgang, natlig indgang, kameraafstand, fodring og badning. Træningsarbejdet er fortsat pauset.
### Søvn: roligt hoved på ryggen
Ejerkorrektion: ingen rytmisk hovedbevægelse under søvn; hovedet skal helt ned og hvile på ryggen. Søvnposen blander nu hovedets position til et fast støttepunkt ved ryg/vingen, mens hovedet bevarer opret orientering. Fjerpudsningens rytme og den lille periodiske kropsbevægelse udfases under indsovning. Regressionstest af alle fire farvevarianter kontrollerer, at hovedet står stille efter overgangen, ligger ved støttepunktet, og stadig kan løftes ved opvågning.
### Let flydende krop med stabiliseret hoved
Ejerobservation: ænderne flyder let og højt, kroppen kan gynge, mens halsen optager forstyrrelser og hovedet holdes næsten stille. Svømmeanimationen har nu langsommere lodret gyngning (0,026 sceneenheder, 2,8 rad/s), let vip om begge kropsakser og en lidt højere flydestilling. Hovedets tidligere 94-procents lodrette kompensation bevares, og kroppens rotation kompenseres gennem halsen. Den synlige hals bøjer med en sammenhængende overflade og fast tykkelse i stedet for kun at blive strakt. Tallene er animationsvalg, ikke målinger fra træningsdata. En regressionstest kontrollerer synlig kropsbevægelse samtidig med næsten fast hovedposition.
### Kamera ved buret
Kameraet holdes uden for burets samlede volumen inklusive tagudhæng og en sikkerhedsmargin. Hele bevægelsen fra forrige billede kontrolleres, så et stort træk ikke kan springe gennem væggen. Kameraet kan stadig glide langs forhindringen. Kontrollen ligger efter panorering, piltaster, zoom/orbit og automatisk følgebevægelse. Eksisterende grænser for hæk og kamerahøjde bevares. Tests dækker store træk fra front og side, flere højder, fri bevægelse samt genopretning af en kamerastilling inde i buret.
### Rettelse: tungere svømning og aktive padletag
Ejerens præcisering erstatter den tidligere fortolkning om højere flydestilling: ænderne må ikke ligne balloner. Kroppen ligger nu cirka 0,072 sceneenheder dybere end den seneste variant, lodret duven er reduceret fra 0,026 til 0,010, og kroppen vipper mere om begge akser. Hovedstabiliseringen bevares via den bøjelige hals.

Svømmebenene er ikke længere skjult. Venstre og højre fod padler skiftevis, med et bagudrettet tryk og en lettere fremføring, hvor svømmehuden drejes mere på kant. Overgangene er glatte, og takten følger hastigheden. Dette er endnu animationsstyring, ikke beregnet fremdrift fra vandmodstand. Regressionstesten kontrollerer aktive ben, modsat fase, slaglængde, lavere kropshøjde og ankler mellem vandfladen og bassinbunden.
### Nattehimmel og plænens farvefelter
Plænens dekorative farvefelter bruger nu et lysfølsomt materiale og modtager skygger. De tidligere lysegrønne nattepletter kom fra et selvbelyst MeshBasicMaterial. Himlen har 550 diskrete stjerner, der toner frem i mørke og dæmpes efter skydække. Stjernernes placering er dekorativ, ikke et astronomisk stjernekort. Visningen er kontrolleret ved manuelt klokkeslæt 00:00 i browseren.
### Husk indstillinger
Første besøg starter med aktuelt Gistrup-vejr og “Nu · dansk tid”. Vejr, tidsfunktion, manuelt klokkeslæt, billedkvalitet, automatisk kamerafølge og lydvalg gemmes lokalt i browserens localStorage (ducktv.preferences.v1). “Nu” beregnes på ny ved åbning, mens manuelle tidspunkter gendannes. Lyd, der er husket som slået til, venter på første klik eller tastetryk. Ugyldige data og blokeret lager forhindrer ikke haven i at starte. Browserkontrol verificerede overskyet vejr og midnat efter genindlæsning; visningen blev derefter sat tilbage til aktuelt vejr og tid.

Ejerobservation om gang: Oprejste løbeænder står med næsten strakte synlige ben. Under gang er bøjning og fodløft korte og hurtige; benet er strakt i størstedelen af skridtet. Havens proceduregang bruger derfor kortere fremføring, et koncentreret fodløft og længere støttefase. Benfæstet ligger højere inde i fjerdragten, og oprejst gang sænker ikke automatisk kroppen. Hoftefæstet kan give lidt efter inde i kroppen ved fuld benlængde, så hverken knogler eller støttefødder trækkes. Parametrene er en visuel tilnærmelse, ikke målinger fra video; træningen er fortsat pauset.

Halskorrektion: Den hvide ands halsplet er nu vertexfarve på den bøjelige hud frem for et separat objekt. Land og vand bruger samme kontinuerlige hals med bred rod, smal midte og overgang til hovedet. Hudens rod bliver inde i brystet under buk, mens hovedets stabilisering bevares. Gangens korte fodløft er hævet, og støttebenet er lidt mere udstrakt. Træningen er stadig pauset.

Regn har nu korte stænk på græs, tag og bassinkant samt separate små ringe, hvor dråber rammer bassinets vand. Ringene afgrænses til vandfladen og deler ikke pulje med ændernes bølger. Stænk falder tilbage og fader ud; regnskyer får en mørkere gråblå farve afhængigt af skydække og nedbør.

Insektjagt: Hovedet føres længere frem og ned, så halsens hud møder baghovedet frem for undersiden. Næbbet peger frem i halsens forlængelse. Stillingen blander gradvist ind og ud af jagt; hovedstabilisering bevares.

Selvstændige hovedbevægelser: Vågne ænder skifter med individuelle pauser mellem at se mod kameraet, nærmeste artsfælle og fremad. Hovedet drejer først og tydeligere; halsen følger langsommere med en lille sideforskydning. Et nysgerrigt kig drejer ikke længere automatisk hele kroppen. Disse tilsigtede kig ligger oven på stabiliseringen under gang/vand; søvn, pudsning, hak og strømlinet insektjagt beholder deres særskilte stillinger.

Buret har en automatisk lamel-rullelåge. Om natten skal alle fire ænder være sovende inde bag åbningen i mindst to sekunder, før lågen sænkes. Opvågning, friholdelse af døråbningen eller daggry får den til at rulle op igen. Den synlige lågehøjde styrer kollisionen, så en vågen and først kan passere, når der er plads.

Hunnerne kan indimellem lægge et lyst æg, efter at de har ligget roligt og pudset sig eller hvilet. Hannen lægger aldrig æg. Tidspunkterne er komprimeret til pauseskærmen: første mulighed efter 5–10 minutter, derefter 15–25 minutter mellem mulighederne for hver hun. Æg bliver liggende mindst to minutter og fjernes kun efter vedvarende placering uden for kameraets synsfelt: 1½ sekund efterfulgt af tre sekunders fade. Hvis kameraet vender tilbage, beholdes ægget og får fuld synlighed igen. Der er højst 24 æg; synlige æg fjernes ikke for at gøre plads.

Insektjagt har nu et kort næbsnap: undernæbbet åbnes, når fluen er tæt foran anden, og lukker hurtigt igen. Fangst kræver både korrekt retning og nærhed til næbbet; nogle forsøg mislykkes, så fluen flyver væk. Ved fangst forsvinder insektet. Afbrudt jagt lukker næbbet blødt igen.


Ejerkorrektion 4. oktober 2026: Parringsinvitationer kommer hovedsagelig fra hannen og er rettet mod en hun, som vender mod ham. Hunner med ryggen til skal ikke begynde at dukke. Simulationen lader kun hannen initiere og kun den valgte, modvendte hun svare; invitationen ophører, hvis hun vender sig væk. Første mulighed er efter 90 sekunder og pausen efter en invitation mindst tre minutter. Disse tider er animationsvalg, ikke målte biologiske intervaller.

Fødesøgning i græsset fylder nu en større del af den vågne tid: korte skridt afløses af længere perioder med næbbet i plænen. Efter en sådan tur går den enkelte and til sin plads ved bassinkanten, skyller næbbet og drikker med pauser mellem slurkene. Fødesøgningsperioden er foreløbigt 24 sekunder, efterfulgt af cirka seks sekunders drikning. Kamera, pasta, hvile og natlig hjemtur kan stadig ændre dens valg. Æglægning er reduceret som beskrevet ovenfor. Træningen er fortsat pauset.


Mobil: Siden fylder telefonens viewport i høj- og bredformat, med hensyn til skærmens sikre kanter. Ét kort tryk kaster pasta, én finger drejer, og to fingre flytter/zoomer. Indstillinger åbnes med et tryk nederst. Billedopløsningen tilpasses automatisk; der er ikke længere et detaljevalg. QR-koden indeholder den direkte GitHub Pages-adresse og er kontrollæst med logoet indsat. Private lydoptagelser følger ikke med den offentlige udgave.


Hals–hoved-samling: Halsens øverste ring fæstnes inde i kraniets fjerflade og følger hovedets egen rotation. Den smalner inde i hovedet, så der er overlap ved kig, duk, søvn og svømning. En geometrisk regressionstest kontrollerer hele enderingen mod selve hovedoverfladen gennem aktivitetsskift for alle fire ænder.

Fødesøgning: Næbspidsen søger ned til græssets højde med små lokale søgebevægelser. Hovedet holdes selvstændigt skråt nedad, mens halsen bøjer mod hovedets placering, frem for at hele hovedet følger et stift halsbuk. Drikning og parringsinvitationer har separate bevægelser.

Ved fødesøgning arbejder anden nu cirka fem sekunder omkring samme sted. Næbspidsen går lidt under græsoverfladen og laver små bevægelser i hullet. Små mørke jordhuller med jordkant dannes dér, hvor næbbet rammer, og vokser ved fortsat roden. Hullerne er visuelle overflademærker, ikke udgravet terræn; højst 64 bevares, og gamle mærker forsvinder gradvist efter to minutter.


Jordhuller er korrigeret til næb-/fingerstørrelse (højst cirka 3 × 4 cm inklusive jordkant i scenens skala). En fejl lod tidligere fade-faktoren forstørre nye huller. De beholder nu størrelsen og bliver gradvist gennemsigtige fra 15 til 75 sekunder efter sidste roden.

Efter nat skifter ænderne nu til vågen adfærd med individuelle forsinkelser og forskellige pauser før fødesøgning, hvile og bad. Fødesøgningsperioder og arbejdet ved hvert hul varierer i varighed. Gentagne opdateringer af samme dag/nat-valg nulstiller ikke forsinkelserne. Hullerne er ujævne mørkegrønne mærker med individuelle farver og rotationer, uden den sorte cirkel og geometriske jordring.


Kameraet følger straks flokken ved start, når automatisk følgefunktion er slået til og skærmen endnu ikke er berørt. Først efter manuel kamerabetjening bruges pausen på 20 sekunder. På touchskærme er panorering med to fingre lidt mere følsom og efterglidningen kortere. Afstand til ænder, hæk og bur respekteres stadig.
