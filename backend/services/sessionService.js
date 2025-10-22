// Secure session service
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');

class SessionService {
  constructor() {
    this.activeSessions = new Map();
    this.failedAttempts = new Map();
  }

  // Create secure session
  async createSession(user) {
    const sessionId = this.generateSessionId();
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        sessionId: sessionId
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    // Store session data
    this.activeSessions.set(sessionId, {
      userId: user.id,
      email: user.email,
      role: user.role,
      createdAt: new Date(),
      lastActivity: new Date(),
      ip: null // Will be set by middleware
    });

    return {
      token,
      sessionId,
      expiresIn: config.jwt.expiresIn
    };
  }

  // Validate session
  async validateSession(token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      const session = this.activeSessions.get(decoded.sessionId);
      
      if (!session) {
        return { valid: false, reason: 'Session not found' };
      }

      // Check if session is expired
      const now = new Date();
      const sessionAge = now - session.createdAt;
      if (sessionAge > config.session.maxAge) {
        this.activeSessions.delete(decoded.sessionId);
        return { valid: false, reason: 'Session expired' };
      }

      // Update last activity
      session.lastActivity = now;
      return { valid: true, user: decoded };
    } catch (error) {
      return { valid: false, reason: 'Invalid token' };
    }
  }

  // Destroy session
  async destroySession(sessionId) {
    this.activeSessions.delete(sessionId);
  }

  // Track failed login attempts
  trackFailedAttempt(ip) {
    const attempts = this.failedAttempts.get(ip) || 0;
    this.failedAttempts.set(ip, attempts + 1);
    
    // Reset after 15 minutes
    setTimeout(() => {
      this.failedAttempts.delete(ip);
    }, 15 * 60 * 1000);
  }

  // Check if IP is blocked
  isBlocked(ip) {
    const attempts = this.failedAttempts.get(ip) || 0;
    return attempts >= 5; // Block after 5 failed attempts
  }

  // Reset failed attempts
  resetFailedAttempts(ip) {
    this.failedAttempts.delete(ip);
  }

  // Generate secure session ID
  generateSessionId() {
    return require('crypto').randomBytes(32).toString('hex');
  }

  // Clean up expired sessions
  cleanupExpiredSessions() {
    const now = new Date();
    for (const [sessionId, session] of this.activeSessions) {
      const sessionAge = now - session.createdAt;
      if (sessionAge > config.session.maxAge) {
        this.activeSessions.delete(sessionId);
      }
    }
  }

  // Get session statistics
  getSessionStats() {
    return {
      activeSessions: this.activeSessions.size,
      failedAttempts: this.failedAttempts.size
    };
  }
}

module.exports = new SessionService();
