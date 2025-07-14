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

  const handleDelete = async () => {
    if (!currentUrl) return;
    if (!window.confirm('삭제하시겠습니까?')) return;
    try {
      const token = localStorage.getItem('token');
      const type = settingKey === 'completeSoundUrl' ? 'sound' : 'loginBg';
      const res = await fetch(`${API_BASE}/api/settings/upload/${type}`, {
        method:'DELETE', credentials:'include', headers:{ Authorization:`Bearer ${token}` }
      });
      if (!res.ok) throw new Error('삭제 실패');
      setCurrentUrl('');
      setSuccess('삭제 완료');
    } catch(err){ setError(err.message); }
  };
  return (
    <Paper sx={{ p:2, mb:3 }}>
      <Typography variant="h6" gutterBottom>{label}</Typography>
      {currentUrl && (
        <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:1 }}>
          <Typography variant="body2">현재 파일: {currentUrl.split('/').pop()}</Typography>
          <Button size="small" color="error" onClick={handleDelete}>삭제</Button>
        </Box>
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
