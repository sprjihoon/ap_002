import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  Snackbar,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { fetchWithAuth } from '../utils/api';
import { useNavigate } from 'react-router-dom';

const WorkerDashboard = () => {
  const [stats, setStats] = useState({
    totalInspections: 0,
    completedInspections: 0,
    inProgressInspections: 0,
    todayTotalInspections: 0,
    todayInProgressInspections: 0,
    todayCompletedInspections: 0,
    pastPendingInspections: 0,
    todayTotalQuantity: 0,
    todayCompletedQuantity: 0,
    todayRemainingQuantity: 0,
    pastRemainingQuantity: 0,
    // 신규 통계
    todayWorkQuantity: 0,
    pastSlipTodayQuantity: 0
  });
  const [progressList, setProgressList] = useState([]);
  const [error, setError] = useState('');
  const [unconfirmedList, setUnconfirmedList] = useState([]);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const canEdit = ['inspector','admin'].includes((user.role||'').toLowerCase());

  useEffect(() => {
    fetchDashboardData();
    // 30초마다 데이터 갱신
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsData, progressData, unconfData] = await Promise.all([
        fetchWithAuth('/worker/stats'),
        fetchWithAuth('/worker/progress'),
        fetchWithAuth('/worker/unconfirmed')
      ]);

      setStats(statsData);
      setProgressList(progressData);
      setUnconfirmedList(unconfData);
    } catch (err) {
      setError('데이터를 불러오는데 실패했습니다.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'info';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return '완료';
      case 'in_progress':
        return '진행중';
      case 'error':
        return '오류';
      default:
        return '알 수 없음';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        작업 현황 대시보드
      </Typography>

      {/* 상단: 오늘 전표 통계 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md="auto">
          <Card sx={{ width:{ xs:'100%', sm:170 }, height:120, textAlign:'center', display:'flex', flexDirection:'column', justifyContent:'center' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                오늘 전체 전표
              </Typography>
              <Typography variant="h4">
                {stats.todayTotalInspections}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md="auto">
          <Card sx={{ width:{ xs:'100%', sm:170 }, height:120, textAlign:'center', display:'flex', flexDirection:'column', justifyContent:'center' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                오늘 완료 전표
              </Typography>
              <Typography variant="h4" sx={{ color:'success.main' }}>
                {stats.todayCompletedInspections}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md="auto">
          <Card sx={{ width:{ xs:'100%', sm:170 }, height:120, textAlign:'center', display:'flex', flexDirection:'column', justifyContent:'center' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                지난 미완료 전표
              </Typography>
              <Typography variant="h4" sx={{ color:'warning.main' }}>
                {stats.pastPendingInspections}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 구분선 */}
      <Divider sx={{ my: 3 }} />

      {/* 전표별 진행률 */}
      <Paper sx={{ p: 2, mb:3 }}>
        <Typography variant="h6" gutterBottom>
          전표별 진행률
        </Typography>
        <Grid container spacing={2}>
          {progressList.filter(p=>{
            if(p.percent<100) return true;
            // percent 100: show only if updated today
            const today = new Date(); const crt = new Date(p.createdAt);
            return crt.getFullYear()===today.getFullYear() && crt.getMonth()===today.getMonth() && crt.getDate()===today.getDate();
          }).map(p => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={p.id}>
              <Card onClick={()=>{ if(p.percent<100) navigate(`/worker/scan?inspectionId=${p.id}`); }} sx={{ cursor: p.percent<100?'pointer':'default', textAlign:'center', bgcolor: p.percent===100? 'success.light' : p.percent>=50 ? 'info.light' : 'warning.light' }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>{p.company}</Typography>
                  <Typography variant="h6" gutterBottom>{p.inspectionName}</Typography>
                  <Typography variant="h2" sx={{ fontWeight:'bold' }}>{p.percent}%</Typography>
                  <Typography variant="body2">{p.handledCount} / {p.totalQuantity}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* 미확정 전표 리스트 */}
        {unconfirmedList.length>0 && (
          <>
            <Divider sx={{ my:2 }}/>
            <Typography variant="subtitle1" gutterBottom>미확정 전표</Typography>
            <Grid container spacing={2}>
              {unconfirmedList.map(u=>(
                <Grid item xs={12} sm={6} md={4} lg={3} key={u.id}>
                  <Card
                    onClick={()=>{ if(canEdit) navigate(`/inspections/${u.id}?edit=1`); }}
                    sx={{ cursor: canEdit?'pointer':'default', bgcolor: u.status==='pending'? 'warning.light':'error.light', textAlign:'center' }}>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>{u.company}</Typography>
                      <Typography variant="h6" gutterBottom>{u.inspectionName}</Typography>
                      <Typography variant="body2" color="text.secondary">{u.status==='pending'?'대기중':'반려'}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </Paper>

      {/* 구분선 */}
      <Divider sx={{ my: 3 }} />

      {/* 오늘/지난 작업량 카드 행 */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md="auto">
          <Card sx={{ width:{ xs:'100%', sm:170 }, height:120, textAlign:'center', display:'flex', flexDirection:'column', justifyContent:'center' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                오늘 총 작업량
              </Typography>
              <Typography variant="h4">
                {stats.todayWorkQuantity ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md="auto">
          <Card sx={{ width:{ xs:'100%', sm:170 }, height:120, textAlign:'center', display:'flex', flexDirection:'column', justifyContent:'center' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                오늘 완료 수량 (전표 기준)
              </Typography>
              <Typography variant="h4" sx={{ color:'success.main' }}>
                {stats.todayCompletedQuantity ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md="auto">
          <Card sx={{ width:{ xs:'100%', sm:170 }, height:120, textAlign:'center', display:'flex', flexDirection:'column', justifyContent:'center' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                오늘 미완료 수량
              </Typography>
              <Typography variant="h4" sx={{ color:'warning.main' }}>
                {stats.todayRemainingQuantity ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 지난 전표 오늘 작업량 */}
        <Grid item xs={12} sm={6} md="auto">
          <Card sx={{ width:{ xs:'100%', sm:170 }, height:120, textAlign:'center', display:'flex', flexDirection:'column', justifyContent:'center' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                지난전표오늘작업
              </Typography>
              <Typography variant="h4" sx={{ color:'info.main' }}>
                {stats.pastSlipTodayQuantity ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md="auto">
          <Card sx={{ width:{ xs:'100%', sm:170 }, height:120, textAlign:'center', display:'flex', flexDirection:'column', justifyContent:'center' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                지난 미완료 수량
              </Typography>
              <Typography variant="h4" sx={{ color:'error.main' }}>
                {stats.pastRemainingQuantity ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {error && (
        <Snackbar open autoHideDuration={3000} onClose={() => setError('')}>
          <Alert severity="error">{error}</Alert>
        </Snackbar>
      )}
    </Box>
  );
};

export default WorkerDashboard; 