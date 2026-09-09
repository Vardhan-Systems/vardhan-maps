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

# Robust download: retry transient network errors (connection resets etc.), which
# the upstream OSM data servers are prone to. Far more resilient than Planetiler's
# single-shot HTTP client.
dl() { curl -fSL --retry 6 --retry-delay 5 --retry-all-errors --connect-timeout 30 -o "$1" "$2"; }

mkdir -p "$WORKDIR"
cd "$WORKDIR"

echo "[$(date -u +%H:%M:%S)] Downloading India OSM extract (Geofabrik, ~1.6 GB)…"
dl india.osm.pbf "$INDIA_URL"

echo "[$(date -u +%H:%M:%S)] Clipping to Telangana + Andhra Pradesh bbox…"
osmium extract -b "$BBOX" india.osm.pbf -o tgap.osm.pbf --overwrite -s complete_ways
rm -f india.osm.pbf   # reclaim disk before the tile build

echo "[$(date -u +%H:%M:%S)] Downloading Planetiler…"
dl planetiler.jar "$PLANETILER_URL"

# Pre-fetch Planetiler's background sources with our robust downloader, into the
# dir Planetiler reads (`data/sources`), so `--download` finds them and skips its
# own flaky fetch. The water-polygons server (osmdata.openstreetmap.de) is the one
# that resets connections mid-download — this is the real fix.
echo "[$(date -u +%H:%M:%S)] Pre-fetching background sources (water polygons, natural earth)…"
mkdir -p data/sources
dl data/sources/water-polygons-split-3857.zip \
  "https://osmdata.openstreetmap.de/download/water-polygons-split-3857.zip" || true
dl data/sources/natural_earth_vector.sqlite.zip \
  "https://naciscdn.org/naturalearth/packages/natural_earth_vector.sqlite.zip" || true

echo "[$(date -u +%H:%M:%S)] Building vector tiles (OpenMapTiles schema)…"
# Retry the build a few times: any source Planetiler still fetches itself can hit a
# transient reset; a retry resumes from the cached sources in data/sources.
attempt=0
until [ "$attempt" -ge 3 ]; do
  if java -Xmx6g -jar planetiler.jar \
      --osm-path=tgap.osm.pbf \
      --bounds="$BBOX" \
      --download --force \
      --output="$OUT"; then
    break
  fi
  attempt=$((attempt + 1))
  echo "[$(date -u +%H:%M:%S)] Planetiler attempt $attempt failed; retrying in 20s…"
  sleep 20
done

if [ ! -f "$OUT" ]; then
  echo "Tile build failed after retries" >&2
  exit 1
fi
echo "[$(date -u +%H:%M:%S)] Done → $WORKDIR/$OUT ($(ls -lh "$OUT" | awk '{print $5}'))"
