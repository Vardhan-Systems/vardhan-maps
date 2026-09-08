import { useState } from "react";
import { createRoot } from "react-dom/client";
import "leaflet/dist/leaflet.css";
import { IndiaMap, type TooltipContext } from "vardhan-maps/react";
import { getState, type Resolution } from "vardhan-maps/data";

// A tiny demo palette keyed off the ISO code — purely illustrative.
const shade = (code?: string) => {
  const t = (code ?? "").charCodeAt(3) % 5;
  return ["#eff6ff", "#dbeafe", "#bfdbfe", "#93c5fd", "#60a5fa"][t] ?? "#eff6ff";
};

type Mode = "svg" | "leaflet";

function App() {
  const [selected, setSelected] = useState<string | null>(null);
  const [res, setRes] = useState<Resolution>("low");
  const [mode, setMode] = useState<Mode>("leaflet");
  const [labels, setLabels] = useState(false);

  const tooltip = (c: TooltipContext) => (
    <span>
      <b>{c.name}</b> {c.kind === "state" ? `· ${(c.props as { code?: string }).code}` : `· ${c.state}`}
    </span>
  );

  const common = { level: (selected ? "district" : "both") as "district" | "both", resolution: res };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 900, margin: "0 auto", padding: 20 }}>
      <h1 style={{ marginBottom: 4 }}>vardhan-maps</h1>
      <p style={{ color: "#64748b", marginTop: 0 }}>
        India-only map: locked to India with neighbours greyed out. Toggle labels, click a state to
        drill into its districts.
      </p>

      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        {selected && (
          <button onClick={() => setSelected(null)} style={{ padding: "4px 10px", cursor: "pointer" }}>
            ← All India
          </button>
        )}
        <strong>{selected ? `${selected} — districts` : "India"}</strong>
        <label>Mode{" "}
          <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
            <option value="leaflet">Leaflet (OSM tiles)</option>
            <option value="svg">SVG (boundaries only)</option>
          </select>
        </label>
        <label>Resolution{" "}
          <select value={res} onChange={(e) => setRes(e.target.value as Resolution)}>
            <option value="low">low</option>
            <option value="high">high</option>
          </select>
        </label>
        <label><input type="checkbox" checked={labels} onChange={(e) => setLabels(e.target.checked)} /> name labels</label>
      </div>

      {mode === "leaflet" ? (
        <IndiaMap
          mode="leaflet"
          {...common}
          stateName={selected ?? undefined}
          labels={labels}
          onStateClick={(name) => !selected && setSelected(name)}
          style={{ height: 560, width: "100%", borderRadius: 12, border: "1px solid #e2e8f0" }}
        />
      ) : (
        <IndiaMap
          {...common}
          stateName={selected ?? undefined}
          tooltip={tooltip}
          stateFill={selected ? undefined : (name) => shade(getState(name)?.properties.code)}
          districtFill={selected ? () => "#dbeafe" : undefined}
          onStateClick={(name) => !selected && setSelected(name)}
          style={{ width: "100%", height: "auto", cursor: "pointer" }}
        />
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
