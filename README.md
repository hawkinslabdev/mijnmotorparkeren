# MijnMotorParkeren.nl

[![Last commit](https://img.shields.io/github/last-commit/hawkinslabdev/mijnmotorparkeren)](https://github.com/hawkinslabdev/mijnmotorparkeren/commits/main)
[![License](https://img.shields.io/github/license/hawkinslabdev/mijnmotorparkeren)](LICENSE)
[![Support](https://img.shields.io/badge/Support-Buy%20me%20a%20coffee-fdd734?logo=buy-me-a-coffee)](https://coff.ee/hawkinslabdev)

<img width="100%" alt="MijnMotorParkeren.nl screenshot" src="https://github.com/hawkinslabdev/mijnmotorparkeren/blob/main/.github/assets/screenshot.png?raw=true" />

<br>

**MijnMotorParkeren.nl** is a public, open-source, community-driven web app that helps motorcyclists find up-to-date parking rules for every gemeente in the Netherlands. The site is publicly available at [mijnmotorparkeren.nl](https://mijnmotorparkeren.nl) and is designed for easy use on any device, with or without an internet connection (after first load). 

Our goal: **make it easy for everyone to know how you can park your motorcycle, anywhere in the country.**

<br>

[**Visit the website**](https://mijnmotorparkeren.nl) • [**Contribute data**](#-contributing) • [**How it works**](#-how-it-works) • [**Data structure**](#-data-structure) • [**Configuration**](#-configuration) • [**Roadmap**](#-roadmap) • [**Help**](#-help) • [**Donate**](#-donate)

<br>

---

<br>

## 🌍 What is MijnMotorParkeren.nl?

MijnMotorParkeren.nl is a free, map-based app for Dutch motorcyclists. It shows the latest parking rules, dedicated spots, and official sources for every gemeente (if applicable). The data is open (fully transparant) and file-based, so anyone can help keep it accurate and up to date.

- **Map-first**: Instantly see parking rules and boundaries on an interactive map.
- **Spotlight search**: Quickly find any gemeente by name (Cmd/Ctrl + K).
- **Offline support**: Works even without internet after first load.
- **Community-powered**: Anyone can suggest updates or corrections via melden.mijnmotorparkeren.nl.
- **Privacy-friendly**: No tracking, no ads, no login required.

---

<br>

## 🚀 How it works

- **Browse or search** for a gemeente on the map or via the search bar.
- **View parking rules** for motorcycles regarding pidewalk parking, including free/paid zones, and special notes.
- **See official sources** for every rule, with links to gemeente websites.
- **Contribute**: If you spot missing or outdated info, you can propose changes directly via [melden.mijnmotorparkeren.nl](https://melden.mijnmotorparkeren.nl).

---

<br>

## 🗺️ Data Structure

Each gemeente has a JSON file in `/data/gemeentes/`:

```json
{
  "id": "aalsmeer",
  "name": "Gemeente Aalsmeer",
  "province": "Noord-Holland",
  "coordinates": { "lat": 52.2636, "lng": 4.7536 },
  "boundaries": "...GeoJSON...",
  "parkingRules": {
    "free": true,
    "paid": { "enabled": false, "areas": [], "rates": null },
    "permits": { "required": false, "types": [] },
    "restrictions": { "timeLimit": null, "noParking": [] },
    "motorcycleSpecific": {
      "dedicatedSpots": [],
      "allowedOnSidewalk": false,
      "freeInPaidZones": true,
      "notes": "Motorcycles can park free in paid parking zones"
    }
  },
  "lastUpdated": "2025-01-07",
  "sources": [
    {
      "type": "official",
      "url": "https://www.aalsmeer.nl/parkeren",
      "date": "2025-01-07"
    }
  ]
}
```

---

<br>

## 🤝 Contributing

**Anyone can help keep the data accurate!**

- Spot an error or missing gemeente? [Meld het via melden.mijnmotorparkeren.nl](https://melden.mijnmotorparkeren.nl/).
- To add or update gemeente data:
  - **Method 1:** Submit a pull request with your changes following the data structure above. Always include official sources and use ISO 8601 dates.
  - **Method 2:** Use [melden.mijnmotorparkeren.nl](https://melden.mijnmotorparkeren.nl) to submit your update or correction.
- (Advanced) Validate your changes locally: `npm run validate:data`.
- Your change will be reviewed and merged if correct.

**You do NOT need to clone or run the project locally to contribute (to existing) data!**

---

<br>

## 🔧 Configuration (for maintainers)

### Environment Variables

Create a `.env` file in the root if you want to run the site locally:

```env
VITE_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
VITE_MAP_ATTRIBUTION=© OpenStreetMap contributors
VITE_DEFAULT_CENTER_LAT=52.3676
VITE_DEFAULT_CENTER_LNG=4.9041
VITE_DEFAULT_ZOOM=7
VITE_DATA_VERSION=YYYYMMDD
```

### Development Scripts

```bash
npm run generate:boundaries   # Generate gemeente boundaries from OSM
npm run validate:data         # Validate all data files
npm run build:search          # Build search index
npm run format                # Format code
npm run lint                  # Lint code
```

### Build scripts

```bash
npm run build                 # Generate a production build
```

---

<br>

## 🏗️ Tech Stack

For anyone that's interested in the stack MijnMotorParkeren.nl is using:

- **Frontend**: React 18 + TypeScript
- **Mapping**: Leaflet + OpenStreetMap
- **UI**: Radix UI + Tailwind CSS
- **Search**: Fuse.js
- **State**: Zustand
- **Build**: Vite
- **PWA**: Workbox
- **Testing**: Vitest + React Testing Library
- **Linting**: ESLint + Prettier

---

<br>

## 🚧 Roadmap

- [ ] Application/Security hardening
- [ ] Refactoring/Revising the data structure
- [ ] Multi-language (NL/EN)
- [ ] Subscription service (e.g. webhook or e-mails) for updates

---

<br>

## 💬 Help

Need help using MijnMotorParkeren.nl, have ideas, or found a bug? Here's how you can reach out:

- **🐛 Found a bug or have a feature request?**
  [Let us know through melden.mijnmotorparkeren.nl](https://melden.mijnmotorparkeren.nl/). If you'd like to contribue, please feel free to open a Pull Request. That allows me to merge the changes rather quickly.

- **💬 Have questions, want to share feedback, or just chat?**
  [Start a thread at our community, melden.mijnmotorparkeren.nl](https://melden.mijnmotorparkeren.nl/).

Your feedback helps make MijnMotorParkeren.nl better for everyone. Don’t hesitate to reach out!

---

<br>

## 🍻 Donate

[![Buy Me A Coffee](https://img.shields.io/badge/Buy_me_a_coffee-fdd734?&logo=buy-me-a-coffee&logoColor=black&style=for-the-badge)](https://coff.ee/hawkinslabdev)
[![GitHub Sponsors](https://img.shields.io/badge/GitHub_Sponsors-30363d?style=for-the-badge&logo=github&logoColor=white)](https://github.com/sponsors/hawkinslabdev)

If you find this project useful, consider buying me a coffee or starring/contributing on GitHub. Your support keeps the project alive!

<!--
A big thank you to the following people for providing me with more coffee:

<a href="#"><img src="" width="64px" alt="User avatar: " /></a>&nbsp;&nbsp;
-->
---

<br>

## 📄 License

This project is licensed with the GNU General Public License v3.0, a copyleft license. Please see [LICENSE](LICENSE) for details.

---

<br>

## 🙏 Acknowledgments

- OpenStreetMap contributors
- Dutch gemeente websites for parking info
- The motorcycle community in NL
