import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import { fetchWithAuth } from '../utils/api';

const BarcodeScanPage = () => {
  const [barcode, setBarcode] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [result, setResult] = useState('pass');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // 바코드 입력 필드에 자동 포커스
  useEffect(() => {
    const barcodeInput = document.getElementById('barcode-input');
    if (barcodeInput) {
      barcodeInput.focus();
    }
  }, []);

  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    setLoading(true);
    try {
      const data = await fetchWithAuth('/inspections/scan', {
        method: 'POST',
        body: JSON.stringify({ barcode })
      });
      setScanResult(data);
      setError('');
    } catch (err) {
      setError(err.message || '바코드 스캔에 실패했습니다.');
      setScanResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleResultSubmit = async () => {
    if (!scanResult) return;

    setLoading(true);
    try {
      const data = await fetchWithAuth(
        `/inspections/${scanResult.inspection.id}/items/${scanResult.item.id}/scan-result`,
        {
          method: 'POST',
          body: JSON.stringify({
            result,
            quantity,
            note
          })
        }
      );

      setSuccess('스캔 결과가 저장되었습니다.');
      setScanResult({
        ...scanResult,
        item: {
          ...scanResult.item,
          remainingQuantity: data.remainingQuantity,
          status: data.itemStatus
        }
      });
      setQuantity(1);
      setNote('');
      setBarcode('');
      document.getElementById('barcode-input').focus();
    } catch (err) {
      setError(err.message || '결과 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        바코드 스캔
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <form onSubmit={handleBarcodeSubmit}>
              <TextField
                id="barcode-input"
                fullWidth
                label="바코드"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                disabled={loading}
                autoFocus
              />
              <Button
                type="submit"
                variant="contained"
                fullWidth
                sx={{ mt: 2 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : '스캔'}
              </Button>
            </form>
          </Paper>
        </Grid>

        {scanResult && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  전표 정보
                </Typography>
                <Typography>
                  전표번호: {scanResult.inspection.inspectionNumber}
                </Typography>
                <Typography>
                  의뢰인: {scanResult.inspection.clientName}
                </Typography>
                <Typography>
                  검수항목: {scanResult.inspection.inspectionType}
                </Typography>

                <Typography variant="h6" sx={{ mt: 2 }} gutterBottom>
                  제품 정보
                </Typography>
                <Typography>
                  제품명: {scanResult.item.product.name}
                </Typography>
                <Typography>
                  SKU: {scanResult.item.product.sku}
                </Typography>
                <Typography>
                  남은 수량: {scanResult.item.remainingQuantity}
                </Typography>

                <Box sx={{ mt: 2 }}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>결과</InputLabel>
                    <Select
                      value={result}
                      onChange={(e) => setResult(e.target.value)}
                      label="결과"
                    >
                      <MenuItem value="pass">정상</MenuItem>
                      <MenuItem value="fail">불량</MenuItem>
                      <MenuItem value="hold">보류</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    fullWidth
                    type="number"
                    label="수량"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    inputProps={{ min: 1, max: scanResult.item.remainingQuantity }}
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="메모"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    sx={{ mb: 2 }}
                  />

                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleResultSubmit}
                    disabled={loading || quantity > scanResult.item.remainingQuantity}
                  >
                    {loading ? <CircularProgress size={24} /> : '결과 저장'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

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

export default BarcodeScanPage; 