const db = require('../config/db');

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Classify crowd level relative to the max in the result set.
 *   ≥ 66% of max  → Crowded
 *   ≥ 33% of max  → Moderate
 *   <  33% of max → Not Crowded
 */
function assignCrowdLevels(items) {
  if (!items || items.length === 0) return items;
  const maxPax = Math.max(...items.map(i => i.total_passengers));
  return items.map(item => {
    const ratio = maxPax > 0 ? item.total_passengers / maxPax : 0;
    const crowd_level =
      ratio >= 0.66 ? 'Crowded' :
        ratio >= 0.33 ? 'Moderate' :
          'Not Crowded';
    return { ...item, crowd_level };
  });
}

// ── Suggestions ───────────────────────────────────────────────────────────────

exports.getSuggestions = async (req, res) => {
  try {
    const { filterBy, q = '' } = req.query;
    if (!q.trim()) return res.json([]);
    const searchParam = `%${q}%`;

    if (filterBy === 'train') {
      const result = await db.query(
        `SELECT train_no, train_name
         FROM train_details
         WHERE train_no ILIKE $1 OR train_name ILIKE $1
         ORDER BY train_no `,
        [searchParam]
      );
      return res.json(result.rows.map(r => ({
        value: r.train_no, label: r.train_no, sublabel: r.train_name
      })));
    }

    const result = await db.query(
      `SELECT station_name, station_code, city
       FROM stations
       WHERE station_name ILIKE $1 OR station_code ILIKE $1 OR city ILIKE $1
       ORDER BY station_name`,
      [searchParam]
    );
    res.json(result.rows.map(r => ({
      value: r.station_name,
      label: r.station_name,
      sublabel: `${r.station_code}${r.city ? ' · ' + r.city : ''}`
    })));
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ message: 'Error fetching suggestions' });
  }
};

// ── Main crowd analysis ───────────────────────────────────────────────────────

exports.getStationCrowd = async (req, res) => {
  try {
    const {
      filterBy,
      searchQuery = '',
      coachType = 'All',
      sortBy = 'desc',
      startDate = '',
      endDate = '',
    } = req.query;

    const hasSearch = searchQuery.trim().length > 0;
    const searchParam = `%${searchQuery.trim()}%`;
    const hasCoach = coachType !== 'All';
    const hasDateRange = startDate.trim().length > 0 && endDate.trim().length > 0;

    // =========================================================================
    // TRAIN view
    // =========================================================================
    if (filterBy === 'train') {

      // ── With date range: use crowd_daily_train summary table, fallback to tickets ──
      if (hasDateRange) {
        const params = [startDate, endDate];
        const conds  = ['dt.booking_date >= $1::date', 'dt.booking_date <= $2::date'];
        if (hasCoach) { params.push(coachType); conds.push(`dt.coach_type = $${params.length}`); }
        const innerWhere = `WHERE ${conds.join(' AND ')}`;

        let searchCond = '';
        let searchParams = [...params];
        if (hasSearch) {
          searchParams.push(searchParam);
          searchCond = `AND (agg.train_no ILIKE $${searchParams.length} OR d.train_name ILIKE $${searchParams.length})`;
        }

        const orderBy = sortBy === 'asc'   ? 'ORDER BY total_passengers ASC'
                      : sortBy === 'alpha' ? 'ORDER BY d.train_name ASC, agg.train_no ASC'
                      :                     'ORDER BY total_passengers DESC';

        // Check if the summary table has data for this range
        const summaryCheck = await db.query(
          `SELECT 1 FROM crowd_daily_train WHERE booking_date >= $1::date AND booking_date <= $2::date LIMIT 1`,
          [startDate, endDate]
        );
        const useSummary = summaryCheck.rows.length > 0;

        let chartResult, totResult;

        if (useSummary) {
          // Fast path: pre-aggregated summary table
          const coachCond = hasCoach ? `AND coach_type = $3` : '';
          const selectField = hasCoach ? `total_passengers` : `SUM(total_passengers)`;
          const groupBy = hasCoach ? `` : `GROUP BY booking_date`;

          chartResult = await db.query(
            `SELECT agg.train_no,
                    d.train_name,
                    agg.total_passengers,
                    agg.coach_breakdown,
                    (
                      SELECT json_build_object('date', booking_date, 'count', pax)
                      FROM (
                        SELECT booking_date, ${selectField} AS pax
                        FROM crowd_daily_train
                        WHERE train_no = agg.train_no AND booking_date >= $1::date AND booking_date <= $2::date ${coachCond}
                        ${groupBy}
                      ) sub
                      ORDER BY pax DESC, booking_date ASC
                      LIMIT 1
                    ) AS busiest_day,
                    (
                      SELECT json_build_object('date', booking_date, 'count', pax)
                      FROM (
                        SELECT booking_date, ${selectField} AS pax
                        FROM crowd_daily_train
                        WHERE train_no = agg.train_no AND booking_date >= $1::date AND booking_date <= $2::date ${coachCond}
                        ${groupBy}
                      ) sub
                      ORDER BY pax ASC, booking_date ASC
                      LIMIT 1
                    ) AS quietest_day
             FROM (
               SELECT inner_agg.train_no,
                      SUM(inner_agg.coach_pax)                                  AS total_passengers,
                      json_object_agg(inner_agg.coach_type, inner_agg.coach_pax) AS coach_breakdown
               FROM (
                 SELECT dt.train_no,
                        dt.coach_type,
                        SUM(dt.total_passengers) AS coach_pax
                 FROM crowd_daily_train dt
                 ${innerWhere}
                 GROUP BY dt.train_no, dt.coach_type
               ) inner_agg
               GROUP BY inner_agg.train_no
             ) agg
             LEFT JOIN train_details d ON d.train_no = agg.train_no
             WHERE 1=1 ${searchCond}
             ${orderBy}
             LIMIT 30`,
            searchParams
          );

          totResult = await db.query(
            `SELECT COUNT(DISTINCT dt.train_no) AS total_count,
                    SUM(dt.total_passengers)    AS grand_total
             FROM crowd_daily_train dt
             ${innerWhere}`,
            params
          );
        } else {
          // Fallback: query tickets table directly (summary table not yet built)
          const coachCond = hasCoach ? `AND coach_type = $3` : '';
          const selectField = hasCoach ? `passenger_count` : `SUM(passenger_count)`;
          const groupBy = hasCoach ? `` : `GROUP BY booking_date::date`;

          chartResult = await db.query(
            `SELECT agg.train_no,
                    d.train_name,
                    agg.total_passengers,
                    agg.coach_breakdown,
                    (
                      SELECT json_build_object('date', b_date, 'count', pax)
                      FROM (
                        SELECT booking_date::date as b_date, ${selectField} AS pax
                        FROM tickets
                        WHERE train_no = agg.train_no AND booking_date::date >= $1::date AND booking_date::date <= $2::date ${coachCond}
                        ${groupBy}
                      ) sub
                      ORDER BY pax DESC, b_date ASC
                      LIMIT 1
                    ) AS busiest_day,
                    (
                      SELECT json_build_object('date', b_date, 'count', pax)
                      FROM (
                        SELECT booking_date::date as b_date, ${selectField} AS pax
                        FROM tickets
                        WHERE train_no = agg.train_no AND booking_date::date >= $1::date AND booking_date::date <= $2::date ${coachCond}
                        ${groupBy}
                      ) sub
                      ORDER BY pax ASC, b_date ASC
                      LIMIT 1
                    ) AS quietest_day
             FROM (
               SELECT inner_agg.train_no,
                      SUM(inner_agg.coach_pax)                             AS total_passengers,
                      json_object_agg(inner_agg.coach_type, inner_agg.coach_pax) AS coach_breakdown
               FROM (
                 SELECT t.train_no,
                        COALESCE(t.coach_type, 'Unknown') AS coach_type,
                        SUM(t.passenger_count)            AS coach_pax
                 FROM tickets t
                 ${ticketWhere}
                 GROUP BY t.train_no, COALESCE(t.coach_type, 'Unknown')
               ) inner_agg
               GROUP BY inner_agg.train_no
             ) agg
             LEFT JOIN train_details d ON d.train_no = agg.train_no
             WHERE 1=1 ${ticketSearchCond}
             ${orderBy}
             LIMIT 30`,
            ticketSearchParams
          );

          totResult = await db.query(
            `SELECT COUNT(DISTINCT t.train_no) AS total_count,
                    SUM(t.passenger_count)     AS grand_total
             FROM tickets t
             ${ticketWhere}`,
            ticketParams
          );
        }

        let items = chartResult.rows.map(r => ({
          label:            r.train_name ? `${r.train_name} (${r.train_no})` : r.train_no,
          total_passengers: parseInt(r.total_passengers) || 0,
          coach_breakdown:  r.coach_breakdown,
          busiest_day:      r.busiest_day,
          quietest_day:     r.quietest_day,
        }));
        items = assignCrowdLevels(items);

        const t = totResult.rows[0] || {};
        return res.json({
          items,
          date_range: { startDate, endDate },
          source: useSummary ? 'summary' : 'tickets',
          totals: {
            grand_total:    parseInt(t.grand_total || 0),
            total_count:    parseInt(t.total_count || items.length),
            max_passengers: items.length > 0 ? items[0].total_passengers : 0,
            min_passengers: items.length > 0 ? items[items.length - 1].total_passengers : 0,
          }
        });
      }

      // ── No date range: fast materialized view ─────────────────────────────
      const chartParams = [];
      const chartConds = [];

      if (hasSearch) {
        chartConds.push(`(m.train_no ILIKE $1 OR d.train_name ILIKE $1)`);
        chartParams.push(searchParam);
      }
      if (hasCoach) {
        chartParams.push(coachType);
        chartConds.push(`m.coach_type = $${chartParams.length}`);
      }

      const whereClause = chartConds.length > 0 ? `WHERE ${chartConds.join(' AND ')}` : '';

      const orderBy = sortBy === 'asc' ? 'ORDER BY total_passengers ASC'
        : sortBy === 'alpha' ? 'ORDER BY d.train_name ASC, m.train_no ASC'
          : 'ORDER BY total_passengers DESC';

      const coachParamIndex = chartParams.indexOf(coachType) + 1;
      const coachCond = hasCoach ? `AND coach_type = $${coachParamIndex}` : '';
      const selectField = hasCoach ? `total_passengers` : `SUM(total_passengers)`;
      const groupBy = hasCoach ? `` : `GROUP BY booking_date`;

      const chartResult = await db.query(
        `SELECT m.train_no AS code, d.train_name AS name,
                SUM(m.total_passengers) AS total_passengers,
                json_object_agg(m.coach_type, m.total_passengers) AS coach_breakdown,
                (
                  SELECT json_build_object('date', booking_date, 'count', pax)
                  FROM (
                    SELECT booking_date, ${selectField} AS pax
                    FROM crowd_daily_train
                    WHERE train_no = m.train_no ${coachCond}
                    ${groupBy}
                  ) sub
                  ORDER BY pax DESC, booking_date ASC
                  LIMIT 1
                ) AS busiest_day,
                (
                  SELECT json_build_object('date', booking_date, 'count', pax)
                  FROM (
                    SELECT booking_date, ${selectField} AS pax
                    FROM crowd_daily_train
                    WHERE train_no = m.train_no ${coachCond}
                    ${groupBy}
                  ) sub
                  ORDER BY pax ASC, booking_date ASC
                  LIMIT 1
                ) AS quietest_day
         FROM mv_train_coach_crowd m
         LEFT JOIN train_details d ON m.train_no = d.train_no
         ${whereClause}
         GROUP BY m.train_no, d.train_name
         ${orderBy}
         LIMIT 20`,
        chartParams
      );

      const totalsResult = await db.query(
        `SELECT SUM(m.total_passengers) AS grand_total,
                COUNT(DISTINCT m.train_no) AS total_count
         FROM mv_train_coach_crowd m
         LEFT JOIN train_details d ON m.train_no = d.train_no
         ${whereClause}`,
        chartParams
      );

      let items = chartResult.rows.map(r => ({
        label: r.name ? `${r.name} (${r.code})` : r.code,
        total_passengers: parseInt(r.total_passengers) || 0,
        coach_breakdown: r.coach_breakdown,
        busiest_day: r.busiest_day,
        quietest_day: r.quietest_day,
      }));
      items = assignCrowdLevels(items);

      const t = totalsResult.rows[0] || {};
      return res.json({
        items,
        date_range: null,
        totals: {
          grand_total: parseInt(t.grand_total || 0),
          total_count: parseInt(t.total_count || items.length),
          max_passengers: items.length > 0 ? items[0].total_passengers : 0,
          min_passengers: items.length > 0 ? items[items.length - 1].total_passengers : 0,
        }
      });
    }

    // =========================================================================
    // STATION view
    // =========================================================================

    const stationOrder = sortBy === 'asc' ? 'ORDER BY total_passengers ASC'
      : sortBy === 'alpha' ? 'ORDER BY station_code ASC'
        : 'ORDER BY total_passengers DESC';

    // ── With date range: use crowd_daily_station summary table (fast!) ───────
    if (hasDateRange) {
      const params = [startDate, endDate];
      const dateCond = `ds.booking_date >= $1::date AND ds.booking_date <= $2::date`;

      let searchCond = '';
      let searchParams = [...params];
      if (hasSearch) {
        searchParams.push(searchParam);
        searchCond = `AND (ds.station_code ILIKE $${searchParams.length} OR s.station_name ILIKE $${searchParams.length} OR s.city ILIKE $${searchParams.length})`;
      }

      const chartResult = await db.query(
        `SELECT ds.station_code,
                s.station_name, s.city, s.state,
                SUM(ds.total_passengers) AS total_passengers,
                (
                  SELECT json_build_object('date', booking_date, 'count', total_passengers)
                  FROM crowd_daily_station
                  WHERE station_code = ds.station_code AND booking_date >= $1::date AND booking_date <= $2::date
                  ORDER BY total_passengers DESC, booking_date ASC
                  LIMIT 1
                ) AS busiest_day,
                (
                  SELECT json_build_object('date', booking_date, 'count', total_passengers)
                  FROM crowd_daily_station
                  WHERE station_code = ds.station_code AND booking_date >= $1::date AND booking_date <= $2::date
                  ORDER BY total_passengers ASC, booking_date ASC
                  LIMIT 1
                ) AS quietest_day
         FROM crowd_daily_station ds
         LEFT JOIN stations s ON s.station_code = ds.station_code
         WHERE ${dateCond} ${searchCond}
         GROUP BY ds.station_code, s.station_name, s.city, s.state
         ${stationOrder}
         LIMIT 30`,
        searchParams
      );

      const totResult = await db.query(
        `SELECT COUNT(DISTINCT ds.station_code) AS total_count,
                SUM(ds.total_passengers)        AS grand_total
         FROM crowd_daily_station ds
         LEFT JOIN stations s ON s.station_code = ds.station_code
         WHERE ${dateCond} ${searchCond}`,
        searchParams
      );

      let items = chartResult.rows.map(r => {
        const loc   = [r.city, r.state].filter(Boolean).join(', ');
        const label = r.station_name
          ? (loc ? `${r.station_name} (${r.station_code}) - ${loc}` : `${r.station_name} (${r.station_code})`)
          : r.station_code;
        return { 
          label, 
          total_passengers: parseInt(r.total_passengers) || 0,
          busiest_day: r.busiest_day,
          quietest_day: r.quietest_day,
        };
      });
      items = assignCrowdLevels(items);

      const t = totResult.rows[0] || {};
      return res.json({
        items,
        date_range: { startDate, endDate },
        totals: {
          grand_total:    parseInt(t.grand_total || 0),
          total_count:    parseInt(t.total_count || 0),
          max_passengers: items.length > 0 ? Math.max(...items.map(i => i.total_passengers)) : 0,
          min_passengers: items.length > 0 ? Math.min(...items.map(i => i.total_passengers)) : 0,
        }
      });
    }

    // ── No date range: fast materialized view ─────────────────────────────────
    const chartResult = await db.query(
      hasSearch
        ? `SELECT m.station_code, s.station_name, s.city, s.state, m.total_passengers,
                  (
                    SELECT json_build_object('date', booking_date, 'count', total_passengers)
                    FROM crowd_daily_station
                    WHERE station_code = m.station_code
                    ORDER BY total_passengers DESC, booking_date ASC
                    LIMIT 1
                  ) AS busiest_day,
                  (
                    SELECT json_build_object('date', booking_date, 'count', total_passengers)
                    FROM crowd_daily_station
                    WHERE station_code = m.station_code
                    ORDER BY total_passengers ASC, booking_date ASC
                    LIMIT 1
                  ) AS quietest_day
           FROM mv_station_crowd m
           LEFT JOIN stations s ON m.station_code = s.station_code
           WHERE m.station_code ILIKE $1 OR s.station_name ILIKE $1 OR s.city ILIKE $1
           ${stationOrder}
           LIMIT 30`
        : `SELECT m.station_code, s.station_name, s.city, s.state, m.total_passengers,
                  (
                    SELECT json_build_object('date', booking_date, 'count', total_passengers)
                    FROM crowd_daily_station
                    WHERE station_code = m.station_code
                    ORDER BY total_passengers DESC, booking_date ASC
                    LIMIT 1
                  ) AS busiest_day,
                  (
                    SELECT json_build_object('date', booking_date, 'count', total_passengers)
                    FROM crowd_daily_station
                    WHERE station_code = m.station_code
                    ORDER BY total_passengers ASC, booking_date ASC
                    LIMIT 1
                  ) AS quietest_day
           FROM mv_station_crowd m
           LEFT JOIN stations s ON m.station_code = s.station_code
           ${stationOrder}
           LIMIT 30`,
      hasSearch ? [searchParam] : []
    );

    const totalsResult = await db.query(
      hasSearch
        ? `SELECT SUM(m.total_passengers) AS grand_total,
                  COUNT(*) AS total_count,
                  MAX(m.total_passengers) AS max_pax,
                  MIN(m.total_passengers) AS min_pax
           FROM mv_station_crowd m
           LEFT JOIN stations s ON m.station_code = s.station_code
           WHERE m.station_code ILIKE $1 OR s.station_name ILIKE $1 OR s.city ILIKE $1`
        : `SELECT SUM(total_passengers) AS grand_total,
                  COUNT(*) AS total_count,
                  MAX(total_passengers) AS max_pax,
                  MIN(total_passengers) AS min_pax
           FROM mv_station_crowd`,
      hasSearch ? [searchParam] : []
    );

    let items = chartResult.rows.map(r => {
      const loc = [r.city, r.state].filter(Boolean).join(', ');
      const label = r.station_name
        ? (loc ? `${r.station_name} (${r.station_code}) - ${loc}` : `${r.station_name} (${r.station_code})`)
        : r.station_code;
      return { 
        label, 
        total_passengers: parseInt(r.total_passengers) || 0,
        busiest_day: r.busiest_day,
        quietest_day: r.quietest_day,
      };
    });
    items = assignCrowdLevels(items);

    const t = totalsResult.rows[0];
    res.json({
      items,
      date_range: null,
      totals: {
        grand_total: parseInt(t.grand_total || 0),
        total_count: parseInt(t.total_count || 0),
        max_passengers: parseInt(t.max_pax || 0),
        min_passengers: parseInt(t.min_pax || 0),
      }
    });

  } catch (error) {
    console.error('Error fetching crowd data:', error);
    res.status(500).json({ message: 'Error fetching crowd analytics' });
  }
};
