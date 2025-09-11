import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import CreatePassword from "./pages/CreatePassword";
import RemovePassword from "./pages/RemovePassword";
import ConvertDoc from "./pages/ConvertDoc";
import Pricing from "./pages/Pricing";
import Login from "./pages/Login";
import MergePdf from "./pages/MergePdf"
import ConvertImage from "./pages/ConvertImage";
import RearrangePages from "./pages/RearrangePages";
import DeletePages from "./pages/DeletePages";
import ExtractImages from "./pages/ExtractImages";
import RotatePages from "./pages/Rotation";
import CompressPdf from "./pages/CompressPdf";
import PdfToDocConvertion from "./pages/PdfToDoc";
import DemoApp from "./pages/DemoApp";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create-password" element={<CreatePassword />} />
            <Route path="/remove-password" element={<RemovePassword />} />
            <Route path="/convert-doc" element={<ConvertDoc />} />
            <Route path="/merge-pdf" element={<MergePdf />} />
            <Route path="/convert-image" element={<ConvertImage />} />
            <Route path="/rearrange-pages" element={<RearrangePages />} />
            <Route path="/delete-pages" element={<DeletePages />} />
            <Route path="/rotate-pages" element={<RotatePages />} />
            <Route path="/compress-pdf" element={<CompressPdf />} />
            <Route path="/extract-images" element={<ExtractImages />} />
            <Route path="/pdf-2-docx" element={<PdfToDocConvertion />} />
            <Route path="/demo-app" element={<DemoApp />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/login" element={<Login />} />
          </Routes>
      </div>
    </Router>
  );
}

export default App;
