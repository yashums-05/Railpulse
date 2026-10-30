import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function ComplaintForm({ onComplaintAdded }) {
  const [formData, setFormData] = useState({
    pnr_number: '',
    description: '',
    entity_type: 'Station',
    entity_id: ''
  });
  const [proofImage, setProofImage] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Autocomplete state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [validSelection, setValidSelection] = useState(false);
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

  // Reset search when entity_type changes
  useEffect(() => {
    setSearchQuery('');
    setFormData(prev => ({ ...prev, entity_id: '' }));
    setSuggestions([]);
    setShowSuggestions(false);
    setValidSelection(false);
  }, [formData.entity_type]);

  // Fetch autocomplete suggestions (debounced)
  useEffect(() => {
    if (searchQuery.trim().length < 1) {
      setSuggestions([]);
      return;
    }
    setSuggestionsLoading(true);
    const handler = setTimeout(() => {
      axios
        .get(`http://localhost:5000/api/complaints/suggestions?entity_type=${formData.entity_type}&q=${encodeURIComponent(searchQuery)}`)
        .then(res => {
          setSuggestions(res.data);
          setShowSuggestions(true);
        })
        .catch(() => setSuggestions([]))
        .finally(() => setSuggestionsLoading(false));
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery, formData.entity_type]);

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion.label + (suggestion.sublabel ? ' — ' + suggestion.sublabel : ''));
    setFormData(prev => ({ ...prev, entity_id: suggestion.value }));
    setShowSuggestions(false);
    setSuggestions([]);
    setValidSelection(true);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setProofImage(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setStatus({ type: '', message: '' });

    if (!validSelection) {
      setStatus({ type: 'error', message: `Please select a valid ${isStation ? 'station' : 'train'} from the dropdown list.` });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'multipart/form-data'
        }
      };

      const submitData = new FormData();
      submitData.append('pnr_number', formData.pnr_number);
      submitData.append('description', formData.description);
      submitData.append('entity_type', formData.entity_type);
      submitData.append('entity_id', formData.entity_id);
      if (proofImage) {
        submitData.append('proofImage', proofImage);
      }

      const res = await axios.post('http://localhost:5000/api/complaints', submitData, config);
      setStatus({ type: 'success', message: 'Complaint submitted successfully!' });
      setFormData({ pnr_number: '', description: '', entity_type: 'Station', entity_id: '' });
      setSearchQuery('');
      setValidSelection(false);
      setProofImage(null);

      if (onComplaintAdded) {
        onComplaintAdded(res.data);
      }

      setTimeout(() => setStatus({ type: '', message: '' }), 3000);
    } catch (err) {
      setStatus({
        type: 'error',
        message: err.response?.data?.message || 'Error submitting complaint'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStation = formData.entity_type === 'Station';
  const accentColor = isStation ? '#48bb78' : '#4299e1';
  const accentBg = isStation ? 'rgba(72,187,120,0.12)' : 'rgba(66,153,225,0.12)';

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>📝 File a New Complaint</h3>

      {status.message && (
        <div style={{ ...styles.alert, ...(status.type === 'success' ? styles.success : styles.error) }}>
          {status.message}
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>

        {/* Location Type selector */}
        <div style={styles.rowGroup}>
          <div style={{ ...styles.inputGroup, flex: 1 }}>
            <label style={styles.label}>Location Type</label>
            <select
              name="entity_type"
              value={formData.entity_type}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="Station">🏢 Station</option>
              <option value="Train">🚆 Train</option>
            </select>
          </div>

          {/* Search with autocomplete */}
          <div style={{ ...styles.inputGroup, flex: 2 }}>
            <label style={styles.label}>
              {isStation ? 'Station Code' : 'Train No'} *
            </label>
            <div ref={searchRef} style={{ position: 'relative', zIndex: 50 }}>
              <span style={styles.searchIcon}>{isStation ? '🏢' : '🚆'}</span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setFormData(prev => ({ ...prev, entity_id: '' }));
                  setValidSelection(false);
                  setShowSuggestions(true);
                }}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                placeholder={isStation ? 'Search station code or name...' : 'Search train no or name...'}
                style={{ ...styles.input, paddingLeft: '36px', paddingRight: searchQuery ? '32px' : '14px' }}
                autoComplete="off"
                required
              />
              {searchQuery && (
                <button
                  type="button"
                  style={styles.clearBtn}
                  onClick={() => {
                    setSearchQuery('');
                    setFormData(prev => ({ ...prev, entity_id: '' }));
                    setSuggestions([]);
                    setShowSuggestions(false);
                    setValidSelection(false);
                  }}
                >✕</button>
              )}

              {/* Autocomplete Dropdown */}
              {showSuggestions && (suggestions.length > 0 || suggestionsLoading) && (
                <div style={styles.dropdown}>
                  {suggestionsLoading ? (
                    <div style={styles.dropdownItem}>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Searching...</span>
                    </div>
                  ) : (
                    suggestions.map((s, i) => (
                      <div
                        key={i}
                        style={styles.dropdownItem}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        onMouseDown={() => handleSuggestionClick(s)}
                      >
                        <span style={{ ...styles.dropdownIcon, background: accentBg, color: accentColor }}>
                          {isStation ? '🏢' : '🚆'}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ ...styles.dropdownText, color: accentColor }}>{s.label}</span>
                          {s.sublabel && (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.sublabel}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Selected indicator */}
            {validSelection && formData.entity_id && (
              <div style={{ ...styles.selectedTag, borderColor: accentColor, color: accentColor, background: accentBg }}>
                ✓ {isStation ? 'Station' : 'Train'}: <strong>{formData.entity_id}</strong>
              </div>
            )}
            {/* Warning if typed but not selected */}
            {searchQuery && !validSelection && (
              <div style={{ fontSize: '12px', color: 'var(--text-danger)', marginTop: '4px' }}>
                ⚠ Please select a {isStation ? 'station' : 'train'} from the dropdown
              </div>
            )}
          </div>
        </div>

        {/* PNR */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>PNR Number (Optional)</label>
          <input
            type="text"
            name="pnr_number"
            value={formData.pnr_number}
            onChange={handleChange}
            placeholder="e.g. 1234567890"
            style={styles.input}
          />
        </div>

        {/* Photo Proof */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>Photo Proof *</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ ...styles.input, padding: '8px' }}
            required
          />
        </div>

        {/* Description */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>Complaint Description *</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Please detail your issue here..."
            style={{ ...styles.input, minHeight: '100px', resize: 'vertical' }}
            required
          />
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting} 
          style={{...styles.button, opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer'}}
        >
          {isSubmitting ? 'Submitting Please Wait...' : 'Submit Complaint'}
        </button>
      </form>
    </div>
  );
}

const styles = {
  card: {
    background: 'var(--bg-card)',
    padding: '24px',
    borderRadius: '16px',
    boxShadow: 'var(--shadow-main)',
    border: '1px solid var(--border-color)',
    backdropFilter: 'blur(12px)',
  },
  title: {
    margin: '0 0 20px 0',
    fontSize: '20px',
    color: 'var(--text-primary)',
    fontWeight: '700'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  rowGroup: {
    display: 'flex',
    gap: '12px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  input: {
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-input)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
    width: '100%',
    boxSizing: 'border-box'
  },
  searchIcon: {
    position: 'absolute',
    left: '11px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '14px',
    pointerEvents: 'none',
    zIndex: 1
  },
  clearBtn: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '12px',
    padding: '2px 4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    background: 'var(--bg-dropdown)',
    backdropFilter: 'blur(16px)',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.15)',
    boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
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
    transition: 'background 0.15s',
    borderBottom: '1px solid rgba(255,255,255,0.06)'
  },
  dropdownIcon: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    flexShrink: 0
  },
  dropdownText: {
    fontWeight: '600',
    fontSize: '14px'
  },
  selectedTag: {
    fontSize: '12px',
    padding: '4px 10px',
    borderRadius: '6px',
    border: '1px solid',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '2px',
    alignSelf: 'flex-start'
  },
  button: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    padding: '14px',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'transform 0.2s',
    boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)'
  },
  alert: {
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    fontWeight: '600'
  },
  success: {
    background: 'rgba(72, 187, 120, 0.2)',
    color: 'var(--text-success)',
    border: '1px solid rgba(72, 187, 120, 0.4)',
  },
  error: {
    background: 'rgba(245, 101, 101, 0.2)',
    color: 'var(--text-danger)',
    border: '1px solid rgba(245, 101, 101, 0.4)',
  }
};