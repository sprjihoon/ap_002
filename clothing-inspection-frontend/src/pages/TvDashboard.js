import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Grid, Card, CardContent, Divider, Paper } from '@mui/material';
import { fetchWithAuth, API_URL } from '../utils/api';

// 전광판용 대시보드 – 클릭 요소 제거, 글자 크게
const TvDashboard = () => {
  const [stats, setStats] = useState({
    todayTotalInspections:0, todayCompletedInspections:0, pastPendingInspections:0,
    todayTotalQuantity:0, todayCompletedQuantity:0, todayRemainingQuantity:0, pastRemainingQuantity:0
  });
  const [progressList,setProgressList]=useState([]);
  const [unconfirmedList,setUnconfirmedList]=useState([]);

  // 완료 효과음을 위해 이전 완료 전표를 저장
  const prevPercentRef = useRef({});
  const soundUrlRef = useRef(null);
  const firstPlayRef = useRef(false);

  const playCompleteSound = ()=>{
    try{
      if(soundUrlRef.current){
        const audio = new Audio(soundUrlRef.current);
        audio.play().catch(()=>{});
      }else{
        const ctx = new (window.AudioContext||window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        osc.type='sine'; osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime+0.3);
      }
    }catch(e){ console.warn('audio error',e); }
  };

  const load = async()=>{
    try{
      const [s,p,u] = await Promise.all([
        fetchWithAuth('/worker/stats'),
        fetchWithAuth('/worker/progress'),
        fetchWithAuth('/worker/unconfirmed')
      ]);
      // 최초 한 번 UI 설정 가져오기
      if(soundUrlRef.current===null){
        fetch(`${API_URL}/settings/ui`).then(r=>r.json()).then(d=>{
          soundUrlRef.current = d.completeSoundUrl||'';
        }).catch(()=>{});
      }
      // 첫 로드 시 효과음 1회 재생
      if(!firstPlayRef.current){
        playCompleteSound();
        firstPlayRef.current = true;
      }

      // 완료 검사
      const currentIds = new Set(p.map(it=>it.id));

      // 1) 이전 <100 → 이번 =100 (여전히 리스트에 존재)
      p.forEach(it => {
        const prev = prevPercentRef.current[it.id] ?? 0;
        if (prev < 100 && it.percent === 100) {
          playCompleteSound();
        }
        prevPercentRef.current[it.id] = it.percent;
      });

      // 2) 이전 <100이었던 항목이 리스트에서 사라진 경우 → 완료된 것으로 간주하고 1회 재생
      Object.entries(prevPercentRef.current).forEach(([id, prevPercent]) => {
        if (prevPercent < 100 && !currentIds.has(Number(id))) {
          playCompleteSound();
          prevPercentRef.current[id] = 100; // 중복 재생 방지
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
        {progressList.filter(p=>{
          if(p.percent<100) return true;
          const today=new Date(); const crt=new Date(p.createdAt);
          return crt.getFullYear()===today.getFullYear() && crt.getMonth()===today.getMonth() && crt.getDate()===today.getDate();
        }).map(p=>(
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