const express    = require('express');
const mysql      = require('mysql2');
const cors       = require('cors');
const nodemailer = require('nodemailer');
const axios      = require('axios');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'amarya_secret_2026';

// ─────────────────────────────────────────────────────────
//  DATABASE
// ─────────────────────────────────────────────────────────
const db = mysql.createConnection({
  host:     process.env.MYSQLHOST     || process.env.DB_HOST     || '127.0.0.1',
  port:     process.env.MYSQLPORT     || process.env.DB_PORT     || 3306,
  user:     process.env.MYSQLUSER     || process.env.DB_USER     || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME     || 'amarya_db',
});

db.connect((err) => {
  if (err) { console.error('❌ DB failed:', err.message); return; }
  console.log('✅ Connected to MySQL database');
});

// ─────────────────────────────────────────────────────────
//  EMAIL
// ─────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: { user: process.env.EMAIL_USER || '', pass: process.env.EMAIL_PASS || '' }
});
const emailEnabled = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);

async function sendEmail(to, subject, html) {
  if (!emailEnabled) { console.log(`📧 [SIM] To: ${to} | ${subject}`); return; }
  try {
    await transporter.sendMail({ from: `"Amarya" <${process.env.EMAIL_USER}>`, to, subject, html });
    console.log(`✅ Email sent to ${to}`);
  } catch (e) { console.error('Email failed:', e.message); }
}

async function notifyHotel(hotel, booking, room) {
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;"><div style="background:#0a0e17;padding:30px;text-align:center;"><h1 style="color:#c4a050;letter-spacing:4px;margin:0;">AMARYA</h1></div><div style="background:#f9f9f9;padding:30px;"><h2>New Booking Received</h2><table style="width:100%;border-collapse:collapse;">${[['Booking ID','#'+booking.id],['Guest',booking.customer_name],['Email',booking.customer_email],['Phone',booking.customer_phone||'N/A'],['Room',room.type+' — Room '+room.room_number],['Check In',booking.check_in],['Check Out',booking.check_out],['Nights',booking.nights],['Guests',booking.guests],['Special Requests',booking.special_requests||'None']].map(([l,v],i)=>'<tr style="background:'+(i%2?'#fff':'transparent')+'"><td style="padding:8px;color:#666;">'+l+'</td><td style="padding:8px;font-weight:bold;">'+v+'</td></tr>').join('')}<tr style="background:#c4a050;"><td style="padding:10px;color:#000;font-weight:bold;">Payout</td><td style="padding:10px;color:#000;font-weight:bold;">GHS '+Number(booking.hotel_payout).toLocaleString()+'</td></tr></table></div></div>`;
  await sendEmail(hotel.email, 'New Booking #'+booking.id+' — '+room.type, html);
  await sendEmail(process.env.EMAIL_USER, '[ADMIN] Booking #'+booking.id+' — '+room.hotel_name, html);
}

// ─────────────────────────────────────────────────────────
//  SMS — Arkesel (Ghana SMS API)
//  Sign up free: https://arkesel.com
//  Set env: ARKESEL_API_KEY
// ─────────────────────────────────────────────────────────
async function sendSMS(phone, message) {
  const apiKey = process.env.ARKESEL_API_KEY;
  if (!apiKey) {
    console.log(`📱 [SMS SIM] To: ${phone} | ${message}`);
    return;
  }
  // Format phone: ensure it starts with 233 (Ghana code)
  let formatted = phone.replace(/\D/g, '');
  if (formatted.startsWith('0')) formatted = '233' + formatted.slice(1);
  if (!formatted.startsWith('233')) formatted = '233' + formatted;

  try {
    await axios.get('https://sms.arkesel.com/sms/api', {
      params: {
        action:   'send-sms',
        api_key:  apiKey,
        to:       formatted,
        from:     'AMARYA',
        sms:      message,
      }
    });
    console.log(`✅ SMS sent to ${formatted}`);
  } catch (e) {
    console.error('SMS failed:', e.response?.data || e.message);
  }
}

// ─────────────────────────────────────────────────────────
//  AMADEUS
// ─────────────────────────────────────────────────────────
const AMADEUS_BASE = 'https://test.api.amadeus.com';
let amadeusToken = null;
let amadeusTokenExpiry = 0;

async function getAmadeusToken() {
  if (amadeusToken && Date.now() < amadeusTokenExpiry) return amadeusToken;
  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  try {
    const res = await axios.post(
      `${AMADEUS_BASE}/v1/security/oauth2/token`,
      new URLSearchParams({ grant_type:'client_credentials', client_id:clientId, client_secret:clientSecret }),
      { headers: { 'Content-Type':'application/x-www-form-urlencoded' } }
    );
    amadeusToken = res.data.access_token;
    amadeusTokenExpiry = Date.now() + (res.data.expires_in - 60) * 1000;
    console.log('✅ Amadeus token refreshed');
    return amadeusToken;
  } catch (e) {
    console.error('❌ Amadeus auth failed:', e.response?.data || e.message);
    return null;
  }
}

const CITY_TO_IATA = {
  'accra':'ACC','kumasi':'KMS','takoradi':'TKD','tamale':'TML',
  'lagos':'LOS','abuja':'ABV','kano':'KAN','port harcourt':'PHC',
  'nairobi':'NBO','mombasa':'MBA','cape town':'CPT','johannesburg':'JNB',
  'durban':'DUR','cairo':'CAI','addis ababa':'ADD','dar es salaam':'DAR',
  'zanzibar':'ZNZ','kigali':'KGL','abidjan':'ABJ','dakar':'DKR',
  'casablanca':'CMN','marrakech':'RAK','dubai':'DXB','abu dhabi':'AUH',
  'london':'LON','paris':'PAR','amsterdam':'AMS','rome':'ROM',
  'barcelona':'BCN','madrid':'MAD','berlin':'BER','lisbon':'LIS',
  'new york':'NYC','los angeles':'LAX','miami':'MIA','chicago':'CHI',
  'singapore':'SIN','bangkok':'BKK','tokyo':'TYO','hong kong':'HKG',
  'istanbul':'IST','mumbai':'BOM','delhi':'DEL','sydney':'SYD','melbourne':'MEL',
};

function cityToIata(q) {
  if (!q) return null;
  const lower = q.toLowerCase().trim();
  for (const [city, code] of Object.entries(CITY_TO_IATA)) {
    if (lower.includes(city) || city.includes(lower)) return code;
  }
  return null;
}

const HOTEL_IMAGES = [
  '1578683010236-d716f9a3f461','1571003123894-1f0594d2b5d9','1582719478250-c89cae4dc85b',
  '1566195992011-5f6b21e539aa','1613490493576-7fde63acd811','1560185007-cde436f6a4d0',
  '1542314831-068cd1dbfeeb','1540518614846-7eded433c457',
];

async function fetchAmadeusHotels(cityCode, checkIn, checkOut, adults=1) {
  const token = await getAmadeusToken();
  if (!token) return null;
  try {
    const listRes = await axios.get(`${AMADEUS_BASE}/v1/reference-data/locations/hotels/by-city`, {
      headers: { Authorization:`Bearer ${token}` },
      params: { cityCode, radius:20, radiusUnit:'KM', ratings:'3,4,5', hotelSource:'ALL' }
    });
    const hotels = listRes.data.data;
    if (!hotels || hotels.length === 0) return [];
    const hotelIds = hotels.slice(0,20).map(h => h.hotelId);
    const today = new Date();
    const ci = checkIn  || new Date(today.getTime()+86400000).toISOString().split('T')[0];
    const co = checkOut || new Date(today.getTime()+2*86400000).toISOString().split('T')[0];
    const offersRes = await axios.get(`${AMADEUS_BASE}/v3/shopping/hotel-offers`, {
      headers: { Authorization:`Bearer ${token}` },
      params: { hotelIds:hotelIds.join(','), checkInDate:ci, checkOutDate:co, adults, roomQuantity:1, currency:'USD', bestRateOnly:true }
    });
    const offers = offersRes.data.data || [];
    return offers.map(item => {
      const hotel = item.hotel;
      const offer = item.offers?.[0];
      const priceUSD = parseFloat(offer?.price?.total || 0);
      const priceGHS = Math.round(priceUSD * 15);
      const rawAmenities = hotel.amenities || [];
      const amenityMap = { 'SWIMMING_POOL':'Private Pool','WIFI':'Free WiFi','PARKING':'Parking','RESTAURANT':'Restaurant','FITNESS_CENTER':'Gym','SPA':'Couples Spa','AIR_CONDITIONING':'AC','BAR':'Minibar','ROOM_SERVICE':'Room Service' };
      const amenities = rawAmenities.slice(0,5).map(a => amenityMap[a]||a).join(',');
      return {
        id:`amadeus_${hotel.hotelId}`, source:'amadeus', hotel_id:hotel.hotelId,
        hotel_name:hotel.name, room_number:offer?.id||'A1',
        type:offer?.room?.typeEstimated?.category||'Standard Room',
        description:`${hotel.name} — ${offer?.room?.description?.text||'Comfortable room.'}`,
        price:priceGHS, price_usd:priceUSD, currency:'GHS', status:'available',
        capacity:parseInt(offer?.guests?.adults)||2, amenities:amenities||'Free WiFi,Smart TV',
        image_url:`https://images.unsplash.com/photo-${HOTEL_IMAGES[Math.abs(hotel.hotelId.charCodeAt(0))%HOTEL_IMAGES.length]}?w=600`,
        city:hotel.address?.cityName||'', country:hotel.address?.countryCode||'',
        latitude:hotel.geoCode?.latitude, longitude:hotel.geoCode?.longitude,
        star_rating:hotel.rating?parseInt(hotel.rating):4,
        check_in:ci, check_out:co, offer_id:offer?.id, amadeus_hotel_id:hotel.hotelId,
      };
    });
  } catch (e) {
    console.error('❌ Amadeus fetch failed:', e.response?.data||e.message);
    return null;
  }
}

const amadeusEnabled = !!(process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET);

// ─────────────────────────────────────────────────────────
//  AUTH MIDDLEWARE
// ─────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try { req.user = jwt.verify(token, JWT_SECRET); } catch {}
  }
  next();
}

// ─────────────────────────────────────────────────────────
//  USER ACCOUNTS
// ─────────────────────────────────────────────────────────

// Register
app.post('/api/auth/register', async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Name, email and password are required.' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  db.query('SELECT id FROM users WHERE email = ?', [email], async (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows.length) return res.status(400).json({ error: 'Email already registered.' });

    const password_hash = await bcrypt.hash(password, 10);
    db.query(
      'INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)',
      [name, email, phone||null, password_hash],
      (err2, result) => {
        if (err2) return res.status(500).json({ error: err2.message });
        const token = jwt.sign({ id:result.insertId, name, email }, JWT_SECRET, { expiresIn:'30d' });

        // Welcome SMS
        if (phone) sendSMS(phone, `Welcome to Amarya, ${name}! Your account is ready. Discover & book luxury hotels across Africa. - Amarya`);

        res.json({ success:true, token, user:{ id:result.insertId, name, email, phone } });
      }
    );
  });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(401).json({ error: 'Invalid email or password.' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password.' });

    const token = jwt.sign({ id:user.id, name:user.name, email:user.email }, JWT_SECRET, { expiresIn:'30d' });
    res.json({ success:true, token, user:{ id:user.id, name:user.name, email:user.email, phone:user.phone } });
  });
});

// Get current user profile
app.get('/api/auth/me', authMiddleware, (req, res) => {
  db.query('SELECT id, name, email, phone, created_at FROM users WHERE id = ?', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  });
});

// Update profile
app.put('/api/auth/me', authMiddleware, async (req, res) => {
  const { name, phone, password } = req.body;
  let sql = 'UPDATE users SET name=?, phone=? WHERE id=?';
  let params = [name, phone||null, req.user.id];
  if (password && password.length >= 6) {
    const hash = await bcrypt.hash(password, 10);
    sql = 'UPDATE users SET name=?, phone=?, password_hash=? WHERE id=?';
    params = [name, phone||null, hash, req.user.id];
  }
  db.query(sql, params, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// User's booking history
app.get('/api/auth/bookings', authMiddleware, (req, res) => {
  const sql = `
    SELECT b.*,
      COALESCE(r.type,'External Room') AS type,
      COALESCE(r.room_number,'EXT')    AS room_number,
      COALESCE(r.image_url,'')         AS image_url,
      COALESCE(h.name, b.external_ref) AS hotel_name,
      COALESCE(h.city,'')              AS city,
      COALESCE(h.country,'')           AS country
    FROM bookings b
    LEFT JOIN rooms r  ON b.room_id  = r.id
    LEFT JOIN hotels h ON b.hotel_id = h.id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
  `;
  db.query(sql, [req.user.id], (err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(data);
  });
});

// ─────────────────────────────────────────────────────────
//  HOTELS
// ─────────────────────────────────────────────────────────

app.get('/api/hotels', (req, res) => {
  const { q } = req.query;
  let sql = `
    SELECT h.*,
      COALESCE(AVG(rv.rating), 0) AS avg_rating,
      COUNT(rv.id) AS review_count
    FROM hotels h
    LEFT JOIN reviews rv ON rv.hotel_id = h.id
    WHERE h.status = 'active'
  `;
  const params = [];
  if (q) {
    sql += " AND (h.city LIKE ? OR h.country LIKE ? OR h.name LIKE ?)";
    const term = `%${q}%`;
    params.push(term, term, term);
  }
  sql += " GROUP BY h.id ORDER BY avg_rating DESC, h.star_rating DESC";
  db.query(sql, params, (err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(data);
  });
});

app.get('/api/hotels/:id', (req, res) => {
  db.query('SELECT * FROM hotels WHERE id = ?', [req.params.id], (err, hotels) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!hotels.length) return res.status(404).json({ error: 'Hotel not found' });
    const hotel = hotels[0];
    db.query('SELECT * FROM rooms WHERE hotel_id = ? ORDER BY price ASC', [hotel.id], (err2, rooms) => {
      if (err2) return res.status(500).json({ error: err2.message });
      db.query(
        'SELECT * FROM reviews WHERE hotel_id = ? ORDER BY created_at DESC LIMIT 20',
        [hotel.id],
        (err3, reviews) => {
          if (err3) return res.status(500).json({ error: err3.message });
          res.json({ ...hotel, rooms, reviews });
        }
      );
    });
  });
});

app.post('/api/hotels/apply', (req, res) => {
  const { hotel_name, city, country, contact_name, email, phone, message } = req.body;
  if (!hotel_name || !city || !country || !contact_name || !email)
    return res.status(400).json({ error: 'Missing required fields.' });
  db.query(
    'INSERT INTO hotel_applications (hotel_name,city,country,contact_name,email,phone,message) VALUES (?,?,?,?,?,?,?)',
    [hotel_name, city, country, contact_name, email, phone||null, message||null],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success:true, application_id:result.insertId });
    }
  );
});

// ─────────────────────────────────────────────────────────
//  REVIEWS & RATINGS
// ─────────────────────────────────────────────────────────

// Get reviews for a hotel
app.get('/api/hotels/:id/reviews', (req, res) => {
  db.query(
    'SELECT * FROM reviews WHERE hotel_id = ? ORDER BY created_at DESC',
    [req.params.id],
    (err, data) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(data);
    }
  );
});

// Post a review (optionally authenticated)
app.post('/api/hotels/:id/reviews', optionalAuth, (req, res) => {
  const { guest_name, rating, comment, stay_date } = req.body;
  const hotel_id = req.params.id;
  const user_id = req.user?.id || null;

  if (!guest_name || !rating)
    return res.status(400).json({ error: 'Name and rating are required.' });
  if (rating < 1 || rating > 5)
    return res.status(400).json({ error: 'Rating must be between 1 and 5.' });

  db.query(
    'INSERT INTO reviews (hotel_id, user_id, guest_name, rating, comment, stay_date) VALUES (?,?,?,?,?,?)',
    [hotel_id, user_id, guest_name, rating, comment||null, stay_date||null],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success:true, review_id:result.insertId });
    }
  );
});

// Get overall rating stats for a hotel
app.get('/api/hotels/:id/rating', (req, res) => {
  db.query(
    `SELECT
       COUNT(*) AS total,
       ROUND(AVG(rating),1) AS average,
       SUM(rating=5) AS five_star,
       SUM(rating=4) AS four_star,
       SUM(rating=3) AS three_star,
       SUM(rating=2) AS two_star,
       SUM(rating=1) AS one_star
     FROM reviews WHERE hotel_id = ?`,
    [req.params.id],
    (err, data) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(data[0]);
    }
  );
});

// ─────────────────────────────────────────────────────────
//  ROOMS — merged DB + Amadeus
// ─────────────────────────────────────────────────────────

app.get('/api/rooms', async (req, res) => {
  const { q, check_in, check_out, guests } = req.query;

  let sql = `
    SELECT r.*, h.name AS hotel_name, h.city, h.country, h.star_rating,
           h.address, h.phone AS hotel_phone, h.email AS hotel_email,
           h.latitude, h.longitude,
           COALESCE(AVG(rv.rating),0) AS avg_rating,
           COUNT(rv.id) AS review_count
    FROM rooms r
    JOIN hotels h ON r.hotel_id = h.id
    LEFT JOIN reviews rv ON rv.hotel_id = h.id
    WHERE h.status = 'active' AND r.status = 'available'
  `;
  const params = [];
  if (q) {
    sql += " AND (h.city LIKE ? OR h.country LIKE ? OR h.name LIKE ? OR r.type LIKE ?)";
    const cleanQ = q.split(',')[0].trim();
    const term = `%${cleanQ}%`;
    params.push(term, term, term, term);
  }
  sql += " GROUP BY r.id ORDER BY h.star_rating DESC, r.price ASC";

  db.query(sql, params, async (err, dbRooms) => {
    if (err) return res.status(500).json({ error: err.message });

    const localRooms = dbRooms.map(r => ({ ...r, source:'local' }));

    let amadeusRooms = [];
    const hotelWords = ['hotel','resort','lodge','inn','palace','suites','golden','royal','grand','plaza','tulip','marriott','movenpick','alisa','miklin','kempinski','labadi','busua','elmina','zaina','erata','senchi','alliance','kingstel','raybow','lancaster','mensvic'];
    const looksLikeHotelName = q ? hotelWords.some(w => q.toLowerCase().includes(w)) : false;

    if (amadeusEnabled && q && !looksLikeHotelName) {
      const iata = cityToIata(q);
      if (iata) {
        console.log(`🌍 Amadeus: ${q} → ${iata}`);
        const fetched = await fetchAmadeusHotels(iata, check_in, check_out, parseInt(guests)||1);
        if (fetched) amadeusRooms = fetched;
        console.log(`✅ Amadeus: ${amadeusRooms.length} offers`);
      }
    }

    res.json([...localRooms, ...amadeusRooms]);
  });
});

// ─────────────────────────────────────────────────────────
//  MAP — hotels with coordinates for map view
// ─────────────────────────────────────────────────────────

app.get('/api/map/hotels', (req, res) => {
  const { q } = req.query;
  let sql = `
    SELECT h.id, h.name, h.city, h.country, h.star_rating, h.image_url,
           h.latitude, h.longitude, h.address,
           COALESCE(AVG(rv.rating),0) AS avg_rating,
           COUNT(rv.id) AS review_count,
           MIN(r.price) AS min_price
    FROM hotels h
    LEFT JOIN reviews rv ON rv.hotel_id = h.id
    LEFT JOIN rooms r ON r.hotel_id = h.id AND r.status = 'available'
    WHERE h.status = 'active' AND h.latitude IS NOT NULL
  `;
  const params = [];
  if (q) {
    sql += " AND (h.city LIKE ? OR h.country LIKE ? OR h.name LIKE ?)";
    const term = `%${q.split(',')[0].trim()}%`;
    params.push(term, term, term);
  }
  sql += " GROUP BY h.id ORDER BY avg_rating DESC";
  db.query(sql, params, (err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(data);
  });
});

// ─────────────────────────────────────────────────────────
//  BOOKINGS
// ─────────────────────────────────────────────────────────

app.post('/api/bookings', optionalAuth, async (req, res) => {
  const {
    room_id, customer_name, customer_email, customer_phone,
    check_in, check_out, guests, special_requests,
    source, offer_id, amadeus_hotel_id, hotel_name: ext_hotel_name,
    room_type, price_usd, city, country
  } = req.body;

  if (!customer_name || !customer_email || !check_in || !check_out)
    return res.status(400).json({ error: 'Missing required fields.' });

  const nights = Math.ceil((new Date(check_out) - new Date(check_in)) / 86400000);
  if (nights <= 0) return res.status(400).json({ error: 'Check-out must be after check-in.' });

  const user_id = req.user?.id || null;

  // ── AMADEUS BOOKING ─────────────────────────────────
  if (source === 'amadeus' && offer_id) {
    const priceGHS = Math.round((price_usd||0) * 15 * nights);
    db.query(
      `INSERT INTO bookings (room_id,hotel_id,user_id,customer_name,customer_email,customer_phone,check_in,check_out,nights,guests,total_price,commission_amount,hotel_payout,special_requests,status,hotel_notified,external_ref)
       VALUES (NULL,NULL,?,?,?,?,?,?,?,?,?,0,?,?,'confirmed',1,?)`,
      [user_id, customer_name, customer_email, customer_phone||null, check_in, check_out, nights, guests||1, priceGHS, priceGHS, special_requests||null, 'AMADEUS-'+Date.now()],
      (err2, result) => { if (err2) console.error('DB insert error:', err2.message); }
    );

    // SMS to guest
    if (customer_phone) {
      await sendSMS(customer_phone,
        `Hi ${customer_name}! Your booking at ${ext_hotel_name} is confirmed. Check-in: ${check_in}. Check-out: ${check_out}. Booking ref: AMADEUS-${Date.now()}. - Amarya`
      );
    }

    return res.json({
      success:true, booking_id:'AMADEUS-'+Date.now(),
      total_price:priceGHS, nights, hotel_name:ext_hotel_name||'External Hotel',
      source:'amadeus', hotel_payout:priceGHS, commission_amount:0
    });
  }

  // ── LOCAL BOOKING ────────────────────────────────────
  if (!room_id) return res.status(400).json({ error: 'Missing room_id.' });

  const roomSql = `
    SELECT r.*, h.name AS hotel_name, h.email AS hotel_email,
           h.commission, h.city, h.country, h.phone AS hotel_phone
    FROM rooms r JOIN hotels h ON r.hotel_id = h.id
    WHERE r.id = ? AND r.status = 'available'
  `;
  db.query(roomSql, [room_id], async (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(400).json({ error: 'Room not available.' });

    const room = rows[0];
    const total_price       = room.price * nights;
    const commission_amount = parseFloat((total_price * room.commission / 100).toFixed(2));
    const hotel_payout      = parseFloat((total_price - commission_amount).toFixed(2));

    db.query(
      `INSERT INTO bookings (room_id,hotel_id,user_id,customer_name,customer_email,customer_phone,check_in,check_out,nights,guests,total_price,commission_amount,hotel_payout,special_requests,status,hotel_notified)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'confirmed',0)`,
      [room_id, room.hotel_id, user_id, customer_name, customer_email, customer_phone||null, check_in, check_out, nights, guests||1, total_price, commission_amount, hotel_payout, special_requests||null],
      async (err2, result) => {
        if (err2) return res.status(500).json({ error: err2.message });

        db.query("UPDATE rooms SET status='occupied' WHERE id=?", [room_id]);

        const bookingRecord = { id:result.insertId, customer_name, customer_email, customer_phone, check_in, check_out, nights, guests:guests||1, special_requests, hotel_payout, commission_amount };

        // Email hotel
        // Send email in background - dont block the response
        notifyHotel({ email:room.hotel_email, commission:room.commission, hotel_name:room.hotel_name }, bookingRecord, room)
          .then(() => db.query("UPDATE bookings SET hotel_notified=1 WHERE id=?", [result.insertId]))
          .catch(e => console.error('Email error:', e.message));

        // SMS to guest
        if (customer_phone) {
          await sendSMS(customer_phone,
            `Hi ${customer_name}! Your booking at ${room.hotel_name} is confirmed. Room: ${room.type}. Check-in: ${check_in}. Check-out: ${check_out}. Total: GHS ${total_price.toLocaleString()}. Booking #${result.insertId}. - Amarya`
          );
        }

        // SMS to hotel (if hotel has a phone)
        if (room.hotel_phone) {
          await sendSMS(room.hotel_phone,
            `New Amarya booking! Guest: ${customer_name}. Room: ${room.type} #${room.room_number}. Check-in: ${check_in}. Check-out: ${check_out}. Your payout: GHS ${hotel_payout.toLocaleString()}.`
          );
        }

        res.json({
          success:true, booking_id:result.insertId,
          total_price, nights, hotel_name:room.hotel_name,
          hotel_payout, commission_amount, source:'local'
        });
      }
    );
  });
});

app.get('/api/bookings', (req, res) => {
  const sql = `
    SELECT b.*,
      COALESCE(r.type,'External Room') AS type,
      COALESCE(r.room_number,'EXT')    AS room_number,
      COALESCE(r.image_url,'')         AS image_url,
      COALESCE(h.name,b.external_ref)  AS hotel_name,
      COALESCE(h.city,'')              AS city,
      COALESCE(h.country,'')           AS country
    FROM bookings b
    LEFT JOIN rooms r  ON b.room_id  = r.id
    LEFT JOIN hotels h ON b.hotel_id = h.id
    ORDER BY b.created_at DESC
  `;
  db.query(sql, (err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(data);
  });
});

app.delete('/api/bookings/:id', (req, res) => {
  db.query('SELECT room_id FROM bookings WHERE id=?', [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ error: 'Booking not found' });
    db.query('DELETE FROM bookings WHERE id=?', [req.params.id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      if (rows[0].room_id)
        db.query("UPDATE rooms SET status='available' WHERE id=?", [rows[0].room_id]);
      res.json({ success:true });
    });
  });
});

app.get('/api/applications', (req, res) => {
  db.query('SELECT * FROM hotel_applications ORDER BY created_at DESC', (err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(data);
  });
});

// ─────────────────────────────────────────────────────────
//  STATUS
// ─────────────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  res.json({
    server:  'online',
    email:   emailEnabled   ? 'enabled'  : 'simulated',
    amadeus: amadeusEnabled ? 'enabled'  : 'disabled',
    sms:     process.env.ARKESEL_API_KEY ? 'enabled' : 'simulated',
  });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Amarya → http://localhost:${PORT}`);
  console.log(`📧 Email:   ${emailEnabled ? 'ENABLED' : 'SIMULATED'}`);
  console.log(`📱 SMS:     ${process.env.ARKESEL_API_KEY ? 'ENABLED' : 'SIMULATED — sign up at arkesel.com'}`);
  console.log(`🌍 Amadeus: ${amadeusEnabled ? 'ENABLED' : 'DISABLED'}\n`);
});