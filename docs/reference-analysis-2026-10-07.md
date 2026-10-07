# Referenceanalyse og implementering · 7. oktober 2026

## Grundlag og metode

Ejerens fire ænder: tre hunner og én han. Syv nye videoer (ca. 269 sekunder i alt) er undersøgt med tidsmærkede billedserier. Oversigt: 12 billeder pr. video. Tættere serier: 10.50.29 ved 0–14 s i 0,5 s trin; 11.32.11 ved 0–86 s i 2 s trin; 15.24.46 ved 0–27 s i 1 s trin og 14,5–17,25, 22–24,75 samt 28–35 s i 0,25 s trin; 07.59.58 ved 23–42 s i 1 s trin; 08.22.11 ved 4,8–7 s i 0,2 s trin. Alle 38 konverterede fotos _KRH3453–3490 er visuelt gennemgået som kontaktark; 3466 og 3489 også enkeltvis, sammen med 2026-04-02 16.39.28-1.jpg.

Dette er kvalitativ billedanalyse, ikke automatisk motion capture eller fuld frame-for-frame gennemgang. Små hurtige bevægelser kan være overset. Kamera, skjulte fødder og perspektiv begrænser målinger; farver er ikke farvekalibreret. RAW-filer er bevaret, men ikke nyfremkaldt. Originaler og udtræk forbliver i Git-ignorerede mapper. `scripts/reference-contact-sheet.py` gør billedserierne reproducerbare lokalt med Pillow og FFmpeg. En videostrøms sidste billede kan slutte før containerens varighed; manglende frames markeres.

## Individer

| ID | Synlige kendetegn | Reference |

| --- | --- | --- |

| drake | Mørkt skiferfarvet hoved, gult næb, smal hvid halsring, varmt brunligt bryst, meget lysere grå/creme bug og sider | _KRH3459, 3466–3467, 3489 |

| buff | Lys gyldenbrun hun, mere ensartet kropsfarve, store lyse creme/grå felter på foldet vinge og mørkere vingespejl | _KRH3464, forreste hun i 3466–3467 |

| brown | Også varmt brun/gylden grundfarve; tydeligt mørkere fjercentre og tæt mønster på bryst og flanker. Ikke ensfarvet mørkebrun | _KRH3465, bageste hun i 3466–3467 |

| pied | Hvid hals og bug, uregelmæssigt gråsort broget ryg/vinge, varmt brunligt brystfelt, mørk isse med hvidt omkring; lyse udfoldede svingfjer | _KRH3466–3467, 3479–3483 |

ID'erne er arbejdsnavne; ingen navne eller fast rangorden er udledt. Hunnerne kan være svære at skelne i fjernoptagelser. Numeriske temperamenter, kropsbredder, afstande og reaktionstider er justerbare designværdier, ikke målte personlighedstræk.

## Adfærdsregister

| Kilde / tid i sekunder | Observation | Betydning / sikkerhed |

| --- | --- | --- |

| 2026-10-05 10.50.29, 0–5,5 | Tæt gruppe; hoveddrejninger mod hinanden, forskellig orientering; gruppen reorganiserer sig | Sikkert synligt. Kan ikke alene kaldes parringsinvitation |

| Samme, 8,4–23,1 | Samlet gang og retningsskift; den brogede ses forrest ved 14,7–23,1 | Ingen permanent leder. Følg individ med forsinkelse, ikke kun flokkens midtpunkt |

| 2026-10-05 11.32.11, 12–44 | Flere ænder søger med næb nedad i samme område, mens hannen ofte har hovedet oppe | Fælles aktivitet, men forskellige faser. Pasta kan ikke identificeres sikkert i disse små billeder |

| Samme, 46–86 | Gruppen spredes gradvist over et lille område; enkelte hovedløft mellem næb-ned-sekvenser | Fødesøgning i længere perioder med små skridt og orienteringspauser |

| 2026-10-05 15.24.46, 0–18 | Individuelle drejninger mod krop/vinge og skift mellem lave og oprejste stillinger | Fjerpudsning og omorientering; ingen sikker søvnklassifikation |

| Samme, 29,75–31,5 | Brun hun bagest rejser kroppen og udfolder/basker gentagne gange | Sikkert bask; identitet buff/brown usikker på denne afstand |

| Samme, 32,5–34,5 | Broget hun basker stående og folder derefter ind | God reference til start, rytme og afslutning. Forskudt efter anden hun; årsag ikke bevist |

| 2026-10-06 07.59.58, 0–24 og 65–71,8 | Langvarig fælles fødesøgning med lav hals, herunder hannen | Hannen må gerne forage, selvom tidligere ejerobservation siger, at han vogter ved pasta |

| Samme, 25–42 | Skiftende hovedløft, omorientering og gruppens bevægelse mod hækken | Orienteringspause skal være del af foragering, ikke en helt ny aktivitet hver gang |

| 2026-10-07 08.21.58, 0–17 | Oprejst tæt flok ved låge; små skridt, vendinger og venten | Ny kontekst: venten ved passage. Ikke dokumentation for angst alene |

| 2026-10-07 08.22.11, 3,4–5,6 | Låge åbnes, ænder passerer forskudt og accelererer i samme retning | Passagefølge, lavere kropsholdning i fremdrift |

| Samme, 5,8–7 | Hannen og derefter den brogede udfolder/basker i forbindelse med passage | Vinger bruges også under bevægelse; ikke alle fire basker, og ikke ved enhver gang |

| 2026-10-07 08.34.07, 0–16,4 | Fælles fødesøgning; kort oprejst kig og flytning før søgningen fortsætter | Variation inden for samme aktivitet |

| _KRH3476–3478 | Flere ænder ligger tæt samtidigt, nogle med hoved mod kroppen | Fælles lav hvile; fotos beviser ikke egentlig søvn |

| _KRH3489 | Han med næb mod bryst/siden af halsen | Fjerpudsning har flere mål end ryg/vingen |

## Hvad materialet endnu ikke dokumenterer sikkert

Ved første gennemgang manglede præcis pasta-optagelse og synkerytme, gentagen parringsinvitation med sikkert individ-ID, isoleret ensidigt vingestræk og rumpevrik. Den efterfølgende pastavideo er analyseret i tillægget nedenfor og giver nu sikre referencer til pasta-håndtering. Ejerens observationer bevares som grundlag, men der opfindes ikke tidskoder eller målinger. Billedserierne viser ingen sikker ny adfærd såsom aggression, parring, sneglefangst eller søvn. Disse skal ikke tilføjes som observerede fund.

## Implementeringsretning

Ejerpræcisering 7. oktober: Benene og knæene er for det meste næsten strakte. Det er et centralt krav til både stående stilling og gang. Foto _KRH3466 og gangsekvensen 2026-10-05 10.50.29 ved 13–14 s bruges som visuelle referencer til benenes overordnede stilling; skjulte led giver ikke grundlag for præcise anatomiske vinkelmålinger. Støttebenet skal fremstå næsten strakt gennem størstedelen af skridtet, med kort bøjning under fremføring og fodløft. Undgå vedvarende sammenkrøbet gang, store knæløft og overdreven op/ned-bevægelse af kroppen. Fodkontakt og faste benlængder skal bevares. Kontrollér dette fra siden i den færdige model, også ved langsom gang, stop og vendinger. Den eksisterende knætest dækker støttebenets udstrækning, men erstatter ikke visuel kontrol af hele benstillingen.

1. Farver og kendetegn fra fotos; bevægelige vingeled og hale.

2. Individprofiler med tydeligt foreløbige parametre, stabilt valg af nabo og forsinket følgen. Ingen fast leder eller øjeblikkelig kædereaktion gennem flokken.

3. Vedvarende fælles fødesøgning med individuelle små skridt, næbbevægelser og orienteringspauser.

4. Korte bask/stræk/hale-klip med lokal tid, bløde overgange og afbrydelse ved mad, fare, nat og andre aktiviteter. Baskvarighed omkring 2,4 s er første tilpasning; ikke målt vingefrekvens.

5. Kontrol i modelvisning og haven, automatiske regressionsprøver samt længere simulationsforløb.

Resterende præcisionsarbejde efter denne iteration: validerede individuelle ledkurver fra video, koblet ensidigt ben/vingestræk og kontrolleret dokumentation af invitation/rumpevrik. Fysiklaboratoriets eksperimentelle klip er fortsat ikke automatisk godkendt til produktion.

## Verifikation af første implementering

- 99 automatiske tests består, inklusive forsinket følgen, afbrydelse ved mad, fodkontakt under vingeanimation og natlig hjemgang. TypeScript og produktionsbygning består. Vite advarer fortsat om en fælles JavaScript-pakke over 500 kB.
- Browserkontrol af både `reference.html` og haven: ingen JavaScript-fejl; pause giver uændret canvas, gennemse-skyderen virker, og pasta udløser individuelle approach/eat-forløb, mens hannen holder vagt.
- Fem minutters reproducerbar simulation med seed 738 viste flere følgerrelationer, halevrik hos alle fire og bask hos den brogede. Dette dokumenterer integration, ikke biologisk korrekt hyppighed. Den afsluttende pladsbegrænsning for vinger er yderligere dækket af den efterfølgende samlede testkørsel.
- En rute-fejl ved kombineret bassin-/bur-omvej blev fundet under regression og rettet: burhjørnet er nu et stabilt delmål, så natlig hjemgang ikke kan skifte bassin-omvej på grund af et flyttende lodret delmål.
- Visuel gennemgang af stående modeller, udfoldede vinger og fodring. Modellerne er tydeligt stiliserede; detaljer, anatomiske bevægelseskurver og fuld fotorealisme er ikke færdigvalideret.

## Tillæg: pastavideo 2026-10-07 11.15.57

Tilføjet af ejeren efter første implementering. Fil: `andereferencer/2026-10-07 11.15.57.mp4`, varighed 125,14 s. Det samlede materiale omfatter nu otte nye videoer. Gennemgået som 12 oversigtsbilleder, 0–60 s og 66–123 s i 3 s trin, samt 88–93,5 s og 100–105,5 s i 0,5 s trin. Billeder ved 90,5 og 91,5 s er også undersøgt ved 1600 pixels bredde. Ikke fuld kontinuerlig afspilning eller måling af synkning.

| Tid | Observation | Konsekvens for modellen |
| --- | --- | --- |
| 0–18 s | Flokken er ved hækken; nogle ligger lavt, andre rejser sig eller står. Kameraet flytter sig | Første tilnærmelse skal ikke regnes som en reaktionstid fra videostart. Præcist kasttidspunkt er ikke fastlagt |
| 21–24 s | Synlig pasta på plænen; den brogede og en brun hun er nærmest og sænker hovedet. Hannen står længere bagude | Den brogede kan være blandt de første fremme. Farve-ID må ikke give en ufravigelig spiserækkefølge |
| 27–60 s | Flere fremrykninger, stop, vendinger og bevægelse væk fra og hen mod maden. Hannen er ofte oprejst | Tilnærmelsen er mere varieret end én fast pause efter et bestemt antal centimeter. Kamera-/menneskereaktion og flokreaktion kan ikke adskilles sikkert her |
| 66–69 s og 90,5–91,5 s | Hannen sænker næbbet til græsset og løfter hovedet igen; ved 91,5 s er næbbet åbent | Han er ikke konstant oprejst vagt under fodring. Fødeemnet kan ikke identificeres sikkert som pasta i disse billeder; ingen sikker konklusion om pastaindtag |
| 75–84 s | Broget og lys hun søger tæt sammen og skifter mellem næb-ned og hovedløft | Individuelle faser inden for fælles aktivitet. Tæt passage er ikke i sig selv aggression |
| 90,5 og 91,5 s | God nærreference til relativt strakte synlige ben både under lav halsføring og ved hovedløft | Fødeoptagelse må ikke automatisk give dyb knæbøjning. Hals og kropshældning bidrager til at nå jorden; benlængden bevares |
| 100–103 s | Den brogede har gentagne gange et tydeligt lyst pastastykke ved næbbet, sænker hovedet og håndterer føden med lav, fremstrakt hals | Skeln mellem optagelse fra jorden og håndtering ved næbbet. Ikke automatisk helt oprejst mellem hvert hak. Billedserien fastslår ikke, om det er samme stykke hele tiden eller præcis synkning |
| 111–114 og 120–124 s | Den brogede går helt frem til pastaen, bøjer sig ned, løfter hovedet og flytter fødderne | Brug til kontrol af små skridt, vægtskifte, forholdsvis strakte støtteben og overgangen mellem gang og fødeoptagelse |

### Forskelle identificeret før anden implementering

- `noticeDelay` og de faste pauser i `female()` er fortsat foreløbige. Den nye video støtter situationsafhængig tøven og mulighed for at vende væk; den dokumenterer ikke én fast rangorden eller bestemte sekundværdier pr. and.
- `peckSeconds = 0.52` er et tidligere animationsvalg. Videoen giver grundlag for at adskille nå-ned, optage og håndtere føden. Den skal ikke omsættes til én ny universel hakvarighed uden tættere kontrol.
- Den nuværende madlogik lader hannen vogte og afbryder almindelig foragering, når pasta findes. Næb-ned-sekvenserne viser, at den opdeling er for streng visuelt. At tillade korte søgebevægelser hos hannen er ikke det samme som at fastslå, at han spiser pasta.
- Kravet om næsten strakte ben gælder også under fødeoptagelse. De synlige led og skjulte knæ skal kontrolleres som en samlet bevægelse; billederne giver ikke præcise knoglevinkler.

Ved tilføjelsen af videoen var disse ændringer endnu ikke implementeret. Anden implementering nedenfor afløser denne status. Originalen og udtrækkene forbliver lokale og Git-ignorerede.


## Anden implementering: pasta, ben og fremadrettet bask

Ejerens korrektion: baskene går mere fremad, og kroppen strækker sig med. Supplerende gennemgang: `2026-10-05 15.24.46`, 32,40–33,55 s i 0,05 s trin. Den brogede holder en høj, strakt krop gennem hurtige gentagne vingeslag. Vingerne ses både foran/siden af kroppen og i tilbageføringen. Perspektiv, bevægelsesuskarphed og skjulte led gør præcise 3D-vinkler usikre. Den nye rytme er en visuel tilpasning, ikke en individuelt målt vingefrekvens.

Implementeret:

- Vingerne følger nu en fremadgående bue med forskudt fremføring og løft. Det lodrette udsving er reduceret; bryst og hals strækkes før og under bask og falder blødt tilbage. Fødderne bliver på jorden ved stående bask.
- Korte bask kan også forekomme under almindelig gang, når der er plads. De bliver ikke en fast del af hvert skridt. Ensidigt vingestræk har også et moderat kropsstræk.
- Fodring består af at nå ned, optage og håndtere pastaen med lavere hals og næbbevægelser. Pastastykket følger næbbet under håndteringen og frigives fra visningen ved afslutning eller afbrydelse. En and kan ikke overtage et stykke, som en anden allerede holder. Håndteringstiden varierer; den er ikke en påstået måling af synkning.
- Kroppen sænkes mindre under fødeoptagelse, så halsen når jorden uden en tilsvarende dyb benstilling. Faste benlængder og fodkontakt bevares.
- Afstand til pastaen og situationen påvirker tilnærmelsen. Den brogede kan komme før den lyse hun. Tilnærmelsespause varierer og har en kort orienterende hovedbevægelse.
- Hannen kan lave korte græsprober mellem vagtscanninger. Han tager fortsat ikke pasta i simulationen, da fødeemnet ved hans næb ikke kan identificeres sikkert i optagelsen.
- Fjerpudsning skifter mellem ryg/vinge og brystet, som ses på _KRH3489. Brystpudsning afløses blødt af den eksisterende sovestilling.
- Modelstudiet har fået forløb til fødeoptagelse/håndtering, brystpudsning og parringsinvitation ud over de eksisterende klip.

Verifikation: Alle 102 tests bestod efter integration af fodring og bask under gang. Efter den afsluttende justering af baskenes rytme/udsving og tilføjelse af brystpudsning bestod de 21 berørte model- og adfærdstests. TypeScript og produktionsbygning består; den eksisterende advarsel om en JavaScript-pakke over 500 kB består også. Browserkontrol fandt ingen JavaScript-fejl; pause og gennemse-skyder fungerer. Forfra/skråt og fra siden er bask, stræk og fodring gennemgået.

Afgrænsning: Dette er en proceduremæssig, stadig stiliseret rekonstruktion. Individuelle ledkurver er ikke motion capture. Præcis parringsinvitation, isoleret ben/vingestræk og rumpevrik har fortsat ejerbeskrivelsen som vigtigste grundlag. Råmateriale og billedudtræk forbliver lokale.

## Afsluttende gennemgang og implementering

Supplerende fotoanalyse af _KRH3465, _KRH3466 og _KRH3479 i fuld billedvisning: Den mønstrede hun har aflange mørke fjermidter og en smal lys markering på halsen. Den brogedes mørke hovedtegning omfatter området omkring øjet, ikke kun issen. Normalstillingen viser en fyldigere, fremadhældende krop og en kortere, kraftigere hals end den første model. Bask viser en mere oprejst og strakt stilling. Målene i modellen er fortsat visuelle tilpasninger; perspektiv og manglende målestok giver ikke præcise anatomiske størrelser.

Video `2026-10-05 15.24.46`, 34–39 s, er nu desuden gennemgået i 0,25 s trin. Den brogede folder vingerne ind ved ca. 34,25–34,75 s og går over i orientering og korte skridt. Flere pudser efterfølgende fjer. Ved 37,75–39 s ses endnu en brun hun baske. Det understøtter flere forskudte bask i samme floksekvens, men beviser ikke social årsag. Intet sikkert isoleret ensidigt ben/vingestræk eller entydigt rumpevrik er identificeret i disse ekstra billeder.

Ændringer:

- Fyldigere kropssilhuet, blødere kropskontur, kortere/kraftigere hals og mere langstrakt hoved. Normalstillingen har let fremadhældning; den tydeligt høje stilling forstærkes under bask.
- Justerede individuelle hoved-/halsmarkeringer og aflange fjermidter; de kraftige, ensartede buer i fjerteksturen er dæmpet. Farver og proportioner er fortsat proceduremæssige tilnærmelser.
- En nærtstående and kan lejlighedsvis reagere på en spontan baskesekvens efter sin egen forsinkelse. Responsen har en pause før en ny mulighed og kan ikke udløse en endeløs kæde af svar. Mad, utryghed og andre aktiviteter afbryder den. Dette er en forsigtig modelleringsantagelse, ikke dokumentation for bevist smitteadfærd.
- Vingestræk har et lille vægtskifte mod støttebenet; fødderne bliver plantet. Rumpevrik kobler hale og et lille udsving i bagkroppen. Ejerens beskrivelse er fortsat grundlaget for disse to klip; der er ikke indført et påstået videoafledt benspark.
- Modelstudiet viser nu gang, langsom gang og bask under gang samt afspilning i halv/kvart hastighed. Fodring og invitationsklippets tidsforløb er rettet til deres egne klipvarigheder.
- Replay af optagede fodmål er kontrolleret igen efter proportionsændringer. Når kun fødderne er optaget, må hoften sætte sig inden for fjerdragten for at bevare både fodmål og faste benlængder. Når kroppen også er optaget, bevares dens mål.

Alle efterspurgte adfærdstyper har nu en implementering i haven. Usikre rytmer, personlighedsparametre og gestusformer er markeret som tilpasninger frem for målte fakta. Direkte rekonstruktion af hver enkelt frame, fotorealisme og sikker identifikation af alle individer i fjernoptagelser er ikke opnået eller påstået.

### Langtidskontrol

En fem minutters simulation med seed 738 viste først, at den cirkulære pladskontrol gjorde bask/stræk unødigt sjældne. Den er derfor erstattet med en retningsafhængig kontrol med mere plads til siderne end foran/bagved. Gentagelsen viste følgerrelationerne han→mønstret hun, lys hun→broget og mønstret hun→broget; vingestræk hos den lyse hun, bask hos hannen og rumpevrik hos flere individer. Den indeholdt også fødesøgning, drikning, badning, fjerpudsning og søvn. Dette bekræfter, at aktiviteterne opstår i integrationen; det er ikke en måling af deres biologiske hyppighed. Social baskerespons er desuden afprøvet i en kontrolleret test med forsinkelse og afbrydelse ved mad.

### Afsluttende verifikation

Den endelige samlede kørsel består: 104 tests, ingen fejl. TypeScript-kontrol og produktionsbygning består. Browserkontrol af alle 12 studieforløb og haven giver ingen JavaScript-fejl; pause under gang fastholder præcis samme canvas. Modellerne er visuelt kontrolleret fra siden og skråt samt i haven. Den eksisterende Vite-advarsel om en fælles pakke over 500 kB er fortsat til stede. Lokale adresser er `http://127.0.0.1:5173/` og `http://127.0.0.1:5173/reference.html`.


## Nærkontrol af ben og fjerdragt

Ejerens mistanke om for bøjede ben var korrekt. De tidligere kontroller målte især det øverste led, mens kroppens sænkning stadig bøjede det nederste synlige led kraftigt. I modellen var bøjningen 74,6° ved lav ståstilling, 44,2° ved en fast fødesøgningsstilling og 37,0° ved fødeoptagelse (0° er strakt). De tilsvarende rettede stillinger ligger omkring 8,2°. Dette er modelmålinger, ikke fotogrammetrisk udledte anatomiske vinkler.

Til nærkontrollen er kameraets indlejrede JPEG på 6016 × 4016 pixel udtrukket fra _KRH3465.NEF, _KRH3466.NEF og _KRH3479.NEF. Det giver flere detaljer end de konverterede 900-pixel-visninger; det er ikke en ny RAW-fremkaldelse. `scripts/extract-raw-preview.py` kan gentage udtrækket. Udsnit af _KRH3465 viser et næsten strakt synligt støtteben, skælstruktur, dæmpet brunlig benfarve, aflange mørke fjermidter og lagdelte vingefjer. Hovedudsnittet af _KRH3466 er mindre skarpt og bruges derfor kun til grove farvefelter.

Implementeret:

- Langt mindre kropssænkning ved lav ståstilling, fødesøgning, spisning, stående fjerpudsning og bevægelse. Halsen udfører størstedelen af række-ned-bevægelsen. Søvn beholder sænket krop; skridtenes svingfase kan stadig bøje benet. Knoglelængder og plantede fodmål bevares.
- Lavere løft af svingfoden og mindre fremhævede synlige led. Benene har skælstruktur, og fødderne har tårygge og små klospidser med mere afdæmpede individuelle farver.
- Et sammenhængende lag af cirka 1.400 buede konturfjer pr. krop. Fjerene følger kroppens overflade og farvefelter, overlapper, varierer i bredde og har let løftede, ujævne spidser. Den mønstrede hun har mørkere fjermidter. Hovedet har kortere og langt finere dun.
- Smallere, fladere vingefjer, flere lag dækfjer og mere afdæmpede vingefelter. Halsens silhuet har meget små variationer. De ekstra krops-/hoveddetaljer skjules på afstand med hysterese for at reducere belastning og undgå flimren ved afstandsgrænsen.
- Modelstudiet kan isolere hvert individ i nærvisning og har et særskilt klip for lav ståstilling.
- Drikning er kontrolleret med de mere strakte ben: næbbet når bassinets faktiske vandhøjde.

Den private lokale side `http://127.0.0.1:5173/.local/leg-comparison.html` viser referenceudsnit og før/efter-billeder. Materialet under `.local` og originalfilerne er fortsat Git-ignorerede og indgår ikke i produktionsbygningen.

Verifikation: 108 tests består, herunder en ny kontrol af det nederste synlige led ved ståstilling, fødesøgning, spisning, fjerpudsning og gang i tre hastigheder. Under gang skal mindst 90 % af støttefaserne holde sig under 20° bøjning. TypeScript-kontrol og produktionsbygning består. Den eksisterende advarsel om en JavaScript-pakke over 500 kB består. Modellerne er fortsat stiliserede og proceduremæssige; de nye fjer er geometri, men ikke en fuld fotorealistisk rekonstruktion af hvert individs fjerdragt.

### Overgang mellem krop og hals

Fjerlaget stoppede tidligere ved cirka 88 % af kroppens overfladeringe og blotlagde toppen, når halsen blev bøjet frem. Det går nu helt til toppen med kortere fjer ved den smalle afslutning. Halsens nederste del har en bredere, glidende indsnævring, og brystfarven blandes gradvist ind i halsfarven. Dette ændrer overflade og silhuet, ikke fodmål eller hovedets bevægelsesforløb. 23 berørte model-, hals- og retarget-tests samt TypeScript og produktionsbygning består. Den eksisterende pakkestørrelsesadvarsel består.

### Fjerringe ved kroppens top

Den første udvidelse af fjerlaget skabte koncentriske rækker ved kroppens smalle top. Området bruger nu et forskudt gitter i kroppens vandrette plan med bagudrettede fjer, projiceret på overfladen. Fjerenes egen tekstur bruger lokale koordinater frem for at blive klemt sammen ved kroppens pol. Sidefjerene har desuden lidt forskudte rødder. Visuelt kontrolleret under fødesøgning fra siden og skråt ovenfra på den lyse hun og hannen; TypeScript og produktionsbygning består. Ændringen berører kun fjergeometri og teksturkoordinater.

### Mere fjerstruktur på hals og hoved

Halsen har nu korte overlappende 3D-fjer, bundet til den deformerende halsflade. Fjerfarver interpoleres fra halsens eksisterende farvefelter, så halsring og brogede markeringer følger med; den mønstrede hun har mørkere fjermidter. Hovedfjerene har mere varierende længde, farve og løftede spidser, med fri plads foran ved øjne og næb. Halsdetaljerne skjules på afstand med hysterese. Halsens bevægelseskurve er uændret. Ni relevante hals- og retarget-tests består; alle 13 studieforløb er browserkontrolleret uden JavaScript-fejl, og pause virker. TypeScript og bygning består; pakkestørrelsesadvarslen er uændret.

### Fodløft under gang — ny videokontrol

2026-10-05 10.50.29 er gennemgået igen, med otte udsnit fra originalopløsningen ved 13,05–13,40 s i 0,05 s trin. Hos den brogede ses en plantet fod ved 13,15 s, fremføring af det modsatte ben med tydeligt løft ved 13,20–13,25 s og fremstrækning/nedsætning ved 13,30 s. Støttebenet er samtidigt forholdsvis strakt. Hannen viser også løftet fod under kroppen i samme sekvens. Det støtter ejerens observation om, at animationens svingfod løftes for lidt; det er ikke et argument for mere bøjet støtteben.

Den tidligere reduktion til `.032 + speed*.020` var for kraftig. Svinghøjden er nu `.060 + speed*.025` i modellens koordinater, mens fodkontakt, skridtrækkefølge og støttebenets kontrol bevares. Parametrene er visuelt tilpassede, ikke centimetermål fra videoen; kamera og græs skjuler det præcise jordplan. Billedbevis ligger privat i `.local/walk-lift/evidence.jpg`. Gang- og modeltests, TypeScript og bygning består; alle 13 studieforløb er browserkontrolleret uden JavaScript-fejl.

## Græs, vejr og baskeforløb

Græsset har fået en proceduremæssig tekstur med fine strå, tørre rester og ujævne mørke jord-/mospletter samt flere og smallere 3D-strå. De store farvepletter har nu blød udtoning i stedet for skarpe cirkelkanter.

Vejrkilden blev faktisk hentet under fejlsøgningen: Open-Meteo svarede for Gistrup den 7. oktober kl. 16.30 med 100 % skydække, 13,7 °C, kode 3 og 0 mm regn/byger. Det afveg fra ejerens lokale observation af regn. Scenens manglende fulde skydække var samtidig en separat visningsfejl: skymængden ændrede næsten kun farve. Nu bliver himlen helt grå ved fuldt skydække, skylagene bredere og direkte sollys væsentligt svagere. Let nedbør skjules ikke længere under en grænse på 0,1 mm. Regn tegnes med korte dråbestriber og mængdeafhængig tæthed. Vejrkoder for regn/støvregn kan give synlig let regn, selv når mængden afrundes til nul; overskyet alene opfinder ikke regn. Status viser beskrivelse og datatidspunkt, cache og opdateringsinterval er fem minutter, og siden kontrollerer vejret igen, når fanen bliver synlig. Kildens modeldata kan fortsat afvige fra en konkret have; manuel regnindstilling er bevaret.

Baskeforløb er forlænget fra 2,4 til 3,8 sekunder med samme slagtempo. Eksisterende afbrydelser ved fare, mad og utilstrækkelig plads bevares.

Kontrol: 12 relevante vejr- og referenceadfærdstests består. Browserkontrol med tydeligt adskilte testdata for tørt overskyet vejr og meget let regn bekræfter korrekt synlighed, gyldig dråbegeometri og ingen JavaScript-fejl. TypeScript og produktionsbygning består; den eksisterende pakkestørrelsesadvarsel består. Testskærmbilledet `.local/lawn-rain.png` viser simuleret regn og er ikke en påstand om live-data.

### Ryk ved tilstandsskift

Et konkret spring blev reproduceret ved drikning → hvile: det stadig nedbøjede hoved flyttede sig 0,236 sceneenheder på ét billede, fordi næbmålet straks skiftede fra vandhøjde til jordhøjde, mens posituren blev blandet langsomt. Drikkemål og tærskel glider nu med en selvstændig overgang; hvilestillingens lille kropshældning er også udjævnet. En ny regressionstest fejlede før rettelsen og består efter (højst 0,06 sceneenheder på det første billede). Alle 10 hals-/retarget-tests består, ligesom TypeScript og bygning. Browserkontrol af 13 studieforløb fandt ingen JavaScript-fejl. Dette dokumenterer en konkret overgangsfejl; alle sjældne tilfælde af oplevet dobbeltbillede eller ujævn billedrytme er ikke reproduceret og kan ikke erklæres løst ud fra denne test alene.

### Slankere kropsform

Efter ejerens observation er _KRH3465 og _KRH3466 sammenholdt med modellen igen. Kroppens fylde er reduceret 12 % på tværs og 9 % i dybden; højden og individernes relative breddeforskelle er bevaret. Dette er visuel tilpasning, ikke anatomiske procentmålinger fra fotos. Krop, fjer og foldede vinger følger samme skalering; halsfæste og benfæster bruger fortsat kropsskalaen. Visuelt kontrolleret fra siden og forfra. Alle 18 model-/retarget-tests samt TypeScript og produktionsbygning består.

### Varierede indhop i baljen

Hvert badebesøg vælger nu ét af 24 tilfældigt fordelte kandidatsteder langs kanten. Afstand fra anden og plads omkring afsæt/landing vægtes sammen med tilfældighed. Afsætssted, ventepunkt og vandmål fastholdes under tilgangen. Hoppets retning følger det valgte mål, og kontrollen af fri landing bruger det nye landingssted. Indhoppene afvikles fortsat ét ad gangen; udhoppet er uændret. TypeScript og bygning består. Den længere badetest bekræfter, at alle fire individer svømmer, at mindst tre forskellige sektorer bruges ved indhop, at ænderne bliver i haven og ikke overlapper hinanden ved baljen.

### Varieret startadfærd

Ved genindlæsning vælges nu individuelle startaktiviteter: hunnerne kan gå, hvile, søge føde eller pudse fjer; hannen kan holde vagt, søge føde eller pudse fjer. Tilstandens tilhørende timere initialiseres samtidig, så aktiviteten ikke straks afbrydes på første opdatering. De første tidspunkter for fødesøgning, fjerpudsning og gestus varierer også. Startpositionerne er bevaret, og der startes ikke midt i et hop, en fødeoptagelse uden mad eller svømning på land. En ny test undersøger 16 opstarter, gyldige tilstande, fastholdelse af startaktiviteten og reproducerbarhed med en test-seed.

Verifikation af startadfærd: De berørte tests er kontrolleret, inklusive fødeafbrydelse, nat/dag og baljebesøg. To tidligere testantagelser var bundet til den faste opstart: reset krævede altid oprejst stilling, og en fødetest afbrød den nu mulige indledende fødesøgning, før jagt kunne observeres. De kontrollerer nu gyldig positur for den valgte starttilstand og lader jagt etablere sig før fødeafbrydelse; begge består. Browserkontrol af 13 studieforløb fandt ingen fejl. TypeScript og bygning består.

### Mudrede mærker efter snadren

Fødesøgningsmærkerne er ændret fra mørkegrønne til varierende jordbrune nuancer. En kornet maske giver ujævne, bløde kanter, og nærliggende næbkontakter kan danne flere små mærker. Den tidligere lille størrelse er bevaret. Gentagen snadren fornyer mærket; det begynder at falme 15 sekunder efter sidste berøring og er væk efter 75 sekunder. Højst 64 mærker bevares. Begge eksisterende tests for størrelse, genbrug, levetid og afgrænsning består, sammen med TypeScript og produktionsbygning.

### Synlighed af muddermærker rettet

Browsermåling viste fire oprettede mærker, men deres faktiske højde var kun 0,00105: gruppens lodrette skalering havde presset den lokale højde 0,007 ned under plænens farvepletter ved 0,006. Gruppen skalerer nu kun vandret; næbmærket ligger ved 0,014 og en blød mudderplet omkring det ved 0,012. Tegnerækkefølge og dybdeoffset stabiliserer overfladerne, mens almindelig dybdetest stadig skjuler mærker bag ænderne. Efter rettelsen blev syv naturligt dannede mærker registreret, og et nærbillede i haven bekræftede synlige brune spor. En regressionstest kontrollerer nu verdenshøjden efter skalering. Begge mærketests, TypeScript og bygning består. Skærmbillede: `.local/mud-after.png`.

### Mærker vises efter næbløft

Den omgivende mudderplet er gjort større og mørkere, så den også kan ses fra havens normale kamera; selve punkteringen er fortsat lille. Ejeren bekræftede synligheden. Næbkontakten opsamles nu per and, og mærket vises først, når det animerede næb løftes fri af jorden eller flyttes væk fra kontaktstedet. Afslutningen af simulationens hakkesignal er ikke nok: halsens udglattede bevægelse skal også være fulgt med. Ved gentagen snadren skjules det eksisterende mærke under kontakten. Tre mærketests, TypeScript og produktionsbygning består. Browserkørsel gav fem synlige mærker uden JavaScript-fejl.
