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

		const objectURL = URL.createObjectURL(file);

    document.getElementById("image-preview").src = objectURL;
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
      		<div className="p-4 flex flex-col items-center">
            {cooldown > 0 && (
              <p style={{ color: "red", marginTop: "10px" }}>
                Too many requests. Please wait {cooldown} seconds...
              </p>
            )}
          <h2 className="text-xl font-bold mb-4" style={{color: "green"}}>Convert Image To PDF</h2>
          <div
            className="relative p-3 border rounded-lg shadow-sm bg-white w-44 text-sm text-center"
          >
            <img id="image-preview" src="#" alt="" style={{border: '2px solid black', padding: "5px"}}/>

          </div>

          <div style={{alignItems: "center"}}>
            <input
              type="file"
              text="Upload File"
              accept=".png,.jpg,.jpeg"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{color: "blue", fontSize: '20px', backgroundColor: 'black'}}
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