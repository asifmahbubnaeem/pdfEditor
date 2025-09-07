// server.js

import express from "express";
import path from "path";
import multer from "multer";
import cors from "cors";
import { exec } from "child_process";
import Redis from "ioredis";
import  fs from "fs";
import  fsp from "fs/promises";
import  https from "https";
import { PDFDocument, degrees } from 'pdf-lib';
// import { router } from './auth';

const app = express();
const upload = multer({ dest: "uploads/" });
const uploadDoc = multer({
  dest: "uploads/",
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/msword", // .doc
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" // .docx
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only .doc or .docx files are allowed"));
    }
    cb(null, true);
  },
});


const storage = multer.memoryStorage();
const uploadToDelete = multer({storage: storage});


const redis = new Redis(); // default: 127.0.0.1:6379

const CLEANUP_TIME = 600000
const sslOptions={
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.cert')
};

const allowedOrigin = ["http://localhost:5173", "http://localhost:4173"];
app.use(cors({
    origin: allowedOrigin,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

// app.use("/api/auth", authRoutes);

// app.use(cors);

const RATE_LIMIT = 5;       
const WINDOW_SEC = 60;

const rateLimiter = async (req, res, next) => {
  try {
    const userKey = req.body.userId;
    const count = await redis.incr(userKey);

    if (count === 1) {
      await redis.expire(userKey, WINDOW_SEC);
    }

    if (count > RATE_LIMIT) {
      const ttl = await redis.ttl(userKey);
      return res.status(429).json({
        retryAfter: ttl,
        error: "Rate limit exceeded. Try again later.",
      });
    }

    next();
  } catch (err) {
    console.error("Rate limiter error:", err);
    res.status(500).json({ error: "Internal rate limiter error" });
  }
};

// -------- Encrypt PDF --------
app.post("/api/encrypt", upload.single("file"), rateLimiter, (req, res) => {
  const password = req.body.password;
  const inputPath = req.file.path;
  const outputPath = `encrypted_${Date.now()}.pdf`;

    if (!inputPath || !password) {
      return res.status(400).send("File and password are required");
    }

  exec(`qpdf --encrypt ${password} ${password} 256 -- "${inputPath}" "${outputPath}"`, (err) => {
    if (err) {
      console.error("Encryption failed:", err);
      return res.status(500).json({ error: "Encryption failed" });
    }
    res.download(outputPath);
  });
});

// -------- Decrypt PDF --------
app.post("/api/decrypt", upload.single("file"), rateLimiter, (req, res) => {
  const password = req.body.password;
  const inputPath = req.file.path;
  const outputPath = `decrypted_${Date.now()}.pdf`;

  exec(`qpdf --password=${password} --decrypt "${inputPath}" "${outputPath}"`, (err) => {
    if (err) {
      console.error("Decryption failed:", err);
      return res.status(500).json({ error: "Decryption failed" });
    }
    res.download(outputPath);
  });
});

function getDeletedPages(deletedPagesAsStr){

  let arr = deletedPagesAsStr.trim().split(',');
  // const numArr = arr.map(Number);
  const numArr=[];

  arr.forEach(item => {
    if(item.includes('-'))
    {
      const [startStr, endStr] = item.split('-');
      const start = parseInt(startStr.trim(), 10);
      const end = parseInt(endStr.trim(), 10);

      for(let i=start; i<=end; i++)
        numArr.push(i);
    }
    else{
      numArr.push(parseInt(item.trim(),10));
    }

  });
  return numArr;
}



app.post("/api/compress-pdf", upload.single("file"), rateLimiter, async (req, res) => {

  const inputPath = req.file.path;
  const compress_quality = req.body.compress_quality;
  const outputPath = `compressed_${Date.now()}.pdf`;

  exec(`gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/${compress_quality} -dNOPAUSE -dQUIET -dBATCH -sOutputFile=${outputPath} ${inputPath}`,

    (err) => {
        if(err) return res.status(500).json({error: "Compression failed."});

        res.download(outputPath, () => {
            fs.unlinkSync(inputPath);
            fs.unlinkSync(outputPath);
        });
    });

});

function getNumericOrder(pageOrder){
  let arr = pageOrder.trim().split(',');
  const numArr=arr.map(Number);
  return numArr;
}

app.post("/api/delete-pages", uploadToDelete.single("file"), rateLimiter, async(req, res) =>{

    try{

      if(!req.file){
        return res.status(400).json({error: "Please upload a file"});
      }

      const inputPath = req.file.path;
      const outputDir = path.join(process.cwd(), "delete_action");
      const outputPath = path.join(outputDir,`delete_update_${Date.now()}.pdf`);

      const existingPdfBytes = await req.file.buffer;//arrayBuffer();
      const deletedPages = getDeletedPages(req.body.deleted_page_no);
      console.log(deletedPages);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const newPdf = await PDFDocument.create();

      const pageCount = pdfDoc.getPageCount();
      console.log(pageCount);

      for(let i=0; i<pageCount; i++)
      {
        const pg_num = i+1;
        if (!deletedPages.includes(pg_num)){
          const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
          newPdf.addPage(copiedPage);
        }
      }

      const pdfBytes = await newPdf.save();

      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
      fs.writeFileSync(outputPath, pdfBytes);

      res.download(outputPath, outputPath, (err) => {
            if(err)console.log("Error downloading updated (with deleted page) pdf file: ",outputPath);
            // fs.unlinkSync(outputPath);
        });
      console.log("downloaded updated (with deleted pages) pdf");

    }catch(err){
      console.error("Detele action error: ",err);
      res.status(500).json({error: "Failed to perform delete action."})
    }
});

function getPageNumbers(pageNum){
  if(pageNum.length==0)
    return [];
  const arr = pageNum.split(',');
  return arr.map(Number);
}


function reConstructMap(strRotation){

  const parsedArray = JSON.parse(strRotation);
  const reconstructedMap = new Map(parsedArray);

  return reconstructedMap;
}

app.post("/api/page-del-rotation", uploadToDelete.single("file"),rateLimiter, async (req, res) => {

    try{

      if(!req.file){
        return res.status(400).json({error: "No input file found"});
      }
        const inputPath = req.file.path;
        const outputDir = path.join(process.cwd(), "rotation_action");
        const outputPath = path.join(outputDir,`rotation_update_${Date.now()}.pdf`);


        const rotationInfo =  reConstructMap(req.body.rotationInfo);
        const deletedPageNo =  getPageNumbers(req.body.deletedPage);

        const existingPdfBytes = await req.file.buffer;
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const newPdf = await PDFDocument.create();

        const pageCount = pdfDoc.getPageCount();

        for(let i=0; i<pageCount; i++)
        {
          let pg_num = i+1;
          if(!deletedPageNo.includes(pg_num)){
            const [copiedPage] = await newPdf.copyPages(pdfDoc,[i]);

            if(rotationInfo.has(pg_num))
              copiedPage.setRotation(degrees(rotationInfo.get(pg_num)));
            newPdf.addPage(copiedPage);
          }

        }

        const pdfBytes = await newPdf.save();


        if(!fs.existsSync(outputDir))
          fs.mkdirSync(outputDir);
        fs.writeFileSync(outputPath, pdfBytes);


        res.download(outputPath, outputPath, (err) => { 
            if(err)
              console.log("Error downloading pdf file ", outputPath);
        });
        console.log("Download successful.")

    }catch(err){
      console.error("Rotation delete action error: ",err);
      res.status(500).json({error: "Failed to process rotation/delete update."})
    }

});

app.post("/api/page-rearrange", uploadToDelete.single("file"), rateLimiter, async (req, res) => {

  try{

    if(!req.file){
      return res.status(400).json({error: "No input file found"});
    }

    const inputPath = req.file.path;
    const outputDir = path.join(process.cwd(), "reorder_action");
    const outputPath = path.join(outputDir,`reorder_update_${Date.now()}.pdf`);

    const pageOrder = getNumericOrder(req.body.newPageOrder);
    const existingPdfBytes = await req.file.buffer;
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const newPdf = await PDFDocument.create();

    const copiedPages = await newPdf.copyPages(
        pdfDoc,
        pageOrder.map((n) => n - 1) // convert to 0-based index
    );

    copiedPages.forEach((page) => newPdf.addPage(page));
    const pdfBytes = await newPdf.save();

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
      fs.writeFileSync(outputPath, pdfBytes);

    res.download(outputPath, outputPath, (err) => {
          if(err)console.log("Error downloading reordered pdf file: ",outputPath);
          fs.unlinkSync(outputPath);
      });
    console.log("downloaded reordered updated pdf");

  }catch(err){
    console.error("Re-arrange action error: ", err);
    res.status(500).json({error: "Failed to re-arrange action"});
  }

});

app.post("/api/convert-img", upload.single("file"), rateLimiter, async(req, res) =>{

  try{
    if(!req.file){
      return res.status(400).json({error: "Please upload a file"});
      if(!(req.path.toLowerCase().endsWith('.jpg') || req.path.toLowerCase().endsWith('.jpeg') || req.path.toLowerCase().endsWith('.png')))
      {
          return res.status(400).json({error: "Please upload a valid image file (.jpg/.jpeg/png)"});
      }
    }

    const inputPath = req.file.path;
    const outputDir = path.join(process.cwd(), "converted_img");
    const outputPath = path.join(outputDir,`converted_img_${Date.now()}.pdf`);
    
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const imageBytes = await fsp.readFile(req.file.path);
    let image;
    console.log(inputPath)

    if (req.body.fileType === 'jpg')
      image = await pdfDoc.embedJpg(imageBytes);
    if (req.body.fileType === 'png')
      image = await pdfDoc.embedPng(imageBytes);

    let scale_val = 1.0;
    if(image.width>550 || image.height>800)
    {
        scale_val = 0.5;
    }
    const imageDims = image.scale(scale_val);

    // console.log("imageDim: w, h", imageDims.width, imageDims.height);
    // console.log("page: w, h", page.getWidth(), page.getHeight());

    page.drawImage(image, {
        x: page.getWidth() / 2 - imageDims.width / 2,
        y: page.getHeight() / 2 - imageDims.height / 2,
        width: imageDims.width,
        height: imageDims.height,
    });

    const pdfBytes = await pdfDoc.save();
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    fs.writeFileSync(outputPath, pdfBytes);

    res.download(outputPath, outputPath, (err) => {
      if(err)console.log("Error downloading img to pdf converted file: ",outputPath);
      fs.unlinkSync(outputPath);
    });
    console.log("downloaded image");

  }catch(err){
    console.error("Image to Pdf conversion error: ",err);
    res.status(500).json({error: "Failed to convert from image to pdf."})

  }


});

app.post("/api/merge-pdfs", upload.array("pdfs"), rateLimiter, async (req, res) =>{

  try {
    if (!req.files || req.files.length < 2) {
      return res.status(400).json({ error: "Please upload at least two PDF files" });
    }

    
    const mergedPdf = await PDFDocument.create();
    
    for (let file of req.files) {
      const fileBuffer = fs.readFileSync(file.path);
      const pdf =  await PDFDocument.load(fileBuffer);

      // console.log(pdf.getPageCount());
      const pageIndices = Array.from({ length: pdf.getPageCount() }, (_, i) => i);
      const copiedPages = await mergedPdf.copyPages(pdf, pageIndices);
      await copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedPdfBytes = await mergedPdf.save();

    const outputDir = path.join(process.cwd(), "merged");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

    // Unique file name
    const outputFile = path.join(outputDir, `merged_${Date.now()}.pdf`);
    fs.writeFileSync(outputFile, mergedPdfBytes);

    // Cleanup uploaded files
    req.files.forEach((file) => fs.unlinkSync(file.path));

    res.download(outputFile, "merged.pdf", (err) => {
      if (err) console.error("Download error:", err);
      // Delete merged file after sending
      fs.unlinkSync(outputFile);
    });
    // res.download(outputFile);
    console.log("downloaded")

  } catch (err) {
    console.error("Merge error:", err);
    res.status(500).json({ error: "Failed to merge PDF files" });
  }
  
});


app.post("/api/convert", uploadDoc.single("file"), rateLimiter, (req, res) => {
  const inputPath = req.file.path;
  
  const ext = path.extname(req.file.originalname) || ".docx";
  const safeInputPath = inputPath + ext;
  fs.renameSync(inputPath, safeInputPath);

  const outputDir = path.join(process.cwd(), "converted");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
  // LibreOffice command
  exec(`soffice --headless --convert-to pdf --outdir ${outputDir} "${safeInputPath}"`, (err) => {
    if (err) {
      console.error("DOC to PDF conversion failed:", err);
      return res.status(500).json({ error: "Conversion failed" });
    }

    
    const files = fs.readdirSync(outputDir);
      console.log("Files in converted/:", files);

      // Try to find the most recent file
      const pdfs = files.filter((f) => f.endsWith(".pdf"));
      if (pdfs.length === 0) {
        return res.status(500).json({ error: "Output PDF not found" });
      }

      const latestPdf = pdfs
          .map((f) => ({
            name: f,
            time: fs.statSync(path.join(outputDir, f)).mtime.getTime(),
          }))
          .sort((a, b) => b.time - a.time)[0].name;

      const outputPath = path.join(outputDir, latestPdf);
      console.log("Sending:", outputPath);

    res.download(outputPath, (downloadErr) => {
      if (downloadErr) {
        console.error("Download error:", downloadErr);
        res.status(500).json({ error: "Download failed" });
      }

      //Clean up
      const now = Date.now();
      const allPdfs = fs.readdirSync(outputDir)
      .map(f => path.join(outputDir, f))
      .filter(f => f.endsWith(".pdf"));

      const validPdfs = [];
      allPdfs.forEach(f=>{
        const stats = fs.statSync(f);

        if (now - stats.mtimeMs > CLEANUP_TIME){

          fs.unlinkSync(f);
          console.log(`Deleted expired file: ${path.basename(f)}`);
        }
        else{
          validPdfs.push(f);
        }
      });
      // End of clean up
    });
  });
});

const PORT = process.env.PORT || 3000;
https.createServer(sslOptions, app).listen(PORT, ()=> console.log(`Backend running on https://localhost:${PORT}`))

