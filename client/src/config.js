const config = {
  apiBaseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api',
  oauthStartUrl:
    process.env.REACT_APP_OAUTH_START_URL ||
    process.env.REACT_APP_API_BASE_URL + '/api/auth/google' ||
    'http://localhost:5000/api/auth/google',
};

export default config;
