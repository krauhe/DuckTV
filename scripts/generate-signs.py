import os
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# Setup paths
workspace = Path(r"C:\Dropbox\Kristian\ande tv")
sys.path.insert(0, str((workspace / ".local" / "qr-tools").resolve()))

# Dimensions for A4 at 300 DPI
W = 2480
H = 3508

FONT_BOLD = r"C:\Windows\Fonts\segoeuib.ttf"
FONT_REGULAR = r"C:\Windows\Fonts\segoeui.ttf"
FONT_SEMIBOLD = r"C:\Windows\Fonts\seguisb.ttf"

BRAND_GREEN = "#03522d"       # Dark forest duck green from app
BRAND_GREEN_RGB = (3, 82, 45)
SAGE_BG = "#f4f8f2"
CARD_BG = "#ffffff"
TEXT_DARK = "#182b1f"
TEXT_MUTED = "#4a6350"
GOLD_ACCENT = "#b78631"       # Gold from app for pasta
BORDER_GREEN = "#cfe0cb"

def get_font(path, size):
    return ImageFont.truetype(path, size)

def round_image(im, radius):
    mask = Image.new('L', im.size, 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle((0, 0, im.width, im.height), radius=radius, fill=255)
    out = Image.new('RGBA', im.size, (255, 255, 255, 0))
    out.paste(im, (0, 0), mask)
    return out

def wrap_text(text, font, max_width, draw):
    lines = []
    paragraphs = text.split('\n')
    for p in paragraphs:
        if not p.strip():
            lines.append("")
            continue
        words = p.split()
        current_line = []
        for word in words:
            test_line = " ".join(current_line + [word])
            bbox = draw.textbbox((0, 0), test_line, font=font)
            if bbox[2] - bbox[0] <= max_width:
                current_line.append(word)
            else:
                if current_line:
                    lines.append(" ".join(current_line))
                    current_line = [word]
                else:
                    lines.append(word)
        if current_line:
            lines.append(" ".join(current_line))
    return lines

# ==========================================
# PROPOSAL 1: Familie & Børn (Legesyg & interaktiv)
# ==========================================
def create_proposal_1():
    print("Generating Proposal 1: Familie & Børn...")
    canvas = Image.new('RGB', (W, H), SAGE_BG)
    draw = ImageDraw.Draw(canvas)
    
    # Outer decorative border
    draw.rounded_rectangle((60, 60, W - 60, H - 60), radius=48, outline="#e0ece0", width=4)
    draw.rounded_rectangle((76, 76, W - 76, H - 76), radius=40, outline="#c7dec4", width=3)

    # 1. Header (Logo lockup exactly as in the program)
    logo_img = Image.open(workspace / "public" / "gistrup-ande-tv.png").convert("RGBA")
    logo_h = 220
    logo_w = int(logo_img.width * (logo_h / logo_img.height))
    logo_scaled = logo_img.resize((logo_w, logo_h), Image.Resampling.LANCZOS)
    
    header_x = 140
    header_y = 120
    canvas.paste(logo_scaled, (header_x, header_y), logo_scaled)
    
    font_logo = get_font(FONT_BOLD, 86)
    logo_text_x = header_x + logo_w + 36
    draw.text((logo_text_x, header_y + 10), "Gistrup", font=font_logo, fill=BRAND_GREEN)
    draw.text((logo_text_x, header_y + 105), "Ande TV", font=font_logo, fill=BRAND_GREEN)
    
    # Right pill badge in header
    font_badge = get_font(FONT_SEMIBOLD, 40)
    badge_text = "Løbeænderne i Gistrup 🦆"
    bbox = draw.textbbox((0, 0), badge_text, font=font_badge)
    bw = bbox[2] - bbox[0] + 60
    bh = 76
    bx = W - 140 - bw
    by = header_y + 60
    draw.rounded_rectangle((bx, by, bx + bw, by + bh), radius=38, fill="#e1eee0", outline="#b8d6b5", width=2)
    draw.text((bx + 30, by + 14), badge_text, font=font_badge, fill=BRAND_GREEN)

    # Header separator
    draw.line((140, 375, W - 140, 375), fill="#d6e6d3", width=3)

    # 2. Main Title
    font_title = get_font(FONT_BOLD, 82)
    draw.text((140, 420), "Mød Anders, Andemette, Andedorte og Andja!", font=font_title, fill=BRAND_GREEN)
    
    font_sub = get_font(FONT_REGULAR, 44)
    draw.text((140, 520), "– vores fire tamme løbeænder, som du lige nu kigger på i haven", font=font_sub, fill=TEXT_MUTED)

    # 3. Duck Photo Card
    photo_raw = Image.open(workspace / "andereferencer" / "2026-04-02 16.39.28-1.jpg")
    card_x = 140
    card_y = 600
    card_w = W - 280  # 2200
    card_h = 1240
    
    target_photo_h = 1100
    photo_scaled = photo_raw.resize((card_w, int(photo_raw.height * (card_w / photo_raw.width))), Image.Resampling.LANCZOS)
    if photo_scaled.height > target_photo_h:
        top = int((photo_scaled.height - target_photo_h) * 0.4)
        photo_cropped = photo_scaled.crop((0, top, card_w, top + target_photo_h))
    else:
        photo_cropped = photo_scaled
        
    photo_rounded = round_image(photo_cropped, 32)
    
    draw.rounded_rectangle((card_x - 10, card_y - 10, card_x + card_w + 10, card_y + card_h + 10), radius=42, fill="#ffffff", outline=BORDER_GREEN, width=4)
    canvas.paste(photo_rounded, (card_x, card_y), photo_rounded)
    
    # Duck names bar below photo
    bar_y = card_y + target_photo_h + 18
    font_names = get_font(FONT_SEMIBOLD, 44)
    names_text = "Anders (andrik)   ·   Andemette   ·   Andedorte   ·   Andja"
    n_bbox = draw.textbbox((0, 0), names_text, font=font_names)
    n_w = n_bbox[2] - n_bbox[0]
    draw.text((card_x + (card_w - n_w) // 2, bar_y + 12), names_text, font=font_names, fill=BRAND_GREEN)

    # 4. Text section
    text_y = 1910
    font_fun_head = get_font(FONT_BOLD, 64)
    draw.text((140, text_y), "Følg ænderne live på din telefon! 📱", font=font_fun_head, fill=BRAND_GREEN)
    
    font_body = get_font(FONT_REGULAR, 42)
    body_text = (
        "I Virtuelt Ande TV kan du se haven på din smartphone, følge flokkens små eventyr\n"
        "og kaste virtuel pasta til dem på græsset. Se hvem af ænderne der løber hurtigst!"
    )
    for i, line in enumerate(body_text.split('\n')):
        draw.text((140, text_y + 90 + i * 58), line, font=font_body, fill=TEXT_DARK)

    # 5. QR Code Card at bottom
    qr_card_x = 140
    qr_card_y = 2170
    qr_card_w = card_w
    qr_card_h = 1190
    
    draw.rounded_rectangle((qr_card_x, qr_card_y, qr_card_x + qr_card_w, qr_card_y + qr_card_h), 
                           radius=40, fill="#ffffff", outline=BRAND_GREEN, width=6)
    
    # Top banner in QR card
    draw.rounded_rectangle((qr_card_x + 6, qr_card_y + 6, qr_card_x + qr_card_w - 6, qr_card_y + 120),
                           radius=34, fill="#e8f3e5")
    font_card_head = get_font(FONT_BOLD, 48)
    head_txt = "SÅDAN GØR DU · DET VIRKER MED DET SAMME"
    h_box = draw.textbbox((0, 0), head_txt, font=font_card_head)
    draw.text((qr_card_x + (qr_card_w - (h_box[2] - h_box[0])) // 2, qr_card_y + 36), head_txt, font=font_card_head, fill=BRAND_GREEN)

    inst_x = qr_card_x + 90
    inst_y = qr_card_y + 180
    
    font_step_num = get_font(FONT_BOLD, 50)
    font_step_text = get_font(FONT_SEMIBOLD, 42)
    font_step_sub = get_font(FONT_REGULAR, 36)
    
    steps = [
        ("1", "Åbn kameraet på telefonen", "Peg kameraet mod QR-koden til højre"),
        ("2", "Tryk på det gule link", "Haven åbner direkte i din browser (gratis & uden app)"),
        ("3", "Kast pasta til ænderne! 🍝", "Tryk kort på græsset på skærmen – så kommer flokken ilende!")
    ]
    
    for i, (num, title, desc) in enumerate(steps):
        sy = inst_y + i * 190
        draw.ellipse((inst_x, sy, inst_x + 72, sy + 72), fill=BRAND_GREEN)
        num_bbox = draw.textbbox((0, 0), num, font=font_step_num)
        nw = num_bbox[2] - num_bbox[0]
        draw.text((inst_x + (72 - nw) // 2, sy + 6), num, font=font_step_num, fill="#ffffff")
        draw.text((inst_x + 95, sy + 2), title, font=font_step_text, fill=TEXT_DARK)
        draw.text((inst_x + 95, sy + 56), desc, font=font_step_sub, fill=TEXT_MUTED)

    pasta_box_y = inst_y + 3 * 190 + 30
    draw.rounded_rectangle((inst_x, pasta_box_y, inst_x + 1040, pasta_box_y + 130), radius=22, fill="#fdf8ec", outline="#e6cb85", width=3)
    font_pasta = get_font(FONT_BOLD, 38)
    draw.text((inst_x + 30, pasta_box_y + 24), "✨ Børnene elsker det:", font=font_pasta, fill=GOLD_ACCENT)
    font_pasta_sub = get_font(FONT_REGULAR, 34)
    draw.text((inst_x + 30, pasta_box_y + 72), "Prøv at trykke flere gange for at kaste en hel portion pasta!", font=font_pasta_sub, fill="#61440e")

    qr_img = Image.open(workspace / "public" / "ande-tv-qr.png").convert("RGBA")
    qr_size = 800
    qr_scaled = qr_img.resize((qr_size, qr_size), Image.Resampling.LANCZOS)
    qr_box_x = qr_card_x + qr_card_w - qr_size - 90
    qr_box_y = qr_card_y + 190
    
    draw.rounded_rectangle((qr_box_x - 16, qr_box_y - 16, qr_box_x + qr_size + 16, qr_box_y + qr_size + 16),
                           radius=26, fill="#ffffff", outline="#a7cca4", width=4)
    canvas.paste(qr_scaled, (qr_box_x, qr_box_y), qr_scaled)

    font_qr_url = get_font(FONT_BOLD, 36)
    qr_url_txt = "krauhe.github.io/DuckTV"
    u_box = draw.textbbox((0, 0), qr_url_txt, font=font_qr_url)
    uw = u_box[2] - u_box[0]
    draw.text((qr_box_x + (qr_size - uw) // 2, qr_box_y + qr_size + 36), qr_url_txt, font=font_qr_url, fill=BRAND_GREEN)
    
    font_qr_sub = get_font(FONT_REGULAR, 32)
    qr_sub_txt = "Scan med kameraet"
    s_box = draw.textbbox((0, 0), qr_sub_txt, font=font_qr_sub)
    sw = s_box[2] - s_box[0]
    draw.text((qr_box_x + (qr_size - sw) // 2, qr_box_y + qr_size + 84), qr_sub_txt, font=font_qr_sub, fill=TEXT_MUTED)

    canvas.save(workspace / "skilt-forslag-1.png", "PNG")
    canvas.save(workspace / "skilt-forslag-1.pdf", "PDF", resolution=300)
    print("Proposal 1 complete.")


# ==========================================
# PROPOSAL 2: "Det nysgerrige stop på grusvejen" (Direkte & fængende)
# ==========================================
def create_proposal_2():
    print("Generating Proposal 2: Nysgerrigt stop på grusvejen...")
    canvas = Image.new('RGB', (W, H), "#ffffff")
    draw = ImageDraw.Draw(canvas)
    
    # Outer crisp green frame
    draw.rounded_rectangle((60, 60, W - 60, H - 60), radius=36, outline=BRAND_GREEN, width=8)
    draw.rounded_rectangle((80, 80, W - 80, H - 80), radius=28, outline="#d5e8d0", width=3)

    # 1. Centered Header with Logo and Brand
    logo_img = Image.open(workspace / "public" / "gistrup-ande-tv.png").convert("RGBA")
    logo_h = 190
    logo_w = int(logo_img.width * (logo_h / logo_img.height))
    logo_scaled = logo_img.resize((logo_w, logo_h), Image.Resampling.LANCZOS)
    
    font_logo = get_font(FONT_BOLD, 78)
    # Measure text
    t_box1 = draw.textbbox((0, 0), "Gistrup", font=font_logo)
    t_box2 = draw.textbbox((0, 0), "Ande TV", font=font_logo)
    max_tw = max(t_box1[2] - t_box1[0], t_box2[2] - t_box2[0])
    total_brand_w = logo_w + 32 + max_tw
    
    brand_start_x = (W - total_brand_w) // 2
    header_y = 120
    canvas.paste(logo_scaled, (brand_start_x, header_y), logo_scaled)
    draw.text((brand_start_x + logo_w + 32, header_y + 6), "Gistrup", font=font_logo, fill=BRAND_GREEN)
    draw.text((brand_start_x + logo_w + 32, header_y + 92), "Ande TV", font=font_logo, fill=BRAND_GREEN)

    # 2. Big Catchy Hook
    hook_y = 350
    font_hook = get_font(FONT_BOLD, 92)
    hook_text = "Kigger du på vores ænder?"
    h_box = draw.textbbox((0, 0), hook_text, font=font_hook)
    draw.text(((W - (h_box[2] - h_box[0])) // 2, hook_y), hook_text, font=font_hook, fill=BRAND_GREEN)
    
    font_hook_sub = get_font(FONT_SEMIBOLD, 50)
    hook_sub = "Tag dem med i lommen i Virtuelt Ande TV! 🦆"
    hs_box = draw.textbbox((0, 0), hook_sub, font=font_hook_sub)
    draw.text(((W - (hs_box[2] - hs_box[0])) // 2, hook_y + 110), hook_sub, font=font_hook_sub, fill=GOLD_ACCENT)

    # 3. Duck Photo Card
    photo_raw = Image.open(workspace / "andereferencer" / "2026-04-02 16.39.28-1.jpg")
    card_x = 140
    card_y = 560
    card_w = W - 280
    card_h = 1120
    
    photo_scaled = photo_raw.resize((card_w, int(photo_raw.height * (card_w / photo_raw.width))), Image.Resampling.LANCZOS)
    if photo_scaled.height > card_h:
        top = int((photo_scaled.height - card_h) * 0.45)
        photo_cropped = photo_scaled.crop((0, top, card_w, top + card_h))
    else:
        photo_cropped = photo_scaled
    
    photo_rounded = round_image(photo_cropped, 28)
    
    # Shadow/border
    draw.rounded_rectangle((card_x - 6, card_y - 6, card_x + card_w + 6, card_y + card_h + 6), radius=34, outline="#b7d6b3", width=4)
    canvas.paste(photo_rounded, (card_x, card_y), photo_rounded)

    # Dark overlay name pill inside photo at bottom
    name_pill_y = card_y + card_h - 110
    font_pill = get_font(FONT_BOLD, 42)
    pill_text = "Anders  ·  Andemette  ·  Andedorte  ·  Andja"
    p_box = draw.textbbox((0, 0), pill_text, font=font_pill)
    pw = p_box[2] - p_box[0] + 80
    ph = 76
    px = (W - pw) // 2
    # Semi-transparent dark green pill
    pill_img = Image.new('RGBA', (pw, ph), (3, 82, 45, 220))
    pill_mask = Image.new('L', (pw, ph), 0)
    ImageDraw.Draw(pill_mask).rounded_rectangle((0, 0, pw, ph), radius=38, fill=255)
    canvas.paste(pill_img, (px, name_pill_y), pill_mask)
    draw.text((px + 40, name_pill_y + 13), pill_text, font=font_pill, fill="#ffffff")

    # 4. Short Engaging Text
    text_y = 1740
    font_desc_lead = get_font(FONT_SEMIBOLD, 44)
    font_desc = get_font(FONT_REGULAR, 40)
    
    desc_lines = [
        ("Her i haven bor vores fire indiske løbeænder, som elsker at bade og gå på sneglejagt.", font_desc_lead, BRAND_GREEN),
        ("Scan QR-koden nedenfor – så åbner haven direkte på din mobilskærm!", font_desc, TEXT_DARK),
        ("Prøv at trykke kort på græsset: Så kaster du virtuel pasta til flokken! 🍝", font_desc_lead, GOLD_ACCENT)
    ]
    
    cur_y = text_y
    for txt, fnt, col in desc_lines:
        tbox = draw.textbbox((0, 0), txt, font=fnt)
        tw = tbox[2] - tbox[0]
        draw.text(((W - tw) // 2, cur_y), txt, font=fnt, fill=col)
        cur_y += 66

    # 5. Big Center QR Section
    qr_sec_y = 1990
    qr_card_h = 1360
    draw.rounded_rectangle((card_x, qr_sec_y, card_x + card_w, qr_sec_y + qr_card_h), radius=40, fill="#f6faf4", outline="#cbe1c7", width=4)
    
    # CTA heading
    font_cta = get_font(FONT_BOLD, 56)
    cta_txt = "SCAN MED DIT MOBILKAMERA 👇"
    c_box = draw.textbbox((0, 0), cta_txt, font=font_cta)
    draw.text(((W - (c_box[2] - c_box[0])) // 2, qr_sec_y + 50), cta_txt, font=font_cta, fill=BRAND_GREEN)
    
    font_cta_sub = get_font(FONT_REGULAR, 38)
    cta_sub = "Gratis · Åbner med det samme i din browser · Ingen app nødvendig"
    cs_box = draw.textbbox((0, 0), cta_sub, font=font_cta_sub)
    draw.text(((W - (cs_box[2] - cs_box[0])) // 2, qr_sec_y + 125), cta_sub, font=font_cta_sub, fill=TEXT_MUTED)

    # Large QR Code
    qr_img = Image.open(workspace / "public" / "ande-tv-qr.png").convert("RGBA")
    qr_size = 900
    qr_scaled = qr_img.resize((qr_size, qr_size), Image.Resampling.LANCZOS)
    qr_x = (W - qr_size) // 2
    qr_y = qr_sec_y + 200
    
    draw.rounded_rectangle((qr_x - 20, qr_y - 20, qr_x + qr_size + 20, qr_y + qr_size + 20), radius=30, fill="#ffffff", outline=BRAND_GREEN, width=5)
    canvas.paste(qr_scaled, (qr_x, qr_y), qr_scaled)

    # URL and prompt below QR
    font_url = get_font(FONT_BOLD, 42)
    url_txt = "krauhe.github.io/DuckTV"
    ub = draw.textbbox((0, 0), url_txt, font=font_url)
    draw.text(((W - (ub[2] - ub[0])) // 2, qr_y + qr_size + 45), url_txt, font=font_url, fill=BRAND_GREEN)

    font_tip = get_font(FONT_SEMIBOLD, 38)
    tip_txt = "Tip: Tryk på græsset på skærmen for at fodre dem med pasta!"
    tb = draw.textbbox((0, 0), tip_txt, font=font_tip)
    draw.text(((W - (tb[2] - tb[0])) // 2, qr_y + qr_size + 105), tip_txt, font=font_tip, fill=GOLD_ACCENT)

    canvas.save(workspace / "skilt-forslag-2.png", "PNG")
    canvas.save(workspace / "skilt-forslag-2.pdf", "PDF", resolution=300)
    print("Proposal 2 complete.")


# ==========================================
# PROPOSAL 3: "Det klassiske haveskilt" (Stilrent & informativt)
# ==========================================
def create_proposal_3():
    print("Generating Proposal 3: Det klassiske haveskilt...")
    canvas = Image.new('RGB', (W, H), "#ffffff")
    draw = ImageDraw.Draw(canvas)
    
    # Elegant double border in forest green
    draw.rectangle((50, 50, W - 50, H - 50), outline=BRAND_GREEN, width=10)
    draw.rectangle((70, 70, W - 70, H - 70), outline="#b9d6b5", width=2)
    draw.rectangle((78, 78, W - 78, H - 78), outline=BRAND_GREEN, width=2)

    # 1. Header (Brand lockup left-aligned, subtitle right)
    logo_img = Image.open(workspace / "public" / "gistrup-ande-tv.png").convert("RGBA")
    logo_h = 230
    logo_w = int(logo_img.width * (logo_h / logo_img.height))
    logo_scaled = logo_img.resize((logo_w, logo_h), Image.Resampling.LANCZOS)
    
    header_x = 130
    header_y = 120
    canvas.paste(logo_scaled, (header_x, header_y), logo_scaled)
    
    font_logo = get_font(FONT_BOLD, 88)
    draw.text((header_x + logo_w + 35, header_y + 12), "Gistrup", font=font_logo, fill=BRAND_GREEN)
    draw.text((header_x + logo_w + 35, header_y + 110), "Ande TV", font=font_logo, fill=BRAND_GREEN)
    
    # Right subtitle in header
    font_h_sub = get_font(FONT_SEMIBOLD, 38)
    sub1 = "VIRTUELT ANDE TV"
    sub2 = "Løbeænderne i haven"
    sb1 = draw.textbbox((0, 0), sub1, font=font_h_sub)
    sb2 = draw.textbbox((0, 0), sub2, font=get_font(FONT_REGULAR, 34))
    draw.text((W - 130 - (sb1[2] - sb1[0]), header_y + 40), sub1, font=font_h_sub, fill=BRAND_GREEN)
    draw.text((W - 130 - (sb2[2] - sb2[0]), header_y + 95), sub2, font=get_font(FONT_REGULAR, 34), fill=TEXT_MUTED)

    draw.line((130, 380, W - 130, 380), fill=BRAND_GREEN, width=4)

    # 2. Main Title
    font_main = get_font(FONT_BOLD, 76)
    title_text = "Følg Anders, Andemette, Andedorte og Andja"
    tb = draw.textbbox((0, 0), title_text, font=font_main)
    draw.text(((W - (tb[2] - tb[0])) // 2, 420), title_text, font=font_main, fill=BRAND_GREEN)
    
    font_main_sub = get_font(FONT_REGULAR, 44)
    subtitle_text = "– live på telefonen, direkte fra haven ved grusvejen"
    stb = draw.textbbox((0, 0), subtitle_text, font=font_main_sub)
    draw.text(((W - (stb[2] - stb[0])) // 2, 515), subtitle_text, font=font_main_sub, fill=TEXT_MUTED)

    # 3. Duck Photo (Using the classic docs/images/vores-aender-foto.jpg with dark green hedge)
    photo_raw = Image.open(workspace / "docs" / "images" / "vores-aender-foto.jpg")
    card_x = 130
    card_y = 600
    card_w = W - 260
    card_h = 1200
    
    # Scale up photo nicely
    photo_scaled = photo_raw.resize((card_w, int(photo_raw.height * (card_w / photo_raw.width))), Image.Resampling.LANCZOS)
    if photo_scaled.height > card_h:
        top = int((photo_scaled.height - card_h) * 0.4)
        photo_cropped = photo_scaled.crop((0, top, card_w, top + card_h))
    else:
        photo_cropped = photo_scaled
        
    photo_rounded = round_image(photo_cropped, 24)
    
    draw.rounded_rectangle((card_x - 6, card_y - 6, card_x + card_w + 6, card_y + card_h + 6), radius=30, outline=BRAND_GREEN, width=4)
    canvas.paste(photo_rounded, (card_x, card_y), photo_rounded)

    # Photo caption
    cap_y = card_y + card_h + 16
    font_cap = get_font(FONT_SEMIBOLD, 38)
    cap_text = "Fra venstre mod højre: Flokkens fire løbeænder ved bøgehækken"
    cb = draw.textbbox((0, 0), cap_text, font=font_cap)
    draw.text(((W - (cb[2] - cb[0])) // 2, cap_y), cap_text, font=font_cap, fill=TEXT_MUTED)

    # 4. Two columns at bottom: Text on left, Big QR on right
    bot_y = 1910
    bot_h = 1460
    draw.rounded_rectangle((card_x, bot_y, card_x + card_w, bot_y + bot_h), radius=36, fill="#f8faf7", outline="#d0e2ce", width=3)

    # Left Column: Story & description
    col_left_x = card_x + 80
    col_w = 1100
    
    font_col_head = get_font(FONT_BOLD, 54)
    draw.text((col_left_x, bot_y + 80), "Hvad er Virtuelt Ande TV?", font=font_col_head, fill=BRAND_GREEN)
    
    font_body = get_font(FONT_REGULAR, 38)
    paragraphs = [
        "Bag hækken går vores fire løbeænder: Anders (hannen) samt hunnerne Andemette, Andedorte og Andja.",
        "Vi har genskabt haven og ænderne i en interaktiv 3D-verden, hvor vejret, solen og døgnrytmen følger virkeligheden i Gistrup.",
        "Du kan følge ænderne på mobilen, dreje kameraet rundt og kaste virtuel pasta til dem ved at trykke på græsset.",
        "Scan QR-koden med telefonen for at åbne haven. Det er ganske gratis og kræver ingen app."
    ]
    
    py = bot_y + 175
    for p in paragraphs:
        lines = wrap_text(p, font_body, col_w, draw)
        for line in lines:
            draw.text((col_left_x, py), line, font=font_body, fill=TEXT_DARK)
            py += 52
        py += 24

    # Pasta hint badge
    draw.rounded_rectangle((col_left_x, bot_y + bot_h - 220, col_left_x + col_w, bot_y + bot_h - 70), radius=20, fill="#fbf6eb", outline="#dec589", width=2)
    font_p_title = get_font(FONT_BOLD, 36)
    draw.text((col_left_x + 30, bot_y + bot_h - 195), "🌾 Prøv det sammen med børnene:", font=font_p_title, fill=GOLD_ACCENT)
    font_p_sub = get_font(FONT_REGULAR, 33)
    draw.text((col_left_x + 30, bot_y + bot_h - 145), "Tryk på skærmen for at kaste pasta – ænderne kommer løbende!", font=font_p_sub, fill="#5a4115")

    # Right Column: Big QR code
    qr_img = Image.open(workspace / "public" / "ande-tv-qr.png").convert("RGBA")
    qr_size = 840
    qr_scaled = qr_img.resize((qr_size, qr_size), Image.Resampling.LANCZOS)
    qr_x = card_x + card_w - qr_size - 90
    qr_y = bot_y + 140
    
    draw.rounded_rectangle((qr_x - 18, qr_y - 18, qr_x + qr_size + 18, qr_y + qr_size + 18), radius=28, fill="#ffffff", outline=BRAND_GREEN, width=5)
    canvas.paste(qr_scaled, (qr_x, qr_y), qr_scaled)

    font_qr_action = get_font(FONT_BOLD, 46)
    act_txt = "SCAN MED MOBILEN"
    ab = draw.textbbox((0, 0), act_txt, font=font_qr_action)
    draw.text((qr_x + (qr_size - (ab[2] - ab[0])) // 2, qr_y + qr_size + 40), act_txt, font=font_qr_action, fill=BRAND_GREEN)

    font_qr_link = get_font(FONT_SEMIBOLD, 38)
    lnk_txt = "krauhe.github.io/DuckTV"
    lb = draw.textbbox((0, 0), lnk_txt, font=font_qr_link)
    draw.text((qr_x + (qr_size - (lb[2] - lb[0])) // 2, qr_y + qr_size + 105), lnk_txt, font=font_qr_link, fill=TEXT_MUTED)

    canvas.save(workspace / "skilt-forslag-3.png", "PNG")
    canvas.save(workspace / "skilt-forslag-3.pdf", "PDF", resolution=300)
    print("Proposal 3 complete.")

if __name__ == "__main__":
    create_proposal_1()
    create_proposal_2()
    create_proposal_3()
    print("All 3 proposals successfully generated in PNG and PDF!")
