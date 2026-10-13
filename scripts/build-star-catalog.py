"""Extract naked-eye stars from a locally downloaded HYG v4.1 CSV.
Usage: python scripts/build-star-catalog.py .local/hygdata_v41.csv
Source and license are recorded in src/star-catalog.LICENSE.txt.
"""
import csv
import json
import sys
from pathlib import Path

with open(sys.argv[1], encoding='utf-8') as source:
    stars = [[float(row['ra']), float(row['dec']), float(row['mag']), float(row['ci'] or 0.65)]
             for row in csv.DictReader(source) if row['id'] != '0' and float(row['mag']) <= 5.5]
Path('src/star-catalog.ts').write_text(
    '// HYG v4.1 subset, David Nash / Astronomy Nexus, CC BY-SA 4.0.\n'
    '// See star-catalog.LICENSE.txt. Rows: J2000 RA hours, declination degrees, magnitude, B-V.\n'
    'export const STAR_CATALOG:readonly (readonly number[])[] = [\n' +
    ',\n'.join(json.dumps(row, separators=(',', ':')) for row in stars) + '\n];\n', encoding='utf-8')
print(f'{len(stars)} stars')
