import { useState, useMemo, useRef, useCallback } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";

// ─── PALETA ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#08090d", surface: "#0e0f17", card: "#13141f", border: "#1e2035",
  accent: "#3b82f6", accentHov: "#60a5fa", green: "#10d97e", red: "#f43f5e",
  yellow: "#fbbf24", purple: "#a78bfa", cyan: "#22d3ee", orange: "#fb923c",
  text: "#e2e4f0", muted: "#5a5c78", inputBg: "#0b0c14",
};

// ─── UTILS ────────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().split("T")[0];
const fmt = (n) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(n || 0);
const fmtD = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("es-AR") : "—";
const ivaRate = (alicuota) => ({ "21": 0.21, "10.5": 0.105, "27": 0.27, "0": 0 }[alicuota] || 0.21);

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const CAT_GASTO = ["Mercadería","Materia prima","Alquiler","Servicios","Sueldos","Transporte","Marketing","Impuestos","Mantenimiento","Equipamiento","Otros"];
const CAT_VENTA = ["Productos","Servicios","Delivery","Exportación","Otros"];
const MEDIOS_PAGO = ["Efectivo","Transferencia","Tarjeta débito","Tarjeta crédito","Mercado Pago","QR","Cheque","Otro"];
const TIPO_COMP = ["Factura A","Factura B","Factura C","Ticket","Remito","Recibo","Comprobante transferencia","Otro"];
const IVA_ALICUOTAS = ["21","10.5","27","0"];

// ─── COMPONENTES BASE ─────────────────────────────────────────────────────────
const Inp = ({ value, onChange, type="text", placeholder, style={}, min }) => (
  <input type={type} value={value} onChange={onChange} placeholder={placeholder} min={min}
    style={{ width:"100%", boxSizing:"border-box", background:C.inputBg, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", color:C.text, fontSize:13, fontFamily:"inherit", outline:"none", ...style }}
    onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border} />
);
const Sel = ({ value, onChange, options, style={} }) => (
  <select value={value} onChange={onChange}
    style={{ width:"100%", boxSizing:"border-box", background:C.inputBg, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", color:C.text, fontSize:13, fontFamily:"inherit", outline:"none", cursor:"pointer", ...style }}>
    {options.map(o=><option key={o.v??o} value={o.v??o} style={{background:C.inputBg}}>{o.l??o}</option>)}
  </select>
);
const Lbl = ({ children }) => (
  <div style={{ fontSize:10, color:C.muted, textTransform:"uppercase", letterSpacing:".9px", fontWeight:700, marginBottom:5 }}>{children}</div>
);
const Btn = ({ onClick, children, color=C.accent, outline=false, small=false, disabled=false, style={} }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ background: outline?"transparent":disabled?C.border:color, border:`1px solid ${disabled?C.border:color}`, color: outline?color:"#fff",
      borderRadius:8, padding: small?"5px 12px":"9px 20px", cursor:disabled?"not-allowed":"pointer",
      fontSize: small?11:13, fontWeight:700, fontFamily:"inherit", transition:"all .15s", opacity:disabled?.5:1, whiteSpace:"nowrap", ...style }}>
    {children}
  </button>
);

function Badge({ tipo }) {
  const M = {
    venta:{l:"Venta",c:C.green}, gasto:{l:"Gasto",c:C.red}, "Factura A":{l:"Fac A",c:C.accent},
    "Factura B":{l:"Fac B",c:C.cyan}, "Factura C":{l:"Fac C",c:C.purple},
    Ticket:{l:"Ticket",c:C.yellow}, Remito:{l:"Remito",c:C.orange}, Recibo:{l:"Recibo",c:C.muted},
    "Comprobante transferencia":{l:"Trans.",c:C.accentHov}, Otro:{l:"Otro",c:C.muted},
  };
  const s = M[tipo]||{l:tipo,c:C.muted};
  return <span style={{ background:s.c+"22", color:s.c, border:`1px solid ${s.c}44`, borderRadius:6, padding:"2px 9px", fontSize:10, fontWeight:700, letterSpacing:".8px", textTransform:"uppercase", whiteSpace:"nowrap" }}>{s.l}</span>;
}

function StatCard({ icon, label, value, sub, color, trend }) {
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"18px 20px", flex:1, minWidth:160 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div style={{ fontSize:11, color:C.muted, textTransform:"uppercase", letterSpacing:".8px", fontWeight:700 }}>{icon} {label}</div>
        {trend!=null && <span style={{ fontSize:11, color:trend>=0?C.green:C.red, fontWeight:700 }}>{trend>=0?"▲":"▼"} {Math.abs(trend)}%</span>}
      </div>
      <div style={{ fontSize:22, fontWeight:800, color:color||C.text, marginTop:8, fontVariantNumeric:"tabular-nums", letterSpacing:"-.5px" }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>{sub}</div>}
    </div>
  );
}

function Modal({ title, onClose, children, wide=false }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"#000000cc", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:18, padding:28, width:"100%", maxWidth:wide?780:560, maxHeight:"92vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}>
          <div style={{ fontWeight:800, fontSize:17 }}>{title}</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:22, lineHeight:1, padding:"0 4px" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── EMPTY STATES ─────────────────────────────────────────────────────────────
const EMPTY_COMPRA = {
  tipo_comprobante:"Factura B", fecha:today(), numero_doc:"", proveedor:"", cuit:"",
  categoria:"Mercadería", alicuota_iva:"21", total:"", notas:"",
  items:[{ id:uid(), descripcion:"", cantidad:"1", unidad:"unid", precio_unit:"", subtotal:0, iva:0, total:0 }],
};
const EMPTY_VENTA = {
  fecha:today(), cliente:"", medio_pago:"Efectivo", categoria:"Productos", alicuota_iva:"21", total:"", notas:"",
  items:[{ id:uid(), producto:"", descripcion:"", cantidad:"1", precio_unit:"", subtotal:0, iva:0, total:0 }],
};

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [compras, setCompras] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [modalProducto, setModalProducto] = useState(false);
  const [modalProveedor, setModalProveedor] = useState(false);
  const [editProducto, setEditProducto] = useState(null);
  const [editProveedor, setEditProveedor] = useState(null);
  const [formProd, setFormProd] = useState({ nombre:"", descripcion:"", unidad:"unid", precio:"", alicuota_iva:"21", categoria:"Mercadería", codigo:"" });
  const [formProv, setFormProv] = useState({ razon_social:"", cuit:"", telefono:"", email:"", direccion:"", categoria:"Mercadería", notas:"" });
  const [busqProd, setBusqProd] = useState("");
  const [busqProv, setBusqProv] = useState("");
  const [prodSearch, setProdSearch] = useState({});
  const [provSearch, setProvSearch] = useState("");
  const [modalCompra, setModalCompra] = useState(false);
  const [modalVenta, setModalVenta] = useState(false);
  const [modalReporte, setModalReporte] = useState(null);
  const [editCompra, setEditCompra] = useState(null);
  const [editVenta, setEditVenta] = useState(null);
  const [formC, setFormC] = useState(EMPTY_COMPRA);
  const [formV, setFormV] = useState(EMPTY_VENTA);
  const [busqueda, setBusqueda] = useState("");
  const [filtroFecha, setFiltroFecha] = useState({ desde:"", hasta:"" });
  const [periodoIva, setPeriodoIva] = useState(new Date().getMonth());
  const [anioIva, setAnioIva] = useState(new Date().getFullYear());
  const [chatQ, setChatQ] = useState("");
  const [chatR, setChatR] = useState([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [importModal, setImportModal] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const fileRef = useRef();
  const chatEndRef = useRef();
  const scanRefC = useRef();
  const scanRefV = useRef();
  const [scanningC, setScanningC] = useState(false);
  const [scanningV, setScanningV] = useState(false);
  const [scanPreviewC, setScanPreviewC] = useState(null); // base64 preview
  const [scanPreviewV, setScanPreviewV] = useState(null);
  const [scanMsgC, setScanMsgC] = useState("");
  const [scanMsgV, setScanMsgV] = useState("");

  // ─── SCAN DOCUMENTO CON IA ────────────────────────────────────────────────
  const scanDocumento = async (file, tipo) => {
    const setScanning = tipo === "compra" ? setScanningC : setScanningV;
    const setMsg      = tipo === "compra" ? setScanMsgC  : setScanMsgV;
    const setPreview  = tipo === "compra" ? setScanPreviewC : setScanPreviewV;
    const setForm     = tipo === "compra" ? setFormC : setFormV;

    setScanning(true);
    setMsg("Leyendo documento…");

    try {
      // Leer como base64
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(",")[1]);
        r.onerror = () => rej(new Error("Error al leer archivo"));
        r.readAsDataURL(file);
      });

      // Preview si es imagen
      if (file.type.startsWith("image/")) {
        setPreview(`data:${file.type};base64,${base64}`);
      } else {
        setPreview("pdf");
      }

      setMsg("Analizando con IA…");

      const mediaType = file.type === "application/pdf" ? "application/pdf" : file.type;
      const docBlock = file.type === "application/pdf"
        ? { type:"document", source:{ type:"base64", media_type:"application/pdf", data:base64 } }
        : { type:"image",    source:{ type:"base64", media_type:mediaType, data:base64 } };

      const prompt = tipo === "compra"
        ? `Analizá este comprobante de compra/gasto de un negocio argentino. Extraé TODOS los datos y respondé SOLO con JSON válido, sin markdown ni backticks:
{
  "tipo_comprobante": "Factura A"|"Factura B"|"Factura C"|"Ticket"|"Remito"|"Recibo"|"Comprobante transferencia"|"Otro",
  "fecha": "YYYY-MM-DD o null",
  "proveedor": "nombre del proveedor o emisor",
  "cuit": "CUIT del proveedor (solo números con guiones) o null",
  "numero_doc": "número de factura/comprobante o null",
  "categoria": "Mercadería"|"Materia prima"|"Alquiler"|"Servicios"|"Sueldos"|"Transporte"|"Marketing"|"Impuestos"|"Mantenimiento"|"Equipamiento"|"Otros",
  "alicuota_iva": "21"|"10.5"|"27"|"0",
  "neto": número sin IVA,
  "iva_monto": número del IVA,
  "total": número total,
  "items": [
    { "descripcion": "nombre del producto/servicio", "cantidad": número, "unidad": "unid"|"kg"|"lt"|"caja"|"hs", "precio_unit": número }
  ]
}
Si no encontrás un dato, usá null. IVA argentina 21% por defecto. Si hay varios ítems, listarlos todos.`
        : `Analizá este comprobante de venta de un negocio argentino. Extraé TODOS los datos y respondé SOLO con JSON válido, sin markdown ni backticks:
{
  "fecha": "YYYY-MM-DD o null",
  "cliente": "nombre del cliente o null",
  "medio_pago": "Efectivo"|"Transferencia"|"Tarjeta débito"|"Tarjeta crédito"|"Mercado Pago"|"QR"|"Cheque"|"Otro",
  "categoria": "Productos"|"Servicios"|"Delivery"|"Exportación"|"Otros",
  "alicuota_iva": "21"|"10.5"|"27"|"0",
  "neto": número sin IVA,
  "iva_monto": número del IVA,
  "total": número total,
  "items": [
    { "producto": "nombre", "descripcion": "detalle", "cantidad": número, "precio_unit": número }
  ]
}
Si no encontrás un dato, usá null. IVA argentina 21% por defecto.`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          messages: [{ role:"user", content:[ docBlock, { type:"text", text:prompt } ] }],
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const raw = data.content?.map(i=>i.text||"").join("") || "";
      const clean = raw.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean);

      setMsg("✅ Documento procesado. Revisá y completá los campos.");

      if (tipo === "compra") {
        const items = (parsed.items||[]).map(it => {
          const rate = ivaRate(parsed.alicuota_iva||"21");
          const sub  = (parseFloat(it.cantidad)||1) * (parseFloat(it.precio_unit)||0);
          return { id:uid(), descripcion:it.descripcion||"", cantidad:String(it.cantidad||1), unidad:it.unidad||"unid", precio_unit:String(it.precio_unit||""), subtotal:sub, iva:sub*rate, total:sub*(1+rate) };
        });
        setForm(f => ({
          ...f,
          tipo_comprobante: parsed.tipo_comprobante || f.tipo_comprobante,
          fecha:      parsed.fecha      || f.fecha,
          proveedor:  parsed.proveedor  || f.proveedor,
          cuit:       parsed.cuit       || f.cuit,
          numero_doc: parsed.numero_doc || f.numero_doc,
          categoria:  parsed.categoria  || f.categoria,
          alicuota_iva: parsed.alicuota_iva || f.alicuota_iva,
          total:      parsed.total      ? String(parsed.total) : f.total,
          items:      items.length > 0  ? items : f.items,
        }));
      } else {
        const items = (parsed.items||[]).map(it => {
          const rate = ivaRate(parsed.alicuota_iva||"21");
          const sub  = (parseFloat(it.cantidad)||1) * (parseFloat(it.precio_unit)||0);
          return { id:uid(), producto:it.producto||"", descripcion:it.descripcion||"", cantidad:String(it.cantidad||1), precio_unit:String(it.precio_unit||""), subtotal:sub, iva:sub*rate, total:sub*(1+rate) };
        });
        setForm(f => ({
          ...f,
          fecha:        parsed.fecha        || f.fecha,
          cliente:      parsed.cliente      || f.cliente,
          medio_pago:   parsed.medio_pago   || f.medio_pago,
          categoria:    parsed.categoria    || f.categoria,
          alicuota_iva: parsed.alicuota_iva || f.alicuota_iva,
          total:        parsed.total        ? String(parsed.total) : f.total,
          items:        items.length > 0    ? items : f.items,
        }));
      }
    } catch (e) {
      setMsg("❌ No se pudo procesar: " + e.message + ". Completá los campos manualmente.");
    } finally {
      setScanning(false);
    }
  };

  // ─── DROP ZONE SCANNER ────────────────────────────────────────────────────
  const ScanZone = ({ tipo }) => {
    const scanning  = tipo === "compra" ? scanningC  : scanningV;
    const msg       = tipo === "compra" ? scanMsgC   : scanMsgV;
    const preview   = tipo === "compra" ? scanPreviewC : scanPreviewV;
    const scanRef   = tipo === "compra" ? scanRefC   : scanRefV;
    const clearPrev = tipo === "compra" ? ()=>{ setScanPreviewC(null); setScanMsgC(""); } : ()=>{ setScanPreviewV(null); setScanMsgV(""); };

    const [drag, setDrag] = useState(false);

    const handleFile = (file) => {
      if (!file) return;
      const ok = file.type.startsWith("image/") || file.type === "application/pdf";
      if (!ok) { (tipo==="compra"?setScanMsgC:setScanMsgV)("Solo se aceptan imágenes (JPG, PNG) o PDF."); return; }
      scanDocumento(file, tipo);
    };

    return (
      <div style={{ marginBottom:18 }}>
        <Lbl>📷 Escanear comprobante con IA</Lbl>
        <div
          onDragOver={e=>{ e.preventDefault(); setDrag(true); }}
          onDragLeave={()=>setDrag(false)}
          onDrop={e=>{ e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={()=>!scanning && scanRef.current.click()}
          style={{
            border: `2px dashed ${drag ? "#60a5fa" : scanning ? C.accent : preview ? C.green : C.border}`,
            borderRadius:12, padding: preview?"12px":"22px 16px",
            textAlign:"center", cursor: scanning?"not-allowed":"pointer",
            background: drag ? C.accent+"0a" : scanning ? C.accent+"08" : preview ? C.green+"08" : C.inputBg,
            transition:"all .2s", position:"relative",
          }}
        >
          {scanning ? (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
              <div style={{width:32,height:32,border:`3px solid ${C.border}`,borderTop:`3px solid ${C.accent}`,borderRadius:"50%",animation:"spin .8s linear infinite"}} />
              <div style={{fontSize:12,color:C.accent,fontWeight:600}}>{msg}</div>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : preview ? (
            <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
              {preview !== "pdf" ? (
                <img src={preview} alt="Comprobante" style={{width:90,height:90,objectFit:"cover",borderRadius:8,border:`1px solid ${C.border}`,flexShrink:0}} />
              ) : (
                <div style={{width:90,height:90,background:C.surface,borderRadius:8,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,flexShrink:0}}>📄</div>
              )}
              <div style={{textAlign:"left",flex:1}}>
                <div style={{fontSize:12,color:C.green,fontWeight:700,marginBottom:4}}>✅ Procesado con IA</div>
                <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>{msg}</div>
                <button onClick={e=>{e.stopPropagation();clearPrev();}} style={{marginTop:8,background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:6,padding:"3px 10px",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>Cambiar imagen</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{fontSize:28,marginBottom:6}}>📸</div>
              <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:3}}>Subí o arrastrá la foto de la factura</div>
              <div style={{fontSize:11,color:C.muted}}>JPG · PNG · PDF · La IA extrae todos los datos automáticamente</div>
            </>
          )}
        </div>
        <input ref={scanRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style={{display:"none"}} onChange={e=>{ handleFile(e.target.files[0]); e.target.value=""; }} />
      </div>
    );
  };

  // ─── CÁLCULOS COMPRA ──────────────────────────────────────────────────────
  const recalcItemsC = (items, alicuota) => {
    const rate = ivaRate(alicuota);
    return items.map(it => {
      const sub = (parseFloat(it.cantidad)||0) * (parseFloat(it.precio_unit)||0);
      const ivaAmt = sub * rate;
      return { ...it, subtotal:parseFloat(sub.toFixed(2)), iva:parseFloat(ivaAmt.toFixed(2)), total:parseFloat((sub+ivaAmt).toFixed(2)) };
    });
  };
  const totalCompraItems = useMemo(() => {
    const items = recalcItemsC(formC.items, formC.alicuota_iva);
    return { neto: items.reduce((s,i)=>s+i.subtotal,0), iva: items.reduce((s,i)=>s+i.iva,0), total: items.reduce((s,i)=>s+i.total,0) };
  }, [formC.items, formC.alicuota_iva]);

  const totalVentaItems = useMemo(() => {
    const rate = ivaRate(formV.alicuota_iva);
    const items = formV.items.map(it => {
      const sub = (parseFloat(it.cantidad)||0) * (parseFloat(it.precio_unit)||0);
      return { ...it, subtotal:sub, iva:sub*rate, total:sub*(1+rate) };
    });
    return { neto: items.reduce((s,i)=>s+i.subtotal,0), iva: items.reduce((s,i)=>s+i.iva,0), total: items.reduce((s,i)=>s+i.total,0) };
  }, [formV.items, formV.alicuota_iva]);

  // ─── SAVE COMPRA ──────────────────────────────────────────────────────────
  const saveCompra = () => {
    const rate = ivaRate(formC.alicuota_iva);
    const items = recalcItemsC(formC.items, formC.alicuota_iva);
    const neto = items.reduce((s,i)=>s+i.subtotal,0);
    const iva = neto * rate;
    const total = parseFloat(formC.total) || (neto + iva);
    const rec = { id:editCompra||uid(), ...formC, items, neto:parseFloat(neto.toFixed(2)), iva:parseFloat(iva.toFixed(2)), total:parseFloat(total.toFixed(2)), tipo:"gasto", cargado:new Date().toISOString() };
    setCompras(p => editCompra ? p.map(r=>r.id===editCompra?rec:r) : [rec,...p]);
    setModalCompra(false); setEditCompra(null); setFormC(EMPTY_COMPRA);
  };

  const saveVenta = () => {
    const rate = ivaRate(formV.alicuota_iva);
    const items = formV.items.map(it => {
      const sub = (parseFloat(it.cantidad)||0)*(parseFloat(it.precio_unit)||0);
      return { ...it, subtotal:sub, iva:sub*rate, total:sub*(1+rate) };
    });
    const neto = items.reduce((s,i)=>s+i.subtotal,0);
    const iva = neto * rate;
    const total = parseFloat(formV.total) || (neto+iva);
    const rec = { id:editVenta||uid(), ...formV, items, neto:parseFloat(neto.toFixed(2)), iva:parseFloat(iva.toFixed(2)), total:parseFloat(total.toFixed(2)), tipo:"venta", cargado:new Date().toISOString() };
    setVentas(p => editVenta ? p.map(r=>r.id===editVenta?rec:r) : [rec,...p]);
    setModalVenta(false); setEditVenta(null); setFormV(EMPTY_VENTA);
  };

  // ─── IMPORT CSV ───────────────────────────────────────────────────────────
  const parseCSV = (text) => {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map(h=>h.trim().replace(/"/g,""));
    return lines.slice(1).map(line => {
      const vals = line.split(",").map(v=>v.trim().replace(/"/g,""));
      return Object.fromEntries(headers.map((h,i)=>[h, vals[i]||""]));
    });
  };

  const handleImportFile = async (e) => {
    const file = e.target.files[0]; if(!file) return;
    const text = await file.text();
    let rows = [];
    if(file.name.endsWith(".csv")) rows = parseCSV(text);
    else rows = parseCSV(text); // simplificado
    setImportPreview({ rows:rows.slice(0,20), tipo:importModal, all:rows });
    e.target.value="";
  };

  const confirmImport = () => {
    if(!importPreview) return;
    const { all, tipo } = importPreview;
    all.forEach(row => {
      const keys = Object.keys(row).map(k=>k.toLowerCase());
      const get = (...candidates) => { for(const c of candidates){ const k=keys.find(k=>k.includes(c)); if(k) return row[Object.keys(row)[keys.indexOf(k)]]; } return ""; };
      const totalVal = parseFloat(get("total","monto","importe","amount"))||0;
      const rate = 0.21;
      const neto = parseFloat((totalVal/1.21).toFixed(2));
      const iva = parseFloat((totalVal-neto).toFixed(2));
      if(tipo==="compra") {
        setCompras(p=>[{ id:uid(), tipo:"gasto", tipo_comprobante:"Factura B", fecha:get("fecha","date","día","dia")||today(),
          proveedor:get("proveedor","empresa","supplier","company"),
          cuit:get("cuit"),
          categoria:get("categoria","category")||"Mercadería",
          numero_doc:get("numero","nro","doc","factura"),
          alicuota_iva:"21", neto, iva, total:totalVal,
          items:[{ id:uid(), descripcion:get("descripcion","producto","concepto","item","detalle"), cantidad:"1", unidad:"unid", precio_unit:String(neto), subtotal:neto, iva, total:totalVal }],
          notas:"", cargado:new Date().toISOString() }, ...p]);
      } else {
        setVentas(p=>[{ id:uid(), tipo:"venta", fecha:get("fecha","date","día","dia")||today(),
          cliente:get("cliente","client","customer"),
          medio_pago:get("medio","pago","payment")||"Efectivo",
          categoria:"Productos",
          alicuota_iva:"21", neto, iva, total:totalVal,
          items:[{ id:uid(), producto:get("producto","item","descripcion"), descripcion:"", cantidad:"1", precio_unit:String(neto), subtotal:neto, iva, total:totalVal }],
          notas:"", cargado:new Date().toISOString() }, ...p]);
      }
    });
    setImportModal(null); setImportPreview(null);
  };

  // ─── MÉTRICAS ─────────────────────────────────────────────────────────────
  const allRecords = [...ventas, ...compras];
  const totalVentas = ventas.reduce((s,r)=>s+r.total,0);
  const totalCompras = compras.reduce((s,r)=>s+r.total,0);
  const ivaVentas = ventas.reduce((s,r)=>s+r.iva,0);
  const ivaCompras = compras.reduce((s,r)=>s+r.iva,0);
  const ivaBalance = ivaVentas - ivaCompras;
  const resultado = totalVentas - totalCompras;

  // Datos gráfico mensual
  const chartData = useMemo(() => MESES.map((mes, mi) => {
    const v = ventas.filter(r=>new Date(r.fecha+"T00:00:00").getMonth()===mi).reduce((s,r)=>s+r.total,0);
    const c = compras.filter(r=>new Date(r.fecha+"T00:00:00").getMonth()===mi).reduce((s,r)=>s+r.total,0);
    return { mes, ventas:v, compras:c, resultado:v-c };
  }), [ventas, compras]);

  // IVA por período
  const ivaVentasPer = ventas.filter(r=>{
    const d=new Date(r.fecha+"T00:00:00"); return d.getMonth()===periodoIva && d.getFullYear()===anioIva;
  }).reduce((s,r)=>s+r.iva,0);
  const ivaComprasPer = compras.filter(r=>{
    const d=new Date(r.fecha+"T00:00:00"); return d.getMonth()===periodoIva && d.getFullYear()===anioIva;
  }).reduce((s,r)=>s+r.iva,0);

  // Categorías para pie
  const pieData = useMemo(() => {
    const cats = {};
    compras.forEach(r=>{ cats[r.categoria]=(cats[r.categoria]||0)+r.total; });
    return Object.entries(cats).map(([name,value])=>({name,value}));
  }, [compras]);
  const PIE_COLORS = [C.accent, C.green, C.red, C.yellow, C.purple, C.cyan, C.orange];

  // Búsqueda
  const filteredAll = useMemo(() => {
    let recs = allRecords;
    if(busqueda.trim()) {
      const q = busqueda.toLowerCase();
      recs = recs.filter(r =>
        r.proveedor?.toLowerCase().includes(q) || r.cliente?.toLowerCase().includes(q) ||
        r.categoria?.toLowerCase().includes(q) || r.numero_doc?.toLowerCase().includes(q) ||
        r.items?.some(i=>(i.descripcion||i.producto||"").toLowerCase().includes(q))
      );
    }
    if(filtroFecha.desde) recs=recs.filter(r=>r.fecha>=filtroFecha.desde);
    if(filtroFecha.hasta) recs=recs.filter(r=>r.fecha<=filtroFecha.hasta);
    return recs.sort((a,b)=>b.fecha.localeCompare(a.fecha));
  }, [allRecords, busqueda, filtroFecha]);

  // ─── CHAT IA ──────────────────────────────────────────────────────────────
  const sendChat = async () => {
    if(!chatQ.trim()) return;
    const q = chatQ; setChatQ(""); setLoadingChat(true);
    setChatR(p=>[...p, {r:"user", t:q}]);

    const ctx = `Sos un asistente contable. Tenés acceso a los datos del negocio:
VENTAS (${ventas.length} registros): Total=${fmt(totalVentas)}, IVA=${fmt(ivaVentas)}
${ventas.slice(0,20).map(r=>`- ${r.fecha} | ${r.cliente||"Sin cliente"} | ${r.categoria} | ${fmt(r.total)}`).join("\n")}

COMPRAS (${compras.length} registros): Total=${fmt(totalCompras)}, IVA=${fmt(ivaCompras)}
${compras.slice(0,20).map(r=>`- ${r.fecha} | ${r.proveedor||"Sin proveedor"} | ${r.categoria} | ${r.tipo_comprobante} | ${fmt(r.total)}`).join("\n")}

RESUMEN FINANCIERO:
- Resultado neto: ${fmt(resultado)}
- IVA a pagar al fisco: ${fmt(ivaBalance)}
- Posición IVA: ${ivaBalance>=0?"Débito fiscal (debés al fisco)":"Crédito fiscal (saldo a favor)"}

Respondé en español, de forma concisa y útil. Si te preguntan sobre datos que no tenés, decilo claramente.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000,
          messages:[{ role:"user", content:`${ctx}\n\nPregunta del usuario: ${q}` }] })
      });
      const data = await res.json();
      const text = data.content?.map(i=>i.text||"").join("")||"No pude procesar la consulta.";
      setChatR(p=>[...p, {r:"ai", t:text}]);
    } catch(e) {
      setChatR(p=>[...p, {r:"ai", t:"Error al conectar con el asistente. Verificá tu conexión."}]);
    } finally { setLoadingChat(false); }
  };

  // ─── EXPORT CSV ───────────────────────────────────────────────────────────
  const exportCSV = (data, filename) => {
    if(!data.length) return;
    const keys = Object.keys(data[0]).filter(k=>k!=="items"&&k!=="cargado");
    const csv = [keys.join(","), ...data.map(r=>keys.map(k=>`"${r[k]||""}"`).join(","))].join("\n");
    const a=document.createElement("a"); a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);
    a.download=filename; a.click();
  };

  const exportLibroIVA = (tipo) => {
    const data = tipo==="ventas" ? ventas : compras;
    const rows = data.map(r=>({ Fecha:r.fecha, Tipo:r.tipo_comprobante||"Venta", Nro:r.numero_doc||"",
      [tipo==="ventas"?"Cliente":"Proveedor"]: r.cliente||r.proveedor||"",
      CUIT:r.cuit||"", Neto:r.neto, [`IVA ${r.alicuota_iva||21}%`]:r.iva, Total:r.total }));
    exportCSV(rows, `libro_iva_${tipo}_${new Date().toISOString().slice(0,10)}.csv`);
  };

  // ─── FORM ITEMS ───────────────────────────────────────────────────────────
  const addItemC = () => setFormC(f=>({...f, items:[...f.items, {id:uid(),descripcion:"",cantidad:"1",unidad:"unid",precio_unit:"",subtotal:0,iva:0,total:0}]}));
  const removeItemC = (id) => setFormC(f=>({...f, items:f.items.filter(i=>i.id!==id)}));
  const updItemC = (id, k, v) => setFormC(f=>({...f, items:f.items.map(i=>i.id===id?{...i,[k]:v}:i)}));
  const addItemV = () => setFormV(f=>({...f, items:[...f.items, {id:uid(),producto:"",descripcion:"",cantidad:"1",precio_unit:"",subtotal:0,iva:0,total:0}]}));
  const removeItemV = (id) => setFormV(f=>({...f, items:f.items.filter(i=>i.id!==id)}));
  const updItemV = (id, k, v) => setFormV(f=>({...f, items:f.items.map(i=>i.id===id?{...i,[k]:v}:i)}));

  const openEditCompra = (r) => {
    setFormC({...r, total:String(r.total), items:r.items||[{id:uid(),descripcion:"",cantidad:"1",unidad:"unid",precio_unit:"",subtotal:0,iva:0,total:0}]});
    setEditCompra(r.id); setModalCompra(true);
  };
  const openEditVenta = (r) => {
    setFormV({...r, total:String(r.total), items:r.items||[{id:uid(),producto:"",descripcion:"",cantidad:"1",precio_unit:"",subtotal:0,iva:0,total:0}]});
    setEditVenta(r.id); setModalVenta(true);
  };

  const doDelete = () => {
    if(!deleteConfirm) return;
    if(deleteConfirm.tipo==="venta") setVentas(p=>p.filter(r=>r.id!==deleteConfirm.id));
    else setCompras(p=>p.filter(r=>r.id!==deleteConfirm.id));
    setDeleteConfirm(null);
  };

  // ─── PRODUCTOS & PROVEEDORES CRUD ────────────────────────────────────────
  const saveProd = () => {
    if(!formProd.nombre.trim()) return;
    const r = { id:editProducto||uid(), ...formProd, precio:parseFloat(formProd.precio)||0 };
    setProductos(p=> editProducto ? p.map(x=>x.id===editProducto?r:x) : [r,...p]);
    setModalProducto(false); setEditProducto(null); setFormProd({ nombre:'', descripcion:'', unidad:'unid', precio:'', alicuota_iva:'21', categoria:'Mercadería', codigo:'' });
  };
  const deleteProd = (id) => setProductos(p=>p.filter(x=>x.id!==id));
  const openEditProd = (r) => { setFormProd({...r, precio:String(r.precio)}); setEditProducto(r.id); setModalProducto(true); };
  const saveProv = () => {
    if(!formProv.razon_social.trim()) return;
    const r = { id:editProveedor||uid(), ...formProv };
    setProveedores(p=> editProveedor ? p.map(x=>x.id===editProveedor?r:x) : [r,...p]);
    setModalProveedor(false); setEditProveedor(null); setFormProv({ razon_social:'', cuit:'', telefono:'', email:'', direccion:'', categoria:'Mercadería', notas:'' });
  };
  const deleteProv = (id) => setProveedores(p=>p.filter(x=>x.id!==id));
  const openEditProv = (r) => { setFormProv({...r}); setEditProveedor(r.id); setModalProveedor(true); };
  const selectProductoEnItem = (itemId, prod, tipo) => {
    const rate = ivaRate(prod.alicuota_iva||'21');
    if(tipo==='compra') {
      setFormC(f=>({ ...f, alicuota_iva: prod.alicuota_iva||'21',
        items: f.items.map(it=> it.id===itemId ? { ...it, descripcion: prod.nombre, unidad: prod.unidad||'unid', precio_unit: String(prod.precio||''), subtotal:(parseFloat(it.cantidad)||1)*(prod.precio||0), iva:(parseFloat(it.cantidad)||1)*(prod.precio||0)*rate, total:(parseFloat(it.cantidad)||1)*(prod.precio||0)*(1+rate) } : it)
      }));
    } else {
      setFormV(f=>({ ...f, alicuota_iva: prod.alicuota_iva||'21',
        items: f.items.map(it=> it.id===itemId ? { ...it, producto: prod.nombre, descripcion: prod.descripcion||'', precio_unit: String(prod.precio||''), subtotal:(parseFloat(it.cantidad)||1)*(prod.precio||0), iva:(parseFloat(it.cantidad)||1)*(prod.precio||0)*rate, total:(parseFloat(it.cantidad)||1)*(prod.precio||0)*(1+rate) } : it)
      }));
    }
    setProdSearch(s=>({...s,[itemId]:''}));
  };
  const selectProveedorEnCompra = (prov) => {
    setFormC(f=>({...f, proveedor:prov.razon_social, cuit:prov.cuit||''}));
    setProvSearch('');
  };

  // ─── SIDEBAR ──────────────────────────────────────────────────────────────
  const NAV = [
    {id:"dashboard", icon:"📊", label:"Dashboard"},
    {id:"compras", icon:"🛒", label:"Compras"},
    {id:"ventas", icon:"💰", label:"Ventas"},
    {id:"iva", icon:"🧾", label:"Control IVA"},
    {id:"registros", icon:"📋", label:"Todos los registros"},
    {id:"reportes", icon:"📈", label:"Reportes"},
    {id:"asistente", icon:"🤖", label:"Asistente IA"},
    {id:"productos", icon:"📦", label:"Productos"},
    {id:"proveedores", icon:"🏢", label:"Proveedores"},
  ];

  // ─── RENDER TABS ──────────────────────────────────────────────────────────

  const renderDashboard = () => (
    <div style={{display:"flex",flexDirection:"column",gap:22}}>
      {/* Stats */}
      <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
        <StatCard icon="💰" label="Ventas totales" value={fmt(totalVentas)} sub={`${ventas.length} registros`} color={C.green} />
        <StatCard icon="🛒" label="Compras totales" value={fmt(totalCompras)} sub={`${compras.length} registros`} color={C.red} />
        <StatCard icon="📈" label="Resultado neto" value={fmt(resultado)} sub="Ventas − Compras" color={resultado>=0?C.green:C.red} />
        <StatCard icon="⚖️" label="Posición IVA" value={fmt(Math.abs(ivaBalance))} sub={ivaBalance>0?"Debés al fisco":ivaBalance<0?"Saldo a favor":"Equilibrado"} color={ivaBalance>0?C.red:ivaBalance<0?C.green:C.muted} />
      </div>

      {/* Gráfico Lineal */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:22}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:18}}>Ventas vs Compras por mes</div>
        {allRecords.length===0 ? (
          <div style={{textAlign:"center",color:C.muted,padding:"40px 0"}}>Cargá registros para ver el gráfico.</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="mes" stroke={C.muted} tick={{fontSize:11}} />
              <YAxis stroke={C.muted} tick={{fontSize:11}} tickFormatter={v=>v>=1000?`$${(v/1000).toFixed(0)}k`:`$${v}`} />
              <Tooltip formatter={(v)=>fmt(v)} contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12}} />
              <Legend />
              <Line type="monotone" dataKey="ventas" stroke={C.green} strokeWidth={2} dot={false} name="Ventas" />
              <Line type="monotone" dataKey="compras" stroke={C.red} strokeWidth={2} dot={false} name="Compras" />
              <Line type="monotone" dataKey="resultado" stroke={C.accent} strokeWidth={2} dot={false} name="Resultado" strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
        {/* Barras IVA */}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:22,flex:2,minWidth:280}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:18}}>IVA mensual</div>
          {allRecords.length===0 ? (
            <div style={{textAlign:"center",color:C.muted,padding:"30px 0"}}>Sin datos.</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="mes" stroke={C.muted} tick={{fontSize:10}} />
                <YAxis stroke={C.muted} tick={{fontSize:10}} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v=>fmt(v)} contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12}} />
                <Legend />
                <Bar dataKey="ventas" fill={C.green+"88"} name="IVA Ventas" radius={[3,3,0,0]} />
                <Bar dataKey="compras" fill={C.red+"88"} name="IVA Compras" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie categorías */}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:22,flex:1,minWidth:220}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:18}}>Gastos por categoría</div>
          {pieData.length===0 ? (
            <div style={{textAlign:"center",color:C.muted,padding:"30px 0"}}>Sin datos.</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                    {pieData.map((_, i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v=>fmt(v)} contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12}} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:8}}>
                {pieData.slice(0,4).map((d,i)=>(
                  <div key={d.name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11}}>
                    <span style={{color:C.muted,display:"flex",alignItems:"center",gap:5}}>
                      <span style={{width:8,height:8,borderRadius:"50%",background:PIE_COLORS[i%PIE_COLORS.length],display:"inline-block"}} />{d.name}
                    </span>
                    <span style={{color:C.text,fontWeight:600}}>{fmt(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Últimos movimientos */}
      {allRecords.length>0 && (
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:22}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:14,display:"flex",justifyContent:"space-between"}}>
            Últimos movimientos
            <button onClick={()=>setTab("registros")} style={{background:"none",border:"none",color:C.accent,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>Ver todos →</button>
          </div>
          {[...ventas,...compras].sort((a,b)=>b.fecha.localeCompare(a.fecha)).slice(0,6).map((r,i,arr)=>(
            <div key={r.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none"}}>
              <Badge tipo={r.tipo==="venta"?"venta":r.tipo_comprobante||"gasto"} />
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.tipo==="venta"?(r.cliente||"Venta"):(r.proveedor||"Compra")}</div>
                <div style={{fontSize:11,color:C.muted}}>{fmtD(r.fecha)} · {r.categoria}{r.numero_doc?` · ${r.numero_doc}`:""}</div>
              </div>
              <div style={{fontVariantNumeric:"tabular-nums",fontWeight:700,fontSize:14,color:r.tipo==="venta"?C.green:C.red,whiteSpace:"nowrap"}}>
                {r.tipo==="venta"?"+":"-"}{fmt(r.total)}
              </div>
            </div>
          ))}
        </div>
      )}

      {allRecords.length===0 && (
        <div style={{textAlign:"center",padding:"60px 0",color:C.muted}}>
          <div style={{fontSize:52,marginBottom:14}}>📂</div>
          <div style={{fontSize:16,fontWeight:700,color:C.text,marginBottom:6}}>Bienvenido a ContaAI Pro</div>
          <div style={{fontSize:13}}>Empezá cargando compras con <strong style={{color:C.accent}}>🛒 Compras</strong> o ventas con <strong style={{color:C.green}}>💰 Ventas</strong></div>
        </div>
      )}
    </div>
  );

  const renderFormCompra = () => (
    <>
      <ScanZone tipo="compra" />
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <div><Lbl>Tipo de comprobante</Lbl><Sel value={formC.tipo_comprobante} onChange={e=>setFormC(f=>({...f,tipo_comprobante:e.target.value}))} options={TIPO_COMP} /></div>
        <div><Lbl>Fecha *</Lbl><Inp type="date" value={formC.fecha} onChange={e=>setFormC(f=>({...f,fecha:e.target.value}))} /></div>
        <div style={{gridColumn:"1/-1",position:"relative"}}>
          <Lbl>Proveedor</Lbl>
          <Inp value={provSearch||formC.proveedor} onChange={e=>{ setProvSearch(e.target.value); setFormC(f=>({...f,proveedor:e.target.value})); }} placeholder="Escribí o seleccioná un proveedor..." />
          {provSearch && proveedores.filter(pv=>pv.razon_social.toLowerCase().includes(provSearch.toLowerCase())||pv.cuit?.includes(provSearch)).length>0 && (
            <div style={{position:"absolute",top:"100%",left:0,right:0,background:C.card,border:`1px solid ${C.accent}`,borderRadius:8,zIndex:200,maxHeight:180,overflowY:"auto",boxShadow:"0 8px 24px #00000088"}}>
              {proveedores.filter(pv=>pv.razon_social.toLowerCase().includes(provSearch.toLowerCase())||pv.cuit?.includes(provSearch)).map(pv=>(
                <div key={pv.id} onClick={()=>selectProveedorEnCompra(pv)} style={{padding:"10px 14px",cursor:"pointer",borderBottom:`1px solid ${C.border}`}}
                  onMouseEnter={e=>e.currentTarget.style.background=C.surface} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{fontSize:13,fontWeight:600}}>{pv.razon_social}</div>
                  <div style={{fontSize:11,color:C.muted}}>{pv.cuit||"Sin CUIT"} · {pv.categoria}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div><Lbl>CUIT proveedor</Lbl><Inp value={formC.cuit} onChange={e=>setFormC(f=>({...f,cuit:e.target.value}))} placeholder="20-12345678-9" /></div>
        <div><Lbl>N° Documento</Lbl><Inp value={formC.numero_doc} onChange={e=>setFormC(f=>({...f,numero_doc:e.target.value}))} placeholder="0001-00001234" /></div>
        <div><Lbl>Categoría</Lbl><Sel value={formC.categoria} onChange={e=>setFormC(f=>({...f,categoria:e.target.value}))} options={CAT_GASTO} /></div>
        <div><Lbl>Alícuota IVA</Lbl><Sel value={formC.alicuota_iva} onChange={e=>setFormC(f=>({...f,alicuota_iva:e.target.value}))} options={IVA_ALICUOTAS.map(v=>({v,l:v==="0"?"Exento":`${v}%`}))} /></div>
        <div><Lbl>Total manual (opcional)</Lbl><Inp type="number" value={formC.total} onChange={e=>setFormC(f=>({...f,total:e.target.value}))} placeholder="Se calcula de items" /></div>
      </div>
      {/* Items */}
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <Lbl>Detalle de artículos</Lbl>
          <Btn onClick={addItemC} small outline color={C.accent}>+ Agregar ítem</Btn>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"3fr 1fr 1fr 2fr",gap:6,marginBottom:6}}>
          {["Descripción","Cant.","Unidad","Precio unit."].map(h=><div key={h} style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".7px",fontWeight:700}}>{h}</div>)}
        </div>
        {formC.items.map(it=>(
          <div key={it.id} style={{marginBottom:8}}>
            {productos.length>0 && (
              <div style={{position:"relative",marginBottom:5}}>
                <Inp value={prodSearch[it.id]||""} onChange={e=>setProdSearch(s=>({...s,[it.id]:e.target.value}))} placeholder="🔍 Buscar en catálogo de productos (opcional)..." style={{fontSize:12,padding:"6px 10px"}} />
                {prodSearch[it.id] && productos.filter(p=>p.nombre.toLowerCase().includes((prodSearch[it.id]||"" ).toLowerCase())).length>0 && (
                  <div style={{position:"absolute",top:"100%",left:0,right:0,background:C.card,border:`1px solid ${C.accent}`,borderRadius:8,zIndex:200,maxHeight:160,overflowY:"auto",boxShadow:"0 8px 24px #00000088"}}>
                    {productos.filter(p=>p.nombre.toLowerCase().includes((prodSearch[it.id]||"" ).toLowerCase())).map(p=>(
                      <div key={p.id} onClick={()=>selectProductoEnItem(it.id,p,"compra")} style={{padding:"8px 12px",cursor:"pointer",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between"}}
                        onMouseEnter={e=>e.currentTarget.style.background=C.surface} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <span style={{fontSize:13,fontWeight:600}}>{p.nombre}</span>
                        <span style={{fontSize:12,color:C.cyan}}>{fmt(p.precio)} / {p.unidad}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"3fr 1fr 1fr 2fr auto",gap:6,alignItems:"center"}}>
              <Inp value={it.descripcion} onChange={e=>updItemC(it.id,"descripcion",e.target.value)} placeholder="Descripción del ítem" />
              <Inp type="number" value={it.cantidad} onChange={e=>updItemC(it.id,"cantidad",e.target.value)} min="0" />
              <Inp value={it.unidad} onChange={e=>updItemC(it.id,"unidad",e.target.value)} placeholder="unid" />
              <Inp type="number" value={it.precio_unit} onChange={e=>updItemC(it.id,"precio_unit",e.target.value)} placeholder="0.00" min="0" />
              <button onClick={()=>removeItemC(it.id)} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:16,padding:"0 4px",opacity:.7}}>✕</button>
            </div>
          </div>
        ))}
        {formC.items.length>0 && (
          <div style={{background:C.inputBg,borderRadius:8,padding:"10px 14px",marginTop:8,display:"flex",gap:16,justifyContent:"flex-end",fontSize:12}}>
            <span style={{color:C.muted}}>Neto: <strong style={{color:C.text}}>{fmt(totalCompraItems.neto)}</strong></span>
            <span style={{color:C.muted}}>IVA {formC.alicuota_iva}%: <strong style={{color:C.yellow}}>{fmt(totalCompraItems.iva)}</strong></span>
            <span style={{color:C.muted}}>Total: <strong style={{color:C.red,fontSize:14}}>{fmt(totalCompraItems.total)}</strong></span>
          </div>
        )}
      </div>
      <div style={{marginBottom:16}}><Lbl>Notas</Lbl><Inp value={formC.notas} onChange={e=>setFormC(f=>({...f,notas:e.target.value}))} placeholder="Observaciones opcionales" /></div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <Btn onClick={()=>{setModalCompra(false);setEditCompra(null);setFormC(EMPTY_COMPRA);}} outline color={C.muted}>Cancelar</Btn>
        <Btn onClick={saveCompra} disabled={!formC.proveedor&&!formC.numero_doc} color={C.accent}>{editCompra?"Guardar cambios":"Guardar compra"}</Btn>
      </div>
    </>
  );

  const renderFormVenta = () => (
    <>
      <ScanZone tipo="venta" />
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <div><Lbl>Fecha *</Lbl><Inp type="date" value={formV.fecha} onChange={e=>setFormV(f=>({...f,fecha:e.target.value}))} /></div>
        <div><Lbl>Cliente</Lbl><Inp value={formV.cliente} onChange={e=>setFormV(f=>({...f,cliente:e.target.value}))} placeholder="Nombre o empresa" /></div>
        <div><Lbl>Medio de pago</Lbl><Sel value={formV.medio_pago} onChange={e=>setFormV(f=>({...f,medio_pago:e.target.value}))} options={MEDIOS_PAGO} /></div>
        <div><Lbl>Categoría</Lbl><Sel value={formV.categoria} onChange={e=>setFormV(f=>({...f,categoria:e.target.value}))} options={CAT_VENTA} /></div>
        <div><Lbl>Alícuota IVA</Lbl><Sel value={formV.alicuota_iva} onChange={e=>setFormV(f=>({...f,alicuota_iva:e.target.value}))} options={IVA_ALICUOTAS.map(v=>({v,l:v==="0"?"Exento":`${v}%`}))} /></div>
        <div><Lbl>Total manual (opcional)</Lbl><Inp type="number" value={formV.total} onChange={e=>setFormV(f=>({...f,total:e.target.value}))} placeholder="Se calcula de items" /></div>
      </div>
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <Lbl>Productos / Servicios vendidos</Lbl>
          <Btn onClick={addItemV} small outline color={C.green}>+ Agregar ítem</Btn>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"2fr 2fr 1fr 2fr",gap:6,marginBottom:6}}>
          {["Producto","Descripción","Cant.","Precio unit."].map(h=><div key={h} style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".7px",fontWeight:700}}>{h}</div>)}
        </div>
        {formV.items.map(it=>(
          <div key={it.id} style={{marginBottom:8}}>
            {productos.length>0 && (
              <div style={{position:"relative",marginBottom:5}}>
                <Inp value={prodSearch[it.id]||""} onChange={e=>setProdSearch(s=>({...s,[it.id]:e.target.value}))} placeholder="🔍 Buscar en catálogo de productos (opcional)..." style={{fontSize:12,padding:"6px 10px"}} />
                {prodSearch[it.id] && productos.filter(p=>p.nombre.toLowerCase().includes((prodSearch[it.id]||"" ).toLowerCase())).length>0 && (
                  <div style={{position:"absolute",top:"100%",left:0,right:0,background:C.card,border:`1px solid ${C.green}`,borderRadius:8,zIndex:200,maxHeight:160,overflowY:"auto",boxShadow:"0 8px 24px #00000088"}}>
                    {productos.filter(p=>p.nombre.toLowerCase().includes((prodSearch[it.id]||"" ).toLowerCase())).map(p=>(
                      <div key={p.id} onClick={()=>selectProductoEnItem(it.id,p,"venta")} style={{padding:"8px 12px",cursor:"pointer",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between"}}
                        onMouseEnter={e=>e.currentTarget.style.background=C.surface} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <span style={{fontSize:13,fontWeight:600}}>{p.nombre}</span>
                        <span style={{fontSize:12,color:C.green}}>{fmt(p.precio)} / {p.unidad}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"2fr 2fr 1fr 2fr auto",gap:6,alignItems:"center"}}>
              <Inp value={it.producto} onChange={e=>updItemV(it.id,"producto",e.target.value)} placeholder="Producto" />
              <Inp value={it.descripcion} onChange={e=>updItemV(it.id,"descripcion",e.target.value)} placeholder="Detalle" />
              <Inp type="number" value={it.cantidad} onChange={e=>updItemV(it.id,"cantidad",e.target.value)} min="0" />
              <Inp type="number" value={it.precio_unit} onChange={e=>updItemV(it.id,"precio_unit",e.target.value)} placeholder="0.00" min="0" />
              <button onClick={()=>removeItemV(it.id)} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:16,padding:"0 4px",opacity:.7}}>✕</button>
            </div>
          </div>
        ))}
        {formV.items.length>0 && (
          <div style={{background:C.inputBg,borderRadius:8,padding:"10px 14px",marginTop:8,display:"flex",gap:16,justifyContent:"flex-end",fontSize:12}}>
            <span style={{color:C.muted}}>Neto: <strong style={{color:C.text}}>{fmt(totalVentaItems.neto)}</strong></span>
            <span style={{color:C.muted}}>IVA {formV.alicuota_iva}%: <strong style={{color:C.yellow}}>{fmt(totalVentaItems.iva)}</strong></span>
            <span style={{color:C.muted}}>Total: <strong style={{color:C.green,fontSize:14}}>{fmt(totalVentaItems.total)}</strong></span>
          </div>
        )}
      </div>
      <div style={{marginBottom:16}}><Lbl>Notas</Lbl><Inp value={formV.notas} onChange={e=>setFormV(f=>({...f,notas:e.target.value}))} placeholder="Observaciones opcionales" /></div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <Btn onClick={()=>{setModalVenta(false);setEditVenta(null);setFormV(EMPTY_VENTA);}} outline color={C.muted}>Cancelar</Btn>
        <Btn onClick={saveVenta} color={C.green}>{editVenta?"Guardar cambios":"Guardar venta"}</Btn>
      </div>
    </>
  );

  const renderTablaRegistros = (recs, tipo) => (
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
      <div style={{display:"grid",gridTemplateColumns:"90px 90px 1fr 110px 70px 75px 75px 60px",padding:"9px 18px",background:C.surface,borderBottom:`1px solid ${C.border}`}}>
        {["Tipo","Fecha",tipo==="venta"?"Cliente":"Proveedor","Categoría","IVA","Neto","Total",""].map((h,i)=>(
          <div key={i} style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".7px",fontWeight:700,textAlign:i>3?"right":"left"}}>{h}</div>
        ))}
      </div>
      {recs.length===0 ? (
        <div style={{textAlign:"center",color:C.muted,padding:"40px 0"}}>No hay registros.</div>
      ) : recs.map((r,idx)=>(
        <div key={r.id} style={{display:"grid",gridTemplateColumns:"90px 90px 1fr 110px 70px 75px 75px 60px",padding:"11px 18px",borderBottom:idx<recs.length-1?`1px solid ${C.border}`:"none",transition:"background .1s"}}
          onMouseEnter={e=>e.currentTarget.style.background=C.surface} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <div style={{display:"flex",alignItems:"center"}}><Badge tipo={r.tipo==="venta"?"venta":r.tipo_comprobante||"Otro"} /></div>
          <div style={{display:"flex",alignItems:"center",fontSize:12,color:C.muted}}>{fmtD(r.fecha)}</div>
          <div style={{display:"flex",flexDirection:"column",justifyContent:"center",paddingRight:10}}>
            <div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.cliente||r.proveedor||"—"}</div>
            <div style={{fontSize:10,color:C.muted}}>{r.numero_doc?`N° ${r.numero_doc} · `:""}{r.items?.length||0} ítem{(r.items?.length||0)!==1?"s":""}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",fontSize:12,color:C.muted}}>{r.categoria}</div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",fontVariantNumeric:"tabular-nums",fontSize:12,color:C.yellow}}>{fmt(r.iva)}</div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",fontVariantNumeric:"tabular-nums",fontSize:12,color:C.muted}}>{fmt(r.neto)}</div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",fontVariantNumeric:"tabular-nums",fontWeight:700,fontSize:13,color:r.tipo==="venta"?C.green:C.red}}>{fmt(r.total)}</div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:4}}>
            <button onClick={()=>r.tipo==="venta"?openEditVenta(r):openEditCompra(r)} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,opacity:.6}}>✏️</button>
            <button onClick={()=>setDeleteConfirm({id:r.id,tipo:r.tipo,label:r.cliente||r.proveedor||"este registro"})} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,opacity:.6}}>🗑️</button>
          </div>
        </div>
      ))}
      {recs.length>0 && (
        <div style={{display:"grid",gridTemplateColumns:"90px 90px 1fr 110px 70px 75px 75px 60px",padding:"11px 18px",background:C.surface,borderTop:`2px solid ${C.border}`}}>
          <div/><div/>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,display:"flex",alignItems:"center"}}>TOTALES ({recs.length})</div>
          <div/>
          <div style={{textAlign:"right",fontVariantNumeric:"tabular-nums",fontSize:12,color:C.yellow,display:"flex",alignItems:"center",justifyContent:"flex-end"}}>{fmt(recs.reduce((s,r)=>s+r.iva,0))}</div>
          <div style={{textAlign:"right",fontVariantNumeric:"tabular-nums",fontSize:12,color:C.muted,display:"flex",alignItems:"center",justifyContent:"flex-end"}}>{fmt(recs.reduce((s,r)=>s+r.neto,0))}</div>
          <div style={{textAlign:"right",fontVariantNumeric:"tabular-nums",fontWeight:800,fontSize:14,display:"flex",alignItems:"center",justifyContent:"flex-end"}}>{fmt(recs.reduce((s,r)=>s+r.total,0))}</div>
          <div/>
        </div>
      )}
    </div>
  );

  // ─── MAIN RENDER ──────────────────────────────────────────────────────────
  return (
    <div style={{display:"flex",minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      <style>{`
        *{box-sizing:border-box;} input[type=date]::-webkit-calendar-picker-indicator{filter:invert(.5);cursor:pointer;}
        ::-webkit-scrollbar{width:5px;} ::-webkit-scrollbar-track{background:transparent;} ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px;}
        select option{background:${C.inputBg};}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .fade{animation:fadeUp .2s ease;}
        textarea{resize:vertical;min-height:60px;}
      `}</style>

      {/* ── Sidebar ── */}
      <div style={{width:220,background:C.surface,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",position:"sticky",top:0,height:"100vh",overflowY:"auto"}}>
        <div style={{padding:"20px 18px 14px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
            <div style={{width:34,height:34,background:`linear-gradient(135deg,${C.accent},${C.purple})`,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>💼</div>
            <div>
              <div style={{fontWeight:800,fontSize:15,letterSpacing:"-.3px"}}>ContaAI Pro</div>
              <div style={{fontSize:10,color:C.muted}}>Gestión financiera</div>
            </div>
          </div>
        </div>
        <nav style={{flex:1,padding:"0 10px"}}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setTab(n.id)} style={{
              display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 12px",
              background:tab===n.id?C.accent+"22":"transparent",
              border:`1px solid ${tab===n.id?C.accent+"44":"transparent"}`,
              color:tab===n.id?C.accent:C.muted,
              borderRadius:9,cursor:"pointer",fontSize:13,fontWeight:tab===n.id?700:500,
              fontFamily:"inherit",transition:"all .15s",marginBottom:2,textAlign:"left",
            }}>
              <span style={{fontSize:16}}>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div style={{padding:"14px 18px",borderTop:`1px solid ${C.border}`,fontSize:11,color:C.muted}}>
          <div style={{marginBottom:4}}>📊 {ventas.length} ventas · {compras.length} compras</div>
          <div style={{color:resultado>=0?C.green:C.red,fontWeight:700}}>Resultado: {fmt(resultado)}</div>
        </div>
      </div>

      {/* ── Contenido ── */}
      <div style={{flex:1,overflowY:"auto",maxHeight:"100vh"}}>
        {/* Header */}
        <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"0 28px",position:"sticky",top:0,zIndex:50}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",height:60}}>
            <div style={{fontWeight:800,fontSize:16}}>
              {NAV.find(n=>n.id===tab)?.icon} {NAV.find(n=>n.id===tab)?.label}
            </div>
            <div style={{display:"flex",gap:10}}>
              {tab==="compras"&&<><Btn onClick={()=>{setFormC(EMPTY_COMPRA);setEditCompra(null);setModalCompra(true);}} color={C.accent}>+ Nueva compra</Btn><Btn onClick={()=>setImportModal("compra")} outline color={C.accent} small>📥 Importar CSV</Btn></>}
              {tab==="ventas"&&<><Btn onClick={()=>{setFormV(EMPTY_VENTA);setEditVenta(null);setModalVenta(true);}} color={C.green}>+ Nueva venta</Btn><Btn onClick={()=>setImportModal("venta")} outline color={C.green} small>📥 Importar CSV</Btn></>}
              {tab==="reportes"&&<><Btn onClick={()=>exportLibroIVA("ventas")} outline color={C.accent} small>📤 Libro IVA Ventas</Btn><Btn onClick={()=>exportLibroIVA("compras")} outline color={C.red} small>📤 Libro IVA Compras</Btn></>}
              {tab==="registros"&&<><Btn onClick={()=>exportCSV(filteredAll,"registros.csv")} outline color={C.muted} small>📤 Exportar CSV</Btn></>}
              {tab==="productos"&&<Btn onClick={()=>{setFormProd({nombre:'',descripcion:'',unidad:'unid',precio:'',alicuota_iva:'21',categoria:'Mercadería',codigo:''});setEditProducto(null);setModalProducto(true);}} color={C.cyan}>+ Nuevo producto</Btn>}
              {tab==="proveedores"&&<Btn onClick={()=>{setFormProv({razon_social:'',cuit:'',telefono:'',email:'',direccion:'',categoria:'Mercadería',notas:''});setEditProveedor(null);setModalProveedor(true);}} color={C.orange}>+ Nuevo proveedor</Btn>}
            </div>
          </div>
        </div>

        <div style={{padding:28}}>

          {/* DASHBOARD */}
          {tab==="dashboard" && <div className="fade">{renderDashboard()}</div>}

          {/* COMPRAS */}
          {tab==="compras" && (
            <div className="fade" style={{display:"flex",flexDirection:"column",gap:20}}>
              <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                <StatCard icon="🛒" label="Total compras" value={fmt(totalCompras)} sub={`${compras.length} registros`} color={C.red} />
                <StatCard icon="🧾" label="IVA crédito fiscal" value={fmt(ivaCompras)} sub="IVA pagado a proveedores" color={C.yellow} />
                <StatCard icon="📋" label="Facturas A" value={compras.filter(r=>r.tipo_comprobante==="Factura A").length} sub="comprobantes" />
                <StatCard icon="📋" label="Facturas B/C" value={compras.filter(r=>r.tipo_comprobante==="Factura B"||r.tipo_comprobante==="Factura C").length} sub="comprobantes" />
              </div>
              {renderTablaRegistros(compras.sort((a,b)=>b.fecha.localeCompare(a.fecha)),"compra")}
            </div>
          )}

          {/* VENTAS */}
          {tab==="ventas" && (
            <div className="fade" style={{display:"flex",flexDirection:"column",gap:20}}>
              <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                <StatCard icon="💰" label="Total ventas" value={fmt(totalVentas)} sub={`${ventas.length} registros`} color={C.green} />
                <StatCard icon="🧾" label="IVA débito fiscal" value={fmt(ivaVentas)} sub="IVA cobrado a clientes" color={C.yellow} />
                <StatCard icon="💳" label="Efectivo" value={fmt(ventas.filter(r=>r.medio_pago==="Efectivo").reduce((s,r)=>s+r.total,0))} sub="en ventas" />
                <StatCard icon="📱" label="Digital" value={fmt(ventas.filter(r=>r.medio_pago!=="Efectivo").reduce((s,r)=>s+r.total,0))} sub="transferencias + tarjetas" />
              </div>
              {renderTablaRegistros(ventas.sort((a,b)=>b.fecha.localeCompare(a.fecha)),"venta")}
            </div>
          )}

          {/* IVA */}
          {tab==="iva" && (
            <div className="fade" style={{display:"flex",flexDirection:"column",gap:20}}>
              {/* Selector período */}
              <div style={{display:"flex",gap:14,alignItems:"center",background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 20px"}}>
                <span style={{fontSize:13,color:C.muted,fontWeight:600}}>Período:</span>
                <Sel value={periodoIva} onChange={e=>setPeriodoIva(Number(e.target.value))} options={MESES.map((m,i)=>({v:i,l:m}))} style={{width:100}} />
                <Inp type="number" value={anioIva} onChange={e=>setAnioIva(Number(e.target.value))} style={{width:80}} />
                <span style={{fontSize:12,color:C.muted}}>{ventas.filter(r=>new Date(r.fecha+"T00:00:00").getMonth()===periodoIva&&new Date(r.fecha+"T00:00:00").getFullYear()===anioIva).length} ventas · {compras.filter(r=>new Date(r.fecha+"T00:00:00").getMonth()===periodoIva&&new Date(r.fecha+"T00:00:00").getFullYear()===anioIva).length} compras en el período</span>
              </div>

              <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                <StatCard icon="⬆️" label="Débito fiscal (ventas)" value={fmt(ivaVentasPer)} sub={`IVA cobrado · ${MESES[periodoIva]} ${anioIva}`} color={C.red} />
                <StatCard icon="⬇️" label="Crédito fiscal (compras)" value={fmt(ivaComprasPer)} sub={`IVA pagado · ${MESES[periodoIva]} ${anioIva}`} color={C.green} />
                <StatCard icon="⚖️" label={ivaVentasPer-ivaComprasPer>=0?"A pagar al fisco":"Saldo a favor"} value={fmt(Math.abs(ivaVentasPer-ivaComprasPer))} sub="Posición neta del período" color={(ivaVentasPer-ivaComprasPer)>0?C.red:(ivaVentasPer-ivaComprasPer)<0?C.green:C.muted} />
              </div>

              {/* Tabla IVA por alícuota */}
              {[["21","IVA 21%"],["10.5","IVA 10.5%"],["27","IVA 27%"],["0","Exento"]].map(([ali,label])=>{
                const ventasAli = ventas.filter(r=>r.alicuota_iva===ali);
                const comprasAli = compras.filter(r=>r.alicuota_iva===ali);
                if(!ventasAli.length&&!comprasAli.length) return null;
                return (
                  <div key={ali} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:18}}>
                    <div style={{fontWeight:700,fontSize:13,marginBottom:12,color:C.yellow}}>{label}</div>
                    <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:11,color:C.muted,marginBottom:4}}>Ventas (Débito)</div>
                        <div style={{fontSize:18,fontWeight:800,color:C.red,fontVariantNumeric:"tabular-nums"}}>{fmt(ventasAli.reduce((s,r)=>s+r.iva,0))}</div>
                        <div style={{fontSize:11,color:C.muted}}>sobre {fmt(ventasAli.reduce((s,r)=>s+r.neto,0))} neto</div>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:11,color:C.muted,marginBottom:4}}>Compras (Crédito)</div>
                        <div style={{fontSize:18,fontWeight:800,color:C.green,fontVariantNumeric:"tabular-nums"}}>{fmt(comprasAli.reduce((s,r)=>s+r.iva,0))}</div>
                        <div style={{fontSize:11,color:C.muted}}>sobre {fmt(comprasAli.reduce((s,r)=>s+r.neto,0))} neto</div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Tabla detalle IVA */}
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
                <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.border}`,fontWeight:700,fontSize:14}}>Detalle completo IVA</div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead>
                      <tr style={{borderBottom:`1px solid ${C.border}`,background:C.surface}}>
                        {["Fecha","Tipo","Proveedor/Cliente","Alíc.","Neto","IVA","Total"].map(h=>(
                          <th key={h} style={{padding:"9px 14px",textAlign:"left",fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".7px",fontWeight:700,whiteSpace:"nowrap"}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...ventas,...compras].sort((a,b)=>b.fecha.localeCompare(a.fecha)).map((r,i,arr)=>(
                        <tr key={r.id} style={{borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none"}}>
                          <td style={{padding:"10px 14px",color:C.muted,whiteSpace:"nowrap"}}>{fmtD(r.fecha)}</td>
                          <td style={{padding:"10px 14px"}}><Badge tipo={r.tipo==="venta"?"venta":r.tipo_comprobante||"Otro"} /></td>
                          <td style={{padding:"10px 14px",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.cliente||r.proveedor||"—"}</td>
                          <td style={{padding:"10px 14px",color:C.yellow,fontWeight:700}}>{r.alicuota_iva==="0"?"Exento":`${r.alicuota_iva}%`}</td>
                          <td style={{padding:"10px 14px",fontVariantNumeric:"tabular-nums",color:C.muted}}>{fmt(r.neto)}</td>
                          <td style={{padding:"10px 14px",fontVariantNumeric:"tabular-nums",fontWeight:700,color:r.tipo==="venta"?C.red:C.green}}>{r.tipo==="venta"?"+":"-"}{fmt(r.iva)}</td>
                          <td style={{padding:"10px 14px",fontVariantNumeric:"tabular-nums",fontWeight:700}}>{fmt(r.total)}</td>
                        </tr>
                      ))}
                      {allRecords.length>0&&(
                        <tr style={{borderTop:`2px solid ${C.border}`,background:C.surface}}>
                          <td colSpan={4} style={{padding:"11px 14px",fontWeight:700,color:C.muted}}>POSICIÓN NETA</td>
                          <td style={{padding:"11px 14px",fontVariantNumeric:"tabular-nums",fontWeight:700}}>{fmt(ventas.reduce((s,r)=>s+r.neto,0)-compras.reduce((s,r)=>s+r.neto,0))}</td>
                          <td style={{padding:"11px 14px",fontVariantNumeric:"tabular-nums",fontWeight:800,fontSize:14,color:ivaBalance>=0?C.red:C.green}}>{ivaBalance>=0?"+":""}{fmt(ivaBalance)}</td>
                          <td style={{padding:"11px 14px",fontVariantNumeric:"tabular-nums",fontWeight:800,fontSize:14}}>{fmt(resultado)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{background:C.yellow+"10",border:`1px solid ${C.yellow}33`,borderRadius:12,padding:18}}>
                <div style={{fontWeight:700,color:C.yellow,marginBottom:8}}>💡 Posición de IVA</div>
                <div style={{fontSize:13,color:C.muted,lineHeight:1.8}}>
                  <strong style={{color:C.text}}>Débito Fiscal:</strong> IVA que cobrás en tus ventas. Lo debés al fisco.<br/>
                  <strong style={{color:C.text}}>Crédito Fiscal:</strong> IVA que pagás en tus compras. Lo descontás del débito.<br/>
                  <strong style={{color:C.text}}>Posición neta:</strong> Débito − Crédito. Si es positivo, pagás ese monto al fisco. Si es negativo, tenés saldo técnico a favor.
                </div>
              </div>
            </div>
          )}

          {/* TODOS LOS REGISTROS */}
          {tab==="registros" && (
            <div className="fade" style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
                <div style={{flex:2,minWidth:200}}>
                  <Lbl>Buscar por proveedor, cliente, categoría o producto</Lbl>
                  <Inp value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="🔍  Buscar..." />
                </div>
                <div>
                  <Lbl>Desde</Lbl>
                  <Inp type="date" value={filtroFecha.desde} onChange={e=>setFiltroFecha(f=>({...f,desde:e.target.value}))} style={{width:140}} />
                </div>
                <div>
                  <Lbl>Hasta</Lbl>
                  <Inp type="date" value={filtroFecha.hasta} onChange={e=>setFiltroFecha(f=>({...f,hasta:e.target.value}))} style={{width:140}} />
                </div>
                <Btn onClick={()=>{setBusqueda("");setFiltroFecha({desde:"",hasta:""});}} outline color={C.muted} small>Limpiar</Btn>
              </div>
              {renderTablaRegistros(filteredAll, "all")}
            </div>
          )}

          {/* REPORTES */}
          {tab==="reportes" && (
            <div className="fade" style={{display:"flex",flexDirection:"column",gap:20}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:14}}>
                {[
                  {icon:"📗",title:"Libro IVA Ventas",desc:"Todas las ventas con IVA débito fiscal desglosado",action:()=>exportLibroIVA("ventas"),color:C.green},
                  {icon:"📕",title:"Libro IVA Compras",desc:"Todas las compras con IVA crédito fiscal desglosado",action:()=>exportLibroIVA("compras"),color:C.red},
                  {icon:"📊",title:"Reporte de Ventas",desc:"Ventas detalladas con ítems, medios de pago y categorías",action:()=>exportCSV(ventas,"reporte_ventas.csv"),color:C.accent},
                  {icon:"🛒",title:"Reporte de Compras",desc:"Compras con proveedores, CUIT, comprobantes",action:()=>exportCSV(compras,"reporte_compras.csv"),color:C.purple},
                  {icon:"👥",title:"Reporte de Proveedores",desc:"Resumen de compras agrupadas por proveedor",action:()=>{
                    const prov={};compras.forEach(r=>{const k=r.proveedor||"Sin proveedor";prov[k]=(prov[k]||{total:0,iva:0,count:0});prov[k].total+=r.total;prov[k].iva+=r.iva;prov[k].count++;});
                    exportCSV(Object.entries(prov).map(([p,d])=>({Proveedor:p,Compras:d.count,Total:d.total.toFixed(2),IVA:d.iva.toFixed(2)})),"proveedores.csv");
                  },color:C.cyan},
                  {icon:"💰",title:"Estado de Resultados",desc:"Ingresos, egresos, ganancia bruta y neta",action:()=>exportCSV([{Ventas:totalVentas.toFixed(2),Compras:totalCompras.toFixed(2),ResultadoBruto:resultado.toFixed(2),IVAVentas:ivaVentas.toFixed(2),IVACompras:ivaCompras.toFixed(2),BalanceIVA:ivaBalance.toFixed(2)}],"estado_resultados.csv"),color:C.orange},
                ].map(r=>(
                  <div key={r.title} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:20,display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{fontSize:28}}>{r.icon}</div>
                    <div style={{fontWeight:700,fontSize:14}}>{r.title}</div>
                    <div style={{fontSize:12,color:C.muted,flex:1,lineHeight:1.6}}>{r.desc}</div>
                    <Btn onClick={r.action} color={r.color} small>📤 Exportar CSV</Btn>
                  </div>
                ))}
              </div>

              {/* Resumen financiero */}
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:22}}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:16}}>📊 Estado de Resultados</div>
                {[
                  {label:"Ingresos (Ventas)",value:totalVentas,color:C.green},
                  {label:"IVA Débito Fiscal",value:ivaVentas,color:C.muted,small:true},
                  {label:"Ventas Netas",value:ventas.reduce((s,r)=>s+r.neto,0),color:C.green,small:true},
                  null,
                  {label:"Egresos (Compras)",value:totalCompras,color:C.red},
                  {label:"IVA Crédito Fiscal",value:ivaCompras,color:C.muted,small:true},
                  {label:"Compras Netas",value:compras.reduce((s,r)=>s+r.neto,0),color:C.red,small:true},
                  null,
                  {label:"Resultado Bruto",value:resultado,color:resultado>=0?C.green:C.red,bold:true},
                  {label:"Posición IVA neta",value:ivaBalance,color:ivaBalance>=0?C.red:C.green,bold:true},
                ].map((row,i)=> row===null ? (
                  <div key={i} style={{borderTop:`1px solid ${C.border}`,margin:"8px 0"}} />
                ) : (
                  <div key={i} style={{display:"flex",justifyContent:"space-between",padding:`${row.small?"4px":"8px"} ${row.small?"16px":"0"}`,alignItems:"center"}}>
                    <span style={{fontSize:row.small?12:13,color:row.bold?C.text:C.muted,fontWeight:row.bold?700:500}}>{row.label}</span>
                    <span style={{fontVariantNumeric:"tabular-nums",fontSize:row.small?12:14,fontWeight:row.bold?800:600,color:row.color}}>{fmt(row.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ASISTENTE IA */}
          {tab==="asistente" && (
            <div className="fade" style={{display:"flex",flexDirection:"column",gap:0,height:"calc(100vh - 120px)"}}>
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
                <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:36,height:36,background:`linear-gradient(135deg,${C.purple},${C.accent})`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🤖</div>
                  <div>
                    <div style={{fontWeight:700,fontSize:14}}>Asistente Contable IA</div>
                    <div style={{fontSize:11,color:C.muted}}>Preguntale sobre tus finanzas · {allRecords.length} registros cargados</div>
                  </div>
                </div>

                <div style={{flex:1,overflowY:"auto",padding:20,display:"flex",flexDirection:"column",gap:14}}>
                  {chatR.length===0 && (
                    <div style={{textAlign:"center",padding:"40px 20px",color:C.muted}}>
                      <div style={{fontSize:40,marginBottom:12}}>💬</div>
                      <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:8}}>¿En qué te puedo ayudar?</div>
                      <div style={{fontSize:12,marginBottom:20}}>Preguntame sobre tus ventas, compras, IVA o gastos.</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center"}}>
                        {["¿Cuánto gasté este mes?","¿Cuánto IVA debo al fisco?","¿Cuál fue mi ganancia?","¿Cuáles son mis mayores gastos?"].map(q=>(
                          <button key={q} onClick={()=>setChatQ(q)} style={{background:C.surface,border:`1px solid ${C.border}`,color:C.text,borderRadius:20,padding:"7px 14px",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>{q}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {chatR.map((m,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:m.r==="user"?"flex-end":"flex-start"}}>
                      <div style={{
                        maxWidth:"75%",padding:"12px 16px",borderRadius:12,
                        background:m.r==="user"?C.accent:C.surface,
                        border:`1px solid ${m.r==="user"?C.accent:C.border}`,
                        fontSize:13,lineHeight:1.7,whiteSpace:"pre-wrap",
                      }}>{m.t}</div>
                    </div>
                  ))}
                  {loadingChat && (
                    <div style={{display:"flex",gap:6,padding:"12px 16px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,width:80}}>
                      {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:C.muted,animation:`bounce .8s ${i*.2}s infinite ease-in-out`}} />)}
                      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}`}</style>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div style={{padding:16,borderTop:`1px solid ${C.border}`,display:"flex",gap:10}}>
                  <Inp value={chatQ} onChange={e=>setChatQ(e.target.value)}
                    placeholder="¿Cuánto gasté en mercadería este mes? ¿Cuál fue mi ganancia?"
                    style={{flex:1}}
                    onFocus={e=>e.target.style.borderColor=C.accent}
                    onBlur={e=>e.target.style.borderColor=C.border}
                  />
                  <Btn onClick={sendChat} disabled={loadingChat||!chatQ.trim()} color={C.accent}>
                    {loadingChat?"...":"Enviar"}
                  </Btn>
                </div>
              </div>
              {allRecords.length===0&&<div style={{textAlign:"center",color:C.yellow,fontSize:12,marginTop:10}}>⚠️ Cargá registros primero para que el asistente tenga datos reales.</div>}
            </div>
          )}

        </div>
      </div>


          {/* PRODUCTOS */}
          {tab==="productos" && (
            <div className="fade" style={{display:"flex",flexDirection:"column",gap:20}}>
              <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                <StatCard icon="📦" label="Productos cargados" value={productos.length} sub="en catálogo" color={C.cyan} />
                <StatCard icon="💲" label="Precio promedio" value={fmt(productos.length?productos.reduce((s,p)=>s+p.precio,0)/productos.length:0)} sub="precio unitario" />
              </div>
              <div style={{marginBottom:10}}>
                <Inp value={busqProd} onChange={e=>setBusqProd(e.target.value)} placeholder="🔍  Buscar producto por nombre o código..." />
              </div>
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
                <div style={{display:"grid",gridTemplateColumns:"80px 1fr 140px 80px 80px 80px 60px",padding:"9px 18px",background:C.surface,borderBottom:`1px solid ${C.border}`}}>
                  {["Código","Nombre / Descripción","Categoría","Unidad","Alíc. IVA","Precio",""].map((h,i)=>(
                    <div key={i} style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".7px",fontWeight:700,textAlign:i>3?"right":"left"}}>{h}</div>
                  ))}
                </div>
                {productos.filter(p=>!busqProd||p.nombre.toLowerCase().includes(busqProd.toLowerCase())||p.codigo?.toLowerCase().includes(busqProd.toLowerCase())).length===0 ? (
                  <div style={{textAlign:"center",color:C.muted,padding:"44px 0"}}>
                    <div style={{fontSize:36,marginBottom:8}}>📦</div>
                    No hay productos cargados. Hacé clic en <strong style={{color:C.cyan}}>+ Nuevo producto</strong> para agregar.
                  </div>
                ) : productos.filter(p=>!busqProd||p.nombre.toLowerCase().includes(busqProd.toLowerCase())||p.codigo?.toLowerCase().includes(busqProd.toLowerCase())).map((p,idx,arr)=>(
                  <div key={p.id} style={{display:"grid",gridTemplateColumns:"80px 1fr 140px 80px 80px 80px 60px",padding:"12px 18px",borderBottom:idx<arr.length-1?`1px solid ${C.border}`:"none",transition:"background .1s"}}
                    onMouseEnter={e=>e.currentTarget.style.background=C.surface} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{display:"flex",alignItems:"center",fontSize:11,color:C.muted,fontFamily:"monospace"}}>{p.codigo||"—"}</div>
                    <div style={{display:"flex",flexDirection:"column",justifyContent:"center",paddingRight:10}}>
                      <div style={{fontSize:13,fontWeight:700}}>{p.nombre}</div>
                      {p.descripcion&&<div style={{fontSize:11,color:C.muted}}>{p.descripcion}</div>}
                    </div>
                    <div style={{display:"flex",alignItems:"center",fontSize:12,color:C.muted}}>{p.categoria}</div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",fontSize:12,color:C.muted}}>{p.unidad}</div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",fontSize:12,color:C.yellow}}>{p.alicuota_iva==="0"?"Exento":`${p.alicuota_iva}%`}</div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",fontVariantNumeric:"tabular-nums",fontWeight:700,fontSize:14,color:C.cyan}}>{fmt(p.precio)}</div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:4}}>
                      <button onClick={()=>openEditProd(p)} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,opacity:.6}}>✏️</button>
                      <button onClick={()=>deleteProd(p.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,opacity:.6}}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PROVEEDORES */}
          {tab==="proveedores" && (
            <div className="fade" style={{display:"flex",flexDirection:"column",gap:20}}>
              <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                <StatCard icon="🏢" label="Proveedores cargados" value={proveedores.length} sub="en directorio" color={C.orange} />
                <StatCard icon="🛒" label="Con compras registradas" value={proveedores.filter(pv=>compras.some(c=>c.proveedor===pv.razon_social)).length} sub="proveedores activos" color={C.accent} />
              </div>
              <Inp value={busqProv} onChange={e=>setBusqProv(e.target.value)} placeholder="🔍  Buscar proveedor por nombre o CUIT..." />
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 130px 120px 120px 100px 60px",padding:"9px 18px",background:C.surface,borderBottom:`1px solid ${C.border}`}}>
                  {["Razón Social","CUIT","Teléfono","Email","Categoría",""].map((h,i)=>(
                    <div key={i} style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".7px",fontWeight:700}}>{h}</div>
                  ))}
                </div>
                {proveedores.filter(pv=>!busqProv||pv.razon_social.toLowerCase().includes(busqProv.toLowerCase())||pv.cuit?.includes(busqProv)).length===0 ? (
                  <div style={{textAlign:"center",color:C.muted,padding:"44px 0"}}>
                    <div style={{fontSize:36,marginBottom:8}}>🏢</div>
                    No hay proveedores cargados. Hacé clic en <strong style={{color:C.orange}}>+ Nuevo proveedor</strong> para agregar.
                  </div>
                ) : proveedores.filter(pv=>!busqProv||pv.razon_social.toLowerCase().includes(busqProv.toLowerCase())||pv.cuit?.includes(busqProv)).map((pv,idx,arr)=>(
                  <div key={pv.id} style={{display:"grid",gridTemplateColumns:"1fr 130px 120px 120px 100px 60px",padding:"12px 18px",borderBottom:idx<arr.length-1?`1px solid ${C.border}`:"none",transition:"background .1s"}}
                    onMouseEnter={e=>e.currentTarget.style.background=C.surface} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{display:"flex",flexDirection:"column",justifyContent:"center"}}>
                      <div style={{fontSize:13,fontWeight:700}}>{pv.razon_social}</div>
                      {pv.direccion&&<div style={{fontSize:11,color:C.muted}}>{pv.direccion}</div>}
                    </div>
                    <div style={{display:"flex",alignItems:"center",fontSize:12,color:C.muted,fontFamily:"monospace"}}>{pv.cuit||"—"}</div>
                    <div style={{display:"flex",alignItems:"center",fontSize:12,color:C.muted}}>{pv.telefono||"—"}</div>
                    <div style={{display:"flex",alignItems:"center",fontSize:12,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pv.email||"—"}</div>
                    <div style={{display:"flex",alignItems:"center",fontSize:12,color:C.muted}}>{pv.categoria}</div>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <button onClick={()=>openEditProv(pv)} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,opacity:.6}}>✏️</button>
                      <button onClick={()=>deleteProv(pv.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,opacity:.6}}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

      
      {/* ── MODAL PRODUCTO ── */}
      {modalProducto && (
        <Modal title={editProducto?"Editar producto":"Nuevo producto"} onClose={()=>{setModalProducto(false);setEditProducto(null);}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <div style={{gridColumn:"1/-1"}}><Lbl>Nombre del producto *</Lbl><Inp value={formProd.nombre} onChange={e=>setFormProd(f=>({...f,nombre:e.target.value}))} placeholder="Ej: Frutilla Premium" /></div>
            <div style={{gridColumn:"1/-1"}}><Lbl>Descripción</Lbl><Inp value={formProd.descripcion} onChange={e=>setFormProd(f=>({...f,descripcion:e.target.value}))} placeholder="Detalle opcional" /></div>
            <div><Lbl>Código interno</Lbl><Inp value={formProd.codigo} onChange={e=>setFormProd(f=>({...f,codigo:e.target.value}))} placeholder="Ej: FRUCT-001" /></div>
            <div><Lbl>Unidad de medida</Lbl><Sel value={formProd.unidad} onChange={e=>setFormProd(f=>({...f,unidad:e.target.value}))} options={["unid","kg","gr","lt","ml","caja","pack","hs","m2","otro"]} /></div>
            <div><Lbl>Precio unitario *</Lbl><Inp type="number" value={formProd.precio} onChange={e=>setFormProd(f=>({...f,precio:e.target.value}))} placeholder="0.00" /></div>
            <div><Lbl>Alícuota IVA</Lbl><Sel value={formProd.alicuota_iva} onChange={e=>setFormProd(f=>({...f,alicuota_iva:e.target.value}))} options={[{v:"21",l:"21%"},{v:"10.5",l:"10.5%"},{v:"27",l:"27%"},{v:"0",l:"Exento"}]} /></div>
            <div style={{gridColumn:"1/-1"}}><Lbl>Categoría</Lbl><Sel value={formProd.categoria} onChange={e=>setFormProd(f=>({...f,categoria:e.target.value}))} options={["Mercadería","Materia prima","Servicios","Insumos","Equipamiento","Otros"]} /></div>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <Btn onClick={()=>{setModalProducto(false);setEditProducto(null);}} outline color={C.muted}>Cancelar</Btn>
            <Btn onClick={saveProd} disabled={!formProd.nombre.trim()||!formProd.precio} color={C.cyan}>{editProducto?"Guardar cambios":"Agregar producto"}</Btn>
          </div>
        </Modal>
      )}

      {/* ── MODAL PROVEEDOR ── */}
      {modalProveedor && (
        <Modal title={editProveedor?"Editar proveedor":"Nuevo proveedor"} onClose={()=>{setModalProveedor(false);setEditProveedor(null);}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <div style={{gridColumn:"1/-1"}}><Lbl>Razón social *</Lbl><Inp value={formProv.razon_social} onChange={e=>setFormProv(f=>({...f,razon_social:e.target.value}))} placeholder="Nombre o razón social" /></div>
            <div><Lbl>CUIT</Lbl><Inp value={formProv.cuit} onChange={e=>setFormProv(f=>({...f,cuit:e.target.value}))} placeholder="20-12345678-9" /></div>
            <div><Lbl>Teléfono</Lbl><Inp value={formProv.telefono} onChange={e=>setFormProv(f=>({...f,telefono:e.target.value}))} placeholder="+54 11 1234-5678" /></div>
            <div><Lbl>Email</Lbl><Inp value={formProv.email} onChange={e=>setFormProv(f=>({...f,email:e.target.value}))} placeholder="proveedor@empresa.com" /></div>
            <div><Lbl>Categoría principal</Lbl><Sel value={formProv.categoria} onChange={e=>setFormProv(f=>({...f,categoria:e.target.value}))} options={["Mercadería","Materia prima","Servicios","Alquiler","Logística","Otros"]} /></div>
            <div style={{gridColumn:"1/-1"}}><Lbl>Dirección</Lbl><Inp value={formProv.direccion} onChange={e=>setFormProv(f=>({...f,direccion:e.target.value}))} placeholder="Dirección del proveedor" /></div>
            <div style={{gridColumn:"1/-1"}}><Lbl>Notas</Lbl><Inp value={formProv.notas} onChange={e=>setFormProv(f=>({...f,notas:e.target.value}))} placeholder="Condiciones de pago, contacto, etc." /></div>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <Btn onClick={()=>{setModalProveedor(false);setEditProveedor(null);}} outline color={C.muted}>Cancelar</Btn>
            <Btn onClick={saveProv} disabled={!formProv.razon_social.trim()} color={C.orange}>{editProveedor?"Guardar cambios":"Agregar proveedor"}</Btn>
          </div>
        </Modal>
      )}

      {/* ── MODALES ── */}
      {modalCompra && (
        <Modal title={editCompra?"Editar compra":"Nueva compra / gasto"} onClose={()=>{setModalCompra(false);setEditCompra(null);setFormC(EMPTY_COMPRA);}} wide>
          {renderFormCompra()}
        </Modal>
      )}
      {modalVenta && (
        <Modal title={editVenta?"Editar venta":"Nueva venta"} onClose={()=>{setModalVenta(false);setEditVenta(null);setFormV(EMPTY_VENTA);}} wide>
          {renderFormVenta()}
        </Modal>
      )}

      {/* Import modal */}
      {importModal && (
        <Modal title={`Importar ${importModal==="compra"?"compras":"ventas"} desde CSV`} onClose={()=>{setImportModal(null);setImportPreview(null);}}>
          <div style={{marginBottom:16,fontSize:13,color:C.muted,lineHeight:1.7}}>
            Subí un archivo CSV o Excel exportado desde cualquier sistema. El sistema detecta automáticamente las columnas de fecha, monto, proveedor/cliente y categoría.<br/><br/>
            <strong style={{color:C.text}}>Columnas reconocidas:</strong> fecha/date/día, total/monto/importe/amount, proveedor/empresa/supplier, cliente/client/customer, categoría/category, etc.
          </div>
          <input type="file" accept=".csv,.txt" ref={fileRef} onChange={handleImportFile} style={{display:"none"}} />
          {!importPreview ? (
            <div style={{border:`2px dashed ${C.border}`,borderRadius:12,padding:"40px 20px",textAlign:"center",cursor:"pointer"}} onClick={()=>fileRef.current.click()}>
              <div style={{fontSize:36,marginBottom:8}}>📂</div>
              <div style={{fontWeight:600,fontSize:14}}>Hacé clic para seleccionar CSV</div>
              <div style={{fontSize:12,color:C.muted,marginTop:4}}>También podés arrastrar el archivo aquí</div>
            </div>
          ) : (
            <>
              <div style={{fontSize:12,color:C.green,marginBottom:10}}>✅ {importPreview.all.length} filas detectadas. Vista previa de las primeras {importPreview.rows.length}:</div>
              <div style={{overflowX:"auto",marginBottom:16,maxHeight:200,overflowY:"auto",border:`1px solid ${C.border}`,borderRadius:8}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                  <thead>
                    <tr style={{background:C.surface,position:"sticky",top:0}}>
                      {Object.keys(importPreview.rows[0]||{}).map(h=><th key={h} style={{padding:"6px 10px",textAlign:"left",color:C.muted,whiteSpace:"nowrap"}}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.rows.map((row,i)=>(
                      <tr key={i} style={{borderBottom:`1px solid ${C.border}`}}>
                        {Object.values(row).map((v,j)=><td key={j} style={{padding:"6px 10px",color:C.text,whiteSpace:"nowrap"}}>{v}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
                <Btn onClick={()=>setImportPreview(null)} outline color={C.muted}>Cambiar archivo</Btn>
                <Btn onClick={confirmImport} color={importModal==="compra"?C.accent:C.green}>✅ Confirmar importación ({importPreview.all.length} registros)</Btn>
              </div>
            </>
          )}
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <Modal title="Confirmar eliminación" onClose={()=>setDeleteConfirm(null)}>
          <div style={{fontSize:14,color:C.muted,marginBottom:20}}>¿Estás seguro que querés eliminar <strong style={{color:C.text}}>{deleteConfirm.label}</strong>? Esta acción no se puede deshacer.</div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <Btn onClick={()=>setDeleteConfirm(null)} outline color={C.muted}>Cancelar</Btn>
            <Btn onClick={doDelete} color={C.red}>🗑️ Eliminar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
