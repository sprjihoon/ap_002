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
  CircularProgress,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { ArrowBack, Check, Close, Edit, Delete, FileDownload, Restore } from '@mui/icons-material';
import SpeakerNotesIcon from '@mui/icons-material/SpeakerNotes';
import Tooltip from '@mui/material/Tooltip';
import axios from 'axios';
import { useSnackbar } from 'notistack';

const InspectionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user.role;
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({ inspectionName:'', comment:'', result:'pass' });
  const [detailEdit, setDetailEdit] = useState({ open:false, detail:null, form:{} });
  const [commentText, setCommentText] = useState('');
  const [commentThread, setCommentThread] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [replyContent, setReplyContent] = useState({});
  const [operatorEditMode, setOperatorEditMode] = useState(false);

  // 검수 상세 정보 조회
  const fetchInspectionDetail = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/inspections/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setInspection(response.data.data || response.data);
        const d = response.data.data || response.data;
        setEditData({ inspectionName:d.inspectionName, comment:d.comment||'', result:d.result });
        setCommentText(d.comment || '');
        setCommentThread(d.comments || []);
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

  // 대기중으로 변경
  const handlePending = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`/api/inspections/${id}/pending`, {}, { headers:{ Authorization:`Bearer ${token}` }});
      if (res.data.success) {
        enqueueSnackbar('대기중 상태로 변경되었습니다.', { variant:'success' });
        fetchInspectionDetail();
      }
    } catch(error) {
      console.error('대기중 변경 실패:', error);
      enqueueSnackbar('상태 변경 중 오류가 발생했습니다.', { variant:'error' });
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

  // 전표 수정
  const handleSaveEdit = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/inspections/${id}`, editData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      enqueueSnackbar('수정되었습니다.', { variant: 'success' });
      setEditOpen(false);
      fetchInspectionDetail();
    } catch (error) {
      console.error('수정 실패:', error);
      enqueueSnackbar('수정 중 오류가 발생했습니다.', { variant: 'error' });
    }
  };

  // 전표 삭제
  const handleDelete = async () => {
    if (!window.confirm('해당 검수 전표를 삭제하시겠습니까?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/inspections/${id}`, { headers:{ Authorization:`Bearer ${token}` }});
      enqueueSnackbar('삭제되었습니다.', { variant:'success' });
      navigate('/inspections');
    } catch (error) {
      console.error('삭제 실패:', error);
      enqueueSnackbar('삭제 중 오류가 발생했습니다.', { variant:'error' });
    }
  };

  const handleOpenDetailEdit = (detail) => {
    setDetailEdit({
      open: true,
      detail,
      form: {
        totalQuantity: detail.totalQuantity,
        normalQuantity: detail.normalQuantity,
        defectQuantity: detail.defectQuantity,
        result: detail.result,
        comment: detail.comment || '',
        photoUrl: detail.photoUrl || '',
        photoFile: null
      }
    });
  };

  const handleSaveDetailEdit = async () => {
    try {
      const token = localStorage.getItem('token');
      let payload = { ...detailEdit.form };
      if (detailEdit.form.photoFile) {
        const formData = new FormData();
        formData.append('photo', detailEdit.form.photoFile);
        if (detailEdit.detail?.ProductVariant?.barcode) {
          formData.append('barcodes[]', detailEdit.detail.ProductVariant.barcode);
        }
        const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        const uploadRes = await axios.post(`${API_BASE}/api/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        let url = uploadRes.data.url || uploadRes.data.urls || '';
        if (Array.isArray(uploadRes.data.urls)) url = uploadRes.data.urls[0];
        if (url && !url.startsWith('http')) url = `${API_BASE}${url}`;
        payload.photoUrl = url;
      }

      await axios.put(`/api/inspections/details/${detailEdit.detail.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      enqueueSnackbar('상세 항목이 수정되었습니다.', { variant:'success' });
      setDetailEdit({ open:false, detail:null, form:{} });
      fetchInspectionDetail();
    } catch (error) {
      console.error('상세 수정 실패:', error);
      enqueueSnackbar('상세 수정 중 오류가 발생했습니다.', { variant:'error' });
    }
  };

  const handleDetailFormChange = (field, value) => {
    setDetailEdit(prev => ({ ...prev, form:{ ...prev.form, [field]: value } }));
  };

  const handleDeleteDetail = async (detail) => {
    if (!window.confirm('해당 항목을 삭제하시겠습니까?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/inspections/details/${detail.id}`, { headers:{ Authorization:`Bearer ${token}` }});
      enqueueSnackbar('삭제되었습니다.', { variant:'success' });
      fetchInspectionDetail();
    } catch (error) {
      console.error('항목 삭제 실패:', error);
      enqueueSnackbar('삭제 중 오류가 발생했습니다.', { variant:'error' });
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      setDetailEdit(prev => ({ ...prev, form:{ ...prev.form, photoFile:file, photoUrl:preview } }));
    }
  };

  // 운영자 코멘트 수정
  const handleSaveComment = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/inspections/${inspection.id}/comment`, { comment: commentText }, {
        headers:{ Authorization:`Bearer ${token}` }
      });
      enqueueSnackbar('코멘트가 저장되었습니다.', { variant:'success' });
      setInspection(prev => ({
        ...prev,
        comment: commentText,
        hasNewComment: false
      }));
      setCommentText('');
      fetchInspectionDetail();
    } catch (err) {
      console.error('코멘트 저장 실패:', err);
      enqueueSnackbar(err.response?.data?.message || '저장 중 오류 발생', { variant:'error' });
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/inspections/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('fail');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${inspection?.inspectionName || 'inspection'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      enqueueSnackbar('PDF 다운로드 실패', { variant:'error' });
    }
  };

  const handleDownloadEZExcel = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/inspections/${id}/ez-admin-xlsx`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('fail');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${inspection?.inspectionName || 'inspection'}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      enqueueSnackbar('엑셀 다운로드 실패', { variant:'error' });
    }
  };

  // 댓글 추가
  const handleAddComment = async () => {
    if (!newComment.trim()) {
      enqueueSnackbar('내용을 입력하세요.', { variant:'warning' });
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`/api/inspections/${id}/comments`, { content:newComment }, {
        headers:{ Authorization:`Bearer ${token}` }
      });
      if (res.data.success) {
        setCommentThread(prev=>[...prev, res.data.comment]);
        setNewComment('');
      }
    } catch(err){
      enqueueSnackbar(err.response?.data?.message || '댓글 등록 실패', { variant:'error' });
    }
  };

  const handleStartEdit = (c) => {
    setEditingCommentId(c.id);
    setEditingContent(c.content);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingContent('');
  };

  // 댓글 또는 답글 저장 (수정)
  const handleSaveEditComment = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`/api/inspections/comments/${editingCommentId}`, { content: editingContent }, {
        headers:{ Authorization:`Bearer ${token}` }
      });
      if (res.data.success) {
        // 수정된 댓글(혹은 답글)을 트리 내에서 업데이트
        const updated = res.data.comment;
        setCommentThread(prev => prev.map(c => {
          if (c.id === updated.id) return updated; // 최상위 댓글 수정
          if (c.replies) {
            return { ...c, replies: c.replies.map(r => r.id === updated.id ? updated : r) };
          }
          return c;
        }));
        handleCancelEdit();
      }
    } catch(err){
      enqueueSnackbar(err.response?.data?.message || '수정 실패', { variant:'error' });
    }
  };

  // 댓글/답글 삭제
  const handleDeleteComment = async (c) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/inspections/comments/${c.id}`, { headers:{ Authorization:`Bearer ${token}` }});

      if (c.parentCommentId) {
        // 답글 삭제 – 부모 댓글의 replies 배열에서 제거
        setCommentThread(prev => prev.map(p => {
          if (p.id === c.parentCommentId) {
            return { ...p, replies: p.replies.filter(r => r.id !== c.id) };
          }
          return p;
        }));
      } else {
        // 최상위 댓글 삭제 – 본인 및 연결된 답글까지 제거
        setCommentThread(prev => prev.filter(cc => cc.id !== c.id && cc.parentCommentId !== c.id));
      }
    } catch(err){
      enqueueSnackbar(err.response?.data?.message || '삭제 실패', { variant:'error' });
    }
  };

  const handleAddReply = async (parentId) => {
    const text = replyContent[parentId] || '';
    if (!text.trim()) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`/api/inspections/comments/${parentId}/replies`, { content: text }, {
        headers:{ Authorization:`Bearer ${token}` }
      });
      if (res.data.success) {
        // append reply under parent
        setCommentThread(prev => prev.map(c => {
          if (c.id === parentId) {
            const replies = c.replies ? [...c.replies, res.data.comment] : [res.data.comment];
            return { ...c, replies };
          }
          return c;
        }));
        // 입력창 닫기 (key 제거)
        setReplyContent(prev => {
          const { [parentId]: _removed, ...rest } = prev;
          return rest;
        });
      }
    } catch(err){
      enqueueSnackbar(err.response?.data?.message || '답글 등록 실패', { variant:'error' });
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
        <Button variant="outlined" size="small" startIcon={<FileDownload />} onClick={handleDownloadPDF}>
          PDF
        </Button>
        <Button variant="outlined" size="small" startIcon={<FileDownload />} onClick={handleDownloadEZExcel}>
          양식
        </Button>
        <Chip
          label={inspection.status === 'pending' ? '대기중' : inspection.status === 'approved' ? '확정' : '반려'}
          color={inspection.status === 'pending' ? 'warning' : inspection.status === 'approved' ? 'success' : 'error'}
          sx={{ ml: 'auto' }}
          onClick={()=>{}}
        />
        {userRole !== 'operator' && (
          <>
            <IconButton size="small" onClick={() => setEditOpen(true)}>
              <Edit />
            </IconButton>
            <IconButton size="small" color="error" onClick={handleDelete}>
              <Delete />
            </IconButton>
          </>
        )}
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
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">검수자</Typography>
            <Typography variant="body1">{inspection.inspector?.name || inspection.inspector?.username || '-'}</Typography>
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
            <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              {detail.ProductVariant?.product?.productName} / {detail.ProductVariant?.size} / {detail.ProductVariant?.color}
            </Typography>
               {userRole !== 'operator' && (
                 <Box sx={{ ml: 'auto', display:'flex', gap:0.5 }}>
                   <IconButton size="small" onClick={()=>handleOpenDetailEdit(detail)}><Edit fontSize="small" /></IconButton>
                   <IconButton size="small" color="error" onClick={()=>handleDeleteDetail(detail)}><Delete fontSize="small" /></IconButton>
                 </Box>
               )}
            </Box>
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
                  <Tooltip
                    title={<Box component="img" src={detail.photoUrl} alt="large" sx={{ maxWidth:300, maxHeight:300 }} />}
                    placement="right"
                    followCursor
                  >
                  <Box
                    component="img"
                    src={detail.photoUrl}
                    alt="검수 사진"
                      sx={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 1, cursor:'pointer' }}
                  />
                  </Tooltip>
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
                  <a href={photo.photoUrl} target="_blank" rel="noopener noreferrer" download style={{ textDecoration:'none' }}>
                    <Box
                      component="img"
                      src={photo.photoUrl}
                      alt={`영수증 ${index + 1}`}
                      sx={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 1, '&:hover':{ opacity:0.8 } }}
                    />
                  </a>
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

      {/* 전표 코멘트 */}
      <Paper sx={{ p:3, mb:3 }}>
        <Typography variant="h6" sx={{ mb:1 }}>전표 코멘트</Typography>
        {userRole === 'operator' ? (
          operatorEditMode || !inspection.comment ? (
            <>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={commentText}
                onChange={e=>setCommentText(e.target.value)}
              />
              <Box sx={{ display:'flex', justifyContent:'flex-end', mt:2, gap:1 }}>
                <Button variant="contained" onClick={async ()=>{await handleSaveComment(); setOperatorEditMode(false);}}>
                  {inspection.comment ? '저장' : '등록'}
                </Button>
                {inspection.comment && (
                  <Button onClick={()=>{ setOperatorEditMode(false); setCommentText(inspection.comment || ''); }}>취소</Button>
                )}
              </Box>
            </>
          ) : (
            <>
              <Typography sx={{ whiteSpace:'pre-wrap' }}>{inspection.comment}</Typography>
              <Box sx={{ display:'flex', justifyContent:'flex-end', mt:1 }}>
                <Button size="small" variant="outlined" onClick={()=>setOperatorEditMode(true)}>수정</Button>
              </Box>
            </>
          )
        ) : (
          <Typography sx={{ whiteSpace:'pre-wrap' }}>{inspection.comment || '-'}</Typography>
        )}
      </Paper>

      {/* 댓글 스레드 (관리자/검수자) */}
      <Paper sx={{ p:3, mb:3 }}>
        <Typography variant="h6" sx={{ mb:1 }}><SpeakerNotesIcon fontSize="small" sx={{ mr:0.5 }}/>댓글</Typography>
        {true && (
          <Box sx={{ mb:2 }}>
            <TextField
              fullWidth
              multiline
              minRows={2}
              placeholder="댓글을 입력하세요"
              value={newComment}
              onChange={e=>setNewComment(e.target.value)}
            />
            <Box sx={{ display:'flex', justifyContent:'flex-end', mt:1 }}>
              <Button variant="contained" size="small" onClick={handleAddComment}>등록</Button>
            </Box>
          </Box>
        )}

        {commentThread.length === 0 && (
          <Typography color="text.secondary">등록된 댓글이 없습니다.</Typography>
        )}

        {commentThread.map(c => (
          <Box key={c.id} sx={{ mb:1.5, border:'1px solid #eee', p:1, borderRadius:1 }}>
            <Typography variant="subtitle2">{c.User?.name || '익명'} ({c.User?.role})</Typography>
            {editingCommentId === c.id ? (
              <>
                <TextField fullWidth multiline minRows={2} value={editingContent} onChange={e=>setEditingContent(e.target.value)} />
                <Box sx={{ display:'flex', gap:1, mt:0.5 }}>
                  <Button size="small" variant="contained" onClick={handleSaveEditComment}>저장</Button>
                  <Button size="small" onClick={handleCancelEdit}>취소</Button>
                </Box>
              </>
            ) : (
              <Typography variant="body2" sx={{ whiteSpace:'pre-wrap' }}>{c.content}</Typography>
            )}
            <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
              <Typography variant="caption" color="text.secondary">{new Date(c.createdAt).toLocaleString()}</Typography>
              { (user.id === c.userId || userRole==='admin') && editingCommentId !== c.id && (
                <>
                  <Button size="small" onClick={()=>handleStartEdit(c)}>수정</Button>
                  <Button size="small" color="error" onClick={()=>handleDeleteComment(c)}>삭제</Button>
                </>
              )}
              <Button size="small" onClick={()=>{
                setReplyContent(prev=>({...prev, [c.id]:(prev[c.id]||'')}));
              }}>답글</Button>
            </Box>

            {/* reply input */}
            {replyContent.hasOwnProperty(c.id) && (
              <Box sx={{ mt:1 }}>
                <TextField fullWidth multiline minRows={2} value={replyContent[c.id]} onChange={e=>setReplyContent(prev=>({...prev, [c.id]:e.target.value}))} />
                <Box sx={{ display:'flex', justifyContent:'flex-end', mt:0.5 }}>
                  <Button size="small" variant="contained" onClick={()=>handleAddReply(c.id)}>등록</Button>
                </Box>
              </Box>
            )}

            {/* replies list */}
            {c.replies && c.replies.map(r => (
              <Box key={r.id} sx={{ mt:1, ml:3, p:1, borderLeft:'2px solid #ddd' }}>
                <Typography variant="subtitle2">{r.User?.name || '익명'} ({r.User?.role})</Typography>

                {editingCommentId === r.id ? (
                  <>
                    <TextField fullWidth multiline minRows={2} value={editingContent} onChange={e=>setEditingContent(e.target.value)} />
                    <Box sx={{ display:'flex', gap:1, mt:0.5 }}>
                      <Button size="small" variant="contained" onClick={handleSaveEditComment}>저장</Button>
                      <Button size="small" onClick={handleCancelEdit}>취소</Button>
                    </Box>
                  </>
                ) : (
                  <Typography variant="body2" sx={{ whiteSpace:'pre-wrap' }}>{r.content}</Typography>
                )}

                <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                  <Typography variant="caption" color="text.secondary">{new Date(r.createdAt).toLocaleString()}</Typography>
                  { (user.id === r.userId || userRole==='admin') && editingCommentId !== r.id && (
                    <>
                      <Button size="small" onClick={()=>handleStartEdit(r)}>수정</Button>
                      <Button size="small" color="error" onClick={()=>handleDeleteComment(r)}>삭제</Button>
                    </>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        ))}
      </Paper>

      {/* 확정/반려 버튼 (모든 역할) */}
      {(user.id === inspection.inspector_id || userRole==='admin') && (
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            startIcon={<Restore />}
            onClick={handlePending}
          >
            대기중
          </Button>
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
            확정
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

      {/* 수정 다이얼로그 */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
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
            fullWidth
            multiline rows={3}
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
          <Button onClick={()=>setEditOpen(false)}>취소</Button>
          <Button variant="contained" onClick={handleSaveEdit}>저장</Button>
        </DialogActions>
      </Dialog>

      {/* 상세 항목 수정 다이얼로그 */}
      <Dialog open={detailEdit.open} onClose={() => setDetailEdit({ open:false, detail:null, form:{} })}>
        <DialogTitle>상세 항목 수정</DialogTitle>
        <DialogContent>
          <TextField
            label="전체수량"
            fullWidth
            margin="normal"
            value={detailEdit.form.totalQuantity}
            onChange={(e) => handleDetailFormChange('totalQuantity', e.target.value)}
          />
          <TextField
            label="정상수량"
            fullWidth
            margin="normal"
            value={detailEdit.form.normalQuantity}
            onChange={(e) => handleDetailFormChange('normalQuantity', e.target.value)}
          />
          <TextField
            label="불량수량"
            fullWidth
            margin="normal"
            value={detailEdit.form.defectQuantity}
            onChange={(e) => handleDetailFormChange('defectQuantity', e.target.value)}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>결과</InputLabel>
            <Select
              value={detailEdit.form.result}
              label="결과"
              onChange={(e) => handleDetailFormChange('result', e.target.value)}
            >
              <MenuItem value="pass">정상</MenuItem>
              <MenuItem value="fail">불량</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="코멘트"
            fullWidth
            multiline rows={3}
            margin="normal"
            value={detailEdit.form.comment}
            onChange={(e) => handleDetailFormChange('comment', e.target.value)}
          />
          <Box sx={{ mt:2 }}>
            {detailEdit.form.photoUrl && (
              <Box component="img" src={detailEdit.form.photoUrl} alt="사진 미리보기" sx={{ maxWidth:200, maxHeight:200, mb:1 }} />
            )}
            <Button variant="outlined" component="label" size="small">
              사진 선택
              <input type="file" hidden accept="image/*" onChange={handlePhotoSelect} />
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailEdit({ open:false, detail:null, form:{} })}>취소</Button>
          <Button variant="contained" onClick={handleSaveDetailEdit}>저장</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InspectionDetail; 