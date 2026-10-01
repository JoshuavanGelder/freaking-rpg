#!/usr/bin/env bash
# Maakt een Claude-token (claude setup-token) en zet het als secret CLAUDE_CODE_OAUTH_TOKEN,
# zonder dat je iets uit de terminal hoeft te kopiëren of erin hoeft te plakken. Gemaakt voor een
# GitHub Codespace op je telefoon.
#
#   bash scripts/claude-token.sh
#
# Zo werkt het:
#   1. De editor opent "claude-inloggen.md" met één grote link: tik erop en log in bij Claude.
#   2. Claude toont daarna een code. Kopieer die en plak hem in "plak-hier-de-code.txt" (opent ook).
#      Kom je op een kapotte localhost-pagina? Plak dan de hele link uit de adresbalk in dat bestand.
#   3. Het script ziet dat vanzelf, maakt het token, test het en zet het als secret.
#
# Standaard in freaking-rpg én freaking-dj (hetzelfde token mag in beide). Ander lijstje:
#   REPOS="JoshuavanGelder/freaking-rpg" bash scripts/claude-token.sh
# Na een jaar verloopt het token: draai dit script dan opnieuw.
set -uo pipefail
REPOS="${REPOS:-JoshuavanGelder/freaking-rpg JoshuavanGelder/freaking-dj}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LINK_FILE="$ROOT/claude-inloggen.md"
CODE_FILE="$ROOT/plak-hier-de-code.txt"
TOKEN_FILE="$(mktemp)"
chmod 600 "$TOKEN_FILE"
trap 'rm -f "$TOKEN_FILE" "$LINK_FILE" "$CODE_FILE"' EXIT

if ! command -v claude >/dev/null 2>&1; then
  echo "Claude Code installeren…"
  npm install -g @anthropic-ai/claude-code --no-audit --no-fund >/dev/null 2>&1 || {
    echo "Installeren mislukt."
    exit 1
  }
fi

: > "$CODE_FILE"
cat > "$LINK_FILE" <<'TXT'
# Claude inloggen

Even geduld, de link komt zo…
TXT

open_in_editor() {
  if command -v code >/dev/null 2>&1; then
    code "$@" >/dev/null 2>&1 || true
  fi
}

echo
echo "== Stap 1: inloggen bij Claude =="
echo "In de editor gaat 'claude-inloggen.md' open. Tik op de link en log in."
echo "Daarna zie je bij Claude een code: kopieer die en plak hem in 'plak-hier-de-code.txt'."
echo "(Kom je op een localhost-pagina? Plak dan de hele link uit de adresbalk in dat bestand.)"
echo "Staan de bestanden niet open? Je vindt ze links in de bestandenlijst."
echo

# claude setup-token draait in een eigen (brede) terminal, zodat de link niet afbreekt.
# BROWSER=true: de Codespace opent zelf geen link die naar localhost terugspringt.
python3 - "$LINK_FILE" "$CODE_FILE" "$TOKEN_FILE" <<'PY'
import fcntl, os, pty, re, select, struct, subprocess, sys, termios, time

link_file, code_file, token_file = sys.argv[1:4]
env = dict(os.environ)
env.pop('CLAUDE_CODE_OAUTH_TOKEN', None)
env['BROWSER'] = 'true'

pid, fd = pty.fork()
if pid == 0:
    os.execvpe('claude', ['claude', 'setup-token'], env)
fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack('HHHH', 50, 4000, 0, 0))

def clean(t):
    t = re.sub(r'\x1b\][^\x07]*(\x07|\x1b\\)', '', t)
    t = re.sub(r'\x1b\[[0-9;?]*[ -/]*[@-~]', '', t)
    return t

buf = ''
url = None
sent = False
scan_from = 0  # na een mislukte poging alleen nieuwe uitvoer bekijken
token = None
started = time.time()
alive = True
while alive and time.time() - started < 20 * 60:
    r, _, _ = select.select([fd], [], [], 0.5)
    if r:
        try:
            data = os.read(fd, 65536)
        except OSError:
            data = b''
        if not data:
            alive = False
        buf += data.decode('utf-8', 'ignore')
        text = clean(buf)[scan_from:]
        if sent and re.search(r'OAuth error|Press Enter to retry', text):
            msg = re.search(r'OAuth error[^\n\r]*', text)
            print(f"Dat lukte niet ({msg.group(0) if msg else 'onbekende fout'}).", flush=True)
            print('Er komt een nieuwe link in claude-inloggen.md: log opnieuw in en plak de nieuwe code.', flush=True)
            scan_from = len(clean(buf))
            url, sent = None, False
            open(code_file, 'w').close()
            os.write(fd, b'\r')
            continue
        if not url:
            m = re.search(r'https://claude\.(?:com|ai)/\S*oauth/authorize\?\S+', text)
            if m:
                url = m.group(0)
                with open(link_file, 'w') as f:
                    f.write('# Claude inloggen\n\n')
                    f.write(f'**[Tik hier om in te loggen bij Claude]({url})**\n\n')
                    f.write('1. Log in en tik op **Authorize**.\n')
                    f.write('2. Je ziet een code. Kopieer die helemaal.\n')
                    f.write('3. Plak hem in **plak-hier-de-code.txt** (het andere tabblad).\n\n')
                    f.write('Kom je op een kapotte *localhost*-pagina? Kopieer dan de hele link uit de adresbalk '
                            'en plak die in plak-hier-de-code.txt.\n\n')
                    f.write('Het script in de terminal gaat daarna vanzelf verder.\n')
                subprocess.run(['bash', '-c', 'command -v code >/dev/null && code "$1" "$2"', '_', link_file, code_file],
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                print('Link staat klaar in claude-inloggen.md. Wachten op de code…', flush=True)
        m = re.search(r'sk-ant-oat01-[A-Za-z0-9_-]{20,}', text.replace('\n', '').replace(' ', ''))
        if m:
            token = m.group(0)
    if url and not sent:
        try:
            pasted = open(code_file).read().strip()
        except OSError:
            pasted = ''
        if pasted:
            sent = True
            if re.match(r'https?://(localhost|127\.0\.0\.1)[:/]', pasted):
                print('Localhost-link ontvangen, inloggen afronden…', flush=True)
                subprocess.run(['curl', '-s', '-o', '/dev/null', pasted.split()[0]])
            else:
                print('Code ontvangen, token maken…', flush=True)
                os.write(fd, pasted.split()[0].encode())
                time.sleep(0.4)
                os.write(fd, b'\r')
    if token and time.time() - started > 1:
        # Even laten uitlezen zodat het hele token binnen is.
        end = time.time() + 2
        while time.time() < end:
            r, _, _ = select.select([fd], [], [], 0.3)
            if r:
                try:
                    buf += os.read(fd, 65536).decode('utf-8', 'ignore')
                except OSError:
                    break
        m = re.search(r'sk-ant-oat01-[A-Za-z0-9_-]{20,}', clean(buf).replace('\n', '').replace(' ', ''))
        token = m.group(0) if m else token
        break

try:
    os.kill(pid, 9)
except OSError:
    pass
if not token:
    tail = clean(buf).strip().splitlines()[-5:]
    print('Geen token gekregen. Laatste melding van Claude:', flush=True)
    for line in tail:
        print('  ' + line[:200], flush=True)
    sys.exit(1)
with open(token_file, 'w') as f:
    f.write(token)
PY
[ $? -eq 0 ] || { echo; echo "Inloggen is niet gelukt. Draai het script opnieuw."; exit 1; }

TOKEN="$(cat "$TOKEN_FILE")"
echo
echo "Token gemaakt: ${TOKEN:0:16}…${TOKEN: -4} (${#TOKEN} tekens)"

echo
echo "== Stap 2: token testen (één heel klein verzoek aan Claude) =="
if CLAUDE_CODE_OAUTH_TOKEN="$TOKEN" claude -p "Antwoord alleen met: ok" --max-turns 1 --tools "" >/dev/null 2>&1; then
  echo "Het token werkt."
else
  echo "Claude accepteert dit token niet. Draai het script opnieuw."
  exit 1
fi

echo
echo "== Stap 3: secret in GitHub zetten =="
set_all() {
  local ok=0
  for r in $REPOS; do
    if printf '%s' "$TOKEN" | gh secret set CLAUDE_CODE_OAUTH_TOKEN --repo "$r" >/dev/null 2>&1; then
      echo "  ✓ $r"
    else
      ok=1
    fi
  done
  return $ok
}
if ! set_all; then
  echo "GitHub vraagt eenmalig om in te loggen. Er verschijnt hieronder een code van 8 tekens:"
  echo "open github.com/login/device, typ die code over en keur het goed."
  unset GITHUB_TOKEN GH_TOKEN
  BROWSER=true gh auth login --hostname github.com --git-protocol https --web --scopes repo || exit 1
  set_all || { echo "Het secret kon niet overal gezet worden."; exit 1; }
fi
echo
echo "Klaar: CLAUDE_CODE_OAUTH_TOKEN staat in: $REPOS"
echo "Tik in de app op 'Opnieuw proberen'. Deze codespace mag je daarna verwijderen (github.com/codespaces)."
