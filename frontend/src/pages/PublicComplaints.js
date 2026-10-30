import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ImageModal from '../components/ImageModal';

export default function PublicComplaints() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    fetchPublicComplaints();
  }, []);

  const fetchPublicComplaints = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/complaints/all');
      setComplaints(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching public complaints:', err);
      setError('Failed to load complaints repository.');
      setLoading(false);
    }
  };

  const filteredComplaints = complaints.filter(complaint => {
    const matchesSearch = 
      (complaint.entity_id && complaint.entity_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (complaint.description && complaint.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesFilter = filterType === 'All' || complaint.entity_type === filterType;

    return matchesSearch && matchesFilter;
  });

  return (
    <>
      <div style={styles.container}>
        <div style={styles.headerArea}>
          <h1 style={styles.pageTitle}>Public Complaint Repository</h1>
          <p style={styles.pageSubtitle}>Track maintenance requests and resolutions across the entire rail network.</p>
          <button
            style={styles.ctaButton}
            onClick={() => {
              if (token) {
                navigate(role === 'Passenger' ? '/dashboard' : '/admin');
              } else {
                navigate('/login');
              }
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {token ? '← Back to Dashboard' : '📝 Register a Complaint'}
          </button>
        </div>

        <div style={styles.glassPanel}>
          <div style={styles.controlsRow}>
            <input 
              type="text" 
              placeholder="Search by Station Code, Train Number, or keywords..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="All">All Entities</option>
              <option value="Station">Station Only</option>
              <option value="Train">Train Only</option>
            </select>
          </div>

          {loading ? (
            <div style={styles.message}>Loading global complaints database...</div>
          ) : error ? (
            <div style={{...styles.message, color: 'var(--text-danger)'}}>{error}</div>
          ) : filteredComplaints.length === 0 ? (
            <div style={styles.emptyState}>No complaints found matching your search.</div>
          ) : (
            <div style={styles.grid}>
              {filteredComplaints.map(complaint => (
                <div key={complaint.id} style={styles.complaintCard}>
                  <div style={styles.cardHeader}>
                    <span style={styles.date}>
                      {new Date(complaint.created_at).toLocaleDateString()}
                    </span>
                    <span style={{
                      ...styles.badge,
                      ...(complaint.status === 'Resolved' ? styles.badgeResolved : styles.badgePending)
                    }}>
                      {complaint.status}
                    </span>
                  </div>

                  {complaint.entity_type && complaint.entity_id && (
                    <div style={styles.entityTag}>
                      <span style={{ marginRight: '4px' }}>{complaint.entity_type === 'Station' ? '🏢' : '🚆'}</span>
                      {complaint.entity_type}: <strong>{complaint.entity_id}</strong>
                    </div>
                  )}

                  <p style={styles.descriptionText}>{complaint.description}</p>

                  <div style={styles.imagesRow}>
                    {complaint.image_url && (
                      <div style={styles.imageColumn}>
                        <p style={styles.imageLabel}>Reported Issue</p>
                        <img 
                          src={`http://localhost:5000${complaint.image_url}`} 
                          alt="Reported Error" 
                          style={{...styles.proofImage, cursor: 'zoom-in'}} 
                          onClick={() => setSelectedImage(`http://localhost:5000${complaint.image_url}`)}
                        />
                      </div>
                    )}
                    {complaint.status === 'Resolved' && complaint.resolution_image_url && (
                      <div style={styles.imageColumn}>
                        <p style={styles.imageLabel}>Staff Resolution</p>
                        <img 
                          src={`http://localhost:5000${complaint.resolution_image_url}`} 
                          alt="Resolution Proof" 
                          style={{...styles.proofImage, cursor: 'zoom-in'}} 
                          onClick={() => setSelectedImage(`http://localhost:5000${complaint.resolution_image_url}`)}
                        />
                      </div>
                    )}
                  </div>

                  {complaint.status === 'Resolved' && complaint.resolution_description && (
                     <div style={styles.resolvedInfoArea}>
                        <p style={styles.resolvedLabel}>✓ RESOLUTION DETAILS</p>
                        <p style={styles.descriptionText}>{complaint.resolution_description}</p>
                     </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedImage && (
        <ImageModal
          imageUrl={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </>
  );
}

const styles = {
  container: {
    minHeight: 'calc(100vh - 64px)',
    padding: '40px',
    background: 'transparent',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--text-primary)',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  headerArea: {
    textAlign: 'center',
    marginBottom: '40px'
  },
  pageTitle: {
    fontSize: '36px',
    fontWeight: '800',
    margin: '0 0 10px 0',
    letterSpacing: '-1px',
    background: 'linear-gradient(90deg, #a78bfa, #60a5fa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  pageSubtitle: {
    fontSize: '18px',
    color: 'var(--text-secondary)',
    margin: '0 0 20px 0'
  },
  ctaButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 24px',
    background: 'linear-gradient(135deg, rgba(72,187,120,0.25), rgba(102,126,234,0.2))',
    color: 'var(--badge-resolved-color)',
    border: '1px solid rgba(72,187,120,0.4)',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    backdropFilter: 'blur(8px)',
    fontFamily: "'Inter', sans-serif",
    letterSpacing: '0.3px',
    boxShadow: '0 4px 16px rgba(72,187,120,0.15)'
  },
  glassPanel: {
    background: 'var(--bg-dropdown)',
    backdropFilter: 'blur(16px)',
    borderRadius: '24px',
    padding: '30px',
    border: '1px solid var(--border-color)',
    boxShadow: 'var(--shadow-main)'
  },
  controlsRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '30px'
  },
  searchInput: {
    flex: 1,
    padding: '16px 20px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    color: 'var(--text-primary)',
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 0.3s'
  },
  filterSelect: {
    padding: '16px 20px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    color: 'var(--text-primary)',
    fontSize: '16px',
    outline: 'none',
    cursor: 'pointer',
    minWidth: '200px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
    gap: '24px'
  },
  complaintCard: {
    background: 'var(--bg-card-hover)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.2s',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  date: {
    fontSize: '14px',
    color: 'var(--text-timestamp)',
    fontWeight: '900'
  },
  badge: {
    padding: '6px 12px',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  badgePending: {
    background: 'var(--badge-pending-bg)',
    color: 'var(--badge-pending-color)',
    border: '1px solid var(--badge-pending-border)'
  },
  badgeResolved: {
    background: 'var(--badge-resolved-bg)',
    color: 'var(--badge-resolved-color)',
    border: '1px solid var(--badge-resolved-border)'
  },
  entityTag: {
    fontSize: '13px',
    color: 'var(--badge-entity-color)',
    background: 'var(--badge-entity-bg)',
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1px solid var(--badge-entity-border)',
    display: 'inline-flex',
    alignItems: 'center',
    marginBottom: '16px',
    width: 'fit-content'
  },
  descriptionText: {
    margin: '0 0 20px 0',
    fontSize: '15px',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
    flex: 1
  },
  imagesRow: {
    display: 'flex',
    gap: '16px',
    marginTop: 'auto'
  },
  imageColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  imageLabel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: '0.5px',
    marginBottom: '8px',
    marginTop: 0
  },
  proofImage: {
    width: '100%',
    height: '160px',
    objectFit: 'cover',
    borderRadius: '12px',
    border: '1px solid var(--border-color)'
  },
  resolvedInfoArea: {
    marginTop: '20px',
    padding: '16px',
    background: 'rgba(72, 187, 120, 0.05)',
    border: '1px solid rgba(72, 187, 120, 0.2)',
    borderRadius: '12px'
  },
  resolvedLabel: {
    color: 'var(--text-success)',
    margin: '0 0 8px 0',
    fontWeight: '800',
    fontSize: '12px',
    letterSpacing: '1px',
    textTransform: 'uppercase'
  },
  message: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: 'var(--text-muted)'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px',
    background: 'var(--bg-input)',
    borderRadius: '16px',
    border: '1px dashed var(--border-input)',
    color: 'var(--text-muted)',
    fontSize: '18px'
  }
};
