import React, { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import PageLayout from "../components/PageLayout";
import NavBar from "../components/NavBar";

// Correct worker setup for Vite
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function DeletePages() {
  const [file, setFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [deletedPages, setDeletedPages] = useState([]);
  const [enlargedPage, setEnlargedPage] = useState(null);

  const popupRef = useRef();

  // Handle file upload
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setNumPages(null);
    setDeletedPages([]);
  };

  // Handle PDF load success
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  // Delete page
  const handleDelete = (pageNumber) => {
    setDeletedPages((prev) => [...prev, pageNumber]);
  };

  // Close enlarged popup
  const closePopup = () => setEnlargedPage(null);

  // Close popup on ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") closePopup();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  // Close popup on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        closePopup();
      }
    };
    if (enlargedPage) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [enlargedPage]);

  return (
    <PageLayout>
      <NavBar />
      <div className="flex flex-col items-center p-6 bg-gray-50 min-h-screen">
        <h2 className="text-xl font-bold mb-4">Delete / Enlarge Pages</h2>

        {/* Upload file */}
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="mb-4"
        />

        {/* Render PDF thumbnails */}
        {file && (
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            className="flex flex-wrap gap-6 justify-center"
          >
            {Array.from(new Array(numPages), (_, idx) => {
              const pageNumber = idx + 1;
              if (deletedPages.includes(pageNumber)) return null;

              return (
                <div
                  key={pageNumber}
                  className="relative group border rounded-lg shadow-md bg-white p-2"
                >
                  {/* PDF Page Thumbnail */}
                  <Page
                    pageNumber={pageNumber}
                    width={150}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />

                  {/* Hover Menu */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex justify-center items-center gap-3 transition-opacity" style={{padding: '5px', gap: '2px'}}>
                    <button
                      onClick={() => handleDelete(pageNumber)}
                      className="px-3 py-1 bg-red-600 text-white rounded shadow"
                      style={{color: 'red', fontSize: '16px' ,backgroundColor: '#ccc'}}
                    >
                      X
                    </button>
                      <button
                      onClick={() => setEnlargedPage(pageNumber)}
                      className="px-3 py-1 bg-blue-600 text-white rounded shadow"
                      style={{backgroundColor: '#890123', fontSize: '16px'}}>🔍</button>
                  </div>
                </div>
              );
            })}
          </Document>
        )}

        {/* Enlarged Popup */}
        {enlargedPage && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div
              ref={popupRef}
              className="bg-white p-4 rounded-lg shadow-lg max-w-3xl max-h-[90vh] overflow-auto"
            >
              {/* Wrap enlarged page in a Document */}
              <Document file={file}>
                <Page
                  pageNumber={enlargedPage}
                  width={800}
                  height={500}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </Document>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
