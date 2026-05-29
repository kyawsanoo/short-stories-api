export async function proxyPDF(request, env, cors) {
  const url = new URL(request.url);
  const pdfUrl = url.searchParams.get("url");
  
  if (!pdfUrl) {
    return new Response(JSON.stringify({ error: "Missing PDF URL" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...cors }
    });
  }
  
  try {
    console.log("Proxying PDF:", pdfUrl);
    
    // Fetch the PDF from Supabase
    const response = await fetch(pdfUrl);
    
    if (!response.ok) {
      console.error("Failed to fetch PDF:", response.status);
      return new Response(JSON.stringify({ error: "Failed to fetch PDF" }), {
        status: response.status,
        headers: { "Content-Type": "application/json", ...cors }
      });
    }
    
    // Get PDF as array buffer
    const pdfData = await response.arrayBuffer();
    
    // Return PDF with proper headers
    return new Response(pdfData, {
      headers: {
        "Content-Type": "application/pdf",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Cache-Control": "public, max-age=3600",
        "Content-Disposition": "inline",
        "Content-Length": pdfData.byteLength.toString()
      }
    });
    
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(JSON.stringify({ error: "Proxy error: " + error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...cors }
    });
  }
}