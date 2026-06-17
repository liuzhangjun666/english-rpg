import cv2
import numpy as np
from PIL import Image
import glob

def remove_bg_soft(input_path, output_path):
    img = cv2.imread(input_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        return
        
    if img.shape[2] == 4:
        img_rgb = img[:,:,:3]
    else:
        img_rgb = img

    # Convert to grayscale to find bright background
    gray = cv2.cvtColor(img_rgb, cv2.COLOR_BGR2GRAY)
    
    # We create a smooth alpha mask based on how close the pixel is to white.
    # Background is white (255).
    # We want white to be alpha 0.
    # We want non-white to be alpha 255.
    
    # Let's map gray 245->0, 230->255
    alpha = np.clip((245 - gray.astype(float)) / 15.0 * 255, 0, 255).astype(np.uint8)
    
    # But wait, white highlights INSIDE the bridge will also become transparent!
    # To fix this, we need to only apply this soft alpha to the edges.
    
    # 1. Create a hard mask of the background using floodfill
    h, w = img_rgb.shape[:2]
    ff_mask = np.zeros((h+2, w+2), np.uint8)
    corners = [(0,0), (w-1,0), (0,h-1), (w-1,h-1)]
    for pt in corners:
        # Tolerance is very tight to only catch the absolute background
        cv2.floodFill(img_rgb.copy(), ff_mask, pt, 0, loDiff=(8,8,8), upDiff=(8,8,8), flags=4)
        
    bg_mask = ff_mask[1:-1, 1:-1]
    
    # bg_mask == 1 is the solid background.
    # We dilate the background mask slightly to get a transition zone
    kernel = np.ones((5,5), np.uint8)
    bg_dilated = cv2.dilate(bg_mask, kernel, iterations=2)
    
    # Final alpha: 
    # If it's solid background (bg_mask == 1), alpha is 0.
    # If it's inside the bridge (bg_dilated == 0), alpha is 255.
    # In the transition zone, use the soft alpha based on grayscale.
    
    final_alpha = np.zeros((h, w), dtype=np.uint8)
    final_alpha[bg_dilated == 0] = 255
    
    transition = (bg_dilated == 1) & (bg_mask == 0)
    final_alpha[transition] = alpha[transition]
    
    # Now, to fix the white bleeding, we multiply the color by the alpha?
    # No, to remove the white tint, we can just use the color as is, because
    # soft alpha will make it blend nicely.
    
    result = np.zeros((h, w, 4), dtype=np.uint8)
    result[:,:,:3] = img_rgb
    result[:,:,3] = final_alpha
    
    cv2.imwrite(output_path, result)

for f in glob.glob('resources/assets/images/ui/zhenfafeng/*.png'):
    if 'bgrm' in f or 'fixed' in f or 'background' in f or 'back.png' in f:
        continue
    remove_bg_soft(f, f)
print("Done")
