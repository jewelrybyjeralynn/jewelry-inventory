const SHEET_NAME = 'Listings_Published';

const KEY_MAP = {
  'Type': 'type',
  'Shape': 'shape',
  'Packaging SKU': 'packagingSKU',
  'New ETSY SKU': 'newEtsySKU',
  'Characters': 'characters',
  'Object Description': 'objectDescription',
  'Wide x Height': 'wideHeight',
  'Material': 'material',
  'Chain Or Hardware': 'chain',
  'Chain Or Drop Length': 'chainOrDropLength',
  'Chain/Bead/Clasp Details': 'chainDetail',
  'Extension Chain': 'extChainOption',
  'Chain Length Config': 'chainConfig',
  'Max Length': 'maxLength',
  'Finish': 'finish',
  'Colors': 'pieceColors',
  'Charm': 'charm',
  'Double Sided': 'doubleSided',
  'Gift Box': 'giftBox',
  'Added To Etsy': 'addedToEtsy',
  'Jump Rings': 'jumpRings',
  'Jump Rings Qty': 'jumpRingsQty',
  'Old SKU': 'oldSKU',
  'ETSY ListingID': 'etsyListingID',
  'Previous ETSY ListingID': 'previousEtsyListingID',
  'ETSY SKU': 'etsySKU',
  'ETSY Title': 'etsyTitle',
  'ETSY Status': 'etsyStatus',
  'ETSY Price': 'etsyPrice',
  'ETSY URL': 'etsyURL',
  'Update Templates': 'updateTemplates',
  'Template - Title Custom Intro': 'templateTitle',
  'Template - Components Necklace Length Options': 'templateComponents',
  'Template - Combined': 'templateCombined',
  'Template - Why You will Love it': 'templateWhyLove',
  'Template - Tags': 'templateTags',
  'Current Tags': 'currentTags',
  'Listing Output': 'listingOutput',
  'Added_Timestamp': 'addedTimestamp',
  'Row_ID': 'rowId',
  'API_Edit': 'apiEdit',
  'EtsySync_Timestamp': 'etsySyncTimestamp',
  'EtsySync_UpdatedTimestamp': 'etsySyncUpdatedTimestamp'
};

function generateUUID() {
  var d = new Date().getTime();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function doPost(e) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  try {

    // DEBUG LOGGING -- remove after bug is fixed
    try {
      var debugSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Debug');
      if (!debugSheet) debugSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Debug');
      debugSheet.appendRow([new Date().toISOString(), e.postData.contents]);
    } catch(de) {}
    // END DEBUG

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    var data = JSON.parse(e.postData.contents);
    var now = new Date().toISOString();

    if (data._action === 'update') {
      var allData = sheet.getDataRange().getValues();
      var headers = allData[0];
      var rowIdIdx = headers.indexOf('Row_ID');
      var pkgIdx = headers.indexOf('Packaging SKU');
      var descIdx = headers.indexOf('Object Description');
      var targetRow = -1;

      if (data._rowId && rowIdIdx !== -1) {
        for (var i = 1; i < allData.length; i++) {
          if (String(allData[i][rowIdIdx]).trim() === String(data._rowId).trim()) {
            targetRow = i + 1;
            break;
          }
        }
      }
      if (targetRow === -1) {
        for (var i2 = 1; i2 < allData.length; i2++) {
          if (String(allData[i2][pkgIdx]).trim() === String(data.packagingSKU).trim() &&
              String(allData[i2][descIdx]).trim() === String(data._originalDescription).trim()) {
            targetRow = i2 + 1;
            break;
          }
        }
      }
      if (targetRow === -1 && data._originalType) {
        var typeIdx = headers.indexOf('Type');
        var shapeIdx = headers.indexOf('Shape');
        for (var i3 = 1; i3 < allData.length; i3++) {
          var pkgMatch = String(allData[i3][pkgIdx]).trim() === String(data.packagingSKU).trim();
          var typeMatch = String(allData[i3][typeIdx]).trim() === String(data._originalType).trim();
          var shapeMatch = !data._originalShape || String(allData[i3][shapeIdx]).trim() === String(data._originalShape).trim();
          if (pkgMatch && typeMatch && shapeMatch) {
            targetRow = i3 + 1;
            break;
          }
        }
      }
      if (targetRow === -1) {
        output.setContent(JSON.stringify({status: 'error', message: 'Row not found: ' + data.packagingSKU + ' / ' + data._originalDescription}));
        return output;
      }
      for (var j = 0; j < headers.length; j++) {
        var key = KEY_MAP[headers[j]];
        if (key && key !== 'addedTimestamp' && key !== 'apiEdit' && key !== 'rowId') {
          if (data[key] !== undefined) {
            sheet.getRange(targetRow, j + 1).setValue(data[key] || '');
          }
        }
      }
      var apiEditIdx = headers.indexOf('API_Edit');
      if (apiEditIdx !== -1) sheet.getRange(targetRow, apiEditIdx + 1).setValue(now);
      output.setContent(JSON.stringify({status: 'ok', action: 'updated', row: targetRow}));
      return output;

    } else if (data._action === 'updateSKU') {
      var allData2 = sheet.getDataRange().getValues();
      var headers2 = allData2[0];
      var pkgIdx2 = headers2.indexOf('Packaging SKU');
      var etsyIdx2 = headers2.indexOf('New ETSY SKU');
      var apiEditIdx2 = headers2.indexOf('API_Edit');
      var updatedCount = 0;
      for (var k = 1; k < allData2.length; k++) {
        if (String(allData2[k][pkgIdx2]).trim() === String(data._oldPackagingSKU).trim()) {
          sheet.getRange(k + 1, pkgIdx2 + 1).setValue(data.packagingSKU);
          sheet.getRange(k + 1, etsyIdx2 + 1).setValue(data.newEtsySKU);
          if (apiEditIdx2 !== -1) sheet.getRange(k + 1, apiEditIdx2 + 1).setValue(now);
          updatedCount++;
        }
      }
      output.setContent(JSON.stringify({status: 'ok', action: 'updateSKU', rowsUpdated: updatedCount}));
      return output;

    } else if (data._action === 'addFinishAbbr') {
      var abbrevSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Abbreviations_Published');
      var abbrevData = abbrevSheet.getDataRange().getValues();
      var abbrevHeaders = abbrevData[0];
      var finIdx = -1;
      for (var f = 0; f < abbrevHeaders.length; f++) {
        if (String(abbrevHeaders[f]).trim().toLowerCase() === 'finish') { finIdx = f; break; }
      }
      if (finIdx !== -1) {
        var targetRow2 = -1;
        for (var m = 1; m < abbrevData.length; m++) {
          if (!abbrevData[m][finIdx]) { targetRow2 = m + 1; break; }
        }
        if (targetRow2 === -1) targetRow2 = abbrevData.length + 1;
        abbrevSheet.getRange(targetRow2, finIdx + 1).setValue(data.entry);
      }
      output.setContent(JSON.stringify({status: 'ok', action: 'addFinishAbbr'}));
      return output;

    } else {
      // APPEND -- read actual sheet headers at runtime, never use hardcoded positions
      var appendData = sheet.getDataRange().getValues();
      var appendHeaders = appendData[0];

      data.addedTimestamp = now;
      data.addedToEtsy = 'NOT LISTED';
      data.rowId = generateUUID();
      data.apiEdit = now;

      var row = [];
      for (var n = 0; n < appendHeaders.length; n++) {
        var appendKey = KEY_MAP[appendHeaders[n]];
        if (appendKey && data[appendKey] !== undefined) {
          row.push(data[appendKey]);
        } else {
          row.push('');
        }
      }
      sheet.appendRow(row);
      output.setContent(JSON.stringify({status: 'ok', action: 'appended'}));
      return output;
    }

  } catch(err) {
    output.setContent(JSON.stringify({status: 'error', message: err.message}));
    return output;
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({status: 'ok', message: 'Jewelry Inventory API running'}))
    .setMimeType(ContentService.MimeType.JSON);
}

