import React, { useEffect, useState, useRef } from 'react';
import { keyframes } from '@emotion/react';
import { Box, Typography, Grid, Card, CardContent, Divider, Paper } from '@mui/material';
import { fetchWithAuth, API_BASE } from '../utils/api';

// 전광판용 대시보드 – 클릭 요소 제거, 글자 크게
const TvDashboard = () => {
  const [stats, setStats] = useState({
    todayTotalInspections:0, todayCompletedInspections:0, pastPendingInspections:0,
    todayTotalQuantity:0, todayCompletedQuantity:0, todayRemainingQuantity:0, pastRemainingQuantity:0,
    todayWorkQuantity:0, pastSlipTodayQuantity:0
  });
  const [progressList,setProgressList]=useState([]);
  const [unconfirmedList,setUnconfirmedList]=useState([]);

  // 완료 효과음을 위해 이전 완료 전표를 저장
  const prevPercentRef = useRef({});
  const soundUrlRef = useRef(null);
  // 제거: 최초 로딩 시 완료 음이 재생되는 문제 방지 (startup sound만 재생)

  const playCompleteSound = () => {
    try {
      let urlToPlay = '';
      if (soundUrlRef.current) {
        const { mode, list, idx } = soundUrlRef.current;
        if (mode === 'sequential') {
          urlToPlay = list[idx.current % list.length];
          idx.current += 1;
        } else {
          urlToPlay = list[Math.floor(Math.random()*list.length)];
        }
      }

      if (urlToPlay) {
        const audio = new Audio();
        audio.crossOrigin = 'anonymous';
        audio.src = urlToPlay;
        audio.play().catch(err=>console.warn('audio play failed',err));
      }
    } catch (e) {
      console.warn('audio error', e);
    }
  };

  const load = async()=>{
    try{
      const [s,p,u] = await Promise.all([
        fetchWithAuth('/api/worker/stats'),
        fetchWithAuth('/api/worker/progress'),
        fetchWithAuth('/api/worker/unconfirmed')
      ]);
      if (!soundUrlRef.current) {
        fetch(`${API_BASE}/api/settings/ui`, { credentials:'include' })
          .then(r=>r.json())
          .then(d=>{
            const mode = d.soundPlayMode||'random';
            const list = (d.sounds||[]).map(u=>u.startsWith('/')?`${API_BASE}${u}`:u);
            if(list.length===0) return;
            soundUrlRef.current={ mode, list, idx: {current:0} };
          });
      }

      // 완료 검사
      const currentIds = new Set(p.map(it=>it.id));

      let shouldPlay = false; // 이번 주기 동안 1회만 재생 플래그

      // 1) 이전 <100 → 이번 =100 (여전히 리스트에 존재)
      p.forEach(it => {
        const prev = prevPercentRef.current[it.id] ?? 0;
        if (prev < 100 && it.percent === 100) {
          shouldPlay = true;
        }
        prevPercentRef.current[it.id] = it.percent;
      });

      // 2) 이전 <100이었던 항목이 리스트에서 사라진 경우 → 완료된 것으로 간주하고 1회 재생
      Object.entries(prevPercentRef.current).forEach(([id, prevPercent]) => {
        if (prevPercent < 100 && !currentIds.has(Number(id))) {
          shouldPlay = true;
          prevPercentRef.current[id] = 100; // 중복 재생 방지
        }
      });

      if (shouldPlay) {
        playCompleteSound();
      }

      setStats(s); setProgressList(p); setUnconfirmedList(u);
    }catch(err){ console.error(err); }
  };
  useEffect(()=>{ load(); const id=setInterval(load,30000); return()=>clearInterval(id); },[]);

  // startup sound
  useEffect(()=>{
    fetch(`${API_BASE}/api/settings/ui`,{credentials:'include'})
      .then(r=>r.json())
      .then(d=>{
        if(d.startupSoundUrl){
          const url=d.startupSoundUrl.startsWith('/')?`${API_BASE}${d.startupSoundUrl}`:d.startupSoundUrl;
          const audio=new Audio(url); audio.play().catch(()=>{});
        }
      }).catch(()=>{});
  },[]);

  const visibleCount = 6;

  // marquee keyframes
  const marqueeAnim = keyframes`
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  `;

  const vMarquee = keyframes`
  0% { transform: translateY(0); }
  100% { transform: translateY(-50%); }
`;

  const remainingCompanies = [...new Set(progressList.filter(p=>Number(p.percent)<100).map(p=>p.company))];
  const visibleComp = 5;
  const compSlideNeeded = remainingCompanies.length>visibleComp;
  const compList = compSlideNeeded ? [...remainingCompanies,...remainingCompanies] : remainingCompanies;
  const compDuration = (remainingCompanies.length||1)*3; // 3s per item

  return (
    <Box sx={{ p:1, bgcolor:'#000', height:'100vh', color:'#fff', overflow:'hidden', display:'flex', flexDirection:'column' }}>
      <Box sx={{ display:'flex', alignItems:'center', justifyContent:'center', gap:2 }}>
        {/* Remaining company list */}
        <Box sx={{ width:200, height:60, overflow:'hidden', bgcolor:'#222', borderRadius:1, p:1 }}>
          <Typography variant="h6" color="#fff">미완료 업체</Typography>
          <Box sx={{ mt:1, animation: compSlideNeeded?`${vMarquee} ${compDuration}s linear infinite`:'none' }}>
            {compList.map((c,idx)=>(
              <Typography key={idx} variant="body2" color="#fff">{idx%remainingCompanies.length+1}. {c}</Typography>
            ))}
          </Box>
        </Box>
        <Typography variant="h3" align="center" gutterBottom sx={{ flexGrow:1 }}>작업 현황</Typography>
      </Box>

      {/* 상단 카드 – 크기/폰트 축소 */}
      <Grid container spacing={1} justifyContent="center" sx={{ mb:1, flexShrink:0 }}>
        {[
          {label:'오늘 전표',value:stats.todayTotalInspections,color:'primary'},
          {label:'오늘 완료',value:stats.todayCompletedInspections,color:'success'},
          {label:'지난 미완료',value:stats.pastPendingInspections,color:'warning'}
        ].map(c=>(
          <Grid item key={c.label} xs="auto">
            <Card sx={{ bgcolor:`${c.color}.dark`, color:'#fff', width:120, height:80 }}>
              <CardContent sx={{ textAlign:'center', p:1 }}>
                <Typography variant="subtitle2">{c.label}</Typography>
                <Typography variant="h4">{c.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 진행률 */}
      <Divider sx={{ my:1, bgcolor:'#555' }} />
      <Typography variant="h5" gutterBottom>전표별 진행률</Typography>
      {(()=>{const filtered=progressList.filter(p=>Number(p.percent)<100);const slideNeeded = filtered.length>visibleCount;const list = slideNeeded?[...filtered,...filtered]:filtered;const duration=(filtered.length||1)*8;return (
      <Grid container spacing={2} sx={{ width: slideNeeded?'200%':'100%', flexWrap:'nowrap', animation: slideNeeded?`${marqueeAnim} ${duration}s linear infinite`:'none', overflow:'hidden' }}>
        {list.map((p,idx)=>(
          <Grid item xs={12} sm={6} md={4} lg={2} key={idx} sx={{ maxWidth:220 }}>
            <Card sx={{ bgcolor:p.percent===100?'#2e7d32':'#1565c0', color:'#fff' }}>
              <CardContent sx={{ textAlign:'center', p:1 }}>
                <Typography variant="body2">{p.company}</Typography>
                <Typography variant="subtitle2" gutterBottom>{p.inspectionName}</Typography>
                <Typography variant="h4">{p.percent}%</Typography>
                <Typography variant="caption">{p.handledCount}/{p.totalQuantity}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>) })()}

      {unconfirmedList.length>0 && <>
        <Divider sx={{ my:1, bgcolor:'#555' }} />
        <Typography variant="h5" gutterBottom>미확정 전표</Typography>
        {(()=>{const slideNeeded=unconfirmedList.length>visibleCount;const list=slideNeeded?[...unconfirmedList,...unconfirmedList]:unconfirmedList;const duration=(unconfirmedList.length||1)*8;return (
        <Grid container spacing={2} sx={{ width: slideNeeded?'200%':'100%', flexWrap:'nowrap', animation: slideNeeded?`${marqueeAnim} ${duration}s linear infinite`:'none', overflow:'hidden' }}>
          {list.map((u,idx)=>(
            <Grid item xs={12} sm={6} md={4} lg={3} key={idx}>
              <Card sx={{ bgcolor:u.status==='pending'?'#f9a825':'#c62828', color:'#000', textAlign:'center' }}>
                <CardContent>
                  <Typography variant="subtitle1">{u.company}</Typography>
                  <Typography variant="h6">{u.inspectionName}</Typography>
                  <Typography variant="body2">{u.status==='pending'?'대기중':'반려'}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>)})()}
      </>}

      <Divider sx={{ my:1, bgcolor:'#555' }} />
      <Grid container spacing={1} justifyContent="center">
        {[
          {label:'오늘 총 작업', val:stats.todayWorkQuantity},
          {label:'오늘 완료', val:stats.todayCompletedQuantity},
          {label:'오늘 미완료', val:stats.todayRemainingQuantity},
          {label:'지난전표오늘작업', val:stats.pastSlipTodayQuantity},
          {label:'지난 미완료', val:stats.pastRemainingQuantity}
        ].map(c=>(
          <Grid item xs="auto" key={c.label}>
            <Card sx={{ bgcolor:'#424242', color:'#fff', width:120, height:80 }}>
              <CardContent sx={{ textAlign:'center', p:1 }}>
                <Typography variant="subtitle2" gutterBottom>{c.label}</Typography>
                <Typography variant="h4">{c.val}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default TvDashboard; 
