# Jewelry Inventory App — Project Notes

## Quick Links
- **Live App**: https://jewelrybyjeralynn.github.io/jewelry-inventory/JewelryInventory.html
- **Repo**: https://github.com/jewelrybyjeralynn/jewelry-inventory
- **Apps Script**: https://script.google.com/macros/s/AKfycbwOZhzM_eUsSF9QuWdgblsEHVKWg2OIIGkvBC1Z6na58cGXDV3zd4ZA_nB19_caI22T/exec
- **Google Sheet**: https://docs.google.com/spreadsheets/d/1DYvbolWKTETkbyuVrMhjbmmjsIAaSfGAkM-IwNo7XFw/edit

---

## Current Version
**v1.8.112** — Always deliver new versions as `JewelryInventory_vXXXXX.html` to force fresh download, then rename to `JewelryInventory.html` before uploading to GitHub.

---

## 🟡 ACTIVE WORK — START HERE NEXT SESSION

### SET sibling edit bug — status as of v1.8.112

**Original symptom:** Editing a SET-ER overwrote both SET-PD and SET-ER rows with SET-ER data.

**Root cause found and fixed (this session):**
The Apps Script `append` action was using a hardcoded `HEADERS` array (36 columns) that was out of sync with the actual sheet (40 columns). This caused `Row_ID` and `API_Edit` to be written to the wrong columns on every append. Records had blank `Row_ID`, so Row_ID lookup failed silently and the fallback lookups were unreliable for SETs.

**Fixes deployed this session:**
1. **Apps Script append rewritten** -- now reads actual sheet headers at runtime instead of hardcoded `HEADERS` array. Immune to future column changes.
2. **KEY_MAP expanded** -- added all new columns: `Previous ETSY ListingID`, `Template - Combined`, `Current Tags`, `Listing Output`, `EtsySync_Timestamp`, `EtsySync_UpdatedTimestamp`.
3. **Third fallback improved** -- update action fallback is now PKG SKU + Type + Shape (was PKG SKU + Type only). Sends `_originalShape` captured at edit-open time.
4. **Object Description removed from form** -- no longer shown in Add/Edit modal. Value is preserved from the in-memory record on save so sheet data is not lost. Still used in search and detail view.
5. **Debug logging added to Apps Script** -- still present, remove after confirming SET edit bug is fully resolved.
6. **Test/debug functions removed from Apps Script** -- only `doPost`, `doGet`, `generateUUID` remain.

**What still needs testing:**
- Full SET sibling edit flow end-to-end with the new code. We confirmed Row_ID now writes correctly and single-record edits work. SET-ER edit has NOT been retested yet with v1.8.112 + new Apps Script.
- Once confirmed working, remove debug logging from Apps Script and redeploy.

**Next session action plan:**
1. Upload v1.8.112 HTML to GitHub, deploy new Apps Script
2. Add a test SET (SET-PD + SET-ER), hit Refresh, edit the SET-ER and save
3. Check the Debug sheet -- confirm only ONE POST fired with correct Row_ID and SET-ER data
4. Check the Google Sheet -- confirm only the SET-ER row was updated
5. If clean: remove debug logging from Apps Script, redeploy, done
6. If still broken: paste Debug sheet rows here and we diagnose

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

**Listings_Published columns (as of this session, 40 columns):**
```
Type, Shape, Packaging SKU, New ETSY SKU, Characters, Object Description,
Wide x Height, Material, Chain Or Hardware, Chain Or Drop Length,
Chain/Bead/Clasp Details, Extension Chain, Chain Length Config, Finish,
Colors, Charm, Double Sided, Gift Box, Added To Etsy, Jump Rings,
Jump Rings Qty, Old SKU, Previous ETSY ListingID, ETSY ListingID, ETSY SKU,
ETSY Title, ETSY Status, ETSY Price, ETSY URL, Template - Title Custom Intro,
Template - Components Necklace Length Options, Template - Combined,
Template - Tags, Current Tags, Listing Output, Added_Timestamp, Row_ID,
API_Edit, EtsySync_Timestamp, EtsySync_UpdatedTimestamp
```

**Note:** Apps Script now reads headers at runtime -- column position changes no longer break anything.

**Abbreviations_Published notes:**
- `Colors` column: 32 color entries (format: `ABBR = Full Name`)
- `Colors Backup` column: historical reference only
- `Finish` column includes `SKIP = No Finish`, Heat combos (HM, HC, HG, HR, HT), Solder+Heat combos (SHM, SHC, SHG, SHR)
- `Chain Metal` column includes `CB = Chain Beads`
- `Material` column: add new values and they appear in dropdown automatically
- No-finish materials: Aluminum, Stainless Steel, Bead, Zinc Alloy, Memory Wire

---

## Apps Script Actions

All POSTed as JSON with `Content-Type: text/plain` and `mode: no-cors`.

| Action | Description |
|--------|-------------|
| `append` | Add new row. Reads sheet headers at runtime. Sets Added_Timestamp, addedToEtsy=NOT LISTED, generates Row_ID UUID, sets API_Edit. |
| `update` | Update row by Row_ID (falls back to PKG SKU + Object Description, then PKG SKU + Type + Shape) |
| `updateSKU` | Update Packaging SKU + New ETSY SKU on ALL rows matching _oldPackagingSKU |
| `addFinishAbbr` | Append new finish abbreviation to Abbreviations_Published (on Save only) |

**Update payload fields sent by client:**
- `_action`: 'update'
- `_rowId`: UUID from in-memory record (primary lookup)
- `_originalDescription`: objectDescription at edit-open time (fallback 1)
- `_originalType`: type at edit-open time (fallback 2)
- `_originalShape`: shape at edit-open time (fallback 2, combined with type)
- `objectDescription`: preserved from original record (not from form)

### Pending Apps Script changes
- Remove debug logging once SET sibling edit is confirmed working

---

## SKU Format

```
TypeParent-Shape-ChainMetal[-CB]-FinishReadable[-Colors]   (Packaging SKU, max 38 chars)
TypeParent-Shape-ChainMetal[-CB]-FinishAbbr[-Colors]       (New ETSY SKU, max 32 chars)
```

- `CB` inserted after chain metal when type is PD/SET-PD AND chainDetail contains "bead"
- Colors capped at first 2 in selection order for SKU
- `SS` in SKU from chain metal abbreviation, not material/finish

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

**Object Description:** NOT in the form. Value is preserved from in-memory record on edit, blank on new adds. Still stored in sheet and shown in detail view.

### Shape Autocomplete
- startsWith matching against shapeAbbrevMap keys
- Arrow keys navigate, Enter selects highlighted or auto-selects single match
- Fully freeform -- any value accepted

### Finish
- 11 base checkboxes + No Finish
- Canonical sort ORDER: `Solder → Flame → Patina → Alcohol Ink → Heat → Copper → Clear → Gloss → Matte → Resin → UV Resin → No Finish`
- New combos written to sheet on Save only
- No Finish mutually exclusive with all others

### Chain Length Config options
Standard, Minor, Major, None

### Colors
Tag-input autocomplete. Stored as full names. First 2 colors used in SKU.

---

## Detail View

- Double-click left pane item → opens Edit modal
- Double-click SKU group component → opens Edit modal for that component
- Left panel subtitle: Shape · Type · Chain
- SKU group list: Type plain name + Shape · Wide x Height · Drop Length
- Click ◈ logo → clears search and resets detail pane

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

### 🟡 Confirm SET sibling edit bug fully resolved (see Active Work above)
### Mobile JS single-pane navigation (CSS done, JS pending)
### Run Templates integration (deferred -- see previous sessions for option 2 CORS details)
### Existing rows with blank Row_ID need UUIDs manually pasted in sheet (one-time cleanup)

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
| Template Runner separate | Keep in Google Sheets sidebar |

---

## Version Log (recent)

| Version | Change |
|---------|--------|
| v1.8.112 | Object Description removed from form; _originalShape added to update payload |
| v1.8.111 | (internal -- skipped in delivery) |
| v1.8.110 | (internal -- skipped in delivery) |
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

## Apps Script — current functions (production)
Only three functions in the script. No test/debug functions.
- `generateUUID()` -- generates UUID v4
- `doPost(e)` -- handles append, update, updateSKU, addFinishAbbr actions
- `doGet(e)` -- health check endpoint

---

## How to Resume in a New Session

1. Tell Claude: "Continue work on the Jewelry Inventory app"
2. Claude fetches: `https://raw.githubusercontent.com/jewelrybyjeralynn/jewelry-inventory/main/PROJECT_jewelryinventoryapi.md`
3. Upload current `JewelryInventory.html` for code changes
4. **Start with the ACTIVE WORK section**
