#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
asili="${ASILI_DIR:-$here/../Asili}"
target="${ASILI_TARGET:-}"
platform="${ASILI_VSCODE_PLATFORM:-$(node -p 'process.platform + "-" + process.arch')}"

[ -f "$asili/pata/lsp/Cargo.toml" ] || {
  echo "Asili checkout not found at $asili; clone https://github.com/Asili-Programming/Asili" >&2
  echo "there or set ASILI_DIR." >&2
  exit 1
}

target_args=()
release_dir="release"
if [ -n "$target" ]; then
  target_args=(--target "$target")
  release_dir="$target/release"
fi

cargo build --release "${target_args[@]}" --manifest-path "$asili/Cargo.toml" -p pata-lsp -p pata-dap
target_dir="$(cargo metadata --format-version 1 --no-deps --manifest-path "$asili/Cargo.toml" \
  | sed -n 's/.*"target_directory":"\([^"]*\)".*/\1/p')"
destination="$here/bin/$platform"
suffix=""
if [[ "$target" == *windows* ]] || [[ -z "$target" && "$(uname -s)" == "MINGW"* ]]; then
  suffix=".exe"
fi
mkdir -p "$destination"
install -m 755 "$target_dir/$release_dir/pata-lsp$suffix" "$destination/pata-lsp$suffix"
install -m 755 "$target_dir/$release_dir/pata-dap$suffix" "$destination/pata-dap$suffix"
echo "Built pata-lsp and pata-dap for $platform from $asili"
