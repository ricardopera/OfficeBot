#!/usr/bin/env python3
"""
OfficeBot Image Generator
Generates promotional images using MiniMax API

Usage:
    python scripts/generate-images.py [--all] [--logo] [--banner] [--icons]

Requirements:
    pip install requests pillow

Environment:
    MINIMAX_API_KEY - Your MiniMax API key
"""

import base64
import os
import sys
import json
import argparse
from pathlib import Path

try:
    import requests
except ImportError:
    print("Installing requests...")
    os.system("pip install requests")
    import requests

# API Configuration
API_URL = "https://api.minimax.io/v1/image_generation"
MODEL = "image-01"

# Output directory
ASSETS_DIR = Path("assets")
ASSETS_DIR.mkdir(exist_ok=True)

# Prompts for each image type
PROMPTS = {
    "logo": {
        "prompt": "A futuristic robot assistant with a modern minimalist style, wearing a small office tie, blue and white color scheme, circular badge design, clean lines, suitable for an app icon",
        "aspect_ratio": "1:1",
        "filename": "logo.png"
    },
    "banner": {
        "prompt": "Futuristic office workspace with AI assistant floating hologram interface, multiple chat bubbles representing different AI providers, connected to various messaging apps Telegram WhatsApp, Portuguese UI, modern glassmorphism design, blue and white theme, wide cinematic composition",
        "aspect_ratio": "16:9",
        "filename": "banner.png"
    },
    "hero": {
        "prompt": "Hero illustration of OfficeBot AI assistant as a friendly robot in a modern office, surrounded by floating interface panels showing chat conversations, agent list, and team collaboration, Portuguese language interface, futuristic blue and white color scheme, clean vector art style",
        "aspect_ratio": "16:9",
        "filename": "hero.png"
    },
    "icon-agent": {
        "prompt": "Icon representing AI agent technology - a robot head with circuit patterns, blue and white minimal style, clean background, suitable for app icon",
        "aspect_ratio": "1:1",
        "filename": "icon-agent.png"
    },
    "icon-channels": {
        "prompt": "Icon representing multi-channel messaging - speech bubbles connected to different platform logos, blue and white minimal style, clean background",
        "aspect_ratio": "1:1",
        "filename": "icon-channels.png"
    },
    "icon-team": {
        "prompt": "Icon representing team collaboration - multiple agents working together in a network, nodes and connections, blue and white minimal style, clean background",
        "aspect_ratio": "1:1",
        "filename": "icon-team.png"
    },
    "icon-extensions": {
        "prompt": "Icon representing extensions and plugins - a puzzle piece with a gear inside, blue and white minimal style, clean background",
        "aspect_ratio": "1:1",
        "filename": "icon-extensions.png"
    },
    "icon-database": {
        "prompt": "Icon representing database and storage - a stylized database cylinder with a lightning bolt, blue and white minimal style, clean background",
        "aspect_ratio": "1:1",
        "filename": "icon-database.png"
    },
    "icon-security": {
        "prompt": "Icon representing security and authentication - a shield with a lock, blue and white minimal style, clean background",
        "aspect_ratio": "1:1",
        "filename": "icon-security.png"
    }
}


def get_api_key():
    """Get API key from environment or config file"""
    api_key = os.environ.get("MINIMAX_API_KEY")
    if api_key:
        return api_key

    # Try to read from config
    config_path = Path(".env.json")
    if config_path.exists():
        with open(config_path) as f:
            config = json.load(f)
            return config.get("MINIMAX_API_KEY")

    return None


def generate_image(prompt: str, aspect_ratio: str, output_path: Path) -> bool:
    """Generate a single image using MiniMax API"""
    api_key = get_api_key()
    if not api_key:
        print("❌ MINIMAX_API_KEY not found!")
        print("   Set it via environment variable or create .env.json with {MINIMAX_API_KEY: 'your-key'}")
        return False

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": MODEL,
        "prompt": prompt,
        "aspect_ratio": aspect_ratio,
        "response_format": "base64"
    }

    print(f"   Generating {output_path.name}...")
    print(f"   Prompt: {prompt[:80]}...")

    try:
        response = requests.post(API_URL, headers=headers, json=payload, timeout=120)
        response.raise_for_status()

        result = response.json()
        images = result.get("data", {}).get("image_base64", [])

        if not images:
            print(f"   ❌ No images in response")
            return False

        # Save first image
        image_data = base64.b64decode(images[0])
        with open(output_path, "wb") as f:
            f.write(image_data)

        print(f"   ✅ Saved to {output_path}")
        return True

    except requests.exceptions.Timeout:
        print(f"   ❌ Timeout (took > 120s)")
        return False
    except requests.exceptions.HTTPError as e:
        print(f"   ❌ HTTP Error: {e}")
        if e.response.status_code == 401:
            print("   → Invalid API key")
        elif e.response.status_code == 429:
            print("   → Rate limit exceeded")
        return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False


def generate_all_images():
    """Generate all images"""
    print("\n🎨 OfficeBot Image Generator")
    print("=" * 50)

    api_key = get_api_key()
    if not api_key:
        print("❌ MINIMAX_API_KEY not configured!")
        print("\nTo set your API key:")
        print("   1. Export: export MINIMAX_API_KEY='your-key'")
        print("   2. Or create .env.json: echo '{\"MINIMAX_API_KEY\": \"your-key\"}' > .env.json")
        return

    print(f"✅ API key configured")
    print(f"📁 Output directory: {ASSETS_DIR.absolute()}\n")

    results = {}
    for name, config in PROMPTS.items():
        print(f"\n[{name}]")
        output_path = ASSETS_DIR / config["filename"]
        success = generate_image(
            config["prompt"],
            config["aspect_ratio"],
            output_path
        )
        results[name] = "✅" if success else "❌"

    print("\n" + "=" * 50)
    print("📊 Results:")
    for name, status in results.items():
        print(f"   {status} {name}")
    print()


def main():
    parser = argparse.ArgumentParser(description="OfficeBot Image Generator")
    parser.add_argument("--all", action="store_true", help="Generate all images")
    parser.add_argument("--logo", action="store_true", help="Generate logo")
    parser.add_argument("--banner", action="store_true", help="Generate banner")
    parser.add_argument("--hero", action="store_true", help="Generate hero image")
    parser.add_argument("--icons", action="store_true", help="Generate all icons")
    parser.add_argument("--list", action="store_true", help="List available images")

    args = parser.parse_args()

    if args.list:
        print("\n🎨 Available Images:")
        for name, config in PROMPTS.items():
            print(f"   {name:15} {config['aspect_ratio']:6} → {config['filename']}")
        print()
        return

    if args.all or not any([args.logo, args.banner, args.hero, args.icons]):
        generate_all_images()
        return

    api_key = get_api_key()
    if not api_key:
        print("❌ MINIMAX_API_KEY not configured!")
        return

    targets = []
    if args.logo:
        targets.append("logo")
    if args.banner:
        targets.append("banner")
    if args.hero:
        targets.append("hero")
    if args.icons:
        targets.extend(["icon-agent", "icon-channels", "icon-team",
                        "icon-extensions", "icon-database", "icon-security"])

    for name in targets:
        if name in PROMPTS:
            config = PROMPTS[name]
            output_path = ASSETS_DIR / config["filename"]
            print(f"\n[{name}]")
            generate_image(config["prompt"], config["aspect_ratio"], output_path)


if __name__ == "__main__":
    main()