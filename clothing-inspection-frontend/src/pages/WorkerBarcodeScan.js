import React,{ useState,useEffect, useRef, Fragment } from 'react';
import { Box, TextField, Button, Paper, Typography, CircularProgress, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Select, MenuItem, IconButton, useTheme, useMediaQuery } from '@mui/material';
import axios from 'axios';
import { useSnackbar } from 'notistack';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_BASE } from '../utils/api';
import { Close } from '@mui/icons-material';

const WorkerBarcodeScan=()=>{
  const storedList = (JSON.parse(sessionStorage.getItem('currentInspections') || '[]')||[]).filter(it=>it.inspection && (it.remaining??1)>0);
  const [barcode,setBarcode]=useState('');
  const [inspections,setInspections]=useState(storedList); // each item { inspection, details:[], remaining, myHandled, barcode }
  const [loading,setLoading]=useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const btnStyle = { minWidth: isMobile? 90 : 80, fontSize:'0.75rem', py:0.5 };
  const selectStyle = { minWidth:isMobile? 90:80, fontSize:'0.75rem', '.MuiSelect-select':{ py:0.5 } };

  // 첫 스캔 여부를 기억할 Set (barcode 단위)
  const firstScanSet = useRef(new Set());

  useEffect(()=>{
    const el=document.getElementById('barcode-input');
    el&&el.focus();
  },[]);

  // 대시보드 등에서 링크 클릭 시 ?inspectionId= 파라미터로 전표를 로드한다.
  // location.search 가 변경될 때마다 확인해 여러 전표를 누적 로드할 수 있게 한다.
  useEffect(()=>{
    const params = new URLSearchParams(location.search);
    const inspId = params.get('inspectionId');
    if(!inspId) return;

    // 이미 로드된 전표인지 확인
    if(inspections.some(it=> String(it.inspection.id) === String(inspId))) return;

    // 처음이든 이후든 추가로 로드
    preloadInspection(inspId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[location.search]);

  useEffect(()=>{
    setInspections(list=>{
      const filtered=list.filter(it=>it.inspection && it.remaining>0);
      if(filtered.length!==list.length){
        sessionStorage.setItem('currentInspections',JSON.stringify(filtered));
      }
      return filtered;
    });
  },[]);

  const token=localStorage.getItem('token');
  const api=axios.create({ baseURL: `${API_BASE}/api`, headers:{ Authorization:`Bearer ${token}` }, withCredentials: true });

  // 간단한 비프음 재생 (normal: 삐, defect: 삐-삡)
  const playBeep = (type) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const beep = (freq, start, duration) => {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        osc.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };
      if (type === 'normal') {
        beep(880, 0, 0.15); // 삐
      } else if (type === 'defect') {
        beep(880, 0, 0.12); // 삐
        beep(660, 0.17, 0.15); // 삡
      }
    } catch (_) {}
  };

  const lookup=async ()=>{
    const bc = barcode.trim();
    if(!bc) return;

    // 이미 전표가 로드되어 있는 경우 -> 정상 1개 처리
    if(inspections.length>0){
      // 현재 로드된 전표들 중 바코드가 포함된 상세를 찾는다.
      const idx = inspections.findIndex(item=> item.remaining>0 && item.details.some(d=> d.ProductVariant?.barcode === bc));
      if(idx!==-1){
        const detail = inspections[idx].details.find(d=> d.ProductVariant?.barcode === bc);
        if(detail){
          if(detail.remaining===0){
            enqueueSnackbar('이미 처리 완료된 항목입니다.', { variant:'warning' });
          }else if(!firstScanSet.current.has(bc)){
            // 첫 스캔 : 전표만 로드 상태로 표시
            firstScanSet.current.add(bc);
            enqueueSnackbar('첫 스캔: 전표 로드되었습니다. 다시 스캔하면 정상 처리됩니다.',{variant:'info'});
          }else{
            // 두 번째 스캔부터 자동 정상 처리
            await handleScan(idx, detail.id, 'normal');
            firstScanSet.current.delete(bc);
          }
          setBarcode('');
          return;
        }
      }
      // 매칭되는 detail이 없으면 새 전표인지 확인하기 위해서 아래 기존 로직 실행
    }

    // ------ 최초 스캔(또는 다른 전표 시작) : 전표/상세 조회 ------
    setLoading(true);
    try{
      const res=await api.get(`/worker/barcode/${bc}`);
      const totalRemain = res.data.details.reduce((t,d)=>t+d.remaining,0);
      if(totalRemain===0){
        enqueueSnackbar('이미 완료된 전표입니다.',{variant:'info'});
        return;
      }
      const existsIdx = inspections.findIndex(i=> i.inspection.id === res.data.inspection.id);
      if(existsIdx!==-1){
        const newList=[...inspections];
        const prevItem = newList[existsIdx];
        const mergedDetails = res.data.details.map(d=>{
          const prev = prevItem.details.find(p=>p.id===d.id);
          return { ...d, myCount: prev?.myCount || 0 };
        });
        newList[existsIdx]={ ...prevItem, details: mergedDetails, remaining: totalRemain, barcode: bc };
        setInspections(newList);
        sessionStorage.setItem('currentInspections', JSON.stringify(newList));
      }else{
        const newItem={ inspection: res.data.inspection,
                       details: res.data.details.map(d=>({...d,myCount:0})),
                       remaining: totalRemain, myHandled:{}, barcode: bc };
        const newList=[...inspections, newItem];
        setInspections(newList);
        sessionStorage.setItem('currentInspections', JSON.stringify(newList));

        // 첫 스캔으로 로드된 상태 표시
        firstScanSet.current.add(bc);
        enqueueSnackbar('전표가 로드되었습니다. 다시 스캔하면 정상 처리됩니다.', { variant:'info' });
      }
    }catch(err){
      enqueueSnackbar(err.response?.data?.message||'조회 실패', { variant:'error' });
    }finally{setLoading(false); setBarcode('');}
  };

  const handleScan=async(idx,detailId,result)=>{
    const target=inspections[idx];
    if(!target) return;
    setLoading(true);
    try{
      const grade=target.details.find(d=>d.id===detailId)?.qualityGrade || null;
      const res=await api.post('/worker/scan',{ detailId, result, qualityGrade: grade });
      const newList=[...inspections];
      const item=newList[idx];
      // update matching detail
      const dIdx = item.details.findIndex(d=>d.id===detailId);
      if(dIdx!==-1){
         const updatedDetail = { ...item.details[dIdx], ...res.data.detail, remaining: res.data.remaining, myCount:(item.details[dIdx].myCount||0)+1 };
         updatedDetail.history = [...(item.details[dIdx].history||[]), result];
         item.details[dIdx] = updatedDetail;
      }
      item.remaining = item.details.reduce((t,d)=>t+d.remaining,0);
      const prev = item.myHandled[result]||0;
      item.myHandled = { ...item.myHandled, [result]: prev+1 };
      setInspections(newList);
      if(item.remaining===0){
         const filtered=newList.filter((_,i)=>i!==idx);
         setInspections(filtered);
         sessionStorage.setItem('currentInspections', JSON.stringify(filtered));
      } else {
         sessionStorage.setItem('currentInspections', JSON.stringify(newList));
      }
      playBeep(result);
      enqueueSnackbar(`${result==='normal'?'정상':'불량'} 처리 완료, 남은 수량 ${res.data.remaining}`, { variant:'success' });
    }catch(err){
      enqueueSnackbar(err.response?.data?.message||'스캔 실패', { variant:'error' });
    }finally{setLoading(false);}
  };

  const updateGrade=(cardIdx, detailId, grade)=>{
    setInspections(list=>{
      const copy=[...list];
      const dIdx = copy[cardIdx].details.findIndex(d=>d.id===detailId);
      if(dIdx!==-1){
        copy[cardIdx].details[dIdx].qualityGrade = grade;
      }
      return copy;
    });
  };

  const preloadInspection = async(id)=>{
    setLoading(true);
    try{
      const res = await api.get(`/worker/inspection/${id}/details`);
      const totalRemain = res.data.details.reduce((t,d)=>t+d.remaining,0);
      if(totalRemain===0){
        enqueueSnackbar('이미 완료된 전표입니다.', { variant:'info' });
        return;
      }
      setInspections(prev=>{
        // 이미 동일 전표가 있으면 대체하지 않고 그대로 둔다.
        if(prev.some(it=>it.inspection.id===res.data.inspection.id)) return prev;
        const newItem = { inspection: res.data.inspection, details: res.data.details.map(d=>({...d,myCount:0})), remaining: totalRemain, myHandled:{}, barcode:'' };
        const newList=[...prev, newItem];
        sessionStorage.setItem('currentInspections', JSON.stringify(newList));
        enqueueSnackbar('전표가 로드되었습니다. 바코드를 스캔하여 처리를 시작하세요.', { variant:'info' });
        return newList;
      });
    }catch(err){
      enqueueSnackbar(err.response?.data?.message||'전표 불러오기 실패', { variant:'error' });
    }finally{ setLoading(false); }
  };

  const handleCloseCard = (idx)=>{
    setInspections(list=>{
      const copy=[...list];
      copy.splice(idx,1);
      sessionStorage.setItem('currentInspections',JSON.stringify(copy));
      return copy;
    });
  };

  const handleReset = ()=>{
    setBarcode('');
    setInspections([]);
    firstScanSet.current.clear();
    sessionStorage.removeItem('currentInspections');
    document.getElementById('barcode-input')?.focus();
  };

  const handleUndo = async(cardIdx, detailId, result)=>{
    setLoading(true);
    try{
      const res = await api.post('/worker/scan/undo',{ detailId, result });
      const newList=[...inspections];
      const item=newList[cardIdx];
      const dIdx=item.details.findIndex(d=>d.id===detailId);
      if(dIdx!==-1){
        const det=item.details[dIdx];
        det.remaining = res.data.remaining;
        det.myCount = Math.max(0,(det.myCount||0)-1);
        if(det.history && det.history.length>0){ det.history.pop(); }
        if(det.remaining>0){ // update totals
          item.remaining = item.details.reduce((t,d)=>t+d.remaining,0);
        }
      }
      setInspections(newList);
      sessionStorage.setItem('currentInspections',JSON.stringify(newList));
      enqueueSnackbar('1건 취소되었습니다.',{variant:'info'});
    }catch(err){ enqueueSnackbar(err.response?.data?.message||'취소 실패',{variant:'error'});}finally{ setLoading(false); }
  };

  return (
    <Box sx={{p:3}}>
      <Typography variant="h5" gutterBottom>바코드 스캔</Typography>
      <Paper sx={{ p:2, width:'100%', maxWidth: isMobile ? '100%' : 400 }}>
        <TextField
          id="barcode-input"
          fullWidth
          label="바코드"
          value={barcode}
          onChange={e=>setBarcode(e.target.value)}
          onKeyPress={e=>{if(e.key==='Enter'){lookup();}}}
          disabled={loading}
          inputProps={{ inputMode:'none', style:{ imeMode:'disabled' } }}
          autoComplete="off"
        />
        <Grid container spacing={1} sx={{mt:1}}>
          <Grid item xs>
            <Button fullWidth variant="contained" onClick={lookup} disabled={loading}>{loading?<CircularProgress size={24}/>:'조회'}</Button>
          </Grid>
          <Grid item xs>
            <Button fullWidth variant="outlined" color="warning" onClick={handleReset}>초기화</Button>
          </Grid>
        </Grid>
      </Paper>

      {inspections.filter(it=>it.remaining>0).map((item,idx)=>(
        <Paper key={item.inspection.id} sx={{p:2, mt:3, position:'relative'}}>
          <Box sx={{ position:'absolute', top:4, right:4 }}>
            <IconButton size="small" onClick={()=>handleCloseCard(idx)} title="닫기">
              <Close fontSize="small" />
            </IconButton>
          </Box>
          <Typography>전표ID: {item.inspection.id}</Typography>
          <Typography sx={{ mt:1 }}>전표 남은수량: <b>{item.remaining}</b></Typography>

          <TableContainer component={Paper} sx={{ mt:2, overflowX:'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>바코드</TableCell>
                  <TableCell align="right">총수량</TableCell>
                  <TableCell align="right">남은</TableCell>
                  <TableCell align="right">타인</TableCell>
                  <TableCell align="right">나</TableCell>
                  <TableCell align="center" colSpan={3}>처리</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {item.details.map(det=>{
                  const actionButtons = (
                    <Box sx={{ display:'flex', flexWrap:'nowrap', gap:1, justifyContent:'center', overflowX:'auto', alignItems:'center' }}>
                      {['normal','defect','hold'].map(r=> (
<<<<<<< Updated upstream
                        <Button key={r} size="small" variant={r==='normal'?'contained':'outlined'} color={r==='defect'?'error':r==='hold'?'warning':'primary'} disabled={loading || det.remaining===0} onClick={()=>handleScan(idx, det.id, r)} sx={{ minWidth:64 }}>
                          {r==='normal'?'정상':r==='defect'?'불량':'보류'}
                        </Button>
                      ))}
                      {/* 단일 되돌리기 버튼 */}
                      <IconButton
                        onClick={()=>{
                          const last = det.history?.[det.history.length-1];
                          if(!last){ enqueueSnackbar('되돌릴 항목이 없습니다',{variant:'info'}); return; }
                          handleUndo(idx, det.id, last);
                        }}
                        disabled={loading || !(det.history?.length)}
                        title="되돌리기"
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: '#cfd2d9',
                          bgcolor: 'transparent',
                          color: det.myCount===0 ? 'grey.400' : 'grey.900',
                          '& span': { fontSize: 22, lineHeight:1 },
                          '&:disabled': {
                            color: 'grey.400'
                          }
                        }}
                      >
                        <span style={{fontSize:22, lineHeight:1}}>⟲</span>
                      </IconButton>
                      <Select size="small" value={det.qualityGrade || ''} onChange={e=>updateGrade(idx,det.id,e.target.value)} displayEmpty sx={{ ml:1 }}>
=======
                        <Box key={r} sx={{ display:'flex', alignItems:'center' }}>
                          <Button size="small" variant={r==='normal'?'contained':'outlined'} color={r==='defect'?'error':r==='hold'?'warning':'primary'} disabled={loading || det.remaining===0} onClick={()=>handleScan(idx, det.id, r)} sx={btnStyle}>
                            {r==='normal'?'정상':r==='defect'?'불량':'보류'}
                          </Button>
                          {det.myCount>0 && (
                            <IconButton size="small" color="secondary" onClick={()=>handleUndo(idx, det.id, r)} disabled={loading} title="되돌리기">
                              <Undo fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      ))}
                      <Select size="small" value={det.qualityGrade || ''} onChange={e=>updateGrade(idx,det.id,e.target.value)} displayEmpty sx={{ ...selectStyle, ml:1 }}>
>>>>>>> Stashed changes
                        <MenuItem value=""><em>등급</em></MenuItem>
                        {['A','B','C','D','E'].map(g=>(<MenuItem key={g} value={g}>{g}</MenuItem>))}
                      </Select>
                    </Box>
                  );

                  if(isMobile){
                    return (
                      <Fragment key={det.id}>
                        <TableRow>
                          <TableCell>{det.ProductVariant?.barcode}</TableCell>
                          <TableCell align="right">{det.totalQuantity}</TableCell>
                          <TableCell align="right">{det.remaining}</TableCell>
                          <TableCell align="right">{det.totalQuantity - det.remaining - (det.myCount||0)}</TableCell>
                          <TableCell align="right">{det.myCount||0}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={5} align="center">
                            {actionButtons}
                          </TableCell>
                        </TableRow>
                      </Fragment>
                    );
                  }

                  // desktop default
                  return (
                    <TableRow key={det.id}>
                      <TableCell>{det.ProductVariant?.barcode}</TableCell>
                      <TableCell align="right">{det.totalQuantity}</TableCell>
                      <TableCell align="right">{det.remaining}</TableCell>
                      <TableCell align="right">{det.totalQuantity - det.remaining - (det.myCount||0)}</TableCell>
                      <TableCell align="right">{det.myCount||0}</TableCell>
                      <TableCell align="center" colSpan={3}>
                        {actionButtons}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ))}
    </Box>
  );
};

export default WorkerBarcodeScan; 
