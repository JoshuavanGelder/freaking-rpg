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
  bijgewerkt), de laatste 6 beurten, de actie en een verborgen d20-worp van de app.

## Spellogica (`src/logic/game.ts`, getest)
- `parseAnswer` maakt het antwoord veilig (grenzen: leven ±10 per beurt, xp 0–30, max 6 eigenschappen 0–5).
- `applyAnswer`: de app past toe; eigenschappen alleen bij de start; level = 1 + xp/100 (+2 max leven per level);
  0 leven of `gameOver` = einde. Zichtbare notities: spullen, quests, locatie, level (geen cijfers van worpen).

## Beelden (`src/pictures.tsx`, `src/services/images.ts`, `src/services/files.ts`)
- De app roept Joshua's eigen Cloudflare Worker `claudia-image-mcp` (= zijn Images-koppeling) direct aan via JSON-RPC
  `tools/call generate_image` met `model: klein`, 512×512. URL (`…workers.dev/mcp/<SECRET>`) in SecureStore; testen
  met `tools/list` (kost geen tegoed). Geen Cloudflare-token nodig.
- Verteller levert per beurt `image {show, kind, prompt, fallback}`, bij de start `heroLook` en `portrait`.
  De app plakt een stijl per setting erachter (`styledPrompt`). Filterfout 3030 → één poging met `fallback`
  (alleen de plek, geen personen). Getest: het filter weigert alles wat op een superheld lijkt (kostuum, embleem,
  cape, masker, "speedster"); helden dus in gewone kleding met krachten als effecten (snelheidsstrepen, gloed).
  Netwerkfout (app op achtergrond) → wachten tot de app voorop staat en max. 2 keer opnieuw.
  Vangnet in de app: `defuse()` haalt kostuumwoorden uit elke prompt; pogingen = prompt, defuse(prompt),
  defuse(fallback) (`promptAttempts`). Ook de `heroLook` in het verzoek gaat eerst door `defuse`.
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
- `src/screens/`: Home, New (wereld en toon), Hero (personage), Story (verhaal + wachtstand + beelden), Sheet (held + portret),
  Gallery, Settings.
