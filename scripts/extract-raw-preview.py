"""Extract the largest embedded camera JPEG from NEF files without developing RAW.
Usage: python scripts/extract-raw-preview.py andereferencer/raw/_KRH3465.NEF
Outputs stay local and private by default. Requires Pillow.
"""
import argparse
import io
from pathlib import Path
from PIL import Image

parser=argparse.ArgumentParser()
parser.add_argument('sources',type=Path,nargs='+')
parser.add_argument('--out',type=Path,default=Path('.local/reference-detail'))
args=parser.parse_args();args.out.mkdir(parents=True,exist_ok=True)
for source in args.sources:
    data=source.read_bytes();start=0;largest=None
    while True:
        start=data.find(b'\xff\xd8\xff',start)
        if start<0:break
        end=data.find(b'\xff\xd9',start)
        if end>start:
            content=data[start:end+2]
            try:
                with Image.open(io.BytesIO(content)) as image:
                    image.load();size=image.size
                if largest is None or size[0]*size[1]>largest[0][0]*largest[0][1]:largest=(size,content)
            except (OSError,ValueError):pass
        start+=3
    if largest is None:raise ValueError(f'No readable embedded JPEG: {source}')
    output=args.out/f'{source.stem}-embedded.jpg';output.write_bytes(largest[1]);print(f'{output}: {largest[0][0]} x {largest[0][1]}')
