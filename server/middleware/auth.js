const jwt = require('jsonwebtoken');

/**
 * Verify JWT token middleware
 * Extracts Bearer token, validates against process.env.JWT_SECRET, and attaches req.user
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided or invalid format.',
    });
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error('[Auth Middleware Error] process.env.JWT_SECRET is not configured.');
    return res.status(500).json({
      success: false,
      message: 'Internal server configuration error.',
    });
  }

  try {
    const decoded = jwt.verify(token, secret);
    req.user = {
      id: decoded.id,
      role: decoded.role,
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please log in again.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid authorization token.',
    });
  }
};

/**
 * Role-Based Access Control (RBAC) middleware
 * Checks if req.user.role matches allowed roles dynamically
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access requires one of the following roles: [${allowedRoles.join(', ')}]. Your current role is '${req.user.role}'.`,
      });
    }

    next();
  };
};

/**
 * Optional token middleware: if valid Bearer token exists, attaches req.user; otherwise proceeds as guest
 */
const optionalToken = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (secret) {
      try {
        const decoded = jwt.verify(token, secret);
        req.user = {
          id: decoded.id,
          role: decoded.role,
        };
      } catch (e) {
        // Continue as guest
        req.user = null;
      }
    }
  } else {
    req.user = null;
  }
  next();
};

module.exports = {
  verifyToken,
  requireRole,
  optionalToken,
};
