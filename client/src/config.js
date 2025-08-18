const config = {
	apiBaseUrl: process.env.REACT_APP_API_BASE_URL || "http://localhost:5000",
	oauthStartUrl: process.env.REACT_APP_OAUTH_START_URL || "http://localhost:5000/api/auth/google",
};

export default config;
