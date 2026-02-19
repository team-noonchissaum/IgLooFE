'use client';

import { cancelAuction } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function CancelButton({ auctionId, status }: { auctionId: number, status: string }) {
  const router = useRouter();

  if (status === 'CANCELED' || status === 'ENDED') return null;

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this auction?')) return;
    try {
      await cancelAuction(auctionId);
      alert('Auction canceled');
      router.refresh();
    } catch (e) {
      alert('Failed to cancel auction');
      console.error(e);
    }
  };

  return (
    <button 
      onClick={handleCancel}
      className="w-full bg-red-500 text-white py-3 rounded font-semibold hover:bg-red-600"
    >
      Cancel Auction
    </button>
  );
}
