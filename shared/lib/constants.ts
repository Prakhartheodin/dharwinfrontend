const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL;
const AUTH_URL = `${BASE_API_URL}/auth`;


// Auth API
export const Login_User_API = `${AUTH_URL}/login`;
export const Logout_User_API = `${AUTH_URL}/logout`;
export const Register_User_API = `${AUTH_URL}/register`;

