import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Button, TextField, Snackbar, Alert } from '@mui/material';
import { fetchWithAuth, API_BASE } from '../utils/api';

const SettingUpload = ({ label, accept, settingKey }) => {
  const [file, setFile] = useState(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/settings/ui`, { credentials:'include' });
      const data = await res.json();
      setCurrentUrl(data[settingKey] || '');
    } catch (err) { console.error(err); }
  };
  useEffect(() => { load(); }, []);

  const handleUpload = async () => {
    if (!file) return;
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('type', settingKey === 'completeSoundUrl' ? 'sound' : 'loginBg');
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/api/settings/upload`, { method:'POST', headers:{ Authorization:`Bearer ${token}` }, credentials:'include', body: form });
      setSuccess('업로드 완료');
      setFile(null);
      load();
    } catch (err) { setError(err.message); }
  };
  return (
    <Paper sx={{ p:2, mb:3 }}>
      <Typography variant="h6" gutterBottom>{label}</Typography>
      {currentUrl && (
        <Typography variant="body2" sx={{ mb:1 }}>
          현재 파일: {currentUrl.split('/').pop()}
        </Typography>
      )}
      <Box sx={{ display:'flex', gap:2, alignItems:'center' }}>
        <TextField type="file" inputProps={{ accept }} onChange={e=>setFile(e.target.files?.[0]||null)} />
        <Button variant="contained" disabled={!file} onClick={handleUpload}>업로드</Button>
      </Box>
      <Snackbar open={!!success} autoHideDuration={3000} onClose={()=>setSuccess('')}><Alert severity="success">{success}</Alert></Snackbar>
      <Snackbar open={!!error} autoHideDuration={3000} onClose={()=>setError('')}><Alert severity="error">{error}</Alert></Snackbar>
    </Paper>
  );
};

const UiSettings = () => {
  return (
    <Box sx={{ p:3 }}>
      <Typography variant="h4" gutterBottom>환경 설정</Typography>
      <SettingUpload label="작업 완료 효과음" accept="audio/*" settingKey="completeSoundUrl" />
    </Box>
  );
};

export default UiSettings; 
