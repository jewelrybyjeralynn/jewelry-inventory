# Jewelry Inventory App — Project Documentation

## Links
- **Live URL:** https://jewelrybyjeralynn.github.io/jewelry-inventory/JewelryInventory.html
- **Repo:** jewelrybyjeralynn/jewelry-inventory (private -- LICENSE file added, GitHub Pro required for Pages on private repo)
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
0:Type  1:Shape  2:Packaging SKU  3:New ETSY SKU  4:Object Description
5:Width x Height  6:Drop Length  7:Material  8:Chain Or Hardware
9:Chain Length  10:Chain/Bead/Clasp Details  11:Extension Chain
12:Chain Length Config  13:Finish  14:Colors  15:Charm  16:Double Sided
17:Gift Box  18:Freebie  19:Added To Etsy  20:Jump Rings  21:Jump Rings Qty
22:Old SKU  23:Previous ETSY ListingID  24:ETSY ListingID  25:ETSY SKU
26:ETSY Title  27:ETSY Status  28:ETSY Price  29:ETSY URL
30:Template - Title Custom Intro
31:Template - Components Necklace Length Options
32:Template - Combined  33:Template - Tags  34:Current Tags  35:Listing Output
36:Added_Timestamp  37:Row_ID  38:API_Edit
39:EtsySync_Timestamp  40:EtsySync_UpdatedTimestamp  41:Template_Executed
```

**Removed columns:** Characters (dropped), Update Templates (dropped), Template - Why You will Love it (dropped)

**Legacy COL_MAP aliases kept for backward compat:** `Wide x Height`, `Chain Or Drop Length`

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
- Shown in form (last field in Row 7) -- auto-derived live as Type and Shape are selected
- User can edit the derived value before saving; whatever is in the field at Save time wins
- Derived as `{shape} {type plain name}` -- e.g. `Circle Earrings`, `Hexagon Pendant Necklace`
- Type plain name map: SET-PD=Pendant, SET-ER=Earrings, SET-BR=Bracelet, PD=Pendant Necklace, ER=Earrings, BR=Bracelet, RN=Ring, KC=Keychain, JD=Jewelry Dish, NK=Necklace, PKG=Gift Packaging
- On edit open: existing value pre-filled and marked as manualEdit so live-derive doesn't overwrite
- Fallback: if empty on new record at save time, derives from current Type + Shape

### Form Layout (5-column grid)
- Row 1: Type (span 2) / Shape / Material
- Row 2: Width x Height / Drop Length / Chain Length (necklaceOnly) / Extension Chain (necklaceOnly)
- Row 3: Chain Or Hardware (span 3) / Chain Length Config (necklaceOnly, span 1)
- Row 4: Chain/Bead/Clasp Details (full width)
- Row 5: Finish (full width)
- Row 6: Colors (full width)
- Row 7: Charm / Double Sided / Gift Box / Freebie / Object Description

### Detail View Layout
- **Physical Details:** Shape / Width x Height / Drop Length / Material / Colors / Description
- **Chain & Hardware:** Chain Or Hardware / Chain Length / Extension Chain / Chain Length Config / Chain/Bead/Clasp Details (full width) / Finish
- **Additional Details:** Charm / Double Sided / Gift Box / Freebie
- **Etsy Listing:** New Etsy SKU (ellipsis on overflow, hover for full) / Status / Added To Etsy / Etsy URL
- **SKU Group Components:** siblings list (double-click to edit)
- **Reference:** Photo Path (derived from PKG SKU, copyable) / Template - Combined / Template - Components Necklace Length Options

### Photo Path
- Displayed in Reference section, first item above Template - Combined
- Derived from PKG SKU: `C:\Users\jeral\Jewelry_Photos\_Listings\{packagingSKU}`
- Not stored in sheet -- computed at display time via string concatenation (not template literal)
- Copy button puts full Windows path on clipboard

### Gift Box
- Dropdown sourced from Findings_SKUs_Published where `Include In Add SKU Dropdown Form = Yes` AND `SKU starts with PKG`
- Stored value: PKG SKU string (e.g. `PKG-SML-GiftBox-Brown`)
- Detail view displays: `SKU -- Style` (e.g. `PKG-SML-GiftBox-Brown -- Small Jewelry Gift Boxes - Brown`)
- SKUs ending in `-Included` indicate the box is bundled in the price (for template use)
- Blank = no gift box

### Freebie
- Yes/No dropdown in form Row 7, right of Gift Box
- Stored in col 18; blank or "No" = not a freebie
- Shown in Additional Details section of detail view
- Use case: SET-BR or any component added as a bonus not included in price -- templates check this field

### Chain Or Hardware filtering by Type
| Type | Options shown |
|------|--------------|
| ER, SET-ER | EAR options only |
| KC | Keychain options only |
| BR, SET-BR | includes BRACELET; others exclude it |
| JD, PKG | disabled |
| All others | excludes EAR, Keychain, BRACELET |

### necklaceOnly Fields
Enabled only for NK, PD, SET-PD. Disabled and cleared on type change for all others:
- Chain Length (text input)
- Extension Chain (dropdown: blank / 0 / 1 / 1 1/2 / 2)
- Chain Length Config (dropdown)

### Finish
- Checkboxes: 11 base finishes + No Finish, alphabetical, 4 columns
- "Different Front/Back" toggle splits into Front/Back groups (2 cols each)
- New combos auto-written to Abbreviations_Published via addFinishAbbr (on Save only)
- "No Finish" is mutually exclusive with all other finishes; produces no finish segment in SKU
- Aluminum removed from checkboxes -- set automatically by material logic

### Material auto-finish rules
- Aluminum, Stainless Steel, Bead, Zinc Alloy, Memory Wire → finish forced to "No Finish", finish panel disabled

### Measurement Fields
- Width x Height, Drop Length, Chain Length: decimal input auto-converts to nearest 1/8 fraction on blur
- Width x Height supports WxH format (e.g. `2.5x2.5` → `2 1/2x2 1/2`)
- No inch symbol used -- all measurements assumed in inches
- Extension Chain options: blank / 0 / 1 / 1 1/2 / 2 (no " suffix)

### Colors
- Tag-input autocomplete widget; type partial name to filter
- Stored as full names comma-separated; abbreviations used in SKU
- Sourced from Abbreviations_Published Colors column

### Logging
- Persistent in-app log drawer: "◎ Log" button fixed bottom-right
- `appLog(level, ctx, msg, data)` -- levels: INFO / WARN / ERROR
- Always fires to browser console AND in-app drawer simultaneously
- Capped at 300 entries in memory; Copy All button exports full log as text
- `closeModal()` resets `editingId` to null (bug fix in v1.8.165)
- Key log contexts: `load` (CSV fetch/parse), `save` (full saveRecord flow), `modal` (open/close events)

### Other behaviors
- Search strips hyphens and spaces before comparing
- Type dropdown order matches Abbreviations_Published Type column order
- Double-click a component in SKU Group list → opens Edit modal for that component
- Sort: Default / Recently Edited / Least Recently Edited (by API_Edit; siblings grouped by max)
- SKU uniqueness check on Save -- blocks if PKG SKU or New ETSY SKU already used by a different group
- Default filter on load: Etsy Status = Active
- Jump Rings / Jump Ring Qty: hidden from detail view, data retained in sheet
- Edit modal blocked if record has no rowId (added in current session, not yet refreshed) -- must Refresh first

### Known TODOs
- Watch for SET-ER/ER records with non-empty Chain Length Config (data validation/audit feature)
- Characters column still exists in sheet -- to be dropped from sheet eventually (already not written by app)
- Auto-open after SET-ER save opens third modal with parentFound=false (benign but sloppy -- third modal has no valid parent context)

## Delivery Convention
- Filename: `JewelryInventory_vXXXXX.html` (forces fresh browser download)
- Versioning: three-digit `major.minor.patch`
- Each delivery: state version + one-line summary
- Apps Script file: `JewelryInventoryAPI.js` -- must be manually deployed after changes

## Mobile Phases (all complete as of v1.8.145)
- Phase 1 (v1.8.126): Single-pane navigation -- tap SKU shows detail, back button returns to list
- Phase 2 (v1.8.134): Filter drawer -- filters moved to #filterBar below header; toggleMobFilters()
- Phase 3 (v1.8.135): Modal height fix for iOS Safari
- Phase 4 (v1.8.139): Toast bottom offset for Safari toolbar

## Version Log (recent)
| Version | Change |
|---------|--------|
| v1.8.168 | Freebie Yes/No field (col 18); Gift Box → PKG dropdown (SKU stored, SKU--Style displayed); 5-col form grid; Photo Path backslash fix |
| v1.8.167 | SKU shape: use full name when fits within limit; SET uses FullPD-AbbrevER, falls back to AbbrevPD-AbbrevER |
| v1.8.166 | Photo Path in Reference section: derived from PKG SKU, copyable |
| v1.8.165 | Persistent in-app log drawer; structured logging throughout save/load/SET flows; closeModal resets editingId |
| v1.8.164 | Fix Chain Length (text input) necklaceOnly disable -- was only handled for sel type |
| v1.8.163 | Clear necklaceOnly fields on type change; fix Object Description derives from resolved shape |
| v1.8.162 | Chain Length field necklaceOnly -- disabled for non-NK/PD/SET-PD types |
| v1.8.161 | Fix Object Description live-derive fires on shape autocomplete selection not partial input |
| v1.8.160 | Sync column renames: Width x Height, Chain Length; drop Characters from write |
| v1.8.159 | New Etsy SKU ellipsis in detail view; Charm before Double Sided in Additional Details |
| v1.8.158 | Chain/Bead/Clasp Details placeholder: triangle frame -> geometric frame |
| v1.8.157 | Relabel Chain Or Drop Length to Chain Length in form and detail view |
| v1.8.156 | Detail view restructure: Shape first, new Additional Details section, Chain/Bead/Clasp Details full width |
| v1.8.155 | Fix Width x Height label; fraction conversion handles WxH format |
| v1.8.154 | Decimal-to-fraction conversion on blur for Width x Height, Drop Length, Chain Length; Extension Chain options updated |
| v1.8.153 | 4-col form: Drop Length field, Object Description live-derived + editable, Jump Rings hidden from detail view |
| v1.8.152 | CL segment for ER/SET-ER when chainDetail contains 'chain link'; combines with EB as EB-CL when both present |
| v1.8.151 | Fix SKU regen mode -- clear manualEdit flag on both SKU fields when blanked |
| v1.8.150 | SKU regen mode -- blank both SKU fields during edit to re-enable auto-populate |
| v1.8.149 | EB segment in SKU for ER/SET-ER when chainDetail contains 'bead' |
| v1.8.148 | Chain/Bead/Clasp Details placeholder updated |
| v1.8.147 | Expand Object Description auto-derive to all types |
| v1.8.146 | Auto-derive Object Description at save time |
| v1.8.145 | Fix desktop list item -- mobile flex+order restored |
| v1.8.140 | SKU uniqueness check on Save |
| v1.8.126 | Mobile phase 1: single-pane navigation |
| v1.8.124 | Sort dropdown: Default / Recently Edited / Least Recently Edited |
| v1.8.92 | Run Templates button in Reference section |
| v1.8.80 | Left pane shows Type plain name |
| v1.8.71 | PD type gets Chain Length Config + Extension Chain |
| v1.8.70 | Double-click left pane item opens edit modal |
| v1.8.46 | API_Edit column fix (removed duplicate doPost from Listings_Import.gs) |
| v1.8.45 | Row_ID UUID column added |
