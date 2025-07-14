// New UI Settings page supporting multiple complete sounds upload & management

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Snackbar,
  Alert,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { fetchWithAuth, API_BASE } from '../utils/api';

const UiSettings = () => {
  const [file, setFile] = useState(null);
  const [sounds, setSounds] = useState([]);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const loadSounds = async () => {
    try {
      const data = await fetchWithAuth('/settings/sounds'); // GET /api/settings/sounds
      setSounds(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  useEffect(() => {
    loadSounds();
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    try {
      const form = new FormData();
      form.append('file', file);
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/api/settings/sounds`, {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      setSuccess('업로드 완료');
      setFile(null);
      loadSounds();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    try {
      await fetchWithAuth(`/settings/sounds/${id}`, { method: 'DELETE' });
      setSuccess('삭제 완료');
      loadSounds();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        환경 설정
      </Typography>

      {/* 업로드 섹션 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          작업 완료 효과음 업로드
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            type="file"
            inputProps={{ accept: 'audio/*' }}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <Button variant="contained" disabled={!file} onClick={handleUpload}>
            업로드
          </Button>
        </Box>
      </Paper>

      {/* 업로드된 사운드 목록 */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          업로드된 효과음 목록
        </Typography>
        {sounds.length === 0 ? (
          <Typography variant="body2">등록된 효과음이 없습니다.</Typography>
        ) : (
          <List>
            {sounds.map((s) => (
              <ListItem key={s.id} secondaryAction={
                <IconButton edge="end" color="error" onClick={() => handleDelete(s.id)}>
                  <DeleteIcon />
                </IconButton>
              }>
                <audio controls src={`${API_BASE}${s.url}`} style={{ marginRight: 8 }} />
                <ListItemText primary={s.url.split('/').pop()} />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        onClose={() => setSuccess('')}
      >
        <Alert severity="success">{success}</Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={3000}
        onClose={() => setError('')}
      >
        <Alert severity="error">{error}</Alert>
      </Snackbar>
    </Box>
  );
};

export default UiSettings; 
