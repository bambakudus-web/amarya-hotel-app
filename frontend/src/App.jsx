/* eslint-disable no-unused-vars */
import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

const API = "https://amarya-hotel-app-production.up.railway.app";

const AMENITY_ICONS = {
  "Free WiFi":"📶","King Bed":"🛏️","Ocean View":"🌊","Balcony":"🏠","Jacuzzi":"♨️",
  "Butler Service":"🎩","Minibar":"🍾","Smart TV":"📺","Rain Shower":"🚿","City View":"🌆",
  "Skyline View":"🌃","Terrace":"🌿","Plunge Pool":"💦","Private Pool":"🏊",
  "Personal Chef":"👨‍🍳","Butler":"🎩","Panoramic Views":"🔭","Nespresso":"☕","Sofa":"🛋️",
  "Garden View":"🌳","Garden":"🌺","Full Kitchen":"🍳","4 Beds":"🛏️","BBQ":"🔥",
  "Heritage Decor":"🏛️","Claw Tub":"🛁","Champagne":"🥂","Rose Turndown":"🌹",
  "Couples Spa":"💆","Private Terrace":"🌄","Queen Bed":"🛏️","Beach Access":"🏖️",
  "Outdoor Shower":"🚿","Hammock":"🌴","Safari Desk":"🦁","Binoculars":"🔭",
  "Park View":"🌿","Marina View":"🚤","Sea View":"🌊","Mountain View":"🏔️",
  "Harbour View":"⚓","Cultural Decor":"🎨","Pool Access":"🏊","Rooftop Pool":"🏊",
  "Helipad Access":"🚁","Yacht Charter":"🛥️","Conference":"💼","Business Centre":"💼",
};

function nightsBetween(a, b) {
  if (!a || !b) return 0;
  return Math.max(0, Math.ceil((new Date(b) - new Date(a)) / 86400000));
}
function todayStr() { return new Date().toISOString().split("T")[0]; }
function tomorrowStr() {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

const POPULAR = [
  "Accra, Ghana","Kumasi, Ghana","Takoradi, Ghana",
  "Lagos, Nigeria","Abuja, Nigeria",
  "Nairobi, Kenya","Cape Town, South Africa","Johannesburg, South Africa",
  "Dubai, UAE","Paris, France","London, UK","New York, USA",
];

// ── CURRENCIES ────────────────────────────────────────────
const CURRENCIES = [
  { code:"GHS", symbol:"GHS", name:"Ghana Cedi",        flag:"🇬🇭", rate:1 },
  { code:"USD", symbol:"$",   name:"US Dollar",          flag:"🇺🇸", rate:0.067 },
  { code:"EUR", symbol:"€",   name:"Euro",               flag:"🇪🇺", rate:0.062 },
  { code:"GBP", symbol:"£",   name:"British Pound",      flag:"🇬🇧", rate:0.053 },
  { code:"NGN", symbol:"₦",   name:"Nigerian Naira",     flag:"🇳🇬", rate:110 },
  { code:"KES", symbol:"KSh", name:"Kenyan Shilling",    flag:"🇰🇪", rate:8.7 },
  { code:"ZAR", symbol:"R",   name:"South African Rand", flag:"🇿🇦", rate:1.25 },
  { code:"AED", symbol:"AED", name:"UAE Dirham",         flag:"🇦🇪", rate:0.245 },
];

// ── LANGUAGES ─────────────────────────────────────────────
const LANGUAGES = [
  { code:"en", name:"English",  flag:"🇬🇧" },
  { code:"fr", name:"Français", flag:"🇫🇷" },
  { code:"es", name:"Español",  flag:"🇪🇸" },
  { code:"ar", name:"العربية",  flag:"🇸🇦" },
  { code:"tw", name:"Twi",      flag:"🇬🇭" },
  { code:"ha", name:"Hausa",    flag:"🇳🇬" },
];

const TRANSLATIONS = {
  en: { search:"Search", checkIn:"Check In", checkOut:"Check Out", guests:"Guests", bookNow:"Book Now", available:"Available", occupied:"Occupied", from:"From", perNight:"/ night", reserve:"Reserve", hotels:"Hotels", experiences:"Experiences", about:"About", contact:"Contact", admin:"Admin", listHotel:"List Hotel", nightsLabel:"nights", total:"Total", confirm:"Confirm", processing:"Processing...", home:"Home", bookAnother:"Book Another", unavailable:"Unavailable", destination:"Destination", results:"Search Results" },
  fr: { search:"Rechercher", checkIn:"Arrivée", checkOut:"Départ", guests:"Voyageurs", bookNow:"Réserver", available:"Disponible", occupied:"Occupé", from:"À partir de", perNight:"/ nuit", reserve:"Réserver", hotels:"Hôtels", experiences:"Expériences", about:"À propos", contact:"Contact", admin:"Admin", listHotel:"Ajouter Hôtel", nightsLabel:"nuits", total:"Total", confirm:"Confirmer", processing:"Traitement...", home:"Accueil", bookAnother:"Autre Réservation", unavailable:"Indisponible", destination:"Destination", results:"Résultats" },
  es: { search:"Buscar", checkIn:"Llegada", checkOut:"Salida", guests:"Huéspedes", bookNow:"Reservar", available:"Disponible", occupied:"Ocupado", from:"Desde", perNight:"/ noche", reserve:"Reservar", hotels:"Hoteles", experiences:"Experiencias", about:"Sobre", contact:"Contacto", admin:"Admin", listHotel:"Añadir Hotel", nightsLabel:"noches", total:"Total", confirm:"Confirmar", processing:"Procesando...", home:"Inicio", bookAnother:"Otra Reserva", unavailable:"No disponible", destination:"Destino", results:"Resultados" },
  ar: { search:"بحث", checkIn:"الوصول", checkOut:"المغادرة", guests:"ضيوف", bookNow:"احجز الآن", available:"متاح", occupied:"محجوز", from:"من", perNight:"/ ليلة", reserve:"حجز", hotels:"فنادق", experiences:"تجارب", about:"عن", contact:"اتصل", admin:"إدارة", listHotel:"أضف فندق", nightsLabel:"ليالي", total:"المجموع", confirm:"تأكيد", processing:"جارٍ...", home:"الرئيسية", bookAnother:"حجز آخر", unavailable:"غير متاح", destination:"الوجهة", results:"النتائج" },
  tw: { search:"Hwehwɛ", checkIn:"Bra Da", checkOut:"Kɔ Da", guests:"Ahɔho", bookNow:"Bɔ Din", available:"Wɔ Hɔ", occupied:"Wɔ Mu", from:"Fi", perNight:"/ anadwo", reserve:"Di Hɔ", hotels:"Ahemfie", experiences:"Nsɛm", about:"Fa Ho", contact:"Frɛ Yɛn", admin:"Admin", listHotel:"Ka Hotel", nightsLabel:"anadwo", total:"Nyinaa", confirm:"Gyedi", processing:"...", home:"Fie", bookAnother:"Bɔ Bio", unavailable:"Nni Hɔ", destination:"Baabi", results:"Nkɔso" },
  ha: { search:"Nema", checkIn:"Shiga", checkOut:"Fita", guests:"Baƙi", bookNow:"Yi Ajali", available:"Akwai", occupied:"Cike", from:"Daga", perNight:"/ dare", reserve:"Kama", hotels:"Otal", experiences:"Abubuwa", about:"Game Da", contact:"Tuntube", admin:"Admin", listHotel:"Ƙara Otal", nightsLabel:"dare", total:"Jimillar", confirm:"Tabbatar", processing:"...", home:"Gida", bookAnother:"Wani Ajali", unavailable:"Babu", destination:"Wuri", results:"Sakamako" },
};

// ── GLOBAL STYLES injected once ───────────────────────────
const GLOBAL_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { background: #080c17; color: #fff; font-family: 'Cormorant Garamond', Georgia, serif; -webkit-font-smoothing: antialiased; }
  input, select, textarea, button { font-family: inherit; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #080c17; }
  ::-webkit-scrollbar-thumb { background: rgba(196,160,80,0.3); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(196,160,80,0.6); }
  input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.8) sepia(1) hue-rotate(5deg); cursor: pointer; }

  /* Mobile nav */
  .mobile-menu { display: none; }
  .nav-links { display: flex; gap: 20px; align-items: center; }
  .nav-btns { display: flex; gap: 10px; }

  @media (max-width: 900px) {
    .nav-links { display: none; }
    .nav-btns { display: none; }
    .mobile-menu { display: flex; }
    .mobile-nav-open .nav-links {
      display: flex; flex-direction: column; position: fixed;
      top: 70px; left: 0; right: 0; background: rgba(6,9,18,0.99);
      border-bottom: 1px solid rgba(196,160,80,0.2);
      padding: 24px 5vw 32px; gap: 18px; z-index: 998;
    }
    .mobile-nav-open .nav-btns {
      display: flex; flex-direction: column; padding: 0 5vw 24px;
      position: fixed; top: 70px; left: 0; right: 0;
      background: rgba(6,9,18,0.99); z-index: 998; padding-top: 0;
    }
  }

  /* Search bar responsive */
  .search-bar-inner { display: flex; align-items: stretch; width: 100%; }
  .search-divider { width: 1px; background: rgba(196,160,80,0.25); margin: 10px 0; flex-shrink: 0; }
  .search-field { padding: 0 4px; }
  .search-field label { display: block; padding: 10px 16px 0; font-size: 10px; letter-spacing: 3px; color: #c4a050; text-transform: uppercase; font-weight: 700; }
  .search-field input, .search-field select {
    display: block; width: 100%; background: transparent; border: none; outline: none;
    color: rgba(255,255,255,0.9); font-size: 14px; padding: 4px 16px 12px; cursor: pointer;
    font-family: 'Cormorant Garamond', Georgia, serif;
  }
  .search-field input::placeholder { color: rgba(255,255,255,0.35); }
  .search-field select option { background: #0d1220; }
  .search-btn {
    background: linear-gradient(135deg,#c4a050,#a07830); border: none; color: #000;
    padding: 0 40px; font-size: 13px; letter-spacing: 3px; font-weight: 900;
    cursor: pointer; text-transform: uppercase; flex-shrink: 0; min-width: 120px;
    transition: opacity 0.2s;
  }
  .search-btn:hover { opacity: 0.88; }

  @media (max-width: 768px) {
    .search-bar-inner { flex-direction: column; }
    .search-divider { display: none; }
    .search-field { border-bottom: 1px solid rgba(196,160,80,0.15); }
    .search-field label { padding: 12px 16px 0; }
    .search-field input, .search-field select { padding: 6px 16px 12px; }
    .search-btn { width: 100%; padding: 18px; min-width: unset; font-size: 12px; }
    .dest-field { flex: unset !important; }
  }

  /* Grid responsive helpers */
  .grid-auto-3 { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 28px; }
  .grid-auto-2 { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
  .grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 600px) {
    .grid-auto-3 { grid-template-columns: 1fr; }
    .grid-auto-2 { grid-template-columns: 1fr; }
    .grid-2col { grid-template-columns: 1fr; }
  }

  /* Detail page */
  .detail-grid { display: grid; grid-template-columns: 1fr 360px; gap: 60px; }
  .booking-grid { display: grid; grid-template-columns: 1fr 310px; gap: 44px; }
  .about-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 72px; margin-bottom: 90px; align-items: center; }
  .contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 72px; }
  .footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 56px; margin-bottom: 52px; }
  .partner-features { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 52px; }
  .partner-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }

  @media (max-width: 900px) {
    .detail-grid { grid-template-columns: 1fr; }
    .booking-grid { grid-template-columns: 1fr; }
    .about-grid { grid-template-columns: 1fr; gap: 32px; }
    .contact-grid { grid-template-columns: 1fr; gap: 40px; }
    .footer-grid { grid-template-columns: 1fr 1fr; gap: 32px; }
    .partner-features { grid-template-columns: 1fr; }
    .partner-form-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 600px) {
    .footer-grid { grid-template-columns: 1fr; }
    .admin-booking-row { flex-direction: column !important; gap: 8px !important; }
  }

  /* Room card */
  .room-card { background: #0d1220; border: 1px solid rgba(196,160,80,0.1); overflow: hidden; transition: transform 0.3s, border-color 0.3s; }
  .room-card:hover { transform: translateY(-4px); border-color: rgba(196,160,80,0.38); }

  /* Hotel card */
  .hotel-card { background: #0d1220; border: 1px solid rgba(196,160,80,0.1); overflow: hidden; cursor: pointer; transition: transform 0.3s, border-color 0.3s; }
  .hotel-card:hover { transform: translateY(-4px); border-color: rgba(196,160,80,0.4); }

  /* Sticky sidebar */
  .sticky-sidebar { align-self: start; position: sticky; top: 88px; }

  /* Input focus */
  .amarya-input {
    width: 100%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.12);
    color: #fff; padding: 13px 15px; font-size: 14px; outline: none;
    font-family: 'Cormorant Garamond', Georgia, serif; transition: border-color 0.2s;
  }
  .amarya-input:focus { border-color: #c4a050; }
  .amarya-input::placeholder { color: rgba(255,255,255,0.3); }

  /* Page padding for mobile */
  .page-pad { padding: 80px 5vw; }
  @media (max-width: 600px) {
    .page-pad { padding: 48px 4vw; }
  }

  /* Hero */
  .hero-title { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(38px,7vw,100px); font-weight: 300; line-height: 1.05; margin: 0 0 20px; color: #fff; }
  .section-title { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(28px,4vw,52px); font-weight: 300; color: #fff; }
  .page-title { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(32px,5vw,68px); font-weight: 300; color: #fff; margin: 0; }

  /* Chips */
  .city-chip {
    background: rgba(255,255,255,0.07); border: 1px solid rgba(196,160,80,0.25);
    color: rgba(255,255,255,0.7); padding: 7px 18px; font-size: 12px; letter-spacing: 1px;
    cursor: pointer; font-family: 'Cormorant Garamond', Georgia, serif; transition: all 0.2s;
    white-space: nowrap;
  }
  .city-chip:hover { background: rgba(196,160,80,0.15); border-color: #c4a050; color: #c4a050; }

  /* Gold btn */
  .btn-gold {
    background: linear-gradient(135deg,#c4a050,#a07830); border: none; color: #000;
    padding: 12px 26px; font-size: 11px; letter-spacing: 3px; font-weight: 800;
    cursor: pointer; text-transform: uppercase; font-family: 'Cormorant Garamond', Georgia, serif;
    transition: opacity 0.2s;
  }
  .btn-gold:hover { opacity: 0.88; }
  .btn-ghost {
    background: transparent; border: 1px solid rgba(196,160,80,0.4); color: #c4a050;
    padding: 12px 26px; font-size: 11px; letter-spacing: 3px; cursor: pointer;
    text-transform: uppercase; font-family: 'Cormorant Garamond', Georgia, serif;
    transition: all 0.2s;
  }
  .btn-ghost:hover { background: rgba(196,160,80,0.1); }

  /* Form label */
  .form-label { font-size: 10px; letter-spacing: 3px; color: #c4a050; text-transform: uppercase; display: block; margin-bottom: 7px; }

  /* Amenity tag */
  .amenity-tag { background: rgba(196,160,80,0.08); border: 1px solid rgba(196,160,80,0.2); padding: 7px 14px; font-size: 13px; color: rgba(255,255,255,0.75); display: flex; align-items: center; gap: 8px; }

  /* Suggestion dropdown */
  .suggestion-drop { position: absolute; top: 100%; left: 0; right: 0; background: #0d1220; border: 1px solid rgba(196,160,80,0.35); border-top: none; z-index: 300; max-height: 280px; overflow-y: auto; }
  .suggestion-item { padding: 11px 20px; cursor: pointer; font-size: 14px; color: rgba(255,255,255,0.75); font-family: 'Cormorant Garamond', Georgia, serif; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.04); transition: background 0.15s; }
  .suggestion-item:hover { background: rgba(196,160,80,0.1); }

  /* Stats bar */
  .stats-bar { background: #0d1220; border-top: 1px solid rgba(196,160,80,0.15); border-bottom: 1px solid rgba(196,160,80,0.15); padding: 28px 5vw; display: flex; justify-content: center; gap: clamp(28px,7vw,100px); flex-wrap: wrap; }

  /* How it works */
  .how-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 32px; }

  /* Experiences grid */
  .exp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 32px; }
  @media (max-width: 500px) { .exp-grid { grid-template-columns: 1fr; } }

  /* Admin rows */
  .admin-stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 16px; margin-bottom: 48px; }
  .admin-row { background: #0d1220; border: 1px solid rgba(196,160,80,0.1); padding: 18px 20px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }

  /* Real hotel badge */
  .real-badge { background: rgba(80,200,120,0.15); border: 1px solid rgba(80,200,120,0.35); color: #50c878; padding: 3px 9px; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; }
`;

// ── ROOM CARD (outside App) ───────────────────────────────
function RoomCard({ room, onBook, onView, showHotel, formatPrice, t }) {
  const amenities = room.amenities ? room.amenities.split(",").slice(0,3) : [];
  const tl = t || TRANSLATIONS.en;
  return (
    <div className="room-card">
      <div style={{ position:"relative", height:240, overflow:"hidden", cursor:"pointer" }} onClick={() => onView(room)}>
        <img
          src={room.image_url || "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600"}
          alt={room.type}
          style={{ width:"100%", height:"100%", objectFit:"cover", transition:"transform 0.5s", filter:"brightness(0.82)" }}
          onMouseEnter={e => e.target.style.transform = "scale(1.06)"}
          onMouseLeave={e => e.target.style.transform = "scale(1)"}
        />
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(8,12,23,0.6),transparent 55%)" }} />
        <div style={{ position:"absolute", top:12, left:12, background:room.status==="available"?"rgba(196,160,80,0.92)":"rgba(80,80,80,0.9)", color:"#000", padding:"3px 10px", fontSize:10, fontWeight:800, letterSpacing:2, textTransform:"uppercase" }}>
          {room.status==="available" ? tl.available : tl.occupied}
        </div>
        <div style={{ position:"absolute", top:12, right:12, background:"rgba(6,9,18,0.85)", border:"1px solid rgba(196,160,80,0.3)", padding:"3px 9px", fontSize:10, color:"rgba(255,255,255,0.6)" }}>#{room.room_number}</div>
      </div>
      <div style={{ padding:22 }}>
        {showHotel && room.hotel_name && (
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginBottom:6 }}>📍 {room.city}, {room.country} · {room.hotel_name}</div>
        )}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
          <h3 onClick={() => onView(room)} style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:18, fontWeight:400, color:"#fff", margin:0, cursor:"pointer" }}>{room.hotel_name || room.type}</h3>
          <div style={{ color:"#c4a050", fontSize:10, letterSpacing:1 }}>★★★★★</div>
        </div>
        <p style={{ fontSize:12, color:"rgba(255,255,255,0.42)", lineHeight:1.6, marginBottom:12, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{room.description}</p>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
          {amenities.map(a => (
            <span key={a} style={{ fontSize:11, color:"rgba(255,255,255,0.38)", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", padding:"3px 9px" }}>
              {AMENITY_ICONS[a.trim()]||"✦"} {a.trim()}
            </span>
          ))}
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderTop:"1px solid rgba(255,255,255,0.06)", paddingTop:14 }}>
          <div>
            <div style={{ fontSize:10, letterSpacing:2, color:"rgba(255,255,255,0.28)", textTransform:"uppercase", marginBottom:1 }}>{tl.from}</div>
            <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:22, color:"#c4a050", lineHeight:1 }}>{formatPrice ? formatPrice(room.price) : `GHS ${Number(room.price).toLocaleString()}`}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.22)" }}>{tl.perNight}</div>
          </div>
          <button
            disabled={room.status!=="available"}
            onClick={() => room.status==="available" && onBook(room)}
            className="btn-gold"
            style={{ opacity: room.status!=="available" ? 0.4 : 1, cursor: room.status!=="available" ? "not-allowed" : "pointer", padding:"10px 18px", fontSize:10 }}
          >
            {room.status==="available" ? tl.bookNow : tl.unavailable}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── FOOTER (outside App) ──────────────────────────────────
function Footer({ onNavigate }) {
  return (
    <footer style={{ background:"#060912", borderTop:"1px solid rgba(196,160,80,0.1)", padding:"60px 5vw 36px" }}>
      <div style={{ maxWidth:1300, margin:"0 auto" }}>
        <div className="footer-grid">
          <div>
            <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:26, fontWeight:700, background:"linear-gradient(to right,#c4a050,#e8d5a0)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", letterSpacing:3, marginBottom:12 }}>AMARYA</div>
            <p style={{ color:"rgba(255,255,255,0.32)", fontSize:13, lineHeight:1.8, maxWidth:260, marginBottom:20 }}>A luxury hotel booking marketplace. Search, compare and book hotels worldwide.</p>
          </div>
          {[
            ["Discover",[["Search Hotels","results"],["All Hotels","hotels"],["Experiences","experiences"]]],
            ["Company",[["About Us","about"],["Partner With Us","partner"],["Contact","contact"]]],
            ["Support",[["Help Centre","contact"],["Cancellations","contact"],["Press","contact"]]],
          ].map(([title,links]) => (
            <div key={title}>
              <h4 style={{ fontSize:11, letterSpacing:4, color:"#c4a050", textTransform:"uppercase", marginBottom:16 }}>{title}</h4>
              {links.map(([label,pg]) => (
                <div key={label} onClick={() => onNavigate(pg)} style={{ fontSize:13, color:"rgba(255,255,255,0.32)", marginBottom:10, cursor:"pointer", transition:"color 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#c4a050"}
                  onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.32)"}
                >{label}</div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ borderTop:"1px solid rgba(255,255,255,0.05)", paddingTop:20, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
          <span style={{ fontSize:11, letterSpacing:2, color:"rgba(255,255,255,0.18)" }}>© 2026 AMARYA HOTELS & RESORTS. ALL RIGHTS RESERVED.</span>
          <span style={{ fontSize:11, letterSpacing:2, color:"rgba(255,255,255,0.18)" }}>LUXURY · CRAFTED · FOR YOU</span>
        </div>
      </div>
    </footer>
  );
}

// ── SEARCH BAR (outside App) ──────────────────────────────
function SearchBar({ compact, search, onSearchChange, onDestChange, onSubmit, suggestions, showSuggestions, onSuggestionClick, onDestFocus, onDestBlur, destRef }) {
  return (
    <form onSubmit={onSubmit} style={{ background: compact ? "rgba(13,18,32,0.98)" : "rgba(255,255,255,0.08)", backdropFilter:"blur(24px)", border:`1px solid ${compact ? "rgba(196,160,80,0.3)" : "rgba(196,160,80,0.4)"}`, width:"100%", maxWidth: compact ? "100%" : 980, margin:"0 auto", position:"relative" }}>
      <div className="search-bar-inner">

        {/* DESTINATION */}
        <div className="search-field dest-field" style={{ flex:2.5, minWidth:0, position:"relative" }}>
          <label>Destination</label>
          <input
            ref={destRef}
            type="text"
            placeholder="City, country or hotel..."
            value={search.destination}
            onChange={e => onDestChange(e.target.value)}
            onFocus={onDestFocus}
            onBlur={onDestBlur}
            autoComplete="off"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestion-drop">
              <div style={{ padding:"8px 16px 4px", fontSize:10, letterSpacing:3, color:"rgba(196,160,80,0.6)", textTransform:"uppercase" }}>Popular Destinations</div>
              {suggestions.map(s => (
                <div key={s} className="suggestion-item" onMouseDown={() => onSuggestionClick(s)}>
                  <span style={{ fontSize:15 }}>📍</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="search-divider" />

        {/* CHECK IN */}
        <div className="search-field" style={{ flex:1.4, minWidth:130 }}>
          <label>Check In</label>
          <input type="date" value={search.check_in} min={todayStr()} onChange={e => onSearchChange("check_in", e.target.value)} style={{ colorScheme:"dark" }} />
        </div>

        <div className="search-divider" />

        {/* CHECK OUT */}
        <div className="search-field" style={{ flex:1.4, minWidth:130 }}>
          <label>Check Out</label>
          <input type="date" value={search.check_out} min={search.check_in} onChange={e => onSearchChange("check_out", e.target.value)} style={{ colorScheme:"dark" }} />
        </div>

        <div className="search-divider" />

        {/* GUESTS */}
        <div className="search-field" style={{ flex:1, minWidth:100 }}>
          <label>Guests</label>
          <select value={search.guests} onChange={e => onSearchChange("guests", Number(e.target.value))}>
            {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} Guest{n>1?"s":""}</option>)}
          </select>
        </div>

        <button type="submit" className="search-btn">Search</button>
      </div>
    </form>
  );
}

// ── NAV (outside App) ─────────────────────────────────────
function Nav({ page, onNavigate, onFetchRooms, onFetchHotels, search, currency, setCurrency, language, setLanguage, t, user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCurrency, setShowCurrency] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);

  const go = (pg) => {
    setMenuOpen(false);
    onNavigate(pg);
    if (pg==="results") onFetchRooms(search.destination);
    if (pg==="hotels") onFetchHotels();
  };

  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];
  const currentCurr = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];

  return (
    <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:999, background:"rgba(6,9,18,0.97)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(196,160,80,0.15)", padding:"0 5vw", display:"flex", alignItems:"center", justifyContent:"space-between", height:70 }}>
      <div onClick={() => go("home")} style={{ cursor:"pointer", display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:34, height:34, background:"linear-gradient(135deg,#c4a050,#e8d5a0)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>✦</div>
        <span style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:24, fontWeight:700, background:"linear-gradient(to right,#c4a050,#e8d5a0)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", letterSpacing:3 }}>AMARYA</span>
      </div>

      {/* Desktop links */}
      <div className="nav-links">
        {[["Search","results"],[t.hotels,"hotels"],[t.experiences,"experiences"],[t.about,"about"],[t.contact,"contact"]].concat(user?.email==="kellysyder753@gmail.com"?[[t.admin,"admin"]]:[]).map(([label,pg]) => (
          <span key={pg} onClick={() => go(pg)} style={{ cursor:"pointer", fontSize:11, letterSpacing:1.5, textTransform:"uppercase", color:page===pg?"#c4a050":"rgba(255,255,255,0.6)", fontFamily:"'Cormorant Garamond',Georgia,serif", fontWeight:600, transition:"color 0.2s", paddingBottom:2, borderBottom:page===pg?"1px solid #c4a050":"1px solid transparent" }}>{label}</span>
        ))}
      </div>

      {/* Right side — currency + language + buttons */}
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>

        {/* CURRENCY SWITCHER */}
        <div style={{ position:"relative" }}>
          <button onClick={() => { setShowCurrency(o => !o); setShowLanguage(false); }} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(196,160,80,0.25)", color:"rgba(255,255,255,0.8)", padding:"6px 12px", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:6, letterSpacing:1 }}>
            <span>{currentCurr.flag}</span>
            <span style={{ fontWeight:700 }}>{currentCurr.code}</span>
            <span style={{ fontSize:9, opacity:0.6 }}>▾</span>
          </button>
          {showCurrency && (
            <div style={{ position:"absolute", top:"calc(100% + 8px)", right:0, background:"#0d1220", border:"1px solid rgba(196,160,80,0.3)", minWidth:200, zIndex:1000, boxShadow:"0 8px 32px rgba(0,0,0,0.5)" }}>
              <div style={{ padding:"8px 14px 6px", fontSize:10, letterSpacing:3, color:"rgba(196,160,80,0.6)", textTransform:"uppercase", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>Currency</div>
              {CURRENCIES.map(c => (
                <div key={c.code} onClick={() => { setCurrency(c.code); setShowCurrency(false); }} style={{ padding:"10px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:10, background:currency===c.code?"rgba(196,160,80,0.1)":"transparent", transition:"background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(196,160,80,0.08)"}
                  onMouseLeave={e => e.currentTarget.style.background = currency===c.code?"rgba(196,160,80,0.1)":"transparent"}
                >
                  <span style={{ fontSize:18 }}>{c.flag}</span>
                  <div>
                    <div style={{ fontSize:13, color:"#fff", fontWeight: currency===c.code ? 700 : 400 }}>{c.code} <span style={{ color:"#c4a050" }}>{c.symbol}</span></div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>{c.name}</div>
                  </div>
                  {currency===c.code && <span style={{ marginLeft:"auto", color:"#c4a050", fontSize:14 }}>✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* LANGUAGE SWITCHER */}
        <div style={{ position:"relative" }}>
          <button onClick={() => { setShowLanguage(o => !o); setShowCurrency(false); }} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(196,160,80,0.25)", color:"rgba(255,255,255,0.8)", padding:"6px 12px", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:6, letterSpacing:1 }}>
            <span style={{ fontSize:16 }}>{currentLang.flag}</span>
            <span style={{ fontSize:11, opacity:0.7 }}>{currentLang.code.toUpperCase()}</span>
            <span style={{ fontSize:9, opacity:0.6 }}>▾</span>
          </button>
          {showLanguage && (
            <div style={{ position:"absolute", top:"calc(100% + 8px)", right:0, background:"#0d1220", border:"1px solid rgba(196,160,80,0.3)", minWidth:170, zIndex:1000, boxShadow:"0 8px 32px rgba(0,0,0,0.5)" }}>
              <div style={{ padding:"8px 14px 6px", fontSize:10, letterSpacing:3, color:"rgba(196,160,80,0.6)", textTransform:"uppercase", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>Language</div>
              {LANGUAGES.map(l => (
                <div key={l.code} onClick={() => { setLanguage(l.code); setShowLanguage(false); }} style={{ padding:"10px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:10, background:language===l.code?"rgba(196,160,80,0.1)":"transparent", transition:"background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(196,160,80,0.08)"}
                  onMouseLeave={e => e.currentTarget.style.background = language===l.code?"rgba(196,160,80,0.1)":"transparent"}
                >
                  <span style={{ fontSize:18 }}>{l.flag}</span>
                  <span style={{ fontSize:13, color:"#fff", fontWeight: language===l.code ? 700 : 400 }}>{l.name}</span>
                  {language===l.code && <span style={{ marginLeft:"auto", color:"#c4a050", fontSize:14 }}>✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="nav-btns">
          <button onClick={() => go("partner")} style={{ background:"transparent", border:"1px solid #c4a050", color:"#c4a050", padding:"8px 18px", fontSize:11, letterSpacing:2, fontWeight:700, cursor:"pointer", textTransform:"uppercase" }}>{t.listHotel}</button>
          {user ? (
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div onClick={() => { go('account'); }} style={{ width:34, height:34, borderRadius:"50%", background:"linear-gradient(135deg,#c4a050,#e8d5a0)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color:"#000", cursor:"pointer" }}>
                {user.name?.[0]?.toUpperCase()||'U'}
              </div>
            </div>
          ) : (
            <button onClick={() => go("auth")} className="btn-gold" style={{ fontSize:11, letterSpacing:2, padding:"9px 20px" }}>Sign In</button>
          )}
          <button onClick={() => { go("map"); }} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(196,160,80,0.25)", color:"rgba(255,255,255,0.8)", padding:"8px 14px", fontSize:14, cursor:"pointer" }}>🗺️</button>
        </div>

        {/* Mobile hamburger */}
        <button className="mobile-menu" onClick={() => setMenuOpen(o => !o)} style={{ background:"none", border:"none", cursor:"pointer", padding:8, flexDirection:"column", gap:5 }}>
          {[0,1,2].map(i => <div key={i} style={{ width:24, height:2, background:"#c4a050" }} />)}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div style={{ position:"fixed", top:70, left:0, right:0, background:"rgba(6,9,18,0.99)", borderBottom:"1px solid rgba(196,160,80,0.2)", padding:"24px 5vw 32px", zIndex:998, display:"flex", flexDirection:"column", gap:16 }}>
          {[["Search","results"],[t.hotels,"hotels"],[t.experiences,"experiences"],[t.about,"about"],[t.contact,"contact"],[t.listHotel,"partner"]].concat(user?.email==="kellysyder753@gmail.com"?[[t.admin,"admin"]]:[]).map(([label,pg]) => (
            <span key={pg} onClick={() => go(pg)} style={{ cursor:"pointer", fontSize:15, letterSpacing:2, textTransform:"uppercase", color:page===pg?"#c4a050":"rgba(255,255,255,0.7)", fontFamily:"'Cormorant Garamond',Georgia,serif", paddingBottom:12, borderBottom:"1px solid rgba(255,255,255,0.05)" }}>{label}</span>
          ))}
          {/* Mobile currency + language */}
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", paddingTop:8 }}>
            {CURRENCIES.map(c => (
              <button key={c.code} onClick={() => { setCurrency(c.code); setMenuOpen(false); }} style={{ background:currency===c.code?"rgba(196,160,80,0.2)":"rgba(255,255,255,0.06)", border:`1px solid ${currency===c.code?"#c4a050":"rgba(255,255,255,0.1)"}`, color:currency===c.code?"#c4a050":"rgba(255,255,255,0.6)", padding:"6px 12px", fontSize:12, cursor:"pointer" }}>{c.flag} {c.code}</button>
            ))}
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => { setLanguage(l.code); setMenuOpen(false); }} style={{ background:language===l.code?"rgba(196,160,80,0.2)":"rgba(255,255,255,0.06)", border:`1px solid ${language===l.code?"#c4a050":"rgba(255,255,255,0.1)"}`, color:language===l.code?"#c4a050":"rgba(255,255,255,0.6)", padding:"6px 12px", fontSize:12, cursor:"pointer" }}>{l.flag} {l.name}</button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

// ══════════════════════════════════════════════════════════
// ── MAIN APP ──────────────────────────────────────────────
// ══════════════════════════════════════════════════════════
export default function App() {
  const [rooms, setRooms]           = useState([]);
  const [hotels, setHotels]         = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [page, setPage]             = useState("home");
  const [selectedRoom, setSelectedRoom]   = useState(null);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [confirmation, setConfirmation]   = useState(null);
  const [bookings, setBookings]     = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [contactSent, setContactSent]   = useState(false);
  const [applicationSent, setApplicationSent] = useState(false);

  // ── USER AUTH ──────────────────────────────────────────
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('amarya_user')); } catch { return null; } });
  const [token, setToken] = useState(() => localStorage.getItem('amarya_token') || null);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name:'', email:'', phone:'', password:'' });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [userBookings, setUserBookings] = useState([]);
  const authHeaders = token ? { Authorization: 'Bearer ' + token } : {};

  const loginUser = (userData, userToken) => {
    setUser(userData); setToken(userToken);
    localStorage.setItem('amarya_user', JSON.stringify(userData));
    localStorage.setItem('amarya_token', userToken);
  };
  const logoutUser = () => {
    setUser(null); setToken(null);
    localStorage.removeItem('amarya_user');
    localStorage.removeItem('amarya_token');
    navigate('home');
  };
  const handleAuthSubmit = async (e) => {
    e.preventDefault(); setAuthLoading(true); setAuthError('');
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = authMode === 'login'
        ? { email: authForm.email, password: authForm.password }
        : { name: authForm.name, email: authForm.email, phone: authForm.phone, password: authForm.password };
      const res = await axios.post(API + endpoint, payload);
      loginUser(res.data.user, res.data.token);
      setAuthForm({ name:'', email:'', phone:'', password:'' });
      navigate('account');
    } catch (err) {
      setAuthError(err.response?.data?.error || 'Something went wrong.');
    } finally { setAuthLoading(false); }
  };
  const fetchUserBookings = async () => {
    if (!token) return;
    try { const res = await axios.get(API + '/api/auth/bookings', { headers: authHeaders }); setUserBookings(res.data); } catch {}
  };

  // ── REVIEWS ───────────────────────────────────────────
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ guest_name:'', rating:5, comment:'', stay_date:'' });
  const [reviewSent, setReviewSent] = useState(false);
  const [hotelRating, setHotelRating] = useState(null);
  const fetchReviews = async (hotelId) => {
    try {
      const [rv, rt] = await Promise.all([
        axios.get(API + '/api/hotels/' + hotelId + '/reviews'),
        axios.get(API + '/api/hotels/' + hotelId + '/rating'),
      ]);
      setReviews(rv.data); setHotelRating(rt.data);
    } catch {}
  };
  const handleReviewSubmit = async (hotelId) => {
    if (!reviewForm.guest_name || !reviewForm.rating) return;
    try {
      await axios.post(API + '/api/hotels/' + hotelId + '/reviews', reviewForm, { headers: authHeaders });
      setReviewSent(true);
      setReviewForm({ guest_name:'', rating:5, comment:'', stay_date:'' });
      fetchReviews(hotelId);
      setTimeout(() => setReviewSent(false), 3000);
    } catch {}
  };

  // ── MAP ───────────────────────────────────────────────
  const [mapHotels, setMapHotels] = useState([]);
  const [mapSelected, setMapSelected] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const fetchMapHotels = async (q) => {
    try { const res = await axios.get(API + '/api/map/hotels', { params: { q } }); setMapHotels(res.data); } catch {}
  };

  // Currency & Language
  const [currency, setCurrency] = useState("GHS");
  const [language, setLanguage] = useState("en");
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const currObj = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];

  // Convert price from GHS to selected currency
  const formatPrice = (ghsPrice) => {
    const converted = ghsPrice * currObj.rate;
    const formatted = converted >= 1000
      ? converted.toLocaleString(undefined, { maximumFractionDigits: 0 })
      : converted.toLocaleString(undefined, { maximumFractionDigits: 2 });
    return `${currObj.symbol} ${formatted}`;
  };

  const [search, setSearch] = useState({
    destination: "",
    check_in: todayStr(),
    check_out: tomorrowStr(),
    guests: 1,
  });
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const destRef = useRef(null);

  const [booking, setBooking] = useState({
    customer_name: "", customer_email: "", customer_phone: "",
    check_in: todayStr(), check_out: tomorrowStr(),
    guests: 1, special_requests: ""
  });

  const [contactForm, setContactForm] = useState({ name:"", email:"", subject:"", message:"" });
  const [applyForm, setApplyForm]     = useState({ hotel_name:"", city:"", country:"", contact_name:"", email:"", phone:"", message:"" });

  // Inject global CSS once
  useEffect(() => {
    if (!document.getElementById("amarya-global-css")) {
      const style = document.createElement("style");
      style.id = "amarya-global-css";
      style.textContent = GLOBAL_CSS;
      document.head.appendChild(style);
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,300;0,400;0,700;1,300;1,400&family=Cormorant+Garamond:wght@300;400;600&display=swap";
    if (!document.querySelector('link[href*="Playfair"]')) document.head.appendChild(link);
  }, []);

  // ── DATA FETCHERS ──────────────────────────────────────
  const fetchRooms = useCallback(async (city = "", extraParams = {}) => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (city) params.append("q", city);
      Object.entries(extraParams).forEach(([k,v]) => v && params.append(k, v));
      const res = await axios.get(`${API}/api/rooms?${params}`);
      setRooms(res.data);
    } catch {
      setError("Could not connect to server. Make sure it's running on port 5000.");
    } finally { setLoading(false); }
  }, []);

  const fetchHotels = useCallback(async (q = "") => {
    try {
      const res = await axios.get(`${API}/api/hotels?q=${q}`);
      setHotels(res.data);
    } catch (err) { console.error(err); }
  }, []);

  const fetchHotelDetail = async (id) => {
    try {
      const res = await axios.get(`${API}/api/hotels/${id}`);
      setSelectedHotel(res.data);
      navigate("hotel");
    } catch (err) { console.error(err); }
  };

  const fetchBookings = async () => {
    try { const res = await axios.get(`${API}/api/bookings`); setBookings(res.data); }
    catch (err) { console.error(err); }
  };

  useEffect(() => { fetchRooms(); fetchHotels(); }, []);
  useEffect(() => { if (page === "admin") { fetchBookings(); fetchRooms(); fetchHotels(); } }, [page]);
  useEffect(() => { if (page === "account") fetchUserBookings(); }, [page, token]);
  useEffect(() => { if (page === "map") fetchMapHotels(search.destination); }, [page]);
  useEffect(() => { if (page === "hotel" && selectedHotel) fetchReviews(selectedHotel.id); }, [page, selectedHotel]);

  // ── SEARCH ─────────────────────────────────────────────
  const handleSearchChange = useCallback((field, value) => {
    setSearch(s => ({ ...s, [field]: value }));
  }, []);

  const handleDestChange = useCallback((val) => {
    setSearch(s => ({ ...s, destination: val }));
    const filtered = val.length >= 1
      ? POPULAR.filter(p => p.toLowerCase().includes(val.toLowerCase()))
      : POPULAR;
    setSuggestions(filtered.slice(0, 6));
    setShowSuggestions(true);
  }, []);

  const handleDestFocus = useCallback(() => {
    const filtered = search.destination.length >= 1
      ? POPULAR.filter(p => p.toLowerCase().includes(search.destination.toLowerCase()))
      : POPULAR;
    setSuggestions(filtered.slice(0, 6));
    setShowSuggestions(true);
  }, [search.destination]);

  const handleDestBlur = useCallback(() => {
    setTimeout(() => setShowSuggestions(false), 180);
  }, []);

  const handleSuggestionClick = useCallback((s) => {
    setSearch(prev => ({ ...prev, destination: s }));
    setShowSuggestions(false);
    destRef.current?.focus();
  }, []);

  const handleSearch = useCallback((e) => {
    if (e) e.preventDefault();
    setShowSuggestions(false);
    setBooking(b => ({ ...b, check_in: search.check_in, check_out: search.check_out, guests: search.guests }));
    fetchRooms(search.destination);
    navigate("results");
  }, [search, fetchRooms]);

  // ── BOOKING ────────────────────────────────────────────
  const handleBookRoom = useCallback((room) => {
    setSelectedRoom(room);
    setBooking(b => ({ ...b, check_in: search.check_in, check_out: search.check_out, guests: search.guests }));
    navigate("booking");
  }, [search]);

  const handleSubmitBooking = async (e) => {
    e.preventDefault(); setSubmitting(true);
    const nights = nightsBetween(booking.check_in, booking.check_out);
    const total = selectedRoom.price * nights;
    // Show confirmation instantly — dont make user wait
    setConfirmation({ booking_id:'pending', hotel_name:selectedRoom.hotel_name, total_price:total, nights, room:selectedRoom, booking:{...booking} });
    navigate("confirmation");
    setSubmitting(false);
    // Save to server in background
    try {
      const res = await axios.post(API+"/api/bookings", { ...booking, room_id: selectedRoom.id });
      setConfirmation(prev => ({ ...prev, ...res.data, room:selectedRoom, booking:{...booking} }));
      fetchRooms(search.destination);
    } catch (err) { console.error("Booking save error:", err.message); }
  };

  const handleCancelBooking = async (id) => {
    if (!confirm("Cancel this booking?")) return;
    try { await axios.delete(`${API}/api/bookings/${id}`); fetchBookings(); fetchRooms(); }
    catch { alert("Failed to cancel."); }
  };

  const handleContactSubmit = (e) => {
    e.preventDefault(); setContactSent(true);
    setTimeout(() => setContactSent(false), 4000);
    setContactForm({ name:"", email:"", subject:"", message:"" });
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/api/hotels/apply`, applyForm);
      setApplicationSent(true);
      setApplyForm({ hotel_name:"", city:"", country:"", contact_name:"", email:"", phone:"", message:"" });
    } catch (err) { alert(err.response?.data?.error || "Submission failed."); }
  };

  const navigate = (pg) => {
    setPage(pg);
    window.scrollTo(0, 0);
    window.history.pushState({ page: pg }, '', '/' + pg);
  };

  // Back button handler — stays forever
  useEffect(() => {
    const handleBack = (e) => {
      const pg = e.state?.page || 'home';
      setPage(pg);
      window.scrollTo(0, 0);
    };
    window.addEventListener('popstate', handleBack);
    // Set initial history state
    window.history.replaceState({ page: 'home' }, '', '/home');
    return () => window.removeEventListener('popstate', handleBack);
  }, []);
  const nights = nightsBetween(booking.check_in, booking.check_out);

  // ── SHARED SEARCH BAR PROPS ────────────────────────────
  const searchBarProps = {
    search, onSearchChange: handleSearchChange, onDestChange: handleDestChange,
    onSubmit: handleSearch, suggestions, showSuggestions,
    onSuggestionClick: handleSuggestionClick, onDestFocus: handleDestFocus,
    onDestBlur: handleDestBlur, destRef,
  };

  // ── PAGES ──────────────────────────────────────────────

  // HOME
  const renderHome = () => (
    <div>
      <section style={{ minHeight:"100vh", position:"relative", display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", overflow:"hidden", paddingTop:70 }}>
        <div style={{ position:"absolute", inset:0, backgroundImage:'url("https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1800")', backgroundSize:"cover", backgroundPosition:"center", filter:"brightness(0.28)" }} />
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom,transparent 40%,#080c17 100%)" }} />
        <div style={{ position:"relative", zIndex:2, textAlign:"center", padding:"60px 5vw 0", maxWidth:1020, width:"100%" }}>
          <p style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:13, letterSpacing:8, color:"#c4a050", marginBottom:20, textTransform:"uppercase" }}>Find & Book Hotels Worldwide</p>
          <h1 className="hero-title">
            Discover <em style={{ color:"#c4a050" }}>Luxury</em><br />Everywhere
          </h1>
          <p style={{ fontSize:17, color:"rgba(255,255,255,0.55)", marginBottom:48, fontFamily:"'Cormorant Garamond',Georgia,serif", maxWidth:500, margin:"0 auto 48px" }}>
            Search real hotels in any city. Book instantly. The hotel is notified automatically.
          </p>
          <SearchBar compact={false} {...searchBarProps} />
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", justifyContent:"center", marginTop:24 }}>
            {["Accra","Kumasi","Lagos","Nairobi","Dubai","Cape Town","London","Paris"].map(city => (
              <button key={city} className="city-chip" onMouseDown={() => { setSearch(s => ({...s, destination: city})); fetchRooms(city); navigate("results"); }}>📍 {city}</button>
            ))}
          </div>
        </div>
        <div style={{ position:"absolute", bottom:36, left:"50%", transform:"translateX(-50%)", display:"flex", flexDirection:"column", alignItems:"center", gap:6, opacity:0.35 }}>
          <span style={{ fontSize:10, letterSpacing:4, color:"#c4a050", textTransform:"uppercase" }}>Scroll</span>
          <div style={{ width:1, height:44, background:"linear-gradient(to bottom,#c4a050,transparent)" }} />
        </div>
      </section>

      <div className="stats-bar">
        {[["12+","Partner Hotels"],["8","Countries"],["5★","Avg Rating"],["24/7","Support"]].map(([num,label]) => (
          <div key={label} style={{ textAlign:"center" }}>
            <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:32, color:"#c4a050" }}>{num}</div>
            <div style={{ fontSize:11, letterSpacing:3, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", marginTop:3 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* HOW IT WORKS */}
      <section style={{ background:"#080c17", padding:"80px 5vw" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <p style={{ fontSize:11, letterSpacing:6, color:"#c4a050", textTransform:"uppercase", marginBottom:12, textAlign:"center" }}>Simple Process</p>
          <h2 className="section-title" style={{ textAlign:"center", marginBottom:52 }}>How <em style={{ color:"#c4a050" }}>Amarya Works</em></h2>
          <div className="how-grid">
            {[["🔍","Search Any City","Type your destination and we search all partner hotels in that city — just like Booking.com."],["🏨","Compare Hotels","Browse rooms across multiple hotels. See real prices, real availability, real locations."],["✅","Book Instantly","Complete your booking in seconds. Your reservation is confirmed immediately."],["📧","Hotel Notified","The hotel gets an automatic email with all your details. No waiting, no phone calls."]].map(([icon,title,desc],i) => (
              <div key={title} style={{ textAlign:"center", padding:28, background:"#0d1220", border:"1px solid rgba(196,160,80,0.1)" }}>
                <div style={{ width:52, height:52, background:"rgba(196,160,80,0.1)", border:"1px solid rgba(196,160,80,0.25)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, margin:"0 auto 16px" }}>{icon}</div>
                <div style={{ fontSize:10, letterSpacing:3, color:"#c4a050", textTransform:"uppercase", marginBottom:8 }}>Step {i+1}</div>
                <h3 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:18, color:"#fff", margin:"0 0 8px" }}>{title}</h3>
                <p style={{ color:"rgba(255,255,255,0.45)", fontSize:13, lineHeight:1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED ROOMS */}
      <section style={{ background:"#0a0e1a", padding:"80px 5vw" }}>
        <div style={{ maxWidth:1300, margin:"0 auto" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:48, flexWrap:"wrap", gap:16 }}>
            <div>
              <p style={{ fontSize:11, letterSpacing:6, color:"#c4a050", textTransform:"uppercase", marginBottom:10 }}>Featured</p>
              <h2 className="section-title">Top <em style={{ color:"#c4a050" }}>Rooms Today</em></h2>
            </div>
            <button onClick={() => { navigate("results"); fetchRooms(); }} className="btn-ghost">View All →</button>
          </div>
          <div className="grid-auto-3">
            {rooms.slice(0,6).map(room => <RoomCard key={room.id} room={room} onBook={handleBookRoom} onView={r => { setSelectedRoom(r); navigate("detail"); }} formatPrice={formatPrice} t={t} />)}
          </div>
        </div>
      </section>

      {/* PARTNER CTA */}
      <section style={{ background:"linear-gradient(135deg,#0d1220 0%,#1a1400 100%)", padding:"80px 5vw", borderTop:"1px solid rgba(196,160,80,0.15)" }}>
        <div style={{ maxWidth:800, margin:"0 auto", textAlign:"center" }}>
          <p style={{ fontSize:11, letterSpacing:6, color:"#c4a050", textTransform:"uppercase", marginBottom:16 }}>For Hotel Owners</p>
          <h2 className="section-title" style={{ marginBottom:20 }}>List Your Hotel on <em style={{ color:"#c4a050" }}>Amarya</em></h2>
          <p style={{ color:"rgba(255,255,255,0.55)", fontSize:16, lineHeight:1.8, fontFamily:"'Cormorant Garamond',Georgia,serif", marginBottom:36 }}>Reach luxury travellers worldwide. Receive instant booking notifications. Keep 90% of every booking.</p>
          <div style={{ display:"flex", gap:16, justifyContent:"center", flexWrap:"wrap", marginBottom:36 }}>
            {[["✅","No setup fee"],["📧","Instant notifications"],["💰","90% payout"],["🌍","Global reach"]].map(([icon,text]) => (
              <div key={text} style={{ display:"flex", alignItems:"center", gap:8, fontSize:14, color:"rgba(255,255,255,0.65)" }}><span>{icon}</span>{text}</div>
            ))}
          </div>
          <button onClick={() => navigate("partner")} className="btn-gold" style={{ fontSize:12, letterSpacing:4, padding:"16px 40px" }}>Partner With Us →</button>
        </div>
      </section>
      <Footer onNavigate={navigate} />
    </div>
  );

  // RESULTS
  const renderResults = () => (
    <div style={{ paddingTop:70, background:"#080c17", minHeight:"100vh" }}>
      <div style={{ background:"#0d1220", padding:"32px 5vw", borderBottom:"1px solid rgba(196,160,80,0.1)" }}>
        <div style={{ maxWidth:1300, margin:"0 auto" }}>
          <SearchBar compact {...searchBarProps} />
          <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:14 }}>
            {loading ? "Searching..." : `${rooms.length} room${rooms.length!==1?"s":""} found${search.destination ? ` in "${search.destination}"` : " worldwide"}`}
          </p>
        </div>
      </div>
      <div style={{ maxWidth:1300, margin:"0 auto", padding:"44px 5vw" }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:80, color:"rgba(255,255,255,0.3)", letterSpacing:4 }}>SEARCHING HOTELS...</div>
        ) : error ? (
          <div style={{ textAlign:"center", padding:80, color:"#ff6b6b" }}>⚠ {error}</div>
        ) : rooms.length === 0 ? (
          <div style={{ textAlign:"center", padding:80 }}>
            <div style={{ fontSize:48, marginBottom:16 }}>🏨</div>
            <div style={{ color:"rgba(255,255,255,0.4)", fontSize:15, marginBottom:8 }}>No hotels found {search.destination ? `in "${search.destination}"` : ""}</div>
            <div style={{ color:"rgba(255,255,255,0.25)", fontSize:13 }}>Try another city or check back later as more hotels join Amarya.</div>
          </div>
        ) : (
          <div className="grid-auto-3">
            {rooms.map(room => <RoomCard key={room.id} room={room} onBook={handleBookRoom} onView={r => { setSelectedRoom(r); navigate("detail"); }} showHotel formatPrice={formatPrice} t={t} />)}
          </div>
        )}
      </div>
      <Footer onNavigate={navigate} />
    </div>
  );

  // HOTELS LIST
  const renderHotels = () => (
    <div style={{ paddingTop:70, background:"#080c17", minHeight:"100vh" }}>
      <div style={{ background:"#0d1220", padding:"70px 5vw 50px", borderBottom:"1px solid rgba(196,160,80,0.1)" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <p style={{ fontSize:11, letterSpacing:6, color:"#c4a050", textTransform:"uppercase", marginBottom:10 }}>Our Network</p>
          <h1 className="page-title">Partner <em style={{ color:"#c4a050" }}>Hotels</em></h1>
        </div>
      </div>
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"52px 5vw" }}>
        <div className="grid-auto-3">
          {hotels.map(hotel => (
            <div key={hotel.id} className="hotel-card" onClick={() => fetchHotelDetail(hotel.id)}>
              <div style={{ position:"relative", height:200, overflow:"hidden" }}>
                <img src={hotel.image_url} alt={hotel.name} style={{ width:"100%", height:"100%", objectFit:"cover", filter:"brightness(0.7)", transition:"transform 0.5s" }} onMouseEnter={e => e.target.style.transform="scale(1.06)"} onMouseLeave={e => e.target.style.transform="scale(1)"} />
                <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(8,12,23,0.7),transparent 55%)" }} />
                <div style={{ position:"absolute", bottom:12, left:14, fontSize:12, color:"rgba(255,255,255,0.6)" }}>📍 {hotel.city}, {hotel.country}</div>
                <div style={{ position:"absolute", top:12, right:12, background:"rgba(6,9,18,0.85)", border:"1px solid rgba(196,160,80,0.3)", padding:"4px 10px", fontSize:11, color:"#c4a050" }}>{"★".repeat(hotel.star_rating)}</div>
              </div>
              <div style={{ padding:22 }}>
                <h3 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:19, color:"#fff", margin:"0 0 8px" }}>{hotel.name}</h3>
                <p style={{ color:"rgba(255,255,255,0.45)", fontSize:13, lineHeight:1.6, marginBottom:14, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{hotel.description}</p>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderTop:"1px solid rgba(255,255,255,0.06)", paddingTop:12 }}>
                  <span style={{ fontSize:12, color:"rgba(255,255,255,0.35)" }}>{hotel.city}, {hotel.country}</span>
                  <span style={{ fontSize:13, color:"#c4a050", fontWeight:700 }}>View Rooms →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer onNavigate={navigate} />
    </div>
  );

  // HOTEL DETAIL
  const renderHotel = () => {
    if (!selectedHotel) return null;
    const amenities = selectedHotel.amenities ? selectedHotel.amenities.split(",") : [];
    return (
      <div style={{ paddingTop:70, background:"#080c17", minHeight:"100vh" }}>
        <div style={{ position:"relative", height:"45vh", overflow:"hidden" }}>
          <img src={selectedHotel.image_url} alt={selectedHotel.name} style={{ width:"100%", height:"100%", objectFit:"cover", filter:"brightness(0.4)" }} />
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,#080c17,transparent 60%)" }} />
          <div style={{ position:"absolute", bottom:40, left:"5vw" }}>
            <p style={{ fontSize:11, letterSpacing:4, color:"#c4a050", textTransform:"uppercase", marginBottom:8 }}>📍 {selectedHotel.city}, {selectedHotel.country}</p>
            <h1 className="page-title">{selectedHotel.name}</h1>
            <div style={{ color:"#c4a050", fontSize:16, marginTop:8 }}>{"★".repeat(selectedHotel.star_rating)}</div>
          </div>
        </div>
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"52px 5vw" }}>
          <p style={{ color:"rgba(255,255,255,0.6)", lineHeight:1.9, fontSize:16, fontFamily:"'Cormorant Garamond',Georgia,serif", marginBottom:32, maxWidth:700 }}>{selectedHotel.description}</p>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:44 }}>
            {amenities.map(a => <span key={a} className="amenity-tag">{AMENITY_ICONS[a.trim()]||"✦"} {a.trim()}</span>)}
          </div>
          <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:30, fontWeight:300, color:"#fff", margin:"0 0 24px" }}>Available <em style={{ color:"#c4a050" }}>Rooms</em></h2>
          <div className="grid-auto-3">
            {(selectedHotel.rooms||[]).map(room => (
              <RoomCard key={room.id} room={{ ...room, hotel_name:selectedHotel.name, city:selectedHotel.city, country:selectedHotel.country }} onBook={handleBookRoom} onView={r => { setSelectedRoom(r); navigate("detail"); }} formatPrice={formatPrice} t={t} />
            ))}
          </div>

          {/* ── REVIEWS SECTION ── */}
          <div style={{ marginTop:64, borderTop:"1px solid rgba(196,160,80,0.15)", paddingTop:48 }}>
            <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:30, fontWeight:300, color:"#fff", margin:"0 0 8px" }}>Guest <em style={{ color:"#c4a050" }}>Reviews</em></h2>

            {/* Rating summary */}
            {hotelRating && hotelRating.total > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:24, marginBottom:32, flexWrap:"wrap" }}>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:56, color:"#c4a050", lineHeight:1 }}>{hotelRating.average}</div>
                  <div style={{ color:"#c4a050", fontSize:20, margin:"4px 0" }}>{"★".repeat(Math.round(hotelRating.average))}{"☆".repeat(5-Math.round(hotelRating.average))}</div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", letterSpacing:2 }}>{hotelRating.total} REVIEWS</div>
                </div>
                <div style={{ flex:1, minWidth:200 }}>
                  {[[5,"five_star"],[4,"four_star"],[3,"three_star"],[2,"two_star"],[1,"one_star"]].map(([n,key]) => (
                    <div key={n} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                      <span style={{ fontSize:12, color:"rgba(255,255,255,0.4)", width:8 }}>{n}</span>
                      <span style={{ color:"#c4a050", fontSize:11 }}>★</span>
                      <div style={{ flex:1, height:6, background:"rgba(255,255,255,0.06)", borderRadius:3 }}>
                        <div style={{ width: hotelRating.total > 0 ? `${(hotelRating[key]/hotelRating.total)*100}%` : "0%", height:"100%", background:"#c4a050", borderRadius:3 }} />
                      </div>
                      <span style={{ fontSize:11, color:"rgba(255,255,255,0.3)", width:20, textAlign:"right" }}>{hotelRating[key]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Review list */}
            {reviews.length > 0 ? (
              <div style={{ display:"flex", flexDirection:"column", gap:16, marginBottom:40 }}>
                {reviews.map(r => (
                  <div key={r.id} style={{ background:"#0d1220", border:"1px solid rgba(196,160,80,0.12)", padding:20 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8, flexWrap:"wrap", gap:8 }}>
                      <div>
                        <span style={{ fontSize:14, color:"#e8d5a0", fontWeight:600 }}>{r.guest_name}</span>
                        {r.stay_date && <span style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginLeft:10 }}>Stayed {r.stay_date}</span>}
                      </div>
                      <span style={{ color:"#c4a050", fontSize:14 }}>{"★".repeat(r.rating)}{"☆".repeat(5-r.rating)}</span>
                    </div>
                    {r.comment && <p style={{ fontSize:14, color:"rgba(255,255,255,0.6)", lineHeight:1.7, margin:0, fontFamily:"'Cormorant Garamond',Georgia,serif" }}>{r.comment}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color:"rgba(255,255,255,0.3)", fontSize:14, marginBottom:32, letterSpacing:1 }}>No reviews yet — be the first to review this hotel.</p>
            )}

            {/* Write a review */}
            <div style={{ background:"#0d1220", border:"1px solid rgba(196,160,80,0.2)", padding:28 }}>
              <h3 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:20, fontWeight:300, color:"#fff", margin:"0 0 20px" }}>Write a <em style={{ color:"#c4a050" }}>Review</em></h3>
              {reviewSent && <div style={{ background:"rgba(196,160,80,0.1)", border:"1px solid rgba(196,160,80,0.4)", color:"#c4a050", padding:12, marginBottom:16, textAlign:"center", fontSize:14 }}>✓ Thank you for your review!</div>}
              <div style={{ marginBottom:14 }}>
                <label className="form-label">Your Name *</label>
                <input className="amarya-input" value={reviewForm.guest_name} onChange={e=>setReviewForm(f=>({...f,guest_name:e.target.value}))} placeholder="Your name" />
              </div>
              <div style={{ marginBottom:14 }}>
                <label className="form-label">Rating *</label>
                <div style={{ display:"flex", gap:8, marginTop:6 }}>
                  {[1,2,3,4,5].map(n => (
                    <button key={n} type="button" onClick={()=>setReviewForm(f=>({...f,rating:n}))}
                      style={{ width:40, height:40, background:reviewForm.rating>=n?"rgba(196,160,80,0.2)":"rgba(255,255,255,0.04)", border:`1px solid ${reviewForm.rating>=n?"#c4a050":"rgba(255,255,255,0.1)"}`, color:reviewForm.rating>=n?"#c4a050":"rgba(255,255,255,0.3)", fontSize:18, cursor:"pointer" }}>★</button>
                  ))}
                  <span style={{ alignSelf:"center", fontSize:13, color:"rgba(255,255,255,0.4)", marginLeft:8 }}>{["","Poor","Fair","Good","Very Good","Excellent"][reviewForm.rating]}</span>
                </div>
              </div>
              <div style={{ marginBottom:14 }}>
                <label className="form-label">When did you stay?</label>
                <input className="amarya-input" placeholder="e.g. January 2026" value={reviewForm.stay_date} onChange={e=>setReviewForm(f=>({...f,stay_date:e.target.value}))} />
              </div>
              <div style={{ marginBottom:20 }}>
                <label className="form-label">Your Review</label>
                <textarea className="amarya-input" rows={4} style={{ resize:"vertical" }} placeholder="Share your experience at this hotel..." value={reviewForm.comment} onChange={e=>setReviewForm(f=>({...f,comment:e.target.value}))} />
              </div>
              <button className="btn-gold" style={{ padding:"13px 32px", fontSize:11, letterSpacing:3 }} onClick={()=>handleReviewSubmit(selectedHotel.id)}>Submit Review</button>
            </div>
          </div>
        </div>
        <Footer onNavigate={navigate} />
      </div>
    );
  };

  // ROOM DETAIL
  const renderDetail = () => {
    if (!selectedRoom) return null;
    const amenities = selectedRoom.amenities ? selectedRoom.amenities.split(",") : [];
    const detNights = nightsBetween(booking.check_in, booking.check_out);
    return (
      <div style={{ paddingTop:70, background:"#080c17", minHeight:"100vh" }}>
        <div style={{ position:"relative", height:"46vh", overflow:"hidden" }}>
          <img src={selectedRoom.image_url} alt={selectedRoom.type} style={{ width:"100%", height:"100%", objectFit:"cover", filter:"brightness(0.38)" }} />
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,#080c17 0%,transparent 60%)" }} />
          <div style={{ position:"absolute", bottom:40, left:"5vw" }}>
            {selectedRoom.hotel_name && <p style={{ fontSize:12, letterSpacing:3, color:"#c4a050", textTransform:"uppercase", marginBottom:6 }}>📍 {selectedRoom.city}, {selectedRoom.country} · {selectedRoom.hotel_name}</p>}
            <p style={{ fontSize:11, letterSpacing:4, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", marginBottom:6 }}>Room {selectedRoom.room_number}</p>
            <h1 className="page-title">{selectedRoom.type}</h1>
          </div>
        </div>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"52px 5vw" }}>
          <div className="detail-grid">
            <div>
              <p style={{ color:"rgba(255,255,255,0.65)", lineHeight:1.9, fontSize:16, fontFamily:"'Cormorant Garamond',Georgia,serif", marginBottom:28 }}>{selectedRoom.description}</p>
              <div style={{ display:"flex", gap:14, marginBottom:28, flexWrap:"wrap" }}>
                {[[selectedRoom.size_sqm&&`${selectedRoom.size_sqm}m²`,"Room Size"],[selectedRoom.capacity&&selectedRoom.capacity,"Max Guests"],[selectedRoom.floor&&`Floor ${selectedRoom.floor}`,"Level"]].filter(([v])=>v).map(([val,label]) => (
                  <div key={label} style={{ textAlign:"center", background:"rgba(196,160,80,0.06)", border:"1px solid rgba(196,160,80,0.15)", padding:"12px 20px" }}>
                    <div style={{ fontSize:20, color:"#c4a050", fontWeight:700 }}>{val}</div>
                    <div style={{ fontSize:10, letterSpacing:2, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", marginTop:3 }}>{label}</div>
                  </div>
                ))}
              </div>
              <h3 style={{ fontSize:11, letterSpacing:4, color:"#c4a050", textTransform:"uppercase", marginBottom:12 }}>Amenities</h3>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {amenities.map(a => <span key={a} className="amenity-tag">{AMENITY_ICONS[a.trim()]||"✦"} {a.trim()}</span>)}
              </div>
            </div>
            {/* Booking sidebar */}
            <div className="sticky-sidebar" style={{ background:"#0d1220", border:"1px solid rgba(196,160,80,0.2)", padding:28 }}>
              <div style={{ marginBottom:12 }}>
                <span style={{ fontSize:11, letterSpacing:2, color:"rgba(255,255,255,0.4)", textTransform:"uppercase" }}>From</span>
                <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:36, color:"#c4a050", lineHeight:1 }}>GHS {Number(selectedRoom.price).toLocaleString()}</div>
                <span style={{ fontSize:12, color:"rgba(255,255,255,0.3)" }}>per night</span>
              </div>
              <div style={{ height:1, background:"rgba(196,160,80,0.15)", margin:"12px 0" }} />
              {[["Check In","check_in","date",todayStr()],["Check Out","check_out","date",booking.check_in]].map(([label,field,type,min]) => (
                <div key={field} style={{ marginBottom:12 }}>
                  <label className="form-label">{label}</label>
                  <input type={type} value={booking[field]} min={min} onChange={e => setBooking(b=>({...b,[field]:e.target.value}))} className="amarya-input" style={{ colorScheme:"dark" }} />
                </div>
              ))}
              <div style={{ marginBottom:14 }}>
                <label className="form-label">Guests</label>
                <select value={booking.guests} onChange={e=>setBooking(b=>({...b,guests:e.target.value}))} className="amarya-input">
                  {Array.from({length:selectedRoom.capacity||4},(_,i)=>i+1).map(n=><option key={n} value={n}>{n} Guest{n>1?"s":""}</option>)}
                </select>
              </div>
              {detNights>0 && <div style={{ background:"rgba(196,160,80,0.06)", border:"1px solid rgba(196,160,80,0.15)", padding:12, marginBottom:12, display:"flex", justifyContent:"space-between" }}><span style={{fontSize:12,color:"rgba(255,255,255,0.5)"}}>{detNights} nights</span><span style={{fontSize:14,color:"#c4a050",fontWeight:700}}>GHS {(selectedRoom.price*detNights).toLocaleString()}</span></div>}
              <button disabled={selectedRoom.status!=="available"} onClick={()=>handleBookRoom(selectedRoom)} className="btn-gold" style={{ width:"100%", padding:15, opacity:selectedRoom.status!=="available"?0.4:1, cursor:selectedRoom.status!=="available"?"not-allowed":"pointer" }}>
                {selectedRoom.status==="available"?"Reserve This Room":"Unavailable"}
              </button>
            </div>
          </div>
        </div>
        <Footer onNavigate={navigate} />
      </div>
    );
  };

  // BOOKING PAGE
  const renderBooking = () => {
    if (!selectedRoom) return null;
    const total = selectedRoom.price * nights;
    return (
      <div style={{ paddingTop:70, background:"#080c17", minHeight:"100vh" }}>
        <div style={{ maxWidth:880, margin:"0 auto" }} className="page-pad">
          <button onClick={() => navigate("results")} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.4)", cursor:"pointer", fontSize:13, letterSpacing:2, marginBottom:28, textTransform:"uppercase" }}>← Back</button>
          <div className="booking-grid">
            <div>
              <p style={{ fontSize:11, letterSpacing:6, color:"#c4a050", textTransform:"uppercase", marginBottom:8 }}>Almost There</p>
              <h1 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:"clamp(28px,4vw,38px)", fontWeight:300, color:"#fff", margin:"0 0 28px" }}>Complete Your<br /><em style={{color:"#c4a050"}}>Reservation</em></h1>
              <form onSubmit={handleSubmitBooking}>
                {[["customer_name","Full Name","text",true],["customer_email","Email Address","email",true],["customer_phone","Phone Number","tel",false]].map(([name,label,type,req]) => (
                  <div key={name} style={{marginBottom:14}}>
                    <label className="form-label">{label}{req?" *":""}</label>
                    <input type={type} required={req} value={booking[name]} onChange={e=>setBooking(b=>({...b,[name]:e.target.value}))} className="amarya-input" />
                  </div>
                ))}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                  {[["check_in","Arrival",todayStr()],["check_out","Departure",booking.check_in]].map(([name,label,min]) => (
                    <div key={name}>
                      <label className="form-label">{label} *</label>
                      <input type="date" required value={booking[name]} min={min} onChange={e=>setBooking(b=>({...b,[name]:e.target.value}))} className="amarya-input" style={{colorScheme:"dark"}} />
                    </div>
                  ))}
                </div>
                <div style={{marginBottom:14}}>
                  <label className="form-label">Guests</label>
                  <select value={booking.guests} onChange={e=>setBooking(b=>({...b,guests:e.target.value}))} className="amarya-input">
                    {Array.from({length:selectedRoom.capacity||4},(_,i)=>i+1).map(n=><option key={n} value={n}>{n} Guest{n>1?"s":""}</option>)}
                  </select>
                </div>
                <div style={{marginBottom:24}}>
                  <label className="form-label">Special Requests</label>
                  <textarea rows={3} value={booking.special_requests} onChange={e=>setBooking(b=>({...b,special_requests:e.target.value}))} placeholder="Early check-in, dietary needs, celebrations..." className="amarya-input" style={{resize:"vertical"}} />
                </div>
                <button type="submit" disabled={submitting||nights===0} className="btn-gold" style={{width:"100%",padding:16,fontSize:12,letterSpacing:4,opacity:submitting||nights===0?0.5:1,cursor:submitting||nights===0?"not-allowed":"pointer"}}>
                  {submitting ? "Processing..." : `Confirm — GHS ${total>0?total.toLocaleString():"..."}`}
                </button>
              </form>
            </div>
            {/* Summary */}
            <div className="sticky-sidebar">
              <img src={selectedRoom.image_url} alt={selectedRoom.type} style={{width:"100%",height:160,objectFit:"cover"}} />
              <div style={{background:"#0d1220",border:"1px solid rgba(196,160,80,0.2)",borderTop:"none",padding:18}}>
                {selectedRoom.hotel_name && <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",marginBottom:4}}>📍 {selectedRoom.city} · {selectedRoom.hotel_name}</div>}
                <div style={{fontSize:10,letterSpacing:2,color:"#c4a050",textTransform:"uppercase",marginBottom:3}}>Room {selectedRoom.room_number}</div>
                <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:17,color:"#fff",marginBottom:12}}>{selectedRoom.type}</div>
                <div style={{height:1,background:"rgba(196,160,80,0.15)",margin:"8px 0"}} />
                {[["Check In",booking.check_in||"—"],["Check Out",booking.check_out||"—"],["Guests",booking.guests],["Nights",nights||"—"]].map(([l,v]) => (
                  <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
                    <span style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>{l}</span>
                    <span style={{fontSize:13,color:"#e8d5a0"}}>{v}</span>
                  </div>
                ))}
                <div style={{height:1,background:"rgba(196,160,80,0.15)",margin:"8px 0"}} />
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>Total</span>
                  <span style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:20,color:"#c4a050"}}>GHS {nights>0?total.toLocaleString():"—"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // CONFIRMATION
  const renderConfirmation = () => {
    if (!confirmation) return null;
    return (
      <div style={{paddingTop:70,background:"#080c17",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{textAlign:"center",maxWidth:560,padding:"60px 24px"}}>
          <div style={{width:70,height:70,border:"2px solid #c4a050",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 22px",fontSize:28}}>✓</div>
          <p style={{fontSize:11,letterSpacing:6,color:"#c4a050",textTransform:"uppercase",marginBottom:10}}>Booking Confirmed</p>
          <h1 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:"clamp(32px,5vw,46px)",fontWeight:300,color:"#fff",margin:"0 0 12px"}}>Welcome to<br /><em style={{color:"#c4a050"}}>Amarya</em></h1>
          <p style={{color:"rgba(255,255,255,0.5)",fontSize:14,marginBottom:12,lineHeight:1.8,fontFamily:"'Cormorant Garamond',Georgia,serif"}}>Your booking is confirmed and <span style={{color:"#c4a050"}}>{confirmation.hotel_name}</span> has been automatically notified.</p>
          <p style={{color:"rgba(255,255,255,0.4)",fontSize:13,marginBottom:28}}>Confirmation sent to {confirmation.booking.customer_email}</p>
          <div style={{background:"#0d1220",border:"1px solid rgba(196,160,80,0.2)",padding:24,marginBottom:24,textAlign:"left"}}>
            <div style={{fontSize:10,letterSpacing:3,color:"#c4a050",textTransform:"uppercase",marginBottom:12}}>Booking #{confirmation.booking_id}</div>
            {[["Room",`${confirmation.room.type} — #${confirmation.room.room_number}`],["Hotel",confirmation.hotel_name||"Amarya"],["Check In",confirmation.booking.check_in],["Check Out",confirmation.booking.check_out],["Duration",`${confirmation.nights} night${confirmation.nights>1?"s":""}`],["Total","GHS "+Number(confirmation.total_price).toLocaleString()]].map(([l,v]) => (
              <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                <span style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>{l}</span>
                <span style={{fontSize:13,color:"#e8d5a0"}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={()=>{navigate("home");setConfirmation(null);}} className="btn-ghost">Home</button>
            <button onClick={()=>{navigate("results");fetchRooms(search.destination);setConfirmation(null);}} className="btn-gold">Book Another</button>
          </div>
        </div>
      </div>
    );
  };

  // PARTNER
  const renderPartner = () => (
    <div style={{paddingTop:70,background:"#080c17",minHeight:"100vh"}}>
      <div style={{maxWidth:860,margin:"0 auto"}} className="page-pad">
        <p style={{fontSize:11,letterSpacing:6,color:"#c4a050",textTransform:"uppercase",marginBottom:12}}>Partner Programme</p>
        <h1 className="page-title" style={{marginBottom:16}}>List Your Hotel<br /><em style={{color:"#c4a050"}}>On Amarya</em></h1>
        <p style={{color:"rgba(255,255,255,0.55)",fontSize:16,lineHeight:1.8,fontFamily:"'Cormorant Garamond',Georgia,serif",maxWidth:580,marginBottom:44}}>Join our global network. We connect your hotel to luxury travellers worldwide and handle booking management. You receive instant email notifications for every booking.</p>
        <div className="partner-features">
          {[["📧","Instant Notifications","Every booking triggers an automatic email to your hotel with full guest details."],["💰","90% Payout","You keep 90% of every booking. Amarya takes a 10% commission."],["🌍","Global Reach","Your rooms appear in searches from travellers worldwide."],["📊","Free Dashboard","Manage bookings and room availability through our admin panel."]].map(([icon,title,desc]) => (
            <div key={title} style={{background:"#0d1220",border:"1px solid rgba(196,160,80,0.1)",padding:22,display:"flex",gap:14,alignItems:"flex-start"}}>
              <span style={{fontSize:20,flexShrink:0}}>{icon}</span>
              <div><div style={{fontSize:14,fontWeight:700,color:"#e8d5a0",marginBottom:4}}>{title}</div><div style={{fontSize:13,color:"rgba(255,255,255,0.45)",lineHeight:1.6}}>{desc}</div></div>
            </div>
          ))}
        </div>
        {applicationSent ? (
          <div style={{background:"rgba(196,160,80,0.1)",border:"1px solid rgba(196,160,80,0.4)",padding:32,textAlign:"center"}}>
            <div style={{fontSize:36,marginBottom:12}}>✓</div>
            <h2 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:24,color:"#c4a050",margin:"0 0 8px"}}>Application Received!</h2>
            <p style={{color:"rgba(255,255,255,0.55)",fontSize:15}}>We'll review your application and get back to you within 48 hours.</p>
          </div>
        ) : (
          <form onSubmit={handleApplySubmit} style={{background:"#0d1220",border:"1px solid rgba(196,160,80,0.15)",padding:"36px 32px"}}>
            <h2 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:24,color:"#fff",margin:"0 0 24px"}}>Apply to <em style={{color:"#c4a050"}}>Partner</em></h2>
            <div className="partner-form-grid">
              {[["hotel_name","Hotel Name",true],["contact_name","Your Name",true],["city","City",true],["country","Country",true],["email","Email Address",true],["phone","Phone",false]].map(([name,label,req]) => (
                <div key={name}>
                  <label className="form-label">{label}{req?" *":""}</label>
                  <input required={req} value={applyForm[name]} onChange={e=>setApplyForm(f=>({...f,[name]:e.target.value}))} className="amarya-input" />
                </div>
              ))}
            </div>
            <div style={{marginBottom:24}}>
              <label className="form-label">Tell us about your hotel</label>
              <textarea rows={4} value={applyForm.message} onChange={e=>setApplyForm(f=>({...f,message:e.target.value}))} placeholder="Number of rooms, star rating, location details..." className="amarya-input" style={{resize:"vertical"}} />
            </div>
            <button type="submit" className="btn-gold" style={{width:"100%",padding:16,fontSize:12,letterSpacing:4}}>Submit Application</button>
          </form>
        )}
      </div>
      <Footer onNavigate={navigate} />
    </div>
  );

  // ABOUT
  const renderAbout = () => (
    <div style={{paddingTop:70,background:"#080c17",minHeight:"100vh"}}>
      <div style={{position:"relative",height:"40vh",overflow:"hidden"}}>
        <img src="https://images.unsplash.com/photo-1566195992011-5f6b21e539aa?w=1800" alt="About" style={{width:"100%",height:"100%",objectFit:"cover",filter:"brightness(0.28)"}} />
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,#080c17,transparent 60%)"}} />
        <div style={{position:"absolute",bottom:40,left:"5vw"}}>
          <p style={{fontSize:11,letterSpacing:6,color:"#c4a050",textTransform:"uppercase",marginBottom:10}}>Our Story</p>
          <h1 className="page-title">About <em style={{color:"#c4a050"}}>Amarya</em></h1>
        </div>
      </div>
      <div style={{maxWidth:1100,margin:"0 auto"}} className="page-pad">
        <div className="about-grid">
          <div>
            <h2 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:"clamp(24px,3vw,36px)",fontWeight:300,color:"#fff",margin:"0 0 18px"}}>A Global Hotel <em style={{color:"#c4a050"}}>Marketplace</em></h2>
            <p style={{color:"rgba(255,255,255,0.6)",lineHeight:1.9,fontSize:15,fontFamily:"'Cormorant Garamond',Georgia,serif",marginBottom:14}}>Founded in Accra, Amarya is a luxury hotel booking marketplace connecting discerning travellers with curated hotels worldwide. We believe great hospitality exists in every city — our job is to make it findable.</p>
            <p style={{color:"rgba(255,255,255,0.6)",lineHeight:1.9,fontSize:15,fontFamily:"'Cormorant Garamond',Georgia,serif"}}>When you book through Amarya, your reservation is instantly confirmed and the hotel is automatically notified with all your details. No waiting, no calls required.</p>
          </div>
          <img src="https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800" alt="About" style={{width:"100%",height:340,objectFit:"cover"}} />
        </div>
        <div className="grid-auto-2">
          {[["✦","Excellence","Uncompromising standards across every partner hotel."],["🌍","Heritage","Celebrating local culture in every destination."],["💚","Trust","Verified hotels and secure instant bookings."],["🤝","Partnership","We grow when our partner hotels grow."]].map(([icon,title,desc]) => (
            <div key={title} style={{background:"#0d1220",border:"1px solid rgba(196,160,80,0.1)",padding:24}}>
              <div style={{fontSize:22,marginBottom:10}}>{icon}</div>
              <h3 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:17,color:"#c4a050",margin:"0 0 7px"}}>{title}</h3>
              <p style={{color:"rgba(255,255,255,0.45)",fontSize:13,lineHeight:1.7}}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
      <Footer onNavigate={navigate} />
    </div>
  );

  // EXPERIENCES
  const renderExperiences = () => (
    <div style={{paddingTop:70,background:"#080c17",minHeight:"100vh"}}>
      <div style={{position:"relative",height:"40vh",overflow:"hidden"}}>
        <img src="https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1800" alt="Experiences" style={{width:"100%",height:"100%",objectFit:"cover",filter:"brightness(0.28)"}} />
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,#080c17,transparent 60%)"}} />
        <div style={{position:"absolute",bottom:40,left:"5vw"}}>
          <h1 className="page-title">Guest <em style={{color:"#c4a050"}}>Experiences</em></h1>
        </div>
      </div>
      <div style={{maxWidth:1200,margin:"0 auto"}} className="page-pad">
        <div className="exp-grid">
          {[["🍽️","Private Dining","Michelin-trained chef. Bespoke menu. In your suite.","From GHS 800","https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600"],["💆","Wellness & Spa","Ancient African healing meets modern therapy.","From GHS 400","https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600"],["🚁","Aerial Tours","Private helicopter tours from the rooftop.","From GHS 2,000","https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600"],["🎭","Cultural Immersion","Local art, music, food and history deep-dives.","From GHS 500","https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600"],["🛥️","Private Excursions","Yacht charters, private beaches, tailored day trips.","From GHS 1,500","https://images.unsplash.com/photo-1566195992011-5f6b21e539aa?w=600"],["🎉","Events","Weddings, anniversaries, corporate events.","Custom pricing","https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=600"]].map(([icon,title,desc,price,img]) => (
            <div key={title} style={{background:"#0d1220",border:"1px solid rgba(196,160,80,0.1)",overflow:"hidden"}}>
              <img src={img} alt={title} style={{width:"100%",height:170,objectFit:"cover",filter:"brightness(0.6)"}} />
              <div style={{padding:22}}>
                <div style={{fontSize:22,marginBottom:7}}>{icon}</div>
                <h3 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:18,color:"#fff",margin:"0 0 7px"}}>{title}</h3>
                <p style={{color:"rgba(255,255,255,0.5)",fontSize:13,lineHeight:1.7,marginBottom:12}}>{desc}</p>
                <div style={{fontSize:13,color:"#c4a050",fontWeight:600,marginBottom:12}}>{price}</div>
                <button onClick={()=>navigate("contact")} className="btn-ghost" style={{padding:"8px 18px",fontSize:11}}>Enquire</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer onNavigate={navigate} />
    </div>
  );

  // CONTACT
  const renderContact = () => (
    <div style={{paddingTop:70,background:"#080c17",minHeight:"100vh"}}>
      <div style={{maxWidth:960,margin:"0 auto"}} className="page-pad">
        <p style={{fontSize:11,letterSpacing:6,color:"#c4a050",textTransform:"uppercase",marginBottom:10}}>Get In Touch</p>
        <h1 className="page-title" style={{marginBottom:44}}>Contact <em style={{color:"#c4a050"}}>Us</em></h1>
        <div className="contact-grid">
          <div>
            {contactSent && <div style={{background:"rgba(196,160,80,0.1)",border:"1px solid rgba(196,160,80,0.4)",padding:14,marginBottom:20,color:"#c4a050",fontSize:14,textAlign:"center"}}>✓ Message sent! We'll reply within 24 hours.</div>}
            <form onSubmit={handleContactSubmit}>
              {[["name","Your Name","text"],["email","Email","email"],["subject","Subject","text"]].map(([name,label,type]) => (
                <div key={name} style={{marginBottom:14}}>
                  <label className="form-label">{label} *</label>
                  <input type={type} required value={contactForm[name]} onChange={e=>setContactForm(f=>({...f,[name]:e.target.value}))} className="amarya-input" />
                </div>
              ))}
              <div style={{marginBottom:20}}>
                <label className="form-label">Message *</label>
                <textarea required rows={5} value={contactForm.message} onChange={e=>setContactForm(f=>({...f,message:e.target.value}))} className="amarya-input" style={{resize:"vertical"}} />
              </div>
              <button type="submit" className="btn-gold" style={{width:"100%",padding:16,fontSize:12,letterSpacing:4}}>Send Message</button>
            </form>
          </div>
          <div>
            <h2 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:"clamp(22px,3vw,28px)",fontWeight:300,color:"#fff",margin:"0 0 22px"}}>We'd Love to<br /><em style={{color:"#c4a050"}}>Hear From You</em></h2>
            {[["📞","Phone","0500714021"],["📧","Email","kellysyder753@gmail.com"],["📍","Location","Accra, Ghana"],["⏰","Hours","24/7 Guest Services"]].map(([icon,label,val]) => (
              <div key={label} style={{display:"flex",gap:12,marginBottom:20}}>
                <span style={{fontSize:16,width:38,height:38,background:"rgba(196,160,80,0.1)",border:"1px solid rgba(196,160,80,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{icon}</span>
                <div><div style={{fontSize:10,letterSpacing:2,color:"#c4a050",textTransform:"uppercase",marginBottom:3}}>{label}</div><div style={{fontSize:14,color:"rgba(255,255,255,0.65)",fontFamily:"'Cormorant Garamond',Georgia,serif"}}>{val}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer onNavigate={navigate} />
    </div>
  );

  // ADMIN
  const renderAdmin = () => (
    <div style={{paddingTop:70,background:"#080c17",minHeight:"100vh"}}>
      <div style={{maxWidth:1200,margin:"0 auto"}} className="page-pad">
        <p style={{fontSize:11,letterSpacing:6,color:"#c4a050",textTransform:"uppercase",marginBottom:10}}>Dashboard</p>
        <h1 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:"clamp(32px,4vw,48px)",fontWeight:300,color:"#fff",margin:"0 0 36px"}}>Booking <em style={{color:"#c4a050"}}>Management</em></h1>
        <div className="admin-stats">
          {[["Total Bookings",bookings.length,"📋"],["Partner Hotels",hotels.length,"🏨"],["Available Rooms",rooms.filter(r=>r.status==="available").length,"✅"],["Occupied",rooms.filter(r=>r.status==="occupied").length,"🔴"]].map(([label,val,icon]) => (
            <div key={label} style={{background:"#0d1220",border:"1px solid rgba(196,160,80,0.15)",padding:20}}>
              <div style={{fontSize:18,marginBottom:5}}>{icon}</div>
              <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:30,color:"#c4a050"}}>{val}</div>
              <div style={{fontSize:11,letterSpacing:2,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",marginTop:3}}>{label}</div>
            </div>
          ))}
        </div>
        <h2 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:22,fontWeight:400,color:"#e8d5a0",marginBottom:16}}>All Reservations</h2>
        {bookings.length===0 ? (
          <div style={{textAlign:"center",padding:60,color:"rgba(255,255,255,0.3)",letterSpacing:4}}>NO BOOKINGS YET</div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {bookings.map(b => (
              <div key={b.id} className="admin-row">
                <div style={{fontSize:10,color:"#c4a050",letterSpacing:2,minWidth:36}}>#{b.id}</div>
                <div style={{flex:1,minWidth:120}}><div style={{fontSize:13,color:"#fff"}}>{b.customer_name}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.35)"}}>{b.customer_email}</div></div>
                <div style={{flex:1,minWidth:120}}><div style={{fontSize:12,color:"#e8d5a0"}}>{b.hotel_name}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.35)"}}>{b.city}, {b.country}</div></div>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.55)",minWidth:80}}>{b.type} #{b.room_number}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",minWidth:120}}>{b.check_in} → {b.check_out}</div>
                <div style={{fontSize:14,color:"#c4a050",fontWeight:700,minWidth:80}}>GHS {Number(b.total_price).toLocaleString()}</div>
                <button onClick={()=>handleCancelBooking(b.id)} style={{background:"transparent",border:"1px solid rgba(255,80,80,0.3)",color:"rgba(255,80,80,0.7)",padding:"6px 12px",fontSize:10,letterSpacing:2,cursor:"pointer",textTransform:"uppercase",whiteSpace:"nowrap"}}>Cancel</button>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer onNavigate={navigate} />
    </div>
  );


  // ── AUTH PAGE ─────────────────────────────────────────
  const renderAuth = () => (
    <div style={{paddingTop:70,background:'#080c17',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:'100%',maxWidth:420,padding:'0 24px'}}>
        <div style={{textAlign:'center',marginBottom:36}}>
          <p style={{fontSize:11,letterSpacing:6,color:'#c4a050',textTransform:'uppercase',marginBottom:8}}>{authMode==='login'?'Welcome Back':'Join Amarya'}</p>
          <h1 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:'clamp(28px,4vw,40px)',fontWeight:300,color:'#fff',margin:0}}>{authMode==='login'?<>Sign <em style={{color:'#c4a050'}}>In</em></>:<>Create <em style={{color:'#c4a050'}}>Account</em></>}</h1>
        </div>
        <div style={{background:'#0d1220',border:'1px solid rgba(196,160,80,0.2)',padding:32}}>
          {authError && <div style={{background:'rgba(255,80,80,0.1)',border:'1px solid rgba(255,80,80,0.3)',color:'#ff6b6b',padding:12,marginBottom:16,fontSize:13,textAlign:'center'}}>{authError}</div>}
          <form onSubmit={handleAuthSubmit}>
            {authMode==='register' && (
              <>
                <div style={{marginBottom:14}}>
                  <label className='form-label'>Full Name *</label>
                  <input required className='amarya-input' value={authForm.name} onChange={e=>setAuthForm(f=>({...f,name:e.target.value}))} placeholder='Your full name' />
                </div>
                <div style={{marginBottom:14}}>
                  <label className='form-label'>Phone (for SMS updates)</label>
                  <input className='amarya-input' value={authForm.phone} onChange={e=>setAuthForm(f=>({...f,phone:e.target.value}))} placeholder='e.g. 0244000000' />
                </div>
              </>
            )}
            <div style={{marginBottom:14}}>
              <label className='form-label'>Email *</label>
              <input required type='email' className='amarya-input' value={authForm.email} onChange={e=>setAuthForm(f=>({...f,email:e.target.value}))} placeholder='your@email.com' />
            </div>
            <div style={{marginBottom:24}}>
              <label className='form-label'>Password *</label>
              <input required type='password' className='amarya-input' value={authForm.password} onChange={e=>setAuthForm(f=>({...f,password:e.target.value}))} placeholder='Min 6 characters' />
            </div>
            <button type='submit' className='btn-gold' style={{width:'100%',padding:16,fontSize:12,letterSpacing:4}} disabled={authLoading}>
              {authLoading ? 'Please wait...' : authMode==='login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
          <div style={{textAlign:'center',marginTop:20}}>
            <span style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>
              {authMode==='login' ? "Don't have an account? " : 'Already have an account? '}
              <span onClick={()=>{setAuthMode(authMode==='login'?'register':'login');setAuthError('');}} style={{color:'#c4a050',cursor:'pointer',textDecoration:'underline'}}>
                {authMode==='login' ? 'Register' : 'Sign In'}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // ── ACCOUNT PAGE ──────────────────────────────────────
  const renderAccount = () => {
    if (!user) { navigate('auth'); return null; }
    return (
      <div style={{paddingTop:70,background:'#080c17',minHeight:'100vh'}}>
        <div style={{maxWidth:860,margin:'0 auto'}} className='page-pad'>
          <div style={{display:'flex',alignItems:'center',gap:20,marginBottom:40,flexWrap:'wrap'}}>
            <div style={{width:64,height:64,borderRadius:'50%',background:'linear-gradient(135deg,#c4a050,#e8d5a0)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,fontWeight:700,color:'#000'}}>
              {user.name?.[0]?.toUpperCase()||'G'}
            </div>
            <div>
              <p style={{fontSize:11,letterSpacing:4,color:'#c4a050',textTransform:'uppercase',marginBottom:4}}>Welcome back</p>
              <h1 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:'clamp(24px,3vw,36px)',fontWeight:300,color:'#fff',margin:0}}>{user.name}</h1>
              <p style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginTop:2}}>{user.email}</p>
            </div>
            <button onClick={logoutUser} style={{marginLeft:'auto',background:'transparent',border:'1px solid rgba(255,80,80,0.3)',color:'rgba(255,80,80,0.7)',padding:'8px 20px',fontSize:11,letterSpacing:2,cursor:'pointer',textTransform:'uppercase'}}>Sign Out</button>
          </div>

          <h2 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:22,fontWeight:400,color:'#e8d5a0',marginBottom:16}}>My Bookings</h2>
          {userBookings.length===0 ? (
            <div style={{textAlign:'center',padding:60,color:'rgba(255,255,255,0.3)',letterSpacing:4,marginBottom:40}}>
              <div style={{fontSize:40,marginBottom:16}}>🏨</div>
              NO BOOKINGS YET
              <br/>
              <button onClick={()=>navigate('results')} className='btn-gold' style={{marginTop:20,padding:'12px 28px',fontSize:11,letterSpacing:3}}>Find Hotels</button>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:40}}>
              {userBookings.map(b => (
                <div key={b.id} style={{background:'#0d1220',border:'1px solid rgba(196,160,80,0.15)',padding:20,display:'flex',gap:16,alignItems:'center',flexWrap:'wrap'}}>
                  <div style={{width:60,height:60,borderRadius:4,overflow:'hidden',flexShrink:0}}>
                    <img src={b.image_url||'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=200'} style={{width:'100%',height:'100%',objectFit:'cover'}} alt='' />
                  </div>
                  <div style={{flex:1,minWidth:160}}>
                    <div style={{fontSize:14,color:'#e8d5a0',fontWeight:600}}>{b.hotel_name}</div>
                    <div style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>{b.type} · {b.city}</div>
                  </div>
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.5)'}}>{b.check_in} → {b.check_out}</div>
                  <div style={{fontSize:16,color:'#c4a050',fontWeight:700}}>{formatPrice(b.total_price)}</div>
                  <div style={{background:'rgba(196,160,80,0.1)',border:'1px solid rgba(196,160,80,0.2)',color:'#c4a050',padding:'4px 12px',fontSize:10,letterSpacing:2,textTransform:'uppercase'}}>{b.status}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <Footer onNavigate={navigate} />
      </div>
    );
  };

  // ── MAP VIEW ─────────────────────────────────────────
  const renderMap = () => (
    <div style={{paddingTop:70,background:'#080c17',minHeight:'100vh'}}>
      <div style={{maxWidth:1200,margin:'0 auto'}} className='page-pad'>
        <p style={{fontSize:11,letterSpacing:6,color:'#c4a050',textTransform:'uppercase',marginBottom:10}}>Hotel Map</p>
        <h1 className='page-title' style={{marginBottom:8}}>Hotels on <em style={{color:'#c4a050'}}>Map</em></h1>
        <p style={{color:'rgba(255,255,255,0.4)',fontSize:14,marginBottom:32}}>Showing {mapHotels.length} hotels — click any pin to see details</p>

        {/* Simple visual map with hotel pins */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:20,marginBottom:40}}>
          {mapHotels.map(h => (
            <div key={h.id} onClick={()=>setMapSelected(mapSelected?.id===h.id?null:h)}
              style={{background: mapSelected?.id===h.id?'rgba(196,160,80,0.12)':'#0d1220', border:'1px solid rgba(196,160,80,0.15)', padding:16, cursor:'pointer', transition:'all 0.2s'}}>
              <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                <div style={{width:56,height:56,borderRadius:4,overflow:'hidden',flexShrink:0}}>
                  <img src={h.image_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt='' />
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,color:'#e8d5a0',fontWeight:600,marginBottom:2}}>{h.name}</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',marginBottom:4}}>📍 {h.city}, {h.country}</div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{color:'#c4a050',fontSize:12}}>{'★'.repeat(Math.round(h.avg_rating||0))}{'☆'.repeat(5-Math.round(h.avg_rating||0))}</span>
                    <span style={{fontSize:11,color:'rgba(255,255,255,0.3)'}}>({h.review_count} reviews)</span>
                  </div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.3)'}}>from</div>
                  <div style={{color:'#c4a050',fontSize:15,fontWeight:700}}>{h.min_price?formatPrice(h.min_price):'—'}</div>
                </div>
              </div>
              {mapSelected?.id===h.id && (
                <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid rgba(196,160,80,0.2)',display:'flex',gap:8}}>
                  <button onClick={e=>{e.stopPropagation();fetchRooms(h.city);navigate('results');}} className='btn-gold' style={{flex:1,padding:'8px 12px',fontSize:10,letterSpacing:2}}>View Rooms</button>
                  {h.latitude && h.longitude && (
                    <a href={'https://www.google.com/maps?q='+h.latitude+','+h.longitude} target='_blank' rel='noreferrer'
                      onClick={e=>e.stopPropagation()}
                      style={{flex:1,padding:'8px 12px',fontSize:10,letterSpacing:2,border:'1px solid rgba(196,160,80,0.5)',color:'#c4a050',textDecoration:'none',display:'flex',alignItems:'center',justifyContent:'center',textTransform:'uppercase'}}>
                      Google Maps ↗
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {mapHotels.length===0 && (
          <div style={{textAlign:'center',padding:80,color:'rgba(255,255,255,0.3)',letterSpacing:4}}>
            <div style={{fontSize:48,marginBottom:16}}>🗺️</div>
            SEARCH A CITY TO SEE HOTELS ON MAP
          </div>
        )}
      </div>
      <Footer onNavigate={navigate} />
    </div>
  );

  return (
    <div style={{ background:"#080c17", color:"#fff", fontFamily:"'Cormorant Garamond',Georgia,serif" }}>
      <Nav page={page} onNavigate={navigate} onFetchRooms={fetchRooms} onFetchHotels={fetchHotels} search={search} currency={currency} setCurrency={setCurrency} language={language} setLanguage={setLanguage} t={t} user={user} onLogout={logoutUser} />
      {page==="home"         && renderHome()}
      {page==="results"      && renderResults()}
      {page==="hotels"       && renderHotels()}
      {page==="hotel"        && renderHotel()}
      {page==="detail"       && renderDetail()}
      {page==="booking"      && renderBooking()}
      {page==="confirmation" && renderConfirmation()}
      {page==="about"        && renderAbout()}
      {page==="experiences"  && renderExperiences()}
      {page==="contact"      && renderContact()}
      {page==="partner"      && renderPartner()}
      {page==="admin"        && renderAdmin()}
      {page==="auth"         && renderAuth()}
      {page==="account"      && renderAccount()}
      {page==="map"          && renderMap()}
    </div>
  );
}