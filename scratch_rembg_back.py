import cv2
import numpy as np

def remove_bg_soft(input_path, output_path):
    img = cv2.imread(input_path, cv2.IMREAD_UNCHANGED)
    if img is None: return
    if img.shape[2] == 4: img_rgb = img[:,:,:3]
    else: img_rgb = img

    gray = cv2.cvtColor(img_rgb, cv2.COLOR_BGR2GRAY)
    alpha = np.clip((245 - gray.astype(float)) / 15.0 * 255, 0, 255).astype(np.uint8)
    
    h, w = img_rgb.shape[:2]
    ff_mask = np.zeros((h+2, w+2), np.uint8)
    corners = [(0,0), (w-1,0), (0,h-1), (w-1,h-1)]
    for pt in corners:
        cv2.floodFill(img_rgb.copy(), ff_mask, pt, 0, loDiff=(8,8,8), upDiff=(8,8,8), flags=4)
        
    bg_mask = ff_mask[1:-1, 1:-1]
    kernel = np.ones((5,5), np.uint8)
    bg_dilated = cv2.dilate(bg_mask, kernel, iterations=2)
    
    final_alpha = np.zeros((h, w), dtype=np.uint8)
    final_alpha[bg_dilated == 0] = 255
    transition = (bg_dilated == 1) & (bg_mask == 0)
    final_alpha[transition] = alpha[transition]
    
    result = np.zeros((h, w, 4), dtype=np.uint8)
    result[:,:,:3] = img_rgb
    result[:,:,3] = final_alpha
    cv2.imwrite(output_path, result)

remove_bg_soft('resources/assets/images/ui/zhenfafeng/back.png', 'resources/assets/images/ui/zhenfafeng/back.png')
print("Done back.png")
