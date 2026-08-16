#!/usr/bin/env bash
# Re-download the photographs used by the Body Work view (Exercise tab).
#
# Source: Free Exercise DB — github.com/yuhonas/free-exercise-db
# Licence: Unlicense (public domain). No attribution required; we credit it anyway.
#
# You should not need this — public/bodywork-images/ already has everything.
# It exists for two reasons:
#   1. If the folder is ever lost, this rebuilds it exactly.
#   2. To ADD a photo, put its folder name in EXTRA below and re-run, then map
#      it in the PHOTOS object inside src/data/bodywork.js.
#      Browse the full 873-exercise library at:
#      https://yuhonas.github.io/free-exercise-db/
#      The folder name is the exercise name with spaces as underscores.
#
# Requires: curl, and ImageMagick or python3+Pillow for the resize step.

set -euo pipefail
BASE="https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises"
OUT="public/bodywork-images"
mkdir -p "$OUT"

SETS=(
  Kneeling_Hip_Flexor
  Butt_Lift_Bridge
  Piriformis-SMR
  Iliotibial_Tract-SMR
  Single_Leg_Glute_Bridge
  Foot-SMR
  Calves-SMR
  Hamstring-SMR
  External_Rotation_with_Band
  Latissimus_Dorsi-SMR
  Rhomboids-SMR
  Cat_Stretch
  Quadriceps-SMR
  Seated_Floor_Hamstring_Stretch
  Leg-Up_Hamstring_Stretch
  Calf_Stretch_Hands_Against_Wall
  Standing_Soleus_And_Achilles_Stretch
  Bodyweight_Squat
  Side-Lying_Floor_Stretch
  Pelvic_Tilt_Into_Bridge
  Calf_Raise_On_A_Dumbbell
  Balance_Board
  Isometric_Neck_Exercise_-_Front_And_Back
  Side_Wrist_Pull
  Stomach_Vacuum
  Seated_Hamstring
  Scapular_Pull-Up
)

EXTRA=()

for s in "${SETS[@]}" ${EXTRA[@]+"${EXTRA[@]}"}; do
  for i in 0 1; do
    dest="$OUT/${s}_${i}.jpg"
    if [ -f "$dest" ]; then echo "have  $dest"; continue; fi
    if curl -fsS --max-time 45 -o "$dest" "$BASE/$s/$i.jpg"; then
      echo "got   $dest"
    else
      echo "MISS  $s/$i.jpg — check the folder name against the library" >&2
      rm -f "$dest"
    fi
  done
done

# Shrink to roughly 640px and strip metadata, so the whole folder stays
# around a megabyte and the page loads instantly on a phone.
if command -v magick >/dev/null 2>&1; then
  magick mogrify -resize '640x640>' -quality 72 -strip "$OUT"/*.jpg
  echo "resized with ImageMagick"
elif command -v mogrify >/dev/null 2>&1; then
  mogrify -resize '640x640>' -quality 72 -strip "$OUT"/*.jpg
  echo "resized with ImageMagick"
elif python3 -c "import PIL" 2>/dev/null; then
  python3 - "$OUT" <<'EOF'
import sys, glob
from PIL import Image
for p in glob.glob(sys.argv[1] + '/*.jpg'):
    im = Image.open(p).convert('RGB')
    im.thumbnail((640, 640), Image.LANCZOS)
    im.save(p, 'JPEG', quality=72, optimize=True, progressive=True)
print('resized with Pillow')
EOF
else
  echo "No resizer found — images are full size. Install ImageMagick or Pillow." >&2
fi

echo
echo "Done. $(ls -1 "$OUT" | wc -l) files, $(du -sh "$OUT" | cut -f1)."
