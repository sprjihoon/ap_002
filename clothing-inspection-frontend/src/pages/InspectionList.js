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
  TablePagination
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Visibility, Search } from '@mui/icons-material';
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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // 검수 목록 조회
  const fetchInspections = async () => {
    try {
      const data = await fetchWithAuth('/inspections');
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

  // 최신 순 정렬 후 필터링
  const sorted = [...inspections].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const filteredInspections = sorted.filter(inspection => {
    const slipName = (inspection.inspectionName || inspection.inspectionSlipName || '').toLowerCase();
    const company = (inspection.company || '').toLowerCase();
    const matchesSearch = slipName.includes(searchTerm.toLowerCase()) || company.includes(searchTerm.toLowerCase());
    const matchesCompany = !companyFilter || inspection.company === companyFilter;
    const matchesStatus = !statusFilter || inspection.status === statusFilter;
    return matchesSearch && matchesCompany && matchesStatus;
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
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  // 상태별 한글 표시
  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return '대기중';
      case 'approved': return '승인';
      case 'rejected': return '반려';
      default: return status;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>검수 목록</Typography>
      
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
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>상태</InputLabel>
          <Select
            value={statusFilter}
            label="상태"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="">전체</MenuItem>
            <MenuItem value="pending">대기중</MenuItem>
            <MenuItem value="approved">승인</MenuItem>
            <MenuItem value="rejected">반려</MenuItem>
          </Select>
        </FormControl>
        <Button
          variant="contained"
          onClick={() => navigate('/inspections/register')}
          sx={{ ml: 'auto' }}
        >
          검수 등록
        </Button>
      </Box>

      {/* 검수 목록 테이블 */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>검수전표명</TableCell>
              <TableCell>업체</TableCell>
              <TableCell>검수일시</TableCell>
              <TableCell>상태</TableCell>
              <TableCell>작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedInspections.map((inspection, idx) => (
              <TableRow key={inspection.id}>
                <TableCell>{page * rowsPerPage + idx + 1}</TableCell>
                <TableCell>{inspection.inspectionName || inspection.inspectionSlipName}</TableCell>
                <TableCell>{inspection.company}</TableCell>
                <TableCell>
                  {new Date(inspection.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(inspection.status)}
                    color={getStatusColor(inspection.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => navigate(`/inspections/${inspection.id}`)}
                  >
                    <Visibility />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default InspectionList; 