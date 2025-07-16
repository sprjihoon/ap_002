import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { API_BASE } from '../utils/api';
import { Button as BsButton, Alert, ProgressBar } from 'react-bootstrap';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import {
  Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem
} from '@mui/material';

const ExcelUpload = ({ onSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [uploadResponse, setUploadResponse] = useState(null);
  const [error, setError] = useState(null);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({
    inspectionName: '',
    comment: '',
    result: 'pass'
  });

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_BASE}/api/products/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        withCredentials: true
      });
      setResult(response.data);
      setUploadResponse(response);
      if (onSuccess) onSuccess();
      if (response.data.success) {
        enqueueSnackbar('검수가 성공적으로 등록되었습니다.', { variant: 'success' });
        navigate(`/inspections/${response.data.data.inspectionId}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || '파일 업로드 중 오류가 발생했습니다.');
      console.error('Inspection POST error:', err);
    } finally {
      setUploading(false);
    }
  }, [onSuccess, enqueueSnackbar, navigate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  const handleSampleDownload = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/products/sample`, {
        responseType: 'blob',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        withCredentials: true
      });

      // 파일 다운로드
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'sample_products.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('샘플 파일 다운로드 중 오류가 발생했습니다.');
    }
  };

  const handleSaveEdit = async ()=>{
    try{
      const token = localStorage.getItem('token');
      if(!uploadResponse) return;
       await axios.put(`${API_BASE}/api/inspections/${uploadResponse.data.data.inspectionId}`, editData,{
        headers:{ Authorization:`Bearer ${token}` },
        withCredentials: true
      });
      enqueueSnackbar('수정되었습니다.',{variant:'success'});
      setEditOpen(false);
    }catch(err){
      console.error(err);
      enqueueSnackbar('수정 실패', {variant:'error'});
    }
  };

  const user = JSON.parse(localStorage.getItem('user')||'{}');

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3>엑셀 파일 업로드</h3>
        <BsButton variant="outline-primary" onClick={handleSampleDownload}>
          샘플 파일 다운로드
        </BsButton>
      </div>

      <div
        {...getRootProps()}
        className={`p-5 border rounded text-center ${isDragActive ? 'bg-light' : ''}`}
        style={{ cursor: 'pointer' }}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>파일을 여기에 놓으세요...</p>
        ) : (
          <p>엑셀 파일을 드래그하거나 클릭하여 업로드하세요</p>
        )}
      </div>

      {uploading && (
        <div className="mt-3">
          <ProgressBar animated now={100} />
          <p className="text-center mt-2">파일 업로드 중...</p>
        </div>
      )}

      {error && (
        <Alert variant="danger" className="mt-3">
          {error}
        </Alert>
      )}

      {result && (
        <Alert variant="success" className="mt-3">
          <h4>업로드 결과</h4>
          <p>성공: {result.results.success}개</p>
          <p>실패: {result.results.failed}개</p>
          {result.results.errors.length > 0 && (
            <div>
              <h5>오류 목록:</h5>
              <ul>
                {result.results.errors.map((err, index) => (
                  <li key={index}>
                    행: {JSON.stringify(err.row)} - {err.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Alert>
      )}

      <div className="mt-4">
        <h4>엑셀 파일 형식 안내</h4>
        <p>다음 컬럼을 포함해야 합니다:</p>
        <ul>
          <li>company (업체명) - 필수</li>
          <li>productName (제품명) - 필수</li>
          <li>size (사이즈, 쉼표로 구분) - 필수</li>
          <li>color (컬러, 쉼표로 구분) - 필수</li>
          <li>extraOption (추가옵션 구분) - 선택</li>
          <li>wholesaler (도매처명) - 필수</li>
          <li>wholesalerProductName (도매처제품명) - 필수</li>
          <li>location (로케이션정보) - 선택</li>
          <li>barcode (바코드) - 선택</li>
        </ul>
      </div>

      { uploadResponse && uploadResponse.data?.data?.inspector_id && (user.role==='admin' || user.id===uploadResponse.data.data.inspector_id) && (
        <BsButton
          startIcon={<EditIcon />}
          onClick={() => setEditOpen(true)}
        >
          편집
        </BsButton>
      ) }

      <Dialog open={editOpen} onClose={()=>setEditOpen(false)}>
        <DialogTitle>검수 정보 수정</DialogTitle>
        <DialogContent>
          <TextField
            label="검수전표명"
            fullWidth
            margin="normal"
            value={editData.inspectionName}
            onChange={e=>setEditData({...editData, inspectionName:e.target.value})}
          />
          <TextField
            label="코멘트"
            fullWidth multiline rows={3}
            margin="normal"
            value={editData.comment}
            onChange={e=>setEditData({...editData, comment:e.target.value})}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>결과</InputLabel>
            <Select
              value={editData.result}
              label="결과"
              onChange={e=>setEditData({...editData, result:e.target.value})}
            >
              <MenuItem value="pass">정상</MenuItem>
              <MenuItem value="fail">불량</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <BsButton onClick={()=>setEditOpen(false)}>취소</BsButton>
          <BsButton variant="contained" onClick={handleSaveEdit}>저장</BsButton>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ExcelUpload; 
