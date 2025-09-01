import React, { useState, useRef } from "react";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
// import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.js?url";
import { generateUserId } from "../utils/Common";

import PageLayout from "../components/PageLayout";
import NavBar from "../components/NavBar";

GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function App() {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(null);
  const [password, setPassword] = useState("");
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || "https://localhost:3000";

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function () {
      const typedArray = new Uint8Array(this.result);
      
      try{
        const pdf = await getDocument({ data: typedArray }).promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setPageNum(1);
        renderPage(1, pdf);
        document.getElementById("encrypt_btn").disabled = false;
        document.getElementById("decrypt_btn").disabled = true;
      }catch(err){
        const canvas = canvasRef.current;
        canvas.width = 0;
        canvas.height = 0;
        setPdfDoc(null);
        setNumPages(0);
        setPageNum(0);
        document.getElementById("encrypt_btn").disabled = true;
        document.getElementById("decrypt_btn").disabled = false;
        console.log("inside exception pdf load");
      }

    };
    reader.readAsArrayBuffer(file);
  };

  const renderPage = async (num, pdf = pdfDoc) => {
    if (!pdf) return;
    const page = await pdf.getPage(num);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport }).promise;
  };

  const nextPage = () => {
    if (pageNum < numPages) {
      const newPage = pageNum + 1;
      setPageNum(newPage);
      renderPage(newPage);
    }
  };

  const prevPage = () => {
    if (pageNum > 1) {
      const newPage = pageNum - 1;
      setPageNum(newPage);
      renderPage(newPage);
    }
  };

  const HandleRateLimit = (data) =>{
      setCooldown(data.retryAfter);
      let remaining = data.retryAfter;
      const interval = setInterval(() => {
        remaining -= 1;
        setCooldown(remaining);
        if (remaining <= 0) {
          clearInterval(interval);
        }
      }, 1000);
  }


  // -------- Convert DOC/DOCX to PDF --------
  const handleConvert = async () => {
  const file = fileInputRef.current.files[0];
  if (!file) return alert("Upload DOC/DOCX first!");

  const formData = new FormData();
  const userId = generateUserId();
  formData.append("file", file);
  formData.append("userId", userId);

  try {
    const response = await fetch(`${API_URL}/api/convert`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {

      if (response.status === 429) {
          const data = await response.json();
          HandleRateLimit(data);
          return;
        }

      throw new Error("Conversion failed");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name.replace(/\.(docx|doc)$/i, ".pdf");
    a.click();
    // window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
};




  return (
    <PageLayout>
      <NavBar />
      <div className="p-6 text-center" style={{border: "2px solid #000", borderRadius: "15px", padding: "10px"}}>
        <h2 className="text-2xl font-bold mb-4" style={{color: "green"}}>Convert DOC to PDF</h2>
        <p>Upload your DOC file to convert it into PDF.</p>
        <input
          style={{color: "blue", fontSize: "16px"}}
          type="file"
          accept=".doc,.docx"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="mb-4"/>
        <button id="encrypt_btn"
                  style={{backgroundColor: "gray", border: "1px solid black", fontSize: "16px"}}
                  onClick={handleConvert}
                  disabled={cooldown>0}
                  className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50">
                  {"Convert To PDF"}
        </button>
        {cooldown > 0 && (
          <p style={{ color: "red", marginTop: "10px" }}>
            Too many requests. Please wait {cooldown} seconds...
          </p>
        )}
      </div>
    </PageLayout>
  );
}
