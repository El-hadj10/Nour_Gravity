#!/usr/bin/env bash
# scripts/smoke-jarvis.sh
# Smoke test leger du bus J.A.R.V.I.S.
# Boot du serveur en arriere-plan sur un port dedie, verification des routes,
# puis arret propre.

set -u

PORT="${PORT:-4321}"
BASE="http://127.0.0.1:${PORT}"
JARVIS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="${JARVIS_DIR}/.smoke-logs"
SERVER_LOG="${LOG_DIR}/server.log"

mkdir -p "$LOG_DIR"
PASS=0
FAIL=0

color() { printf "\033[%sm%s\033[0m" "$1" "$2"; }
ok()  { PASS=$((PASS+1)); printf "  %s %s\n" "$(color '1;32' '[OK]')" "$1"; }
ko()  { FAIL=$((FAIL+1)); printf "  %s %s\n" "$(color '1;31' '[KO]')" "$1"; }
head(){ printf "\n%s %s\n" "$(color '1;36' '[section]')" "$1"; }

cleanup() {
    if [ -n "${SERVER_PID:-}" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
        kill "$SERVER_PID" 2>/dev/null || true
        wait "$SERVER_PID" 2>/dev/null || true
    fi
}
trap cleanup EXIT INT TERM

# --- 1) BOOT ---
head "boot du serveur sur :${PORT}"
( cd "$JARVIS_DIR" && PORT="$PORT" node server.js > "$SERVER_LOG" 2>&1 ) &
SERVER_PID=$!

for i in $(seq 1 50); do
    if curl -s -o /dev/null -w "%{http_code}" "${BASE}/api/jarvis/health" 2>/dev/null | grep -q '^200$'; then
        ok "serveur pret (pid=$SERVER_PID)"
        break
    fi
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
        ko "le serveur a crashe pendant le boot"
        cat "$SERVER_LOG"; exit 1
    fi
    sleep 0.16
done
if ! curl -s -o /dev/null -w "%{http_code}" "${BASE}/api/jarvis/health" 2>/dev/null | grep -q '^200$'; then
    ko "timeout boot du serveur"
    cat "$SERVER_LOG"; exit 1
fi

assert_field() {
    local label="$1" expected="$2" key="$3" body="$4"
    local actual
    actual=$(printf '%s' "$body" | python3 -c "import sys,json
try:
    d=json.loads(sys.stdin.read())
    print(d.get('$key',''))
except Exception: print('PARSE_ERROR')" 2>/dev/null)
    if [ "$actual" = "$expected" ]; then
        ok "$label  ->  $key=$expected"
    else
        ko "$label  ->  attendu $key='$expected', recu '$actual'"
    fi
}

# --- 2) /api/jarvis/health ---
head "GET /api/jarvis/health"
RESP=$(curl -s "${BASE}/api/jarvis/health")
echo "  raw : ${RESP:0:120}$( [ ${#RESP} -gt 120 ] && echo '...' )"
assert_field "sante du moteur"      "True" "ok"               "$RESP"
assert_field "agents enregistres"   "6"    "agents_registered" "$RESP"

# --- 3) /api/jarvis/agents ---
head "GET /api/jarvis/agents"
RESP=$(curl -s "${BASE}/api/jarvis/agents")
COUNT=$(printf '%s' "$RESP" | python3 -c "import sys,json;print(len(json.loads(sys.stdin.read())['agents']))")
if [ "$COUNT" -ge 6 ]; then
    ok "$COUNT agents exposes (>= 6 attendu)"
else
    ko "seulement $COUNT agents exposes"
fi
COUNT_ALLOWLIST=$(printf '%s' "$RESP" | python3 -c "import sys,json;print(len(json.loads(sys.stdin.read())['allowlist']))")
ok "allowlist du basher = $COUNT_ALLOWLIST commandes (lecture seule)"

# --- 4) file_picker ---
head "POST /api/jarvis/command  (file_picker)"
RESP=$(curl -s -X POST "${BASE}/api/jarvis/command" \
    -H "Content-Type: application/json" \
    -d '{"command":"trouve le fichier jarvis","source":"smoke"}')
assert_field "agent cible"          "file_picker" "agent" "$RESP"
assert_field "statut"               "True"        "ok"    "$RESP"
N=$(printf '%s' "$RESP" | python3 -c "import sys,json
try:
    d=json.loads(sys.stdin.read())
    print(len(d.get('data',{}).get('matches',[])))
except Exception: print(0)")
ok "file_picker a renvoye $N match(s)"
INTENT_AGENT=$(printf '%s' "$RESP" | python3 -c "import sys,json
try:
    d=json.loads(sys.stdin.read())
    print((d.get('intent') or {}).get('agent',''))
except Exception: print('')")
if [ "$INTENT_AGENT" = "file_picker" ]; then
    ok "intent.agent = file_picker"
else
    ko "intent.agent = '$INTENT_AGENT' (attendu 'file_picker')"
fi

# --- 5) basher OK (allowlist) ---
head "POST /api/jarvis/command  (basher OK)"
RESP=$(curl -s -X POST "${BASE}/api/jarvis/command" \
    -H "Content-Type: application/json" \
    -d '{"command":"lance ls -la src","source":"smoke"}')
assert_field "agent cible"  "basher" "agent" "$RESP"
assert_field "statut"       "True"   "ok"    "$RESP"
STDOUT_LEN=$(printf '%s' "$RESP" | python3 -c "import sys,json
try:
    d=json.loads(sys.stdin.read())
    print(len(d.get('data',{}).get('stdout','') or ''))
except Exception: print(0)")
if [ "$STDOUT_LEN" -gt 30 ]; then
    ok "stdout du ls ($STDOUT_LEN caracteres)"
else
    ko "stdout trop court ($STDOUT_LEN caracteres)"
fi

# --- 6) basher REFUSE (hors allowlist) ---
head "POST /api/jarvis/command  (basher refused)"
RESP=$(curl -s -X POST "${BASE}/api/jarvis/command" \
    -H "Content-Type: application/json" \
    -d '{"command":"lance rm -rf /","source":"smoke"}')
assert_field "agent cible"      "basher"     "agent" "$RESP"
NOTE=$(printf '%s' "$RESP" | python3 -c "import sys,json
try:
    d=json.loads(sys.stdin.read())
    print((d.get('notes') or [''])[0])
except Exception: print('')")
if echo "$NOTE" | grep -qi "refus"; then
    ok "note de refus claire : \"$NOTE\""
else
    ko "note de refus absente : \"$NOTE\""
fi

# --- 7) code_searcher ---
head "POST /api/jarvis/command  (code_searcher)"
RESP=$(curl -s -X POST "${BASE}/api/jarvis/command" \
    -H "Content-Type: application/json" \
    -d '{"command":"cherche le pattern NourNeural","source":"smoke"}')
assert_field "agent cible" "code_searcher" "agent" "$RESP"
assert_field "statut"      "True"          "ok"    "$RESP"
N=$(printf '%s' "$RESP" | python3 -c "import sys,json
try:
    d=json.loads(sys.stdin.read())
    print(len(d.get('data',{}).get('occurrences',[])))
except Exception: print(0)")
if [ "$N" -ge 1 ]; then
    ok "code_searcher a trouve $N occurrence(s) pour NourNeural"
else
    ko "aucune occurrence trouvee pour NourNeural"
fi

# --- 8) orchestrator fallback ---
head "POST /api/jarvis/command  (orchestrator fallback)"
RESP=$(curl -s -X POST "${BASE}/api/jarvis/command" \
    -H "Content-Type: application/json" \
    -d '{"command":"ou est defini quelque chose dans le projet","source":"smoke"}')
assert_field "agent cible" "orchestrator" "agent" "$RESP"
STEPS=$(printf '%s' "$RESP" | python3 -c "import sys,json
try:
    d=json.loads(sys.stdin.read())
    print(len(d.get('data',{}).get('steps',[])))
except Exception: print(0)")
if [ "$STEPS" -ge 1 ]; then
    ok "orchestrator a planifie $STEPS etape(s)"
else
    ko "orchestrator n'a rien planifie"
fi

# --- 9) delegator (any of the known modes accepted) ---
head "POST /api/jarvis/command  (delegator)"
# Use the canonical delegator prefix that the parser recognizes.
RESP=$(curl -s -X POST "${BASE}/api/jarvis/command" \
    -H "Content-Type: application/json" \
    -d '{"command":"plan chasseur : plan pour demarrer","source":"smoke"}')
AGENT=$(printf '%s' "$RESP" | python3 -c "import sys,json
try:
    d=json.loads(sys.stdin.read())
    print(d.get('agent',''))
except Exception: print('')")
MODE=$(printf '%s' "$RESP" | python3 -c "import sys,json
try:
    d=json.loads(sys.stdin.read())
    print(d.get('mode',''))
except Exception: print('')")
if [ "$AGENT" = "delegator" ]; then
    ok "delegator route atteinte (mode=$MODE)"
else
    ko "delegator non routee : agent='$AGENT' mode='$MODE'"
fi
case "$MODE" in
    sub-process|fallback|sub-process-unparsed|in-process) ok "delegator mode acceptable : '$MODE'";;
    sub-process-error)                                    ko "delegator en erreur (exit non nul)";;
    *)                                                    ko "delegator mode inattendu : '$MODE'";;
esac

# --- 10) INPUT VIDE -> 400 ---
head "POST /api/jarvis/command  (input vide -> doit 400)"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/api/jarvis/command" \
    -H "Content-Type: application/json" \
    -d '{"command":""}')
if [ "$CODE" = "400" ]; then
    ok "input vide -> HTTP 400"
else
    ko "input vide -> HTTP $CODE (attendu 400)"
fi

# --- BILAN ---
echo ""
printf "%s %d checks passes, %d en echec\n" "$(color '1;36' '[BILAN]')" "$PASS" "$FAIL"
if [ "$FAIL" -gt 0 ]; then
    echo "  logs serveur : $SERVER_LOG"
    exit 1
fi
exit 0
