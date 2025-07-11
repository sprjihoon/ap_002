// utils/api.js  (전체 파일)

/**
 * API 엔드포인트 베이스 URL
 * 1) 빌드-타임 env(REACT_APP_API_URL)           – 배포 환경에서 주입
 * 2) Render 퍼블릭 백엔드 URL(하드코딩)         – env 없을 때 배포에서도 안전
 * 3) '/api'                                    – 로컬 dev 서버 프록시용
 */
export const API_URL =
  process.env.REACT_APP_API_URL || 'https://ap-002-frontend.onrender.com/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  console.log('Current token:', token); // 토큰 확인용 로그
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

export const fetchWithAuth = async (endpoint, options = {}) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    logout();
    window.location.href = '/';
    throw new Error('인증이 필요합니다.');
  }

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`;
    try {
      const errJson = await response.json();
      errorMsg = errJson.message || errorMsg;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  return response.json();
};

export const login = async (username, password) => {
  const response = await fetch(`${API_URL}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    let errMsg = '로그인에 실패했습니다.';
    try {
      const errJson = await response.json();
      errMsg = errJson.message || errMsg;
    } catch (_) {}
    throw new Error(errMsg);
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
