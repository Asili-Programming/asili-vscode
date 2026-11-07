#!/usr/bin/env bash
# Builds pata-lsp from an Asili checkout and puts it in bin/, where the extension looks for a
# bundled server first. ASILI_DIR names the checkout (default: ../Asili, a sibling clone of
# https://github.com/Asili-Programming/Asili).
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
asili="${ASILI_DIR:-$here/../Asili}"

[ -f "$asili/pata/lsp/Cargo.toml" ] || {
  echo "Asili checkout not found at $asili; clone https://github.com/Asili-Programming/Asili" >&2
  echo "there or set ASILI_DIR." >&2
  exit 1
}

cargo build --release --manifest-path "$asili/Cargo.toml" -p pata-lsp
target="$(cargo metadata --format-version 1 --no-deps --manifest-path "$asili/Cargo.toml" \
  | sed -n 's/.*"target_directory":"\([^"]*\)".*/\1/p')"
mkdir -p "$here/bin"
install -m 755 "$target/release/pata-lsp" "$here/bin/pata-lsp"
echo "bin/pata-lsp built from $asili"
