import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, FormControl, InputLabel, Select, MenuItem, Typography, Box, IconButton, Autocomplete, Checkbox
} from '@mui/material';
import ReceiptPhotoUpload from '../components/ReceiptPhotoUpload';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../utils/api';
import { useRef } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

// TODO: ReceiptPhotoUpload 컴포넌트 import 예정

const InspectionRegister = ({ open, onClose, companies, products, onSubmit }) => {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [selectedCompany, setSelectedCompany] = useState('');
  const [optionInputs, setOptionInputs] = useState({}); // {barcode: {total, normal, defect, result, comment, photo}}
  const [receiptPhotos, setReceiptPhotos] = useState([]); // [{file, previewUrl}]

  // TODO: 옵션별 입력 상태, 수량 검증 등 추가

  // 업체 선택 시 해당 업체의 제품만 필터링
  const filteredProducts = products.filter(p => p.company === selectedCompany);

  // Autocomplete를 옵션(variant, 바코드) 단위로 검색/선택
  const allVariants = filteredProducts.flatMap(p =>
    (p.ProductVariants || []).map(v => ({
      productId: p.id,
      productName: p.productName,
      barcode: v.barcode,
      size: v.size,
      color: v.color,
      wholesaler: p.wholesaler,
      wholesalerProductName: p.wholesalerProductName
    }))
  );
  const [selectedBarcodes, setSelectedBarcodes] = useState([]); // 바코드 배열

  // 입력 폼에 표시할 옵션(variant) 목록
  const selectedVariants = allVariants.filter(v => selectedBarcodes.includes(v.barcode));

  // 옵션별 입력 핸들러
  const handleOptionInput = (barcode, field, value) => {
    setOptionInputs(prev => {
      const prevInput = prev[barcode] || {};
      let newInput = { ...prevInput, [field]: value };

      const total = Number(field === 'total' ? value : prevInput.total);
      const normal = Number(field === 'normal' ? value : prevInput.normal);
      const defect = Number(field === 'defect' ? value : prevInput.defect);

      if (field === 'total') {
        if (!isNaN(normal)) {
          newInput.defect = total - normal >= 0 ? total - normal : '';
        } else if (!isNaN(defect)) {
          newInput.normal = total - defect >= 0 ? total - defect : '';
        }
      } else if (field === 'normal' && !isNaN(total)) {
        newInput.defect = total - normal >= 0 ? total - normal : '';
      } else if (field === 'defect' && !isNaN(total)) {
        newInput.normal = total - defect >= 0 ? total - defect : '';
      }

      return {
        ...prev,
        [barcode]: newInput
      };
    });
  };

  // 옵션별 삭제 핸들러
  const handleDeleteOption = (barcode) => {
    setOptionInputs(prev => {
      const updated = { ...prev };
      delete updated[barcode];
      return updated;
    });
    setSelectedBarcodes(prev => prev.filter(b => b !== barcode));
  };

  // 옵션별 사진 업로드
  const handleOptionPhoto = (barcode, photoData) => {
    setOptionInputs(prev => ({
      ...prev,
      [barcode]: {
        ...prev[barcode],
        photo: photoData.file,
        photoUrl: photoData.url || (photoData.file ? URL.createObjectURL(photoData.file) : undefined)
      }
    }));
  };

  // 입력값 검증 (필수: 전체수량, 정상수량, 제품사진)
  const validateInputs = () => {
    if (!selectedCompany) {
      enqueueSnackbar('업체를 선택해주세요.', { variant: 'error' });
      return false;
    }
    if (selectedBarcodes.length === 0) {
      enqueueSnackbar('옵션(바코드)을 선택해주세요.', { variant: 'error' });
      return false;
    }
    for (const variant of selectedVariants) {
      const input = optionInputs[variant.barcode] || {};
      if (!input.total || !input.normal) {
        enqueueSnackbar(`${variant.productName} (${variant.barcode})의 전체수량과 정상수량을 입력해주세요.`, { variant: 'error' });
        return false;
      }
      if (Number(input.normal) + Number(input.defect || 0) > Number(input.total)) {
        enqueueSnackbar(`${variant.productName} (${variant.barcode})의 정상수량과 불량수량의 합이 전체수량을 초과할 수 없습니다.`, { variant: 'error' });
        return false;
      }
    }
    return true;
  };


  // 사진 업로드
  const uploadPhoto = async (file, barcode) => {
    const formData = new FormData();
    formData.append('photo', file);
    if (barcode) {
      formData.append('barcodes[]', barcode);
    }
    try {
      const response = await axios.post(`${API_BASE}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true
      });
      // 여러 개일 때와 단일일 때 모두 대응
      let url = '';
      if (response.data.urls && Array.isArray(response.data.urls)) {
        url = response.data.urls[0];
      } else {
        url = response.data.url || response.data.urls || '';
      }
      // 상대경로라면 백엔드 호스트를 붙여 절대경로로 변환
      if (url && !url.startsWith('http')) {
        url = `${API_BASE}${url}`;
      }
      return url;
    } catch (error) {
      console.error('사진 업로드 실패:', error);
      throw new Error('사진 업로드에 실패했습니다.');
    }
  };

  // 검수 등록 (결과 자동 판정)
  const handleSubmit = async () => {
    try {
      if (!validateInputs()) return;
      const updatedOptions = { ...optionInputs };
      for (const variant of selectedVariants) {
        const input = updatedOptions[variant.barcode] || {};
        if (input?.photo) {
          try {
            const photoUrl = await uploadPhoto(input.photo, variant.barcode);
            updatedOptions[variant.barcode] = {
              ...input,
              photoUrl
            };
          } catch (error) {
            enqueueSnackbar(`${variant.productName} (${variant.barcode})의 사진 업로드에 실패했습니다.`, { variant: 'error' });
            return;
          }
        }
        // 결과 자동 판정 (영문 pass/fail)
        updatedOptions[variant.barcode].result = Number(input.defect || 0) > 0 ? 'fail' : 'pass';
      }
      // 영수증 사진 업로드 (필수 아님)
      const uploadedReceiptPhotos = [];
      for (const photo of receiptPhotos) {
        try {
          // 영수증 사진은 바코드 없이 업로드
          const photoUrl = await uploadPhoto(photo.file);
          uploadedReceiptPhotos.push({
            url: photoUrl,
            description: photo.description
          });
        } catch (error) {
          enqueueSnackbar('영수증/증빙 사진 업로드에 실패했습니다.', { variant: 'error' });
          return;
        }
      }
      // 검사 전표명 및 전체 결과 생성
      const isFail = Object.values(updatedOptions).some(opt => opt.result === 'fail');
      const overallResult = isFail ? 'fail' : 'pass';

      // 검수 전표 이름: 업체명_YYYYMMDD (시간 제거)
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const inspectionName = `${selectedCompany}_${y}${m}${d}`;

      // 현재 선택된 옵션으로부터 제품 ID를 유도(중복 제거)
      const productIds = [...new Set(selectedVariants.map(v => v.productId))];

      // details 배열 생성
      const details = selectedVariants.map(v => {
        const input = updatedOptions[v.barcode];
        return {
          barcode: v.barcode,
          totalQuantity: Number(input.total),
          normalQuantity: Number(input.normal),
          defectQuantity: Number(input.defect || 0),
          result: input.result, // pass / fail
          comment: input.comment || '',
          photoUrl: input.photoUrl || null
        };
      });

      const response = await axios.post(
        `${API_BASE}/api/inspections`,
        {
          inspectionName,
          company: selectedCompany,
          result: overallResult,
          comment: '',
          details,
          receiptPhotos: uploadedReceiptPhotos
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          withCredentials: true
        }
      );
      enqueueSnackbar('검수가 성공적으로 등록되었습니다.', { variant: 'success' });
      navigate(`/inspections/${response.data.id || response.data.data?.inspectionId || ''}`);
    } catch (error) {
      // 서버에서 전달된 구체적 오류 메시지가 있으면 함께 출력/표시
      const serverMsg = error.response?.data?.message;
      console.error('검수 등록 실패:', serverMsg || error.message, error);
      enqueueSnackbar(serverMsg || '검수 등록 중 오류가 발생했습니다.', { variant: 'error' });
    }
  };

  // useEffect로 제품/업체 선택 시 optionInputs 자동 초기화
  useEffect(() => {
    const newInputs = {};
    selectedVariants.forEach(variant => {
      if (optionInputs[variant.barcode]) {
        newInputs[variant.barcode] = optionInputs[variant.barcode];
      } else {
        newInputs[variant.barcode] = {};
      }
    });
    setOptionInputs(newInputs);
    // eslint-disable-next-line
  }, [JSON.stringify(selectedVariants)]);

  // 사진 업로드 다이얼로그 상태
  const [photoUploadDialog, setPhotoUploadDialog] = useState({
    open: false,
    file: null,
    selectedBarcodes: []
  });

  // 사진 업로드 다이얼로그 열기
  const handleOpenPhotoUpload = (file) => {
    setPhotoUploadDialog({
      open: true,
      file,
      selectedBarcodes: []
    });
  };

  // 사진 업로드 다이얼로그 닫기
  const handleClosePhotoUpload = () => {
    setPhotoUploadDialog({
      open: false,
      file: null,
      selectedBarcodes: []
    });
  };

  // 바코드 선택 토글
  const handleToggleBarcode = (barcode) => {
    setPhotoUploadDialog(prev => ({
      ...prev,
      selectedBarcodes: prev.selectedBarcodes.includes(barcode)
        ? prev.selectedBarcodes.filter(b => b !== barcode)
        : [...prev.selectedBarcodes, barcode]
    }));
  };

  // 선택된 바코드에 사진 적용
  const handleApplyPhoto = async () => {
    if (!photoUploadDialog.file || photoUploadDialog.selectedBarcodes.length === 0) {
      enqueueSnackbar('사진과 바코드를 선택해주세요', { variant: 'warning' });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('photo', photoUploadDialog.file);
      photoUploadDialog.selectedBarcodes.forEach(barcode => {
        formData.append('barcodes[]', barcode);
      });

           const response = await axios.post(`${API_BASE}/api/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        withCredentials: true
      });

      if (response.data.urls) {
        // 각 바코드에 해당하는 URL 적용
        photoUploadDialog.selectedBarcodes.forEach((barcode, index) => {
          let url = response.data.urls[index];
          if (url && !url.startsWith('http')) {
            url = `${API_BASE}${url}`;
          }
          handleOptionPhoto(barcode, {
            file: photoUploadDialog.file,
            url
          });
        });
        enqueueSnackbar('사진이 업로드되었습니다.', { variant: 'success' });
      }
    } catch (error) {
      console.error('사진 업로드 실패:', error);
      enqueueSnackbar('사진 업로드에 실패했습니다.', { variant: 'error' });
    }
    handleClosePhotoUpload();
  };

  // Android 자동 저장 helper
  const saveFileToDevice = (file) => {
    try {
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      // 확장자 유지
      const ext = file.name.split('.').pop() || 'jpg';
      link.download = `inspection_${Date.now()}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      console.warn('auto save failed', err);
    }
  };

  // 모바일(태블릿 포함)에서는 다이얼로그를 전체 화면으로 표시하여
  // 가상 키보드가 입력창을 가리지 않도록 한다.
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isSmallScreen}
      scroll="body"
      PaperProps={{ sx: { height: isSmallScreen ? '100%' : 'auto' } }}
    >
      <DialogTitle>검수 등록</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <FormControl fullWidth margin="normal">
            <InputLabel>업체명</InputLabel>
            <Select
              value={selectedCompany}
              label="업체명"
              onChange={e => {
                setSelectedCompany(e.target.value);
                setSelectedBarcodes([]);
                setOptionInputs({});
              }}
            >
              {companies.map(c => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ mb: 2 }}>
          <FormControl fullWidth margin="normal" disabled={!selectedCompany}>
            <Autocomplete
              multiple
              options={allVariants}
              getOptionLabel={option => `${option.wholesaler} / ${option.wholesalerProductName} / ${option.productName} / ${option.size} / ${option.color} / ${option.barcode}`}
              filterSelectedOptions
              value={allVariants.filter(v => selectedBarcodes.includes(v.barcode))}
              onChange={(e, newValue) => {
                setSelectedBarcodes(newValue.map(v => v.barcode));
              }}
              renderInput={params => (
                <TextField {...params} label="옵션(제품/사이즈/컬러/바코드) 검색" placeholder="검색" />
              )}
              isOptionEqualToValue={(option, value) => option.barcode === value.barcode}
              filterOptions={(options, { inputValue }) => {
                if (!inputValue) return options;
                const lower = inputValue.toLowerCase();
                return options.filter(v =>
                  v.productName.toLowerCase().includes(lower) ||
                  v.barcode.toLowerCase().includes(lower) ||
                  (v.size && v.size.toLowerCase().includes(lower)) ||
                  (v.color && v.color.toLowerCase().includes(lower)) ||
                  (v.wholesaler && v.wholesaler.toLowerCase().includes(lower)) ||
                  (v.wholesalerProductName && v.wholesalerProductName.toLowerCase().includes(lower))
                );
              }}
            />
          </FormControl>
        </Box>
        {/* 옵션(바코드)별 입력 UI */}
        {selectedVariants.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6">제품 옵션별 검수 입력</Typography>
            {selectedVariants.map((variant, idx) => {
              if (!(variant.barcode in optionInputs)) return null;
              const input = optionInputs[variant.barcode] || {};
              const total = Number(input.total) || 0;
              const normal = Number(input.normal) || 0;
              const defect = Number(input.defect) || 0;
              const error = normal + defect > total;
              return (
                <Box key={variant.barcode} sx={{ border: '1px solid #eee', borderRadius: 2, p: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                      <b>{idx + 1}.</b> {variant.productName} / {variant.size} / {variant.color} / {variant.barcode}
                    </Typography>
                    <IconButton size="small" color="error" onClick={() => handleDeleteOption(variant.barcode)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Box sx={{ display:'flex', gap:1, flexWrap:'wrap' }}>
                    <TextField
                      label="전체수량"
                      type="number"
                      value={input.total || ''}
                      onChange={e => handleOptionInput(variant.barcode, 'total', e.target.value)}
                      sx={{ width: 90 }}
                      inputProps={{ min: 0 }}
                    />
                    <TextField
                      label="정상수량"
                      type="number"
                      value={input.normal || ''}
                      onChange={e => handleOptionInput(variant.barcode, 'normal', e.target.value)}
                      sx={{ width: 90 }}
                      inputProps={{ min: 0 }}
                      error={error}
                    />
                    <TextField
                      label="불량수량"
                      type="number"
                      value={input.defect || ''}
                      onChange={e => handleOptionInput(variant.barcode, 'defect', e.target.value)}
                      sx={{ width: 90 }}
                      inputProps={{ min: 0 }}
                      error={error}
                    />
                    <TextField
                      label="코멘트"
                      value={input.comment || ''}
                      onChange={e => handleOptionInput(variant.barcode, 'comment', e.target.value)}
                      sx={{ width: 90 }}
                    />
                  </Box>
                  {/* 옵션별 사진 업로드 */}
                  <Box sx={{ mt: 2 }}>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      id={`option-photo-${variant.barcode}`}
                      onChange={(e)=>{
                        const file = e.target.files?.[0];
                        if(file){
                          // Android 단말이면 다운로드 폴더에 자동 저장
                          if(/Android/i.test(navigator.userAgent)){
                            saveFileToDevice(file);
                          }
                          handleOpenPhotoUpload(file);
                        }
                        // allow re-selecting same file later
                        e.target.value='';
                      }}
                    />
                    <label htmlFor={`option-photo-${variant.barcode}`}> 
                      <Button variant="outlined" component="span" startIcon={<PhotoCamera />}>사진 업로드</Button>
                    </label>
                    {input.photoUrl && (
                      <Box sx={{ mt: 1 }}>
                        <img
                          src={input.photoUrl}
                          alt="제품 사진"
                          style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'cover' }}
                        />
                      </Box>
                    )}
                  </Box>
                  {error && (
                    <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                      정상수량 + 불량수량은 전체수량을 넘을 수 없습니다.
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>
        )}
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6">전표별 영수증/증빙 사진 업로드</Typography>
          <ReceiptPhotoUpload photos={receiptPhotos} setPhotos={setReceiptPhotos} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">저장</Button>
      </DialogActions>
      {/* 사진 업로드 다이얼로그 */}
      <Dialog
        open={photoUploadDialog.open}
        onClose={handleClosePhotoUpload}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>사진 적용할 바코드 선택</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              선택된 바코드: {photoUploadDialog.selectedBarcodes.length}개
            </Typography>
            <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
              {selectedVariants.map((variant) => (
                <Box
                  key={variant.barcode}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 1,
                    borderBottom: '1px solid #eee'
                  }}
                >
                  <Checkbox
                    checked={photoUploadDialog.selectedBarcodes.includes(variant.barcode)}
                    onChange={() => handleToggleBarcode(variant.barcode)}
                  />
                  <Typography>
                    {variant.productName} / {variant.size} / {variant.color} / {variant.barcode}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePhotoUpload}>취소</Button>
          <Button
            onClick={handleApplyPhoto}
            variant="contained"
            disabled={photoUploadDialog.selectedBarcodes.length === 0}
          >
            적용
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default InspectionRegister; 
