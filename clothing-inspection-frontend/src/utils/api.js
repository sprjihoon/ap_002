export const API_URL = '/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  console.log('Current token:', token); // 토큰 확인용 로그
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

export const fetchWithAuth = async (endpoint, options = {}) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers
    }
  });

  if (response.status === 401) {
    logout();
    window.location.href = '/';
    throw new Error('인증이 필요합니다.');
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API 요청에 실패했습니다.');
  }

  return response.json();
};

export const login = async (username, password) => {
  const response = await fetch(`${API_URL}/users/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '로그인에 실패했습니다.');
  }
  
  const data = await response.json();
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}; 