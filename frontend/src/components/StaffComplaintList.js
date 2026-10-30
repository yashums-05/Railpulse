import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ImageModal from './ImageModal';

export default function StaffComplaintList() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for the currently resolving complaint
  const [resolvingId, setResolvingId] = useState(null);
  const [resolveText, setResolveText] = useState('');
  const [resolveImage, setResolveImage] = useState(null);
  const [resolveStatus, setResolveStatus] = useState({ type: '', message: '' });
  
  // State for image modal
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/complaints/staff', {
        headers: { 'x-auth-token': token }
      });
      setComplaints(res.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load assigned complaints');
      setLoading(false);
    }
  };

  const handleResolveSubmit = async (e, id) => {
    e.preventDefault();
    setResolveStatus({ type: '', message: '' });

    if (!resolveText.trim()) {
      setResolveStatus({ type: 'error', message: 'Resolution description is required.' });
      return;
    }
    if (!resolveImage) {
      setResolveStatus({ type: 'error', message: 'Photo proof is required.' });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const submitData = new FormData();
      submitData.append('resolution_description', resolveText);
      submitData.append('resolutionImage', resolveImage);

      await axios.put(`http://localhost:5000/api/complaints/${id}/resolve`, submitData, {
        headers: { 
          'x-auth-token': token,
          'Content-Type': 'multipart/form-data'
        }
      });

      setResolveStatus({ type: 'success', message: 'Complaint resolved successfully!' });
      
      // Reset form and refresh list after a short delay
      setTimeout(() => {
        setResolvingId(null);
        setResolveText('');
        setResolveImage(null);
        setResolveStatus({ type: '', message: '' });
        fetchComplaints();
      }, 2000);

    } catch (err) {
      setResolveStatus({ 
        type: 'error', 
        message: err.response?.data?.message || 'Error resolving complaint'
      });
    }
  };

  if (loading) return <div style={styles.loading}>Loading assigned complaints...</div>;
  if (error) return <div style={styles.error}>{error}</div>;

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>Assigned Complaints</h3>
      
      {complaints.length === 0 ? (
        <div style={styles.emptyState}>
          <p>No complaints currently assigned to your jurisdiction.</p>
        </div>
      ) : (
        <div style={styles.list}>
          {complaints.map(complaint => (
            <div key={complaint.id} style={styles.listItem}>
              <div style={styles.itemHeader}>
                <span style={styles.date}>
                  {new Date(complaint.created_at).toLocaleDateString()} at {new Date(complaint.created_at).toLocaleTimeString()}
                </span>
                <span style={{
                  ...styles.badge,
                  ...(complaint.status === 'Pending' ? styles.badgePending : styles.badgeResolved)
                }}>
                  {complaint.status}
                </span>
              </div>
              
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
              
              <p style={styles.description}><strong>Issue:</strong> {complaint.description}</p>
              
              {complaint.image_url && (
                <div style={styles.imageProofContainer}>
                  <p style={styles.imageLabel}>User's Attached Proof:</p>
                  <img 
                    src={`http://localhost:5000${complaint.image_url}`} 
                    alt="User Proof" 
                    style={{...styles.proofImage, cursor: 'zoom-in'}} 
                    onClick={() => setSelectedImage(`http://localhost:5000${complaint.image_url}`)}
                  />
                </div>
              )}

              {/* Resolution Area */}
              {complaint.status === 'Pending' && (
                <div style={styles.resolutionActionArea}>
                  {resolvingId === complaint.id ? (
                    <form onSubmit={(e) => handleResolveSubmit(e, complaint.id)} style={styles.resolveForm}>
                      <h4 style={styles.resolveTitle}>Resolve this Complaint</h4>
                      
                      {resolveStatus.message && (
                        <div style={{...styles.alert, ...(resolveStatus.type === 'success' ? styles.alertSuccess : styles.alertError)}}>
                          {resolveStatus.message}
                        </div>
                      )}

                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Resolution Details *</label>
                        <textarea 
                          value={resolveText}
                          onChange={(e) => setResolveText(e.target.value)}
                          placeholder="Describe the action taken..."
                          style={styles.textarea}
                          required
                        />
                      </div>
                      
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Photo Proof of Resolution *</label>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => setResolveImage(e.target.files[0])}
                          style={styles.fileInput}
                          required
                        />
                      </div>
                      
                      <div style={styles.actionButtons}>
                        <button type="submit" style={styles.submitBtn}>Submit Resolution</button>
                        <button type="button" onClick={() => setResolvingId(null)} style={styles.cancelBtn}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <button onClick={() => setResolvingId(complaint.id)} style={styles.startResolveBtn}>
                      Mark as Resolved
                    </button>
                  )}
                </div>
              )}

              {complaint.status === 'Resolved' && (
                <div style={styles.resolvedInfoArea}>
                  <p style={styles.resolvedLabel}>✓ RESOLVED</p>
                  <p style={styles.description}><strong>Action Taken:</strong> {complaint.resolution_description}</p>
                  {complaint.resolution_image_url && (
                    <div style={styles.imageProofContainer}>
                      <p style={styles.imageLabel}>Staff Proof of Resolution:</p>
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
      
      {/* Image Modal for enlarging proofs */}
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
  error: {
    padding: '20px',
    textAlign: 'center',
    color: 'var(--role-rpf)',
    background: 'rgba(229, 62, 62, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(229, 62, 62, 0.3)'
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
    gap: '20px',
    maxHeight: '700px',
    overflowY: 'auto',
    paddingRight: '6px'
  },
  listItem: {
    padding: '20px',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    background: 'var(--bg-input)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  date: {
    fontSize: '13px',
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
    fontSize: '15px',
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
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  proofImage: {
    maxWidth: '100%',
    maxHeight: '250px',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    objectFit: 'cover'
  },
  resolutionActionArea: {
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: '1px dashed rgba(255,255,255,0.2)'
  },
  startResolveBtn: {
    background: 'linear-gradient(135deg, #48bb78, #38a169)',
    color: 'white',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
    boxShadow: '0 4px 12px rgba(72, 187, 120, 0.3)',
    transition: 'transform 0.2s'
  },
  resolveForm: {
    background: 'var(--bg-input)',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid var(--badge-entity-border)',
  },
  resolveTitle: {
    margin: '0 0 16px 0',
    color: 'var(--badge-entity-color)',
    fontSize: '16px'
  },
  inputGroup: {
    marginBottom: '16px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase'
  },
  textarea: {
    width: '100%',
    padding: '12px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    minHeight: '80px',
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box'
  },
  fileInput: {
    width: '100%',
    padding: '10px',
    background: 'var(--bg-input)',
    border: '1px dashed var(--border-input)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    boxSizing: 'border-box'
  },
  actionButtons: {
    display: 'flex',
    gap: '12px'
  },
  submitBtn: {
    flex: 1,
    background: 'transparent',
    color: 'var(--text-primary)',
    border: '1px solid #667eea',
    background: 'linear-gradient(135deg, rgba(102,126,234,0.3), rgba(118,75,162,0.3))',
    padding: '12px',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  cancelBtn: {
    padding: '12px 20px',
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  alert: {
    padding: '10px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
    textAlign: 'center'
  },
  alertSuccess: {
    background: 'rgba(72, 187, 120, 0.1)',
    color: 'var(--badge-resolved-color)',
    border: '1px solid rgba(72, 187, 120, 0.3)'
  },
  alertError: {
    background: 'rgba(245, 101, 101, 0.1)',
    color: 'var(--text-danger)',
    border: '1px solid rgba(245, 101, 101, 0.3)'
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
