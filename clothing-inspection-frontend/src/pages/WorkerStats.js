import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Grid, TextField, Paper, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import { fetchWithAuth } from '../utils/api';

const WorkerStats = () => {
  const today = new Date().toISOString().substring(0,10);
  const [start,setStart] = useState(today);
  const [end,setEnd] = useState(today);
  const [summary,setSummary] = useState(null);

  const load = async ()=>{
    const data = await fetchWithAuth(`/worker/stats/summary?start=${start}&end=${end}`);
    setSummary(data);
  };
  useEffect(()=>{ load(); // eslint-disable-next-line
  },[]);

  useEffect(()=>{ load(); // eslint-disable-next-line
  },[start,end]);

  if(!summary) return null;
  return (
    <Box sx={{p:3}}>
      <Typography variant="h4" gutterBottom>내 작업 통계</Typography>
      <Box sx={{display:'flex',gap:2,mb:2}}>
        <TextField type="date" size="small" label="시작" InputLabelProps={{shrink:true}} value={start} onChange={e=>setStart(e.target.value)} />
        <TextField type="date" size="small" label="종료" InputLabelProps={{shrink:true}} value={end} onChange={e=>setEnd(e.target.value)} />
      </Box>

      <Grid container spacing={2} sx={{mb:2}}>
        <Grid item xs={12} md={3}>
          <Card><CardContent><Typography color="textSecondary">정상</Typography><Typography variant="h5">{summary.totalNormal||0}</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card><CardContent><Typography color="textSecondary">불량</Typography><Typography variant="h5">{summary.totalDefect||0}</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card><CardContent><Typography color="textSecondary">보류</Typography><Typography variant="h5">{summary.totalHold||0}</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card><CardContent><Typography color="textSecondary">전표수</Typography><Typography variant="h5">{summary.totalSlips||0}</Typography></CardContent></Card>
        </Grid>
      </Grid>

      <Paper>
        <Table size="small">
          <TableHead><TableRow><TableCell>일자</TableCell><TableCell align="right">정상</TableCell><TableCell align="right">불량</TableCell><TableCell align="right">보류</TableCell><TableCell align="right">전표수</TableCell></TableRow></TableHead>
          <TableBody>
            {summary.daily.map(row=> (
              <TableRow key={row.date}><TableCell>{row.date}</TableCell><TableCell align="right">{row.normal}</TableCell><TableCell align="right">{row.defect}</TableCell><TableCell align="right">{row.hold}</TableCell><TableCell align="right">{row.slips}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default WorkerStats; 