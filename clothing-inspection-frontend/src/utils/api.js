 // utils/api.js  (전체 파일)

 /**
  * API 엔드포인트 베이스 URL
  * 프런트 기본 백엔드 주소
  * 모든 요청은 `${API_BASE}/api/...` 형식으로 호출한다.
  */
 export const API_BASE =
   'https://ap-002.onrender.com';
 export const API_URL = `${API_BASE}/api`;

 const buildHeaders = (method, hasBody, extraHeaders = {}) => {
   const token = localStorage.getItem('token');
   const headers = {
     'Authorization': token ? `Bearer ${token}` : '',
     ...extraHeaders,
   };

   // JSON 바디가 있는 요청(POST/PUT/PATCH)만 Content-Type 설정
   if (hasBody || ['POST', 'PUT', 'PATCH'].includes(method?.toUpperCase?.())) {
     headers['Content-Type'] ||= 'application/json';
   }

   return headers;
 };

 export const fetchWithAuth = async (endpoint, options = {}) => {
   const url = endpoint.startsWith('/api')
     ? `${API_BASE}${endpoint}`
     : `${API_BASE}/api${endpoint}`;

   const method = options.method || 'GET';
   const hasBody = !!options.body;

   const response = await fetch(url, {
     credentials: 'include',
     ...options,
     headers: buildHeaders(method, hasBody, options.headers || {}),
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
   const response = await fetch(`${API_BASE}/api/users/login`, {
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
