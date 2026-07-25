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

function vehicleIcon(color) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
      <svg style="transform:rotate(45deg)" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
      </svg>
    </div>`,
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

async function fetchVehiculos(empresaId) {
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
  const [screen, setScreen] = useState("empresa");
  const [empresas, setEmpresas] = useState([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState(null);
  const [rutas, setRutas] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
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
      const data = await fetchVehiculos(selectedEmpresa.id);
      setVehiculos(data);
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

  const filteredVehiculos = selectedRoute ? vehiculos.filter(v => v.ruta_id === selectedRoute) : vehiculos;
  const handleRecenter = () => { if (userPos) setRecenter(r => !r); };
  const getRutaColor = (rutaId) => { const r = rutas.find(r => r.id === rutaId); return r?.color || "#888"; };

  if (screen === "empresa") {
    return (
      <div style={{ minHeight: "100vh", background: "#0A0A0F", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Courier New', monospace", padding: 16 }}>
        <div style={{ width: 360, background: "#111118", borderRadius: 32, border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 40px 80px rgba(0,0,0,0.8)", overflow: "hidden", padding: "40px 24px 36px" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{ width: 64, height: 64, background: "linear-gradient(135deg, #1a1a2e, #16213e)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div style={{ color: "#fff", fontSize: 20, fontWeight: 700, letterSpacing: 4 }}>BaekTech</div>
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, letterSpacing: 3, marginTop: 6 }}>SEGUIMIENTO EN VIVO</div>
          </div>

          <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, letterSpacing: 2, display: "block", marginBottom: 12 }}>SELECCIONA TU EMPRESA</label>
          {loadingEmpresas ? (
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, textAlign: "center", padding: 24 }}>Cargando...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {empresas.map(e => (
                <button key={e.id} onClick={() => { setSelectedEmpresa(e); setScreen("mapa"); }} style={{ padding: "16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12, transition: "all 0.2s" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                  </div>
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
          <button onClick={() => { setScreen("empresa"); setSelectedEmpresa(null); setVehiculos([]); setRutas([]); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 18, cursor: "pointer", padding: 0 }}>←</button>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>{selectedEmpresa?.nombre}</div>
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>
              {filteredVehiculos.length} vehículo{filteredVehiculos.length !== 1 ? "s" : ""} activo{filteredVehiculos.length !== 1 ? "s" : ""}
              {lastUpdate && ` · ${formatAgo(lastUpdate)}`}
            </div>
          </div>
        </div>
        <button onClick={handleRecenter} style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 8, padding: "6px 12px", color: "#60A5FA", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
          </svg>
          Mi ubicación
        </button>
      </div>

      {/* Mapa */}
      <div style={{ flex: 1, position: "relative" }}>
        <MapContainer key="main-map" center={[9.9281, -84.0907]} zoom={13} style={{ height: "100%", width: "100%" }} zoomControl={false}>
          <TileLayer url={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}`} attribution="&copy; Mapbox &copy; OpenStreetMap" tileSize={512} zoomOffset={-1} />
          <RecenterMap coords={recenter !== false ? (userPos || null) : null} />

          {userPos && (
            <>
              <Marker position={userPos} icon={userIcon()}><Popup>Tu ubicación</Popup></Marker>
              <Circle center={userPos} radius={80} pathOptions={{ color: "#3B82F6", fillColor: "#3B82F6", fillOpacity: 0.1, weight: 1 }} />
            </>
          )}

          {filteredVehiculos.map(v => (
            <Marker key={v.bus_id} position={[v.lat, v.lng]} icon={vehicleIcon(getRutaColor(v.ruta_id))}>
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{v.bus_id}</div>
                  <div style={{ color: "#555", fontSize: 12, marginBottom: 4 }}>{v.ruta_nombre}</div>
                  <div style={{ fontSize: 12 }}>{v.velocidad || 0} km/h</div>
                  <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>{formatAgo(v.created_at)}</div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {filteredVehiculos.length === 0 && (
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "rgba(17,17,24,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "16px 24px", color: "rgba(255,255,255,0.5)", fontSize: 13, textAlign: "center", zIndex: 999, pointerEvents: "none" }}>
            No hay vehículos activos ahora
          </div>
        )}
      </div>
    </div>
  );
}
