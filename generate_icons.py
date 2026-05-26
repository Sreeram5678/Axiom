import os
import sys
import subprocess

# Ensure Pillow (PIL) is installed and available
try:
    from PIL import Image
except ImportError:
    print("Installing Pillow...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image

# Create icons directory
os.makedirs('icons', exist_ok=True)

# Source logo file (high-resolution master)
SOURCE = os.path.join('icons', 'Background.png')

if not os.path.exists(SOURCE):
    print(f"ERROR: Source logo not found at '{SOURCE}'")
    sys.exit(1)

# Open the high-res source image
src = Image.open(SOURCE).convert('RGBA')
print(f"Source: {SOURCE}  ({src.width}×{src.height} px)")

# Generate each required size with high-quality LANCZOS downsampling
for size in [16, 48, 128]:
    resized = src.resize((size, size), Image.LANCZOS)
    out_path = f'icons/icon-{size}.png'
    resized.save(out_path, optimize=True)
    print(f"Generated {out_path}  ({size}×{size} px)")

print("\nAll icons created in the 'icons/' folder.")
