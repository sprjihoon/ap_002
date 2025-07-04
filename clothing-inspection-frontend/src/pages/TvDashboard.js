import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Grid, Card, CardContent, Divider, Paper } from '@mui/material';
import { fetchWithAuth } from '../utils/api';

// 전광판용 대시보드 – 클릭 요소 제거, 글자 크게
const TvDashboard = () => {
  const [stats, setStats] = useState({
    todayTotalInspections:0, todayCompletedInspections:0, pastPendingInspections:0,
    todayTotalQuantity:0, todayCompletedQuantity:0, todayRemainingQuantity:0, pastRemainingQuantity:0
  });
  const [progressList,setProgressList]=useState([]);
  const [unconfirmedList,setUnconfirmedList]=useState([]);

  // 완료 효과음을 위해 이전 완료 전표를 저장
  const completedSetRef = useRef(new Set());

  const playCompleteSound = ()=>{
    try{
      const ctx = new (window.AudioContext||window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.type='sine'; osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime+0.3);
    }catch(e){ console.warn('audio error',e); }
  };

  const load = async()=>{
    try{
      const [s,p,u] = await Promise.all([
        fetchWithAuth('/worker/stats'),
        fetchWithAuth('/worker/progress'),
        fetchWithAuth('/worker/unconfirmed')
      ]);
      // 완료 검사: 새로 100% 된 전표 탐색
      p.forEach(it=>{
        if(it.percent===100 && !completedSetRef.current.has(it.id)){
          completedSetRef.current.add(it.id);
          playCompleteSound();
        }
      });

      setStats(s); setProgressList(p); setUnconfirmedList(u);
    }catch(err){ console.error(err); }
  };
  useEffect(()=>{ load(); const id=setInterval(load,30000); return()=>clearInterval(id); },[]);

  return (
    <Box sx={{ p:2, bgcolor:'#000', minHeight:'100vh', color:'#fff' }}>
      <Typography variant="h3" align="center" gutterBottom>작업 현황</Typography>

      {/* 상단 카드 */}
      <Grid container spacing={2} justifyContent="center" sx={{ mb:2 }}>
        {[
          {label:'오늘 전표',value:stats.todayTotalInspections,color:'primary'},
          {label:'오늘 완료',value:stats.todayCompletedInspections,color:'success'},
          {label:'지난 미완료',value:stats.pastPendingInspections,color:'warning'}
        ].map(c=>(
          <Grid item key={c.label} xs="auto">
            <Card sx={{ bgcolor:`${c.color}.dark`, color:'#fff', width:180, height:110 }}>
              <CardContent sx={{ textAlign:'center' }}>
                <Typography variant="h6">{c.label}</Typography>
                <Typography variant="h3">{c.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 진행률 */}
      <Divider sx={{ my:2, bgcolor:'#555' }} />
      <Typography variant="h4" gutterBottom>전표별 진행률</Typography>
      <Grid container spacing={2}>
        {progressList.map(p=>(
          <Grid item xs={12} sm={6} md={4} lg={3} key={p.id}>
            <Card sx={{ bgcolor:p.percent===100?'#2e7d32':'#1565c0', color:'#fff' }}>
              <CardContent sx={{ textAlign:'center' }}>
                <Typography variant="subtitle1">{p.company}</Typography>
                <Typography variant="h5" gutterBottom>{p.inspectionName}</Typography>
                <Typography variant="h2">{p.percent}%</Typography>
                <Typography variant="body2">{p.handledCount}/{p.totalQuantity}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {unconfirmedList.length>0 && <>
        <Divider sx={{ my:2, bgcolor:'#555' }} />
        <Typography variant="h4" gutterBottom>미확정 전표</Typography>
        <Grid container spacing={2}>
          {unconfirmedList.map(u=>(
            <Grid item xs={12} sm={6} md={4} lg={3} key={u.id}>
              <Card sx={{ bgcolor:u.status==='pending'?'#f9a825':'#c62828', color:'#000', textAlign:'center' }}>
                <CardContent>
                  <Typography variant="subtitle1">{u.company}</Typography>
                  <Typography variant="h6">{u.inspectionName}</Typography>
                  <Typography variant="body2">{u.status==='pending'?'대기중':'반려'}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </>}

      <Divider sx={{ my:2, bgcolor:'#555' }} />
      <Grid container spacing={2} justifyContent="center">
        {[
          {label:'오늘 전체', val:stats.todayTotalQuantity},
          {label:'오늘 완료', val:stats.todayCompletedQuantity},
          {label:'오늘 미완료', val:stats.todayRemainingQuantity},
          {label:'지난 미완료', val:stats.pastRemainingQuantity}
        ].map(c=>(
          <Grid item xs="auto" key={c.label}>
            <Card sx={{ bgcolor:'#424242', color:'#fff', width:180, height:110 }}>
              <CardContent sx={{ textAlign:'center' }}>
                <Typography variant="h6" gutterBottom>{c.label}</Typography>
                <Typography variant="h3">{c.val}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default TvDashboard; 