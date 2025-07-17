import React, { useState, useEffect, useMemo } from 'react';
import {
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
  Chip,
  TablePagination
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, Add as AddIcon, PhotoCamera } from '@mui/icons-material';
import DownloadIcon from '@mui/icons-material/Download';
import axios from 'axios';
import { fetchWithAuth, API_BASE } from '../utils/api';
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
    extraOption: '',
    wholesaler: '',
    wholesalerProductName: '',
    location: '',
    variants: []
  });
  const [openExcelUpload, setOpenExcelUpload] = useState(false);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [wholesalerFilter, setWholesalerFilter] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  /*───────────────────────────
   *  Form validation
   *──────────────────────────*/
  const isFormValid = useMemo(()=>{
    const required = [
      formData.company,
      formData.productName,
      formData.wholesaler,
      formData.wholesalerProductName
    ];
    // 필수 기본 필드
    if(required.some(f=>!f || !f.toString().trim())) return false;

    // 사이즈/컬러/추가옵션 중 하나는 입력되어야 함
    if(!(formData.size || '').trim() && !(formData.color || '').trim() && !(formData.extraOption || '').trim()) return false;

    if(formData.variants.length===0) return false;
    if(formData.variants.some(v=>!v.barcode || !v.barcode.trim())) return false;
    return true;
  }, [formData]);

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
      const url = (editingProduct && editingProduct.id)
        ? `${API_BASE}/api/products/${editingProduct.id}`
        : `${API_BASE}/api/products`;
      
      const response = await fetch(url, {
        method: editingProduct ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        credentials: 'include',
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

  const handleOpen = (product=null)=>{
    if(product){
      // ensure full product object with id is stored
      const fullProd = product?.id ? products.find(p=>p.id===product.id) || product : product;
      setEditingProduct(fullProd);
      setFormData({
        company: fullProd.company,
        productName: fullProd.productName,
        size: Array.isArray(fullProd.size) ? fullProd.size.join(',') : (fullProd.size || ''),
        color: Array.isArray(fullProd.color) ? fullProd.color.join(',') : (fullProd.color || ''),
        // extraOption: 모든 variant의 extraOption 값을 중복 제거 후 쉼표로 결합
        extraOption: (() => {
          const extras = (fullProd.ProductVariants || [])
            .map(v => v.extraOption)
            .filter(Boolean);
          return extras.length ? [...new Set(extras)].join(',') : '';
        })(),
        wholesaler: fullProd.wholesaler,
        wholesalerProductName: fullProd.wholesalerProductName,
        location: fullProd.location,
        variants: fullProd.ProductVariants?fullProd.ProductVariants.map(v=>({size:v.size,color:v.color,extraOption:v.extraOption,barcode:v.barcode})):[]
      });
    }else{
      setEditingProduct(null);
      setFormData({
        company:'',productName:'',size:'',color:'',extraOption:'',wholesaler:'',wholesalerProductName:'',location:'',variants:[]
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

    if(name==='size'||name==='color'||name==='extraOption'){
      const sizesArr=(name==='size'?value:formData.size).split(',').map(s=>s.trim()).filter(Boolean);
      const colorsArr=(name==='color'?value:formData.color).split(',').map(c=>c.trim()).filter(Boolean);
      const extrasArr=(name==='extraOption'?value:formData.extraOption).split(',').map(x=>x.trim()).filter(Boolean);

      const sList = sizesArr.length ? sizesArr : [''];
      const cList = colorsArr.length ? colorsArr : [''];
      const eList = extrasArr.length ? extrasArr : [''];

      const newVars=[];
      for(const s of sList){
        for(const c of cList){
          for(const ex of eList){
            if(!s && !c && !ex) continue; // skip all-empty variant
            const existing=formData.variants.find(v=>v.size===s&&v.color===c&&v.extraOption===ex);
            newVars.push({size:s,color:c,extraOption:ex,barcode:existing?existing.barcode:''});
          }
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

  // 필터링된 products 계산
  const filteredProducts = products.filter(p => {
    const searchLower = search.toLowerCase();
    const matchSearch = !searchLower ||
      p.company.toLowerCase().includes(searchLower) ||
      p.productName.toLowerCase().includes(searchLower) ||
      p.wholesaler.toLowerCase().includes(searchLower) ||
      p.wholesalerProductName.toLowerCase().includes(searchLower) ||
      (p.ProductVariants && p.ProductVariants.some(v => v.barcode && v.barcode.toLowerCase().includes(searchLower)));
    const matchCompany = (user.role === 'operator') ? true : (!companyFilter || p.company === companyFilter);
    const matchWholesaler = !wholesalerFilter || p.wholesaler === wholesalerFilter;
    return matchSearch && matchCompany && matchWholesaler;
  });

  // 휘발성 dropdown 목록
  const wholesalers = [...new Set(products.map(p => p.wholesaler).filter(Boolean))];

  // products 배열을 그룹핑
  const grouped = {};
  filteredProducts.forEach(product => {
    const key = [product.company, product.productName, product.wholesaler, product.wholesalerProductName].join('|');
    if (!grouped[key]) grouped[key] = [];
    if (product.ProductVariants && product.ProductVariants.length > 0) {
      grouped[key].push(...product.ProductVariants.map(v => {
        const parts = [];
        if (v.size) parts.push(v.size);
        if (v.color) parts.push(v.color);
        if (v.extraOption) parts.push(v.extraOption);
        return `${parts.join('/')} : ${v.barcode}`;
      }));
    } else if (product.barcode) {
      grouped[key].push(...product.barcode.split(/[,;\n]+/).map(b => b.trim()).filter(Boolean));
    }
  });

  const groupedEntries = Object.entries(grouped);
  const paginatedEntries = groupedEntries.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDownload = async ()=>{
    try{
      const params = new URLSearchParams();
      if(search) params.append('search', search);
      if(user.role!=='operator' && companyFilter) params.append('company', companyFilter);
      if(wholesalerFilter) params.append('wholesaler', wholesalerFilter);
      const response = await axios.get(`${API_BASE}/api/products/export?${params.toString()}`, {
        responseType:'blob',
        headers:{ Authorization:`Bearer ${localStorage.getItem('token')}` },
        withCredentials: true
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `clothes_${new Date().toISOString().substring(0,10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }catch(err){
      alert(err.response?.data?.message || err.message);
    }
  };

  return (
    <Box sx={{ p:3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          새의류 등록
        </Typography>
        <Box>
          {user.role !== 'operator' && (
            <Button
              variant="outlined"
              color="primary"
              onClick={() => setOpenExcelUpload(true)}
              sx={{ mr: 2 }}
            >
              엑셀 업로드
            </Button>
          )}
          <Button variant="outlined" startIcon={<DownloadIcon />} sx={{ mr: user.role!=='operator'?2:0 }} onClick={handleDownload}>다운로드</Button>
          {user.role !== 'operator' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleOpen()}
            >
              새의류 등록
            </Button>
          )}
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
        {user.role !== 'operator' && (
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
        )}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>도매처명</InputLabel>
          <Select
            value={wholesalerFilter}
            label="도매처명"
            onChange={e => setWholesalerFilter(e.target.value)}
          >
            <MenuItem value="">전체</MenuItem>
            {wholesalers.map(w => (
              <MenuItem key={w} value={w}>{w}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      
      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ whiteSpace: 'nowrap', width: 50 }}>ID</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap', width: 120 }}>업체명</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap', width: 150 }}>제품명</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap', width: 80 }}>사이즈</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap', width: 80 }}>컬러</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap', width: 100 }}>추가옵션</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap', width: 180 }}>바코드</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap', width: 120 }}>도매처명</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap', width: 150 }}>도매처제품명</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap', width: 100 }}>로케이션</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap', width: 120 }}>등록일</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap', width: 80 }}>작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedEntries.map(([key, barcodes], idx) => {
              const prod = products.find(p => [p.company, p.productName, p.wholesaler, p.wholesalerProductName].join('|') === key);
              let sizeVal = '';
              let colorVal = '';
              let extraVal = '';
              if (prod) {
                if (prod.ProductVariants && prod.ProductVariants.length) {
                  const sizeSet = new Set();
                  const colorSet = new Set();
                  const extraSet = new Set();
                  prod.ProductVariants.forEach(v => {
                    if (v.size) sizeSet.add(v.size);
                    if (v.color) colorSet.add(v.color);
                    if (v.extraOption) extraSet.add(v.extraOption);
                  });
                  sizeVal = Array.from(sizeSet).join(',');
                  colorVal = Array.from(colorSet).join(',');
                  extraVal = Array.from(extraSet).join(',');
                }
                if (!sizeVal) {
                  sizeVal = Array.isArray(prod.size) ? prod.size.join(',') : (prod.size || '');
                }
                if (!colorVal) {
                  colorVal = Array.isArray(prod.color) ? prod.color.join(',') : (prod.color || '');
                }
              }
              return (
                <TableRow key={idx}>
                  <TableCell sx={{ whiteSpace: 'nowrap', width: 50 }}>{prod?.id}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', width: 120 }}>{key.split('|')[0]}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', width: 150 }}>{key.split('|')[1]}</TableCell>
                  <TableCell sx={{ width: 100 }}>
                    <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.5, maxHeight:120, overflowY:'auto' }}>
                      {sizeVal.split(',').filter(Boolean).map((s,i)=>(
                        <Chip key={i} label={s} size="small" />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ width: 100 }}>
                    <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.5, maxHeight:120, overflowY:'auto' }}>
                      {colorVal.split(',').filter(Boolean).map((c,i)=>(
                        <Chip key={i} label={c} size="small" />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ width: 100 }}>
                    <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.5, maxHeight:120, overflowY:'auto' }}>
                      {extraVal.split(',').filter(Boolean).map((e,i)=>(
                        <Chip key={i} label={e} size="small" />
                      ))}
                    </Box>
                  </TableCell>
                <TableCell sx={{ width: 220 }}>
                  <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.5, maxHeight:120, overflowY:'auto' }}>
                    {barcodes
                      .flatMap(b => b.split(/[,;\n]+/))
                      .filter(Boolean)
                      .map((b,i)=>(
                        <Chip key={i} label={b} size="small" />
                      ))}
                  </Box>
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', width: 120 }}>{key.split('|')[2]}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', width: 150 }}>{key.split('|')[3]}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', width: 100 }}>{products.find(p => [p.company, p.productName, p.wholesaler, p.wholesalerProductName].join('|') === key)?.location}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', width: 120 }}>{formatDate(products.find(p => [p.company, p.productName, p.wholesaler, p.wholesalerProductName].join('|') === key)?.createdAt)}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', width: 80 }}>
                  {user.role !== 'operator' && (
                    <>
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
                    </>
                  )}
                </TableCell>
              </TableRow>
            );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <Box sx={{ display:'flex', justifyContent:'center', mt:2 }}>
        <TablePagination
          component="div"
          rowsPerPageOptions={[10, 30, 50, 100]}
          count={groupedEntries.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{ '& .MuiTablePagination-toolbar': { flexWrap:'nowrap' } }}
        />
      </Box>

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
                const val = e.target.value;
                if (editingProduct) {
                  setEditingProduct({ ...editingProduct, company: val });
                }
                setFormData(prev => ({ ...prev, company: val }));
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
              const val = e.target.value;
              if (editingProduct) {
                setEditingProduct({ ...editingProduct, productName: val });
              }
              setFormData(prev => ({ ...prev, productName: val }));
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
          />
          <TextField
            fullWidth
            label="컬러 (쉼표로 구분)"
            name="color"
            margin="normal"
            value={formData.color}
            onChange={handleInputChange}
            helperText="예: 블랙,화이트"
          />
          <TextField
            fullWidth
            label="추가옵션 (쉼표로 구분)"
            name="extraOption"
            margin="normal"
            value={formData.extraOption}
            onChange={handleInputChange}
            helperText="예: 기모,선염"
          />
          <Typography variant="h6" gutterBottom>바코드 입력</Typography>
          <Grid container spacing={2}>
            {formData.variants.map((variant,index)=>(
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Typography variant="subtitle2" gutterBottom>{`${formData.productName || ''} ${variant.size||''}${variant.color?` / ${variant.color}`:''}${variant.extraOption?` / ${variant.extraOption}`:''}`}</Typography>
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
              const val = e.target.value;
              if (editingProduct) {
                setEditingProduct({ ...editingProduct, wholesaler: val });
              }
              setFormData(prev => ({ ...prev, wholesaler: val }));
            }}
            required
          />
          <TextField
            fullWidth
            label="도매처제품명"
            margin="normal"
            value={editingProduct?.wholesalerProductName || formData.wholesalerProductName}
            onChange={(e) => {
              const val = e.target.value;
              if (editingProduct) {
                setEditingProduct({ ...editingProduct, wholesalerProductName: val });
              }
              setFormData(prev => ({ ...prev, wholesalerProductName: val }));
            }}
            required
          />
          <TextField
            fullWidth
            label="로케이션정보 (선택)"
            margin="normal"
            value={editingProduct?.location || formData.location}
            onChange={(e) => {
              const val = e.target.value;
              if (editingProduct) {
                setEditingProduct({ ...editingProduct, location: val });
              }
              setFormData(prev => ({ ...prev, location: val }));
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleClose}
          >
            취소
          </Button>
          <Button onClick={handleSubmit} variant="contained" color="primary" disabled={!isFormValid}>
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
    </Box>
  );
}

export default ClothesList; 
