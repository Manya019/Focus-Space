import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import './index.css';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Simple Error Boundary to catch Clerk initialization errors
class ClerkErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Clerk Error caught by Boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <App isAuthEnabled={false} />;
    }
    return this.props.children;
  }
}

const Root = () => {
  // Clean the key: remove whitespace, comments, and any trailing punctuation
  const cleanedKey = PUBLISHABLE_KEY 
    ? PUBLISHABLE_KEY.split('#')[0].trim().replace(/\.$/, '') 
    : '';

  // Check if the key exists and looks like a valid Clerk key
  const isValidKey = cleanedKey && cleanedKey.startsWith('pk_');

  if (!isValidKey) {
    console.warn("Clerk Publishable Key is missing or invalid. Falling back to Demo Mode.");
    return <App isAuthEnabled={false} />;
  }

  return (
    <ClerkErrorBoundary>
      <ClerkProvider publishableKey={cleanedKey} appearance={{
        baseTheme: 'dark',
        variables: { colorPrimary: '#6366f1' },
      }}>
        <App isAuthEnabled={true} />
      </ClerkProvider>
    </ClerkErrorBoundary>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
