import React, { useState } from 'react';
import ComplaintForm from '../components/ComplaintForm';
import ComplaintList from '../components/ComplaintList';
import CrowdChart from '../components/CrowdChart';

export default function Dashboard() {
  const [newComplaint, setNewComplaint] = useState(null);
  const [activeTab, setActiveTab] = useState('complaints'); // 'complaints' or 'crowd'
  
  // Get user details from localStorage
  const userName = localStorage.getItem('name') || 'Passenger';
  const userEmail = localStorage.getItem('email') || 'passenger@railpulse.com';
  const role = localStorage.getItem('role') || 'passenger';

  const handleComplaintAdded = (complaint) => {
    setNewComplaint(complaint);
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h2 style={styles.logo}>RailPulse</h2>
        </div>
        
        <nav style={styles.nav}>
          <button 
            style={activeTab === 'complaints' ? {...styles.navItem, ...styles.navActive} : styles.navItem}
            onClick={() => setActiveTab('complaints')}
          >
            <span style={styles.icon}>📋</span> Train Complaints
          </button>
          <button 
            style={activeTab === 'crowd' ? {...styles.navItem, ...styles.navActive} : styles.navItem}
            onClick={() => setActiveTab('crowd')}
          >
            <span style={styles.icon}>👥</span> Crowd Monitoring
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div style={styles.main}>
        {activeTab === 'complaints' ? (
          <>
            <div style={styles.header}>
              <h1 style={styles.pageTitle}>Welcome, {userName}!</h1>
              <p style={styles.pageSubtitle}>Train Complaints Dashboard - File and track your grievances seamlessly</p>
            </div>

            <div style={styles.grid}>
              <div style={styles.leftCol}>
                <ComplaintForm onComplaintAdded={handleComplaintAdded} />
              </div>
              <div style={styles.rightCol}>
                <ComplaintList newComplaint={newComplaint} />
              </div>
            </div>
          </>
        ) : (
          <CrowdChart />
        )}
      </div>
    </div>
  );
}
const styles = {
  container: {
    display: 'flex',
    minHeight: 'calc(100vh - 64px)', // Account for navbar height
    background: 'transparent',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--text-primary)'
  },
  sidebar: {
    width: '280px',
    background: 'var(--bg-card)',
    backdropFilter: 'blur(16px)',
    borderRight: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarHeader: {
    padding: '24px',
    borderBottom: '1px solid var(--border-color)',
  },
  logo: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '800',
    letterSpacing: '-0.5px',
    background: 'linear-gradient(90deg, #a78bfa, #60a5fa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  

  nav: {
    padding: '20px 16px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  navItem: {
    background: 'transparent',
    border: 'none',
    padding: '14px 16px',
    textAlign: 'left',
    fontSize: '15px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  navActive: {
    background: 'rgba(102, 126, 234, 0.15)',
    color: 'var(--text-primary)',
    fontWeight: '600',
    borderLeft: '4px solid #667eea'
  },
  icon: {
    fontSize: '18px'
  },

  main: {
    flex: 1,
    padding: '40px',
    overflowY: 'auto'
  },
  header: {
    marginBottom: '32px'
  },
  pageTitle: {
    margin: '0 0 8px 0',
    fontSize: '28px',
    color: 'var(--text-primary)',
    fontWeight: '800',
    letterSpacing: '-0.5px'
  },
  pageSubtitle: {
    margin: 0,
    fontSize: '16px',
    color: 'var(--text-muted)'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '32px',
    alignItems: 'start'
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column'
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%'
  },
  sidebarFooter: {
    padding: '16px',
    borderTop: '1px solid var(--border-color)',
  },
  logoutBtn: {
    width: '100%',
    background: 'rgba(252, 129, 129, 0.1)',
    border: '1px solid rgba(252, 129, 129, 0.3)',
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--role-rpf)',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    transition: 'all 0.2s ease',
  }
};