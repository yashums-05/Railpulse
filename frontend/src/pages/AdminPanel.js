import React, { useState, useEffect } from 'react';
import ComplaintList from '../components/ComplaintList';
import StaffComplaintList from '../components/StaffComplaintList';
import CrowdChart from '../components/CrowdChart';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

export default function AdminPanel() {
  const userName = localStorage.getItem('name') || 'Staff Member';
  const userEmail = localStorage.getItem('email') || 'admin@railpulse.com';
  const role = localStorage.getItem('role') || 'Admin';
  const [activeTab, setActiveTab] = useState('complaints');

  // Live admin stats
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(null);

  useEffect(() => {
    if (role === 'Admin' && activeTab === 'overview') {
      fetchAdminStats();
    }
  }, [role, activeTab]);

  const fetchAdminStats = async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/stats`, {
        headers: { 'x-auth-token': token }
      });
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setStatsError('Could not load stats. Is the server running?');
    } finally {
      setStatsLoading(false);
    }
  };

  // Role-specific labels
  const roleConfig = {
    'Station Master': {
      icon: '🏢', complaintLabel: 'Station Complaints',
      complaintHint: 'Only complaints tagged to stations are shown.',
      color: 'var(--role-station)', bg: 'rgba(118,228,247,0.12)'
    },
    'Section Engineer': {
      icon: '🔧', complaintLabel: 'Station Complaints',
      complaintHint: 'Infrastructure & maintenance complaints at stations.',
      color: 'var(--role-engineer)', bg: 'rgba(144,205,244,0.12)'
    },
    'TT': {
      icon: '🚆', complaintLabel: 'Train Complaints',
      complaintHint: 'Only complaints tagged to trains are shown.',
      color: 'var(--role-tt)', bg: 'rgba(214,188,250,0.12)'
    },
    'Loco Pilot': {
      icon: '🚂', complaintLabel: 'Train Complaints',
      complaintHint: 'Complaints related to train operations on your route.',
      color: 'var(--role-loco)', bg: 'rgba(251,182,206,0.12)'
    },
    'Guard': {
      icon: '🦺', complaintLabel: 'Train Complaints',
      complaintHint: 'Train safety & passenger complaints on your assigned train.',
      color: 'var(--role-guard)', bg: 'rgba(251,211,141,0.12)'
    },
    'RPF Officer': {
      icon: '🛡️', complaintLabel: 'All Complaints',
      complaintHint: 'Security & safety complaints across the network.',
      color: 'var(--role-rpf)', bg: 'rgba(252,129,129,0.12)'
    },
    'Admin': {
      icon: '🛡️', complaintLabel: 'All Complaints',
      complaintHint: 'Viewing all complaints across the network.',
      color: 'var(--role-admin)', bg: 'rgba(246,173,85,0.12)'
    }
  };

  const cfg = roleConfig[role] || roleConfig['Admin'];

  const renderAdminView = () => (
    <div style={styles.contentArea}>
      <h2 style={styles.sectionTitle}>System Overview (Admin)</h2>

      {statsLoading && (
        <div style={styles.card}>
          <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>⏳ Loading live data from database...</p>
        </div>
      )}

      {statsError && (
        <div style={{ ...styles.card, borderColor: 'var(--role-rpf)' }}>
          <p style={{ color: 'var(--role-rpf)', textAlign: 'center' }}>⚠️ {statsError}</p>
        </div>
      )}

      {stats && !statsLoading && (
        <>
          {/* Complaints Row */}
          <div>
            <p style={styles.groupLabel}>📋 Complaints</p>
            <div style={styles.statsRow}>
              <div style={styles.statBox}>
                <div style={styles.statLabel}>Total Complaints</div>
                <div style={styles.statValue}>{stats.totalComplaints.toLocaleString()}</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statLabel}>Resolved</div>
                <div style={{ ...styles.statValue, color: 'var(--text-success)' }}>{stats.resolvedComplaints.toLocaleString()}</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statLabel}>Pending / Open</div>
                <div style={{ ...styles.statValue, color: 'var(--role-rpf)' }}>{stats.openComplaints.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Network Row */}
          <div>
            <p style={styles.groupLabel}>🛤️ Railway Network</p>
            <div style={{ ...styles.statsRow, gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <div style={styles.statBox}>
                <div style={styles.statLabel}>Stations in DB</div>
                <div style={styles.statValue}>{stats.totalStations.toLocaleString()}</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statLabel}>Trains in DB</div>
                <div style={styles.statValue}>{stats.totalTrains.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Users Row */}
          <div>
            <p style={styles.groupLabel}>👥 Registered Users ({stats.totalUsers.toLocaleString()} total)</p>
            <div style={styles.card}>
              {stats.roleBreakdown.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No users found.</p>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Role</th>
                      <th style={styles.th}>Count</th>
                      <th style={styles.th}>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.roleBreakdown.map((r) => {
                      const pct = ((parseInt(r.count) / stats.totalUsers) * 100).toFixed(1);
                      return (
                        <tr key={r.role}>
                          <td style={styles.td}>{r.role}</td>
                          <td style={{ ...styles.td, color: 'var(--role-admin)', fontWeight: '600' }}>{parseInt(r.count).toLocaleString()}</td>
                          <td style={styles.td}>
                            <div style={styles.barTrack}>
                              <div style={{ ...styles.barFill, width: `${pct}%` }} />
                              <span style={styles.barLabel}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderStationMasterView = () => (
    <div style={styles.contentArea}>
      <h2 style={styles.sectionTitle}>Station Management Dashboard</h2>
      <div style={{background: cfg.bg, border: `1px solid ${cfg.color}44`, borderRadius: '12px', padding: '14px 20px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px'}}>
        <span style={{fontSize: '22px'}}>🏢</span>
        <div>
          <div style={{color: cfg.color, fontWeight: '700', fontSize: '14px'}}>Station Master View</div>
          <div style={{color: 'var(--text-muted)', fontSize: '13px'}}>Showing only station-related complaints assigned to your jurisdiction.</div>
        </div>
      </div>
      <StaffComplaintList />
    </div>
  );

  const renderTTView = () => (
    <div style={styles.contentArea}>
      <h2 style={styles.sectionTitle}>Ticket Examiner Portal</h2>
      <div style={{background: cfg.bg, border: `1px solid ${cfg.color}44`, borderRadius: '12px', padding: '14px 20px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px'}}>
        <span style={{fontSize: '22px'}}>🚆</span>
        <div>
          <div style={{color: cfg.color, fontWeight: '700', fontSize: '14px'}}>Ticket Examiner (TT) View</div>
          <div style={{color: 'var(--text-muted)', fontSize: '13px'}}>Showing only train-related complaints. No sorting needed — filtered automatically for you.</div>
        </div>
      </div>
      <StaffComplaintList />
    </div>
  );

  // What to render in the complaints tab based on role
  const renderComplaintsTab = () => (
    <div style={styles.contentArea}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px'}}>
        <h2 style={styles.sectionTitle}>{cfg.complaintLabel}</h2>
        <div style={{
          fontSize: '13px',
          color: cfg.color,
          background: cfg.bg,
          padding: '6px 14px',
          borderRadius: '20px',
          border: `1px solid ${cfg.color}44`,
          fontWeight: '600'
        }}>
          {cfg.icon} {cfg.complaintHint}
        </div>
      </div>
      {role === 'Admin' ? <ComplaintList /> : <StaffComplaintList />}
    </div>
  );

  const renderCrowdTab = () => {
    let fixedFilter = null;
    if (role === 'Station Master' || role === 'Section Engineer') fixedFilter = 'station';
    else if (role === 'TT' || role === 'Loco Pilot' || role === 'Guard') fixedFilter = 'train';
    
    return (
      <div style={styles.contentArea}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px'}}>
          <h2 style={styles.sectionTitle}>Crowd Analysis</h2>
          <div style={{
            fontSize: '13px',
            color: cfg.color,
            background: cfg.bg,
            padding: '6px 14px',
            borderRadius: '20px',
            border: `1px solid ${cfg.color}44`,
            fontWeight: '600'
          }}>
            {fixedFilter === 'station' ? '🏢 Restricted to Station data.' : 
             fixedFilter === 'train' ? '🚆 Restricted to Train data.' : 
             '🛡️ Full access to all data.'}
          </div>
        </div>
        <div style={{marginTop: '8px'}}>
          <CrowdChart fixedFilterBy={fixedFilter} />
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h2 style={styles.logo}>RailPulse Staff</h2>
          <div style={{fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px'}}>{role}</div>
        </div>

        <nav style={styles.nav}>
          {role === 'Admin' && (
            <button
              style={activeTab === 'overview' ? {...styles.navItem, ...styles.navActive} : styles.navItem}
              onClick={() => setActiveTab('overview')}
            >
              <span style={styles.icon}>📊</span> Dashboard
            </button>
          )}
          <button
            style={activeTab === 'complaints' ? {...styles.navItem, ...styles.navActive} : styles.navItem}
            onClick={() => setActiveTab('complaints')}
          >
            <span style={styles.icon}>{cfg.icon}</span> {cfg.complaintLabel}
          </button>
          <button
            style={activeTab === 'crowd' ? {...styles.navItem, ...styles.navActive} : styles.navItem}
            onClick={() => setActiveTab('crowd')}
          >
            <span style={styles.icon}>👥</span> Crowd Analysis
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.pageTitle}>Welcome, {userName}!</h1>
          <p style={styles.pageSubtitle}>
            {role === 'Station Master' && '🏢 Showing station complaints assigned to your jurisdiction'}
            {role === 'Section Engineer' && '🔧 Showing station maintenance complaints'}
            {role === 'TT' && '🚆 Showing train complaints assigned to your route'}
            {role === 'Loco Pilot' && '🚂 Showing train operational complaints on your route'}
            {role === 'Guard' && '🦺 Showing train safety & passenger complaints'}
            {role === 'RPF Officer' && '🛡️ Showing all security & safety complaints'}
            {role === 'Admin' && '🛡️ Full system access — viewing all complaints'}
          </p>
        </div>

        {activeTab === 'overview' && role === 'Admin' && renderAdminView()}
        {activeTab === 'complaints' && renderComplaintsTab()}
        {activeTab === 'crowd' && renderCrowdTab()}
        {(activeTab === 'overview' && role === 'Station Master') && renderStationMasterView()}
        {(activeTab === 'overview' && role === 'TT') && renderTTView()}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    minHeight: 'calc(100vh - 64px)',
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
  },
  logo: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '800',
    letterSpacing: '-0.5px',
    background: 'linear-gradient(90deg, #f6ad55, #ed8936)',
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
    background: 'rgba(246, 173, 85, 0.15)',
    color: 'var(--text-primary)',
    fontWeight: '600',
    borderLeft: '4px solid #f6ad55'
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
  contentArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  sectionTitle: {
    margin: 0,
    fontSize: '20px',
    color: 'var(--text-primary)',
    fontWeight: '700'
  },
  groupLabel: {
    margin: '0 0 10px 0',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em'
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px'
  },
  statBox: {
    background: 'var(--bg-card)',
    padding: '24px',
    borderRadius: '14px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
    border: '1px solid var(--border-color)',
    backdropFilter: 'blur(10px)',
  },
  statLabel: {
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.55)',
    marginBottom: '8px',
    fontWeight: '500'
  },
  statValue: {
    fontSize: '30px',
    fontWeight: '700',
    color: 'var(--role-admin)'
  },
  card: {
    background: 'var(--bg-card)',
    padding: '24px',
    borderRadius: '14px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
    border: '1px solid var(--border-color)',
    backdropFilter: 'blur(10px)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    borderBottom: '2px solid var(--border-color)',
    color: 'var(--text-secondary)',
    fontWeight: '600',
    fontSize: '13px'
  },
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    fontSize: '14px'
  },
  barTrack: {
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '6px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  barFill: {
    background: 'linear-gradient(90deg, #f6ad55, #ed8936)',
    height: '100%',
    borderRadius: '6px',
    transition: 'width 0.6s ease',
    minWidth: '2px',
  },
  barLabel: {
    position: 'absolute',
    right: '8px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  list: {
    listStyleType: 'none',
    padding: 0,
    margin: 0
  },
  listItem: {
    padding: '12px 0',
    borderBottom: '1px solid var(--border-color)',
    color: 'var(--text-secondary)'
  },
};