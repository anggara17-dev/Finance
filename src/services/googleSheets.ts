
/**
 * Client-side Google Sheets Service
 * This replaces the need for a separate backend when running on GitHub Pages
 */

const GOOGLE_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const GOOGLE_DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

export async function findSpreadsheet(token: string) {
  const query = encodeURIComponent("name = 'FinSheet - Accounting Database' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
  const url = `${GOOGLE_DRIVE_API_BASE}/files?q=${query}&fields=files(id, name)&pageSize=1`;
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(`Google Drive Error (${res.status}): ${errData.error?.message || res.statusText}`);
  }
  const data = await res.json();
  return data.files || [];
}

export async function createSpreadsheet(token: string) {
  const url = GOOGLE_API_BASE;
  const body = {
    properties: { title: "FinSheet - Accounting Database" },
    sheets: [
      { properties: { title: "INPUT" } },
      { properties: { title: "REKAP" } },
      { properties: { title: "LABA_RUGI" } },
      { properties: { title: "NERACA" } },
    ],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(`Google Sheets Error (${res.status}): ${errData.error?.message || res.statusText}`);
  }
  const spreadsheet = await res.json();
  const spreadsheetId = spreadsheet.spreadsheetId;

  // Initialize headers
  await updateSheetValues(spreadsheetId, "INPUT!A1:I1", [
    ["Date", "Month", "Quarter", "Category", "Account", "Description", "Debit", "Kredit", "Timestamp"]
  ], token);

  return spreadsheet;
}

export async function readSheetValues(spreadsheetId: string, range: string, token: string) {
  const url = `${GOOGLE_API_BASE}/${spreadsheetId}/values/${range}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(`Google Sheets Error (${res.status}): ${errData.error?.message || res.statusText}`);
  }
  return await res.json();
}

export async function appendSheetValues(spreadsheetId: string, range: string, values: any[][], token: string) {
  const url = `${GOOGLE_API_BASE}/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify({ values })
  });
  
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(`Google Sheets Error (${res.status}): ${errData.error?.message || res.statusText}`);
  }
  return await res.json();
}

export async function updateSheetValues(spreadsheetId: string, range: string, values: any[][], token: string) {
  const url = `${GOOGLE_API_BASE}/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { 
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify({ values })
  });
  
  if (!res.ok) throw new Error("Gagal memperbarui data spreadsheet");
  return await res.json();
}
