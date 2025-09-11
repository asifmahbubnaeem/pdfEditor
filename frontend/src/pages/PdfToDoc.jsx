import React, { useState, useRef } from "react";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
// import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.js?url";

import { generateUserId } from "../utils/Common"
import PageLayout from "../components/PageLayout";
import NavBar from "../components/NavBar";

GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function PdfToDocConvertion() {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(null);
  const [cooldown, setCooldown] = useState(0);

  const [status, setStatus] = useState("");
  const [imageCount, setImageCount] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState("");
  // const [file, setFile] = useState(null);

  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || "https://localhost:3000";

  const handleFileChange = async (event) => {


    const file = event.target.files[0];
    if (!file) return;
    // setFile(event.target.files[0]);
    setStatus("");
    setImageCount(0);
    setDownloadUrl("");

    const compression_button = document.getElementById("btn_cmpr");
    const reader = new FileReader();
    reader.onload = async function () {
      const typedArray = new Uint8Array(this.result);
      
      try{
        const pdf = await getDocument({ data: typedArray }).promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setPageNum(1);
        renderPage(1, pdf);
        compression_button.disabled = (false || cooldown>0);
      }catch(err){
        const canvas = canvasRef.current;
        canvas.width = 0;
        canvas.height = 0;
        setPdfDoc(null);
        setNumPages(0);
        setPageNum(0);
        compression_button.disabled =( true || cooldown>0);
        console.log("inside exception pdf load", err);
      }

    };
    reader.readAsArrayBuffer(file);
  };

  const renderPage = async (num, pdf = pdfDoc) => {
    if (!pdf) return;
    const page = await pdf.getPage(num);
    const viewport = page.getViewport({ scale: 1 });
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
          // alert(`Rate limit exceeded. Please wait ${data.retryAfter} seconds.`);
      console.log("inside HandleRateLimit", data);
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


  const handleDownload = () => {
    if (!downloadUrl) return;
    window.location.href = downloadUrl; // trigger backend zip download
    setImageCount(0);
  };

  const handlePdfToDocx = async () => {
    const file = fileInputRef.current.files[0];
    if (!file) {
      alert("Please upload a PDF.");
      return;
    }
    console.log(cooldown);
    const formData = new FormData();
    const userId = generateUserId();
    formData.append("file", file);
    formData.append("userId", userId);
    console.log("sent userId = ", userId)

    try {
      setStatus("Converting to docx...");
      const response = await fetch(`${API_URL}/api/convert-pdf-docx`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok){
        setStatus("Convertion Failed.");
        if (response.status === 429) {
          const response_data = await response.json();
          HandleRateLimit(response_data);
          return;
        }
       // setStatus(response_data.error || "Failed to convert from pdf to docx");
       // throw new Error("Compression failed");
     }
     setStatus("Convertion successfully completed.");

      const blob = await response.blob();
      // const file = new File([blob], "pdf2doc.docx", { type: "application/docx" });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "pdf2doc.docx";
      document.body.appendChild(a);
      a.click();
      a.remove();

    } catch (err) {
      console.error("Error:", err);
      alert("Error converting to docx: ", err);
    }
  };

  return (
    <PageLayout>
      <NavBar />
        <div className="p-4 flex flex-col items-center" style={{border: "2px solid #000", borderRadius: "15px", padding: "10px"}}>
          <h2 className="text-xl font-bold mb-2" style={{color: 'green'}}>PDF To DOCX</h2>

          
          <div>
          <canvas ref={canvasRef} className="border rounded shadow" style={{border: '1px solid black', padding: '5px', backgroundColor: '#ccc'}}/>
          {pdfDoc && (
            <div className="flex flex-col items-center gap-4 mt-4" style={{padding: "5px",display: "grid", flexDirection: "column", alignItems: "center" }}>
              <div className="flex items-center gap-4">
                <button
                  onClick={prevPage}
                  disabled={pageNum <= 1}
                  className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
                >
                  Prev
                </button>
                <span style={{margin: '10px', fontWeight: 'bold'}}>
                  Page {pageNum} of {numPages}
                </span>
                <button
                  onClick={nextPage}
                  disabled={pageNum >= numPages}
                  className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
          <div style={{alignItems: "center"}}>
            <input
              type="file"
              style={{backgroundColor: '#ccc', fontSize: '16px', color: 'blue', border: '2px solid black'}}
              accept="application/pdf"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="mb-4"/>
          </div>
          {cooldown > 0 && (
              <p style={{ color: "orange", marginTop: "10px", fontWeight: 'bold' }}>
                Too many requests. Please wait {cooldown} seconds...
              </p>
            )}
          <button id="btn_cmpr" style={{margin: '10px'}} onClick={handlePdfToDocx} disabled={cooldown>0}>Convert To DOCX</button>
          {status && <p className="mb-2" style={{color: 'green', fontWeight: 'bold'}}>{status}</p>}
        </div>
        </div>
    </PageLayout>
  );
}
