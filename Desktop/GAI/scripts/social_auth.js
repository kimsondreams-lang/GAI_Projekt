const crypto = require('crypto');

module.exports = {
  validateToken: (token) => {
    return token && typeof token === 'string' && token.length > 10;
  },
  
  generateSignature: (data, secret) => {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  },
  
  verifySignature: (data, signature, secret) => {
    const expected = module.exports.generateSignature(data, secret);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }
};
