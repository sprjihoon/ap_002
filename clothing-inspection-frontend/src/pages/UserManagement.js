import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Typography,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Snackbar,
  Alert,
  TextField
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, Add as AddIcon } from '@mui/icons-material';
import { fetchWithAuth, API_BASE } from '../utils/api';
import _ from 'lodash';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openRoleDialog, setOpenRoleDialog] = useState(false);
  const [openRegisterDialog, setOpenRegisterDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    company: '',
    password: '',
    confirmPassword: '',
    role: 'inspector'
  });
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState({
    id: null,
    username: '',
    email: '',
    company: '',
    role: '',
    password: '',
    confirmPassword: ''
  });
  const [companyFilter, setCompanyFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchUsers = async () => {
    try {
      const users = await fetchWithAuth('/api/users/all');
      setUsers(users);
    } catch (error) {
      setError('사용자 목록을 불러오는데 실패했습니다.');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async () => {
    try {
      const data = await fetchWithAuth(`/api/users/${selectedUser.id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole })
      });
      setSuccess(data.message || '사용자 역할이 변경되었습니다.');
      setOpenRoleDialog(false);
      fetchUsers();
    } catch (error) {
      setError('역할 변경에 실패했습니다.');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('정말로 이 사용자를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const data = await fetchWithAuth(`/api/users/${userId}`, {
        method: 'DELETE'
      });
      setSuccess(data.message || '사용자가 삭제되었습니다.');
      fetchUsers();
    } catch (error) {
      setError('사용자 삭제에 실패했습니다.');
    }
  };

  const handleRegister = async () => {
    if (newUser.password !== newUser.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      const data = await fetchWithAuth('/api/users/register', {
        method: 'POST',
        body: JSON.stringify({
          username: newUser.username,
          email: newUser.email,
          company: newUser.company,
          password: newUser.password,
          role: newUser.role
        })
      });
      setSuccess(data.message);
      setOpenRegisterDialog(false);
      setNewUser({
        username: '',
        email: '',
        company: '',
        password: '',
        confirmPassword: '',
        role: 'inspector'
      });
      await fetchUsers();
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message || '사용자 등록 중 오류가 발생했습니다.');
    }
  };

  const handleEdit = async () => {
    if (editingUser.password || editingUser.confirmPassword) {
      if (editingUser.password !== editingUser.confirmPassword) {
        setError('비밀번호가 일치하지 않습니다.');
        return;
      }
    }

    try {
      const body = {
        username: editingUser.username,
        email: editingUser.email,
        company: editingUser.company,
        role: editingUser.role
      };
      if (editingUser.password) body.password = editingUser.password;

      const data = await fetchWithAuth(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(body)
      });
      setSuccess(data.message);
      setOpenEditDialog(false);
      fetchUsers();
    } catch (error) {
      setError(error.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 업체명, 역할 목록 추출
  const companyList = _.uniq(users.map(u => u.company)).filter(Boolean);
  const roleList = _.uniq(users.map(u => u.role)).filter(Boolean);

  // 필터링된 사용자
  const filteredUsers = users.filter(user => {
    const matchesCompany = !companyFilter || user.company === companyFilter;
    const matchesRole = !roleFilter || user.role === roleFilter;
    if (!matchesCompany || !matchesRole) return false;
    if (!search) return true;
    const keyword = search.toLowerCase();
    return [user.username, user.email, user.company, user.role].some(f => f && f.toLowerCase().includes(keyword));
  });

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            사용자 관리
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              size="small"
              label="검색"
              value={search}
              onChange={e => setSearch(e.target.value)}
              sx={{ minWidth: 180 }}
              placeholder="이름, 이메일, 업체명 등"
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>업체명</InputLabel>
              <Select
                value={companyFilter}
                label="업체명"
                onChange={e => setCompanyFilter(e.target.value)}
              >
                <MenuItem value="">전체</MenuItem>
                {companyList.map(c => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>역할</InputLabel>
              <Select
                value={roleFilter}
                label="역할"
                onChange={e => setRoleFilter(e.target.value)}
              >
                <MenuItem value="">전체</MenuItem>
                {roleList.map(r => (
                  <MenuItem key={r} value={r}>{r === 'admin' ? '관리자' : r === 'inspector' ? '검수자' : r === 'operator' ? '운영자' : r === 'display' ? '대시보드' : '작업자'}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setOpenRegisterDialog(true)}
            >
              사용자 등록
            </Button>
          </Box>
        </Box>
        
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>사용자 이름</TableCell>
                <TableCell>이메일</TableCell>
                <TableCell>업체명</TableCell>
                <TableCell>역할</TableCell>
                <TableCell>가입일</TableCell>
                <TableCell>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.id}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email || '-'}</TableCell>
                  <TableCell>{user.company || '-'}</TableCell>
                  <TableCell>{user.role === 'admin' ? '관리자' : 
                    user.role === 'inspector' ? '검수자' :
                    user.role === 'operator' ? '운영자' :
                    user.role === 'display' ? '대시보드' :
                    '작업자'}</TableCell>
                  <TableCell>{user.createdAt ? formatDate(user.createdAt) : '-'}</TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => {
                        setEditingUser({
                          id: user.id,
                          username: user.username,
                          email: user.email || '',
                          company: user.company || '',
                          role: user.role,
                          password: '',
                          confirmPassword: ''
                        });
                        setOpenEditDialog(true);
                      }}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(user.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={openRoleDialog} onClose={() => setOpenRoleDialog(false)}>
          <DialogTitle>사용자 역할 변경</DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>역할</InputLabel>
              <Select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                label="역할"
              >
                <MenuItem value="admin">관리자</MenuItem>
                <MenuItem value="inspector">검수자</MenuItem>
                <MenuItem value="operator">운영자</MenuItem>
                <MenuItem value="worker">작업자</MenuItem>
                <MenuItem value="display">대시보드</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenRoleDialog(false)}>취소</Button>
            <Button onClick={handleRoleChange} variant="contained" color="primary">
              변경
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={openRegisterDialog} onClose={() => setOpenRegisterDialog(false)}>
          <DialogTitle>사용자 등록</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="사용자 이름"
              margin="normal"
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="이메일"
              type="email"
              margin="normal"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            />
            <TextField
              fullWidth
              label="업체명"
              margin="normal"
              value={newUser.company}
              onChange={(e) => setNewUser({ ...newUser, company: e.target.value })}
            />
            <TextField
              fullWidth
              label="비밀번호"
              type="password"
              margin="normal"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="비밀번호 확인"
              type="password"
              margin="normal"
              value={newUser.confirmPassword}
              onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
              required
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>역할</InputLabel>
              <Select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                label="역할"
              >
                <MenuItem value="admin">관리자</MenuItem>
                <MenuItem value="inspector">검수자</MenuItem>
                <MenuItem value="operator">운영자</MenuItem>
                <MenuItem value="worker">작업자</MenuItem>
                <MenuItem value="display">대시보드</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenRegisterDialog(false)}>취소</Button>
            <Button onClick={handleRegister} variant="contained" color="primary">
              등록
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)}>
          <DialogTitle>사용자 정보 수정</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="사용자 이름"
              margin="normal"
              value={editingUser.username}
              onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="이메일"
              type="email"
              margin="normal"
              value={editingUser.email}
              onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
            />
            <TextField
              fullWidth
              label="업체명"
              margin="normal"
              value={editingUser.company}
              onChange={(e) => setEditingUser({ ...editingUser, company: e.target.value })}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>역할</InputLabel>
              <Select
                value={editingUser.role}
                label="역할"
                onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
              >
                <MenuItem value="admin">관리자</MenuItem>
                <MenuItem value="inspector">검수자</MenuItem>
                <MenuItem value="operator">운영자</MenuItem>
                <MenuItem value="worker">작업자</MenuItem>
                <MenuItem value="display">대시보드</MenuItem>
              </Select>
            </FormControl>

            {/* 비밀번호 변경 (선택) */}
            <TextField
              label="새 비밀번호 (선택)"
              type="password"
              fullWidth
              margin="normal"
              value={editingUser.password}
              onChange={e => setEditingUser({ ...editingUser, password: e.target.value })}
            />
            <TextField
              label="비밀번호 확인"
              type="password"
              fullWidth
              margin="normal"
              value={editingUser.confirmPassword}
              onChange={e => setEditingUser({ ...editingUser, confirmPassword: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenEditDialog(false)}>취소</Button>
            <Button onClick={handleEdit} variant="contained" color="primary">
              수정
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={!!error}
          autoHideDuration={3000}
          onClose={() => setError('')}
        >
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        </Snackbar>

        <Snackbar
          open={!!success}
          autoHideDuration={3000}
          onClose={() => setSuccess('')}
        >
          <Alert severity="success" onClose={() => setSuccess('')}>
            {success}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
}

export default UserManagement; 
