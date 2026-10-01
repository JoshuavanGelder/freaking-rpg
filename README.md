# Freaking RPG

Een tekstavontuur op je telefoon met Claude als verteller. Jij kiest de wereld (fantasy, superhelden, sci-fi, horror, noir, of je eigen wereld) en de toon, maakt een held, en typt wat je doet. Claude vertelt wat er gebeurt. Dobbelstenen en eigenschappen draaien onzichtbaar mee. Claude draait via **je eigen Claude-abonnement** in GitHub Actions, net als bij Freaking DJ: geen API-key, geen kosten.

## Installeren
Open op je Android-telefoon de nieuwste [release](../../releases/latest) en tik op het `.apk`-bestand.

## Eenmalig instellen

1. **GitHub-token** — [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new):
   fine-grained, alleen repo `freaking-rpg`, rechten **Contents** en **Actions**: *Read and write*.
   Plak het in Freaking RPG → Instellingen → GitHub. (Je kunt ook je token van Freaking DJ uitbreiden met deze repo.)
2. **Claude-token** — open een Codespace op deze repo (knop *Code → Codespaces*, kan op je telefoon), typ in de
   terminal `bash scripts/claude-token.sh` en volg de stappen. Kopiëren uit de terminal is niet nodig:
   - de editor opent `claude-inloggen.md` met één link: tik erop, log in bij Claude en tik op *Authorize*;
   - Claude toont een code: plak die in `plak-hier-de-code.txt` (opent ook). Kom je op een kapotte
     localhost-pagina, plak dan de hele link uit de adresbalk in dat bestand;
   - het script maakt het token, test het en zet het als secret **`CLAUDE_CODE_OAUTH_TOKEN`** in
     `freaking-rpg` én `freaking-dj` (hetzelfde token mag in beide). Het is 1 jaar geldig; daarna opnieuw draaien.
3. **Beelden** — plak in Instellingen → Beelden de URL van je Images-koppeling (je Cloudflare Worker
   `claudia-image-mcp`, eindigt op `/mcp/<geheime code>`). De app test hem zonder tegoed te gebruiken.

## Hoe het werkt
- De app zet je beurt (wereld, held, verborgen staat, samenvatting, laatste beurten, je actie en een verborgen
  d20-worp) als JSON in branch `rpg-data` en start de workflow **Verteller**. Die draait de officiële Claude Code
  met je abonnement en zet het antwoord terug.
- Zodra je de app opent staat er een **warme verteller** klaar (10 minuten na je laatste beurt), zodat een beurt
  ongeveer 20 seconden duurt in plaats van 1 à 2 minuten.
- De app is baas over de staat: Claude stelt wijzigingen voor (leven, goud, spullen, quests, locatie) en de app
  controleert de grenzen. Eigenschappen en worpen zie je nooit; je ziet alleen wat er in het verhaal gebeurt.
- Je verhalen staan op je telefoon. Let op: deze repo is publiek, dus de beurten in `rpg-data` zijn voor
  iedereen leesbaar. Maak de repo privé als je dat niet wilt (dan heb je ca. 2.000 gratis Actions-minuten per maand).

## Beelden
- Vierkant, 512×512, met FLUX.2 klein 4B (het goedkoopste model) via je eigen Worker: ongeveer 26 van de
  10.000 gratis Cloudflare-punten per beeld. In de app stel je een maximum per dag in (standaard 150).
- De verteller beschrijft elk moment voor een beeld en kiest zelf wanneer het de moeite waard is: de opening,
  een nieuwe plek, een belangrijk personage of een actiemoment (gooi je een vuurbal, dan zie je die vuurbal).
  Met de beeldknop bovenin ("Toon scène") vraag je zelf een beeld van het huidige moment.
- Weigert het filter van Cloudflare een beeld, dan probeert de app automatisch een rustige versie van hetzelfde moment.
- Bij de start maakt de app ook een portret van je held. Alle beelden staan in de galerij (via je held).
