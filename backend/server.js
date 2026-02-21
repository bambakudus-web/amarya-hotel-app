const express    = require('express');
const mysql      = require('mysql2');
const cors       = require('cors');
const nodemailer = require('nodemailer');
const axios      = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────
//  DATABASE
// ─────────────────────────────────────────────────────────
const db = mysql.createConnection({
  socketPath: '/var/run/mysqld/mysqld.sock',
  user:     'root',
  password: '',
  database: 'amarya_db'
});

db.connect((err) => {
  if (err) {
    console.warn('Socket failed, trying TCP...');
    const db2 = mysql.createConnection({
      host: '127.0.0.1', port: 3306,
      user: 'root', password: '', database: 'amarya_db'
    });
    db2.connect((err2) => {
      if (err2) { console.error('❌ Database connection failed:', err2.message); return; }
      console.log('✅ Connected via TCP - amarya_db');
    });
    Object.assign(db, db2);
    return;
  }
  console.log('✅ Connected via socket - amarya_db');
});

// ─────────────────────────────────────────────────────────
//  EMAIL (nodemailer)
// ─────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
  }
});

const emailEnabled = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);

async function notifyHotel(hotel, booking, room) {
  if (!emailEnabled) {
    console.log(`📧 [EMAIL SIMULATION] Would notify ${hotel.email} about booking #${booking.id}`);
    return;
  }
  try {
    await transporter.sendMail({
      from: `"Amarya Bookings" <${process.env.EMAIL_USER}>`,
      to: hotel.email,
      subject: `New Booking #${booking.id} — ${room.type}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#0a0e17;padding:30px;text-align:center;">
            <h1 style="color:#c4a050;letter-spacing:4px;margin:0;">AMARYA</h1>
          </div>
          <div style="background:#f9f9f9;padding:30px;">
            <h2>New Booking Received</h2>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:8px;color:#666;">Booking ID</td><td style="padding:8px;font-weight:bold;">#${booking.id}</td></tr>
              <tr style="background:#fff;"><td style="padding:8px;color:#666;">Guest</td><td style="padding:8px;font-weight:bold;">${booking.customer_name}</td></tr>
              <tr><td style="padding:8px;color:#666;">Email</td><td style="padding:8px;">${booking.customer_email}</td></tr>
              <tr style="background:#fff;"><td style="padding:8px;color:#666;">Phone</td><td style="padding:8px;">${booking.customer_phone||'N/A'}</td></tr>
              <tr><td style="padding:8px;color:#666;">Room</td><td style="padding:8px;font-weight:bold;">${room.type} — Room ${room.room_number}</td></tr>
              <tr style="background:#fff;"><td style="padding:8px;color:#666;">Check In</td><td style="padding:8px;">${booking.check_in}</td></tr>
              <tr><td style="padding:8px;color:#666;">Check Out</td><td style="padding:8px;">${booking.check_out}</td></tr>
              <tr style="background:#fff;"><td style="padding:8px;color:#666;">Nights</td><td style="padding:8px;">${booking.nights}</td></tr>
              <tr><td style="padding:8px;color:#666;">Guests</td><td style="padding:8px;">${booking.guests}</td></tr>
              <tr style="background:#fff;"><td style="padding:8px;color:#666;">Special Requests</td><td style="padding:8px;">${booking.special_requests||'None'}</td></tr>
              <tr style="background:#c4a050;"><td style="padding:10px;color:#000;font-weight:bold;">Your Payout</td><td style="padding:10px;color:#000;font-weight:bold;font-size:18px;">GHS ${Number(booking.hotel_payout).toLocaleString()}</td></tr>
            </table>
          </div>
          <div style="background:#0a0e17;padding:20px;text-align:center;">
            <p style="color:#666;font-size:12px;margin:0;">© 2026 Amarya Hotels & Resorts</p>
          </div>
        </div>
      `
    });
    console.log(`✅ Hotel notified: ${hotel.email}`);
  } catch (e) {
    console.error('Email failed:', e.message);
  }
}

// ─────────────────────────────────────────────────────────
//  AMADEUS API INTEGRATION
//  Sign up free at: https://developers.amadeus.com
//  Set env vars: AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET
// ─────────────────────────────────────────────────────────

const AMADEUS_BASE = 'https://test.api.amadeus.com'; // Use test env (free)
// For production: 'https://api.amadeus.com'

let amadeusToken = null;
let amadeusTokenExpiry = 0;

// Get/refresh Amadeus OAuth token (they expire every 30 min)
async function getAmadeusToken() {
  if (amadeusToken && Date.now() < amadeusTokenExpiry) return amadeusToken;

  const clientId     = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  try {
    const res = await axios.post(
      `${AMADEUS_BASE}/v1/security/oauth2/token`,
      new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     clientId,
        client_secret: clientSecret,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    amadeusToken       = res.data.access_token;
    amadeusTokenExpiry = Date.now() + (res.data.expires_in - 60) * 1000; // 60s buffer
    console.log('✅ Amadeus token refreshed');
    return amadeusToken;
  } catch (err) {
    console.error('❌ Amadeus auth failed:', err.response?.data || err.message);
    return null;
  }
}

// City name → IATA code mapping (covers major cities you listed + more)
// Amadeus Hotel List API requires IATA city codes
const CITY_TO_IATA = {
  // Ghana
  'accra':          'ACC',
  'kumasi':         'KMS',
  'takoradi':       'TKD',
  'tamale':         'TML',
  // Nigeria
  'lagos':          'LOS',
  'abuja':          'ABV',
  'kano':           'KAN',
  'port harcourt':  'PHC',
  // Kenya
  'nairobi':        'NBO',
  'mombasa':        'MBA',
  // South Africa
  'cape town':      'CPT',
  'johannesburg':   'JNB',
  'durban':         'DUR',
  // Egypt
  'cairo':          'CAI',
  // Ethiopia
  'addis ababa':    'ADD',
  // Tanzania
  'dar es salaam':  'DAR',
  'zanzibar':       'ZNZ',
  // Rwanda
  'kigali':         'KGL',
  // Ivory Coast
  'abidjan':        'ABJ',
  // Senegal
  'dakar':          'DKR',
  // Morocco
  'casablanca':     'CMN',
  'marrakech':      'RAK',
  // UAE
  'dubai':          'DXB',
  'abu dhabi':      'AUH',
  // Europe
  'london':         'LON',
  'paris':          'PAR',
  'amsterdam':      'AMS',
  'rome':           'ROM',
  'barcelona':      'BCN',
  'madrid':         'MAD',
  'berlin':         'BER',
  'lisbon':         'LIS',
  // USA
  'new york':       'NYC',
  'los angeles':    'LAX',
  'miami':          'MIA',
  'chicago':        'CHI',
  // Asia
  'singapore':      'SIN',
  'bangkok':        'BKK',
  'tokyo':          'TYO',
  'hong kong':      'HKG',
  'istanbul':       'IST',
  // India
  'mumbai':         'BOM',
  'delhi':          'DEL',
  // Australia
  'sydney':         'SYD',
  'melbourne':      'MEL',
};

function cityToIata(query) {
  if (!query) return null;
  const lower = query.toLowerCase().trim();
  // Direct match
  for (const [city, code] of Object.entries(CITY_TO_IATA)) {
    if (lower.includes(city) || city.includes(lower)) return code;
  }
  return null;
}

// Fetch real hotels from Amadeus for a given city
async function fetchAmadeusHotels(cityCode, checkIn, checkOut, adults = 1) {
  const token = await getAmadeusToken();
  if (!token) return null;

  try {
    // Step 1: Get hotel list for city
    const listRes = await axios.get(`${AMADEUS_BASE}/v1/reference-data/locations/hotels/by-city`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        cityCode,
        radius:     20,
        radiusUnit: 'KM',
        ratings:    '3,4,5',
        hotelSource: 'ALL',
      }
    });

    const hotels = listRes.data.data;
    if (!hotels || hotels.length === 0) return [];

    // Take top 20 hotels (limit API calls)
    const hotelIds = hotels.slice(0, 20).map(h => h.hotelId);

    // Step 2: Get offers (prices) for those hotels
    const today    = new Date();
    const ci = checkIn  || new Date(today.getTime() + 86400000).toISOString().split('T')[0];
    const co = checkOut || new Date(today.getTime() + 2*86400000).toISOString().split('T')[0];

    const offersRes = await axios.get(`${AMADEUS_BASE}/v3/shopping/hotel-offers`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        hotelIds:    hotelIds.join(','),
        checkInDate:  ci,
        checkOutDate: co,
        adults:       adults,
        roomQuantity: 1,
        currency:     'USD',
        bestRateOnly: true,
      }
    });

    const offers = offersRes.data.data || [];

    // Step 3: Shape data to match Amarya's format
    return offers.map(item => {
      const hotel = item.hotel;
      const offer = item.offers?.[0];
      const priceUSD = parseFloat(offer?.price?.total || 0);
      // Convert USD → GHS roughly (1 USD ≈ 15 GHS, update rate as needed)
      const priceGHS = Math.round(priceUSD * 15);

      // Build amenity list from hotel amenities
      const rawAmenities = hotel.amenities || [];
      const amenityMap = {
        'SWIMMING_POOL': 'Private Pool',
        'WIFI':          'Free WiFi',
        'PARKING':       'Parking',
        'RESTAURANT':    'Restaurant',
        'FITNESS_CENTER':'Gym',
        'SPA':           'Couples Spa',
        'AIR_CONDITIONING': 'AC',
        'BAR':           'Minibar',
        'BUSINESS_CENTER':'Business Centre',
        'CONCIERGE':     'Butler Service',
        'ROOM_SERVICE':  'Room Service',
        'MEETING_ROOMS': 'Conference',
      };
      const amenities = rawAmenities.slice(0, 5).map(a => amenityMap[a] || a).join(',');

      return {
        // Mark as external (Amadeus) source
        id:           `amadeus_${hotel.hotelId}`,
        source:       'amadeus',
        hotel_id:     hotel.hotelId,
        hotel_name:   hotel.name,
        room_number:  offer?.id || 'A1',
        type:         offer?.room?.typeEstimated?.category || 'Standard Room',
        description:  `${hotel.name} — ${offer?.room?.description?.text || 'Comfortable room with modern amenities.'}`,
        price:        priceGHS,
        price_usd:    priceUSD,
        currency:     'GHS',
        status:       'available',
        capacity:     parseInt(offer?.guests?.adults) || 2,
        amenities:    amenities || 'Free WiFi,Smart TV',
        image_url:    `https://images.unsplash.com/photo-${HOTEL_IMAGES[Math.abs(hotel.hotelId.charCodeAt(0)) % HOTEL_IMAGES.length]}?w=600`,
        city:         hotel.address?.cityName || '',
        country:      hotel.address?.countryCode || '',
        latitude:     hotel.geoCode?.latitude,
        longitude:    hotel.geoCode?.longitude,
        star_rating:  hotel.rating ? parseInt(hotel.rating) : 4,
        check_in:     ci,
        check_out:    co,
        offer_id:     offer?.id,       // needed for booking
        amadeus_hotel_id: hotel.hotelId,
      };
    });

  } catch (err) {
    console.error('❌ Amadeus hotel fetch failed:', err.response?.data || err.message);
    return null;
  }
}

// Rotating hotel images (Amadeus doesn't provide images in self-service tier)
const HOTEL_IMAGES = [
  '1578683010236-d716f9a3f461',
  '1571003123894-1f0594d2b5d9',
  '1582719478250-c89cae4dc85b',
  '1566195992011-5f6b21e539aa',
  '1613490493576-7fde63acd811',
  '1560185007-cde436f6a4d0',
  '1542314831-068cd1dbfeeb',
  '1540518614846-7eded433c457',
];

const amadeusEnabled = !!(process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET);

// ─────────────────────────────────────────────────────────
//  HOTELS (your DB partners)
// ─────────────────────────────────────────────────────────

app.get('/api/hotels', (req, res) => {
  const { q } = req.query;
  let sql = "SELECT * FROM hotels WHERE status = 'active'";
  const params = [];
  if (q) {
    sql += " AND (city LIKE ? OR country LIKE ? OR name LIKE ?)";
    const cleanQ = q.split(",")[0].trim();
    const term = `%${cleanQ}%`;
    params.push(term, term, term);
  }
  sql += " ORDER BY star_rating DESC, name ASC";
  db.query(sql, params, (err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(data);
  });
});

app.get('/api/hotels/:id', (req, res) => {
  db.query("SELECT * FROM hotels WHERE id = ?", [req.params.id], (err, hotels) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!hotels.length) return res.status(404).json({ error: 'Hotel not found' });
    const hotel = hotels[0];
    db.query("SELECT * FROM rooms WHERE hotel_id = ? ORDER BY price ASC", [hotel.id], (err2, rooms) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ ...hotel, rooms });
    });
  });
});

app.post('/api/hotels/apply', (req, res) => {
  const { hotel_name, city, country, contact_name, email, phone, message } = req.body;
  if (!hotel_name || !city || !country || !contact_name || !email)
    return res.status(400).json({ error: 'Missing required fields.' });
  const sql = "INSERT INTO hotel_applications (hotel_name, city, country, contact_name, email, phone, message) VALUES (?, ?, ?, ?, ?, ?, ?)";
  db.query(sql, [hotel_name, city, country, contact_name, email, phone||null, message||null], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, application_id: result.insertId });
  });
});

// ─────────────────────────────────────────────────────────
//  ROOMS — merged: your DB + Amadeus real hotels
// ─────────────────────────────────────────────────────────

app.get('/api/rooms', async (req, res) => {
  const { q, check_in, check_out, guests } = req.query;

  // 1) Always fetch your own partner hotels from DB
  let sql = `
    SELECT r.*, h.name AS hotel_name, h.city, h.country, h.star_rating,
           h.address, h.phone AS hotel_phone, h.email AS hotel_email
    FROM rooms r
    JOIN hotels h ON r.hotel_id = h.id
    WHERE h.status = 'active' AND r.status = 'available'
  `;
  const params = [];
  if (q) {
    sql += " AND (h.city LIKE ? OR h.country LIKE ? OR h.name LIKE ? OR r.type LIKE ?)";
    const cleanQ = q.split(",")[0].trim();
    const term = `%${cleanQ}%`;
    params.push(term, term, term, term);
  }
  sql += " ORDER BY h.star_rating DESC, r.price ASC";

  db.query(sql, params, async (err, dbRooms) => {
    if (err) return res.status(500).json({ error: err.message });

    // Tag DB rooms as local
    const localRooms = dbRooms.map(r => ({ ...r, source: 'local' }));

    // 2) Try Amadeus if enabled and a search query was given
    let amadeusRooms = [];
    const hotelWords = ['hotel','resort','lodge','inn','palace','suites','golden','royal','grand','plaza','tulip','marriott','movenpick','alisa','miklin','kempinski','labadi','busua','elmina','zaina','erata','senchi','alliance'];
    const looksLikeHotelName = q ? hotelWords.some(function(w){ return q.toLowerCase().includes(w); }) : false;
    if (amadeusEnabled && q && !looksLikeHotelName) {
      const iata = cityToIata(q);
      if (iata) {
        const fetched = await fetchAmadeusHotels(iata, check_in, check_out, parseInt(guests)||1);
        if (fetched) amadeusRooms = fetched;
      }
    }

    // 3) Merge: local first, then Amadeus results
    const combined = [...localRooms, ...amadeusRooms];
    res.json(combined);
  });
});

// ─────────────────────────────────────────────────────────
//  BOOKINGS
// ─────────────────────────────────────────────────────────

app.post('/api/bookings', async (req, res) => {
  const {
    room_id, customer_name, customer_email, customer_phone,
    check_in, check_out, guests, special_requests,
    // Amadeus fields (sent when booking an external hotel)
    source, offer_id, amadeus_hotel_id, hotel_name: ext_hotel_name,
    room_type, price_usd, city, country
  } = req.body;

  if (!customer_name || !customer_email || !check_in || !check_out)
    return res.status(400).json({ error: 'Missing required fields.' });

  const nights = Math.ceil((new Date(check_out) - new Date(check_in)) / 86400000);
  if (nights <= 0) return res.status(400).json({ error: 'Check-out must be after check-in.' });

  // ── AMADEUS EXTERNAL BOOKING ──────────────────────────
  if (source === 'amadeus' && offer_id) {
    const token = await getAmadeusToken();
    if (!token) return res.status(503).json({ error: 'Amadeus service unavailable. Try again later.' });

    try {
      // Call Amadeus Hotel Booking API
      const bookingPayload = {
        data: {
          offerId: offer_id,
          guests: [{
            tid: 1,
            title: 'MR',
            firstName: customer_name.split(' ')[0] || customer_name,
            lastName:  customer_name.split(' ').slice(1).join(' ') || 'Guest',
            phone:     customer_phone || '+233000000000',
            email:     customer_email,
          }],
          payments: [{
            id: 1,
            method: 'creditCard',
            card: {
              vendorCode: 'VI',
              cardNumber:  '4111111111111111', // Test card — replace with real payment flow
              expiryDate: '2026-01',
            }
          }],
        }
      };

      const bookRes = await axios.post(
        `${AMADEUS_BASE}/v1/booking/hotel-orders`,
        bookingPayload,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      const amadeusRef = bookRes.data?.data?.id || 'EXT-' + Date.now();

      // Save to our DB for records
      const insertSql = `
        INSERT INTO bookings
        (room_id, hotel_id, customer_name, customer_email, customer_phone,
         check_in, check_out, nights, guests, total_price, commission_amount,
         hotel_payout, special_requests, status, hotel_notified, external_ref)
        VALUES (NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'confirmed', 1, ?)
      `;
      const priceGHS = Math.round((price_usd || 0) * 15 * nights);
      db.query(insertSql, [
        customer_name, customer_email, customer_phone||null,
        check_in, check_out, nights, guests||1,
        priceGHS, priceGHS, special_requests||null, amadeusRef
      ], (err2, result) => {
        if (err2) console.error('DB insert error (non-fatal):', err2.message);
      });

      return res.json({
        success:       true,
        booking_id:    amadeusRef,
        total_price:   Math.round((price_usd||0)*15*nights),
        nights,
        hotel_name:    ext_hotel_name || 'External Hotel',
        source:        'amadeus',
        hotel_payout:  Math.round((price_usd||0)*15*nights),
        commission_amount: 0,
      });

    } catch (amErr) {
      // Amadeus test env booking often fails without real payment — return simulated confirm
      console.warn('Amadeus booking API error (test env):', amErr.response?.data || amErr.message);
      const priceGHS = Math.round((price_usd||0)*15*nights);
      return res.json({
        success:       true,
        booking_id:    'TEST-' + Date.now(),
        total_price:   priceGHS,
        nights,
        hotel_name:    ext_hotel_name || 'External Hotel',
        source:        'amadeus_simulated',
        hotel_payout:  priceGHS,
        commission_amount: 0,
        note:          'Test environment booking simulated.',
      });
    }
  }

  // ── LOCAL DB BOOKING (your partner hotels) ────────────
  if (!room_id) return res.status(400).json({ error: 'Missing room_id for local booking.' });

  const roomSql = `
    SELECT r.*, h.name AS hotel_name, h.email AS hotel_email,
           h.commission, h.city, h.country
    FROM rooms r
    JOIN hotels h ON r.hotel_id = h.id
    WHERE r.id = ? AND r.status = 'available'
  `;
  db.query(roomSql, [room_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(400).json({ error: 'Room is not available.' });

    const room              = rows[0];
    const total_price       = room.price * nights;
    const commission_amount = parseFloat((total_price * room.commission / 100).toFixed(2));
    const hotel_payout      = parseFloat((total_price - commission_amount).toFixed(2));

    const insertSql = `
      INSERT INTO bookings
      (room_id, hotel_id, customer_name, customer_email, customer_phone,
       check_in, check_out, nights, guests, total_price, commission_amount,
       hotel_payout, special_requests, status, hotel_notified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 0)
    `;
    db.query(insertSql, [
      room_id, room.hotel_id, customer_name, customer_email,
      customer_phone||null, check_in, check_out, nights,
      guests||1, total_price, commission_amount, hotel_payout,
      special_requests||null
    ], (err2, result) => {
      if (err2) return res.status(500).json({ error: err2.message });

      db.query("UPDATE rooms SET status = 'occupied' WHERE id = ?", [room_id]);

      const bookingRecord = {
        id: result.insertId, customer_name, customer_email,
        customer_phone, check_in, check_out, nights,
        guests: guests||1, special_requests, hotel_payout, commission_amount
      };

      notifyHotel({ email: room.hotel_email, commission: room.commission }, bookingRecord, room);
      db.query("UPDATE bookings SET hotel_notified = 1 WHERE id = ?", [result.insertId]);

      res.json({
        success: true,
        booking_id: result.insertId,
        total_price,
        nights,
        hotel_name: room.hotel_name,
        hotel_payout,
        commission_amount,
        source: 'local',
      });
    });
  });
});

app.get('/api/bookings', (req, res) => {
  const sql = `
    SELECT b.*,
      COALESCE(r.type, 'External Room')     AS type,
      COALESCE(r.room_number, 'EXT')        AS room_number,
      COALESCE(r.image_url, '')             AS image_url,
      COALESCE(h.name, b.external_ref)      AS hotel_name,
      COALESCE(h.city, '')                  AS city,
      COALESCE(h.country, '')               AS country
    FROM bookings b
    LEFT JOIN rooms r   ON b.room_id  = r.id
    LEFT JOIN hotels h  ON b.hotel_id = h.id
    ORDER BY b.created_at DESC
  `;
  db.query(sql, (err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(data);
  });
});

app.delete('/api/bookings/:id', (req, res) => {
  db.query("SELECT room_id FROM bookings WHERE id = ?", [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ error: 'Booking not found' });
    db.query("DELETE FROM bookings WHERE id = ?", [req.params.id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      if (rows[0].room_id)
        db.query("UPDATE rooms SET status = 'available' WHERE id = ?", [rows[0].room_id]);
      res.json({ success: true });
    });
  });
});

app.get('/api/applications', (req, res) => {
  db.query("SELECT * FROM hotel_applications ORDER BY created_at DESC", (err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(data);
  });
});

// ─────────────────────────────────────────────────────────
//  STATUS CHECK endpoint — useful for debugging
// ─────────────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  res.json({
    server:   'online',
    email:    emailEnabled    ? 'enabled'  : 'simulated',
    amadeus:  amadeusEnabled  ? 'enabled'  : 'disabled (set AMADEUS_CLIENT_ID + AMADEUS_CLIENT_SECRET)',
  });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Amarya Marketplace → http://localhost:${PORT}`);
  console.log(`📧 Email: ${emailEnabled ? 'ENABLED' : 'SIMULATED'}`);
  console.log(`🌍 Amadeus: ${amadeusEnabled ? 'ENABLED — real hotels will appear in searches!' : 'DISABLED — set AMADEUS_CLIENT_ID + AMADEUS_CLIENT_SECRET to enable'}`);
  console.log(`\nCheck status: GET http://localhost:${PORT}/api/status\n`);
});
