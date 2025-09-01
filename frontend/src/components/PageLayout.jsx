// src/components/PageLayout.jsx
export default function PageLayout({ children }) {
  return (
    <div
      style={{
        display: "flex",
        // border: "1px solid black",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        width: '100vw',
        minHeight: "100vh", // full page height
        textAlign: "center",
        backgroundColor: '#789780'
        // paddingLeft: "100px",
      }}
    >
      {children}
    </div>
  );
}
