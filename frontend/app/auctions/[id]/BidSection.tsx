'use client';

import { useState } from 'react';
import { placeBid } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface BidSectionProps {
  auctionId: number;
  currentPrice: number;
  status: string;
}

export default function BidSection({ auctionId, currentPrice, status }: BidSectionProps) {
  const [bidAmount, setBidAmount] = useState<number>(currentPrice + 1000);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleBid = async () => {
    if (bidAmount <= currentPrice) {
      alert('입찰 금액은 현재 가격보다 높아야 합니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      await placeBid(auctionId, bidAmount);
      alert('입찰이 성공적으로 완료되었습니다.');
      router.refresh();
    } catch (e: any) {
      console.error(e);
      alert(e.message || '입찰에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status !== 'RUNNING') {
    return null;
  }

  return (
    <div className="mt-6 p-4 border rounded-lg bg-blue-50">
      <h3 className="text-lg font-semibold mb-3">입찰하기</h3>
      <div className="flex gap-2">
        <input
          type="number"
          value={bidAmount}
          onChange={(e) => setBidAmount(Number(e.target.value))}
          className="flex-1 p-2 border rounded"
          placeholder="입찰 금액 입력"
          disabled={isSubmitting}
        />
        <button
          onClick={handleBid}
          disabled={isSubmitting}
          className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700 disabled:bg-blue-300"
        >
          {isSubmitting ? '처리 중...' : '입찰'}
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        * 현재 가격보다 높은 금액으로 입찰해 주세요.
      </p>
    </div>
  );
}
