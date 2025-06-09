import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Typography,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Snackbar,
  Alert,
  Grid,
  Chip
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, Add as AddIcon } from '@mui/icons-material';
import { fetchWithAuth, API_URL } from '../utils/api';

function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    company: '',
    productName: '',
    size: '',
    color: '',
    wholesaler: '',
    wholesalerProductName: '',
    location: '',
    variants: []
  });

  const fetchProducts = async () => {
    try {
      const data = await fetchWithAuth('/products');
      setProducts(data);
    } catch (error) {
      setError('제품 목록을 불러오는데 실패했습니다.');
    }
  };

  const fetchCompanies = async () => {
    try {
      const data = await fetchWithAuth('/products/companies');
      setCompanies(data);
    } catch (error) {
      setError('업체 목록을 불러오는데 실패했습니다.');
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCompanies();
  }, []);

  const handleOpen = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        company: product.company,
        productName: product.productName,
        size: product.size.join(','),
        color: product.color.join(','),
        wholesaler: product.wholesaler,
        wholesalerProductName: product.wholesalerProductName,
        location: product.location,
        variants: product.ProductVariants.map(v => ({
          size: v.size,
          color: v.color,
          barcode: v.barcode
        }))
      });
    } else {
      setEditingProduct(null);
      setFormData({
        company: '',
        productName: '',
        size: '',
        color: '',
        wholesaler: '',
        wholesalerProductName: '',
        location: '',
        variants: []
      });
    }
    setOpenDialog(true);
  };

  const handleClose = () => {
    setOpenDialog(false);
    setEditingProduct(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleVariantBarcodeChange = (index, value) => {
    const newVariants = [...formData.variants];
    newVariants[index] = {
      ...newVariants[index],
      barcode: value
    };
    setFormData(prev => ({
      ...prev,
      variants: newVariants
    }));
  };

  const computeVariants = (sizeStr, colorStr, prevVariants=[]) => {
    const sizesArr = sizeStr.split(',').map(s=>s.trim()).filter(Boolean);
    const colorsArr = colorStr.split(',').map(c=>c.trim()).filter(Boolean);
    const effectiveSizes = sizesArr.length?sizesArr:[null];
    const effectiveColors = colorsArr.length?colorsArr:[null];
    const combined=[];
    for(const s of effectiveSizes){
      for(const c of effectiveColors){
        const existing=prevVariants.find(v=>v.size===s&&v.color===c);
        combined.push({size:s,color:c,barcode:existing?existing.barcode:''});
      }
    }
    return combined;
  };

  useEffect(()=>{
    setFormData(prev=>({
      ...prev,
      variants: computeVariants(prev.size, prev.color, prev.variants)
    }));
  },[formData.size, formData.color]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingProduct 
        ? `${API_URL}/products/${editingProduct.id}`
        : `${API_URL}/products`;
      
      const response = await fetch(url, {
        method: editingProduct ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '제품 등록에 실패했습니다.');
      }

      setSuccess(data.message);
      setOpenDialog(false);
      setEditingProduct(null);
      setFormData({
        company: '',
        productName: '',
        size: '',
        color: '',
        wholesaler: '',
        wholesalerProductName: '',
        location: '',
        variants: []
      });
      
      fetchProducts();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('정말로 이 제품을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await fetchWithAuth(`/products/${id}`, {
        method: 'DELETE'
      });
      setSuccess('제품이 삭제되었습니다.');
      fetchProducts();
    } catch (error) {
      setError('제품 삭제에 실패했습니다.');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch(`${API_URL}/upload/excel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: form
      });
      const data = await res.json();
      alert(`${data.results.filter(r=>r.status==='ok').length} 건 성공 / ${data.results.filter(r=>r.status==='fail').length} 건 실패`);
      fetchProducts();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            제품 관리
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
          >
            제품 등록
          </Button>
        </Box>
        
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>업체명</TableCell>
                <TableCell>제품명</TableCell>
                <TableCell>사이즈</TableCell>
                <TableCell>컬러</TableCell>
                <TableCell>바코드</TableCell>
                <TableCell>도매처명</TableCell>
                <TableCell>도매처제품명</TableCell>
                <TableCell>로케이션</TableCell>
                <TableCell>등록일</TableCell>
                <TableCell>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.id}</TableCell>
                  <TableCell>{product.company}</TableCell>
                  <TableCell>{product.productName}</TableCell>
                  <TableCell>{product.size.join(', ')}</TableCell>
                  <TableCell>{product.color.join(', ')}</TableCell>
                  <TableCell>
                    {product.ProductVariants.map((variant, index) => (
                      <Chip
                        key={index}
                        label={`${variant.size}/${variant.color}: ${variant.barcode}`}
                        size="small"
                        style={{ margin: '2px' }}
                      />
                    ))}
                  </TableCell>
                  <TableCell>{product.wholesaler}</TableCell>
                  <TableCell>{product.wholesalerProductName}</TableCell>
                  <TableCell>{product.location}</TableCell>
                  <TableCell>{formatDate(product.createdAt)}</TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => handleOpen(product)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(product.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog 
          open={openDialog} 
          onClose={handleClose}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {editingProduct ? '제품 정보 수정' : '제품 등록'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} style={{ marginTop: '8px' }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="업체명"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  required
                >
                  {companies.map((company) => (
                    <MenuItem key={company} value={company}>
                      {company}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="제품명"
                  name="productName"
                  value={formData.productName}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="사이즈 (쉼표로 구분)"
                  name="size"
                  value={formData.size}
                  onChange={handleInputChange}
                  helperText="예: 1,2,3 (비워두면 원사이즈)"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="컬러 (쉼표로 구분)"
                  name="color"
                  value={formData.color}
                  onChange={handleInputChange}
                  helperText="예: 블랙,화이트 (비워두면 단일 컬러)"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="도매처명"
                  name="wholesaler"
                  value={formData.wholesaler}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="도매처제품명"
                  name="wholesalerProductName"
                  value={formData.wholesalerProductName}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="로케이션 (선택)"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  바코드 입력
                </Typography>
                <Grid container spacing={2}>
                  {formData.variants.map((variant, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Typography variant="subtitle2" gutterBottom>
                        {`${formData.productName || ''} ${variant.size} / ${variant.color}`}
                      </Typography>
                      <TextField
                        fullWidth
                        label="바코드"
                        value={variant.barcode}
                        onChange={(e) => handleVariantBarcodeChange(index, e.target.value)}
                        required
                      />
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={handleClose}
            >
              취소
            </Button>
            <Button onClick={handleSubmit} variant="contained" color="primary">
              {editingProduct ? '수정' : '등록'}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError('')}
        >
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        </Snackbar>

        <Snackbar
          open={!!success}
          autoHideDuration={6000}
          onClose={() => setSuccess('')}
        >
          <Alert severity="success" onClose={() => setSuccess('')}>
            {success}
          </Alert>
        </Snackbar>

        <Button variant="outlined" component="label" sx={{ ml: 2 }}>
          엑셀 업로드
          <input hidden type="file" accept=".xlsx" onChange={handleFile} />
        </Button>
      </Box>
    </Container>
  );
}

export default ProductManagement; 