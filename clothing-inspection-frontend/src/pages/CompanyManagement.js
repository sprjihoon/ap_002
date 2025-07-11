import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../utils/api';
import { Table, Button, Modal, Form, Alert } from 'react-bootstrap';

const CompanyManagement = () => {
  const [companies, setCompanies] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: ''
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/companies`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        withCredentials: true
      });
      setCompanies(response.data);
    } catch (err) {
      setError('회사 목록을 불러오는데 실패했습니다.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCompany) {
        await axios.put(`${API_BASE}/api/companies/${editingCompany.id}`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          withCredentials: true
        });
        setSuccess('회사 정보가 수정되었습니다.');
      } else {
        await axios.post(`${API_BASE}/api/companies`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          withCredentials: true
        });
        setSuccess('새 회사가 등록되었습니다.');
      }
      setShowModal(false);
      fetchCompanies();
      resetForm();
    } catch (err) {
      setError(err.response?.data?.message || '회사 정보 저장에 실패했습니다.');
    }
  };

  const handleEdit = (company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      address: company.address,
      phone: company.phone,
      email: company.email
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('정말로 이 회사를 삭제하시겠습니까?')) {
      try {
        await axios.delete(`${API_BASE}/api/companies/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          withCredentials: true
        });
        setSuccess('회사가 삭제되었습니다.');
        fetchCompanies();
      } catch (err) {
        setError('회사 삭제에 실패했습니다.');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      phone: '',
      email: ''
    });
    setEditingCompany(null);
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>회사 관리</h2>
        <Button variant="primary" onClick={() => {
          resetForm();
          setShowModal(true);
        }}>
          새 회사 등록
        </Button>
      </div>

      {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess(null)} dismissible>{success}</Alert>}

      <Table striped bordered hover>
        <thead>
          <tr>
            <th>회사명</th>
            <th>주소</th>
            <th>전화번호</th>
            <th>이메일</th>
            <th>작업</th>
          </tr>
        </thead>
        <tbody>
          {companies.map(company => (
            <tr key={company.id}>
              <td>{company.name}</td>
              <td>{company.address}</td>
              <td>{company.phone}</td>
              <td>{company.email}</td>
              <td>
                <Button variant="info" size="sm" className="me-2" onClick={() => handleEdit(company)}>
                  수정
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(company.id)}>
                  삭제
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal show={showModal} onHide={() => {
        setShowModal(false);
        resetForm();
      }}>
        <Modal.Header closeButton>
          <Modal.Title>{editingCompany ? '회사 정보 수정' : '새 회사 등록'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>회사명</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>주소</Form.Label>
              <Form.Control
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>전화번호</Form.Label>
              <Form.Control
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>이메일</Form.Label>
              <Form.Control
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </Form.Group>
            <div className="d-flex justify-content-end">
              <Button variant="secondary" className="me-2" onClick={() => {
                setShowModal(false);
                resetForm();
              }}>
                취소
              </Button>
              <Button variant="primary" type="submit">
                {editingCompany ? '수정' : '등록'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default CompanyManagement; 
