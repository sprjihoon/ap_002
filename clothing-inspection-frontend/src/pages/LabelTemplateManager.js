import React, { useEffect, useState } from 'react';
import { Box, Typography, TextField, Button, Paper, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import { fetchWithAuth } from '../utils/api';

const LabelTemplateManager = () => {
  const [templates,setTemplates] = useState([]);
  const [form,setForm] = useState({ name:'', width:60, height:40, jsonSpec:'{"barcode":{}}' });

  const load = async ()=>{
    const list = await fetchWithAuth('/labels/templates');
    setTemplates(list);
  };
  useEffect(()=>{ load(); },[]);

  const save = async ()=>{
    await fetchWithAuth('/labels/templates',{ method:'POST', body:JSON.stringify(form) });
    setForm({ name:'', width:60, height:40, jsonSpec:'{"barcode":{}}' });
    load();
  };

  const del = async id=>{
    await fetchWithAuth(`/labels/templates/${id}`,{ method:'DELETE' });
    load();
  };

  return (
    <Box sx={{p:3}}>
      <Typography variant="h4" gutterBottom>라벨 템플릿 관리</Typography>
      <Paper sx={{p:2,mb:3}}>
        <Typography variant="h6">새 템플릿</Typography>
        <Box sx={{display:'flex',gap:2,flexWrap:'wrap'}}>
          <TextField label="이름" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
          <TextField type="number" label="폭(mm)" value={form.width} onChange={e=>setForm({...form,width:e.target.value})} />
          <TextField type="number" label="높이(mm)" value={form.height} onChange={e=>setForm({...form,height:e.target.value})} />
          <TextField label="JSON Spec" multiline minRows={3} sx={{flex:1}} value={form.jsonSpec} onChange={e=>setForm({...form,jsonSpec:e.target.value})} />
          <Button variant="contained" onClick={save}>저장</Button>
        </Box>
      </Paper>
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow><TableCell>ID</TableCell><TableCell>이름</TableCell><TableCell>크기(mm)</TableCell><TableCell>작업</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {templates.map(t=> (
              <TableRow key={t.id}>
                <TableCell>{t.id}</TableCell>
                <TableCell>{t.name}</TableCell>
                <TableCell>{t.width} x {t.height}</TableCell>
                <TableCell><Button color="error" onClick={()=>del(t.id)}>삭제</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};
export default LabelTemplateManager; 