import React, { useState, useEffect } from 'react';
import { Container, Grid, Paper, Typography } from '@mui/material';

function Dashboard() {
  const [stats, setStats] = useState({
    totalClothes: 0,
    pendingInspections: 0,
    completedInspections: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const clothesResponse = await fetch('http://localhost:3000/api/clothes');
        const inspectionsResponse = await fetch('http://localhost:3000/api/inspections');
        
        const clothes = await clothesResponse.json();
        const inspections = await inspectionsResponse.json();
        
        setStats({
          totalClothes: clothes.length,
          pendingInspections: clothes.filter(c => c.status === 'pending').length,
          completedInspections: inspections.length
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        대시보드
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              총 의류 수
            </Typography>
            <Typography variant="h3">
              {stats.totalClothes}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              대기 중인 검수
            </Typography>
            <Typography variant="h3">
              {stats.pendingInspections}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              완료된 검수
            </Typography>
            <Typography variant="h3">
              {stats.completedInspections}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default Dashboard; 