import React, { useState, useEffect } from 'react';
import { Container, Paper, TextField, Button, Typography, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { login, API_URL } from '../utils/api';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // 배경 이미지 적용
  useEffect(() => {
    let prevBg = '';
    const fetchUi = async () => {
      try {
        const res = await fetch(`${API_URL}/settings/ui`);
        if (!res.ok) throw new Error('failed');
        const d = await res.json();
        if (d.loginBgUrl) {
          let url = d.loginBgUrl;
          if (!url.startsWith('http')) {
            const root = API_URL.replace(/\/api$/, '');
            url = root + url;
          }
          prevBg = document.body.style.backgroundImage;
          document.body.style.backgroundImage = `url(${url})`;
          document.body.style.backgroundSize = 'cover';
          document.body.style.backgroundRepeat = 'no-repeat';
          document.body.style.backgroundPosition = 'center';
          document.body.style.backgroundAttachment = 'fixed';
        }
      } catch (err) {
        console.error('UI settings fetch error', err);
      }
    };
    fetchUi();
    return () => { document.body.style.backgroundImage = prevBg; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const data = await login(username, password);
      const role = (data.user.role || '').toLowerCase();
      navigate(role==='display' ? '/tv/dashboard' : '/dashboard');
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            의류 검수 시스템
          </Typography>
          {error && (
            <Typography color="error" align="center" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="사용자 이름"
              margin="normal"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <TextField
              fullWidth
              label="비밀번호"
              type="password"
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              sx={{ mt: 3 }}
            >
              로그인
            </Button>
          </form>
        </Paper>
      </Box>
    </Container>
  );
}

export default Login; 
