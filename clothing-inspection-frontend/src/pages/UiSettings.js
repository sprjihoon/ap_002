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

// 단일 파일 업로드(전광판 시작 음악)
const SettingSingleUpload = () => {
  const [currentUrl,setCurrentUrl]=useState('');
  const [file,setFile]=useState(null);
  const [success,setSuccess]=useState('');
  const [error,setError]=useState('');

  const load=()=>{
    fetch(`${API_BASE}/api/settings/ui`,{credentials:'include'}).then(r=>r.json()).then(d=>setCurrentUrl(d.startupSoundUrl||'')).catch(()=>{});
  };
  useEffect(load,[]);

  const upload=async()=>{
    if(!file) return;
    try{
      const form=new FormData();
      form.append('file',file);
      form.append('type','startup');
      const token=localStorage.getItem('token');
      await fetch(`${API_BASE}/api/settings/upload`,{method:'POST',credentials:'include',headers:{Authorization:`Bearer ${token}`},body:form});
      setSuccess('업로드 완료'); setFile(null); load();
    }catch(err){ setError(err.message);}  
  };

  const del=async()=>{
    if(!window.confirm('삭제합니까?')) return;
    try{
      const token=localStorage.getItem('token');
      await fetch(`${API_BASE}/api/settings/upload/startup`,{method:'DELETE',credentials:'include',headers:{Authorization:`Bearer ${token}`}});
      setCurrentUrl(''); setSuccess('삭제 완료');
    }catch(err){ setError(err.message);}  
  };

  return (
    <Box sx={{display:'flex',flexDirection:'column',gap:2}}>
      {currentUrl && (
        <Box sx={{display:'flex',alignItems:'center',gap:1}}>
          <audio controls src={`${API_BASE}${currentUrl}`} />
          <Button size="small" color="error" onClick={del}>삭제</Button>
        </Box>
      )}
      <Box sx={{display:'flex',gap:2,alignItems:'center'}}>
        <TextField type="file" inputProps={{accept:'audio/*'}} onChange={e=>setFile(e.target.files?.[0]||null)}/>
        <Button variant="contained" disabled={!file} onClick={upload}>업로드</Button>
      </Box>
      <Snackbar open={!!success} autoHideDuration={3000} onClose={()=>setSuccess('')}><Alert severity="success">{success}</Alert></Snackbar>
      <Snackbar open={!!error} autoHideDuration={3000} onClose={()=>setError('')}><Alert severity="error">{error}</Alert></Snackbar>
    </Box>
  );
};

const UiSettings = () => {
  const [file, setFile] = useState(null);
  const [sounds, setSounds] = useState([]);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [playMode,setPlayMode]=useState('random');

  const loadSounds = async () => {
    try {
      const data = await fetchWithAuth('/settings/sounds'); // GET /api/settings/sounds
      setSounds(data);
      // also load soundPlayMode
      fetch(`${API_BASE}/api/settings/ui`,{credentials:'include'}).then(r=>r.json()).then(d=>setPlayMode(d.soundPlayMode||'random')).catch(()=>{});
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

  const moveItem = (index, direction) => {
    const newArr=[...sounds];
    const target=newArr.splice(index,1)[0];
    newArr.splice(index+direction,0,target);
    setSounds(newArr);
  };

  const saveOrder = async () => {
    try{
      const order = sounds.map(s=>s.id);
      await fetchWithAuth('/settings/sounds/order',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({order})});
      setSuccess('순서 저장 완료');
    }catch(err){ setError(err.message);}  
  };

  const toggleMode = async () => {
    try{
      const newMode = playMode==='random'?'sequential':'random';
      setPlayMode(newMode);
      await fetchWithAuth('/settings/sound-mode',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:newMode})});
      setSuccess('재생 방식 변경');
    }catch(err){ setError(err.message);}  
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
        <Box sx={{display:'flex',alignItems:'center',gap:2,mb:1}}>
          <Typography>재생 방식:</Typography>
          <Button variant="outlined" onClick={toggleMode}>{playMode==='random'?'랜덤':'순차'} 재생</Button>
      </Box>
        {sounds.length === 0 ? (
          <Typography variant="body2">등록된 효과음이 없습니다.</Typography>
        ) : (
          <List>
            {sounds.map((s,idx) => (
              <ListItem key={s.id} secondaryAction={
                <Box>
                  <IconButton disabled={idx===0} onClick={()=>moveItem(idx,-1)}><span style={{fontSize:18}}>▲</span></IconButton>
                  <IconButton disabled={idx===sounds.length-1} onClick={()=>moveItem(idx,1)}><span style={{fontSize:18}}>▼</span></IconButton>
                  <IconButton edge="end" color="error" onClick={() => handleDelete(s.id)}><DeleteIcon /></IconButton>
                </Box>
              }>
                <audio controls src={`${API_BASE}${s.url}`} style={{ marginRight: 8 }} />
                <ListItemText primary={s.originalName || s.url.split('/').pop()} />
              </ListItem>
            ))}
          </List>
        )}
        {sounds.length>1 && <Button variant="contained" onClick={saveOrder}>순서 저장</Button>}
      </Paper>

      {/* 전광판 시작 음악 업로드 */}
      <Paper sx={{ p: 2, mt:3 }}>
        <Typography variant="h6" gutterBottom>전광판 시작 음악</Typography>
        <SettingSingleUpload />
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
