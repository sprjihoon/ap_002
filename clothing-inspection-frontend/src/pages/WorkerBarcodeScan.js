import React,{ useState,useEffect } from 'react';
import { Box, TextField, Button, Paper, Typography, CircularProgress, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Select, MenuItem } from '@mui/material';
import axios from 'axios';
import { useSnackbar } from 'notistack';
import { useLocation, useNavigate } from 'react-router-dom';

const WorkerBarcodeScan=()=>{
  const storedList = JSON.parse(sessionStorage.getItem('currentInspections') || '[]');
  const [barcode,setBarcode]=useState('');
  const [inspections,setInspections]=useState(storedList); // each item { inspection, details:[], remaining, myHandled, barcode }
  const [loading,setLoading]=useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(()=>{
    const el=document.getElementById('barcode-input');
    el&&el.focus();
  },[]);

  useEffect(()=>{
    const params = new URLSearchParams(location.search);
    const inspId = params.get('inspectionId');
    if(inspId && inspections.length===0){
      preloadInspection(inspId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const token=localStorage.getItem('token');
  const api=axios.create({ headers:{ Authorization:`Bearer ${token}` }});

  const lookup=async ()=>{
    const bc = barcode.trim();
    if(!bc) return;

    // 이미 전표가 로드되어 있는 경우 -> 정상 1개 처리
    if(inspections.length>0){
      // 현재 로드된 전표(가장 먼저 로드된 것)에서 바코드 매칭
      const idx = inspections.findIndex(item=> item.details.some(d=> d.ProductVariant?.barcode === bc));
      if(idx!==-1){
        const detail = inspections[idx].details.find(d=> d.ProductVariant?.barcode === bc);
        if(detail){
          if(detail.remaining===0){
            enqueueSnackbar('이미 처리 완료된 항목입니다.', { variant:'warning' });
          }else{
            // 자동으로 정상 1개 처리
            await handleScan(idx, detail.id, 'normal');
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
      const res=await api.get(`/api/worker/barcode/${bc}`);
      const totalRemain = res.data.details.reduce((t,d)=>t+d.remaining,0);
      const existsIdx = inspections.findIndex(i=> i.inspection.id === res.data.inspection.id);
      if(existsIdx!==-1){
        const newList=[...inspections];
        newList[existsIdx]={ ...newList[existsIdx], details: res.data.details, remaining: totalRemain, barcode: bc };
        setInspections(newList);
        sessionStorage.setItem('currentInspections', JSON.stringify(newList));
      }else{
        const newItem={ inspection: res.data.inspection,
                       details: res.data.details.map(d=>({...d, myCount:0})),
                       remaining: totalRemain, myHandled:{}, barcode: bc };
        const newList=[...inspections, newItem];
        setInspections(newList);
        sessionStorage.setItem('currentInspections', JSON.stringify(newList));
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
      const res=await api.post('/api/worker/scan',{ detailId, result, qualityGrade: grade });
      const newList=[...inspections];
      const item=newList[idx];
      // update matching detail
      const dIdx = item.details.findIndex(d=>d.id===detailId);
      if(dIdx!==-1){
         item.details[dIdx] = { ...item.details[dIdx], ...res.data.detail, remaining: res.data.remaining, myCount:(item.details[dIdx].myCount||0)+1 };
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
      const res = await api.get(`/api/worker/inspection/${id}/details`);
      const totalRemain = res.data.details.reduce((t,d)=>t+d.remaining,0);
      const newItem = { inspection: res.data.inspection, details: res.data.details.map(d=>({...d,myCount:0})), remaining: totalRemain, myHandled:{}, barcode:'' };
      setInspections([newItem]);
      sessionStorage.setItem('currentInspections', JSON.stringify([newItem]));
    }catch(err){
      enqueueSnackbar(err.response?.data?.message||'전표 불러오기 실패', { variant:'error' });
    }finally{ setLoading(false); }
  };

  return (
    <Box sx={{p:3}}>
      <Typography variant="h5" gutterBottom>바코드 스캔</Typography>
      <Paper sx={{p:2, maxWidth:400}}>
        <TextField id="barcode-input" fullWidth label="바코드" value={barcode} onChange={e=>setBarcode(e.target.value)} onKeyPress={e=>{if(e.key==='Enter'){lookup();}}} disabled={loading}/>
        <Button fullWidth variant="contained" sx={{mt:1}} onClick={lookup} disabled={loading}>{loading?<CircularProgress size={24}/>:'조회'}</Button>
      </Paper>

      {inspections.map((item,idx)=>(
        <Paper key={item.inspection.id} sx={{p:2, mt:3}}>
          <Typography>전표ID: {item.inspection.id}</Typography>
          <Typography sx={{ mt:1 }}>전표 남은수량: <b>{item.remaining}</b></Typography>

          <TableContainer component={Paper} sx={{ mt:2 }}>
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
                {item.details.map(det=>(
                  <TableRow key={det.id}>
                    <TableCell>{det.ProductVariant?.barcode}</TableCell>
                    <TableCell align="right">{det.totalQuantity}</TableCell>
                    <TableCell align="right">{det.remaining}</TableCell>
                    <TableCell align="right">{det.totalQuantity - det.remaining - (det.myCount||0)}</TableCell>
                    <TableCell align="right">{det.myCount||0}</TableCell>
                    {['normal','defect','hold'].map(r=>(
                      <TableCell key={r} align="center">
                        <Button size="small" variant={r==='normal'?'contained':'outlined'} color={r==='defect'?'error':r==='hold'?'warning':'primary'} disabled={loading || det.remaining===0} onClick={()=>handleScan(idx, det.id, r)}>
                          {r==='normal'?'정상':r==='defect'?'불량':'보류'}
                        </Button>
                      </TableCell>
                    ))}
                    <TableCell align="center">
                      <Select size="small" value={det.qualityGrade || ''} onChange={e=>updateGrade(idx,det.id,e.target.value)} displayEmpty>
                        <MenuItem value=""><em>없음</em></MenuItem>
                        {['A','B','C','D','E'].map(g=>(<MenuItem key={g} value={g}>{g}</MenuItem>))}
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ))}
    </Box>
  );
};

export default WorkerBarcodeScan; 