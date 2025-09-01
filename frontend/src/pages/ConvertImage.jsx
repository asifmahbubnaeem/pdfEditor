import React, { useState, useRef} from "react";
import PageLayout from "../components/PageLayout";
import NavBar from "../components/NavBar";
import { generateUserId } from "../utils/common"

export default function ConvertImage(argument) {
	// body...
	const [file, setFile] = useState(null);
	const [cooldown, setCooldown] = useState(0);
	const fileInputRef = useRef(null);
	const API_URL = import.meta.env.VITE_API_URL || "https://localhost:3000";


	const handleFileChange = async (event) =>{

		const file = event.target.files[0];
		if(!file) return;

		const reader = new FileReader();
		reader.readAsArrayBuffer(file);

		setFile(file);
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

	const ConvertImageToPdf = async () => {

		const file = fileInputRef.current.files[0];
		if (!file) return alert("Upload Image (.png/.jpg/.jpeg) file first!");

		console.log("file extension .jpg ?=",file.name.toLowerCase().endsWith('.jpg'));

		const formData = new FormData();
		const userId = generateUserId();
		let fileType = 'invalid_type';
		if(file.name.toLowerCase().endsWith('.png'))
			fileType = 'png';
		else if(file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg'))
			fileType = 'jpg';

		formData.append("file", file);
  		formData.append("userId", userId);
  		formData.append("fileType",fileType);

  		if (fileType === 'invalid_type') 
  			return alert("Unsupported Image type, Valid Image types are: .png/.jpg/.jpeg");

  		try{

  			const response = await fetch(`${API_URL}/api/convert-img`, {

  				method: "POST",
  				body: formData

  			});

  			if(!response.ok){

  				if(response.status === 429){

  					const data = await response.json();
  					HandleRateLimit(data);
          			return;
  				}

  				throw new Error("Image to PDF conversion failed");
  			}

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "ImageToPdf.pdf";
			document.body.appendChild(a);
			a.click();
			a.remove();

  		}catch(err){
  			console.error(err);
  			alert(err.message);
  		}
		console.log("Button clicked");
	};

	const getPdfPreviewUrl = (file) => {
    return URL.createObjectURL(file);
  };

	return (
		<PageLayout>
      		<NavBar />
      		<div className="p-4 flex flex-col items-center" style={{border: "2px solid #ccc", borderRadius: "5px",padding: "25px",display: "grid", flexDirection: "column", alignItems: "center" }}>
            {cooldown > 0 && (
              <p style={{ color: "red", marginTop: "10px" }}>
                Too many requests. Please wait {cooldown} seconds...
              </p>
            )}
          <h3 className="text-xl font-bold mb-4" style={{color: "green"}}>Convert Image To PDF</h3>


          <div
            // {/* key={idx}} */}
            className="relative p-3 border rounded-lg shadow-sm bg-white w-44 text-sm text-center"
          >
            <iframe
              // src={getPdfPreviewUrl(file)}
              // title={file.name}
              className="w-full h-10 mb-2 border"
            />
              <div style={{paddingBottom: "5px", display: "flex", flexDirection: "row",alignItems: "center",justifyContent: "center"}}>
                <p className="truncate" style={{fontSize: "16px", color: "blue"}}>file.name</p>
                <button
                  style={{color: "red", backgroundColor: "#fff", fontWeight: "bold"}}
                  // onClick={() => handleRemoveFile(idx)}
                  className="absolute top-1 right-1 text-red-500 hover:text-red-700">X
                </button>
            </div>

          </div>

          <div style={{alignItems: "center"}}>
            <input
              type="file"
              text="Upload File"
              accept=".png,.jpg,.jpeg"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{color: "blue", fontSize: '14px'}}
              className="mb-4"/>
          </div>
          
          {/*<canvas ref={canvasRef} className="border rounded shadow" />*/}
          <div style={{paddingTop: '10px'}}>
          <button id="decrypt_btn"
            onClick={ConvertImageToPdf}
            disabled={cooldown>0}
            style={{color: '#fff', backgroundColor: 'brown', borderRadius: '10px', fontSize: '14px'}}
            className="bg-green-500 text-white px-4 py-2 rounded">Image To PDF
          </button>
        </div>
    </div>
      	</PageLayout>

		);
}