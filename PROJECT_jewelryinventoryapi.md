# Jewelry Inventory App — Project Notes

## Quick Links
- **Live App**: https://jewelrybyjeralynn.github.io/jewelry-inventory/JewelryInventory.html
- **Repo**: https://github.com/jewelrybyjeralynn/jewelry-inventory
- **Apps Script**: https://script.google.com/macros/s/AKfycbwOZhzM_eUsSF9QuWdgblsEHVKWg2OIIGkvBC1Z6na58cGXDV3zd4ZA_nB19_caI22T/exec
- **Google Sheet**: https://docs.google.com/spreadsheets/d/1DYvbolWKTETkbyuVrMhjbmmjsIAaSfGAkM-IwNo7XFw/edit

---

## Current Version
**v1.8.109** — Always deliver new versions as `JewelryInventory_vXXXXX.html` to force fresh download, then rename to `JewelryInventory.html` before uploading to GitHub.

---

## 🔴 ACTIVE BUG — TOP PRIORITY NEXT SESSION

### SET sibling update overwrites wrong row
**Symptom:** Editing a SET-ER and saving causes both SET-PD and SET-ER records to be overwritten with SET-ER data. Both rows in the sheet end up as SET-ER.

**What we know:**
- Both records have valid Row_IDs
- The rowId block (v1.8.109) did not fire -- meaning `original.rowId` was populated
- So Row_ID lookup in Apps Script should have worked -- but both rows got overwritten
- `Object.assign(targetRec, rec)` on line 1907 mutates the in-memory record -- since siblings share array references, this may be corrupting both sibling objects before the POST fires
- Apps Script `update` action only updates one row (by Row_ID) -- so the sheet corruption may be coming from the in-memory mutation causing a second write, or the wrong row being targeted

**Suspected root cause:** `targetRec` found via sibling search points to the same object reference that exists in the `_siblings` array. `Object.assign(targetRec, rec)` overwrites it in place. If `rec` contains the wrong `type` or data, and if somehow two POSTs fire, both rows get corrupted.

**Things to investigate next session:**
1. Add console logging to confirm exactly which `_id` and `rowId` are being sent in the UPDATE payload
2. Check if `Object.assign(targetRec, rec)` is needed at all before the POST -- it updates in-memory but the real source of truth is the sheet
3. Check if the Apps Script is receiving two separate update calls
4. Consider separating in-memory update (after successful POST) from the POST itself

**Workaround for now:** After editing a SET component, immediately hit Refresh to reload from sheet before editing any other component in the same SET.

---

## Architecture

Single HTML/JS/CSS file, no server, no build step. Client-side only.

- **Data reads**: Google Sheets published CSVs (3 tabs, auto-publish on save)
- **Data writes**: Google Apps Script Web App via no-cors POST
- **Left pane**: SKU list grouped by Packaging SKU (siblings share a group)
- **Right pane**: Detail view (click item to show)
- **Modal**: Add New SKU / Add Component / Edit SKU

### Important: One doPost per Apps Script project
Never add a second .gs file with its own `doPost` to the JewelryInventoryAPI project. It will override the main doPost and break all writes.

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

**Listings_Published columns (0-indexed, as of v45):**
```
0:Type  1:Shape  2:Packaging SKU  3:New ETSY SKU  4:Characters
5:Object Description  6:Wide x Height  7:Material  8:Chain Or Hardware
9:Chain Or Drop Length  10:Chain/Bead/Clasp Details  11:Extension Chain
12:Chain Length Config  13:Finish  14:Colors  15:Charm  16:Double Sided
17:Gift Box  18:Added To Etsy  19:Jump Rings  20:Jump Rings Qty  21:Old SKU
22:ETSY ListingID  23:ETSY SKU  24:ETSY Title  25:ETSY Status  26:ETSY Price
27:ETSY URL  28:Update Templates  29:Template - Title Custom Intro
30:Template - Components Necklace Length Options  31:Template - Combined
32:Template - Tags  33:Added_Timestamp (note: col shifted from original)
35:Added_Timestamp  36:Row_ID  37:API_Edit
```

**Note:** Column structure shifted when Template - Combined was added at col 31. COL_MAP uses header name lookup so this is handled automatically.

**Abbreviations_Published notes:**
- `Colors` column: 32 color entries (format: `ABBR = Full Name`)
- `Colors Backup` column: historical reference only
- `Finish` column includes `SKIP = No Finish`, Heat combos (HM, HC, HG, HR, HT), Solder+Heat combos (SHM, SHC, SHG, SHR)
- `Chain Metal` column includes `CB = Chain Beads`
- `Material` column: add new values here and they appear in the dropdown automatically
- No-finish materials: Aluminum, Stainless Steel, Bead, Zinc Alloy, Memory Wire

---

## Apps Script Actions

All POSTed as JSON with `Content-Type: text/plain` and `mode: no-cors`.

| Action | Description |
|--------|-------------|
| `append` | Add new row. Sets Added_Timestamp, addedToEtsy=NOT LISTED, generates Row_ID UUID, sets API_Edit |
| `update` | Update row by Row_ID (falls back to PKG SKU + Object Description, then PKG SKU + Type) |
| `updateSKU` | Update Packaging SKU + New ETSY SKU on ALL rows matching _oldPackagingSKU |
| `addFinishAbbr` | Append new finish abbreviation to Abbreviations_Published (on Save only) |

### Pending Apps Script change (not yet deployed)
Add Type-based fallback to `doPost` update action. After the existing PKG SKU + description fallback, add:
```javascript
if (targetRow === -1 && data._originalType) {
  var typeIdx = headers.indexOf('Type');
  for (var i3 = 1; i3 < allData.length; i3++) {
    if (String(allData[i3][pkgIdx]).trim() === String(data.packagingSKU).trim() &&
        String(allData[i3][typeIdx]).trim() === String(data._originalType).trim()) {
      targetRow = i3 + 1;
      break;
    }
  }
}
```

### Row_ID
- Every row should have a UUID in `Row_ID`
- New rows get UUID from Apps Script on append (but no-cors means app never sees it)
- Records added in current session have no rowId in memory until Refresh
- v1.8.109 blocks edit save if rowId is missing -- forces Refresh first
- v1.8.108 clears localStorage addedRecords on Refresh so CSV rowIds take over
- `_originalType` now sent with update payload for fallback matching

---

## SKU Format

```
TypeParent-Shape-ChainMetal[-CB]-FinishReadable[-Colors]   (Packaging SKU, max 38 chars)
TypeParent-Shape-ChainMetal[-CB]-FinishAbbr[-Colors]       (New ETSY SKU, max 32 chars)
```

- `CB` inserted after chain metal when type is PD/SET-PD AND chainDetail contains "bead"
- Colors capped at first 2 in selection order for SKU (full list stored in Colors column)
- `SS` in SKU always comes from chain metal abbreviation, not material/finish

---

## SET Component Logic

1. SET-PD saved first — solo SKU generated
2. First non-PD component saved — combined SKU generated, updateSKU updates all rows
3. Additional components (3+) — inherit existing locked SKU
4. `hasNonPD` check includes the parent record itself
5. Warning fires on Type change if non-PD selected without existing SET-PD
6. Save blocked if no SET-PD sibling exists

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

## Form Fields (Add/Edit Modal)

Row order:
1. Type · Shape (autocomplete) · Material
2. Wide x Height · Chain Or Drop Length · Extension Chain
3. Chain Or Hardware · Chain Length Config
4. Chain/Bead/Clasp Details (full width)
5. Finish checkboxes
6. Colors (tag-input)
7. Charm · Double Sided · Gift Box

Object Description: hidden field (not shown, value preserved on edit)

### Shape Autocomplete
- startsWith matching against shapeAbbrevMap keys
- Arrow keys navigate, Enter selects highlighted item or auto-selects if exactly one match
- Fully freeform -- any value accepted

### Finish
- 11 base checkboxes + No Finish
- Canonical sort ORDER: `Solder → Flame → Patina → Alcohol Ink → Heat → Copper → Clear → Gloss → Matte → Resin → UV Resin → No Finish`
- New combos written to sheet on Save only (not on checkbox click)
- No Finish mutually exclusive with all others

### Material Auto-Finish
Aluminum, Stainless Steel, Bead, Zinc Alloy, Memory Wire → finish panel disabled, stores No Finish

### Chain Length Config options
Standard, Minor, Major, None

### Colors
Tag-input autocomplete. Stored as full names. First 2 colors used in SKU abbreviation.

---

## Detail View

- Single-click left pane → selects SKU
- Double-click left pane → opens Edit modal
- Single-click SKU group component → switches detail view
- Double-click SKU group component → opens Edit modal for that component
- Left panel subtitle: Shape · Type · Chain
- SKU group list shows: Type plain name + Shape · Wide x Height · Drop Length
- Chain & Hardware order: Chain Or Hardware | Chain Or Drop Length | Extension Chain | Chain/Bead/Clasp Details
- Click ◈ Jewelry Inventory logo → clears search and resets detail pane

---

## Reference Section

1. Template - Combined (Copy button only, no text displayed)
2. Template - Components Necklace Length Options (pre-wrap)
3. Template - Tags (pre-wrap)
4. Features & Details (if populated)

`window.__templateCombined` and `window.__currentPackagingSKU` set on every detail view load.
Template Runner kept separate in Google Sheets sidebar.

---

## Search

- startsWith not used -- includes matching
- Strips hyphens and spaces for fuzzy matching
- Searches: Packaging SKU, New ETSY SKU, Object Description, Finish, Colors, Chain
- Old SKU excluded from search

---

## To-Do / Pending

### 🔴 SET sibling edit bug (HIGH PRIORITY)
See ACTIVE BUG section above.

### Run Templates Integration (deferred)
Goal: integrate TemplateRunner into inventory app.
Current state: Template Runner stays in Google Sheets sidebar.
See previous project file for full option 2 (CORS) details if revisiting.

### Mobile JS single-pane navigation
CSS done, JS not yet wired up.

---

## Decisions Log

| Decision | Rationale |
|----------|-----------|
| Single HTML file | No build step; deploy = upload one file to GitHub |
| no-cors POST | GitHub Pages can't proxy; Apps Script accepts no-cors |
| Row_ID UUID | Reliable row lookup; description fallback unreliable for SETs |
| Block edit if no rowId | Prevents wrong row update when record added before refresh |
| Clear localStorage on Refresh | Ensures CSV rowIds take over in-memory records |
| CB in SKU | Track chain beads for PD/SET-PD when chainDetail contains "bead" |
| 2-color SKU cap | Prevents SKU length overflow; full list in Colors column |
| startsWith shape matching | Prevents false matches (e.g. Square matching "re") |
| Finish sort hardcoded ORDER | finishOptions-derived sort unreliable when CSV stale |
| addFinishAbbr on Save only | Partial combos written on checkbox click caused bad data |
| Old SKU excluded from search | Caused false positives (e.g. "set" matching old ER SKUs) |
| Template Runner separate | Can't auto-open sidebar from URL; keep in Google Sheets |
| Object Description hidden | Removed from form but preserved in data for Apps Script fallback |

---

## Version Log (recent)

| Version | Change |
|---------|--------|
| v1.8.109 | Block edit save if record has no rowId -- forces Refresh first |
| v1.8.108 | Fix isRefresh not defined error in buildData |
| v1.8.107 | Clear localStorage addedRecords on Refresh so CSV rowIds are used |
| v1.8.106 | Add _originalType to update payload for Apps Script row disambiguation |
| v1.8.105 | Shape autocomplete: startsWith matching + Enter auto-selects single match |
| v1.8.104 | Shape autocomplete: Enter only selects when highlighted via arrow key |
| v1.8.103 | Shape autocomplete: arrow keys + Enter to select |
| v1.8.102 | Chain Length Config options: Standard, Minor, Major, None |
| v1.8.101 | SKU color abbreviations capped at first 2 colors |
| v1.8.100 | Shape field autocomplete from Abbreviations_Published Shape column |
| v1.8.99  | Fix CB -- chainDetail missing from autoPopulateSKU component objects |
| v1.8.98  | Form: swapped Chain Length Config and Extension Chain positions |
| v1.8.97  | CB (Chain Beads) added to SKU for PD/SET-PD with beads in chain detail |
| v1.8.96  | Form reordered: Object Description hidden, Chain/Bead/Clasp Details full width |
| v1.8.95  | Template - Combined label above Copy button, left-aligned |
| v1.8.94  | Removed Open Template Runner button |
| v1.8.93  | Open Template Runner button (reverted) |
| v1.8.92  | Run Templates button (removed) |
| v1.8.91  | Template - Combined button first in Reference section |
| v1.8.90  | Fix Template - Combined copy button |
| v1.8.89  | Template - Combined button only, no text display |
| v1.8.88  | Reference: Template - Combined with Copy button |
| v1.8.87  | Reference: added Template - Title Custom Intro (later removed) |
| v1.8.86  | Template fields preserve newline formatting for copy-paste |
| v1.8.85  | Reference: removed Old SKU, added Components + Tags template fields |
| v1.8.84  | Memory Wire added to no-finish material list |
| v1.8.83  | Old SKU excluded from search |
| v1.8.82  | Left panel list order: Shape · Type · Chain |
| v1.8.81  | SKU group component list: Wide x Height before Chain Or Drop Length |
| v1.8.80  | SKU group component list shows Type + Shape |
| v1.8.79  | SKU group component list shows Type plain name |
| v1.8.78  | Fix logo clear search |
| v1.8.77  | Logo click clears detail pane |
| v1.8.76  | Click logo to clear search box |
| v1.8.75  | New finish combos write on Save only |
| v1.8.74  | Fix finish sort ORDER: Heat before Clear/Gloss/Matte |
| v1.8.73  | Replace Satin with Heat in finish list |
| v1.8.72  | Fix SET-BR SKU lock |
| v1.8.71  | PD type gets Chain Length Config + Extension Chain |
| v1.8.70  | Double-click left pane SKU opens edit modal |
| v1.8.69  | sortFinishParts uses hardcoded ORDER |
| v1.8.50  | Colors: tag-input autocomplete widget |
| v1.8.47  | Extension Chain before Chain/Bead/Clasp Details in detail view |

---

## How to Resume in a New Session

1. Tell Claude: "Continue work on the Jewelry Inventory app"
2. Claude fetches: `https://raw.githubusercontent.com/jewelrybyjeralynn/jewelry-inventory/main/PROJECT_jewelryinventoryapi.md`
3. Upload current `JewelryInventory.html` for code changes
4. **Start with the ACTIVE BUG** -- SET sibling edit overwrites wrong row
