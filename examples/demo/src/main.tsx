import { useState } from "react";
import { createRoot } from "react-dom/client";
import { IndiaMap, type TooltipContext } from "vardhan-maps/react";
import { getState, type Resolution } from "vardhan-maps/data";

// A tiny demo palette keyed off the ISO code's last letter — purely illustrative.
const shade = (code?: string) => {
  const t = (code ?? "").charCodeAt(3) % 5;
  return ["#eff6ff", "#dbeafe", "#bfdbfe", "#93c5fd", "#60a5fa"][t] ?? "#eff6ff";
};

function App() {
  const [selected, setSelected] = useState<string | null>(null);
  const [res, setRes] = useState<Resolution>("low");

  const tooltip = (c: TooltipContext) =>
    c.kind === "state" ? (
      <span>
        <b>{c.name}</b> · {(c.props as { code?: string }).code}
      </span>
    ) : (
      <span>
        <b>{c.name}</b> · {c.state}
      </span>
    );

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 860, margin: "0 auto", padding: 20 }}>
      <h1 style={{ marginBottom: 4 }}>vardhan-maps</h1>
      <p style={{ color: "#64748b", marginTop: 0 }}>
        Click a state to drill into its districts. Hover for tooltips. Data lazy-loads per state.
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        {selected && (
          <button onClick={() => setSelected(null)} style={{ padding: "4px 10px", cursor: "pointer" }}>
            ← All India
          </button>
        )}
        <strong>{selected ? `${selected} — districts` : "India — states"}</strong>
        <label style={{ marginLeft: "auto" }}>
          Resolution{" "}
          <select value={res} onChange={(e) => setRes(e.target.value as Resolution)}>
            <option value="low">low</option>
            <option value="high">high</option>
          </select>
        </label>
      </div>

      {selected ? (
        <IndiaMap
          level="district"
          stateName={selected}
          resolution={res}
          tooltip={tooltip}
          districtFill={() => "#dbeafe"}
          districtStyle={{ stroke: "#64748b", strokeWidth: 0.5 }}
          style={{ width: "100%", height: "auto", background: "#f8fafc", borderRadius: 12 }}
        />
      ) : (
        <IndiaMap
          level="state"
          resolution={res}
          tooltip={tooltip}
          stateFill={(name) => shade(getState(name)?.properties.code)}
          stateStyle={{ stroke: "#334155", strokeWidth: 0.8 }}
          onStateClick={(name) => setSelected(name)}
          style={{ width: "100%", height: "auto", cursor: "pointer" }}
        />
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
