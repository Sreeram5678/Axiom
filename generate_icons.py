import os
import sys
import subprocess

def install_and_import(import_name, install_name):
    try:
        __import__(import_name)
    except ImportError:
        print(f"Installing {install_name}...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", install_name])

# Make sure Pillow is installed
install_and_import('PIL', 'Pillow')

from PIL import Image, ImageDraw, ImageFont

# Create icons directory
os.makedirs('icons', exist_ok=True)

def draw_gradient_rect(draw, coords, color1, color2, width):
    x0, y0, x1, y1 = coords
    for i in range(y0, y1):
        # Calculate ratio
        ratio = (i - y0) / (y1 - y0)
        # Interpolate color
        r = int(color1[0] * (1 - ratio) + color2[0] * ratio)
        g = int(color1[1] * (1 - ratio) + color2[1] * ratio)
        b = int(color1[2] * (1 - ratio) + color2[2] * ratio)
        draw.line([(x0, i), (x1, i)], fill=(r, g, b, 255))

for size in [16, 48, 128]:
    # Base RGBA transparent image
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Calculate dimensions
    margin = max(1, size // 16)
    radius = size // 4
    
    # Coordinates
    x0, y0 = margin, margin
    x1, y1 = size - margin, size - margin
    
    # Draw rounded background
    # Standard pillow rounded_rectangle doesn't natively do linear gradients inside,
    # so we will draw a mask of rounded rectangle, fill it with gradient, and paste it.
    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=255)
    
    # Create gradient background
    # Axiom Brand Gradient: Indigo (99, 102, 241) to Neon Pink (236, 72, 153)
    gradient_img = Image.new('RGBA', (size, size))
    grad_draw = ImageDraw.Draw(gradient_img)
    draw_gradient_rect(grad_draw, [0, 0, size, size], (138, 43, 226), (236, 72, 153), size)
    
    # Paste gradient using the rounded mask
    img.paste(gradient_img, (0, 0), mask=mask)
    
    # Redraw canvas for text drawing
    draw = ImageDraw.Draw(img)
    
    # Add a bold, elegant letter 'A'
    font_size = int(size * 0.55)
    
    try:
        # Try to use standard sans-serif font
        font = ImageFont.truetype("Arial Bold.ttf", font_size)
    except IOError:
        try:
            # Try macOS standard Helvetica
            font = ImageFont.truetype("Helvetica-Bold.ttf", font_size)
        except IOError:
            try:
                # Try generic font
                font = ImageFont.load_default()
            except:
                font = None
    
    # Calculate text position
    if font:
        # Draw clean letter 'A'
        draw.text((size // 2, size // 2), 'A', fill='white', anchor='mm', font=font)
    else:
        # Fallback text draw
        draw.text((size // 2, size // 2), 'A', fill='white', anchor='mm')
        
    img.save(f'icons/icon-{size}.png')
    print(f"Successfully generated icons/icon-{size}.png ({size}x{size} px)")

print("All icons successfully created inside the 'icons/' folder!")
