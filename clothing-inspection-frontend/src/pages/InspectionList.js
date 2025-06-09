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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';

function InspectionList() {
  const [inspections, setInspections] = useState([]);
  const [clothes, setClothes] = useState([]);
  const [open, setOpen] = useState(false);
  const [newInspection, setNewInspection] = useState({
    clothes_id: '',
    result: '',
    comment: ''
  });

  useEffect(() => {
    fetchInspections();
    fetchClothes();
  }, []);

  const fetchInspections = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/inspections');
      const data = await response.json();
      setInspections(data);
    } catch (error) {
      console.error('Error fetching inspections:', error);
    }
  };

  const fetchClothes = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/clothes');
      const data = await response.json();
      setClothes(data);
    } catch (error) {
      console.error('Error fetching clothes:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/inspections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newInspection),
      });

      if (response.ok) {
        setOpen(false);
        setNewInspection({ clothes_id: '', result: '', comment: '' });
        fetchInspections();
      }
    } catch (error) {
      console.error('Error adding inspection:', error);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        검수 내역
      </Typography>
      <Button
        variant="contained"
        color="primary"
        onClick={() => setOpen(true)}
        sx={{ mb: 2 }}
      >
        새 검수 등록
      </Button>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>의류</TableCell>
              <TableCell>결과</TableCell>
              <TableCell>코멘트</TableCell>
              <TableCell>검수일</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inspections.map((inspection) => (
              <TableRow key={inspection.id}>
                <TableCell>
                  {clothes.find(c => c.id === inspection.clothes_id)?.name}
                </TableCell>
                <TableCell>{inspection.result}</TableCell>
                <TableCell>{inspection.comment}</TableCell>
                <TableCell>
                  {new Date(inspection.inspected_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>새 검수 등록</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>의류 선택</InputLabel>
            <Select
              value={newInspection.clothes_id}
              onChange={(e) => setNewInspection({ ...newInspection, clothes_id: e.target.value })}
            >
              {clothes.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>결과</InputLabel>
            <Select
              value={newInspection.result}
              onChange={(e) => setNewInspection({ ...newInspection, result: e.target.value })}
            >
              <MenuItem value="pass">합격</MenuItem>
              <MenuItem value="fail">불합격</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="코멘트"
            margin="normal"
            multiline
            rows={4}
            value={newInspection.comment}
            onChange={(e) => setNewInspection({ ...newInspection, comment: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>취소</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            등록
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default InspectionList; 