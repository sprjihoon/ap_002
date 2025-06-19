import React, { useEffect, useState } from 'react';
import { Box, Typography, TextField, Button, MenuItem } from '@mui/material';
import { fetchWithAuth } from '../utils/api';

const LabelPrintPage = () => {
  const [templates,setTemplates] = useState([]);
  const [templateId,setTemplateId] = useState('');
  const [inspectionId,setInspectionId] = useState('');
  const [msg,setMsg] = useState('');

  useEffect(()=>{
    const load = async ()=>{
      const list = await fetchWithAuth('/labels/templates');
      setTemplates(list);
    };
    load();
  },[]);

  const handlePrint = async ()=>{
    const res = await fetchWithAuth('/labels/print',{ method:'POST', body:JSON.stringify({ inspectionId, templateId }) });
    setMsg(res.message || '인쇄 요청 완료');
  };

  return (
    <Box sx={{p:3}}>
      <Typography variant="h4" gutterBottom>바코드 라벨 인쇄</Typography>
      <Box sx={{display:'flex',gap:2,mb:2}}>
        <TextField label="전표 ID" value={inspectionId} onChange={e=>setInspectionId(e.target.value)} />
        <TextField select label="템플릿" value={templateId} onChange={e=>setTemplateId(e.target.value)}>
          {templates.map(t=> (<MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>))}
        </TextField>
        <Button variant="contained" onClick={handlePrint}>인쇄</Button>
      </Box>
      {msg && <Typography>{msg}</Typography>}
    </Box>
  );
};
export default LabelPrintPage; 