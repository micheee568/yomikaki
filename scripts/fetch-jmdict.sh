#!/usr/bin/env bash
# Downloads the common-words JMdict (jmdict-simplified) into data/jmdict/.
# Dictionary data: JMdict/EDRDG, CC BY-SA 4.0 (https://www.edrdg.org/edrdg/licence.html).
set -euo pipefail

VERSION="3.6.2%2B20261026175559"
FILE="jmdict-eng-common-3.6.2%2B20261026175559.json.tgz"
DEST="$(cd "$(dirname "$0")/.." && pwd)/data/jmdict"

mkdir -p "$DEST"
if ls "$DEST"/jmdict-eng*.json >/dev/null 2>&1; then
  echo "JMdict already present in $DEST"
  exit 0
fi

curl -fsSL -o "$DEST/jmdict.tgz" "https://github.com/scriptin/jmdict-simplified/releases/download/$VERSION/$FILE"
tar -xzf "$DEST/jmdict.tgz" -C "$DEST"
rm "$DEST/jmdict.tgz"
echo "Downloaded JMdict to $DEST"
