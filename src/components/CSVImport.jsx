import { useRef, useState } from "react";
import { C, btnStyle, Ic } from "../theme.jsx";

export default function CSVImport({ onImport, label = "CSV Import" }) {
  const ref = useRef(null);
  const [importing, setImporting] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const text = await file.text();
    await onImport(text);
    setImporting(false);
    e.target.value = "";
  };

  return (
    <>
      <input ref={ref} type="file" accept=".csv,.tsv,.txt" onChange={handleFile} style={{ display: "none" }} />
      <button onClick={() => ref.current?.click()} disabled={importing} style={btnStyle(C.sf2, C.txM, { border: `1px solid ${C.bd}`, opacity: importing ? .5 : 1 })}>
        <Ic name="upload" size={14} color={C.txM} /> {importing ? "Importiere..." : label}
      </button>
    </>
  );
}
