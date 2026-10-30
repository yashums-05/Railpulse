import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// crowd level config
const CROWD_CONFIG = {
  'Crowded':     { color: '#fc8181', bg: 'rgba(252,129,129,0.15)', label: '🔴 Crowded' },
  'Moderate':    { color: '#f6ad55', bg: 'rgba(246,173,85,0.15)',  label: '🟡 Moderate' },
  'Not Crowded': { color: '#68d391', bg: 'rgba(104,211,145,0.15)', label: '🟢 Not Crowded' },
};

export default function CrowdChart({ fixedFilterBy }) {
  const [data, setData] = useState([]);
  const [grandTotals, setGrandTotals] = useState({ grand_total: 0, total_count: 0, max_passengers: 0, min_passengers: 0 });
  const [filterBy, setFilterBy] = useState(fixedFilterBy || 'station');
  const [coachType, setCoachType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sortBy, setSortBy] = useState('desc');
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeDateRange, setActiveDateRange] = useState(null); // {startDate,endDate} or null
  const searchRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch autocomplete suggestions
  useEffect(() => {
    if (searchQuery.trim().length < 1) {
      setSuggestions([]);
      return;
    }
    setSuggestionsLoading(true);
    axios
      .get(`http://localhost:5000/api/crowd/suggestions?filterBy=${filterBy}&q=${encodeURIComponent(searchQuery)}`)
      .then((res) => {
        setSuggestions(res.data);
        setShowSuggestions(true);
      })
      .catch(() => setSuggestions([]))
      .finally(() => setSuggestionsLoading(false));
  }, [searchQuery, filterBy]);

  // Fetch main chart data
  const fetchCrowdData = useCallback(async () => {
    setLoading(true);
    setSelectedItem(null);
    try {
      const dateParams = activeDateRange
        ? `&startDate=${activeDateRange.startDate}&endDate=${activeDateRange.endDate}`
        : '';
      const response = await axios.get(
        `http://localhost:5000/api/crowd/analysis?filterBy=${filterBy}&searchQuery=${encodeURIComponent(debouncedQuery)}&coachType=${encodeURIComponent(coachType)}&sortBy=${sortBy}${dateParams}`
      );
      const { items = [], totals = {} } = response.data;
      setData(items);
      setGrandTotals(totals);
      if (items.length === 1) {
        setSelectedItem(items[0]);
      }
    } catch (error) {
      console.error('Error fetching crowd data:', error);
    } finally {
      setLoading(false);
    }
  }, [filterBy, debouncedQuery, coachType, sortBy, activeDateRange]);

  useEffect(() => {
    fetchCrowdData();
  }, [fetchCrowdData]);

  const applyDateRange = () => {
    if (startDate && endDate && startDate <= endDate) {
      setActiveDateRange({ startDate, endDate });
    }
  };

  const clearDateRange = () => {
    setStartDate('');
    setEndDate('');
    setActiveDateRange(null);
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
  };

  const handleSwitchFilter = (newFilter) => {
    setFilterBy(newFilter);
    setSearchQuery('');
    setCoachType('All');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedItem(null);
    setSortBy('desc');
    setStartDate('');
    setEndDate('');
    setActiveDateRange(null);
  };

  const handleBarClick = (barData) => {
    if (barData && barData.activePayload && barData.activePayload.length > 0) {
      const item = barData.activePayload[0].payload;
      setSelectedItem(prev => (prev && prev.label === item.label ? null : item));
    }
  };

  // Sorted data based on sortBy
  const sortedData = [...data].sort((a, b) => {
    if (sortBy === 'asc') return a.total_passengers - b.total_passengers;
    if (sortBy === 'alpha') return a.label.localeCompare(b.label);
    return b.total_passengers - a.total_passengers; // default 'desc'
  });

  const totalPassengers = grandTotals.grand_total || data.reduce((acc, curr) => acc + parseInt(curr.total_passengers || 0), 0);
  const busiest = data.length > 0 ? data[0] : null;
  const quietest = data.length > 0 ? [...data].sort((a, b) => a.total_passengers - b.total_passengers)[0] : null;
      const totalEntityCount = grandTotals.total_count || data.length;

  const accentColor = filterBy === 'station' ? '#48bb78' : '#4299e1';
  const accentLight = filterBy === 'station' ? '#f0fff4' : '#ebf8ff';
  const accentText = filterBy === 'station' ? '#276749' : '#2b6cb0';

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <div>
            <h2 style={styles.title}>Dynamic Crowd Analysis</h2>
            <p style={styles.subtitle}>Insights generated directly from ticket bookings</p>
          </div>

          <div style={styles.controlsGroup}>
            {/* Search Box with Autocomplete */}
            <div style={styles.searchWrapper} ref={searchRef}>
              <span style={styles.searchIcon}>🔍</span>
              <input
                type="text"
                placeholder={filterBy === 'station' ? 'Search Station...' : 'Search Train No...'}
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                style={styles.searchInput}
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  style={styles.clearBtn}
                  onClick={() => { setSearchQuery(''); setSuggestions([]); setShowSuggestions(false); }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}

              {/* Autocomplete Dropdown */}
              {showSuggestions && (suggestions.length > 0 || suggestionsLoading) && (
                <div style={styles.dropdown}>
                  {suggestionsLoading ? (
                    <div style={styles.dropdownItem}>
                      <span style={{ color: 'var(--text-muted)' }}>Searching...</span>
                    </div>
                  ) : (
                    suggestions.map((s, i) => (
                      <div
                        key={i}
                        style={styles.dropdownItem}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        onMouseDown={() => handleSuggestionClick(s.value)}
                      >
                        <span style={{ ...styles.dropdownIcon, background: accentLight, color: accentText }}>
                          {filterBy === 'station' ? '🏢' : '🚆'}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={styles.dropdownText}>{s.label}</span>
                          {s.sublabel && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.sublabel}</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Coach Filter specifically for Trains */}
            {filterBy === 'train' && (
              <select
                value={coachType}
                onChange={(e) => setCoachType(e.target.value)}
                style={{ ...styles.searchInput, width: '180px', padding: '10px 16px', background: 'var(--bg-input)' }}
              >
                <option value="All">All Coaches</option>
                <option value="First AC (1A)">First AC (1A)</option>
                <option value="Second AC (2A)">Second AC (2A)</option>
                <option value="Third AC (3A)">Third AC (3A)</option>
                <option value="Sleeper (SL)">Sleeper (SL)</option>
                <option value="Chair Car (CC)">Chair Car (CC)</option>
                <option value="Executive Chair Car (EC)">Executive Chair (EC)</option>
                <option value="Second Class (2S)">Second Class (2S)</option>
              </select>
            )}

            {/* Filter Toggle */}
            {!fixedFilterBy && (
              <div style={styles.filterGroup}>
                <button
                  style={filterBy === 'station' ? { ...styles.filterBtn, ...styles.filterActive, '--accent': '#48bb78' } : styles.filterBtn}
                  onClick={() => handleSwitchFilter('station')}
                >
                  🏢 Station
                </button>
                <button
                  style={filterBy === 'train' ? { ...styles.filterBtn, ...styles.filterActive, '--accent': '#4299e1' } : styles.filterBtn}
                  onClick={() => handleSwitchFilter('train')}
                >
                  🚆 Train
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Date Range Row */}
        <div style={styles.dateRow}>
          <span style={styles.sortLabel}>📅 Date Range:</span>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            style={styles.dateInput}
            min="2023-01-01" max="2025-12-31"
          />
          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>→</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            style={styles.dateInput}
            min="2023-01-01" max="2025-12-31"
          />
          <button
            style={{ ...styles.sortBtn, background: accentColor, color: 'white', borderColor: accentColor }}
            onClick={applyDateRange}
            disabled={!startDate || !endDate || startDate > endDate}
          >
            Apply
          </button>
          {activeDateRange && (
            <button style={{ ...styles.sortBtn, color: '#fc8181', borderColor: '#fc8181' }} onClick={clearDateRange}>
              ✕ Clear
            </button>
          )}
          {activeDateRange && (
            <span style={{ fontSize: '12px', color: accentColor, fontWeight: '600' }}>
              Showing: {activeDateRange.startDate} → {activeDateRange.endDate}
            </span>
          )}
        </div>

        {/* Sorting Controls */}
        <div style={styles.sortRow}>
          <span style={styles.sortLabel}>Sort by:</span>
          {[
            { key: 'desc', label: '⬇ Highest First' },
            { key: 'asc', label: '⬆ Lowest First' },
            { key: 'alpha', label: '🔤 A–Z' },
          ].map(opt => (
            <button
              key={opt.key}
              style={sortBy === opt.key
                ? { ...styles.sortBtn, background: accentColor, color: 'white', borderColor: accentColor }
                : styles.sortBtn}
              onClick={() => setSortBy(opt.key)}
            >
              {opt.label}
            </button>
          ))}
          {searchQuery && (
            <span style={{ ...styles.filterTag, background: accentLight, color: accentText, borderColor: accentColor }}>
              {filterBy === 'station' ? '🏢' : '🚆'} "{searchQuery}"
              <button style={styles.tagClose} onClick={() => setSearchQuery('')}>✕</button>
            </span>
          )}
        </div>
      </div>

      {/* Stats Row */}
      {!searchQuery.trim() && (
        <div style={styles.statsRow}>
          <div style={styles.statBox}>
            <div style={styles.statIcon}>🎟️</div>
            <div style={styles.statLabel}>Total Passengers</div>
            <div style={styles.statValue}>{totalPassengers.toLocaleString()}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statIcon}>{filterBy === 'station' ? '🏆' : '🔥'}</div>
            <div style={styles.statLabel}>{filterBy === 'station' ? 'Busiest Station' : 'Most Crowded Train'}</div>
            <div style={{ ...styles.statValue, color: 'var(--text-danger)', fontSize: '18px' }}>
              {busiest ? busiest.label : 'N/A'}
            </div>
            {busiest && (
              <div style={styles.statSub}>{parseInt(busiest.total_passengers).toLocaleString()} pax</div>
            )}
          </div>
          <div style={styles.statBox}>
            <div style={styles.statIcon}>📉</div>
            <div style={styles.statLabel}>{filterBy === 'station' ? 'Quietest Station' : 'Least Crowded Train'}</div>
            <div style={{ ...styles.statValue, color: 'var(--text-success)', fontSize: '18px' }}>
              {quietest ? quietest.label : 'N/A'}
            </div>
            {quietest && (
              <div style={styles.statSub}>{parseInt(quietest.total_passengers).toLocaleString()} pax</div>
            )}
          </div>
          <div style={styles.statBox}>
            <div style={styles.statIcon}>📊</div>
            <div style={styles.statLabel}>{filterBy === 'station' ? 'Total Stations' : 'Total Trains'}</div>
            <div style={styles.statValue}>{totalEntityCount.toLocaleString()}</div>
            <div style={styles.statSub}>Showing top {data.length} (max 30)</div>
          </div>
        </div>
      )}

      {/* Chart and Detail Panel */}
      <div style={selectedItem ? styles.chartAndDetail : {}}>

        {/* Main Chart */}
        <div style={{ ...styles.chartCard, flex: 1 }}>
          <div style={styles.chartTitleRow}>
            <h3 style={styles.chartTitle}>
              Passenger Density {filterBy === 'station' ? '(By Station)' : '(Per Train)'}
            </h3>
            <span style={styles.clickHint}>💡 Click a bar for details</span>
          </div>
          <div style={styles.chartWrapper}>
            {loading ? (
              <div style={styles.loadingState}>
                <div style={styles.spinner} />
                <span>Loading data...</span>
              </div>
            ) : sortedData.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
                <div style={{ fontWeight: '600', fontSize: '16px', color: 'var(--text-primary)' }}>No results found</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
                  No data matches "{debouncedQuery}" — try a different search
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', width: '100%', height: '100%' }}>
                <div style={{ width: Math.max(sortedData.length * 60, 600), height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={sortedData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 80 }}
                      onClick={handleBarClick}
                      style={{ cursor: 'pointer' }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#718096', fontSize: 10 }}
                        dy={10}
                        angle={-40}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#718096', fontSize: 12 }} />
                      <Tooltip
                        cursor={{ fill: 'rgba(66, 153, 225, 0.08)' }}
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            const cfg = CROWD_CONFIG[d.crowd_level] || {};
                            return (
                              <div style={{ background: 'var(--bg-dropdown)', padding: '12px 16px', border: '1px solid var(--border-color)', borderRadius: '10px', boxShadow: 'var(--shadow-main)' }}>
                                <p style={{ margin: '0 0 6px 0', fontWeight: '700', color: 'var(--text-primary)' }}>{label}</p>
                                <p style={{ margin: '0 0 4px 0', color: 'var(--text-brand)', fontWeight: '600' }}>
                                  Total: {parseInt(d.total_passengers).toLocaleString()} pax
                                </p>
                                {d.crowd_level && (
                                  <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}` }}>
                                    {cfg.label}
                                  </span>
                                )}
                                {d.coach_breakdown && (
                                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)', display: 'grid', gap: '4px' }}>
                                    {Object.entries(d.coach_breakdown).sort((a, b) => b[1] - a[1]).map(([coach, count]) => (
                                      <div key={coach} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', gap: '16px' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>{coach}:</span>
                                        <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{parseInt(count).toLocaleString()}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Bar
                        name="Total Passengers"
                        dataKey="total_passengers"
                        radius={[6, 6, 0, 0]}
                        barSize={44}
                      >
                        {sortedData.map((entry, index) => {
                          const barColor = entry.crowd_level === 'Crowded' ? '#fc8181'
                                         : entry.crowd_level === 'Moderate' ? '#f6ad55'
                                         : entry.crowd_level === 'Not Crowded' ? '#68d391'
                                         : accentColor;
                          return <Cell key={index} fill={barColor} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        {selectedItem && (
          <div style={{ ...styles.detailPanel, borderColor: accentColor }}>
            <div style={{ ...styles.detailHeader, background: accentColor }}>
              <div style={styles.detailIcon}>{filterBy === 'station' ? '🏢' : '🚆'}</div>
              <div>
                <div style={styles.detailTitle}>{selectedItem.label}</div>
                <div style={styles.detailSubtitle}>{filterBy === 'station' ? 'Station Details' : 'Train Details'}</div>
              </div>
              <button style={styles.detailClose} onClick={() => setSelectedItem(null)}>✕</button>
            </div>
            <div style={styles.detailBody}>
              <div style={styles.detailRow}>
                <span style={styles.detailKey}>Total Passengers</span>
                <span style={{ ...styles.detailVal, color: accentText, fontWeight: '700' }}>
                  {parseInt(selectedItem.total_passengers).toLocaleString()}
                </span>
              </div>
              {!searchQuery.trim() && (
                <>
                  <div style={styles.detailRow}>
                    <span style={styles.detailKey}>Rank</span>
                    <span style={styles.detailVal}>
                      #{data.findIndex(d => d.label === selectedItem.label) + 1} of {data.length}
                    </span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailKey}>% of Total</span>
                    <span style={styles.detailVal}>
                      {totalPassengers > 0 ? ((parseInt(selectedItem.total_passengers) / totalPassengers) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </>
              )}
              <div style={styles.detailRow}>
                <span style={styles.detailKey}>Type</span>
                <span style={{ ...styles.badge, background: accentLight, color: accentText }}>
                  {filterBy === 'station' ? 'Station' : 'Train'}
                </span>
              </div>


              {activeDateRange && activeDateRange.startDate && activeDateRange.endDate && activeDateRange.startDate === activeDateRange.endDate ? (
                <div style={{ ...styles.detailRow, flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                  <span style={styles.detailKey}>📅 Date</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span style={{ ...styles.detailVal, color: 'var(--text-primary)' }}>
                      {new Date(activeDateRange.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                      {parseInt(selectedItem.total_passengers).toLocaleString()} pax
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  {selectedItem.busiest_day && selectedItem.busiest_day.date && (
                    <div style={{ ...styles.detailRow, flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                      <span style={styles.detailKey}>🔥 Busiest Day</span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <span style={{ ...styles.detailVal, color: '#e53e3e' }}>
                          {new Date(selectedItem.busiest_day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                          {parseInt(selectedItem.busiest_day.count).toLocaleString()} pax
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedItem.quietest_day && selectedItem.quietest_day.date && (
                    <div style={{ ...styles.detailRow, flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                      <span style={styles.detailKey}>📉 Quietest Day</span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <span style={{ ...styles.detailVal, color: '#38a169' }}>
                          {new Date(selectedItem.quietest_day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                          {parseInt(selectedItem.quietest_day.count).toLocaleString()} pax
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}


            </div>
          </div>
        )}

      </div>

      {/* Results Summary */}
      {!loading && sortedData.length > 0 && (
        <div style={styles.resultsSummary}>
          Showing <strong>{sortedData.length}</strong> {filterBy === 'station' ? 'station' : 'train'}{sortedData.length !== 1 ? 's' : ''}
          {searchQuery ? ` matching "${searchQuery}"` : ''}{' '}
          · Sorted by <strong>{sortBy === 'desc' ? 'highest first' : sortBy === 'asc' ? 'lowest first' : 'A–Z'}</strong>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    animation: 'fadeIn 0.4s ease'
  },
  header: {
    background: 'var(--bg-card)',
    padding: '20px 24px',
    borderRadius: '14px',
    boxShadow: 'var(--shadow-main)',
    border: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px'
  },
  controlsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    zIndex: 100
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    color: 'var(--text-muted)',
    fontSize: '14px',
    pointerEvents: 'none'
  },
  searchInput: {
    padding: '10px 36px 10px 36px',
    borderRadius: '10px',
    border: '1.5px solid #cbd5e0',
    outline: 'none',
    fontSize: '14px',
    width: '240px',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    background: 'var(--bg-input)',
    color: 'var(--text-primary)'
  },
  clearBtn: {
    position: 'absolute',
    right: '10px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    fontSize: '13px',
    padding: '2px 4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    left: 0,
    width: '100%',
    background: 'var(--bg-card)',
    borderRadius: '10px',
    border: '1px solid var(--border-color)',
    boxShadow: 'var(--shadow-main)',
    overflow: 'hidden',
    zIndex: 200
  },
  dropdownItem: {
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    color: 'var(--text-primary)',
    transition: 'background 0.15s',
    borderBottom: '1px solid var(--border-color)'
  },
  dropdownIcon: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    flexShrink: 0
  },
  dropdownText: {
    fontWeight: '500'
  },
  filterGroup: {
    display: 'flex',
    gap: '6px',
    background: 'var(--bg-card-hover)',
    padding: '4px',
    borderRadius: '10px',
    border: '1px solid var(--border-color)'
  },
  filterBtn: {
    padding: '8px 16px',
    border: 'none',
    background: 'transparent',
    borderRadius: '7px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    transition: 'all 0.2s'
  },
  filterActive: {
    background: 'var(--bg-card)',
    color: 'var(--text-brand)',
    boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
  },
  dateRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    paddingTop: '4px',
    borderTop: '1px solid var(--border-color)'
  },
  dateInput: {
    padding: '7px 12px',
    borderRadius: '8px',
    border: '1.5px solid var(--border-color)',
    background: 'var(--bg-input)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
    cursor: 'pointer'
  },
  sortRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap'
  },
  sortLabel: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    fontWeight: '600',
    marginRight: '4px'
  },
  sortBtn: {
    padding: '6px 14px',
    border: '1.5px solid var(--border-color)',
    background: 'var(--bg-card)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    transition: 'all 0.18s'
  },
  filterTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    border: '1px solid',
    marginLeft: '8px'
  },
  tagClose: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '11px',
    padding: 0,
    color: 'inherit',
    lineHeight: 1
  },
  title: {
    margin: '0 0 6px 0',
    fontSize: '22px',
    color: 'var(--text-primary)',
    fontWeight: '700'
  },
  subtitle: {
    margin: 0,
    fontSize: '14px',
    color: 'var(--text-muted)'
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px'
  },
  statBox: {
    background: 'var(--bg-card)',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: 'var(--shadow-main)',
    border: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center'
  },
  statIcon: {
    fontSize: '24px',
    marginBottom: '8px'
  },
  statLabel: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginBottom: '6px',
    fontWeight: '500'
  },
  statValue: {
    fontSize: '26px',
    fontWeight: '700',
    color: 'var(--text-brand)'
  },
  statSub: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginTop: '2px'
  },
  chartAndDetail: {
    display: 'flex',
    gap: '20px',
    alignItems: 'flex-start'
  },
  chartCard: {
    background: 'var(--bg-card)',
    padding: '24px',
    borderRadius: '14px',
    boxShadow: 'var(--shadow-main)',
    border: '1px solid var(--border-color)'
  },
  chartTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  chartTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-primary)'
  },
  clickHint: {
    fontSize: '12px',
    color: 'var(--text-muted)'
  },
  chartWrapper: {
    height: '420px',
    width: '100%',
    overflowX: 'auto'
  },
  loadingState: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
    gap: '12px',
    fontSize: '15px'
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid var(--border-color)',
    borderTopColor: '#4299e1',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  emptyState: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center'
  },
  detailPanel: {
    width: '280px',
    flexShrink: 0,
    background: 'var(--bg-card)',
    borderRadius: '14px',
    boxShadow: 'var(--shadow-main)',
    border: '2px solid',
    overflow: 'hidden',
    animation: 'slideIn 0.25s ease'
  },
  detailHeader: {
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: 'white',
    position: 'relative'
  },
  detailIcon: {
    fontSize: '24px',
    flexShrink: 0
  },
  detailTitle: {
    fontWeight: '700',
    fontSize: '16px',
    color: 'white'
  },
  detailSubtitle: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.8)',
    marginTop: '2px'
  },
  detailClose: {
    position: 'absolute',
    right: '12px',
    top: '12px',
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '4px 8px',
    fontWeight: '700'
  },
  detailBody: {
    padding: '20px'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid var(--border-color)'
  },
  detailKey: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    fontWeight: '500'
  },
  detailVal: {
    fontSize: '14px',
    color: 'var(--text-primary)',
    fontWeight: '600'
  },
  badge: {
    padding: '3px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '700'
  },
  progressTrack: {
    height: '8px',
    background: '#edf2f7',
    borderRadius: '6px',
    marginTop: '8px',
    overflow: 'hidden'
  },
  progressBar: {
    height: '100%',
    borderRadius: '6px',
    transition: 'width 0.5s ease'
  },
  resultsSummary: {
    textAlign: 'center',
    fontSize: '13px',
    color: 'var(--text-muted)',
    padding: '8px',
    background: 'var(--bg-card)',
    borderRadius: '8px',
    border: '1px solid var(--border-color)'
  }
};
