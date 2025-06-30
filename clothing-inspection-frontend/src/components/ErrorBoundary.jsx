import React from 'react';
import { Alert, AlertTitle } from '@mui/material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error(error, info);
  }
  render() {
    const { hasError, error } = this.state;
    const { children } = this.props;
    if (hasError) {
      return (
        <Alert severity="error">
          <AlertTitle>예상치 못한 오류</AlertTitle>
          {error?.message}
        </Alert>
      );
    }
    return children;
  }
}

export default ErrorBoundary; 