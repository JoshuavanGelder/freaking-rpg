# Freaking RPG — werkafspraken voor Claude

Android-app (Expo SDK 57, React Native 0.86, React 19.2, TypeScript): tekstavontuur met Claude als verteller.
Eigenaar: Joshua van Gelder (Nederlands; antwoord in het Nederlands). Zusterproject van `JoshuavanGelder/freaking-dj`;
de techniek (GitHub-branch + workflow + warme runner + APK via Releases) komt daar vandaan.

## Werkwijze met Joshua
- Joshua werkt vanaf zijn telefoon (Galaxy S25) + GitHub. Geen afhankelijkheid van een desktop.
- Hij installeert de APK uit GitHub Releases. Elke push naar `main` = nieuwe build + release `build-N`.
- Kort en concreet rapporteren; na een push eerst de snelle `checks`-job bekijken, de APK-build duurt ~10 min.

## Wensen van Joshua (vast)
- Gratis, op zijn eigen Claude-abonnement (setup-token in GitHub Actions), losse Android-app.
- Setting en toon kiest hij zelf bij de start (1 of 2 tonen, of eigen woorden). Superhelden is een setting.
- **Geen kansberekening zichtbaar**: geen dobbelstenen, eigenschappen, cijfers of moeilijkheden in de UI of
  verteltekst. Eigenschappen maakt Claude per held (een speedster heeft andere dan een ringdrager) en blijven verborgen.
  Zichtbaar mag: leven, goud, level, tas, quests.
- Beelden: max. 512×512, goedkoopste model/laagste instelling (FLUX.2 klein 4B), ook actiemomenten (vuurbal → op het plaatje).
- **Toetsenbord (altijd controleren)**: elk invoerveld moet zichtbaar blijven als het telefoontoetsenbord open is.
  Android edge-to-edge krimpt het venster niet mee. Oplossing in `src/keyboard.ts`: `KeyboardAvoidingView` (padding)
  rond alle schermen in `App.tsx`, en `Screen`/`Field` in `ui.tsx` scrollen het actieve veld boven het toetsenbord.
  Nieuw scherm of veld: gebruik `Screen` + `Field` (of `useKeyboardReveal` bij een eigen ScrollView); invoer buiten
  een ScrollView onderaan het scherm zetten (zoals de actiebalk in Story). Bij elke wijziging aan invoer nalopen.
- **Invoer mag nooit resetten** bij wisselen tussen schermen (stap 1 ↔ 2, verhaal ↔ held): gebruik `useDraft`
  uit `src/drafts.ts` (bewaard in AsyncStorage `frpg-drafts-v1`, los van de grote staat).
- Ontwerp: donker en warm (`#15120F`), oranje accent `#FF7A3D`, Archivo Black / Archivo, verhaal in Literata.
  Ontwerp-artifact: "Freaking RPG – App-ontwerp" op claude.ai.

## Taal (Nederlands / Engels)
- **Twee talen, twee niveaus.** De *app-taal* (`settings.lang`, Instellingen → Taal / Language, standaard Nederlands) bepaalt alle schermteksten.
  De *verhaaltaal* staat **per avontuur** (`world.lang`): Joshua kiest hem bij de start (stap 1, "Taal van het verhaal", begint met de
  app-taal) en hij verandert niet meer. Oude avonturen zonder `world.lang` blijven Nederlands (`storyLang`, `langOf`).
- **Elke tekst die de speler leest staat in `src/i18n.ts`, in beide talen** (`nl` en `en` hebben dezelfde sleutels, anders geeft tsc een fout;
  `src/i18n.test.ts` controleert ook de `{plaatsvervangers}`). In React: `const { t, tn, lang } = useT()` (`src/lang.ts`); buiten React
  (services, beurten, beeldenwachtrij): `tt('sleutel')`. Spellogica krijgt `lang` als laatste parameter met standaard `'nl'`
  (`ago`, `formatGold`, `worldLabel`, `worldProblem`, ...). Meervoud: sleutels `x.one` / `x.other` met `tn('x', n)`.
  Nooit een tekst hard in een scherm zetten, ook geen `accessibilityLabel` of `Alert`.
- Opgeslagen waarden blijven Nederlandse id's (toon-namen, `kracht`/`zwakte`, `klein`/`groot`/`volledig`, `levend`/`dood`/`vermist`, `ja`/`nee`,
  setting-id's): alleen de weergave wordt vertaald (`toneLabel`, `settingView`, `trait.*`). Zo blijven oude avonturen en het schema kloppen.
- De app zet `lang` in elk verzoek (`buildRequest`, uit `storyLang(adv)`); `rpg/lib.mjs` (`languageLines`) zet een sectie **Language** bovenaan het bericht en
  `rpg/prompt.md` + `rpg/schema.json` zeggen "story language" in plaats van "Dutch". Meldingen van de workflow (`msg`, `classify(..., lang)`) volgen de
  taal van het verzoek. Beeldprompts blijven altijd Engels.
- Een nieuwe taal toevoegen: `Lang` + `LANGS` + `localeOf` in `i18n.ts`, een derde woordenlijst met dezelfde sleutels, en `MSG` in `rpg/lib.mjs`.

## Claude via zijn abonnement (géén API-key)
- De app zet een beurt in branch `rpg-data` (`requests/<id>.json`) en start `.github/workflows/rpg.yml`
  (workflow_dispatch, run-name `RPG <id>`). Warme verteller: `request_id=standby` (run-name `RPG standby`),
  `rpg/standby.mjs` blijft 10 min na de laatste beurt klaarstaan. Vangnet in de app: na 75 s alsnog een losse run.
- `rpg/handle.mjs` draait `claude -p` met `rpg/prompt.md` als systeemprompt en `rpg/schema.json` als `--json-schema`,
  geen tools, `--effort low` (opening: medium; niet voor haiku), lege werkmap. Schrijft `responses/<id>.json` met `status`
  ok | limiet | token | fout.
- De verteller onthoudt niets: elk verzoek bevat wereld, held, staat, samenvatting (≤120 woorden, door Claude
  bijgewerkt), de laatste 6 beurten (met de prompt van het beeld als er een gemaakt is), de cast en het canon-blad, de actie en een
  verborgen d20-worp van de app.
- **Cast** (`adv.cast`): terugkerende bijpersonen: vast Engels uiterlijk (met leeftijd, zoals `heroLook` voor de held) plus wat het
  verhaal niet mag vergeten: `status` (levend = ontbreekt, dood, vermist), `home`, `role`, `note`, `companion`. De verteller
  geeft nieuwe/veranderde personen terug in `cast` (lege tekst = ongewijzigd); `mergeCast` voegt samen op naam (`matchName`: hele
  woorden, "de waard" = "Bram de waard", nooit "Anna" = "Annabel"; held niet), zet wie net veranderde achteraan en laat bij meer dan 40
  eerst de langst ongenoemde vallen (doden en metgezellen het laatst). Doden krijgen geen uiterlijk in het verzoek. Oude avonturen
  (`cast` undefined) sturen eenmalig `earlierPictures` mee (max. 12 eerdere beeldprompts) zodat de verteller de looks vastlegt;
  eerste beschrijving wint (aanleiding: Maren werd van oud vrouwtje ineens jong).
- **Canon-blad** (`adv.canon {places, facts, time}`, `mergeCanon`): vaste plekken (naam + één zin: uiterlijk, wie er woont), blijvende
  feiten (beloftes, schulden, geheimen, vijanden; `forgetFacts` haalt er weer een weg) en het moment van de dag. Samen met de cast
  gaat het in elk verzoek mee en wint het van de samenvatting (die alleen nog de verhaallijn bevat, ≤120 woorden). Prompt: "The dead
  stay dead" (een terugkeer alleen als wereld en toon het toelaten én het verhaal er een duidelijke gebeurtenis van maakt),
  woonplaatsen blijven vast tot het verhaal iemand verhuist, de tijd van de dag moet kloppen. Oude avonturen (`canon` undefined) laten
  de verteller het blad eenmalig opbouwen uit samenvatting en recente beurten. Aanleiding: een dode man stond ineens weer op en een
  personage woonde ineens in een ander huis.
- **Nadenkstand en verbruik**: `effortFor` in `rpg/lib.mjs`: de opening draait op `--effort medium` (wereld, eigenschappen, verhaalplan,
  eerste canon; één keer per avontuur), gewone beurten op `low`, haiku zonder instelling. `handle.mjs` zet `effort` en `usage`
  (tokens uit `claude -p`, kosten = schatting tegen API-prijzen) in het antwoord en als `::notice` in de workflow. De app bewaart de
  laatste 40 (`usageLog`, `src/logic/usage.ts`) en toont gemiddelden per soort beurt bij Instellingen → Verbruik per beurt.

## Spellogica (`src/logic/game.ts`, getest)
- `parseAnswer` maakt het antwoord veilig (grenzen: leven ±10 per beurt, xp 0–30, max 6 eigenschappen 0–5, goud ±1 miljard per beurt
  en max. 9.999.999.999 in totaal; `formatGold` toont bedragen met punten). Aanleiding: een miljoen in een modern verhaal werd
  afgekapt op 9999. De prompt laat het geldbedrag meeschalen met de wereld (munten in fantasy, euro's in modern).
- `applyAnswer`: de app past toe; spullen kwijtraken gaat via `matchName` ("zwaard" haalt "Roestig zwaard" weg); eigenschappen bij de start, later alleen nieuwe erbij (max. 8, bestaande nooit anders);
  level = 1 + xp/100 (+2 max leven per level);
  0 leven of `gameOver` = einde. Zichtbare notities: spullen, quests, locatie, level, krachten (geen cijfers van worpen).
- **Heling** (`changes.heal`, `healAmount` in game.ts): de verteller kiest een maat, de app rekent het leven uit
  (klein 25%, groot 60%, volledig 100% van max-leven). `changes.hp` is alleen nog schade. Veilig rusten of een echte
  genezer = volledig. Aanleiding: de verteller koos zelf kleine getallen, waardoor je zelden volledig herstelde.
  Een heling vervangt een positieve hp; schade in dezelfde beurt telt eerst (op 0 geklemd, daarna heling).
- **Zelfherstel** (`changes.regen` → `state.regen`, `regenAmount`): optioneel per held, alleen als het verhaal het
  rechtvaardigt (regenererende held, trol, vampier, helende magie). `traag` = 10%, `snel` = 25% van max-leven per beurt
  zonder schade of heling; niet bij de start, niet bij game over. `geen` haalt het weg. Staat in het verzoek als
  `natural regeneration (regen)`.
- **Lengte** (`world.textLength`, `world.arc`, gekozen op het startscherm, opgeslagen per avontuur): tekst per beurt kort
  (max. 70 woorden) / normaal (max. 120, standaard) / uitgebreid (max. 200): een plafond, geen doel; kleine acties (eten, rusten,
  rondkijken) krijgen 1–3 zinnen (prompt: Size the text to the moment, aanleiding: een hap eten kreeg een hele pagina); avontuur kort (±12 beurten) / middel (±25,
  standaard) / lang (±50) / onbeperkt (de speler beslist). De woordaantallen en eindregels staan in `rpg/lib.mjs`
  (`NARRATION`, `pacingLines`); het verzoek bevat `pacing {turn, total}` (opening = 0). Bij beurt ≥ total zegt het
  verzoek "THE END IS DUE" en eindigt de verteller met `gameOver: true`; bij onbeperkt rondt hij nooit zelf af.
  Oude avonturen (zonder `arc`) zijn onbeperkt en krijgen normale tekstlengte. Aanleiding: verhalen voelden langdradig.
  **Einde tijdens het spelen** (`adv.endPlan {total, from}`, `setTurnsLeft`, `turnsLeft`, `endTotal` in game.ts): onder de
  levensbalk in Story staat "Einde: nog N beurten"; tikken opent een paneel (Afsluiten = volgende beurt is het einde,
  3/5/10/20, stepper, Onbeperkt; bewust zonder tekstveld). Overschrijft de lengte van het startscherm, werkt ook bij
  onbeperkte of oude avonturen. `pacing.from` laat de verteller vanaf dat moment een slotstuk bouwen (geen reset).
  **Toch doorgaan** (`resumeStory`, `resume` in turns.tsx): op de eindkaart; zet `ended` terug, geen vast einde meer
  (`endPlan` onbeperkt), een gevallen held (0 leven) komt terug met half leven, en de app start meteen een beurt met
  `RESUME_ACTION`. Alleen die eerste beurt krijgt `resumed {died}` in het verzoek (prompt: Continuing after an ending).
- **Krachten en zwaktes uit het verhaal** (`state.traits`, zichtbaar op het heldenscherm onder Joshua's eigen tekst,
  zonder cijfers): verteller geeft `changes.addTraits` (naam, kracht|zwakte, korte uitleg) en `removeTraits`; zelfde
  naam = bijwerken. Bij een nieuwe kracht mag hij één nieuwe verborgen eigenschap toevoegen. Oude avonturen
  (`traits` undefined) vragen de verteller eenmalig alles aan te vullen wat het verhaal al gaf (aanleiding: wind- en
  schaduwkrachten die niet op het heldenscherm stonden).

- **Afronden en kwijtraken** (`matchIndex` in game.ts): `completeQuests` en `removeTraits` matchen niet meer alleen letterlijk maar ook op bijna-gelijke tekst (leestekens/accenten negeren, de ene tekst in de andere, genoeg gedeelde woorden; bij twijfel tussen twee geen match). De verteller moet elke beurt open quests en krachten naast het verhaal leggen (prompt: Bookkeeping check). Op het heldenscherm kan Joshua met de hand een quest afvinken (`finishQuestByHand`) en een kracht/zwakte weghalen (`dropTraitByHand`), met bevestiging. Aanleiding: quest niet afgevinkt en 'Zwarte vlam' bleef staan in het askroon-verhaal.

## Beelden (`src/pictures.tsx`, `src/services/images.ts`, `src/services/files.ts`)
- De app roept Joshua's eigen Cloudflare Worker `claudia-image-mcp` (= zijn Images-koppeling) direct aan via JSON-RPC
  `tools/call generate_image` met `model: klein`, 512×512. URL (`…workers.dev/mcp/<SECRET>`) in SecureStore; testen
  met `tools/list` (kost geen tegoed). Geen Cloudflare-token nodig.
- Verteller levert per beurt `image {show, kind, prompt, fallback}`, bij de start `heroLook` en `portrait`.
  De app plakt een stijl per setting erachter (`styledPrompt`). Filterfout 3030 → één poging met `fallback`
  (alleen de plek, geen personen). Getest: het filter weigert alles wat op een superheld lijkt (kostuum, embleem,
  cape, masker, "speedster"); helden dus in gewone kleding met krachten als effecten (snelheidsstrepen, gloed).
  Netwerkfout (app op achtergrond) → wachten tot de app voorop staat en max. 2 keer opnieuw.
  Vangnet in de app: `defuse()` haalt kostuumwoorden uit elke prompt; pogingen = prompt + max. 3 andere:
  defuse(prompt), defuse(fallback), sfeerbeeld van de plek zonder personen (`placePrompt`, niet bij portret) (`promptAttempts`). Ook de `heroLook` in het verzoek gaat eerst door `defuse`.
- Wachtrij: één beeld tegelijk, portret eerst, hervat na herstart; bestanden in `Paths.document/frpg-beelden`
  (expo-file-system); dagteller per UTC-dag (`imageCounter`), max. per dag instelbaar (standaard 150).

## Bouwen en controleren (sandbox zonder npm)
- `npm install` werkt lokaal niet. Wel: node 22, `tsc`, python3.
- Tests: `npm test` (node --experimental-strip-types). Logica-bestanden importeren elkaar met `.ts`-extensie.
- Typecheck lokaal: `./scripts/typecheck-local.sh` (stubs in `scripts/typecheck-stubs.d.ts`).
- CI `android.yml`: job `checks` (tests, expo install --fix, tsc) en job `build` (prebuild, Gradle, release).

## Architectuur
- `App.tsx`: fonts, providers, eigen route-stack (home, new, hero, story, sheet, settings).
- `src/store.tsx`: avonturen + instellingen in AsyncStorage (`frpg-state-v1`). GitHub-token in SecureStore.
- `src/turns.tsx`: lopende beurten (versturen, warme verteller, pollen, toepassen), hervat na herstart.
- `src/services/github.ts`: branch `rpg-data`, workflow `rpg.yml`. `src/services/status.ts`: statuspagina Claude.
- `src/pictures.tsx`: beeldenwachtrij; `src/picture-view.tsx`: beeldvak + volledig scherm.
- Story: het beeld van een beurt staat onder de verteltekst; de 3 keuzes zijn ingeklapt achter een knop met chevron en gaan bij elke nieuwe beurt weer dicht.
- `src/screens/`: Home, New (wereld en toon), Hero (personage), Story (verhaal + wachtstand + beelden), Sheet (held + portret),
  Gallery, Settings.
