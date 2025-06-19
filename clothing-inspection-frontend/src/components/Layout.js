import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Checkroom as ClothesIcon,
  Assignment as InspectionIcon,
  People as PeopleIcon,
  ListAlt as ListAltIcon,
  QrCodeScanner as QrCodeScannerIcon,
  Lock as LockIcon,
  Logout as LogoutIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { logout } from '../utils/api';

const drawerWidth = 240;
const appBarHeight = 64; // px

function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleDrawerToggle = () => {
    // 모바일용 토글
    setMobileOpen(!mobileOpen);
  };

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const menuItems = [
    { text: '대시보드', icon: <DashboardIcon />, path: '/dashboard' },
    { text: '의류 목록', icon: <ClothesIcon />, path: '/clothes' },
    { text: '검수 내역', icon: <InspectionIcon />, path: '/inspections' },
    { text: '비밀번호 변경', icon: <LockIcon />, path: '/change-password' }
  ];

  // 작업자 및 관리자용 메뉴
  if (user.role === 'worker' || user.role === 'admin') {
    menuItems.push({ text: '작업 대시보드', icon: <ListAltIcon />, path: '/worker/dashboard' });
    menuItems.push({ text: '바코드 스캔', icon: <QrCodeScannerIcon />, path: '/worker/scan' });
    menuItems.push({ text: '작업 내역', icon: <ListAltIcon />, path: '/worker/history' });
    menuItems.push({ text: '내 통계', icon: <AssessmentIcon />, path: '/worker/stats' });
  }

  // 관리자인 경우에만 사용자 관리 메뉴 표시
  if (user.role === 'admin') {
    menuItems.push({ text: '작업자 통계', icon: <AssessmentIcon />, path: '/workers/stats' });
    menuItems.push({ text: '사용자 관리', icon: <PeopleIcon />, path: '/users' });
  }

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          의류 검수 시스템
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => {
              navigate(item.path);
              setMobileOpen(false);
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
        <Divider />
        <ListItem button onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="로그아웃" />
        </ListItem>
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{ zIndex: theme => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { xs: 'block', sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <IconButton
            color="inherit"
            aria-label="toggle sidebar"
            edge="start"
            onClick={handleSidebarToggle}
            sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            {user.username} ({user.role === 'admin' ? '관리자' : user.role === 'operator' ? '운영자' : user.role === 'worker' ? '작업자' : '검수자'})
          </Typography>
        </Toolbar>
      </AppBar>
      {sidebarOpen && (
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              top: `${appBarHeight}px`,
              height: `calc(100% - ${appBarHeight}px)`
            }
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              top: `${appBarHeight}px`,
              height: `calc(100% - ${appBarHeight}px)`
            }
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box> )}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: sidebarOpen ? `calc(100% - ${drawerWidth}px)` : '100%' },
          mt: `${appBarHeight}px`
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}

export default Layout; 