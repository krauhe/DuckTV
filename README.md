# DuckTV · Ande-TV

En browserprototype med fire løbeænder, græs, et blåt muslingebassin og justerbart vejr. Klik på græsset for at kaste pastaskruer. Hunnerne tøver og nærmer sig; hannen holder vagt og spiser aldrig. Hold venstre museknap og træk for at dreje kameraet; hold højre og træk for at flytte udsigten. Musehjulet zoomer. Et kort venstreklik (højst 350 ms) kaster pasta på det valgte sted på græsset. Et kameratræk udløser aldrig et kast.

Haven har et aktivt areal på 10,5 × 8 sceneenheder og hæk på alle fire sider. Kameraet holdes inden for haven og højst 1,65 enheder over græsset, under hækkens top. Den hvide ands sorte hovedpletter er farvet på issen uden udstående geometri.

## Kør lokalt

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

Hver besøgende kører sin egen simulation. Der er ingen fælles server eller login. Lyden er endnu ikke implementeret.

### Masse, træghed og elasticitet

Gang og svømning styres nu gennem ønsket hastighed og en begrænset drivkraft: kraften ændrer hastigheden efter F = m·a. Hver and har en foreløbig modelmasse, og drejninger har vinkelhastighed, inertimoment og begrænset drejningsmoment. Start, retningsskift og stop sker derfor gradvist; anden bremser også ved pauser og kurmageri. Værdierne er indstillinger i sceneenheder, ikke målte vægte eller biologiske egenskaber.

Dæmpede masse-fjedre giver kroppen hældning ved acceleration og sving samt elastisk overgang mellem slank og lav kropsform. Halsen får en lille inertireaktion, samtidig med at hovedstabiliseringen kompenserer for skridtenes vuggen. Stivhed og dæmpning holder bevægelserne små og får dem til at falde til ro.

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

Ejeren beskriver hurtige løb efter fluer med halsen sænket samt roden i jorden. Alle fire ænder kan nu tage korte jagtture med halsen frem og ned og hurtigere skridt, eller søge i jorden med små skridt og pauser med næbbet nede. Synlige fluer med flimrende vinger bevæger sig foran jagende ænder. Fluerne er foreløbige visuelle mål, ikke selvstændige dyr med fangstsimulation. Jagten bruger samme begrænsede drivkraft som almindelig gang, en fast kort rute væk fra bassinet og efterfølgende opbremsning. Pasta afbryder aktiviteterne; hannen holder da vagt og spiser ikke pasta. Hastigheder, hyppigheder og varigheder er animationsvalg. Snegle som fødekilde er ejerens formodning og er endnu ikke modelleret.

## Nye videoer til kalibrering

### Muskelbaseret bevægelseslæring — forskningsreference

Ejerens [YouTube-reference](https://www.youtube.com/watch?v=pgaEE27nsQw) er til *Flexible Muscle-Based Locomotion for Bipedal Creatures* (Geijtenbeek, van de Panne og van der Stappen, SIGGRAPH Asia 2013). [Forfatternes projektside](https://www.cs.ubc.ca/~van/papers/2013-TOG-MuscleBasedBipeds/index.html) og [artikel](https://www.cs.ubc.ca/~van/papers/2013-TOG-MuscleBasedBipeds/2013-TOG-MuscleBasedBipeds.pdf).

Metoden optimerer styring, muskelforløb og muskelegenskaber inden for en angivet model. Den kan finde gangmønstre uden optagede referencebevægelser og kræver en tilnærmet skabelon for muskelvedhæftninger frem for en fuldt kendt anatomi. Det er et relevant spor til et separat forsøg med én fysisk løbeand. Resultaterne er ikke validering af andeanatomi eller garanti for en korrekt andegang. Den nuværende DuckTV-kode anvender endnu ikke denne metode. Referencen er kontrolleret via forskernes artikel; videoen er ikke gennemgået billede for billede eller hentet lokalt.

### Elasticitet og indlært styring — supplerende forskningsreferencer

Ejerens to yderligere videolinks er undersøgt gennem de tilhørende forskningskilder den 4. oktober 2026. Videoerne er ikke gennemgået billede for billede eller hentet lokalt.

- [VIPER-video](https://www.youtube.com/watch?v=higGxGmwDbs): *VIPER: Volume Invariant Position-based Elastic Rods* (Angles m.fl., 2019). [Artikel](https://arxiv.org/abs/1906.05260), [forskningskode](https://github.com/vcg-uvic/viper). Elastiske stave og bundter kan bøje, strække og deformere overfladen med bevaret volumen; eksempelvis bliver en strakt struktur tyndere. Relevant inspiration til hals og blødt væv omkring et skelet. Metoden leverer deformation, ikke i sig selv indlæring af gang. Den publicerede implementation bruger CUDA og er ikke en direkte browserkomponent. Repositoryets to demoaktiver har særskilte begrænsninger og skal ikke kopieres ind i DuckTV.
- [Boksevideo fra Two Minute Papers](https://www.youtube.com/watch?v=SsJ_AusntiU): *Control Strategies for Physically Simulated Characters Performing Two-player Competitive Sports* (Won, Gopinath og Hodgins, 2021). [Publikation](https://doi.org/10.1145/3450626.3459761), [læst artikelkopi](https://hbryu.github.io/Control%20Strategies%20for%20Physically%20Simulated%20Characters%20Performing%20Two-player%20Competitive%20Sports.pdf). Figuren lærer først grundfærdigheder fra motion capture og derefter samspil gennem reinforcement learning. Styringen angiver ønskede ledvinkler, som omsættes til drejningsmomenter; den kræver ikke en komplet muskelmodel. Relevant inspiration til at adskille andens bevægelsesfærdigheder fra dens sociale beslutninger. Almindelig andevideo skal først omsættes til brugbare bevægelsesreferencer og svarer ikke direkte til artiklens motion capture-data.

Anbefalet forsøg for DuckTV: én and med et forenklet skelet, realistiske ledgrænser, massefordeling og fodkontakt. Træn balance, start/stop og gang med roligt hoved, og sammenlign med ejerens videoer. Tilføj derefter elastisk hals/krop og senere hop og vandkontakt. Træningen bør foregå separat; browserens første integrationsforsøg skal måle, om den færdige styring og fysikken kan køre stabilt med fire ænder. Muskelvedhæftninger kan undersøges senere, hvis enklere ledstyring ikke giver tilstrækkeligt naturtro bevægelser. Dette er en foreslået udviklingsretning, ikke implementeret AI-træning eller valideret andeanatomi.

### Bevægelsesreferencer: løb og fødesøgning

Ejerens to Google-videolinks peger på nedenstående YouTube-videoer. Udvalgte tidspunkter og korte sekvenser med fremrykning billede for billede blev gennemgået den 4. oktober 2026. Der er ikke foretaget en fuld videoanalyse eller måling af skridtfrekvens. Originalerne er ikke hentet ind i projektet.

| Reference | Gennemgået udsnit | Observation | Anvendelse i næste animationsiteration |
| --- | --- | --- | --- |
| [Loopeenden die rennen ! — Fred Graspol](https://www.youtube.com/watch?v=YNikukqaQnI), 1:02 | Omkring 0:13, inklusive successive billeder; desuden 0:18, 0:23 og 0:28 | En lys and bevæger sig mod højre med skiftevis fremført og støttende fod. Nogle ænder hælder fremad, mens andre er mere oprejste. Flokken har forskellig placering og skridtfase. | Tydelig forskel mellem rolig gang og hurtig fremdrift. Knyt skridtlængde og frekvens til hastigheden; giv foden en støttefase og en løftet fremføringsfase. Undgå synkron gang i flokken. |
| [Indiske løbeænder – sneglespiser — Jon Bertelsen](https://www.youtube.com/watch?v=LW8hAfoDwXo), 1:59 | 0:13, 0:18 og 0:23–0:24, sidstnævnte med successive billeder | Ænderne sænker og strækker halsen mod underlaget. Omkring 0:23–0:24 løfter den forreste brune and hovedet fra jorden og flytter en fod, mens den hvide fortsat søger lavt. En anden and står oprejst i baggrunden. | Små skridt og pauser under fødesøgning, med selvstændige hals- og næbbevægelser. Lad stillingen afhænge af aktivitet frem for kun et periodisk skift. |

Prioritet for bevægelsesarbejdet: (1) fodkontakt og hastighedstilpassede skridt, (2) langsom fødesøgning med halsen frem/ned, (3) tydelige overgange mellem pause, gang og hurtig bevægelse. Den allerede implementerede hovedstabilisering under gang bevares, mens bevidste søgebevægelser stadig kan flytte hovedet. Videoerne er kvalitative referencer; de bruges ikke som belæg for et helt ubevægeligt hoved, præcise hastigheder eller bestemt køn/vagtrolle. Ovenstående punkter om skridt og fødesøgning er dokumenterede forslag, endnu ikke implementerede ændringer.

### Videoreference: løbeænder i havecenter

[Indiske løbeænder elsker dræbersnegle — Lyngby Havecenter](https://www.youtube.com/watch?v=1IbxRBVFPuQ), 1:12. Tilføjet af ejeren og visuelt gennemgået i udvalgte billeder den 4. oktober 2026. Link og observationer gemmes her; videoen er ikke kopieret til projektet.

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

Repository: [**DuckTV**](https://github.com/krauhe/DuckTV), privat indtil videre. Der er ingen automatisk udgivelse ved push.

Læg alle nye billeder, videoer og øvrige rå input i `input/` (opret mappen lokalt efter behov). Hele mappen ignoreres, uanset filtype. `andereferencer/`, `inputs/`, `reference/` og `references/` er også ignoreret; almindelige foto-, video- og lydformater ignoreres desuden overalt i projektet. Referencer skal blive uden for `public/`, så de heller ikke kommer med i webbygningen. Kun bevidst udvalgte, færdige webaktiver bør senere tilføjes til Git.

## GitHub Pages (senere)

Projektet bygger til `dist/` med relative stier og kan udgives på GitHub Pages. Workflowet i `.github/workflows/pages.yml` bygger, tester og udgiver ved en manuel kørsel. Når projektet skal udgives: kontrollér, at kun projektkode og færdige aktiver indgår, vælg GitHub Actions som Pages-kilde, og kør workflowet. Hjemmesiden er ikke udgivet. Et privat repository betyder ikke nødvendigvis en privat Pages-side; Pages aktiveres først ved en særskilt beslutning om udgivelse.

Hold referencevideoer/fotos ude af det offentlige repository. Vælg en licens til kode og færdige modeller før offentlig deling. Kontroller størrelse, mobilvisning og vejrkald før frigivelse.

Vejr: [Open-Meteo](https://open-meteo.com/), CC BY 4.0. Den gratis API er til ikke-kommerciel brug inden for udbyderens grænser. Ved væsentligt flere besøgende bør vejrdata deles via en fælles cache. [Vilkår](https://open-meteo.com/en/terms).

## Validering

Simulationens tests kontrollerer blandt andet madgrænser, hannen som vagt, hunnernes spisning, tidssteg og bassinbesøg. Browserkontrol foretages mod den lokale Vite-server med den installerede Chrome/Playwright; lokale testartefakter ligger i `test-results/` og ignoreres af Git.
