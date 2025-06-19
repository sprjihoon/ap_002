import React from 'react';
import { 
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  LocalShipping as LocalShippingIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  Inventory as InventoryIcon,
  ListAlt as ListAltIcon,
  QrCodeScanner as QrCodeScannerIcon
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

  const role = (user.role || '').toLowerCase();

  const showClothes = ['inspector','operator','admin'].includes(role);
  const showInspections = ['inspector','operator','admin'].includes(role);

  const showWorkerSection = ['worker','inspector','admin'].includes(role);

  return (
    <List>
      {/* 기본 대시보드 메뉴는 관리자 전용이 아니므로 필요에 따라 유지 */}
      {role==='admin' && (
        <ListItem button component={Link} to="/dashboard">
          <ListItemIcon><DashboardIcon /></ListItemIcon>
          <ListItemText primary="대시보드" />
        </ListItem>
      )}

      {showClothes && (
        <ListItem button component={Link} to="/clothes">
          <ListItemIcon><LocalShippingIcon /></ListItemIcon>
          <ListItemText primary="의류 목록" />
        </ListItem>
      )}

      {showInspections && (
        <ListItem button component={Link} to="/inspections">
          <ListItemIcon><AssessmentIcon /></ListItemIcon>
          <ListItemText primary="검수 목록" />
        </ListItem>
      )}

      {showWorkerSection && (
        <>
          <Divider />
          <ListItem button component={Link} to="/worker/dashboard">
            <ListItemIcon><ListAltIcon /></ListItemIcon>
            <ListItemText primary="작업 대시보드" />
          </ListItem>
          <ListItem button component={Link} to="/worker/scan">
            <ListItemIcon><QrCodeScannerIcon /></ListItemIcon>
            <ListItemText primary="바코드 스캔" />
          </ListItem>
          <ListItem button component={Link} to="/worker/history">
            <ListItemIcon><ListAltIcon /></ListItemIcon>
            <ListItemText primary="작업 내역" />
          </ListItem>
          {/* 내 통계 (worker role) */}
          {role==='worker' && (
            <ListItem button component={Link} to="/worker/stats">
              <ListItemIcon><AssessmentIcon /></ListItemIcon>
              <ListItemText primary="내 통계" />
            </ListItem>
          )}
        </>
      )}

      {/* 작업자 통계 전체 (관리자+검수자) */}
      {['admin','inspector'].includes(role) && (
        <ListItem button component={Link} to="/workers/stats">
          <ListItemIcon><AssessmentIcon /></ListItemIcon>
          <ListItemText primary="작업자 통계" />
        </ListItem>
      )}

      {/* 관리자 전용 메뉴 */}
      {role==='admin' && (
        <>
          <Divider />
          <ListItem button component={Link} to="/users">
            <ListItemIcon><PeopleIcon /></ListItemIcon>
            <ListItemText primary="사용자 관리" />
          </ListItem>
          <ListItem button component={Link} to="/products">
            <ListItemIcon><InventoryIcon /></ListItemIcon>
            <ListItemText primary="제품 관리" />
          </ListItem>
        </>
      )}

      <Divider />
      <ListItem button component={Link} to="/change-password">
        <ListItemIcon><SettingsIcon /></ListItemIcon>
        <ListItemText primary="비밀번호 변경" />
      </ListItem>
    </List>
  );
};

export default Sidebar; 