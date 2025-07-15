import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  TablePagination,
  useTheme,
  useMediaQuery,
  Grid
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { Visibility, Search, Delete, Edit, SpeakerNotes } from '@mui/icons-material';
import { fetchWithAuth } from '../utils/api';
import { useSnackbar } from 'notistack';

const InspectionList = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // 검수 목록 조회
  const fetchInspections = async () => {
    try {
      const data = await fetchWithAuth('/api/inspections');
      setInspections(data);
    } catch (error) {
      console.error('검수 목록 조회 실패:', error);
      enqueueSnackbar('검수 목록을 불러오는데 실패했습니다.', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, []);

  useEffect(()=>{
    const handleFocus = () => {
      if(sessionStorage.getItem('inspections_need_refresh')==='1'){
        fetchInspections();
        sessionStorage.removeItem('inspections_need_refresh');
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // 최신 순 정렬 후 필터링
  const sorted = [...inspections].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const filteredInspections = sorted.filter(inspection => {
    const slipName = (inspection.inspectionName || inspection.inspectionSlipName || '').toLowerCase();
    const company = (inspection.company || '').toLowerCase();
    const matchesSearch = slipName.includes(searchTerm.toLowerCase()) || company.includes(searchTerm.toLowerCase());
    const matchesCompany = (user.role === 'operator') ? true : (!companyFilter || inspection.company === companyFilter);
    const matchesStatus = !statusFilter || inspection.status === statusFilter || inspection.workStatus === statusFilter;
    const created = new Date(inspection.createdAt);
    const matchesStart = !startDate || created >= new Date(startDate);
    const matchesEnd = !endDate || created <= new Date(endDate+'T23:59:59');
    return matchesSearch && matchesCompany && matchesStatus && matchesStart && matchesEnd;
  });

  const paginatedInspections = filteredInspections.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // 상태별 칩 색상
  const getStatusColor = (status, workStatus) => {
    const s = status || workStatus;
    switch (s) {
      case 'pending':        return 'warning';
      case 'approved':       return 'success';
      case 'rejected':       return 'error';
      case 'in_progress':    return 'info';
      case 'completed':      return 'primary';
      case 'error':          return 'error';
      default:               return 'default';
    }
  };

  // 상태별 한글 표시
  const getStatusLabel = (status, workStatus) => {
    const s = status || workStatus;
    switch (s) {
      case 'pending':      return '대기중';
      case 'approved':     return '확정';
      case 'rejected':     return '반려';
      case 'in_progress':  return '작업중';
      case 'completed':    return '완료';
      case 'error':        return '오류';
      default:             return s || '-';
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('해당 검수 전표를 삭제하시겠습니까?')) return;
    try {
      await fetchWithAuth(`/api/inspections/${id}`, { method: 'DELETE' });
      enqueueSnackbar('검수 전표가 삭제되었습니다.', { variant: 'success' });
      fetchInspections();
    } catch (error) {
      enqueueSnackbar(error.message || '삭제 중 오류가 발생했습니다.', { variant: 'error' });
    }
  };

  // 필터 변경 시 첫 페이지로 이동
  useEffect(()=>{ setPage(0); }, [searchTerm, companyFilter, statusFilter, startDate, endDate]);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display:'flex', alignItems:'center', gap:2, flexWrap:'wrap', mb:3, justifyContent:{ xs:'flex-start', md:'space-between' } }}>
        {user.role !== 'operator' && (
          <Button variant="contained" onClick={() => navigate('/inspections/register')} sx={{ order:{ xs:-1, md:0 } }}>
            검수 등록
          </Button>
        )}
        <Typography variant="h5" sx={{ m:0, flexGrow:1 }}>검수 목록</Typography>
      </Box>
      
      {/* 필터 및 검색 */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          label="검색"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 200 }}
        />
        {user.role !== 'operator' && (
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>업체</InputLabel>
          <Select
            value={companyFilter}
            label="업체"
            onChange={(e) => setCompanyFilter(e.target.value)}
          >
            <MenuItem value="">전체</MenuItem>
            {[...new Set(inspections.map(i => i.company))].map(company => (
              <MenuItem key={company} value={company}>{company}</MenuItem>
            ))}
          </Select>
        </FormControl>
        )}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>상태</InputLabel>
          <Select
            value={statusFilter}
            label="상태"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="">전체</MenuItem>
            <MenuItem value="pending">대기중</MenuItem>
            <MenuItem value="approved">확정</MenuItem>
            <MenuItem value="rejected">반려</MenuItem>
            <MenuItem value="in_progress">작업중</MenuItem>
            <MenuItem value="completed">완료</MenuItem>
            <MenuItem value="error">오류</MenuItem>
          </Select>
        </FormControl>
        <TextField type="date" size="small" label="시작일" InputLabelProps={{shrink:!!startDate}} value={startDate} onChange={e=>setStartDate(e.target.value)} />
        <TextField type="date" size="small" label="종료일" InputLabelProps={{shrink:!!endDate}} value={endDate} onChange={e=>setEndDate(e.target.value)} />
      </Box>

      {/* 검수 목록 테이블 */}
      {isMobile ? (
        <Grid container spacing={2}>
          {paginatedInspections.map((inspection, idx)=>(
            <Grid item xs={12} key={inspection.id}>
              <Paper sx={{ p:2 }}>
                <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <Box onClick={()=>navigate(`/inspections/${inspection.id}`)} sx={{ cursor:'pointer' }}>
                    <Typography variant="subtitle2">{inspection.inspectionName || inspection.inspectionSlipName}</Typography>
                    <Typography variant="body2" color="text.secondary">{new Date(inspection.createdAt).toLocaleString()}</Typography>
                  </Box>
                  <Chip label={getStatusLabel(inspection.status, inspection.workStatus)} color={getStatusColor(inspection.status, inspection.workStatus)} size="small" />
                </Box>
                <Box sx={{ mt:1, display:'flex', gap:1 }}>
                  <IconButton size="small" onClick={() => navigate(`/inspections/${inspection.id}`)}>
                    <Visibility fontSize="small" />
                  </IconButton>
                  {user.role !== 'operator' && (
                    <>
                      <IconButton size="small" onClick={() => navigate(`/inspections/${inspection.id}?edit=1`)}>
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(inspection.id)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 1100 }}>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>검수전표명</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>업체</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>검수자</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>검수일시</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedInspections.map((inspection, idx) => (
                <TableRow key={inspection.id}>
                  <TableCell>{filteredInspections.length - (page * rowsPerPage + idx)}</TableCell>
                  <TableCell
                    sx={{ cursor:'pointer', textDecoration:'underline' }}
                    onClick={() => navigate(`/inspections/${inspection.id}`)}
                  >
                    {inspection.inspectionName || inspection.inspectionSlipName}
                    {inspection.hasNew && (
                      <Chip
                        size="small"
                        color="error"
                        icon={<SpeakerNotes fontSize="small" />}
                        label="새 댓글"
                        sx={{ ml:0.5 }}
                        onClick={() => {}}
                      />
                    )}
                    {inspection.hasNewComment && (
                      <Chip
                        size="small"
                        color="warning"
                        icon={<SpeakerNotes fontSize="small" />}
                        label="새 코멘트"
                        sx={{ ml:0.5 }}
                        onClick={() => {}}
                      />
                    )}
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{inspection.company}</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{inspection.inspector?.name || inspection.inspector?.username || '-'}</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{new Date(inspection.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(inspection.status, inspection.workStatus)}
                      color={getStatusColor(inspection.status, inspection.workStatus)}
                      size="small"
                      onClick={() => {}}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => navigate(`/inspections/${inspection.id}`)}>
                      <Visibility />
                    </IconButton>
                    {user.role !== 'operator' && (
                      <>
                        <IconButton size="small" onClick={() => navigate(`/inspections/${inspection.id}?edit=1`)}>
                          <Edit />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(inspection.id)}>
                          <Delete />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 페이징 */}
      <Box sx={{ display:'flex', justifyContent:'center', mt:2 }}>
        <TablePagination
          component="div"
          rowsPerPageOptions={[10, 30, 50, 100]}
          count={filteredInspections.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{ '& .MuiTablePagination-toolbar': { flexWrap:'nowrap' } }}
        />
      </Box>
    </Box>
  );
};

export default InspectionList; 
