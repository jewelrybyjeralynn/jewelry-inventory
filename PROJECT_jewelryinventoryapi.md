# Jewelry Inventory App — Project Notes

## Quick Links
- **Live App**: https://jewelrybyjeralynn.github.io/jewelry-inventory/JewelryInventory.html
- **Repo**: https://github.com/jewelrybyjeralynn/jewelry-inventory
- **Apps Script**: https://script.google.com/macros/s/AKfycbwOZhzM_eUsSF9QuWdgblsEHVKWg2OIIGkvBC1Z6na58cGXDV3zd4ZA_nB19_caI22T/exec

---

## Current Version
**v1.8.32** — Always deliver new versions as `JewelryInventory_vXXXXX.html` to force fresh download, then rename to `JewelryInventory.html` before uploading to GitHub.

---

## Architecture

Single HTML/JS/CSS file, no server, no build step. Client-side only.

- **Data reads**: Google Sheets published CSVs (3 tabs, auto-publish on save)
- **Data writes**: Google Apps Script Web App via no-cors POST
- **Left pane**: SKU list grouped by Packaging SKU (siblings share a group)
- **Right pane**: Detail view (click item to show)
- **Modal**: Add New SKU / Add Component / Edit SKU

---

## Google Sheets

**Published base URL:**
```
https://docs.google.com/spreadsheets/d/e/2PACX-1vSY-d6fqtTZhGzIoE4w_q3J4AAGpL1By7Jsc8RBVspYU6r8Fx4l71Xmx7WwR69vBwevSi63WnqJnaXO/pub
```

| Tab | GID | Purpose |
|-----|-----|---------|
| Listings_Published | 1428673260 | Main inventory — read + write |
| Findings_SKUs_Published | 1709919881 | Chain/hardware options — read only |
| Abbreviations_Published | 1879145246 | Type/shape/finish/color/material abbrevs — read + write |

**Listings_Published columns (0-indexed):**
```
0:Type  1:Shape  2:Packaging SKU  3:New ETSY SKU  4:Characters
5:Object Description  6:Wide x Height  7:Material  8:Chain Or Hardware
9:Chain Or Drop Length  10:Chain/Bead/Clasp Details  11:Extension Chain
12:Chain Length Config  13:Finish  14:Colors  15:Charm  16:Double Sided
17:Gift Box  18:Added To Etsy  19:Jump Rings  20:Jump Rings Qty  21:Old SKU
22:ETSY_Status  23:ETSY_URL  24:Features & Details  25:Added_Timestamp
```

**Abbreviations_Published columns:**
```
0:Type  1:Shape  2:Finish  3:Chain Metal  4:Colors  5:Material  6:Colors_Backup
```
Note: TypeParent column was removed. Type column has entries like `SET-PD = Set Pendant`.

---

## Apps Script Actions

All POSTed as JSON with `Content-Type: text/plain` and `mode: no-cors`.

| Action | Description |
|--------|-------------|
| `append` | Add new row to Listings_Published. Sets Added_Timestamp and addedToEtsy='NOT LISTED' server-side |
| `update` | Update row matched by Packaging SKU + Object Description (_originalDescription) |
| `updateSKU` | Update Packaging SKU + New ETSY SKU on ALL rows matching _oldPackagingSKU |
| `addFinishAbbr` | Append new `ABBR = Full Name` entry to Finish column in Abbreviations_Published |

---

## SKU Format

```
TypeParent-Shape-ChainMetal-FinishReadable[-Colors]   (Packaging SKU, max 38 chars)
TypeParent-Shape-ChainMetal-FinishAbbr[-Colors]       (New ETSY SKU, max 32 chars)
```

- SET types → TypeParent = `SET`
- Non-set → TypeParent = type abbreviation (NK, ER, etc.)
- Colors dropped if combined SKU exceeds length limit

---

## SET Component Logic

1. SET-PD saved first — solo SKU generated
2. First non-PD component saved — combined SKU generated, updateSKU sent to update all rows
3. Additional components — inherit existing SKU, no recalculation
4. Warning fires immediately on Type change if non-PD selected without existing SET-PD
5. Save blocked if no SET-PD sibling exists
6. **Assumption: SET-PD is always entered first**

---

## Chain Or Hardware Filtering by Type

| Type | Options Shown |
|------|--------------|
| ER, SET-ER | EAR only |
| KC | Keychain only |
| BR, SET-BR | Includes BRACELET; excludes EAR and Keychain |
| JD, PKG | Disabled |
| All others | Excludes EAR, Keychain, and BRACELET |

---

## Form Field Rules

- Extension Chain + Chain Length Config: only enabled for NK and SET-PD
- Finish: 12 base checkboxes, alphabetical, 4 cols. Front/Back toggle available. New combos auto-written to sheet.
- Colors: full names shown, abbreviations used in SKU
- Type dropdown: order from Abbreviations_Published (not alphabetical)
- Chain Length Config options: Standard, Minor Adjustment, Requires Modifications, None

---

## Base Finish Abbreviations

```
FLM=Flame  MTT=Matte  CLR=Clear  GLS=Gloss  RES=Resin
SLD=Solder  PAT=Patina  SAT=Satin  UVR=UV Resin
ALK=Alcohol Ink  COP=Copper  ALU=Aluminum
```

---

## Mobile Responsiveness (In Progress — v1.8.32)

- CSS media query breakpoint: 700px
- Mobile: header filters collapse to filter drawer
- Mobile: single-pane nav (list → tap → detail → back button)
- Mobile: modal full screen
- JS wiring for single-pane nav not yet complete

---

## Version Log

| Version | Change |
|---------|--------|
| v1.8.32 | Added HTML comment block + this project notes file |
| v1.8.31 | Chain Length Config — added None option |
| v1.8.30 | Type filter plain names |
| v1.8.29 | Replaced Finish filter with Type filter |
| v1.8.28 | Detail view refreshes to edited record after save |
| v1.8.27 | Extension Chain pre-populates in Edit |
| v1.8.26 | Left panel shows Type · Shape · Chain |
| v1.8.25 | BRACELET chain options only for BR/SET-BR |
| v1.8.24 | Fixed hasNonPD captured before sibling add |
| v1.8.23 | Fixed sibling grouping to use parentId |
| v1.8.21 | Fixed no-cors missing on append fetch |
| v1.8.18 | Warning on type change when no SET-PD |
| v1.8.16 | SKU locks after first non-PD component |
| v1.8.13 | Chain Or Hardware filtered by Type |
| v1.8.12 | Fixed isSetType check |
| v1.8.10 | Type dropdown follows spreadsheet order |
| v1.8.0  | Finish replaced with multifinish checkboxes |
| v1.7.0  | TypeParent column removed |

---

## Known Issues / Pending

- Mobile JS single-pane navigation not yet wired up (CSS done, JS pending)
- updateSKU uses no-cors — success/fail not confirmable from client
- Findings filter ("Include In Add SKU Dropdown Form = Yes") applied client-side

---

## How to Resume in a New Session

1. Tell Claude: "Continue work on the Jewelry Inventory app"
2. Claude can fetch this file directly:
   `https://raw.githubusercontent.com/jewelrybyjeralynn/jewelry-inventory/main/PROJECT_jewelryinventoryapi.md`
3. Upload current `JewelryInventory.html` if making code changes
4. Claude has memory of repo URL, sheet IDs, Apps Script URL, and current version
