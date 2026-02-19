import { fetchAuctionDetail } from '@/lib/api';
import { ApiResponse, Auction } from '@/lib/types';
import CancelButton from './CancelButton'; 
import BidSection from './BidSection';

export default async function AuctionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let auction: Auction | null = null;
  
  try {
    const response: ApiResponse<Auction> = await fetchAuctionDetail(id);
    auction = response.data;
  } catch (e) {
    console.error(e);
  }

  if (!auction) {
    return <div className="p-4">Auction not found or error occurred.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gray-100 min-h-[400px] flex items-center justify-center rounded">
           {auction.imageUrls && auction.imageUrls.length > 0 ? (
              <img src={auction.imageUrls[0]} alt={auction.title} className="max-w-full max-h-[500px]" />
           ) : (
              <span className="text-gray-500">No Image</span>
           )}
        </div>
        
        <div>
          <div className="flex justify-between items-start">
             <h1 className="text-3xl font-bold mb-4">{auction.title}</h1>
             <span className={`px-3 py-1 rounded ${
                  auction.status === 'RUNNING' ? 'bg-green-100 text-green-800' :
                  auction.status === 'READY' || auction.status === 'WAITING' ? 'bg-yellow-100 text-yellow-800' :
                  auction.status === 'CANCELED' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
               {auction.status}
             </span>
          </div>
          
          <p className="text-gray-600 mb-6">{auction.description}</p>
          
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Current Price</span>
              <span className="text-xl font-bold">{auction.currentPrice.toLocaleString()} won</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Start Price</span>
              <span>{auction.startPrice.toLocaleString()} won</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Bids</span>
              <span>{auction.bidCount}</span>
            </div>
             <div className="flex justify-between text-sm text-gray-500">
              <span>Seller</span>
              <span>{auction.sellerNickname}</span>
            </div>
             <div className="flex justify-between text-sm text-gray-500">
              <span>End Time</span>
              <span>{new Date(auction.endAt).toLocaleString()}</span>
            </div>
          </div>

          <BidSection 
            auctionId={auction.auctionId} 
            currentPrice={auction.currentPrice} 
            status={auction.status} 
          />

          <div className="mt-8 space-y-4">
            {/* Seller Actions */}
            <CancelButton auctionId={auction.auctionId} status={auction.status} />
          </div>
        </div>
      </div>
    </div>
  );
}
