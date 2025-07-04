import React, { useState } from 'react';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  Toolbar,
  Typography,
  Divider
} from '@mui/material';
import {
  Menu as MenuIcon
} from '@mui/icons-material';
import Sidebar from './Sidebar';

const drawerWidth = 240;
const appBarHeight = 64; // px

function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleDrawerToggle = () => {
    // 모바일용 토글
    setMobileOpen(!mobileOpen);
  };

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          의류 검수 시스템
        </Typography>
      </Toolbar>
      <Divider />
      <Sidebar />
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
            {user.username} ({user.role === 'admin' ? '관리자' : user.role === 'operator' ? '운영자' : user.role === 'worker' ? '작업자' : user.role === 'display' ? '대시보드' : '검수자'})
          </Typography>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width:{ sm:drawerWidth }, flexShrink:{ sm:0 } }}>
        {/* 모바일: 임시 Drawer – 항상 렌더 */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted:true }}
          sx={{
            display:{ xs:'block', sm:'none' },
            '& .MuiDrawer-paper':{
              boxSizing:'border-box',
              width:drawerWidth,
              top:`${appBarHeight}px`,
              height:`calc(100% - ${appBarHeight}px)`
            }
          }}
        >
          {drawer}
        </Drawer>

        {/* 데스크톱: 고정 Drawer – sidebarOpen 일때만 렌더 */}
        {sidebarOpen && (
          <Drawer
            variant="permanent"
            sx={{
              display:{ xs:'none', sm:'block' },
              '& .MuiDrawer-paper':{
                boxSizing:'border-box',
                width:drawerWidth,
                top:`${appBarHeight}px`,
                height:`calc(100% - ${appBarHeight}px)`
              }
            }}
            open
          >
            {drawer}
          </Drawer>
        )}
      </Box>
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