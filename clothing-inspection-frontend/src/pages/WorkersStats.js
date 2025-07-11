import React, { useEffect, useState } from 'react';
import { Box, Typography, TextField, Paper, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import { fetchWithAuth } from '../utils/api';

const WorkersStats = () => {
  const today = new Date().toISOString().substring(0,10);
  const [start,setStart] = useState(today);
  const [end,setEnd] = useState(today);
  const [rows,setRows] = useState([]);

  const load = async ()=>{
    const data = await fetchWithAuth(`/api/worker/stats/summary/all?start=${start}&end=${end}`);
    setRows(data);
  };

  useEffect(()=>{ load(); // eslint-disable-next-line
  },[]);

  useEffect(()=>{ load(); // eslint-disable-next-line
  },[start,end]);

  // helper to format rows: summary + details per worker
  const renderRows = () => {
    return rows.flatMap(worker => {
      const summaryRow = (
        <TableRow key={worker.workerId} sx={{ bgcolor:'grey.100', fontWeight:'bold' }}>
          <TableCell>{worker.rank}</TableCell>
          <TableCell>{worker.workerName}</TableCell>
          <TableCell>합계</TableCell>
          <TableCell align="right">{worker.totalNormal}</TableCell>
          <TableCell align="right">{worker.totalDefect}</TableCell>
          <TableCell align="right">{worker.totalHold}</TableCell>
          <TableCell></TableCell><TableCell></TableCell>
        </TableRow>
      );
      const slipRows = worker.slips.map((s,i)=>(
        <TableRow key={`${worker.workerId}-${i}`}>
          <TableCell></TableCell>
          <TableCell></TableCell>
          <TableCell>{s.inspectionName}</TableCell>
          <TableCell align="right">{s.normal}</TableCell>
          <TableCell align="right">{s.defect}</TableCell>
          <TableCell align="right">{s.hold}</TableCell>
          <TableCell>{s.firstScan ? s.firstScan.substring(11,19) : '-'}</TableCell>
          <TableCell>{s.lastScan ? s.lastScan.substring(11,19) : '-'}</TableCell>
        </TableRow>
      ));
      return [summaryRow, ...slipRows];
    });
  };

  return (
    <Box sx={{p:3}}>
      <Typography variant="h4" gutterBottom>작업자별 작업 통계 (전표별)</Typography>
      <Box sx={{display:'flex',gap:2,mb:2}}>
        <TextField type="date" size="small" label="시작" InputLabelProps={{shrink:true}} value={start} onChange={e=>setStart(e.target.value)} />
        <TextField type="date" size="small" label="종료" InputLabelProps={{shrink:true}} value={end} onChange={e=>setEnd(e.target.value)} />
      </Box>

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>순위</TableCell>
              <TableCell>작업자</TableCell>
              <TableCell>전표명</TableCell>
              <TableCell align="right">정상</TableCell>
              <TableCell align="right">불량</TableCell>
              <TableCell align="right">보류</TableCell>
              <TableCell>첫 스캔</TableCell>
              <TableCell>마지막 스캔</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {renderRows()}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default WorkersStats; 
