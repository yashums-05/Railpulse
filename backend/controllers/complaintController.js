const db = require('../config/db');

// Autocomplete suggestions for the complaint form entity_id field
exports.getSuggestions = async (req, res) => {
  try {
    const { entity_type, q = '' } = req.query;
    if (!q.trim()) return res.json([]);
    const searchParam = `%${q}%`;

    if (entity_type === 'Train') {
      const result = await db.query(
        `SELECT train_no, train_name FROM train_details
         WHERE train_no ILIKE $1 OR train_name ILIKE $1
         ORDER BY train_no LIMIT 10`,
        [searchParam]
      );
      return res.json(result.rows.map(r => ({
        value: r.train_no,
        label: r.train_no,
        sublabel: r.train_name
      })));
    }

    // Station — return station_code as the value (that's what entity_id needs)
    const result = await db.query(
      `SELECT station_code, station_name, city, state FROM stations
       WHERE station_code ILIKE $1 OR station_name ILIKE $1 OR city ILIKE $1 OR state ILIKE $1
       ORDER BY station_name LIMIT 10`,
      [searchParam]
    );
    return res.json(result.rows.map(r => ({
      value: r.station_code,
      label: r.station_code,
      sublabel: [r.station_name, r.city, r.state].filter(Boolean).join(' · ')
    })));
  } catch (err) {
    console.error('Complaint suggestions error:', err.message);
    res.status(500).json({ message: 'Error fetching suggestions' });
  }
};

const enrichComplaints = async (complaints) => {
  if (complaints.length === 0) return complaints;

  const stationIds = [...new Set(complaints.filter(c => c.entity_type === 'Station').map(c => c.entity_id))];
  const trainIds = [...new Set(complaints.filter(c => c.entity_type === 'Train').map(c => c.entity_id))];

  const stationsMap = {};
  if (stationIds.length > 0) {
    const stQuery = `SELECT station_code, station_name, city, state FROM stations WHERE station_code = ANY($1::varchar[])`;
    const stRes = await db.query(stQuery, [stationIds]);
    stRes.rows.forEach(r => {
      const loc = [r.city, r.state].filter(Boolean).join(', ');
      stationsMap[r.station_code] = loc ? `${r.station_name} (${r.station_code}) - ${loc}` : `${r.station_name} (${r.station_code})`;
    });
  }

  const trainsMap = {};
  if (trainIds.length > 0) {
    const trQuery = `SELECT train_no, train_name FROM train_details WHERE train_no = ANY($1::varchar[])`;
    const trRes = await db.query(trQuery, [trainIds]);
    trRes.rows.forEach(r => {
      trainsMap[r.train_no] = `${r.train_name} (${r.train_no})`;
    });
  }

  return complaints.map(c => ({
    ...c,
    entity_id: c.entity_type === 'Station' && stationsMap[c.entity_id] 
      ? stationsMap[c.entity_id] 
      : c.entity_type === 'Train' && trainsMap[c.entity_id]
      ? trainsMap[c.entity_id] 
      : c.entity_id
  }));
};

exports.getComplaints = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM complaints WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    const enriched = await enrichComplaints(result.rows);
    res.json(enriched);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.createComplaint = async (req, res) => {
  const { description, pnr_number, entity_type, entity_id } = req.body;
  
  try {
    // 0. Hard validation: Description and Image are mandatory
    if (!description || description.trim() === '') {
      return res.status(400).json({ message: 'Complaint description is strictly required.' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'A photo proof is strictly required.' });
    }

    // 1. Validate entity_id exists in the database
    if (entity_type === 'Station' && entity_id) {
      const stationCheck = await db.query('SELECT 1 FROM stations WHERE station_code = $1', [entity_id]);
      if (stationCheck.rows.length === 0) {
        return res.status(400).json({ message: `Station Code "${entity_id}" was not found. Please select a valid station from the search dropdown.` });
      }
    } else if (entity_type === 'Train' && entity_id) {
      const trainCheck = await db.query('SELECT 1 FROM train_details WHERE train_no = $1', [entity_id]);
      if (trainCheck.rows.length === 0) {
        return res.status(400).json({ message: `Train No "${entity_id}" was not found. Please select a valid train from the search dropdown.` });
      }
    }

    // 2. Handle image upload path
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    // 3. Insert into database
    const result = await db.query(
      `INSERT INTO complaints(user_id, description, pnr_number, entity_type, entity_id, image_url) 
       VALUES($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, description, pnr_number || null, entity_type || null, entity_id || null, imageUrl]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// For the Public Complaint Search Gallery
exports.getAllComplaints = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM complaints ORDER BY created_at DESC');
    const enriched = await enrichComplaints(result.rows);
    res.json(enriched);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// For AdminPanel (Station Masters & TTs)
exports.getStaffComplaints = async (req, res) => {
  try {
    const userRole = req.user.role;
    let query = '';
    
    if (userRole === 'Station Master' || userRole === 'Section Engineer') {
      query = "SELECT * FROM complaints WHERE entity_type = 'Station' ORDER BY created_at DESC";
    } else if (userRole === 'TT' || userRole === 'Loco Pilot' || userRole === 'Guard') {
      query = "SELECT * FROM complaints WHERE entity_type = 'Train' ORDER BY created_at DESC";
    } else if (userRole === 'Admin' || userRole === 'RPF Officer') {
      query = 'SELECT * FROM complaints ORDER BY created_at DESC';
    } else {
      return res.status(403).json({ message: 'Unauthorized role' });
    }

    const result = await db.query(query);
    const enriched = await enrichComplaints(result.rows);
    res.json(enriched);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// For Staff resolving a complaint
exports.resolveComplaint = async (req, res) => {
  const { id } = req.params;
  const { resolution_description } = req.body;
  
  try {
    if (!resolution_description || resolution_description.trim() === '') {
      return res.status(400).json({ message: 'Resolution description is strictly required.' });
    }
    
    // The user requested that the image upload is compulsory here too
    if (!req.file) {
       return res.status(400).json({ message: 'A resolution photo proof is strictly required.' });
    }

    let resolutionImageUrl = `/uploads/${req.file.filename}`;

    const result = await db.query(
      `UPDATE complaints 
       SET status = 'Resolved', resolution_description = $1, resolution_image_url = $2
       WHERE id = $3 RETURNING *`,
      [resolution_description, resolutionImageUrl, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
