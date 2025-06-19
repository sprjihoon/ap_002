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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Chip,
  Alert,
  Snackbar
} from '@mui/material';
import { fetchWithAuth } from '../utils/api';

const WorkerInspectionList = () => {
  const [inspections, setInspections] = useState([]);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [workStatus, setWorkStatus] = useState('');
  const [workNote, setWorkNote] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInspections();
  }, []);

  const fetchInspections = async () => {
    try {
      const data = await fetchWithAuth('/inspections/worker');
      setInspections(data);
    } catch (err) {
      setError('검수전표를 불러오는데 실패했습니다.');
    }
  };

  const handleViewDetails = (inspection) => {
    setSelectedInspection(inspection);
    setWorkStatus(inspection.workStatus || 'pending');
    setWorkNote(inspection.workNote || '');
    setOpenDialog(true);
  };

  const handleStatusChange = async () => {
    try {
      await fetchWithAuth(`/inspections/${selectedInspection.id}/work-status`, {
        method: 'PUT',
        body: JSON.stringify({
          workStatus,
          workNote
        })
      });
      setSuccess('작업 상태가 업데이트되었습니다.');
      setOpenDialog(false);
      fetchInspections();
    } catch (err) {
      setError('작업 상태 업데이트에 실패했습니다.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'in_progress':
        return 'info';
      case 'completed':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return '대기중';
      case 'in_progress':
        return '작업중';
      case 'completed':
        return '완료';
      default:
        return '알 수 없음';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        검수전표 목록
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>전표번호</TableCell>
              <TableCell>의뢰인</TableCell>
              <TableCell>검수항목</TableCell>
              <TableCell>작업상태</TableCell>
              <TableCell>작업일자</TableCell>
              <TableCell>작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inspections.map((inspection) => (
              <TableRow key={inspection.id}>
                <TableCell>{inspection.inspectionNumber}</TableCell>
                <TableCell>{inspection.clientName}</TableCell>
                <TableCell>{inspection.inspectionType}</TableCell>
                <TableCell>
                  <Chip
                    label={getStatusText(inspection.workStatus)}
                    color={getStatusColor(inspection.workStatus)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {inspection.workDate ? new Date(inspection.workDate).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleViewDetails(inspection)}
                  >
                    상세보기
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>검수전표 상세</DialogTitle>
        <DialogContent>
          {selectedInspection && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="h6">기본 정보</Typography>
                <Typography>전표번호: {selectedInspection.inspectionNumber}</Typography>
                <Typography>의뢰인: {selectedInspection.clientName}</Typography>
                <Typography>검수항목: {selectedInspection.inspectionType}</Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6">검수 내용</Typography>
                <Typography>{selectedInspection.inspectionDetails}</Typography>
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>작업 상태</InputLabel>
                  <Select
                    value={workStatus}
                    onChange={(e) => setWorkStatus(e.target.value)}
                    label="작업 상태"
                  >
                    <MenuItem value="pending">대기중</MenuItem>
                    <MenuItem value="in_progress">작업중</MenuItem>
                    <MenuItem value="completed">완료</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="작업 메모"
                  value={workNote}
                  onChange={(e) => setWorkNote(e.target.value)}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button onClick={handleStatusChange} variant="contained">
            상태 업데이트
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess('')}
      >
        <Alert severity="success">{success}</Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
      >
        <Alert severity="error">{error}</Alert>
      </Snackbar>
    </Box>
  );
};

export default WorkerInspectionList; 