import urllib.request
import urllib.parse
import re
from PIL import Image
import os

def download_and_process(query, out_path):
    url = "https://www.google.com/search?tbm=isch&q=" + urllib.parse.quote(query)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        html = urllib.request.urlopen(req).read().decode('utf-8')
        urls = re.findall(r'<img[^>]+src="(https://encrypted-tbn0\.gstatic\.com/images[^">]+)"', html)
        if urls:
            img_url = urls[0] # The first one is usually a good match
            urllib.request.urlretrieve(img_url, "temp.jpg")
            
            # Remove white background
            img = Image.open("temp.jpg").convert("RGBA")
            data = img.getdata()
            new_data = []
            for item in data:
                # White or very light gray -> transparent
                if item[0] > 230 and item[1] > 230 and item[2] > 230:
                    new_data.append((255, 255, 255, 0))
                else:
                    new_data.append(item)
            img.putdata(new_data)
            # Scale it up slightly so it fits the container well
            img = img.resize((img.width * 2, img.height * 2), Image.Resampling.LANCZOS)
            img.save(out_path, "PNG")
            print(f"Success: {out_path}")
        else:
            print("No urls found for", query)
    except Exception as e:
        print("Error:", e)

download_and_process("excavator white background isolated object", "public/images/cats/equipment.png")
download_and_process("bruder toy dump truck white background isolated", "public/images/cats/logistics.png")

if os.path.exists("temp.jpg"):
    os.remove("temp.jpg")
