# Freaking RPG

Een tekstavontuur op je telefoon met Claude als verteller. Jij kiest de wereld (fantasy, superhelden, sci-fi, horror, noir, of je eigen wereld) en de toon, maakt een held, en typt wat je doet. Claude vertelt wat er gebeurt. Dobbelstenen en eigenschappen draaien onzichtbaar mee. Claude draait via **je eigen Claude-abonnement** in GitHub Actions, net als bij Freaking DJ: geen API-key, geen kosten.

## Installeren
Open op je Android-telefoon de nieuwste [release](../../releases/latest) en tik op het `.apk`-bestand.

## Eenmalig instellen

1. **GitHub-token** — [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new):
   fine-grained, alleen repo `freaking-rpg`, rechten **Contents** en **Actions**: *Read and write*.
   Plak het in Freaking RPG → Instellingen → GitHub. (Je kunt ook je token van Freaking DJ uitbreiden met deze repo.)
2. **Claude-token** — open een Codespace op deze repo (knop *Code → Codespaces*, kan op je telefoon) en draai
   `bash scripts/claude-token.sh`. Dat maakt het token met `claude setup-token`, test het en zet het meteen als
   secret **`CLAUDE_CODE_OAUTH_TOKEN`** in deze repo (1 jaar geldig; daarna het script opnieuw draaien).
   Het secret van Freaking DJ geldt alleen voor die repo, dus dit moet hier apart.

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

## Fases
- **Fase 0 (nu):** wereld en toon kiezen, held maken, spelen met keuzes of eigen tekst, verborgen eigenschappen,
  leven, goud, level, tas en quests.
- **Fase 2:** beelden (max. 512×512, goedkoopste instelling) via Cloudflare Workers AI, ook van actiemomenten.
- **Fase 3–4:** betere samenvattingen, meerdere saves, thema per setting, afwerking.
