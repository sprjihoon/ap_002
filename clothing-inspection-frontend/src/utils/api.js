/**
 * API 엔드포인트 베이스 URL
 *
 * 1) REACT_APP_API_URL (배포 시 환경변수로 주입)
 * 2) Render 백엔드 기본 URL (하드코딩 ‑ 안전 fallback)
 * 3) '/api' – 로컬 dev 서버(proxy) 용
 */
export const API_URL =
  process.env.REACT_APP_API_URL || 'https://ap-002.onrender.com/api';

/* ------------------------------------------------------------------ */
/*  공통 유틸                                                          */
/* ------------------------------------------------------------------ */

/** 토큰 + 공통 헤더 생성 */
const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

/**
 * 인증 포함 fetch 래퍼
 * - credentials: 'include' 로 쿠키 유지
 * - res.ok 체크 후만 JSON 파싱
 * - 401 → 자동 로그아웃
 */
export const fetchWithAuth = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: { ...getHeaders(), ...(options.headers || {}) }
  });

  if (res.status === 401) {
    logout();
    window.location.href = '/';
    throw new Error('인증이 필요합니다.');
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      msg = (await res.json()).message || msg;
    } catch (_) {
      // body가 JSON이 아닐 때
      msg = (await res.text()) || msg;
    }
    throw new Error(msg);
  }

  return res.json();
};

/* ------------------------------------------------------------------ */
/*  개별 API 호출 함수                                                */
/* ------------------------------------------------------------------ */

/** UI 설정(theme·logo·notice·loginBg) 가져오기 */
export const getUiSettings = () => fetchWithAuth('/settings/ui');

/** 로그인 */
export const login = async (username, password) => {
  const res = await fetch(`${API_URL}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) {
    let msg = '로그인에 실패했습니다.';
    try {
      msg = (await res.json()).message || msg;
    } catch (_) {
      msg = (await res.text()) || msg;
    }
    throw new Error(msg);
  }

  const data = await res.json();
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data;
};

/** 로그아웃 */
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};
