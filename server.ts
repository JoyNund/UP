import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RECORDS_FILE = path.join(__dirname, "data.json");
const CONFIG_FILE = path.join(__dirname, "config.json");

async function ensureFiles() {
  try {
    await fs.access(RECORDS_FILE);
  } catch {
    await fs.writeFile(RECORDS_FILE, JSON.stringify([], null, 2));
  }
  try {
    await fs.access(CONFIG_FILE);
  } catch {
    const defaultConfig = {
      areas: [
        { id: "adm-pre", name: "Atención Admisión Pregrado" },
        { id: "pre", name: "Atención al Usuario de Pregrado" },
        { id: "post", name: "Atención al Usuario de Postgrado" },
        { id: "idiomas-si", name: "Idiomas - Sede San Isidro" },
        { id: "idiomas-mf", name: "Idiomas - Sede Miraflores" }
      ],
      assistants: [
        { id: "ed-chavez", name: "Ed Chavez", areaId: "adm-pre", active: true, role: "DEVELOPER" },
        { id: "astrid", name: "Astrid Neira", areaId: "adm-pre", active: true, role: "COLABORADOR" },
        { id: "lia", name: "Lía Najarro", areaId: "adm-pre", active: true, role: "COLABORADOR" },
        { id: "precilia", name: "Precilia Yupanqui", areaId: "adm-pre", active: true, role: "COLABORADOR" },
        { id: "colab1-si", name: "Colaborador 1 - SI", areaId: "idiomas-si", active: true, role: "COLABORADOR" },
        { id: "colab1-mf", name: "Colaborador 1 - MF", areaId: "idiomas-mf", active: true, role: "COLABORADOR" },
      ],
      indicators: [
        { key: 'presencial', label: 'Bmatic', active: true, iconName: 'Building2' },
        { key: 'correo', label: 'Correo', active: true, iconName: 'Mail' },
        { key: 'llamadasEntrantes', label: 'Llam. Entr.', active: true, iconName: 'PhoneCall' },
        { key: 'llamadasSalientes', label: 'Llam. Sal.', active: true, iconName: 'PhoneCall' },
        { key: 'salesforce', label: 'Salesforce', active: true, iconName: 'Database' },
        { key: 'asesoriaEducativa', label: 'Drive', active: true, iconName: 'FileSpreadsheet' },
        { key: 'satisfactionHappy', label: '😊 Excelente', active: true, group: 'CSAT', iconName: 'CheckCircle2' },
        { key: 'satisfactionNeutral', label: '😐 Regular', active: true, group: 'CSAT', iconName: 'AlertCircle' },
        { key: 'satisfactionSad', label: '☹️ Mala', active: true, group: 'CSAT', iconName: 'Trash2' },
      ]
    };
    await fs.writeFile(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
  }
}

async function startServer() {
  await ensureFiles();
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Config API
  app.get("/api/config", async (req, res) => {
    const data = await fs.readFile(CONFIG_FILE, "utf-8");
    res.json(JSON.parse(data));
  });

  app.post("/api/config", async (req, res) => {
    await fs.writeFile(CONFIG_FILE, JSON.stringify(req.body, null, 2));
    res.json({ status: "ok" });
  });

  // Records API
  app.get("/api/records", async (req, res) => {
    const data = await fs.readFile(RECORDS_FILE, "utf-8");
    res.json(JSON.parse(data));
  });

  app.post("/api/records", async (req, res) => {
    const newRecord = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), ...req.body };
    const data = JSON.parse(await fs.readFile(RECORDS_FILE, "utf-8"));
    data.push(newRecord);
    await fs.writeFile(RECORDS_FILE, JSON.stringify(data, null, 2));
    res.status(201).json(newRecord);
  });

  app.delete("/api/records/:id", async (req, res) => {
    const data = JSON.parse(await fs.readFile(RECORDS_FILE, "utf-8"));
    const filtered = data.filter((r: any) => r.id !== req.params.id);
    await fs.writeFile(RECORDS_FILE, JSON.stringify(filtered, null, 2));
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
