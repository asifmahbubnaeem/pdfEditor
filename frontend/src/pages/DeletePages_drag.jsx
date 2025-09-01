import React, { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import PageLayout from "../components/PageLayout";
import NavBar from "../components/NavBar";

// Worker setup for Vite
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

// Sortable item component
function SortablePage({ id, pageNumber, width, onDelete, onEnlarge }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: "relative",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="group border rounded-lg shadow-md bg-white p-2">
      <Page pageNumber={pageNumber} width={200} renderTextLayer={false} renderAnnotationLayer={false} />
      {/* Hover Menu */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex justify-center items-center gap-3 transition-opacity">
        <button
          onClick={() => onDelete(pageNumber)}
          className="px-2 py-1 bg-red-600 text-white rounded shadow"
        >
          X
        </button>
        <button
          onClick={() => onEnlarge(pageNumber)}
          className="px-2 py-1 bg-blue-600 text-white rounded shadow"
        >
          🔍
        </button>
      </div>
    </div>
  );
}

export default function DeletePages() {
  const [file, setFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [deletedPages, setDeletedPages] = useState([]);
  const [enlargedPage, setEnlargedPage] = useState(null);
  const [pagesOrder, setPagesOrder] = useState([]);

  const popupRef = useRef();

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    setFile(selected);
    setNumPages(null);
    setDeletedPages([]);
    setPagesOrder([]);
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPagesOrder(Array.from({ length: numPages }, (_, i) => i + 1));
  };

  const handleDelete = (pageNumber) => {
    setDeletedPages((prev) => [...prev, pageNumber]);
  };

  const closePopup = () => setEnlargedPage(null);

  // ESC key closes popup
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") closePopup();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  // Click outside closes popup
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        closePopup();
      }
    };
    if (enlargedPage) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [enlargedPage]);

  // DnD Kit setup
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = pagesOrder.indexOf(active.id);
      const newIndex = pagesOrder.indexOf(over.id);
      setPagesOrder(arrayMove(pagesOrder, oldIndex, newIndex));
    }
  };

  return (
    <PageLayout>
      <NavBar />
      <div className="flex flex-col items-center p-6 bg-gray-50 min-h-screen">
        <h2 className="text-xl font-bold mb-4">Delete / Enlarge Pages (Draggable)</h2>

        {/* Upload */}
        <input type="file" accept="application/pdf" onChange={handleFileChange} className="mb-4" />

        {/* PDF thumbnails */}
        {file && (
          <Document file={file} onLoadSuccess={onDocumentLoadSuccess}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={pagesOrder} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-10 gap-4">
                  {pagesOrder.map((pageNumber) =>
                    deletedPages.includes(pageNumber) ? null : (
                      <SortablePage
                        key={pageNumber}
                        id={pageNumber}
                        pageNumber={pageNumber}
                        width={120}
                        onDelete={handleDelete}
                        onEnlarge={setEnlargedPage}
                      />
                    )
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </Document>
        )}

        {/* Enlarged popup */}
        {enlargedPage && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div ref={popupRef} className="bg-white p-4 rounded-lg shadow-lg max-w-3xl max-h-[90vh] overflow-auto">
              <Document file={file}>
                <Page pageNumber={enlargedPage} width={400} renderTextLayer={false} renderAnnotationLayer={false} />
              </Document>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
