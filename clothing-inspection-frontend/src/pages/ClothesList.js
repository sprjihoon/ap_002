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

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            새의류 등록
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={()=>handleOpen()}
          >
            새의류 등록
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
                  <TableCell>{Array.isArray(product.size)?product.size.join(', '):product.size}</TableCell>
                  <TableCell>{Array.isArray(product.color)?product.color.join(', '):product.color}</TableCell>
                  <TableCell>
                    {product.ProductVariants ? product.ProductVariants.map((v,i)=>(<Chip key={i} label={`${v.size}/${v.color}: ${v.barcode}`} size="small" style={{margin:'2px'}} />)) : null}
                  </TableCell>
                  <TableCell>{product.wholesaler}</TableCell>
                  <TableCell>{product.wholesalerProductName}</TableCell>
                  <TableCell>{product.location}</TableCell>
                  <TableCell>{formatDate(product.createdAt)}</TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => {
                        handleOpen(product);
                      }}
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