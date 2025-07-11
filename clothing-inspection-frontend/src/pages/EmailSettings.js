import React, { useEffect, useState } from 'react';
import { Box, Typography, TextField, Button, Snackbar, Alert, Paper } from '@mui/material';
import { fetchWithAuth } from '../utils/api';

const EmailSettings = () => {
  const [emailFrom, setEmailFrom] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await fetchWithAuth('/api/admin/settings/email-from');
      setEmailFrom(res.emailFrom || '');
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!emailFrom) { setError('이메일 주소를 입력하세요'); return; }
    setLoading(true);
    try {
      await fetchWithAuth('/api/admin/settings/email-from', {
        method: 'PUT',
        body: JSON.stringify({ emailFrom })
      });
      setMsg('저장되었습니다');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>시스템 이메일 설정</Typography>
      <Paper sx={{ p: 2, maxWidth: 400 }}>
        <TextField fullWidth label="보내는 이메일 주소" value={emailFrom} onChange={e=>setEmailFrom(e.target.value)} size="small" />
        <Box sx={{ mt: 2 }}>
          <Button variant="contained" disabled={loading} onClick={save}>저장</Button>
        </Box>
      </Paper>

      <Snackbar open={!!msg} autoHideDuration={3000} onClose={()=>setMsg('')}><Alert severity="success">{msg}</Alert></Snackbar>
      <Snackbar open={!!error} autoHideDuration={3000} onClose={()=>setError('')}><Alert severity="error">{error}</Alert></Snackbar>
    </Box>
  );
};

export default EmailSettings; 
