"""Local-only video inspection. No source images are copied to public/.

python scripts/reference-contact-sheet.py VIDEO --ffmpeg PATH [--start 0 --end 20 --step .25]
Requires Pillow. Output and exact timestamps go to .local/reference-analysis/.
"""
import argparse
import io
import json
import re
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw

p = argparse.ArgumentParser()
p.add_argument('video', type=Path)
p.add_argument('--ffmpeg', required=True)
p.add_argument('--start', type=float, default=0)
p.add_argument('--end', type=float)
p.add_argument('--step', type=float)
args = p.parse_args()
metadata = subprocess.run([args.ffmpeg, '-hide_banner', '-i', str(args.video)], capture_output=True).stderr.decode(errors='replace')
m = re.search(r'Duration: (\d+):(\d+):([\d.]+)', metadata)
if not m:
    raise RuntimeError(metadata)
duration = int(m[1])*3600 + int(m[2])*60 + float(m[3])
end = min(args.end if args.end is not None else duration-.5, duration-.5)
step = args.step or max(.1, (end-args.start)/11)
times = []
t = args.start
while t <= end+.0001:
    times.append(round(t, 3))
    t += step
out = Path('.local/reference-analysis') / args.video.stem
out.mkdir(parents=True, exist_ok=True)
for page in range((len(times)+11)//12):
    selected = times[page*12:(page+1)*12]
    sheet = Image.new('RGB', (1280, 4*266), '#172026')
    draw = ImageDraw.Draw(sheet)
    for i, second in enumerate(selected):
        result = subprocess.run([args.ffmpeg, '-v', 'error', '-ss', str(second), '-i', str(args.video), '-frames:v', '1', '-vf', 'scale=640:-1', '-f', 'image2pipe', '-vcodec', 'mjpeg', '-'], capture_output=True)
        if result.returncode or not result.stdout:
            draw.text(((i%3)*426+8, (i//3)*266+5), f'{second:.3f}s: no decoded frame', fill='white')
            continue
        frame = Image.open(io.BytesIO(result.stdout)).convert('RGB')
        frame.save(out / f'{second:09.3f}.jpg')
        frame.thumbnail((426, 240))
        x, y = (i%3)*426, (i//3)*266
        sheet.paste(frame, (x+(426-frame.width)//2, y+23))
        draw.text((x+8, y+5), f'{args.video.stem} / {second:.3f}s', fill='white')
    name = out / f'sheet-{args.start:g}-{step:.3f}-{page}.jpg'
    sheet.save(name, quality=90)
    print(name)
(out / f'index-{args.start:g}-{step:.3f}.json').write_text(json.dumps({'source':str(args.video), 'duration':duration, 'times':times}, indent=2))
print(f'Duration: {duration:.2f}s')
