
const db = require('../config/db');

// Valid coach types by train category
const LOCAL_TRAIN_TYPES = ['LOCAL', 'DEMU', 'PASSENGER', 'ORDINARY', 'SUBURBAN', 'EMU'];
const SHATABDI_TYPES    = ['SHATABDI', 'JAN SHATABDI', 'VANDE BHARAT'];

exports.getTickets = async (req, res) => {
  const result = await db.query('SELECT * FROM tickets ORDER BY id DESC');
  res.json(result.rows);
};

exports.addTicket = async (req, res) => {
  const { train_no, source, destination, passenger_count, coach_type, ticket_category } = req.body;

  try {
    // Look up the train type to enforce coach/category constraints
    let resolvedCoach    = coach_type;
    let resolvedCategory = ticket_category;

    if (train_no) {
      const trainRes = await db.query(
        'SELECT train_type FROM train_details WHERE train_no = $1',
        [train_no]
      );

      if (trainRes.rows.length > 0) {
        const rawType = (trainRes.rows[0].train_type || '').toUpperCase().trim();

        if (LOCAL_TRAIN_TYPES.includes(rawType)) {
          // Local/DEMU/Passenger: force 2S + Regular regardless of what was passed
          resolvedCoach    = 'Second Class (2S)';
          resolvedCategory = 'Regular';
        } else if (SHATABDI_TYPES.includes(rawType)) {
          // Shatabdi / Vande Bharat: no Sleeper — allow only CC/EC/1A
          const allowedCC = ['Chair Car (CC)', 'Executive Chair Car (EC)', 'First AC (1A)'];
          if (!allowedCC.includes(resolvedCoach)) {
            resolvedCoach = 'Chair Car (CC)';
          }
        }
        // All other types: accept whatever coach/category was sent (defaults applied below)
      }
    }

    // Safe defaults for express/ other trains if nothing passed
    if (!resolvedCoach)    resolvedCoach    = 'Sleeper (SL)';
    if (!resolvedCategory) resolvedCategory = 'Regular';

    const result = await db.query(
      `INSERT INTO tickets(train_no, source, destination, passenger_count, coach_type, ticket_category)
       VALUES($1, $2, $3, $4, $5, $6) RETURNING *`,
      [train_no, source, destination, passenger_count, resolvedCoach, resolvedCategory]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('addTicket error:', err.message);
    res.status(500).json({ message: 'Server error while adding ticket' });
  }
};
