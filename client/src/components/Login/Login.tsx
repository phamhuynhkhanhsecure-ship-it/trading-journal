import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

export default function Login() {
  const { login } = useAuth();

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-container">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="login-logo">
              <path d="M12 20V10" />
              <path d="M18 20V4" />
              <path d="M6 20v-4" />
            </svg>
          </div>
          <h1>Trading Journal</h1>
          <p>Sign in to access your dashboard</p>
        </div>
        
        <div className="login-actions">
          <GoogleLogin
            onSuccess={(credentialResponse) => {
              if (credentialResponse.credential) {
                login(credentialResponse.credential);
              }
            }}
            onError={() => {
              console.error('Login Failed');
            }}
            theme="filled_blue"
            size="large"
            width="300px"
            shape="rectangular"
          />
        </div>
        
        <div className="login-footer">
          Securely authenticate with your Google account. Your data is isolated and safely stored securely.
        </div>
      </div>
    </div>
  );
}
