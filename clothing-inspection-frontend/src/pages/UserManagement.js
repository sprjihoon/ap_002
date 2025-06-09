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
import { fetchWithAuth, API_URL } from '../utils/api';

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
    role: ''
  });

  const fetchUsers = async () => {
    try {
      const data = await fetchWithAuth('/users/all');
      setUsers(data);
    } catch (error) {
      setError('사용자 목록을 불러오는데 실패했습니다.');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async () => {
    try {
      await fetchWithAuth(`/users/${selectedUser.id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole })
      });
      setSuccess('사용자 역할이 변경되었습니다.');
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
      await fetchWithAuth(`/users/${userId}`, {
        method: 'DELETE'
      });
      setSuccess('사용자가 삭제되었습니다.');
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
      const response = await fetch(`${API_URL}/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          username: newUser.username,
          email: newUser.email,
          company: newUser.company,
          password: newUser.password,
          role: newUser.role
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '사용자 등록에 실패했습니다.');
      }
      
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
      
      // 사용자 목록 갱신
      await fetchUsers();
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message || '사용자 등록 중 오류가 발생했습니다.');
    }
  };

  const handleEdit = async () => {
    try {
      const response = await fetchWithAuth(`/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          username: editingUser.username,
          email: editingUser.email,
          company: editingUser.company,
          role: editingUser.role
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '사용자 정보 수정에 실패했습니다.');
      }

      const data = await response.json();
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

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            사용자 관리
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setOpenRegisterDialog(true)}
          >
            사용자 등록
          </Button>
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
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.id}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email || '-'}</TableCell>
                  <TableCell>{user.company || '-'}</TableCell>
                  <TableCell>{user.role === 'admin' ? '관리자' : 
                    user.role === 'inspector' ? '검수자' :
                    user.role === 'operator' ? '운영자' : '작업자'}</TableCell>
                  <TableCell>{user.createdAt ? formatDate(user.createdAt) : '-'}</TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => {
                        setEditingUser({
                          id: user.id,
                          username: user.username,
                          email: user.email || '',
                          company: user.company || '',
                          role: user.role
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
                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                label="역할"
              >
                <MenuItem value="admin">관리자</MenuItem>
                <MenuItem value="inspector">검수자</MenuItem>
                <MenuItem value="operator">운영자</MenuItem>
                <MenuItem value="worker">작업자</MenuItem>
              </Select>
            </FormControl>
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
          autoHideDuration={6000}
          onClose={() => setError('')}
        >
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        </Snackbar>

        <Snackbar
          open={!!success}
          autoHideDuration={6000}
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