# CDPC Brand Website

A responsive, static landing page for the CDPC pixel-creative platform concept.

**Tagline:** Create Beyond Pixels.

## Preview locally

No build step is required. Open `index.html` directly, or serve the repository with any static web server:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Contents

- `index.html` — semantic landing page, SEO metadata and Open Graph tags
- `assets/css/site.css` — responsive visual system and page styles
- `assets/js/site.js` — accessible mobile navigation and dynamic copyright year
- `ai-skins.html` — interactive AI skin tool with text-to-image and reference-image modes
- `assets/css/ai-skins.css` — responsive AI tool layout
- `assets/js/ai-skins.js` — Gemini API request, result preview and PNG export
- `assets/icons/` — SVG favicon and social preview artwork
- `docs/brand-guidelines.md` — initial visual and copy guidelines

## Deploy

This is a static website and can be hosted on GitHub Pages, Cloudflare Pages, Vercel, or any static hosting provider. For GitHub Pages, select the `main` branch and `/(root)` as the publishing source in repository settings.

## AI skin tool setup

Open `ai-skins.html` from the deployed site, enter your own Google Gemini API key, then choose **文字生成** or **参考图改绘**. The key is kept only in page memory and is not written to local storage or sent to the CDPC site backend; image requests go directly from the browser to Google's Gemini API. The browser session must be able to reach `generativelanguage.googleapis.com`, and your Google API project must have access to the selected image model. API usage may incur charges or quota limits.

The tool can download the generated image and a 64×64 PNG draft. Resizing an AI image to 64×64 does **not** guarantee a valid Minecraft skin UV texture; inspect and correct the UV layout before using it in-game.

## Important status note

This repository currently presents a **brand concept**, not a finished or operational editor. Product links and community functionality must be connected when those services are available. The brand name has not been legally cleared; conduct trademark and domain checks before commercial launch.

CDPC is an independent project and is not affiliated with, endorsed by, or sponsored by Mojang or Microsoft. Any Minecraft-related compatibility or trademark statements should be reviewed against the applicable usage guidelines before launch.

## License

The source code in this repository is provided under the MIT License. See [LICENSE](LICENSE). Brand artwork and identity assets are included for this project; obtain permission before reusing them as a separate brand identity.