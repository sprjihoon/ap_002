import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TablePagination,
  IconButton,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { Delete, Visibility } from '@mui/icons-material';
import { fetchWithAuth } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const WorkerWorkHistory = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [data, setData] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [error, setError] = useState('');
  const [openDetail,setOpenDetail]=useState(false);
  const [detail,setDetail]=useState(null);
  const [saving,setSaving]=useState(false);
  const [companyFilter,setCompanyFilter] = useState('');
  const todayStr = new Date().toISOString().slice(0,10);
  const [startDate,setStartDate] = useState(todayStr);
  const [endDate,setEndDate] = useState(todayStr);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const list = await fetchWithAuth('/worker/history');
      setData(list);
    } catch (err) {
      console.error(err);
    }
  };

  const viewDetail = async(id)=>{
    try{
      const insp = await fetchWithAuth(`/api/worker/history/${id}`);
      setDetail(insp);
      setOpenDetail(true);
    }catch(err){ setError(err.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('완료 내역을 삭제하여 전표를 다시 작업 상태로 돌리시겠습니까?')) return;
    try {
      await fetchWithAuth(`/api/worker/history/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSave=async()=>{
    if(!detail) return;
    setSaving(true);
    try{
      for(const d of detail.InspectionDetails){
        await fetchWithAuth(`/api/worker/history/details/${d.id}`, {
          method:'PUT',
          body: JSON.stringify({ handledNormal:d.handledNormal, handledDefect:d.handledDefect, handledHold:d.handledHold, qualityGrade:d.qualityGrade||null })
        });
      }
      setOpenDetail(false);
      load();
    }catch(err){ setError(err.message); }
    setSaving(false);
  };

  const filtered = data.filter(row=>{
    const matchesCompany = !companyFilter || row.company===companyFilter;
    const created = new Date(row.createdAt);
    const matchesStart = !startDate || created >= new Date(startDate);
    const matchesEnd = !endDate || created <= new Date(endDate+'T23:59:59');
    return matchesCompany && matchesStart && matchesEnd;
  });
  const paged = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const updateDetail = (idx, field, val) => {
    setDetail(prev => {
      const copy = { ...prev };
      const det = { ...copy.InspectionDetails[idx] };
      const total = det.totalQuantity;
      const num = Math.max(0, parseInt(val || 0, 10));

      if (field === 'handledNormal') {
        det.handledNormal = num;
        // 자동 보정: 불량 = total - 정상 (보류 0 기준)
        det.handledDefect = Math.max(0, total - num - (det.handledHold || 0));
      } else if (field === 'handledDefect') {
        det.handledDefect = num;
        det.handledNormal = Math.max(0, total - num - (det.handledHold || 0));
      } else if (field === 'handledHold') {
        det.handledHold = num;
        const remaining = total - num;
        // 비율 유지: 정상값 유지, 불량 = remaining - 정상
        det.handledDefect = Math.max(0, remaining - det.handledNormal);
        if (det.handledNormal + det.handledDefect + num > total) {
          det.handledNormal = Math.max(0, total - num - det.handledDefect);
        }
      } else if (field === 'qualityGrade') {
        det.qualityGrade = val;
      }

      // ensure 합계 <= total
      const sum = det.handledNormal + det.handledDefect + (det.handledHold || 0);
      if (sum > total) {
        det.handledHold = Math.max(0, total - det.handledNormal - det.handledDefect);
      }

      copy.InspectionDetails[idx] = det;
      return copy;
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>작업 완료 내역</Typography>
      {/* 필터 */}
      <Box sx={{ mb:2, display:'flex', gap:2, flexWrap:'wrap' }}>
        <FormControl size="small" sx={{ minWidth:150 }}>
          <InputLabel>업체</InputLabel>
          <Select value={companyFilter} label="업체" onChange={e=>{setCompanyFilter(e.target.value); setPage(0);}}>
            <MenuItem value="">전체</MenuItem>
            {[...new Set(data.map(d=>d.company))].map(c=>(<MenuItem key={c} value={c}>{c}</MenuItem>))}
          </Select>
        </FormControl>
        <TextField type="date" size="small" label="시작일" InputLabelProps={{shrink:true}} value={startDate} onChange={e=>setStartDate(e.target.value)} />
        <TextField type="date" size="small" label="종료일" InputLabelProps={{shrink:true}} value={endDate} onChange={e=>setEndDate(e.target.value)} />
      </Box>

      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 1200 }}>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>전표명</TableCell>
              <TableCell>업체</TableCell>
              <TableCell>작업자</TableCell>
              <TableCell>완료일</TableCell>
              <TableCell>시작</TableCell>
              <TableCell>완료</TableCell>
              <TableCell align="right">정상</TableCell>
              <TableCell align="right">불량</TableCell>
              <TableCell align="right">보류</TableCell>
              <TableCell>결과</TableCell>
              <TableCell>작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.map((row, idx) => (
              <TableRow key={row.id}>
                <TableCell>{data.length - (page * rowsPerPage + idx)}</TableCell>
                <TableCell>{row.inspectionName}</TableCell>
                <TableCell>{row.company}</TableCell>
                <TableCell>{row.worker?.name || row.worker?.username || '-'}</TableCell>
                <TableCell>{new Date(row.updatedAt).toLocaleDateString()}</TableCell>
                <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
                <TableCell>{new Date(row.updatedAt).toLocaleString()}</TableCell>
                <TableCell align="right">{row.totalNormal}</TableCell>
                <TableCell align="right">{row.totalDefect}</TableCell>
                <TableCell align="right">{row.totalHold}</TableCell>
                <TableCell>
                  <Chip label={row.workStatus==='completed'?'완료':''} color="success" size="small" />
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={()=>viewDetail(row.id)}>
                    <Visibility fontSize="small" />
                  </IconButton>
                  {isAdmin && (
                    <IconButton size="small" color="error" onClick={()=>handleDelete(row.id)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{display:'flex', justifyContent:'center', mt:2}}>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(e,newPage)=>setPage(newPage)}
          onRowsPerPageChange={e=>{setRowsPerPage(parseInt(e.target.value,10)); setPage(0);}}
          rowsPerPageOptions={[10,30,50]}
        />
      </Box>

      {/* 상세 다이얼로그 */}
      <Dialog open={openDetail} onClose={()=>setOpenDetail(false)} maxWidth="md" fullWidth>
        <DialogTitle>작업 상세</DialogTitle>
        <DialogContent dividers>
          {detail && (
            <>
              <Typography variant="h6">전표 정보</Typography>
              <Typography>전표명: {detail.inspectionName}</Typography>
              <Typography>업체: {detail.company}</Typography>
              <Typography>작업자: {detail.worker?.name || detail.worker?.username}</Typography>
              <Typography>작업 시작: {new Date(detail.createdAt).toLocaleString()}</Typography>
              <Typography>완료 시간: {new Date(detail.updatedAt).toLocaleString()}</Typography>

              <TableContainer component={Paper} sx={{ mt:2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>바코드</TableCell>
                      <TableCell align="right">총수량</TableCell>
                      <TableCell align="right">정상</TableCell>
                      <TableCell align="right">불량</TableCell>
                      <TableCell align="right">보류</TableCell>
                      <TableCell align="center">품질등급</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detail.InspectionDetails.map((d,idx)=> (
                      <TableRow key={d.id}>
                        <TableCell>{d.ProductVariant?.barcode}</TableCell>
                        <TableCell align="right">{d.totalQuantity}</TableCell>
                        <TableCell align="right"><TextField type="number" size="small" value={d.handledNormal} onChange={e=>updateDetail(idx,'handledNormal',e.target.value)}/></TableCell>
                        <TableCell align="right"><TextField type="number" size="small" value={d.handledDefect} onChange={e=>updateDetail(idx,'handledDefect',e.target.value)}/></TableCell>
                        <TableCell align="right"><TextField type="number" size="small" value={d.handledHold} onChange={e=>updateDetail(idx,'handledHold',e.target.value)}/></TableCell>
                        <TableCell align="center">
                          <Select size="small" value={d.qualityGrade || ''} onChange={e=>updateDetail(idx,'qualityGrade',e.target.value)} displayEmpty>
                            <MenuItem value=""><em>없음</em></MenuItem>
                            {['A','B','C','D','E'].map(g=>(<MenuItem key={g} value={g}>{g}</MenuItem>))}
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* 작업자별 처리 건수 */}
              {detail.contributions && detail.contributions.length>0 && (
                <TableContainer component={Paper} sx={{ mt:2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>작업자</TableCell>
                        <TableCell align="right">정상</TableCell>
                        <TableCell align="right">불량</TableCell>
                        <TableCell align="right">보류</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detail.contributions.map(c=>(
                        <TableRow key={c.userId}>
                          <TableCell>{c.username}</TableCell>
                          <TableCell align="right">{c.normal}</TableCell>
                          <TableCell align="right">{c.defect}</TableCell>
                          <TableCell align="right">{c.hold}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              <TableContainer component={Paper} sx={{ mt:2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>바코드</TableCell>
                      <TableCell align="right">총수량</TableCell>
                      <TableCell align="right">정상</TableCell>
                      <TableCell align="right">불량</TableCell>
                      <TableCell align="right">보류</TableCell>
                      <TableCell align="center">품질등급</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detail.InspectionDetails.map((d,idx)=> (
                      <TableRow key={d.id}>
                        <TableCell>{d.ProductVariant?.barcode}</TableCell>
                        <TableCell align="right">{d.totalQuantity}</TableCell>
                        <TableCell align="right">{d.handledNormal}</TableCell>
                        <TableCell align="right">{d.handledDefect}</TableCell>
                        <TableCell align="right">{d.handledHold}</TableCell>
                        <TableCell align="center">{d.qualityGrade}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setOpenDetail(false)}>취소</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>{saving?'저장중':'저장'}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!error} autoHideDuration={4000} onClose={()=>setError('')}>
        <Alert severity="error">{error}</Alert>
      </Snackbar>
    </Box>
  );
};

export default WorkerWorkHistory; 
