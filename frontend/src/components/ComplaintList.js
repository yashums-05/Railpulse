import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ImageModal from './ImageModal';

export default function ComplaintList({ newComplaint }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    fetchComplaints();
  }, []);

  useEffect(() => {
    if (newComplaint) {
      setComplaints(prev => [newComplaint, ...prev]);
    }
  }, [newComplaint]);

  const fetchComplaints = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      const res = await axios.get('http://localhost:5000/api/complaints', config);
      setComplaints(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching complaints:', err);
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) return <div style={styles.loading}>Loading complaints...</div>;

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>Your Recent Complaints</h3>
      
      {complaints.length === 0 ? (
        <div style={styles.emptyState}>No complaints filed yet.</div>
      ) : (
        <div style={styles.list}>
          {complaints.map(complaint => (
            <div key={complaint.id} style={styles.listItem}>
              <div style={styles.itemHeader}>
                <span style={styles.date}>{formatDate(complaint.created_at)}</span>
                <span style={{
                  ...styles.badge, 
                  ...(complaint.status === 'Resolved' ? styles.badgeResolved : styles.badgePending)
                }}>
                  {complaint.status || 'Pending'}
                </span>
              </div>
              
              { (complaint.entity_type || complaint.pnr_number) && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  {complaint.entity_type && complaint.entity_id && (
                    <div style={styles.entityTag}>
                      <span style={{ marginRight: '4px' }}>{complaint.entity_type === 'Station' ? '🏢' : '🚆'}</span>
                      {complaint.entity_type}: <strong>{complaint.entity_id}</strong>
                    </div>
                  )}
                  {complaint.pnr_number && (
                    <div style={styles.pnrArea}>
                      <span style={styles.pnrLabel}>PNR:</span> {complaint.pnr_number}
                    </div>
                  )}
                </div>
              )}
              
              <p style={styles.description}>{complaint.description}</p>
              
              {complaint.image_url && (
                <div style={styles.imageProofContainer}>
                  <p style={styles.imageLabel}>Attached Proof:</p>
                  <img 
                    src={`http://localhost:5000${complaint.image_url}`} 
                    alt="Complaint Proof" 
                    style={{...styles.proofImage, cursor: 'zoom-in'}} 
                    onClick={() => setSelectedImage(`http://localhost:5000${complaint.image_url}`)}
                  />
                </div>
              )}

              {/* Resolved Info Area (if resolved by Staff) */}
              {complaint.status === 'Resolved' && (
                <div style={styles.resolvedInfoArea}>
                  <p style={styles.resolvedLabel}>✓ RESOLVED BY STAFF</p>
                  <p style={styles.description}><strong>Action Taken:</strong> {complaint.resolution_description}</p>
                  {complaint.resolution_image_url && (
                    <div style={styles.imageProofContainer}>
                      <p style={styles.imageLabel}>Resolution Proof (Attached by Staff):</p>
                      <img 
                        src={`http://localhost:5000${complaint.resolution_image_url}`} 
                        alt="Resolution Proof" 
                        style={{...styles.proofImage, cursor: 'zoom-in'}} 
                        onClick={() => setSelectedImage(`http://localhost:5000${complaint.resolution_image_url}`)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedImage && (
        <ImageModal
          imageUrl={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
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
    height: '100%'
  },
  title: {
    margin: '0 0 20px 0',
    fontSize: '20px',
    color: 'var(--text-primary)',
    fontWeight: '700'
  },
  loading: {
    padding: '20px',
    textAlign: 'center',
    color: 'var(--text-muted)'
  },
  emptyState: {
    padding: '40px 20px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    background: 'var(--bg-input)',
    borderRadius: '12px',
    border: '1px dashed var(--border-input)'
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxHeight: '500px',
    overflowY: 'auto',
    paddingRight: '6px'
  },
  listItem: {
    padding: '18px',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    background: 'var(--bg-card-hover)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  date: {
    fontSize: '12px',
    color: 'var(--text-timestamp)',
    fontWeight: '900'
  },
  badge: {
    padding: '4px 10px',
    borderRadius: '9999px',
    fontSize: '11px',
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
    fontSize: '12px',
    color: 'var(--badge-entity-color)',
    background: 'var(--badge-entity-bg)',
    padding: '5px 10px',
    borderRadius: '6px',
    border: '1px solid var(--badge-entity-border)',
    display: 'inline-flex',
    alignItems: 'center'
  },
  pnrArea: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    background: 'var(--bg-input)',
    padding: '5px 10px',
    borderRadius: '6px',
    display: 'inline-flex',
    alignItems: 'center'
  },
  pnrLabel: {
    fontWeight: '700',
    marginRight: '6px',
    color: 'var(--text-muted)'
  },
  description: {
    margin: 0,
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: '1.6'
  },
  imageProofContainer: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid var(--border-color)'
  },
  imageLabel: {
    margin: '0 0 8px 0',
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase'
  },
  proofImage: {
    maxWidth: '100%',
    maxHeight: '200px',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    objectFit: 'cover'
  },
  resolvedInfoArea: {
    marginTop: '16px',
    padding: '16px',
    background: 'rgba(72, 187, 120, 0.05)',
    border: '1px solid rgba(72, 187, 120, 0.2)',
    borderRadius: '8px'
  },
  resolvedLabel: {
    color: 'var(--text-success)',
    margin: '0 0 12px 0',
    fontWeight: '800',
    fontSize: '14px',
    letterSpacing: '1px'
  }
};