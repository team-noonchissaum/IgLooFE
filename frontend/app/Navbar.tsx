'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userNickname, setUserNickname] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      setIsLoggedIn(true);
      setUserNickname(JSON.parse(user).nickname);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    router.push('/login');
    router.refresh();
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/auctions" className="text-2xl font-bold text-blue-600">
          IgLoo
        </Link>
        
        <div className="flex items-center gap-6">
          <Link href="/auctions" className="text-gray-600 hover:text-blue-600 font-medium">
            경매 목록
          </Link>
          <Link href="/auctions/register" className="text-gray-600 hover:text-blue-600 font-medium">
            물품 등록
          </Link>
          
          {isLoggedIn ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700 font-semibold">
                {userNickname}님
              </span>
              <button
                onClick={handleLogout}
                className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded text-gray-700"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
