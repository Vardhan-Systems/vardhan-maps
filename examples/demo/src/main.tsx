import { useState } from "react";
import { createRoot } from "react-dom/client";
import "leaflet/dist/leaflet.css";
import { IndiaMap } from "vardhan-maps/react";
import { type Resolution } from "vardhan-maps/data";

function App() {
  const [selected, setSelected] = useState<string | null>(null);
  const [res, setRes] = useState<Resolution>("low");

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 900, margin: "0 auto", padding: 20 }}>
      <h1 style={{ marginBottom: 4 }}>vardhan-maps</h1>
      <p style={{ color: "#64748b", marginTop: 0 }}>
        India-only map: locked to India with neighbours greyed out. Click a state to drill into its
        districts.
      </p>

      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        {selected && (
          <button onClick={() => setSelected(null)} style={{ padding: "4px 10px", cursor: "pointer" }}>
            ← All India
          </button>
        )}
        <strong>{selected ? `${selected} — districts` : "India"}</strong>
        <label style={{ marginLeft: "auto" }}>
          Resolution{" "}
          <select value={res} onChange={(e) => setRes(e.target.value as Resolution)}>
            <option value="low">low</option>
            <option value="high">high</option>
          </select>
        </label>
      </div>

      <IndiaMap
        mode="leaflet"
        level={selected ? "district" : "both"}
        resolution={res}
        stateName={selected ?? undefined}
        onStateClick={(name) => !selected && setSelected(name)}
        style={{ height: 560, width: "100%", borderRadius: 12, border: "1px solid #e2e8f0" }}
      />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
