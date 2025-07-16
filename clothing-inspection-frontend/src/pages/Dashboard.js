import React, { useState, useEffect } from 'react';
import { Container, Grid, Paper, Typography, TextField, Button, Table, TableHead, TableRow, TableCell, TableBody, TableSortLabel, List, ListItem, ListItemText, Chip } from '@mui/material';
import dayjs from 'dayjs';
import { fetchWithAuth } from '../utils/api';

function Dashboard() {
  const todayStr = new Date().toISOString().slice(0,10);
  const [start, setStart] = useState(todayStr);
  const [end, setEnd] = useState(todayStr);
  const [data, setData] = useState({ wholesalerStats: [], operatorStats: [], summary:{} });
  const [logs, setLogs] = useState([]);
  const [wsOrderBy,setWsOrderBy] = useState('wholesaler');
  const [wsOrderDir,setWsOrderDir] = useState('asc');
  const [opOrderBy,setOpOrderBy] = useState('company');
  const [opOrderDir,setOpOrderDir] = useState('asc');

  const getComparator = (order, orderBy) => {
    return order==='desc'
      ? (a,b)=> (b[orderBy] < a[orderBy] ? -1 : b[orderBy] > a[orderBy] ? 1 : 0)
      : (a,b)=> (a[orderBy] < b[orderBy] ? -1 : a[orderBy] > b[orderBy] ? 1 : 0);
  };

  const handleSort = (table, column)=>{
    if(table==='ws'){
      const isAsc = wsOrderBy===column && wsOrderDir==='asc';
      setWsOrderBy(column);
      setWsOrderDir(isAsc?'desc':'asc');
    }else{
      const isAsc = opOrderBy===column && opOrderDir==='asc';
      setOpOrderBy(column);
      setOpOrderDir(isAsc?'desc':'asc');
    }
  };

  const fetchData = async ()=>{
    try{
      const [statsRes, logRes] = await Promise.all([
        fetchWithAuth(`/api/admin/stats/overview?start=${start}&end=${end}`),
        fetchWithAuth(`/api/admin/activity?start=${start}&end=${end}`)
      ]);
      setData(statsRes);
      setLogs(logRes);
    }catch(err){
      console.error(err);
    }
  };

  useEffect(()=>{ fetchData(); /* eslint-disable-next-line */ },[]);

  return (
    <Container maxWidth="xl" sx={{ mt:4 }}>
      <Typography variant="h4" gutterBottom>관리자 대시보드</Typography>
      <Paper sx={{ p:2, mb:3 }}>
        <Typography variant="h6" gutterBottom>기간 선택</Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <TextField type="date" label="시작" value={start} onChange={e=>setStart(e.target.value)} InputLabelProps={{ shrink:true }}/>
          </Grid>
          <Grid item>
            <TextField type="date" label="끝" value={end} onChange={e=>setEnd(e.target.value)} InputLabelProps={{ shrink:true }}/>
          </Grid>
          <Grid item>
            <Button variant="contained" onClick={fetchData}>조회</Button>
          </Grid>
        </Grid>
      </Paper>

      {/* 요약 카드 */}
      <Grid container spacing={3} sx={{ mb:3 }}>
        {[
          { label:'총 SKU', value:data.summary.totalSkus },
          { label:'작업자 수', value:data.summary.workerCount },
          { label:'검수자 수', value:data.summary.inspectorCount },
          { label:'운영자 수', value:data.summary.operatorCount }
        ].map(card=>(
          <Grid item xs={12} sm={6} md={3} key={card.label}>
            <Paper sx={{ p:2, textAlign:'center' }}>
              <Typography color="textSecondary">{card.label}</Typography>
              <Typography variant="h3">{card.value ?? '-'}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* 도매처별 통계 */}
      <Paper sx={{ p:2, mb:3 }}>
        <Typography variant="h6" gutterBottom>도매처별 통계</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel active={wsOrderBy==='wholesaler'} direction={wsOrderDir} onClick={()=>handleSort('ws','wholesaler')}>도매처</TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel active={wsOrderBy==='inbound'} direction={wsOrderDir} onClick={()=>handleSort('ws','inbound')}>입고량</TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel active={wsOrderBy==='defect'} direction={wsOrderDir} onClick={()=>handleSort('ws','defect')}>불량</TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel active={wsOrderBy==='defectRate'} direction={wsOrderDir} onClick={()=>handleSort('ws','defectRate')}>불량률(%)</TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...data.wholesalerStats].sort(getComparator(wsOrderDir, wsOrderBy)).map(ws=>(
              <TableRow key={ws.wholesaler}>
                <TableCell>{ws.wholesaler}</TableCell>
                <TableCell align="right">{ws.inbound}</TableCell>
                <TableCell align="right">{ws.defect}</TableCell>
                <TableCell align="right">{ws.defectRate}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* 업체(운영자)별 통계 */}
      <Paper sx={{ p:2 }}>
        <Typography variant="h6" gutterBottom>업체별 통계</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel active={opOrderBy==='company'} direction={opOrderDir} onClick={()=>handleSort('op','company')}>업체</TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel active={opOrderBy==='inbound'} direction={opOrderDir} onClick={()=>handleSort('op','inbound')}>입고량</TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel active={opOrderBy==='defect'} direction={opOrderDir} onClick={()=>handleSort('op','defect')}>불량</TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel active={opOrderBy==='defectRate'} direction={opOrderDir} onClick={()=>handleSort('op','defectRate')}>불량률(%)</TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...data.operatorStats].sort(getComparator(opOrderDir, opOrderBy)).map(os=>(
              <TableRow key={os.company}>
                <TableCell>{os.company}</TableCell>
                <TableCell align="right">{os.inbound}</TableCell>
                <TableCell align="right">{os.defect}</TableCell>
                <TableCell align="right">{os.defectRate}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* 주요 이벤트 로그 */}
      <Paper sx={{ p:2, mt:3 }}>
        <Typography variant="h6" gutterBottom>주요 이벤트 로그</Typography>
        <List sx={{ maxHeight:300, overflow:'auto' }}>
          {logs.map(l=>(
            <ListItem key={l.id} alignItems="flex-start">
              <Chip label={dayjs(l.createdAt).format('MM-DD HH:mm')} size="small" sx={{ mr:2 }} onClick={()=>{}} />
              <Chip label={l.level} color={l.level==='error'?'error':l.level==='warn'?'warning':'info'} size="small" sx={{ mr:1 }} onClick={()=>{}} />
              <ListItemText primary={l.message + (l.inspectionName?` (${l.inspectionName})`:'')} secondary={l.user || ''} />
            </ListItem>
          ))}
          {logs.length===0 && <Typography variant="body2">로그가 없습니다.</Typography>}
        </List>
      </Paper>

    </Container>
  );
}

export default Dashboard; 
