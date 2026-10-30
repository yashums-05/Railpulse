import React from 'react';

export default function ImageModal({ imageUrl, altText, onClose }) {
  if (!imageUrl) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <button style={styles.closeBtn} onClick={onClose}>✕</button>
        <img src={imageUrl} alt={altText || 'Enlarged image'} style={styles.image} />
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    zIndex: 9999,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(5px)',
    padding: '20px'
  },
  modal: {
    position: 'relative',
    maxWidth: '90%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  closeBtn: {
    position: 'absolute',
    top: '-40px',
    right: '0',
    background: 'transparent',
    border: 'none',
    color: '#fff',
    fontSize: '30px',
    cursor: 'pointer',
    padding: '10px',
    lineHeight: '1',
    textShadow: '0 2px 4px rgba(0,0,0,0.5)'
  },
  image: {
    maxWidth: '100%',
    maxHeight: '85vh',
    objectFit: 'contain',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.8)'
  }
};
