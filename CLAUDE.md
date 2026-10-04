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

## Claude via zijn abonnement (géén API-key)
- De app zet een beurt in branch `rpg-data` (`requests/<id>.json`) en start `.github/workflows/rpg.yml`
  (workflow_dispatch, run-name `RPG <id>`). Warme verteller: `request_id=standby` (run-name `RPG standby`),
  `rpg/standby.mjs` blijft 10 min na de laatste beurt klaarstaan. Vangnet in de app: na 75 s alsnog een losse run.
- `rpg/handle.mjs` draait `claude -p` met `rpg/prompt.md` als systeemprompt en `rpg/schema.json` als `--json-schema`,
  geen tools, `--effort low` (niet voor haiku), lege werkmap. Schrijft `responses/<id>.json` met `status`
  ok | limiet | token | fout.
- De verteller onthoudt niets: elk verzoek bevat wereld, held, staat, samenvatting (≤120 woorden, door Claude
  bijgewerkt), de laatste 6 beurten (met de prompt van het beeld als er een gemaakt is), de cast, de actie en een
  verborgen d20-worp van de app.
- **Cast** (`adv.cast`): vast Engels uiterlijk (met leeftijd) van terugkerende bijpersonen, zoals `heroLook` voor de held.
  De verteller geeft nieuwe/veranderde personen terug in `cast`; `mergeCast` voegt samen (zelfde naam = bijwerken, held
  niet, max. 24). Oude avonturen (`cast` undefined) sturen eenmalig `earlierPictures` mee (max. 12 eerdere beeldprompts)
  zodat de verteller de looks vastlegt; eerste beschrijving wint (aanleiding: Maren werd van oud vrouwtje ineens jong).

## Spellogica (`src/logic/game.ts`, getest)
- `parseAnswer` maakt het antwoord veilig (grenzen: leven ±10 per beurt, xp 0–30, max 6 eigenschappen 0–5).
- `applyAnswer`: de app past toe; eigenschappen bij de start, later alleen nieuwe erbij (max. 8, bestaande nooit anders);
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
  (30–70 woorden) / normaal (60–120, standaard) / uitgebreid (110–200); avontuur kort (±12 beurten) / middel (±25,
  standaard) / lang (±50) / onbeperkt (de speler beslist). De woordaantallen en eindregels staan in `rpg/lib.mjs`
  (`NARRATION`, `pacingLines`); het verzoek bevat `pacing {turn, total}` (opening = 0). Bij beurt ≥ total zegt het
  verzoek "THE END IS DUE" en eindigt de verteller met `gameOver: true`; bij onbeperkt rondt hij nooit zelf af.
  Oude avonturen (zonder `arc`) zijn onbeperkt en krijgen normale tekstlengte. Aanleiding: verhalen voelden langdradig.
  **Einde tijdens het spelen** (`adv.endPlan {total, from}`, `setTurnsLeft`, `turnsLeft`, `endTotal` in game.ts): onder de
  levensbalk in Story staat "Einde: nog N beurten"; tikken opent een paneel (Afsluiten = volgende beurt is het einde,
  3/5/10/20, stepper, Onbeperkt; bewust zonder tekstveld). Overschrijft de lengte van het startscherm, werkt ook bij
  onbeperkte of oude avonturen. `pacing.from` laat de verteller vanaf dat moment een slotstuk bouwen (geen reset).
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
