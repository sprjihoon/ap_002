import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          의류 검수 시스템
        </Typography>
        <Box>
          <Button color="inherit" onClick={() => navigate('/dashboard')}>
            대시보드
          </Button>
          <Button color="inherit" onClick={() => navigate('/clothes')}>
            의류 목록
          </Button>
          <Button color="inherit" onClick={() => navigate('/inspections')}>
            검수 내역
          </Button>
          <Button color="inherit" onClick={() => navigate('/')}>
            로그아웃
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar; 