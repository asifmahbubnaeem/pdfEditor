import express from "express";
import multer from "multer";
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import cors from "cors";

const router = express.Router();

router.use(cors());

const upload = multer({ dest: "uploads/" });
const VENV = "/Users/Asif.Mahbub/myenv/bin/";

router.post("/convert-pdf-docx", upload.single("file"), (req, res) => {
  const inputPath = req.file.path;
  const outputPath = path.join("docx_converted", `${Date.now()}.docx`);
  fs.mkdirSync("docx_converted", { recursive: true });

  const command = `${VENV}python3 routes/convert_pdf_to_docx.py "${inputPath}" "${outputPath}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Conversion error: ${stderr}`);
      return res.status(500).json({ error: "Conversion failed" });
    }

    res.download(outputPath, "converted.docx", (err) => {
      if (err) console.error("Download error:", err);

      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath); // uncomment if you don’t want to keep docx
    });
  });
});

export default router;
