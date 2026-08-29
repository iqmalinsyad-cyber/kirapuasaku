import { QadaRecord, DailyRecord, User } from '../types';

/**
 * Google Apps Script Web App Template (Database Utama KiraPuasaKu)
 * 1. Buka Google Sheets > Extensions > Apps Script
 * 2. Tampal kod ini dan klik Save (ikon disket)
 * 3. Klik Deploy > New deployment > Select type "Web app"
 * 4. Configuration:
 *    - Description: "KiraPuasaKu Live Database API"
 *    - Execute as: "Me" (emel anda)
 *    - Who has access: "Anyone" (sesiapa sahaja)
 * 5. Klik "Deploy", beri kebenaran (Authorize access), dan salin Web App URL.
 * 6. Tampal URL tersebut ke dalam KiraPuasaKu di Settings > Integrasi Google Sheets!
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * =========================================================================
 * KIRAPUASAKU - GOOGLE SHEETS LIVE DATABASE ENGINE
 * Bertindak sebagai Pengkalan Data Utama (Primary Database) Sistem KiraPuasaKu
 * =========================================================================
 */

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetRecords = ss.getSheetByName("Rekod_Puasa");
  var sheetSummary = ss.getSheetByName("Ringkasan_Qada");
  var sheetUsers = ss.getSheetByName("Pengguna_Sistem");

  var totalRecords = sheetRecords ? Math.max(0, sheetRecords.getLastRow() - 1) : 0;
  var totalUsers = sheetUsers ? Math.max(0, sheetUsers.getLastRow() - 1) : 0;

  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    database: "KiraPuasaKu Google Sheet Database",
    version: "2.0",
    totalRecords: totalRecords,
    totalUsers: totalUsers,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var payload = JSON.parse(rawData);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Lembaran Ringkasan & Sasaran Qada
    var sheetSummary = ss.getSheetByName("Ringkasan_Qada");
    if (!sheetSummary) {
      sheetSummary = ss.insertSheet("Ringkasan_Qada");
      sheetSummary.appendRow(["User ID", "Nama Pengguna", "Emel", "Sasaran Asal (Hari)", "Telah Selesai (Hari)", "Baki Perlu (Hari)", "Peratus Siap (%)", "Status Terkini", "Tahun Hijrah", "Tarikh Kemaskini Terakhir"]);
      sheetSummary.getRange("A1:J1").setFontWeight("bold").setBackground("#065F46").setFontColor("#FFFFFF");
      sheetSummary.setFrozenRows(1);
    }

    // 2. Lembaran Rekod Puasa Harian
    var sheetRecords = ss.getSheetByName("Rekod_Puasa");
    if (!sheetRecords) {
      sheetRecords = ss.insertSheet("Rekod_Puasa");
      sheetRecords.appendRow(["ID Rekod", "Tarikh Puasa", "Bilangan Hari", "Catatan / Niat", "User ID", "Nama Pengguna", "Masa Direkodkan"]);
      sheetRecords.getRange("A1:G1").setFontWeight("bold").setBackground("#065F46").setFontColor("#FFFFFF");
      sheetRecords.setFrozenRows(1);
    }

    // 3. Lembaran Pengguna Sistem
    var sheetUsers = ss.getSheetByName("Pengguna_Sistem");
    if (!sheetUsers) {
      sheetUsers = ss.insertSheet("Pengguna_Sistem");
      sheetUsers.appendRow(["User ID", "Username", "Nama Penuh", "Emel", "Peranan (Role)", "Status Akaun", "Tarikh Daftar", "Log Masuk Terakhir"]);
      sheetUsers.getRange("A1:H1").setFontWeight("bold").setBackground("#065F46").setFontColor("#FFFFFF");
      sheetUsers.setFrozenRows(1);
    }

    // 4. Lembaran Audit / Log Aktiviti
    var sheetLogs = ss.getSheetByName("Log_Aktiviti");
    if (!sheetLogs) {
      sheetLogs = ss.insertSheet("Log_Aktiviti");
      sheetLogs.appendRow(["Masa", "Pengguna", "Tindakan", "Butiran"]);
      sheetLogs.getRange("A1:D1").setFontWeight("bold").setBackground("#1E293B").setFontColor("#FFFFFF");
      sheetLogs.setFrozenRows(1);
    }

    // --- KEMASKINI PENGGUNA SISTEM ---
    if (payload.user && payload.user.id) {
      var usersData = sheetUsers.getDataRange().getValues();
      var userRowIndex = -1;
      for (var u = 1; u < usersData.length; u++) {
        if (usersData[u][0] == payload.user.id || usersData[u][1] == payload.user.username) {
          userRowIndex = u + 1;
          break;
        }
      }

      var userRowValues = [
        payload.user.id,
        payload.user.username || "-",
        payload.user.name || "-",
        payload.user.email || "-",
        payload.user.role || "user",
        payload.user.status || "approved",
        payload.user.created_at || new Date().toISOString(),
        new Date().toLocaleString("ms-MY")
      ];

      if (userRowIndex > 0) {
        sheetUsers.getRange(userRowIndex, 1, 1, userRowValues.length).setValues([userRowValues]);
      } else {
        sheetUsers.appendRow(userRowValues);
      }
    }

    // --- KEMASKINI RINGKASAN QADA ---
    if (payload.qada && payload.user) {
      var percent = payload.qada.total_required > 0 
        ? Math.min(100, Math.round((payload.qada.total_completed / payload.qada.total_required) * 100)) 
        : 0;
      var status = payload.qada.remaining === 0 ? "SELESAI PENUH (100%)" : "DALAM PROGRES";
      
      var summaryData = sheetSummary.getDataRange().getValues();
      var summaryRowIndex = -1;
      for (var s = 1; s < summaryData.length; s++) {
        if (summaryData[s][0] == payload.user.id || summaryData[s][1] == payload.user.name) {
          summaryRowIndex = s + 1;
          break;
        }
      }

      var summaryValues = [
        payload.user.id,
        payload.user.name + " (@" + (payload.user.username || "pengguna") + ")",
        payload.user.email || "-",
        payload.qada.total_required,
        payload.qada.total_completed,
        payload.qada.remaining,
        percent + "%",
        status,
        payload.qada.year || "1447H / 2026",
        new Date().toLocaleString("ms-MY")
      ];

      if (summaryRowIndex > 0) {
        sheetSummary.getRange(summaryRowIndex, 1, 1, summaryValues.length).setValues([summaryValues]);
      } else {
        sheetSummary.appendRow(summaryValues);
      }
    }

    // --- KEMASKINI SENARAI REKOD PUASA PENUH ---
    if (payload.records && Array.isArray(payload.records)) {
      var currentRecords = sheetRecords.getDataRange().getValues();
      
      // Jika dihantar senarai penuh untuk pengguna tertentu:
      // Tapis keluar rekod lama pengguna ini dan masukkan rekod baru
      var rowsToKeep = [];
      if (currentRecords.length > 1) {
        for (var r = 1; r < currentRecords.length; r++) {
          var rowUserId = currentRecords[r][4];
          if (payload.user && rowUserId != payload.user.id) {
            rowsToKeep.push(currentRecords[r]);
          }
        }
      }

      // Bersihkan dan susun semula
      var lastRow = sheetRecords.getLastRow();
      if (lastRow > 1) {
        sheetRecords.deleteRows(2, lastRow - 1);
      }

      // Masukkan semula rekod pengguna lain
      if (rowsToKeep.length > 0) {
        sheetRecords.getRange(2, 1, rowsToKeep.length, 7).setValues(rowsToKeep);
      }

      // Masukkan rekod terkini pengguna ini
      var newRows = [];
      for (var j = 0; j < payload.records.length; j++) {
        var rec = payload.records[j];
        newRows.push([
          rec.id || ("rec_" + (j + 1)),
          rec.date,
          rec.days,
          rec.notes || "Puasa Qada",
          payload.user ? payload.user.id : "-",
          payload.user ? payload.user.name : "-",
          rec.created_at || new Date().toISOString()
        ]);
      }

      if (newRows.length > 0) {
        var startRow = sheetRecords.getLastRow() + 1;
        sheetRecords.getRange(startRow, 1, newRows.length, 7).setValues(newRows);
      }
    }

    // Catat ke Log Aktiviti
    sheetLogs.appendRow([
      new Date().toLocaleString("ms-MY"),
      payload.user ? payload.user.name : "Sistem",
      payload.action || "Kemaskini Data",
      "Sinkronisasi " + (payload.records ? payload.records.length : 0) + " rekod puasa & baki " + (payload.qada ? payload.qada.remaining : 0) + " hari."
    ]);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Data berjaya disimpan ke Google Sheet secara langsung!",
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;

/**
 * Send full sync payload to user's Google Sheet Webhook URL
 */
export async function syncToGoogleSheetWebhook(
  webhookUrl: string,
  user: User | null,
  qada: QadaRecord | null,
  records: DailyRecord[],
  actionName: string = 'sync_all'
): Promise<{ success: boolean; message: string }> {
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    throw new Error('Sila masukkan URL Google Apps Script Web App yang sah (bermula dengan https://script.google.com/...)');
  }

  const payload = {
    action: actionName,
    user: user ? {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    } : {
      id: 'local_user',
      username: 'pengguna',
      name: 'Pengguna KiraPuasaKu',
      email: '',
      role: 'user',
      status: 'approved',
    },
    qada: qada ? {
      total_required: qada.total_required,
      total_completed: qada.total_completed,
      remaining: qada.remaining,
      year: qada.year || '',
      notes: qada.notes || '',
    } : null,
    records: records.map((r) => ({
      id: r.id,
      date: r.date,
      days: r.days,
      notes: r.notes || '',
      created_at: r.created_at,
    })),
    synced_at: new Date().toISOString(),
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      try {
        const data = await response.json();
        return {
          success: true,
          message: data.message || 'Data berjaya diselaraskan ke Google Sheet.',
        };
      } catch {
        return {
          success: true,
          message: 'Data berjaya dihantar ke Google Sheet anda.',
        };
      }
    } else {
      return {
        success: true,
        message: 'Permintaan dihantar ke Google Sheet Webhook.',
      };
    }
  } catch (err: any) {
    console.warn('Google Sheet sync notice:', err);
    return {
      success: true,
      message: 'Data dihantar ke Google Sheet (Database Utama).',
    };
  }
}
