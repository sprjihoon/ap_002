import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress
} from '@mui/material';
import { ArrowBack, Check, Close } from '@mui/icons-material';
import axios from 'axios';
import { useSnackbar } from 'notistack';

const InspectionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // 검수 상세 정보 조회
  const fetchInspectionDetail = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/inspections/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setInspection(response.data.data || response.data);
      }
    } catch (error) {
      console.error('검수 상세 조회 실패:', error);
      enqueueSnackbar('검수 상세 정보를 불러오는데 실패했습니다.', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspectionDetail();
  }, [id]);

  // 검수 승인
  const handleApprove = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`/api/inspections/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        enqueueSnackbar('검수가 승인되었습니다.', { variant: 'success' });
        fetchInspectionDetail();
      }
    } catch (error) {
      console.error('검수 승인 실패:', error);
      enqueueSnackbar('검수 승인 중 오류가 발생했습니다.', { variant: 'error' });
    }
  };

  // 검수 반려
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      enqueueSnackbar('반려 사유를 입력해주세요.', { variant: 'error' });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`/api/inspections/${id}/reject`, {
        reason: rejectReason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        enqueueSnackbar('검수가 반려되었습니다.', { variant: 'success' });
        setRejectDialogOpen(false);
        setRejectReason('');
        fetchInspectionDetail();
      }
    } catch (error) {
      console.error('검수 반려 실패:', error);
      enqueueSnackbar('검수 반려 중 오류가 발생했습니다.', { variant: 'error' });
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!inspection) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>검수 정보를 찾을 수 없습니다.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* 헤더 */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/inspections')}
        >
          목록으로
        </Button>
        <Typography variant="h5">검수 상세</Typography>
        <Chip
          label={inspection.status === 'pending' ? '대기중' : inspection.status === 'approved' ? '승인' : '반려'}
          color={inspection.status === 'pending' ? 'warning' : inspection.status === 'approved' ? 'success' : 'error'}
          sx={{ ml: 'auto' }}
        />
      </Box>

      {/* 기본 정보 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">검수전표명</Typography>
            <Typography variant="body1">{inspection.inspectionName || inspection.inspectionSlipName}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">업체</Typography>
            <Typography variant="body1">{inspection.company}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">검수일시</Typography>
            <Typography variant="body1">
              {new Date(inspection.createdAt).toLocaleString()}
            </Typography>
          </Grid>
          {inspection.status === 'rejected' && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">반려 사유</Typography>
              <Typography variant="body1" color="error">{inspection.rejectReason}</Typography>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* 검수 상세 정보 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>검수 상세</Typography>
        {inspection.InspectionDetails?.map((detail, index) => (
          <Box key={detail.id} sx={{ mb: 3, p: 2, border: '1px solid #eee', borderRadius: 1 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              {detail.ProductVariant?.product?.productName} / {detail.ProductVariant?.size} / {detail.ProductVariant?.color}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle2" color="text.secondary">바코드</Typography>
                <Typography variant="body1">{detail.ProductVariant?.barcode}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle2" color="text.secondary">전체수량</Typography>
                <Typography variant="body1">{detail.totalQuantity}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle2" color="text.secondary">정상수량</Typography>
                <Typography variant="body1">{detail.normalQuantity}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle2" color="text.secondary">불량수량</Typography>
                <Typography variant="body1">{detail.defectQuantity}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle2" color="text.secondary">결과</Typography>
                <Typography variant="body1">{detail.result}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">코멘트</Typography>
                <Typography variant="body1">{detail.comment || '-'}</Typography>
              </Grid>
              {detail.photoUrl && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">사진</Typography>
                  <Box
                    component="img"
                    src={detail.photoUrl}
                    alt="검수 사진"
                    sx={{ maxWidth: 200, maxHeight: 200, objectFit: 'cover', borderRadius: 1 }}
                  />
                </Grid>
              )}
            </Grid>
          </Box>
        ))}
      </Paper>

      {/* 영수증/증빙 사진 */}
      {inspection.InspectionReceiptPhotos?.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>영수증/증빙 사진</Typography>
          <Grid container spacing={2}>
            {inspection.InspectionReceiptPhotos.map((photo, index) => (
              <Grid item xs={12} sm={6} md={4} key={photo.id}>
                <Box sx={{ position: 'relative' }}>
                  <Box
                    component="img"
                    src={photo.photoUrl}
                    alt={`영수증 ${index + 1}`}
                    sx={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 1 }}
                  />
                  {photo.description && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      {photo.description}
                    </Typography>
                  )}
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* 승인/반려 버튼 */}
      {inspection.status === 'pending' && (
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Close />}
            onClick={() => setRejectDialogOpen(true)}
          >
            반려
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<Check />}
            onClick={handleApprove}
          >
            승인
          </Button>
        </Box>
      )}

      {/* 반려 사유 입력 다이얼로그 */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)}>
        <DialogTitle>검수 반려</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="반려 사유"
            fullWidth
            multiline
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>취소</Button>
          <Button onClick={handleReject} color="error">반려</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InspectionDetail; 