import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const SUPABASE_URL = "https://ahuraftnoxslotrcfhun.supabase.co";
const SUPABASE_KEY = "sb_publishable_9Up-_iimijqn6NdiOzUrNw_b_RPAQGg";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function busIcon(color) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:16px;display:block;text-align:center;line-height:30px;">🚌</span></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

function userIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;background:#3B82F6;border-radius:50%;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function RecenterMap({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.setView(coords, map.getZoom());
  }, [coords]);
  return null;
}

async function fetchEmpresas() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/empresas?select=id,nombre,codigo`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    return await res.json();
  } catch { return []; }
}

async function fetchRutas(empresaId) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/rutas?empresa_id=eq.${empresaId}&activa=eq.true&select=id,nombre,paradas,color`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    return await res.json();
  } catch { return []; }
}

async function fetchBuses(empresaId) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/ubicaciones?empresa_id=eq.${empresaId}&select=bus_id,ruta_id,ruta_nombre,lat,lng,velocidad,created_at&order=created_at.desc&limit=200`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const data = await res.json();
    const seen = new Set();
    return data.filter(row => {
      if (seen.has(row.bus_id)) return false;
      seen.add(row.bus_id);
      return true;
    });
  } catch { return []; }
}

function formatAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `hace ${diff}s`;
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}min`;
  return `hace ${Math.floor(diff / 3600)}h`;
}

export default function UsuarioApp() {
  const [screen, setScreen] = useState("empresa"); // empresa | mapa
  const [empresas, setEmpresas] = useState([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState(null);
  const [rutas, setRutas] = useState([]);
  const [buses, setBuses] = useState([]);
  const [userPos, setUserPos] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [recenter, setRecenter] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const watchRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchEmpresas().then(data => {
      setEmpresas(data);
      setLoadingEmpresas(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedEmpresa) return;
    fetchRutas(selectedEmpresa.id).then(setRutas);

    const load = async () => {
      const data = await fetchBuses(selectedEmpresa.id);
      setBuses(data);
      setLastUpdate(new Date());
    };
    load();
    intervalRef.current = setInterval(load, 5000);
    return () => clearInterval(intervalRef.current);
  }, [selectedEmpresa]);

  useEffect(() => {
    if (navigator.geolocation) {
      watchRef.current = navigator.geolocation.watchPosition(
        pos => setUserPos([pos.coords.latitude, pos.coords.longitude]),
        () => {},
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
    }
    return () => {
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  const filteredBuses = selectedRoute
    ? buses.filter(b => b.ruta_id === selectedRoute)
    : buses;

  const handleRecenter = () => {
    if (userPos) setRecenter(r => !r);
  };

  const getRutaColor = (rutaId) => {
    const r = rutas.find(r => r.id === rutaId);
    return r?.color || "#888";
  };

  if (screen === "empresa") {
    return (
      <div style={{ minHeight: "100vh", background: "#0A0A0F", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Courier New', monospace", padding: 16 }}>
        <div style={{ width: 360, background: "#111118", borderRadius: 32, border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 40px 80px rgba(0,0,0,0.8)", overflow: "hidden", padding: "32px 24px" }}>
          
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ width: 56, height: 56, background: "linear-gradient(135deg, #1a1a2e, #16213e)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 12px" }}>🚌</div>
            <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, letterSpacing: 3 }}>BUSTRACK</div>
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, letterSpacing: 4, marginTop: 4 }}>SEGUIMIENTO EN VIVO</div>
          </div>

          <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, letterSpacing: 2, display: "block", marginBottom: 12 }}>
            SELECCIONA TU EMPRESA
          </label>

          {loadingEmpresas ? (
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, textAlign: "center", padding: 24 }}>Cargando...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {empresas.map(e => (
                <button key={e.id} onClick={() => { setSelectedEmpresa(e); setScreen("mapa"); }} style={{ padding: "16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 20 }}>🏢</span>
                  <div>
                    <div>{e.nombre}</div>
                    <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, marginTop: 2, letterSpacing: 1 }}>{e.codigo}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column", background: "#0A0A0F", fontFamily: "system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ padding: "12px 16px", background: "#111118", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 1000 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => { setScreen("empresa"); setSelectedEmpresa(null); setBuses([]); setRutas([]); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 18, cursor: "pointer", padding: 0 }}>←</button>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>{selectedEmpresa?.nombre}</div>
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>
              {filteredBuses.length} bus{filteredBuses.length !== 1 ? "es" : ""} activo{filteredBuses.length !== 1 ? "s" : ""}
              {lastUpdate && ` · ${formatAgo(lastUpdate)}`}
            </div>
          </div>
        </div>
        <button onClick={handleRecenter} style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 8, padding: "6px 12px", color: "#60A5FA", fontSize: 12, cursor: "pointer" }}>
          📍 Mi ubicación
        </button>
      </div>

      {/* Route filter */}
      <div style={{ padding: "10px 12px", background: "#111118", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 8, overflowX: "auto", zIndex: 1000 }}>
        <button onClick={() => setSelectedRoute(null)} style={{ padding: "6px 14px", borderRadius: 20, border: "none", flexShrink: 0, background: !selectedRoute ? "#fff" : "rgba(255,255,255,0.07)", color: !selectedRoute ? "#000" : "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600, cursor: "pointer", letterSpacing: 1 }}>
          TODAS
        </button>
        {rutas.map(r => (
          <button key={r.id} onClick={() => setSelectedRoute(r.id === selectedRoute ? null : r.id)} style={{ padding: "6px 14px", borderRadius: 20, flexShrink: 0, border: `1px solid ${selectedRoute === r.id ? r.color : "rgba(255,255,255,0.1)"}`, background: selectedRoute === r.id ? `${r.color}22` : "transparent", color: selectedRoute === r.id ? r.color : "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>
            {r.nombre}
          </button>
        ))}
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: "relative" }}>
        <MapContainer key="main-map" center={[9.9281, -84.0907]} zoom={13} style={{ height: "100%", width: "100%" }} zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
          <RecenterMap coords={recenter !== false ? (userPos || null) : null} />

          {userPos && (
            <>
              <Marker position={userPos} icon={userIcon()}>
                <Popup>📍 Tu ubicación</Popup>
              </Marker>
              <Circle center={userPos} radius={80} pathOptions={{ color: "#3B82F6", fillColor: "#3B82F6", fillOpacity: 0.1, weight: 1 }} />
            </>
          )}

          {filteredBuses.map(bus => (
            <Marker key={bus.bus_id} position={[bus.lat, bus.lng]} icon={busIcon(getRutaColor(bus.ruta_id))}>
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>🚌 {bus.bus_id}</div>
                  <div style={{ color: "#555", fontSize: 12, marginBottom: 4 }}>{bus.ruta_nombre}</div>
                  <div style={{ fontSize: 12 }}>🚀 {bus.velocidad || 0} km/h</div>
                  <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>{formatAgo(bus.created_at)}</div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {filteredBuses.length === 0 && (
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "rgba(17,17,24,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "16px 24px", color: "rgba(255,255,255,0.5)", fontSize: 13, textAlign: "center", zIndex: 999, pointerEvents: "none" }}>
            🚌 No hay buses activos ahora
          </div>
        )}
      </div>
    </div>
  );
}
