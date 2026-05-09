import { useState, useEffect, useCallback } from "react";

const SYSTEM_PROMPT = `أنت محلل فوركس متخصص في تداول الذهب XAU/USD. عند تحليلك قدم: 1. اتجاه السوق 2. مستويات الدعم القريبة 3. مستويات المقاومة القريبة 4. التوصية مع السبب 5. نقطة الدخول 6. وقف الخسارة 7. الهدف. كن دقيقاً بالأرقام. الرد بالعربية فقط.`;

export default function App() {
  const [price, setPrice] = useState(null);
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [countdown, setCountdown] = useState(3600);

  const fetchGoldPrice = useCallback(async () => {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 200,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{ role: "user", content: "What is the current price of gold XAU/USD? Give me only the number like: 3245.50" }]
        })
      });
      const data = await response.json();
      const text = data.content?.map(i => i.text || "").join("") || "";
      const match = text.match(/[\d,]+\.?\d*/);
      if (match) {
        const newPrice = parseFloat(match[0].replace(",", ""));
        setPrice(newPrice);
        setLastUpdate(new Date());
        return newPrice;
      }
    } catch (e) { return null; }
  }, []);
  const fetchAnalysis = useCallback(async (currentPrice) => {
    if (!currentPrice) return;
    setLoading(true);
    setAnalysis("");
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: `السعر الحالي للذهب XAU/USD: $${currentPrice}\nالوقت: ${new Date().toLocaleString("ar-SA")}\nقم بتحليل شامل وأعطني توصية واضحة.` }]
        })
      });
      const data = await response.json();
      const text = data.content?.map(i => i.text || "").join("") || "لا يوجد تحليل.";
      setAnalysis(text);
    } catch (e) {
      setAnalysis("حدث خطأ في التحليل.");
    } finally { setLoading(false); }
  }, []);

  const runUpdate = useCallback(async () => {
    const p = await fetchGoldPrice();
    if (p) await fetchAnalysis(p);
    setCountdown(3600);
  }, [fetchGoldPrice, fetchAnalysis]);

  useEffect(() => { runUpdate(); }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => { if (prev <= 1) { runUpdate(); return 3600; } return prev - 1; });
    }, 1000);
    return () => clearInterval(interval);
  }, [runUpdate]);

  const formatTime = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,"0")}`;

return (
    <div style={{minHeight:"100vh",background:"#0a0a0f",fontFamily:"Cairo,sans-serif",direction:"rtl",color:"#e8e0cc",padding:"24px 16px"}}>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet"/>
      <div style={{textAlign:"center",marginBottom:32}}>
        <h1 style={{fontSize:36,fontWeight:900,background:"linear-gradient(90deg,#c9a227,#f0c040)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>⬡ XAU / USD</h1>
        <div style={{fontSize:12,color:"#555"}}>تحليل تلقائي كل ساعة</div>
      </div>
      <div style={{background:"#1a1a24",border:"1px solid #2a2a3a",borderRadius:20,padding:"24px",marginBottom:20}}>
        <div style={{fontSize:12,color:"#666",marginBottom:4}}>السعر الحالي</div>
        <div style={{fontSize:42,fontWeight:900,color:"#f0c040"}}>{price ? `$${price.toLocaleString("en-US",{minimumFractionDigits:2})}` : "جاري الجلب..."}</div>
        {lastUpdate && <div style={{fontSize:11,color:"#555",marginTop:4}}>آخر تحديث: {lastUpdate.toLocaleTimeString("ar-SA")}</div>}
        <div style={{marginTop:16,display:"flex",alignItems:"center",gap:12}}>
          <div style={{fontSize:18,fontWeight:700,color:"#f0c040"}}>⏱ {formatTime(countdown)}</div>
          <button onClick={runUpdate} disabled={loading} style={{padding:"8px 20px",borderRadius:20,background:loading?"#333":"linear-gradient(135deg,#c9a227,#f0c040)",border:"none",color:loading?"#666":"#0a0a0f",fontWeight:700,fontSize:13,cursor:loading?"not-allowed":"pointer",fontFamily:"Cairo,sans-serif"}}>
            {loading ? "⏳ جاري..." : "🔄 تحديث"}
          </button>
        </div>
      </div>
      <div style={{background:"#1a1a24",border:"1px solid #2a2a3a",borderRadius:20,padding:"24px"}}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:16,color:"#f0c040"}}>📊 التحليل الذكي</div>
        {loading ? <div style={{textAlign:"center",padding:"32px 0",color:"#666"}}>⏳ جاري التحليل...</div>
        : analysis ? <div style={{fontSize:14,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{analysis}</div>
        : <div style={{textAlign:"center",padding:"32px 0",color:"#555"}}>اضغط تحديث لبدء التحليل</div>}
      </div>
    </div>
  );
}
