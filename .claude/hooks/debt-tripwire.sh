#!/bin/bash
# PostToolUse tripwire: when a file with documented downstream coupling is edited,
# run the check that its dependents rely on, and block with the failure fed back
# to the model so the ripple gets fixed in the same turn.
#
# Tripwires:
#   src/constants/defaults.ts  -> golden projection snapshot (calculations.test.ts)
#      The file's own header: "Changing any number here now has to be acknowledged
#      by updating the snapshot."
#   src/i18n/translations.ts   -> tsc --noEmit
#      The _zhHkCoversEveryLabel parity gate is compile-time only, and no script in
#      package.json runs tsc — without this hook it never fires.
#   src/types/index.ts         -> tsc --noEmit (shared shapes; same reasoning)

set -u
REPO="$(cd "$(dirname "$0")/../.." && pwd)"

FILE_PATH=$(jq -r '.tool_input.file_path // .tool_response.filePath // empty' 2>/dev/null)
[ -z "$FILE_PATH" ] && exit 0

block() { # $1 = reason text
  jq -n --arg r "$1" '{"decision":"block","reason":$r}'
  exit 0
}

case "$FILE_PATH" in
  *"src/constants/defaults.ts")
    OUT=$(cd "$REPO" && npx vitest run src/utils/calculations.test.ts 2>&1)
    if [ $? -ne 0 ]; then
      TAIL=$(printf '%s' "$OUT" | tail -30)
      block "You changed src/constants/defaults.ts, and the golden projection snapshot in src/utils/calculations.test.ts is now red. Per the header comment in defaults.ts, a defaults change must be acknowledged by updating the snapshot — re-derive the expected numbers (do not just paste the new actuals blindly; check the invariant cashReserve + bondAlloc < budget still holds) and update the test. Failure output:
$TAIL"
    fi
    ;;
  *"src/i18n/translations.ts"|*"src/types/index.ts")
    OUT=$(cd "$REPO" && npx tsc --noEmit 2>&1)
    if [ $? -ne 0 ]; then
      TAIL=$(printf '%s' "$OUT" | tail -30)
      block "You changed $(basename "$FILE_PATH") and tsc --noEmit now fails. If the error is at _zhHkCoversEveryLabel in translations.ts, a key was added/renamed in 'en' without updating 'zh_hk' (zh_cn derives automatically) — bring zh_hk to parity. Otherwise fix the listed dependents. tsc output:
$TAIL"
    fi
    ;;
esac
exit 0
