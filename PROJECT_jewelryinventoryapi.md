# Jewelry Inventory App — Project Documentation

## Links
- **Live URL:** https://jewelrybyjeralynn.github.io/jewelry-inventory/JewelryInventory.html
- **Repo:** jewelrybyjeralynn/jewelry-inventory
- **Apps Script URL:** https://script.google.com/macros/s/AKfycbwOZhzM_eUsSF9QuWdgblsEHVKWg2OIIGkvBC1Z6na58cGXDV3zd4ZA_nB19_caI22T/exec

## Architecture
- Single HTML/JS/CSS file, no server, no build step
- Data source: Google Sheets published CSVs (read-only; auto-publishes on sheet save)
- Writes: Google Apps Script Web App (no-cors POST)
- Left pane: SKU list grouped by Packaging SKU (siblings share a group)
- Right pane: Detail view (click item to show)
- Modal: Add New SKU / Add Component / Edit SKU

## Google Sheets
Spreadsheet published base URL:
`https://docs.google.com/spreadsheets/d/e/2PACX-1vSY-d6fqtTZhGzIoE4w_q3J4AAGpL1By7Jsc8RBVspYU6r8Fx4l71Xmx7WwR69vBwevSi63WnqJnaXO/pub`

| Tab | GID | Access |
|-----|-----|--------|
| Listings_Published | 1428673260 | read + write |
| Findings_SKUs_Published | 1709919881 | read only |
| Abbreviations_Published | 1879145246 | read + write |

### Listings_Published columns (0-indexed)
```
0:Type  1:Shape  2:Packaging SKU  3:New ETSY SKU  4:Characters
5:Object Description  6:Wide x Height  7:Material  8:Chain Or Hardware
9:Chain Or Drop Length  10:Chain/Bead/Clasp Details  11:Extension Chain
12:Chain Length Config  13:Finish  14:Colors  15:Charm  16:Double Sided
17:Gift Box  18:Added To Etsy  19:Jump Rings  20:Jump Rings Qty  21:Old SKU
22:ETSY ListingID  23:ETSY SKU  24:ETSY Title  25:ETSY Status  26:ETSY Price
27:ETSY URL  28:Update Templates  29:Template - Title Custom Intro
30:Template - Components Necklace Length Options
31:Template - Combined  32:Template - Tags
33:Added_Timestamp  34:Row_ID  35:API_Edit
```

## Apps Script Actions
| Action | Description |
|--------|-------------|
| append | Add new row to Listings_Published |
| update | Update row matched by Row_ID (fallback: PKG SKU + Object Description, then PKG SKU + Type + Shape) |
| updateSKU | Update Packaging SKU + New ETSY SKU on ALL rows matching old PKG SKU |
| addFinishAbbr | Append new finish abbreviation entry to Abbreviations_Published |

### Update row lookup fallback chain
1. Row_ID (primary -- UUID assigned at append time)
2. PKG SKU + Object Description
3. PKG SKU + Type + Shape (`_originalShape` captured at edit-open time)

## Key Behaviors

### SET Types
- SET-PD, SET-ER, SET-BR group as siblings under same Packaging SKU
- SKU locks after first non-PD component is saved
- SET SKU combines PD+ER shapes after first non-PD component saved (PD shape first)
- All siblings always share Packaging SKU and New ETSY SKU

### SKU Generation
- Format: `TypeParent-Shape-ChainMetal[-CB]-Finish[-Colors]`
- Packaging SKU: readable finish, max 38 chars
- New ETSY SKU: abbreviated finish, max 32 chars
- PD component drives chain metal, finish, colors for the whole set
- `CB` inserted after chain metal when chain detail contains "bead" (PD/SET-PD only)

### Object Description
- Never entered manually -- auto-derived at save time as `{shape} {type plain name}`
- Examples: `Hexagon Earrings`, `Dolphin Pendant Necklace`, `Heart Bracelet`
- Type plain name map: SET-PD=Pendant, SET-ER=Earrings, SET-BR=Bracelet, PD=Pendant Necklace, ER=Earrings, BR=Bracelet, RN=Ring, KC=Keychain, JD=Jewelry Dish, NK=Necklace, PKG=Gift Packaging
- Edit path preserves existing value unchanged

### Chain Or Hardware filtering by Type
| Type | Options shown |
|------|--------------|
| ER, SET-ER | EAR options only |
| KC | Keychain options only |
| BR, SET-BR | includes BRACELET; others exclude it |
| JD, PKG | disabled |
| All others | excludes EAR, Keychain, BRACELET |

### Finish
- Checkboxes: 11 base finishes + No Finish, alphabetical, 4 columns
- "Different Front/Back" toggle splits into Front/Back groups (2 cols each)
- New combos auto-written to Abbreviations_Published via addFinishAbbr (on Save only)
- "No Finish" is mutually exclusive with all other finishes; produces no finish segment in SKU
- Aluminum removed from checkboxes -- set automatically by material logic

### Material auto-finish rules
- Aluminum, Stainless Steel, Bead, Zinc Alloy, Memory Wire → finish forced to "No Finish", finish panel disabled

### Colors
- Tag-input autocomplete widget; type partial name to filter
- Stored as full names comma-separated; abbreviations used in SKU
- Sourced from Abbreviations_Published Colors column

### Other behaviors
- Search strips hyphens and spaces before comparing
- Type dropdown order matches Abbreviations_Published Type column order
- Extension Chain and Chain Length Config only enabled for NK, PD, SET-PD
- Double-click a component in SKU Group list → opens Edit modal for that component
- Sort: Default / Recently Edited / Least Recently Edited (by API_Edit; siblings grouped by max)
- SKU uniqueness check on Save -- blocks if PKG SKU or New ETSY SKU already used by a different group
- Default filter on load: Etsy Status = Active

## Delivery Convention
- Filename: `JewelryInventory_vXXXXX.html` (forces fresh browser download)
- Versioning: three-digit `major.minor.patch`
- Each delivery: state version + one-line summary

## Mobile Phases (all complete as of v1.8.145)
- Phase 1 (v1.8.126): Single-pane navigation -- tap SKU shows detail, back button returns to list
- Phase 2 (v1.8.134): Filter drawer -- filters moved to #filterBar below header; toggleMobFilters()
- Phase 3 (v1.8.135): Modal height fix for iOS Safari
- Phase 4 (v1.8.139): Toast bottom offset for Safari toolbar

## Version Log (recent)
| Version | Change |
|---------|--------|
| v1.8.147 | Expand Object Description auto-derive to all types -- all types get {shape} {type plain name} |
| v1.8.146 | Auto-derive Object Description at save time -- field removed from form; deriveObjectDescription() called in saveRecord() |
| v1.8.145 | Fix desktop list item -- mobile uses flex+order to stack badge last; desktop grid restored |
| v1.8.144 | Mobile: hide Sort label, cap sort dropdown width |
| v1.8.143 | Mobile: status badge moved to third row |
| v1.8.142 | Mobile: version number moved to list pane header |
| v1.8.141 | Mobile: status badge stacks below SKU name |
| v1.8.140 | SKU uniqueness check on Save |
| v1.8.139 | Mobile phase 4: toast bottom offset 80px on mobile |
| v1.8.138 | ms-btn: max-width + ellipsis for long filter labels |
| v1.8.137 | Widen Etsy Status button; det-actions wrap on mobile |
| v1.8.136 | Fix detail view cut off on iOS Safari |
| v1.8.135 | Mobile phase 3: modal iOS Safari fix |
| v1.8.134 | Mobile phase 2: filter drawer fixes complete |
| v1.8.126 | Mobile phase 1: single-pane navigation |
| v1.8.124 | Sort dropdown: Default / Recently Edited / Least Recently Edited |
| v1.8.92 | Run Templates button in Reference section |
| v1.8.80 | Left pane shows Type plain name |
| v1.8.71 | PD type gets Chain Length Config + Extension Chain |
| v1.8.70 | Double-click left pane item opens edit modal |
| v1.8.46 | API_Edit column fix (removed duplicate doPost from Listings_Import.gs) |
| v1.8.45 | Row_ID UUID column added (36-col structure) |
