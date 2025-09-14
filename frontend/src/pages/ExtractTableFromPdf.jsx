import React, { useState, useRef } from "react";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { generateUserId } from "../utils/Common"
import PageLayout from "../components/PageLayout";
import NavBar from "../components/NavBar";

GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function ExtractTable() {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [tableCount, setTableCount] = useState(0);
  const [format, setFormat] = useState("csv");
  const [numPages, setNumPages] = useState(null);
  const [cooldown, setCooldown] = useState(0);

  const [status, setStatus] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");

  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || "https://localhost:3000";

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setStatus("");
    setTableCount(0);
    setDownloadUrl("");

    const compression_button = document.getElementById("btn_extract");
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


  const handleDownload = () => {
    if (!downloadUrl) return;
    window.location.href = downloadUrl; // trigger backend zip download
    setTableCount(0);
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

  const handleTableExtraction = async () => {
    const file = fileInputRef.current.files[0];
    if (!file) {
      alert("Please upload a PDF.");
      return;
    }

    const formData = new FormData();
    const userId = generateUserId();
    formData.append("file", file);
    formData.append("userId", userId);
    formData.append("format", format);
    console.log("sent userId = ", userId)

    try {
      setStatus(`Extracting tables in ${format} format...`);
      const response = await fetch(`${API_URL}/api/extract-tables`, {
        method: "POST",
        body: formData,
      });

      const response_data = await response.json();
      if (!response.ok){
        if (response.status === 429) {
          HandleRateLimit(response_data);
          return;
        }
       setStatus(response_data.error || "Failed to extract tables");
       setTableCount(0);
       throw new Error("Extraction failed");
     }

    setStatus(response_data.message);
    setTableCount(response_data.tablesCount);
    setDownloadUrl(response_data.downloadUrl);

    } catch (err) {
      console.error("Error:", err);
      alert("Error extracting tables");
    }
  };

  return (
    <PageLayout>
      <NavBar />
        <div className="p-4 flex flex-col items-center" style={{border: "2px solid #000", borderRadius: "15px", padding: "10px"}}>
          <h2 className="text-xl font-bold mb-2" style={{color: 'green'}}>Extract Tables from PDF Files</h2>

          
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
              <p style={{fontWeight: ''}}>Please select the output file format</p>
              <select 
                style={{padding: '5px', backgroundColor: '#ccc', color: '#000', border: '1px solid black', borderRadius: '3px', fontSize: '14px'}}
                value={format} 
                onChange={(e) => setFormat(e.target.value)}>
                <option value="csv">csv</option>
                <option value="html">html</option>
                <option value="json">json</option>
                <option value="pdf">pdf</option>
                <option value="xlsx">excel</option>
                <option value="txt">text</option>
                <option value="xml">xml</option>
              </select>
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
              <p style={{ color: "red", marginTop: "10px" }}>
                Too many requests. Please wait {cooldown} seconds...
              </p>
            )}
          <button id="btn_extract" style={{margin: '10px'}} onClick={handleTableExtraction} disabled={cooldown>0}>Extract Tables</button>
          {status && <p className="mb-2" style={{color: 'green', fontWeight: 'bold'}}>{status}</p>}
        </div>
        {tableCount > 0 && (
        <div className="flex flex-col items-center">
          <p style={{color: 'green', fontWeight: 'bold'}}>{tableCount} tables found.</p>
          <button
            onClick={handleDownload}
            className="mt-2 px-4 py-2 bg-green-600 text-white rounded shadow"
          >
            Download Tables (ZIP)
          </button>
        </div>
      )}
        </div>
    </PageLayout>
  );
}
