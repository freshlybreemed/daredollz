# DARE DOLLZ — Website

Official website for the Dare Dollz universe. Collectibles, comics, and apparel.

## Structure

```
daredollz/
├── index.html              ← Main landing page (Hero + About + Creatorz preview)
├── css/
│   └── style.css           ← All styles, brand tokens, components
├── js/
│   └── main.js             ← Scroll reveal, nav behavior, cursor trail
├── assets/
│   └── images/
│       ├── logo1.png       ← Main logo (black bg, use filter: brightness)
│       ├── logo2.png       ← Secondary logo mark
│       ├── cloud.png       ← Watercolor cloud background texture
│       ├── enter1.png      ← Pink comic character (hero left / comic section)
│       ├── enter2.png      ← Bullet hole graphic
│       ├── about.png       ← Four characters in trench coats
│       ├── bio.jpg         ← Darius & Dare Moreno photo
│       └── main.png        ← Four characters in white outfits (hero right)
└── pages/
    └── creatorz.html       ← Creatorz full page
```

## Brand

| Token        | Hex       | Usage                        |
|-------------|-----------|------------------------------|
| Yellow       | `#FFED00` | Accents, CTA hover, headings |
| Pink         | `#E827C9` | Primary buttons, borders     |
| Green        | `#8CB350` | Tags                         |
| Purple       | `#B578DD` | Tags, accents                |
| Blue (text)  | `#1DF9FF` | Emphasis text, nav active    |
| Blue (border)| `#38B6FF` | Outline buttons              |
| Blue (bg)    | `#003DE6` | Creatorz page background     |

**Fonts:** Bebas Neue (display) · Rajdhani (body) — loaded via Google Fonts

## To Run

Open `index.html` in a browser or serve with any static server:

```bash
npx serve .
# or
python3 -m http.server 3000
```

## Pages to Build Next

- [ ] `pages/shop.html` — Shop / collectibles
- [ ] `pages/comics.html` — Comics archive
- [ ] `pages/about.html` — Full About page
