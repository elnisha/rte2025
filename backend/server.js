import express from "express";
import fs from "fs";
import cors from "cors";
import { spawn } from "child_process";


const app = express();
app.use(cors());
app.use(express.json());

const DB_PATH = "../frontend/src/db/db.json";

app.get("/templates", (req, res) => {
  const data = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  res.json(data);
});

app.post("/templates/:id", (req, res) => {
  const { id } = req.params;
  const updatedTemplate = req.body;
  const data = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  const index = data.findIndex(t => String(t.id) === id);

  if (index !== -1) {
    data[index] = updatedTemplate;
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    res.json({ message: "Template saved successfully!" });
  } else {
    res.status(404).json({ message: "Template not found" });
  }
});

app.post("/run-python", async (req, res) => {
  try {
    const { body } = req.body;
    console.log(" Received from frontend:", body);

    const bodyStr = JSON.stringify(body);
    // transcripcion string
    // lista 
    // direccion del pdf
    const process = spawn("python", ["run_script.py", bodyStr.transcription, bodyStr.template, bodyStr.pdf]);

    let output = "";
    let errorOutput = "";

    process.stdout.on("data", (data) => (output += data.toString()));
    process.stderr.on("data", (data) => (errorOutput += data.toString()));

    process.on("close", (code) => {
      console.log(` Python script finished with code ${code}`);
      if (errorOutput) console.error(" Python Error:", errorOutput);

      res.json({
        success: code === 0,
        output: output || errorOutput || "No output from Python",
      });
    });
  } catch (err) {
    console.error(" Error in /run-python:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(4000, () => console.log("Server running on port 4000"));
