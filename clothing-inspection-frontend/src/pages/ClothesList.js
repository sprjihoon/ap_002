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
import { Delete as DeleteIcon, Edit as EditIcon, Add as AddIcon, PhotoCamera } from '@mui/icons-material';
import { fetchWithAuth, API_URL } from '../utils/api';
import ExcelUpload from '../components/ExcelUpload';

function ClothesList() {
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
  const [openExcelUpload, setOpenExcelUpload] = useState(false);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [wholesalerFilter, setWholesalerFilter] = useState('');

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
      console.log('Fetched companies:', data);
      setCompanies(data);
    } catch (error) {
      console.error('Error fetching companies:', error);
      setError('업체 목록을 불러오는데 실패했습니다.');
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCompanies();
  }, []);

  const handleSubmit = async () => {
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

  const handleOpen = (product=null)=>{
    if(product){
      setEditingProduct(product);
      setFormData({
        company: product.company,
        productName: product.productName,
        size: product.size.join(','),
        color: product.color.join(','),
        wholesaler: product.wholesaler,
        wholesalerProductName: product.wholesalerProductName,
        location: product.location,
        variants: product.ProductVariants?product.ProductVariants.map(v=>({size:v.size,color:v.color,barcode:v.barcode})):[]
      });
    }else{
      setEditingProduct(null);
      setFormData({
        company:'',productName:'',size:'',color:'',wholesaler:'',wholesalerProductName:'',location:'',variants:[]
      });
    }
    setOpenDialog(true);
  };

  const handleClose = ()=>{
    setOpenDialog(false);
    setEditingProduct(null);
  };

  const handleInputChange=(e)=>{
    const {name,value}=e.target;
    setFormData(prev=>({...prev,[name]:value}));

    if(name==='size'||name==='color'){
      const sizesArr=(name==='size'?value:formData.size).split(',').map(s=>s.trim()).filter(Boolean);
      const colorsArr=(name==='color'?value:formData.color).split(',').map(c=>c.trim()).filter(Boolean);
      const newVars=[];
      for(const s of sizesArr){
        for(const c of colorsArr){
          const existing=formData.variants.find(v=>v.size===s&&v.color===c);
          newVars.push({size:s,color:c,barcode:existing?existing.barcode:''});
        }
      }
      setFormData(prev=>({...prev,variants:newVars}));
    }
  };

  const handleVariantBarcodeChange=(idx,val)=>{
    const copy=[...formData.variants];
    copy[idx]={...copy[idx],barcode:val};
    setFormData(prev=>({...prev,variants:copy}));
  };

  // products 배열을 그룹핑
  const grouped = {};
  products.forEach(product => {
    const key = [product.company, product.productName, product.wholesaler, product.wholesalerProductName].join('|');
    if (!grouped[key]) grouped[key] = [];
    if (product.ProductVariants && product.ProductVariants.length > 0) {
      grouped[key].push(...product.ProductVariants.map(v => `${v.size}/${v.color}: ${v.barcode}`));
    } else if (product.barcode) {
      grouped[key].push(...product.barcode.split(/[,;\n]+/).map(b => b.trim()).filter(Boolean));
    }
  });

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            새의류 등록
          </Typography>
          <Box>
            <Button
              variant="outlined"
              color="primary"
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
              새의류 등록
            </Button>
          </Box>
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
              {companies.map(c => (
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
              {companies.map(w => (
                <MenuItem key={w} value={w}>{w}</MenuItem>
              ))}
            </Select>
          </FormControl>
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
              {Object.entries(grouped).map(([key, barcodes], idx) => (
                <TableRow key={idx}>
                  <TableCell>{products.find(p => [p.company, p.productName, p.wholesaler, p.wholesalerProductName].join('|') === key)?.id}</TableCell>
                  <TableCell>{key.split('|')[0]}</TableCell>
                  <TableCell>{key.split('|')[1]}</TableCell>
                  <TableCell>{key.split('|')[2]}</TableCell>
                  <TableCell>{key.split('|')[3]}</TableCell>
                  <TableCell>
                    {barcodes
                      .flatMap(b => b.split(/[,;\n]+/))
                      .map((b, i) => (
                        <Chip key={i} label={b} size="small" style={{ margin: '2px' }} clickable={false} />
                      ))}
                  </TableCell>
                  <TableCell>{key.split('|')[2]}</TableCell>
                  <TableCell>{key.split('|')[3]}</TableCell>
                  <TableCell>{products.find(p => [p.company, p.productName, p.wholesaler, p.wholesalerProductName].join('|') === key)?.location}</TableCell>
                  <TableCell>{formatDate(products.find(p => [p.company, p.productName, p.wholesaler, p.wholesalerProductName].join('|') === key)?.createdAt)}</TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => {
                        handleOpen(products.find(p => [p.company, p.productName, p.wholesaler, p.wholesalerProductName].join('|') === key));
                      }}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(products.find(p => [p.company, p.productName, p.wholesaler, p.wholesalerProductName].join('|') === key)?.id)}
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
            {editingProduct ? '의류 정보 수정' : '새의류 등록'}
          </DialogTitle>
          <DialogContent>
            <FormControl fullWidth margin="normal">
              <InputLabel>업체명</InputLabel>
              <Select
                value={editingProduct?.company || formData.company}
                onChange={(e) => {
                  if (editingProduct) {
                    setEditingProduct({ ...editingProduct, company: e.target.value });
                  } else {
                    setFormData({ ...formData, company: e.target.value });
                  }
                }}
                label="업체명"
                required
              >
                {companies.map((company) => (
                  <MenuItem key={company} value={company}>
                    {company}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="제품명"
              margin="normal"
              value={editingProduct?.productName || formData.productName}
              onChange={(e) => {
                if (editingProduct) {
                  setEditingProduct({ ...editingProduct, productName: e.target.value });
                } else {
                  setFormData({ ...formData, productName: e.target.value });
                }
              }}
              required
            />
            <TextField
              fullWidth
              label="사이즈 (쉼표로 구분)"
              name="size"
              margin="normal"
              value={formData.size}
              onChange={handleInputChange}
              helperText="예: 1,2,3"
              required
            />
            <TextField
              fullWidth
              label="컬러 (쉼표로 구분)"
              name="color"
              margin="normal"
              value={formData.color}
              onChange={handleInputChange}
              helperText="예: 블랙,화이트"
              required
            />
            <Typography variant="h6" gutterBottom>바코드 입력</Typography>
            <Grid container spacing={2}>
              {formData.variants.map((variant,index)=>(
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Typography variant="subtitle2" gutterBottom>{`${formData.productName || ''} ${variant.size} / ${variant.color}`}</Typography>
                  <TextField fullWidth label="바코드" value={variant.barcode} onChange={e=>handleVariantBarcodeChange(index,e.target.value)} required/>
                </Grid>
              ))}
            </Grid>
            <TextField
              fullWidth
              label="도매처명"
              margin="normal"
              value={editingProduct?.wholesaler || formData.wholesaler}
              onChange={(e) => {
                if (editingProduct) {
                  setEditingProduct({ ...editingProduct, wholesaler: e.target.value });
                } else {
                  setFormData({ ...formData, wholesaler: e.target.value });
                }
              }}
              required
            />
            <TextField
              fullWidth
              label="도매처제품명"
              margin="normal"
              value={editingProduct?.wholesalerProductName || formData.wholesalerProductName}
              onChange={(e) => {
                if (editingProduct) {
                  setEditingProduct({ ...editingProduct, wholesalerProductName: e.target.value });
                } else {
                  setFormData({ ...formData, wholesalerProductName: e.target.value });
                }
              }}
              required
            />
            <TextField
              fullWidth
              label="로케이션정보 (선택)"
              margin="normal"
              value={editingProduct?.location || formData.location}
              onChange={(e) => {
                if (editingProduct) {
                  setEditingProduct({ ...editingProduct, location: e.target.value });
                } else {
                  setFormData({ ...formData, location: e.target.value });
                }
              }}
            />
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
      </Box>
    </Container>
  );
}

export default ClothesList; 