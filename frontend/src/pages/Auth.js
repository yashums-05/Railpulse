import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import './Auth.css';

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isToggled, setIsToggled] = useState(location.pathname === '/register');

  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [registerData, setRegisterData] = useState({ username: '', name: '', email: '', password: '', role: 'Passenger' });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // Update toggle state when route changes directly
  useEffect(() => {
    setIsToggled(location.pathname === '/register');
    setError('');
    setSuccess('');
    setShowLoginPassword(false);
    setShowRegisterPassword(false);
  }, [location.pathname]);

  const handleToggle = (e) => {
    e.preventDefault();
    setShowLoginPassword(false);
    setShowRegisterPassword(false);
    if (isToggled) {
      navigate('/login');
    } else {
      navigate('/register');
    }
  };

  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleRegisterChange = (e) => {
    setRegisterData({ ...registerData, [e.target.name]: e.target.value });
  };

  const scrollToPanelTop = (isSignup) => {
    const selector = isSignup ? '.credentials-panel.signup' : '.credentials-panel.signin';
    const panel = document.querySelector(selector);
    if (panel) {
      panel.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', loginData);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);
      if (res.data.name) localStorage.setItem('name', res.data.name);
      if (res.data.username) localStorage.setItem('username', res.data.username);
      if (res.data.email) localStorage.setItem('email', res.data.email);

      if (res.data.role === 'Admin' || res.data.role === 'Station Master' || res.data.role === 'TT' ||
          res.data.role === 'Loco Pilot' || res.data.role === 'Guard' ||
          res.data.role === 'RPF Officer' || res.data.role === 'Section Engineer') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      scrollToPanelTop(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const { email, password } = registerData;
    if (!email || !/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(email)) {
      setError('Email address must be a valid Gmail address (ending in @gmail.com).');
      scrollToPanelTop(true);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      scrollToPanelTop(true);
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter (A-Z).');
      scrollToPanelTop(true);
      return;
    }
    if (!/[a-z]/.test(password)) {
      setError('Password must contain at least one lowercase letter (a-z).');
      scrollToPanelTop(true);
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number (0-9).');
      scrollToPanelTop(true);
      return;
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      setError('Password must contain at least one special character.');
      scrollToPanelTop(true);
      return;
    }

    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', registerData);
      setSuccess('Registration successful! You can now log in.');
      scrollToPanelTop(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      scrollToPanelTop(true);
    }
  };

  return (
    <div className="auth-body">
      <div className={`auth-wrapper ${isToggled ? 'toggled' : ''}`}>

        {/* Background shapes */}
        <div className="background-shape"></div>
        <div className="secondary-shape"></div>

        {/* Sign In Panel */}
        <div className="credentials-panel signin">
          <h2 className="slide-element">Sign In</h2>
          {error && !isToggled && <div className="slide-element auth-error">{error}</div>}
          <form onSubmit={handleLoginSubmit}>
            <div className="field-wrapper slide-element">
              <input type="text" name="username" value={loginData.username} onChange={handleLoginChange} required />
              <label>User ID</label>
            </div>
            <div className="field-wrapper slide-element">
              <input type={showLoginPassword ? "text" : "password"} name="password" value={loginData.password} onChange={handleLoginChange} required />
              <label>Password</label>
              <button
                type="button"
                className={`password-toggle ${showLoginPassword ? 'visible' : ''}`}
                onClick={() => setShowLoginPassword(!showLoginPassword)}
                tabIndex="-1"
                aria-label="Toggle Password Visibility"
              >
                👁️
              </button>
            </div>
            <button type="submit" className="submit-button slide-element">Sign In</button>
          </form>
          <div className="switch-link slide-element">
            <p>Don't have an account? <a href="#" onClick={handleToggle}>Sign Up</a></p>
          </div>
        </div>

        {/* Sign Up Panel */}
        <div className="credentials-panel signup">
          <h2 className="slide-element">Sign Up</h2>
          {error && isToggled && <div className="slide-element auth-error">{error}</div>}
          {success && isToggled && <div className="slide-element auth-success">{success}</div>}
          <form onSubmit={handleRegisterSubmit}>
            <div className="field-wrapper slide-element">
              <input type="text" name="username" value={registerData.username} onChange={handleRegisterChange} required />
              <label>User ID (unique, e.g. john_doe)</label>
            </div>
            <div className="field-wrapper slide-element">
              <input type="text" name="name" value={registerData.name} onChange={handleRegisterChange} required />
              <label>Full Name</label>
            </div>
            <div className="field-wrapper slide-element">
              <input type="email" name="email" value={registerData.email} onChange={handleRegisterChange} required />
              <label>Email Address</label>
            </div>
            <div className="field-wrapper slide-element">
              <input type={showRegisterPassword ? "text" : "password"} name="password" value={registerData.password} onChange={handleRegisterChange} required />
              <label>Password</label>
              <button
                type="button"
                className={`password-toggle ${showRegisterPassword ? 'visible' : ''}`}
                onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                tabIndex="-1"
                aria-label="Toggle Password Visibility"
              >
                👁️
              </button>
            </div>
            <div className="field-wrapper slide-element">
              <select name="role" value={registerData.role} onChange={handleRegisterChange} required>
                <option value="Passenger">🎫 Passenger</option>
                <option value="Admin">🛡️ Admin</option>
                <option value="Station Master">🏛️ Station Master</option>
                <option value="TT">🎟️ Ticket Examiner (TT)</option>
                <option value="Loco Pilot">🚂 Loco Pilot</option>
                <option value="Guard">🦺 Guard</option>
                <option value="RPF Officer">🔴 RPF Officer</option>
                <option value="Section Engineer">🔧 Section Engineer</option>
              </select>
              <label>Role</label>
            </div>
            <button type="submit" className="submit-button slide-element">Sign Up</button>
          </form>
          <div className="switch-link slide-element">
            <p>Already have an account? <a href="#" onClick={handleToggle}>Sign In</a></p>
          </div>
        </div>

        {/* Welcome Section Sign In */}
        <div className="welcome-section signin">
          <h2 className="slide-element">Welcome Back!</h2>
          <p className="slide-element">Enter your details and start your journey</p>
        </div>

        {/* Welcome Section Sign Up */}
        <div className="welcome-section signup">
          <h2 className="slide-element">Hello!</h2>
          <p className="slide-element">Join RailPulse for smarter railway experience</p>
        </div>

      </div>
    </div>
  );
}
