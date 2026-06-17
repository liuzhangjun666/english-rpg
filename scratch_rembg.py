from rembg import remove
from PIL import Image
import glob
import os

base_dir = 'resources/assets/images/ui/zhenfafeng/'
files = glob.glob(os.path.join(base_dir, '*.png'))

for f in files:
    if 'background' in f or 'back.png' in f:
        continue
    print(f"Processing {f} with rembg...")
    try:
        img = Image.open(f)
        out = remove(img)
        out.save(f)
    except Exception as e:
        print(f"Failed on {f}: {e}")

print("Done")
