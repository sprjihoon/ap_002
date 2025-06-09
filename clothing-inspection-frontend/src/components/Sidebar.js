import React from 'react';
import { 
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  LocalShipping as LocalShippingIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  Inventory as InventoryIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  Divider
} from '@mui/material';

const Sidebar = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <List>
      <ListItem button component={Link} to="/dashboard">
        <ListItemIcon>
          <DashboardIcon />
        </ListItemIcon>
        <ListItemText primary="대시보드" />
      </ListItem>

      <ListItem button component={Link} to="/clothes">
        <ListItemIcon>
          <LocalShippingIcon />
        </ListItemIcon>
        <ListItemText primary="새의류 등록" />
      </ListItem>

      <ListItem button component={Link} to="/inspections">
        <ListItemIcon>
          <AssessmentIcon />
        </ListItemIcon>
        <ListItemText primary="검수 목록" />
      </ListItem>

      {user?.role === 'admin' && (
        <>
          <Divider />
          <ListItem button component={Link} to="/users">
            <ListItemIcon>
              <PeopleIcon />
            </ListItemIcon>
            <ListItemText primary="사용자 관리" />
          </ListItem>

          <ListItem button component={Link} to="/products">
            <ListItemIcon>
              <InventoryIcon />
            </ListItemIcon>
            <ListItemText primary="제품 관리" />
          </ListItem>
        </>
      )}

      <Divider />
      <ListItem button component={Link} to="/change-password">
        <ListItemIcon>
          <SettingsIcon />
        </ListItemIcon>
        <ListItemText primary="비밀번호 변경" />
      </ListItem>
    </List>
  );
};

export default Sidebar; 