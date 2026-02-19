const BASE_URL = 'http://localhost:8080/api';

function getAuthHeader() {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
  return {};
}

export async function fetchAuctions(status?: string) {
  const url = status 
    ? `${BASE_URL}/auctions?status=${status}` 
    : `${BASE_URL}/auctions`;
  
  const res = await fetch(url, { cache: 'no-store', headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch auctions');
  return res.json();
}

export async function fetchAuctionDetail(id: string) {
  const res = await fetch(`${BASE_URL}/auctions/${id}`, { cache: 'no-store', headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch auction detail');
  return res.json();
}

export async function registerAuction(data: any) {
  const res = await fetch(`${BASE_URL}/auctions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to register auction');
  return res.json();
}

export async function cancelAuction(id: number) {
  const res = await fetch(`${BASE_URL}/auctions/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to cancel auction');
  return res.json();
}

export async function placeBid(auctionId: number, bidAmount: number) {
  const requestId = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const res = await fetch(`${BASE_URL}/bid`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({
      auctionId,
      bidAmount,
      requestId,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to place bid');
  }
  return res.json();
}

export async function login(email: string, password: string) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      authType: 'LOCAL',
      email,
      password,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Login failed');
  }

  const data = await res.json();
  if (data.accessToken) {
    localStorage.setItem('token', data.accessToken);
    localStorage.setItem('user', JSON.stringify({
      userId: data.userId,
      email: data.email,
      nickname: data.nickname
    }));
  }
  return data;
}
