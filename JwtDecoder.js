const jwt = require('jsonwebtoken');

function decodeJwt(token, secret) {
  try {
    return jwt.verify(token, secret, { algorithms: ['HS256'] }); // specify the algorithm
  } catch (err) {
    console.error('Failed to decode JWT:', err);
    return null;
  }
}

module.exports = decodeJwt;
