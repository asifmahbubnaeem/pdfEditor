import PageLayout from "../components/PageLayout";
import NavBar from "../components/NavBar";
import { Link } from "react-router-dom";

const features = [
  { name: "Lock PDF", path: "/create-password" },
  { name: "Unlock PDF", path: "/remove-password" },
  { name: "DOC to PDF", path: "/convert-doc" },
  { name: "Merge PDF Files", path: "/merge-pdf" },
  { name: "Image to PDF", path: "/convert-image" },
  { name: "Rearrange PDF Pages", path: "/rearrange-pages" },
  { name: "Delete PDF Pages", path: "/delete-pages" },
  { name: "Demo Page", path: "/demo-app" },
];


export default function Home() {
  return (
    <PageLayout>
      <NavBar />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ display: "grid", gap: "10px", paddingBottom: "10px", backgroundColor: '#bdc7c9', borderRadius: '10px', width: '50%', alignItems: "center",justifyContent: "center",}}>
        <h2 className="text-2xl font-semibold text-center mb-2">
          Choose a Tool
        </h2>
        {/*<div style={{ display: "grid", gap: "20px", marginTop: "30px" }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">*/}
            {features.map((f, idx) => (
              <Link
                key={idx}
                to={f.path}
                className="p-6 bg-white shadow-md rounded-xl border hover:shadow-lg 
                           flex justify-center items-center text-lg font-medium text-red-900"
              >
                <div style={{ border: "2px solid #000", padding: "10px", borderRadius: "10px", cursor: "pointer",  alignItems: "center", justifyContent: "center", color: "black", backgroundColor: "#eee"}}>
                {f.name}</div>
              </Link>
            ))}
         {/* </div>
        </div>*/}
      </div>
    </PageLayout>
  );
}
