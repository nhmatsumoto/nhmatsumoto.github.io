#!/usr/bin/env python3
import sys
from pathlib import Path

# Add the scripts directory to the path so we can import the engine package
ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT / "scripts"))

from engine.generator import build_site
from engine.constants import ROOT as ENGINE_ROOT

def main():
    # Default to building into _site/ for safety and clarity
    output = ENGINE_ROOT / "_site"
    if len(sys.argv) > 1:
        output = Path(sys.argv[1]).resolve()
        
    print(f"Building Technical Knowledge OS v2 (Modular Engine) -> {output}...")
    try:
        result = build_site(output_dir=output)
        print(f"Done! Generated site at {output}")
        print(f"Stats: {result['published_posts']} articles, published at {result['updated_at']}")
    except Exception as e:
        print(f"Error during build: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
