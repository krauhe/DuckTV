import os
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

workspace = Path(r"C:\Dropbox\Kristian\ande tv")
sys.path.insert(0, str((workspace / ".local" / "qr-tools").resolve()))
import zxingcpp

# A4 at 300 DPI
W = 2480
H = 3508

FONT_BOLD = r"C:\Windows\Fonts\segoeuib.ttf"
FONT_REGULAR = r"C:\Windows\Fonts\segoeui.ttf"
FONT_SEMIBOLD = r"C:\Windows\Fonts\seguisb.ttf"

BRAND_GREEN = "#03522d"       # Dark forest duck green from app

def get_font(path, size):
    return ImageFont.truetype(path, size)

def round_image(im, radius):
    mask = Image.new('L', im.size, 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle((0, 0, im.width, im.height), radius=radius, fill=255)
    out = Image.new('RGBA', im.size, (255, 255, 255, 0))
    out.paste(im, (0, 0), mask)
    return out

def build_sign():
    photo_path = workspace / "docs" / "images" / "vores-aender-foto.jpg"
    output_png = workspace / "skilt-a4-print.png"
    output_pdf = workspace / "skilt-a4-print.pdf"
    
    print(f"Building clean sign without names under photo...")
    canvas = Image.new('RGB', (W, H), "#ffffff")
    draw = ImageDraw.Draw(canvas)
    
    # 1. Classic double border in dark forest green (#03522d)
    draw.rectangle((48, 48, W - 48, H - 48), outline=BRAND_GREEN, width=10)
    draw.rectangle((68, 68, W - 68, H - 68), outline="#b5d4b1", width=2)
    draw.rectangle((76, 76, W - 76, H - 76), outline=BRAND_GREEN, width=3)

    # 2. Header: Logo lockup exactly as in the program
    logo_img = Image.open(workspace / "public" / "gistrup-ande-tv.png").convert("RGBA")
    logo_h = 220
    logo_w = int(logo_img.width * (logo_h / logo_img.height))
    logo_scaled = logo_img.resize((logo_w, logo_h), Image.Resampling.LANCZOS)
    
    header_x = 130
    header_y = 115
    canvas.paste(logo_scaled, (header_x, header_y), logo_scaled)
    
    font_logo = get_font(FONT_BOLD, 88)
    draw.text((header_x + logo_w + 35, header_y + 12), "Gistrup", font=font_logo, fill=BRAND_GREEN)
    draw.text((header_x + logo_w + 35, header_y + 112), "Ande TV", font=font_logo, fill=BRAND_GREEN)

    # Separator line
    draw.line((130, 375, W - 130, 375), fill=BRAND_GREEN, width=4)

    # 3. Main Title: Just the four names
    font_main = get_font(FONT_BOLD, 84)
    title_text = "Anders, Andemette, Andedorte og Andja"
    tb = draw.textbbox((0, 0), title_text, font=font_main)
    draw.text(((W - (tb[2] - tb[0])) // 2, 420), title_text, font=font_main, fill=BRAND_GREEN)

    # 4. Duck Photo Card - EXACT PHOTO: vores-aender-foto.jpg (Clean, no names under)
    photo_raw = Image.open(photo_path)
    card_x = 130
    card_y = 540
    card_w = W - 260   # 2220 px
    card_h = 1300      # 1300 px
    
    photo_scaled = photo_raw.resize((card_w, int(photo_raw.height * (card_w / photo_raw.width))), Image.Resampling.LANCZOS)
    if photo_scaled.height > card_h:
        top = int((photo_scaled.height - card_h) * 0.35)
        photo_cropped = photo_scaled.crop((0, top, card_w, top + card_h))
    else:
        photo_cropped = photo_scaled
        
    photo_rounded = round_image(photo_cropped, 28)
    
    draw.rounded_rectangle((card_x - 6, card_y - 6, card_x + card_w + 6, card_y + card_h + 6), 
                           radius=34, outline=BRAND_GREEN, width=4)
    canvas.paste(photo_rounded, (card_x, card_y), photo_rounded)

    # 5. QR Code Section with Overskrift: "Virtuelt Ande TV"
    qr_card_y = 1900
    qr_card_h = 1460
    draw.rounded_rectangle((card_x, qr_card_y, card_x + card_w, qr_card_y + qr_card_h),
                           radius=36, fill="#f7faf5", outline="#c6dfc0", width=3)
    
    # OVERSKRIFT OVER QR KODEN: "Virtuelt Ande TV"
    font_qr_head = get_font(FONT_BOLD, 98)
    qr_head_text = "Virtuelt Ande TV"
    qhb = draw.textbbox((0, 0), qr_head_text, font=font_qr_head)
    qh_w = qhb[2] - qhb[0]
    draw.text(((W - qh_w) // 2, qr_card_y + 55), qr_head_text, font=font_qr_head, fill=BRAND_GREEN)

    # Kæmpe QR Code (1020 x 1020 px, centered)
    qr_img = Image.open(workspace / "public" / "ande-tv-qr.png").convert("RGBA")
    qr_size = 1020
    qr_scaled = qr_img.resize((qr_size, qr_size), Image.Resampling.LANCZOS)
    qr_x = (W - qr_size) // 2
    qr_y = qr_card_y + 210
    
    draw.rounded_rectangle((qr_x - 24, qr_y - 24, qr_x + qr_size + 24, qr_y + qr_size + 24),
                           radius=34, fill="#ffffff", outline=BRAND_GREEN, width=6)
    canvas.paste(qr_scaled, (qr_x, qr_y), qr_scaled)

    # URL under QR code
    font_url = get_font(FONT_BOLD, 52)
    url_text = "krauhe.github.io/DuckTV"
    ub = draw.textbbox((0, 0), url_text, font=font_url)
    draw.text(((W - (ub[2] - ub[0])) // 2, qr_y + qr_size + 55), url_text, font=font_url, fill=BRAND_GREEN)

    # Save image only
    canvas.save(output_png, "PNG")
    
    res = zxingcpp.read_barcode(Image.open(output_png))
    print(f"Verified QR code decode: {res.text if res else 'FAILED'}")

if __name__ == "__main__":
    build_sign()
