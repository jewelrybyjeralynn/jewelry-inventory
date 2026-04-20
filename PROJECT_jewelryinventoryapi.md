# Jewelry Inventory App — Project Notes

## Quick Links
- **Live App**: https://jewelrybyjeralynn.github.io/jewelry-inventory/JewelryInventory.html
- **Repo**: https://github.com/jewelrybyjeralynn/jewelry-inventory
- **Apps Script**: https://script.google.com/macros/s/AKfycbwOZhzM_eUsSF9QuWdgblsEHVKWg2OIIGkvBC1Z6na58cGXDV3zd4ZA_nB19_caI22T/exec
- **Google Sheet**: https://docs.google.com/spreadsheets/d/1DYvbolWKTETkbyuVrMhjbmmjsIAaSfGAkM-IwNo7XFw/edit

---

## Current Version
**v1.8.119** — Always deliver new versions as `JewelryInventory_vXXXXX.html` to force fresh download, then rename to `JewelryInventory.html` before uploading to GitHub.

---

## 🟡 ACTIVE WORK — START HERE NEXT SESSION

### SET sibling edit bug — status as of v1.8.119

**Original symptom:** Editing a SET-ER overwrote both SET-PD and SET-ER rows with SET-ER data.

**Root cause found and fixed:**
Apps Script append used a hardcoded HEADERS array (36 columns) out of sync with the actual sheet (39 columns). Row_ID and API_Edit wrote to wrong columns on every append. Records had blank Row_ID, so all fallback lookups were unreliable for SETs.

**All fixes deployed:**
1. Apps Script append now reads actual sheet headers at runtime
2. Third fallback: PKG SKU + Type + Shape (sends _originalShape captured at edit-open)
3. Object Description removed from form; preserved from in-memory record on save
4. updateSKU now fires on edit when PKG SKU changes (was new-add only)
5. Debug logging still present in Apps Script -- remove after confirming SET edit is fully clean

**What still needs verification:**
- Full SET sibling edit end-to-end with current code. Single-record edits confirmed working. SET-ER edit not yet retested after all fixes.
- Once confirmed: remove debug logging from Apps Script, redeploy.

**Next session action plan:**
1. Add a test SET (SET-PD + SET-ER), Refresh, edit the SET-ER and save
2. Check Debug sheet -- confirm one POST, correct Row_ID, SET-ER data only
3. Check sheet -- confirm only SET-ER row updated
4. If clean: remove debug logging, redeploy Apps Script, done
5. If broken: paste Debug sheet rows and diagnose

### One-time sheet cleanup needed
- Delete FLMMTTRES entry from Abbreviations_Published (bad abbrev written before getFinishAbbr fix)
- Existing rows with blank Row_ID need UUIDs manually pasted in sheet

---

## Architecture

Single HTML/JS/CSS file, no server, no build step. Client-side only.

- **Data reads**: Google Sheets published CSVs (3 tabs, auto-publish on save)
- **Data writes**: Google Apps Script Web App via no-cors POST
- **Left pane**: SKU list grouped by Packaging SKU (siblings share a group)
- **Right pane**: Detail view (click item to show)
- **Modal**: Add New SKU / Add Component / Edit SKU

### Important: One doPost per Apps Script project
Never add a second .gs file with its own doPost to the JewelryInventoryAPI project. It will override the main doPost and break all writes.

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

**Listings_Published columns (as of v1.8.119, 41 columns):**
```
0:Type  1:Shape  2:Packaging SKU  3:New ETSY SKU  4:Characters
5:Object Description  6:Wide x Height  7:Material  8:Chain Or Hardware
9:Chain Or Drop Length  10:Chain/Bead/Clasp Details  11:Extension Chain
12:Chain Length Config  13:Finish  14:Colors  15:Charm  16:Double Sided
17:Gift Box  18:Added To Etsy  19:Jump Rings  20:Jump Rings Qty  21:Old SKU
22:Previous ETSY ListingID  23:ETSY ListingID  24:ETSY SKU  25:ETSY Title
26:ETSY Status  27:ETSY Price  28:ETSY URL  29:Template - Title Custom Intro
30:Template - Components Necklace Length Options  31:Template - Combined
32:Template - Tags  33:Current Tags  34:Listing Output  35:Added_Timestamp
36:Row_ID  37:API_Edit  38:EtsySync_Timestamp  39:EtsySync_UpdatedTimestamp
40:Template_Executed
```

**Template_Executed:** Used by the external template runner process. Not written or read by the inventory app.

**Note:** Apps Script reads headers at runtime -- column position changes no longer break anything.

**Data analysis note:** Exclude rows where Added To Etsy = SOLD. Those pieces are gone, data won't be maintained.

**Abbreviations_Published notes:**
- Colors column: 32 color entries (format: ABBR = Full Name)
- Colors Backup column: historical reference only
- Finish column includes SKIP = No Finish, Heat combos (HM, HC, HG, HR, HT), Solder+Heat combos (SHM, SHC, SHG, SHR)
- Front/Back combos: only (Back) is annotated in the abbrev full name -- (Front) is stripped from non-minority parts (e.g. FMFR = Flame & Matte(Front) & Resin(Back))
- Chain Metal column includes CB = Chain Beads
- Material column: add new values and they appear in dropdown automatically
- No-finish materials: Aluminum, Stainless Steel, Bead, Zinc Alloy, Memory Wire

---

## Apps Script Actions

All POSTed as JSON with Content-Type: text/plain and mode: no-cors.

| Action | Description |
|--------|-------------|
| append | Add new row. Reads sheet headers at runtime. Sets Added_Timestamp, addedToEtsy=NOT LISTED, generates Row_ID UUID, sets API_Edit |
| update | Update row by Row_ID (falls back to PKG SKU + Object Description, then PKG SKU + Type + Shape) |
| updateSKU | Update Packaging SKU + New ETSY SKU on ALL rows matching _oldPackagingSKU. Fires on new SET component add AND on edit when PKG SKU changes |
| addFinishAbbr | Append new finish abbreviation to Abbreviations_Published (on Save only) |

**Update payload fields sent by client:**
- _action: 'update'
- _rowId: UUID from in-memory record (primary lookup)
- _originalDescription: objectDescription at edit-open time (fallback 1)
- _originalType: type at edit-open time (fallback 2)
- _originalShape: shape at edit-open time (fallback 2, combined with type)
- objectDescription: preserved from original record (not from form)

### Apps Script functions (production -- no test/debug functions)
- generateUUID() -- generates UUID v4
- doPost(e) -- handles all actions
- doGet(e) -- health check

### Pending Apps Script changes
- Remove debug logging once SET sibling edit confirmed working

---

## SKU Format

```
TypeParent-Shape-ChainMetal[-CB]-FinishReadable[-Colors]   (Packaging SKU, max 38 chars)
TypeParent-Shape-ChainMetal[-CB]-FinishAbbr[-Colors]       (New ETSY SKU, max 32 chars)
```

- CB inserted after chain metal when type is PD/SET-PD AND chainDetail contains "bead"
- Colors capped at first 2 in selection order for SKU
- SS in SKU from chain metal abbreviation, not material/finish

---

## SET Component Logic

1. SET-PD saved first -- solo SKU generated
2. First non-PD component saved -- combined SKU generated, updateSKU updates all rows
3. Additional components (3+) -- inherit existing locked SKU
4. hasNonPD check includes the parent record itself
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
3. Chain Or Hardware (span 2) · Chain Length Config
4. Chain/Bead/Clasp Details (full width)
5. Finish checkboxes
6. Colors (tag-input)
7. Charm · Double Sided · Gift Box

Object Description: NOT in the form. Preserved from in-memory record on edit, blank on new adds. Still stored in sheet, shown in detail view, used in search.

### Shape Autocomplete
- startsWith matching against shapeAbbrevMap keys
- Arrow keys navigate, Enter selects highlighted or auto-selects single match
- Fully freeform -- any value accepted

### Chain Or Hardware
- Type-to-search combo box with keyboard support (arrow keys, Enter, Escape)
- Enter selects single result or highlighted result

### Finish
- 11 base checkboxes + No Finish
- Canonical sort ORDER: Solder > Flame > Patina > Alcohol Ink > Heat > Copper > Clear > Gloss > Matte > Resin > UV Resin > No Finish
- New combos written to sheet on Save only
- No Finish mutually exclusive with all others
- getFinishAbbr() lookup order: (1) exact match, (2) normalized match stripping redundant (Front) annotations, (3) concatenate individual abbreviations

### Chain Length Config options
Standard, Standard & Max Length, Minor, Minor & Max Length, Major, Major & Max Length, None

### Colors
Tag-input autocomplete. Stored as full names. First 2 colors used in SKU.

---

## Detail View

- Double-click left pane item -> opens Edit modal
- Double-click SKU group component -> opens Edit modal for that component
- Left panel subtitle: Shape · Type · Chain
- SKU group list: Type plain name + Shape · Wide x Height · Drop Length
- Click logo -> clears search and resets detail pane

---

## Reference Section

1. Template - Combined (Copy button only)
2. Template - Components Necklace Length Options (pre-wrap)
3. Template - Tags (pre-wrap)
4. Features & Details (if populated)

---

## Search
- includes matching with hyphen/space normalization
- Searches: Packaging SKU, New ETSY SKU, Object Description, Finish, Colors, Chain
- Old SKU excluded

---

## To-Do / Pending

### Confirm SET sibling edit bug fully resolved (see Active Work above)
### Delete FLMMTTRES from Abbreviations_Published (one-time manual cleanup)
### Existing rows with blank Row_ID need UUIDs manually pasted in sheet (one-time cleanup)
### SKU uniqueness check on Save (client-side)
- On Save (both new add and edit), before posting to Apps Script, scan in-memory data for any row where Packaging SKU or New ETSY SKU matches the value being saved AND that row belongs to a different packaging group (i.e., different sibling cluster -- not sharing the same PKG SKU)
- If collision found: block save, show inline warning identifying the conflicting SKU
- No server-side check needed -- solo user, in-memory data is authoritative for the session
### Mobile JS single-pane navigation (CSS done, JS pending)
### Run Templates integration (deferred -- see previous sessions for option 2 CORS details)

---

## Decisions Log

| Decision | Rationale |
|----------|-----------|
| Single HTML file | No build step |
| no-cors POST | GitHub Pages can't proxy |
| Row_ID UUID | Reliable row lookup |
| Block edit if no rowId | Prevents wrong row update |
| Clear localStorage on Refresh | CSV rowIds take over |
| CB in SKU | Track chain beads for PD/SET-PD |
| 2-color SKU cap | Prevents length overflow |
| startsWith shape matching | Prevents false matches |
| Finish sort hardcoded ORDER | finishOptions-derived sort unreliable when CSV stale |
| addFinishAbbr on Save only | Partial combos caused bad data |
| Old SKU excluded from search | False positives on ER records |
| Object Description removed from form | Not reliable as lookup key for SETs; too many duplicates |
| Object Description preserved on save | Still stored in sheet, shown in detail view, used in search |
| Apps Script append uses runtime headers | Hardcoded HEADERS array caused Row_ID to write to wrong column when sheet columns changed |
| Third fallback: PKG SKU + Type + Shape | More unique than Type alone; _originalShape captured at edit-open time |
| updateSKU on edit PKG SKU change | Previously only fired on new SET component add |
| getFinishAbbr normalized lookup | Strips redundant (Front) to match existing abbrevs like FMFR before falling back to concatenation |
| Chain Length Config includes Max Length variants | Standard/Minor/Major each have & Max Length option instead of separate column |
| SKU uniqueness check client-side only | Solo user; in-memory data authoritative for session; no-cors blocks server response anyway |
| Template Runner separate | Keep in Google Sheets sidebar |

---

## Version Log (recent)

| Version | Change |
|---------|--------|
| v1.8.119 | getFinishAbbr: normalized (Front) lookup before fallback concatenation |
| v1.8.118 | Fix dangling else in saveRecord FIELDS loop |
| v1.8.117 | Chain Length Config: added Standard/Minor/Major & Max Length options; removed Max Length column |
| v1.8.116 | Max Length: revert -- bad layout, replaced by Chain Length Config options |
| v1.8.115 | Max Length checkbox field added to form (reverted next version) |
| v1.8.114 | updateSKU fires on edit when PKG SKU changes (was new-add only) |
| v1.8.113 | Chain Or Hardware: Enter/arrow key navigation |
| v1.8.112 | Object Description removed from form; _originalShape added to update payload |
| v1.8.111 | Apps Script: append uses runtime headers; third fallback PKG SKU + Type + Shape; debug logging added; test functions removed |
| v1.8.109 | Block edit save if record has no rowId |
| v1.8.108 | Fix isRefresh not defined in buildData |
| v1.8.107 | Clear localStorage addedRecords on Refresh |
| v1.8.106 | Add _originalType to update payload |
| v1.8.105 | Shape: startsWith + Enter auto-selects single match |
| v1.8.104 | Shape: Enter only selects when highlighted |
| v1.8.103 | Shape autocomplete: arrow keys + Enter |
| v1.8.102 | Chain Length Config: Standard, Minor, Major, None |
| v1.8.101 | SKU colors capped at first 2 |
| v1.8.100 | Shape field autocomplete |
| v1.8.99  | Fix CB -- chainDetail missing from autoPopulateSKU |
| v1.8.98  | Form: swap Chain Length Config and Extension Chain |
| v1.8.97  | CB chain beads in SKU for PD/SET-PD |
| v1.8.96  | Form reordered: Object Description hidden, Chain/Bead/Clasp full width |
| v1.8.95  | Template - Combined label above Copy button |
| v1.8.91  | Template - Combined button first in Reference |
| v1.8.90  | Fix Template - Combined copy button |
| v1.8.89  | Template - Combined button only, no text |
| v1.8.88  | Reference: Template - Combined with Copy |
| v1.8.86  | Template fields pre-wrap for copy-paste |
| v1.8.85  | Reference: removed Old SKU, added template fields |
| v1.8.84  | Memory Wire added to no-finish materials |
| v1.8.83  | Old SKU excluded from search |
| v1.8.82  | Left panel: Shape · Type · Chain |
| v1.8.79  | SKU group list: Type plain name |
| v1.8.76  | Click logo to clear search |
| v1.8.75  | addFinishAbbr on Save only |
| v1.8.74  | Fix finish sort ORDER |
| v1.8.73  | Replace Satin with Heat |
| v1.8.72  | Fix SET-BR SKU lock |
| v1.8.71  | PD gets Chain Length Config + Extension Chain |
| v1.8.70  | Double-click left pane opens edit |
| v1.8.69  | Hardcoded finish sort ORDER |
| v1.8.50  | Colors tag-input widget |

---

## How to Resume in a New Session

1. Tell Claude: "Continue work on the Jewelry Inventory app"
2. Claude fetches: https://raw.githubusercontent.com/jewelrybyjeralynn/jewelry-inventory/main/PROJECT_jewelryinventoryapi.md
3. Upload current JewelryInventory.html for code changes
4. Start with the ACTIVE WORK section
