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
import { Delete as DeleteIcon, Edit as EditIcon, Add as AddIcon, Upload as UploadIcon } from '@mui/icons-material';
import { fetchWithAuth, API_BASE } from '../utils/api';
import ExcelUpload from '../components/ExcelUpload';
import _ from 'lodash';

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
    extraOption: '',
    wholesaler: '',
    wholesalerProductName: '',
    location: '',
    variants: []
  });
  const [openExcelUpload, setOpenExcelUpload] = useState(false);
  const [companyFilter, setCompanyFilter] = useState('');
  const [wholesalerFilter, setWholesalerFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchProducts = async () => {
    try {
      const data = await fetchWithAuth('/api/products');
      setProducts(data);
    } catch (error) {
      setError('제품 목록을 불러오는데 실패했습니다.');
    }
  };

  const fetchCompanies = async () => {
    try {
      const data = await fetchWithAuth('/api/products/companies');
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
        extraOption: product.extraOption.join(','),
        wholesaler: product.wholesaler,
        wholesalerProductName: product.wholesalerProductName,
        location: product.location,
        variants: product.ProductVariants.map(v => ({
          size: v.size,
          color: v.color,
          extraOption: v.extraOption,
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
        extraOption: '',
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

  const computeVariants = (sizeStr, colorStr, optionStr, prevVariants=[]) => {
    const sizesArr = sizeStr.split(',').map(s=>s.trim()).filter(Boolean);
    const colorsArr = colorStr.split(',').map(c=>c.trim()).filter(Boolean);
    const optsArr  = optionStr.split(',').map(o=>o.trim()).filter(Boolean);
    const effSizes = sizesArr.length ? sizesArr : [null];
    const effColors = colorsArr.length ? colorsArr : [null];
    const effOpts = optsArr.length ? optsArr : [null];
    const combined = [];
    for(const s of effSizes){
      for(const c of effColors){
        for(const o of effOpts){
          const existing = prevVariants.find(v=>v.size===s&&v.color===c&&v.extraOption===o);
          combined.push({ size:s, color:c, extraOption:o, barcode: existing?existing.barcode:'' });
        }
      }
    }
    return combined;
  };

  useEffect(()=>{
    setFormData(prev=>({
      ...prev,
      variants: computeVariants(prev.size, prev.color, prev.extraOption, prev.variants)
    }));
  },[formData.size, formData.color, formData.extraOption]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingProduct
        ? `${API_BASE}/api/products/${editingProduct.id}`
        : `${API_BASE}/api/products`;
      
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
        extraOption: '',
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
      await fetchWithAuth(`/api/products/${id}`, {
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
      const res = await fetch(`${API_BASE}/api/upload/excel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        credentials: 'include',
      });
      const data = await res.json();
      alert(`${data.results.filter(r=>r.status==='ok').length} 건 성공 / ${data.results.filter(r=>r.status==='fail').length} 건 실패`);
      fetchProducts();
    } catch (err) {
      alert(err.message);
    }
  };

  // products를 그룹핑
  const groupedProducts = _.values(_.groupBy(products, p => [p.company, p.productName, p.wholesaler, p.wholesalerProductName].join('|')));

  // 업체명, 도매처명 목록 추출
  const companyList = _.uniq(products.map(p => p.company)).filter(Boolean);
  const wholesalerList = _.uniq(products.map(p => p.wholesaler)).filter(Boolean);

  // 필터링된 그룹 (검색어까지 적용)
  const filteredGroupedProducts = groupedProducts.filter(group => {
    const first = group[0];
    const matchesFilter =
      (!companyFilter || first.company === companyFilter) &&
      (!wholesalerFilter || first.wholesaler === wholesalerFilter);
    if (!matchesFilter) return false;
    if (!search) return true;
    // 검색어가 주요 필드에 포함되어 있는지 확인
    const keyword = search.toLowerCase();
    const fields = [first.company, first.productName, first.wholesaler, first.wholesalerProductName, first.location, ...group.flatMap(p => (p.ProductVariants ? p.ProductVariants.map(v => v.barcode) : (p.barcode ? p.barcode.split(/[,;\n]+/).map(b => b.trim()) : [])))];
    return fields.some(f => f && f.toLowerCase().includes(keyword));
  });

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            제품 관리
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
          <TextField
            size="small"
            label="검색"
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ minWidth: 180 }}
            placeholder="업체명, 제품명, 바코드 등"
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>업체명</InputLabel>
            <Select
              value={companyFilter}
              label="업체명"
              onChange={e => setCompanyFilter(e.target.value)}
            >
              <MenuItem value="">전체</MenuItem>
              {companyList.map(c => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>도매처명</InputLabel>
            <Select
              value={wholesalerFilter}
              label="도매처명"
              onChange={e => setWholesalerFilter(e.target.value)}
            >
              <MenuItem value="">전체</MenuItem>
              {wholesalerList.map(w => (
                <MenuItem key={w} value={w}>{w}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<UploadIcon />}
            onClick={() => setOpenExcelUpload(true)}
            sx={{ mr: 2 }}
          >
            엑셀 업로드
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
          >
            제품 등록
          </Button>
        </Box>
        
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ whiteSpace: 'nowrap', width: 50 }}>ID</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', width: 120 }}>업체명</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', width: 150 }}>제품명</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', width: 100 }}>사이즈</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', width: 120 }}>컬러</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', width: 180 }}>바코드</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', width: 120 }}>도매처명</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', width: 150 }}>도매처제품명</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', width: 100 }}>로케이션</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', width: 120 }}>등록일</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', width: 80 }}>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredGroupedProducts.map((group, idx) => {
                const first = group[0];
                let barcodes = [];
                group.forEach(product => {
                  if (product.ProductVariants && product.ProductVariants.length > 0) {
                    barcodes.push(...product.ProductVariants.map(v => {
                      const parts = [v.size, v.color, v.extraOption].filter(Boolean);
                      return `${parts.join('/')}: ${v.barcode}`;
                    }));
                  } else if (product.barcode) {
                    barcodes.push(...product.barcode.split(/[,;\n]+/).map(b => b.trim()).filter(Boolean));
                  }
                });
                return (
                  <TableRow key={idx}>
                    <TableCell sx={{ whiteSpace: 'nowrap', width: 50 }}>{first.id}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', width: 120 }}>{first.company}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', width: 150 }}>{first.productName}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', width: 100 }}>{Array.isArray(first.size) ? first.size.join(', ') : (first.size || '-')}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', width: 120 }}>{Array.isArray(first.color) ? first.color.join(', ') : (first.color || '-')}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', width: 180 }}>
                      {barcodes
                        .flatMap(b => b.split(/[,;\n]+/))
                        .map((b, i) => (
                          <Chip key={i} label={b} size="small" style={{ margin: '2px' }} />
                        ))
                      }
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', width: 120 }}>{first.wholesaler}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', width: 150 }}>{first.wholesalerProductName}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', width: 100 }}>{first.location}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', width: 120 }}>{formatDate(first.createdAt)}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', width: 80 }}>
                      <IconButton onClick={() => handleOpen(first)} color="primary">
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(first.id)} color="error">
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
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
                  label="추가옵션 (쉼표로 구분)"
                  name="extraOption"
                  value={formData.extraOption}
                  onChange={handleInputChange}
                  helperText="예: 원단,소재 등 (비워두면 옵션 없음)"
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
                        {`${formData.productName || ''} ${variant.size||''} / ${variant.color||''} / ${variant.extraOption||''}`}
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
          autoHideDuration={3000}
          onClose={() => setError('')}
        >
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        </Snackbar>

        <Snackbar
          open={!!success}
          autoHideDuration={3000}
          onClose={() => setSuccess('')}
        >
          <Alert severity="success" onClose={() => setSuccess('')}>
            {success}
          </Alert>
        </Snackbar>

        <Dialog
          open={openExcelUpload}
          onClose={() => setOpenExcelUpload(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>엑셀 파일 업로드</DialogTitle>
          <DialogContent>
            <ExcelUpload onSuccess={() => {
              setOpenExcelUpload(false);
              fetchProducts();
            }} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenExcelUpload(false)}>
              닫기
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
}

export default ProductManagement; 
