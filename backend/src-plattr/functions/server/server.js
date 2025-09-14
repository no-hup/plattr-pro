// Re-export all functions from serverIndex.js for backward compatibility
module.exports = {
  ...require('./serverIndex'),
  ...require('./server_auth'),
};
