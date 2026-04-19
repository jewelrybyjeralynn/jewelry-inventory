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

## 🔴 ACTIVE BUG — START HERE NEXT SESSION

### SET sibling edit overwrites wrong row

**Symptom:** Editing a SET-ER and saving causes both SET-PD and SET-ER rows in the sheet to be overwritten with SET-ER data. Both rows end up as SET-ER.

**What we confirmed:**
- Both records had valid Row_IDs (manually pasted UUIDs) -- bug still occurred
- So Row_ID lookup IS working -- but both rows still got corrupted
- This means Row_ID is NOT the root cause
- Object Description is not a reliable fix either -- too many duplicate descriptions (e.g. "Rectangle Pendant Flame Matte" across many pieces)

**Current suspects:**
1. **In-memory mutation:** `Object.assign(targetRec, rec)` on line 1907 in saveRecord(). Since siblings share array references in `_siblings`, mutating `targetRec` may corrupt the sibling object in memory too. This explains visual corruption but not sheet corruption.
2. **Two POSTs firing:** Something may be triggering two separate update POSTs -- one for each sibling. Need to verify.
3. **Wrong data in payload:** `rec` object built from form fields may contain wrong type/data due to hidden field issues.

**We are flying blind because no-cors blocks the Apps Script response.**

---

### 🔵 NEXT SESSION ACTION PLAN (do in this order)

#### Step 1: Add debug logging to Apps Script (5 minutes, zero risk)
Add a Debug sheet tab. In `doPost`, before processing any action, write the full incoming payload to the Debug sheet:

```javascript
// Add at top of doPost try block, before any action processing:
try {
  var debugSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Debug');
  if (!debugSheet) debugSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Debug');
  debugSheet.appendRow([new Date().toISOString(), e.postData.contents]);
} catch(de) {}
```

Re-deploy Apps Script after adding this. Then reproduce the bug and immediately check the Debug sheet to see:
- How many rows were written (1 or 2 POSTs?)
- What `_rowId`, `type`, `packagingSKU` values were sent
- Whether the payload contains SET-ER or SET-PD data

This will definitively tell us the root cause.

#### Step 2: Based on debug findings, fix accordingly
**If two POSTs are firing:** find what's triggering the second one and remove it.

**If one POST with wrong data:** fix the form field collection in `saveRecord()` -- the `rec` object may be picking up stale DOM values.

**If correct POST but wrong row updated:** fix Apps Script row lookup logic.

#### Step 3: Client-side UUID generation (eliminates rowId gap, do regardless of Step 2 findings)
Instead of Apps Script generating the Row_ID on append, generate it client-side and send it in the payload. Apps Script writes whatever rowId it receives. This means the app has the rowId immediately after append -- no Refresh needed before editing.

In the inventory app, change the append path in `saveRecord()`:
```javascript
// Generate UUID client-side before append
rec.rowId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
  var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
  return v.toString(16);
});
```

Then store it on the in-memory record after append:
```javascript
rec._id = Date.now();
// rowId already set above -- store it on the record
```

In Apps Script `doPost` append branch, change:
```javascript
data.rowId = generateUUID(); // REMOVE THIS
// Just use whatever data.rowId was sent -- client generated it
```

Zero risk -- no CORS changes, no new deployment behavior. Just moves UUID generation from server to client.

#### Step 4: Remove the rowId block (v1.8.109)
Once Step 3 is done, the block that prevents editing newly added records is no longer needed -- remove it.

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
32:Template - Tags  35:Added_Timestamp  36:Row_ID  37:API_Edit
```

**Note:** Column structure shifted when Template - Combined added at col 31. COL_MAP uses header name lookup so handled automatically.

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
| `append` | Add new row. Sets Added_Timestamp, addedToEtsy=NOT LISTED, generates Row_ID UUID, sets API_Edit |
| `update` | Update row by Row_ID (falls back to PKG SKU + Object Description, then PKG SKU + Type) |
| `updateSKU` | Update Packaging SKU + New ETSY SKU on ALL rows matching _oldPackagingSKU |
| `addFinishAbbr` | Append new finish abbreviation to Abbreviations_Published (on Save only) |

### Pending Apps Script changes (not yet deployed)
1. Debug logging (Step 1 above) -- add before next bug reproduction
2. Type-based fallback in update action:
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
3. Client-side UUID: remove `data.rowId = generateUUID()` from append branch -- use client-sent rowId instead

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

Object Description: hidden field (not shown, value preserved on edit)

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

### 🔴 SET sibling edit bug (HIGH PRIORITY -- see top of file)
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
| Object Description hidden | Removed from form, not reliable as key for SETs |
| Template Runner separate | Keep in Google Sheets sidebar |

---

## Version Log (recent)

| Version | Change |
|---------|--------|
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
2. Claude fetches: `https://raw.githubusercontent.com/jewelrybyjeralynn/jewelry-inventory/main/PROJECT_jewelryinventoryapi.md`
3. Upload current `JewelryInventory.html` for code changes
4. **Start with the ACTIVE BUG section and follow the Next Session Action Plan**
