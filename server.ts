import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to handle Google Sheets operations
  // We expect the access token to be passed from the client in the Authorization header
  app.post("/api/sheets/query", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Missing authorization header" });

    const accessToken = authHeader.replace("Bearer ", "");
    const { spreadsheetId, range, action, values } = req.body;

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const sheets = google.sheets({ version: "v4", auth });

    try {
      if (action === "read") {
        const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
        res.json(response.data);
      } else if (action === "append") {
        const response = await sheets.spreadsheets.values.append({
          spreadsheetId,
          range,
          valueInputOption: "USER_ENTERED",
          requestBody: { values },
        });
        res.json(response.data);
      } else if (action === "update") {
        const response = await sheets.spreadsheets.values.update({
          spreadsheetId,
          range,
          valueInputOption: "USER_ENTERED",
          requestBody: { values },
        });
        res.json(response.data);
      } else if (action === "create") {
        const spreadsheet = await sheets.spreadsheets.create({
          requestBody: {
            properties: { title: "FinSheet - Accounting Database" },
            sheets: [
              { properties: { title: "INPUT" } },
              { properties: { title: "REKAP" } },
              { properties: { title: "LABA_RUGI" } },
              { properties: { title: "NERACA" } },
            ],
          },
        });
        
        // Initialize headers
        const sheets_v2 = google.sheets({ version: "v4", auth });
        await sheets_v2.spreadsheets.values.update({
          spreadsheetId: spreadsheet.data.spreadsheetId!,
          range: "INPUT!A1:G1",
          valueInputOption: "RAW",
          requestBody: {
             values: [["Date", "Category", "Description", "Type", "Amount", "Quarter", "Timestamp"]]
          }
        });

        res.json(spreadsheet.data);
      }
    } catch (error: any) {
      console.error("Sheets API Error:", error.response?.data || error.message);
      res.status(500).json({ error: error.response?.data || error.message });
    }
  });

  // Search for an existing FinSheet database
  app.get("/api/sheets/find", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Missing authorization header" });

    const accessToken = authHeader.replace("Bearer ", "");
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const drive = google.drive({ version: "v3", auth });

    try {
      const response = await drive.files.list({
        q: "name = 'FinSheet - Accounting Database' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
        fields: "files(id, name)",
        pageSize: 1,
      });
      res.json(response.data.files || []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
