#!/usr/bin/env bash
# Build the default self-hosted vector basemap tiles (Telangana + Andhra Pradesh)
# from CURRENT OpenStreetMap data, as a `.pmtiles` (OpenMapTiles schema).
#
# Pipeline: Geofabrik India extract → osmium clip to the TG+AP bbox (one source =
# no duplicate border nodes) → Planetiler → beyond-tgap.pmtiles.
#
# Requires: java 21+, osmium-tool, curl. Usage: scripts/build-tiles.sh [workdir]
set -euo pipefail

WORKDIR="${1:-./tile-build}"
BBOX="76.6,12.5,85.0,20.0"          # Telangana + Andhra Pradesh
OUT="beyond-tgap.pmtiles"           # the filename vardhan-maps' default URL points at
INDIA_URL="https://download.geofabrik.de/asia/india-latest.osm.pbf"
PLANETILER_URL="https://github.com/onthegomap/planetiler/releases/latest/download/planetiler.jar"

mkdir -p "$WORKDIR"
cd "$WORKDIR"

echo "[$(date -u +%H:%M:%S)] Downloading India OSM extract (Geofabrik, ~1.6 GB)…"
curl -fsSL -o india.osm.pbf "$INDIA_URL"

echo "[$(date -u +%H:%M:%S)] Clipping to Telangana + Andhra Pradesh bbox…"
osmium extract -b "$BBOX" india.osm.pbf -o tgap.osm.pbf --overwrite -s complete_ways
rm -f india.osm.pbf   # reclaim disk before the tile build

echo "[$(date -u +%H:%M:%S)] Downloading Planetiler…"
curl -fsSL -o planetiler.jar "$PLANETILER_URL"

echo "[$(date -u +%H:%M:%S)] Building vector tiles (OpenMapTiles schema)…"
java -Xmx6g -jar planetiler.jar \
  --osm-path=tgap.osm.pbf \
  --bounds="$BBOX" \
  --download --force \
  --output="$OUT"

echo "[$(date -u +%H:%M:%S)] Done → $WORKDIR/$OUT ($(ls -lh "$OUT" | awk '{print $5}'))"
