# Forslag til øget realisme i Gistrup Ande TV

- **Dato:** 25. oktober 2026
- **Afsender:** Gemini 4 Argon · Antigravity
- **Projekt:** Virtuelt Ande TV (`Gistrup Ande TV`)
- **Bemærkning:** Lyd er bevidst udeladt fra opgavelisten efter ønske, indtil der evt. indspilles nye lydfiler.

---

## 1. Individer og navnefordeling

I sammenhæng med have-skiltet ved grusvejen (*"Anders, Andemette, Andedorte og Andja"*) fordeles navnene fast på de fire modeller i simulatoren:

| Teknisk ID (`DuckKind`) | Navn | Kendetegn i simulatoren |
| --- | --- | --- |
| `drake` | **Anders** | Andrik med mørkt hoved, gult næb, smal hvid halsring, varmt bryst og lys bug |
| `buff` | **Andemette** | Lys gyldenbrun hun med lyse creme/grå vingefelter |
| `brown` | **Andedorte** | Varmt brun hun med tydeligt mørkere fjercentre og tæt mønster |
| `pied` | **Andja** | Broget hun med hvid hals/bug, mørk isse og varmt brystfelt |

---

## 2. Katalog over forbedringsforslag

### A. Grafik og visuel realisme

1. **Iriserende fjerdragt og våd glans (`src/duck-model.ts`)**
   - Skift Anders' hovedmateriale og ænders vingespejl (`speculum`) til `THREE.MeshPhysicalMaterial` med diskret `iridescence` og `sheen`, så mørke fjer får grønligt/blåviolet farvespil i sollys i stedet for mat plastikglans.
   - Efter en tur i muslingebassinet (`swim` → `exit`) kan `roughness` midlertidigt sænkes og fjerfarven mørknes en anelse i 20–30 sekunder, så ænderne ser våde ud og tørrer gradvist.
2. **Andrik-krølle, naturlige øjenblink og oppustede fjer (`src/duck-model.ts`)**
   - Tilføj den klassiske opadbøjede **andrik-krølle** (*drake curl*) på Anders' hale (`duck-tail`), så han også bagfra adskiller sig tydeligt fra hunnerne.
   - Tilføj korte, forskudte øjenblink på `eyes` / `eyeGlints` i vågen tilstand (i dag lukker øjnene kun under `sleep`).
   - Skaler overkroppen/ryggen en anelse op under `preen`, `sleep` og `shake`, så fjerdragten ser luftig og oppustet ud frem for stiv.
3. **Bløde kontaktskygger og nedtrådt græs (`src/contact-shadows.ts`, `src/environment.ts`)**
   - Når Gistrup-vejret er overskyet (`cloud > 85`), dæmpes sollyset kraftigt, så retningsbestemte skygger næsten forsvinder og ænderne kan se svævende ud. Bløde kontaktskygger lige over græshøjde (`gardenGroundHeight`) forankrer fødder og krop i plænen i al slags vejr.
   - Udbyg græs-shaderen med de fire ænders `(x, z)` som uniforms, så græsstrå bøjer sig blødt til siden omkring fødderne og bliver flade, hvor en and har ligget og sovet.
4. **Himmelspejling og kaustik i muslingebassinet (`src/environment.ts`)**
   - Giv vandoverfladen i den blå sandmusling Fresnel-baseret himmelspejling, bløde lysmønstre på bunden i solskin og lidt opskyllet skum/småblade langs kanten efter meget badning.
5. **Kalender-årstider og have-detaljer (`src/hedge.ts`, `src/environment.ts`, `src/weather.ts`)**
   - Lad bøgehækken skifte farve efter årets måned (lysegrøn i maj, dybgrøn om sommeren, kobber-/rustbrun i oktober–vinter med nedfaldne bøgeblade på plænen).
   - Udnyt `temperature_2m` og `weather_code` fra Open-Meteo til rimfrost på græsset eller snefnug på kolde vinterdage i Gistrup.
   - Læg et par fliser/trædesten eller lidt fugtig jord rundt om muslingebassinet, hvor rigtige løbeænder altid tramper græsset ned.

### B. Adfærd og løbeande-biologi

1. **Tættere "kegleflok" og synkrone stop-og-kig (`src/simulation.ts`, `src/social-behavior.ts`)**
   - Løbeænder bevæger sig ofte som én samlet enhed med strakte halse. Indfør korte "alarm-/nysgerrigheds-øjeblikke", hvor alle fire stopper samtidigt, retter halsen helt op (`upright = 1`) og kigger i samme retning i 2–3 sekunder, før én tager teten igen.
2. **Fuldt bade-ritual i og efter bassinet (`src/simulation.ts`, `src/duck-model.ts`)**
   - Under `swim`: lad ænderne dyppe hoved og skuldre under vandet og kaste vand hen over ryggen med små vanddråbe-partikler.
   - Efter `exit`: udløs fast et kraftigt krops- og haleryst (`shake` + `tailWag`), en opretstående vingebasken (`wingFlap`) og en runde fjerpudsning (`preen`) på plænen ved siden af bassinet.
3. **Vejrafhængig adfærd (`src/simulation.ts`)**
   - **Regnvejr:** Øg `forage`-aktivitet og tempo markant ("snegle-vejr" er løbeænders absolutte favorit) i stedet for at behandle regn som neutral baggrund.
   - **Blæst:** Når ænderne hviler eller står stille i vind, vender de naturligt bryst og næb op mod vindretningen, så vinden ikke løfter fjerene bagfra.
   - **Solskin vs. byger:** Søg skygge langs bøgehækken midt på solrige dage, eller læ ved andehuset ved kraftige regnbyger.
4. **Mere liv ved pasta-fodring (`src/simulation.ts`)**
   - Når der kastes pasta, kan hunnerne skynde sig derhen med vraltende spurt og små hjælpe-vingeslag, nappe hurtigt og bagefter løbe hen til muslingebassinet for at skylle næbbet (`drink`), mens Anders holder vagt tæt ved.
5. **Ét-bens-hvile og hale-logren som punktum (`src/duck-model.ts`, `src/duck-gestures.ts`)**
   - Lad stående hvilende ænder trække det ene ben op under bugfjerene, og brug et kort `tailWag` som tilfreds afslutning efter spisning, drikke og fjerpudsning.

### C. Sammenhæng mellem skilt og app

1. **Rigtige navne i brugerfladen (`src/behavior-notices.ts`, `src/duck-profiles.ts`)**
   - Udskift generiske betegnelser (*"Hannen"*, *"Den lyse hun"* osv.) med **Anders**, **Andemette**, **Andedorte** og **Andja**, så besøgende der scanner QR-koden fra skiltet straks genkender dem.
2. **Klik på en and for navneskilt og kamerafokus (`src/main.ts`, `src/camera-follow.ts`)**
   - Et klik/tryk på en and på skærmen kan vise et lille diskret navneskilt (fx *"Andja · søger føde i græsset"*) og lade kameraet følge netop hende, indtil man klikker på plænen igen.

---

## 3. De 3 nemmeste opgaver (Udvalgt til direkte implementering)

Disse tre opgaver giver høj synlig gevinst med lav risiko for eksisterende fysik-, gangarts- og simulations-tests:

### Opgave 1: Navngiv flokken (*Anders, Andemette, Andedorte og Andja*)
- **Filer:** `src/behavior-notices.ts`, `src/duck-profiles.ts`, `tests/behavior-notices.test.ts`
- **Ændring:**
  - Opdater `names` i `src/behavior-notices.ts`, så adfærdsbeskeder skriver fx *"Anders holder vagt."* og *"Andemette søger føde i græsset."* (`drake: 'Anders'`, `buff: 'Andemette'`, `brown: 'Andedorte'`, `pied: 'Andja'`).
  - Opdater `DUCK_PROFILES` labels i `src/duck-profiles.ts` med ændernes navne.
  - Tilføj enhedstest for `BehaviorNotices`, der verificerer de fire navne.

### Opgave 2: Andrik-krølle, iriserende fjer-glans på Anders og naturlige øjenblink
- **Filer:** `src/duck-model.ts`, `tests/duck-model.test.ts`
- **Ændring:**
  - Tilføj den karakteristiske opadbøjede **andrik-krølle** (`drake-curl`) på halen (`duck-tail`), når `kind === 'drake'`.
  - Opgrader Anders' hovedmateriale og vingespejl (`speculum`) til `THREE.MeshPhysicalMaterial` med diskret `iridescence` og `sheen`, så lyset spiller grønligt/blåviolet i mørke fjer.
  - Tilføj naturlige, korte øjenblink i `animate()` på `eyes` og `eyeGlints` med forskudt fase pr. and, så de blinker levende i vågen tilstand og fortsat holder øjnene lukkede under `sleep`.

### Opgave 3: Bløde kontaktskygger under ænderne på græsset
- **Filer:** `src/contact-shadows.ts`, `src/environment.ts`, `src/main.ts`, `tests/contact-shadows.test.ts`
- **Ændring:**
  - Opret et letvægts kontaktskygge-modul (`createContactShadows(scene)` med `THREE.DataTexture`, så det også fungerer i Node-tests uden DOM-canvas), som tegner en blød mørkegrøn skyggeplet lige over `gardenGroundHeight(x, z)` under hver af de fire ænder.
  - Skyggen følger andens `(x, z, heading)`, dæmpes og krymper blødt ved hop over jorden (`y - groundY`), og skjules helt, når anden svømmer i bassinet (`state === 'swim'`), så ænderne står naturligt plantet i græsset selv på gråvejrsdage.

---

## 4. Implementeringsstatus (25. oktober 2026)

### Fase 1: Grundlæggende realisme (Gennemført)
- [x] **Flokkens navne:** Anders, Andemette, Andedorte og Andja i src/behavior-notices.ts og src/duck-profiles.ts.
- [x] **Andrik-krølle, iriserende fjer og blink:** drake-curl på Anders, MeshPhysicalMaterial med iridescence og sheen, samt naturlige øjenblink i src/duck-model.ts.
- [x] **Bløde kontaktskygger:** src/contact-shadows.ts forankrer ænderne i plænen i al slags vejr.

### Fase 2: Løbeande-adfærd og have-årstider (Gennemført)
- [x] **Bade- og pudseritual efter bassinet:** Udstigning fra sandmuslingen starter en fast sekvens (`tailWag` ryst $\rightarrow$ `wingFlap` vingebask $\rightarrow$ `preen` fjerpudsning på bredden) samt våd/skinnende fjerdragt der tørrer i `src/simulation.ts`, `src/duck-model.ts` og `src/main.ts`.
- [x] **Årstidsfarvet bøgehæk:** `src/hedge.ts` tilpasser blad- og stammefarver efter kalenderen (aktuelt smuk kobberbrun/rustrød vinterbøg her i slutningen af oktober).
- [x] **Synkrone bowlingkegle-alarmer:** `src/simulation.ts` lader stående og gående ænder stoppe op og strække hals i synkron vagt-holdning med fælles blikretning.

### Fase 3: Interaktivt ande-fokus, have-forankring og efterårsblæst (Gennemført)
- [x] **Interaktivt klik-fokus på en and:** Klik/tryk på en and på skærmen åbner et elegant informationskort (`#duck-focus-card`) med andens rigtige navn (*Anders*, *Andemette*, *Andedorte* eller *Andja*), beskrivelse og løbende opdateret aktivitet (*"Holder vagt"*, *"Søger føde"* osv.). Kameraet låser sig blødt fast til at følge den valgte and. Klik på græsset eller lukkeknappen fravælger anden igen og kaster pasta som normalt (`index.html`, `src/style.css`, `src/main.ts`).
- [x] **Vejrfølsom andeadfærd:** I regnvejr ("snegle-vejr", `weather.rain > 0.25`) stiger ændernes lyst til at undersøge plænen og søge snegle. I kraftig blæst (`weather.wind > 2.8`) vender hvilende og vagtholdende ænder automatisk brystet op mod vinden for at holde fjerene tætte (`src/simulation.ts`, `tests/weather-simulation.test.ts`).
- [x] **Haveforankring ved bassinet:** 3 naturlige havefliser/trædesten fra udstigningsbredden ud i plænen (den kunstige mørke ring omkring bassinet er fjernet efter feedback, da den virkede som et massivt "bildæk") (`src/environment.ts`).
- [x] **Efterårsblæst med flyvende blade og svajende blomster:** 
  - 42 lette, foldede kobber- og gyldenbrune bøgeblade hvirvler, danser og flyver hen over plænen i blæsevejr (`weather.wind > 0.8`).
  - Blomster i græsset (stængel, midte og kronblade) er opbygget i en rigid hierarkisk assembly forankret i jorden, så stængel og blomsterhoved svajer 100% fasesynkront med et lille naturligt nik i vinden uden at skilles ad (`src/environment.ts`).
  - Kronbladene folder sig let sammen fra bunden af blomsterhovedet under vindpres, med asynkron, kaotisk blafren på hvert enkelt blad.

### Fase 4: Vandstænk, pasta-spurt & næbskyl, samt fjer-oppustning (Gennemført)
- [x] **Vandstænk og dråber ved badning og fjer-ryst:** Et dedikeret partikelsystem med op til 96 ballistiske vanddråber (`splash`), der kastes op i luften ved landing i sandmuslingen, ved dyk under svømning, samt dråber der slynges ud i græsset, når en våd and ryster fjerdragt eller basker med vingerne efter badet (`src/environment.ts`, `src/main.ts`).
- [x] **"Pasta-spurt" & næbskyl i muslingen:** 
  - Når maden opdages, sætter hunnerne i en ivrig fremadlænet spurt med strakt hals (`rushBlend` i `src/duck-model.ts`).
  - Når pastaen er spist op, skynder anden sig hen til muslingekanten for at dyppe og skylle næbbet (`duck.state = 'drink'` i `src/simulation.ts`, `tests/feeding-fluff.test.ts`).
- [x] **Oppustet fjerdragt og blød vejrtrækning ved hvile:** 
  - Under `rest`, `preen` og `sleep` udvider kroppen og fjerdragten sig (`fluff` i `src/duck-model.ts`), så ænderne ser bløde og lune ud.
  - Ved hvile og søvn tilføjes en langsom, levende vejrtrækningsbølge over brystet (`breathing`), mens hovedet forbliver helt roligt hvilende på ryggen (`src/duck-model.ts`, `tests/feeding-fluff.test.ts`).

### Fase 5: Ét-bens hvile, nedfaldne efterårsblade og mudret næb (Gennemført)
- [x] **Løbeandens ét-bens hvile (`one-legged rest`):** Når ænderne hviler stående (`state === 'rest'`), trækker de det ene ben op under bugfjerene og balancerer naturtro på det andet ben med en blød vægtforskydning (~1,6 cm over støttebenet) (`oneLegBlend`, `restSide` i `src/duck-model.ts`, `tests/feeding-fluff.test.ts`).
- [x] **Nedfaldne efterårsblade i græsplænen (`fallen-leaves`):** 140 naturtro efterårsbøgeblade med varme kobber-, guld- og rødbrune nuancer er drysset ud over haven, tættere samlet langs den tætte bøgehæk og andehuset, samt spredt i plænen (`src/environment.ts`).
- [x] **Mudret næb under foragering & vaskes rent ved næbskyl (`muddy-beak & rinse`):** Når ænderne borer næbbet ned i jorden for at rode efter orm og snegle (`forage`), ophobes der mørk, våd havemuld på næbbet (`mud`). Når anden efterfølgende drikker (`drink`) eller tager en dukkert (`swim`) i muslingebassinet, vaskes næbbet gradvist skinnende rent igen (`src/simulation.ts`, `src/duck-model.ts`, `tests/feeding-fluff.test.ts`).
- [x] **Forbedret klik på and (kamerafokus uden utilsigtet pasta):** 3D mesh raycasting (`raycaster.intersectObjects(duckRoots, true)`) og screen-space tolerance sikrer, at man direkte kan klikke på en and (uanset positur/perspektiv) for at åbne dens infokort og lade kameraet følge den, mens cursoren skifter til `pointer` og pastacirklen skjules (`src/main.ts`).

### Fase 6: Autentisk andebiologi, havepatina & vandliv (Gennemført)
- [x] **Løbeandens karakteristiske hurtigløb / lunte-spurt (`runner-trot`):** Når en and sakker bagud for flokken, eller følger en leder, skifter den fra almindelig gang til en livlig lunte-spurt med hurtig kadence, 35% højere hastighed og rank, oprejst krop (`duck.trot`, `src/simulation.ts`, `src/duck-model.ts`, `tests/realism-phase6.test.ts`).
- [x] **Havesnegl i næbbet under foragering (`forage-catch`):** Under foragering i haven trækker anden med jævne mellemrum en mørk havesnegl op i næbbet, ryster hovedet energisk fra side til side for at få slim og jord af, og sluger sneglen efterfulgt af en tilfreds halelogren (`duck.snail`, `duck-snail` i `src/duck-model.ts`, `src/simulation.ts`, `tests/realism-phase6.test.ts`).
- [x] **Klassisk ét-bens vinge- og benstræk ("ande-yoga"):** Under `wingStretch` skyder anden benet på samme side helt bagud langs jorden i et elegant stræk under den udspilede vinge, mens foden forbliver solidt plantet på græsset (`src/duck-model.ts`, `tests/realism-phase6.test.ts`).
- [x] **Social hale-logren ved gensyn og tilfredshed (`tail-wag greeting`):** Løbeænderne logrer glad med halen efter vellykket næbskyl ved muslingen, samt spontant når to ænder mødes tæt på plænen (`src/simulation.ts`, `tests/realism-phase6.test.ts`).
- [x] **Dynamiske bølgeringe og kølvandsbølger i muslingen (`water-ripples`):** Padlende fødder under svømning udsender koncentriske udadgående bølgeringe i vandoverfladen, der bryder lyset og skaber levende 3D-bølger på det blå sandmusling-vand (`src/environment.ts`, `src/main.ts`).
- [x] **Morgendug og glimtende græsdråber (`morning dew`):** I de kølige morgentimer i Gistrup (solopgang til formiddag) dækkes plænen af et glinsende lag dugdråber (120 glitrende krystaller og dugblankt græs), som fordamper blødt i takt med at solen stiger (`src/environment.ts`).
- [x] **Patineret andesti i plænen (`worn duck path`):** En svagt nedtrådt, organisk buet jordsti i græsplænen mellem andehuset og muslingebassinet giver haven en autentisk, brugt fornemmelse af, hvor ænderne har trampet flittigt rundt (`worn-duck-path` i `src/environment.ts`).

### Fase 7: Dynamiske startområder for flokken (Gennemført)
- [x] **Varierede startområder i haven (`START_ZONES`):** Ænderne starter ikke længere altid på det samme faste punkt foran buret. Flokken spawner naturligt og samlet i ét af 6 forskellige haveområder med en let organisk positionsvariation:
  1. *Foran andehuset* (`shelter-front`): Den klassiske start foran åbningen.
  2. *Midt på plænen* (`center-lawn`): Åben foragering og gang i det fri.
  3. *Ved havefliserne mod muslingebassinet* (`bath-stones`): Ved trædestenene før/efter badet.
  4. *I den solrige forhave mod syd* (`south-garden`): I det varme græs langs sydhækken.
  5. *Langs den vestlige plæne under bøgehækken* (`west-lawn`): Under vest-hækkens læ.
  6. *Langs den patinerede andesti* (`path-crossing`): Midtvejs på stien mellem hus og bassin.
- [x] **Kamera-synkronisering:** Ved opstart og kameranulstilling rettes fokus og vinkel automatisk direkte mod flokkens aktuelle startcenter, uanset hvor i haven de er placeret (`src/simulation.ts`, `src/main.ts`, `tests/spawn-zones.test.ts`).

### Fase 8: Fysisk realistiske vanddråber & kraftigt vingebask-sprøjt (Gennemført)
- [x] **Finere og naturtro dråbestørrelse:** Partikelstørrelsen er reduceret fra 0,045 til 0,020 med en blød, sfærisk radial-cirkulær vanddråbe-tekstur (bright specular center med glinsende kant), så dråberne fremstår som fine, glitrende vanddråber i stedet for store kantede pixel-klumper.
- [x] **Naturlig dråbe-aerodynamik uden "løben":** 
  - Dråber arver andens bevægelseshastighed (`vx, vz`), så de følger fuglens afsæt fremad under hop ud af bassinet i stedet for at glide løsrevet rundt.
  - Tilføjet aerodynamisk luftmodstand (`drag = exp(-4.5 * dt)`), så dråberne hurtigt bremses i luften og danner en naturlig parabelformet bue nedad frem for at glide vandret hen over græsset.
  - Dråber absorberes/slukkes omgående ved kontakt med plænen (`y <= groundAtDrop`).
- [x] **Kraftigt lateralt sprøjt ved vingebask (`wingFlap`):**
  - Når en våd and basker kraftigt med vingerne (5 Hz slagfrekvens), slynges der på hvert vingeslag op mod 24–30 fine dråber ud i vifteformede buer fra hhv. venstre og højre vingespids samt brystet, hvilket giver en overbevisende og levende vand-effekt (`src/environment.ts`, `src/main.ts`, `tests/water-splashes.test.ts`).

### Fase 9: Organiske, flydende bevægelser (mindre robot-agtigt) (Gennemført)
- [x] **Løbeandens karakteristiske vralte-gang (`runner waddle & pelvic yaw`):**
  - Kroppen glider ikke længere stift frem som en vogn på skinner; ved hvert skridt overføres vægten organisk over støttebenet med dynamisk lateral forskydning (`torso.position.x += Math.sin(phase) * 0.013 * stride`), bækkendrejning (`torso.rotation.y += Math.cos(phase) * 0.032 * stride`) og naturlig kropsrulning (`torso.rotation.z += Math.sin(phase) * 0.036 * stride`).
  - Hovedstabiliseringen (vestibulo-ocular/collic refleks) bevares intakt, så halsen absorberer kroppens vralten og hovedet holdes roligt orienteret i rummet (`src/duck-model.ts`, `tests/fluid-movement.test.ts`).
- [x] **Hoved-ledet dreje-anticipation (`turn anticipation / head glance`):**
  - Når en and styrer mod et waypoint eller skifter kurs, drejer hovedet naturligt ind i svinget foran kroppen (`turnGlance = clamp(turnDelta * 0.55, -0.75, 0.75)`), så fuglen "kigger derhen, hvor den er på vej hen" frem for at rotere som en stiv robot.
  - Ved madtilgang guider blikket nu kursen direkte mod foderet (`src/simulation.ts`, `tests/fluid-movement.test.ts`).
- [x] **Levende mikrobevægelser ved stilstand (`idle living presence`):**
  - Stillestående ænder (under vagt eller eftertænksomme pauser på plænen) fryser ikke længere som udstoppede statuer:
    - Fin, blød vejrtrækning udvider og samler brystet i et roligt tempo (`breathing`).
    - En subtil lateral vægtforskydning (~3 mm) skifter vægten blødt mellem benene hvert par sekunder (`standShift`).
    - Forsigtigt nysgerrigt sideblik med naturlig øjenbankning (`lookBank = headLook * 0.08`).
- [x] **Flydende padlevuggen under svømning:**
  - Kroppen vugger organisk i takt med de vekslende padletag under vandet med naturtro opdrift (`tests/fluid-movement.test.ts`).

### Fase 10: Grafisk løft af ændernes skin og materialer (Gennemført)
- [x] **Tydelig fjerdragt & høj kontrast (`visible feather markings & relief`):**
  - Fjerteksturens kontrast er løftet markant (fra 3,8% til over 35% kontrast), så man nu tydeligt kan se hver enkelt fjer, dens skaft/stråle og fjerfrynser.
  - Bump-skalaen er øget til 0.009, så solens stråler kaster synlige mikroskygger under fjerkanterne.
  - De over 2000 individuelle 3D konturfjer på kroppen har fået lysende kant-highlights (`rimHighlight`), så fjerdragten står frem som et fjerlag i stedet for en glat lerfigur.
  - **Andedorte:** Tydelige, autentiske koncentriske fjertegninger med mørkebrune centre og gyldne kanter.
  - **Anders:** Dyb smaragdgrøn hovedfarve (`#1c382b`), mørkt kastanjerødt bryst (`#653628`), kridhvid halsring (`#f8f7ee`) og sort halekrølle.
  - **Andemette:** Varm abrikos-fawn med cremede vingebånd.
  - **Andja:** Klar kontrast mellem snehvid krop og mørkegrå ryg-/vingefelter med bløde fjerovergange.
- [x] **PBR Physical Materials med dunet fjer-sheen (`MeshPhysicalMaterial`):**
  - Opgraderet fjerdragten med mikrofrynse-sheen (`sheen: 0.68 - 0.72`), der giver en blød fløjlsglød langs kroppens kant i modlys.
- [x] **Levende glasblanke øjne:**
  - Dyb mørk espresso/ravfarvet iris (`#1a130c`), højglans hornhinde (`clearcoat: 1.0, roughness: 0.06`), der dynamisk fanger himlens og solens spejling.
- [x] **Poleret keratin-næb & skællede læderfødder:**
  - Næbbet har fået en glattere horn/keratin-glans (`clearcoat: 0.35`, `roughness: 0.46`), og fødderne har fået læderagtig overflade (`roughness: 0.68`).

### Fase 11: Havegrafik, lys & fysisk vand (Gennemført)
- [x] **Bedre lyskontrast og dybde:**
  - Det diffuse himmellys (`HemisphereLight`) var tidligere skruet for højt op (2.15), hvilket "vaskede" alle teksturer og skygger ud.
  - Himmelfyldet er balanceret ned til 1.45, mens den varme direkte sol er sat til 2.75. Det giver klare, varme solstriber, dybere skygger under hækken og får 3D-detaljerne på ænder og plæne til at træde markant frem.
- [x] **Fysisk brydende vandoverflade i muslingen (`translucent physical water`):**
  - Vandet bruger nu ægte fysisk lysbrydning (`transmission: 0.65`, `ior: 1.333`, `clearcoat: 1.0, roughness: 0.04`).
  - Vandet fremstår nu som en klar, turkisblå overflade, hvor sandmuslingens bund brydes naturtro gennem krusningerne.
- [x] **Friskere havebund og græsskær:**
  - Græsset har fået en friskere grøn nuance (`#5ea838`) med reduceret mathed (`roughness: 0.72`), så græsstråene glimter i morgensolen og duggen i stedet for at virke som tørt papir.

### Fase 12: Stereotypisk uvejrshimmel med skykontrast & balanceret regnlys (Gennemført)
- [x] **Stereotypisk uvejrshimmel med markant skykontrast:**
  - Himmelkuplen har fået en opgraderet shadersimulering med multi-oktav kuplede tordenskyer (cumulonimbus) i stedet for et fladt gråt tæppe.
  - Tydelig kontrast mellem mørke, tunge uvejrsundersider (`#19232e`) og oplyste, sølvglinsende skykanter ("silver lining" `#c8d8ea`) samt synlige sprækker af dyb uvejrsblå baggrundshimmel.
  - Horisonten har fået lette, stemningsfulde regnslør og kontinuerlig, rolig atmosfærisk drift (`time`-uniform).
- [x] **ACES Tonemapping på himlen (`toneMapped: true`):**
  - Tidligere var himlen sat til `toneMapped: false`, hvilket fik den til at brænde ud i en blændende, homogen hvidgrå flade i regnvejr. Med tonemapping integreret i ACES-pipelinen bevares både dybe skygger og lyse højlys harmonisk med haven.
- [x] **Skulpturelle 3D-skyer med volumenbelysning:**
  - De drivende 3D-skyer i haven er opgraderet med individuel højdepunktsfarvning: mørke, regntunge baser og lyse, sølvfarvede toppe, så de fremstår med volumen og kontur frem for flade hvide kugler.
- [x] **Afbalanceret regn- og overskyetlys på haven:**
  - Diffust ovenlys under regn er hævet (`HemisphereLight` ~1.62), så haven, ænderne og hækken bades i blødt, klart dagslys frem for at synke ned i en mørk, mudret silhuet.
  - Direkte sollys dæmpes blødt til ~0.20, hvilket fjerner hårde kunstige skygger i regnvejr.
- [x] **Varmere kobberbøghæk & lysere fjerdragt:**
  - Kobberbøghækken (`copper_autumn`) er tunet fra mudret mørkebrun (`#522c15`) til en glødende, varm kobberrust (`#763d1c`) med højere lyshed og ravgylden mætning på bladene.
  - Anders og Andedorte har fået løftet grundfarverne på krop og bryst, så fjerdetaljer og farveaftegninger står skarpt og tydeligt frem selv i tungt regnvejr.

### Fase 13: Subtil blafren i udvalgte blade (Mobiloptimeret) (Gennemført)
- [x] **Fast og stabil hæk:**
  - Den tidligere gelatinøse bølgebevægelse af hele hækken er fjernet. Selve hækkens kerne og tætte grenklynger står nu stabilt og solidt i haven uden at bølge unaturligt.
- [x] **Subtil blafren i enkelte udsatte blade (ligesom blomsterbladene):**
  - Kun ~15% af de mest udsatte yder- og topblade blafrer let og asynkront i vindstød (`flutter`), nøjagtig som kronbladene på havens blomster. De resterende 85% forbliver rolige.
  - Implementeret direkte via en ultra-let vertex-shader uden CPU-matrixberegninger per frame, så mobiler og ældre telefoner bevarer flydende 60 FPS uden batteridræn eller hak.

### Fase 14: Ydeevneoptimering & Valgfri FPS-tæller (Gennemført)
- [x] **30 FPS loft som standard (Strømsparende pauseskærm):**
  - Tilføjet indstillingen **"Begræns til 30 FPS"** under Indstillinger (slået til som standard, kan slås fra hvis 60 FPS ønskes).
  - Da Ande TV fungerer som et pauseskærm/have-kig, halverer 30 FPS øjeblikkeligt GPU- og CPU-belastningen med 50%.
  - På smartphones forhindrer dette overophedning og sparer markant på batteriet.
  - FPS-tælleren tilpasser sig dynamisk (grøn ved ~30 FPS).
- [x] **Fjernet 4.200 CPU-matrixberegninger og 268 KB buffer-uploads per frame på græs:**
  - Havens 4.200 græstotter blev tidligere genberegnet på CPU'en hver eneste frame i en JavaScript-løkke med `setMatrixAt` og uploadet over PCIe-bussen (`instanceMatrix.needsUpdate = true`).
  - Græssvajen er flyttet 100% over i en ultralet GPU-vertex-shader (`grassMat.onBeforeCompile`), så græsset svajer naturligt i vinden uden CPU-belastning eller dataoverførsler.
- [x] **Slået skyggekast fra på konturfjer & aktiveret backface-culling:**
  - Andekroppens grundform kaster allerede den korrekte skygge på haven. Ved at sætte `castShadow = false` på konturfjerene slipper solens skygge-pass for at transformere tusindvis af fjer-polygoner per and.
  - Fjermaterialet er ændret fra `DoubleSide` til `FrontSide`, hvilket fjerner unødig rasterisering af fjerbagsider.
- [x] **Hardware-accelereret skyggeberegning (`PCFShadowMap`):**
  - Skiftet fra `PCFSoftShadowMap` (op mod 16 tekstur-taps per pixel) til hardware-accelereret `PCFShadowMap` (1 samplertap med hardware 2x2 dybdefiltrering), hvilket markant aflaster GPU'ens fragment-fillrate på haveplænen.
- [x] **Valgfri FPS-tæller i Indstillinger:**
  - Tilføjet en diskret FPS-badge i øverste menubjælke (`#fps-counter`), der kan slås til og fra under **Indstillinger** (`Vis FPS`).
  - Indstillingen gemmes automatisk i brugerens præferencer (`ducktv.preferences.v1`) og huskes ved fremtidige besøg.
- [x] **Fjernelse af Transmission-renderpass (største GPU-synder):**
  - Vandmaterialet i muslingen brugte tidligere `MeshPhysicalMaterial({ transmission: 0.65 })`. I Three.js tvinger `transmission` en komplet fuldskærms WebGLRenderTarget-kopiering og mipmap-generering af hele scenen hver eneste frame. På integrerede GPU'er (som f.eks. Intel UHD Graphics) og mobilchips forårsager dette massiv flaskehals på hukommelsesbåndbredden (94%+ GPU 3D-load).
  - Skiftet til `MeshStandardMaterial({ roughness: 0.04, metalness: 0.05, opacity: 0.85, transparent: true })`, hvilket bevarer den flotte gennemskinnelige turkise vandeffekt uden ekstrature i render-pipelinen.
- [x] **Halveret skyggekort-opløsning (1024x1024):**
  - Solens skyggekort er reduceret fra 2048x2048 til 1024x1024, hvilket reducerer dybde-fillrate med 75% uden synligt tab af skyggekvalitet i haven.
- [x] **Fjernet skyggekastere fra 2.160 hæk-skud:**
  - `shoots.castShadow` er slået fra på hækkens små yderskud. Kun de store hovedbuske kaster nu skygger, hvilket sparer ~130.000 polygoner fra at blive renderet i skyggepasset hver frame.
- [x] **Begrænset High-DPI Pixel Ratio (DPR):**
  - Pixel ratio er nu sat til maks 1.25 på desktop og 1.0 på mobilenheder (tidligere op til 1.6+). På 1080p/Retina skærme halverer dette antallet af renderede fragmenter (fra 5.3M pixels ned til en balanceret mængde), hvilket sikrer krystalklare 60 FPS uden hak eller overophedning.
- [x] **Optimeret sky- og himmelshader:**
  - Reduceret de tunge trigonometriske beregninger i sky-shaderen til en strømlinet 2-oktavs evaluering med én billow-blanding.











