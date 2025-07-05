import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, TextField, Button, FormControl, InputLabel, Select, MenuItem, CircularProgress } from '@mui/material';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Legend, Tooltip } from 'chart.js';
import dayjs from 'dayjs';
import { fetchWithAuth } from '../utils/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Legend, Tooltip);

const ReportDashboard = () => {
  const today = dayjs().format('YYYY-MM-DD');
  const [start, setStart] = useState(dayjs().subtract(29,'day').format('YYYY-MM-DD'));
  const [end, setEnd] = useState(today);
  const [granularity, setGranularity] = useState('day');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

  const load = async ()=>{
    setLoading(true);
    try{
      const data = await fetchWithAuth(`/reports/work?granularity=${granularity}&start=${start}&end=${end}`);
      setRows(data.data||[]);
    }catch(err){ console.error(err); }
    setLoading(false);
  };
  useEffect(()=>{ load(); /* eslint-disable react-hooks/exhaustive-deps */}, []);

  const labels = rows.map(r=>r.grp);
  const datasetTotal = rows.map(r=>Number(r.totalQty||0));
  const datasetDefect = rows.map(r=>Number(r.defectQty||0));

  const chartData = {
    labels,
    datasets:[
      { label:'총 처리', data:datasetTotal, backgroundColor:'#42a5f5' },
      { label:'불량', data:datasetDefect, backgroundColor:'#ef5350' }
    ]
  };

  return (
    <Box sx={{ p:3 }}>
      <Typography variant="h4" gutterBottom>작업 리포트</Typography>
      <Paper sx={{ p:2, mb:3 }}>
        <Box sx={{ display:'flex', gap:2, flexWrap:'wrap', alignItems:'center' }}>
          <TextField type="date" size="small" label="시작" InputLabelProps={{shrink:true}} value={start} onChange={e=>setStart(e.target.value)} />
          <TextField type="date" size="small" label="종료" InputLabelProps={{shrink:true}} value={end} onChange={e=>setEnd(e.target.value)} />
          <FormControl size="small">
            <InputLabel>단위</InputLabel>
            <Select value={granularity} label="단위" onChange={e=>setGranularity(e.target.value)}>
              <MenuItem value="day">일별</MenuItem>
              <MenuItem value="week">주별</MenuItem>
              <MenuItem value="month">월별</MenuItem>
              <MenuItem value="quarter">분기별</MenuItem>
              <MenuItem value="year">연도별</MenuItem>
            </Select>
          </FormControl>
          <Button variant="contained" onClick={load} disabled={loading}>{loading?<CircularProgress size={20}/>:'조회'}</Button>
        </Box>
      </Paper>

      <Paper sx={{ p:2 }}>
        <Bar data={chartData} options={{ responsive:true, plugins:{ legend:{ position:'top' } } }} />
      </Paper>
    </Box>
  );
};

export default ReportDashboard; 