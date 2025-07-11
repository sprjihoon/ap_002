import React, { useEffect, useState } from 'react';
import { Box, Typography, TextField, Paper, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Tooltip, FormControl, InputLabel, Select, MenuItem, InputAdornment } from '@mui/material';
import { fetchWithAuth } from '../utils/api';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';

const DefectList = () => {
  const today = new Date().toISOString().substring(0,10);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [companyFilter,setCompanyFilter]=useState('');
  const [workerFilter,setWorkerFilter]=useState('');
  const [inspectorFilter,setInspectorFilter]=useState('');
  const [searchTerm,setSearchTerm]=useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = (user.role||'').toLowerCase();

  const load = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('start', start);
      params.append('end', end);
      if(companyFilter) params.append('company', companyFilter);
      if(workerFilter) params.append('workerId', workerFilter);
      if(inspectorFilter) params.append('inspectorId', inspectorFilter);
      if(searchTerm) params.append('q', searchTerm);
      const data = await fetchWithAuth(`/api/defects?${params.toString()}`);
      setRows(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [start, end, companyFilter, workerFilter, inspectorFilter, searchTerm]);

  // derive filter options from rows
  const companies = [...new Set(rows.map(r=>r.company).filter(Boolean))];
  const inspectors = [...new Map(rows.filter(r=>r.inspectorId).map(r=>[r.inspectorId, r.inspectorName])).entries()].map(([id,name])=>({id,name}));
  const workers   = [...new Map(rows.filter(r=>r.workerId).map(r=>[r.workerId,r.workerName])).entries()].map(([id,name])=>({id,name}));

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display:'flex', alignItems:'center', mb:2 }}>
        <Typography variant="h4" sx={{ flexGrow:1 }}>불량 내역</Typography>
        <Tooltip title="새로고침"><IconButton onClick={load} disabled={loading}><RefreshIcon /></IconButton></Tooltip>
      </Box>
      <Box sx={{ display:'flex', gap:2, mb:2, flexWrap:'wrap' }}>
        <TextField label="시작" type="date" size="small" InputLabelProps={{ shrink:true }} value={start} onChange={e=>setStart(e.target.value)} />
        <TextField label="종료" type="date" size="small" InputLabelProps={{ shrink:true }} value={end} onChange={e=>setEnd(e.target.value)} />

        {/* Filters */}
        {role!=='operator' && (
          <FormControl size="small" sx={{ minWidth:120 }}>
            <InputLabel>업체</InputLabel>
            <Select value={companyFilter} label="업체" onChange={e=>setCompanyFilter(e.target.value)}>
              <MenuItem value="">전체</MenuItem>
              {companies.map(c=>(<MenuItem key={c} value={c}>{c}</MenuItem>))}
            </Select>
          </FormControl>
        )}
        <FormControl size="small" sx={{ minWidth:120 }}>
          <InputLabel>작업자</InputLabel>
          <Select value={workerFilter} label="작업자" onChange={e=>setWorkerFilter(e.target.value)}>
            <MenuItem value="">전체</MenuItem>
            {workers.map(w=>(<MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth:120 }}>
          <InputLabel>검수자</InputLabel>
          <Select value={inspectorFilter} label="검수자" onChange={e=>setInspectorFilter(e.target.value)}>
            <MenuItem value="">전체</MenuItem>
            {inspectors.map(i=>(<MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          label="검색"
          value={searchTerm}
          onChange={e=>setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment:(<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>)
          }}
          sx={{ minWidth:200 }}
        />
      </Box>

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>전표명</TableCell>
              <TableCell>업체</TableCell>
              <TableCell>상품</TableCell>
              <TableCell>도매처</TableCell>
              <TableCell>바코드</TableCell>
              <TableCell align="right">검수불량</TableCell>
              <TableCell align="right">처리불량</TableCell>
              <TableCell>작업자</TableCell>
              <TableCell>검수자</TableCell>
              <TableCell>발견일</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(r=>(
              <TableRow key={r.id}>
                <TableCell>{r.inspectionName}</TableCell>
                <TableCell>{r.company}</TableCell>
                <TableCell>{r.productName}</TableCell>
                <TableCell>{r.wholesaler}</TableCell>
                <TableCell>{r.barcode}</TableCell>
                <TableCell align="right">{r.defectQuantity}</TableCell>
                <TableCell align="right">{r.handledDefect}</TableCell>
                <TableCell>{r.workerName}</TableCell>
                <TableCell>{r.inspectorName}</TableCell>
                <TableCell>{r.updatedAt?.substring(0,10)}</TableCell>
              </TableRow>
            ))}
            {rows.length===0 && !loading && (
              <TableRow><TableCell colSpan={8} align="center">데이터가 없습니다.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default DefectList; 
