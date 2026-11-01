import os
import urllib.request

SAMPLE_IMAGES = {
    "granite_block_1.jpg": "https://images.unsplash.com/photo-1618331599824-340d894b407a?auto=format&fit=crop&w=1200&q=80",
    "granite_block_2.jpg": "https://images.unsplash.com/photo-1587840171670-8b56087d1eb2?auto=format&fit=crop&w=1200&q=80",
    "quarry_scene.jpg": "https://images.unsplash.com/photo-1542157585-ef20bfc24b14?auto=format&fit=crop&w=1200&q=80"
}

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "sample_dataset")

def download_dataset():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Downloading {len(SAMPLE_IMAGES)} sample images to {OUTPUT_DIR}...")
    
    for filename, url in SAMPLE_IMAGES.items():
        filepath = os.path.join(OUTPUT_DIR, filename)
        print(f"Downloading {filename}...")
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response, open(filepath, 'wb') as out_file:
                out_file.write(response.read())
            print(f"  [OK] Saved to {filepath}")
        except Exception as e:
            print(f"  [FAILED] Failed to download {filename}: {e}")
            
    print("\nDataset download complete.")

if __name__ == "__main__":
    download_dataset()
