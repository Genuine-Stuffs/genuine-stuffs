import urllib.request
import re
import os

def download_unsplash(query, output_path):
    url = f"https://unsplash.com/s/photos/{query}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        html = urllib.request.urlopen(req).read().decode('utf-8')
        match = re.search(r'(https://images\.unsplash\.com/photo-[^"\?]+)\?', html)
        if match:
            img_url = match.group(1) + "?w=600&h=600&fit=crop"
            urllib.request.urlretrieve(img_url, output_path)
            print(f"Downloaded {query} to {output_path}")
            return True
        else:
            print(f"No image found for {query}")
    except Exception as e:
        print("Error:", e)

download_unsplash("excavator", "public/images/cats/equipment.png")
download_unsplash("dump-truck", "public/images/cats/logistics.png")

os.system("cp public/images/materials/floor_tiles.png public/images/cats/finishing.png")
print("Copied default floor tiles!")
