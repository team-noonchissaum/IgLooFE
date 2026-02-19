import Link from 'next/link';
import { fetchAuctions } from '@/lib/api';
import { Auction, ApiResponse } from '@/lib/types';

export default async function AuctionsPage() {
  let auctions: Auction[] = [];
  try {
    const response: ApiResponse<{ content: Auction[] }> = await fetchAuctions();
    auctions = response.data.content;
  } catch (e) {
    console.error(e);
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Auction List</h1>
        <Link 
          href="/auctions/register" 
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Register New Item
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {auctions.map((auction) => (
          <Link key={auction.auctionId} href={`/auctions/${auction.auctionId}`} className="block">
            <div className="border rounded p-4 hover:shadow-lg transition">
              <div className="h-48 bg-gray-200 mb-4 flex items-center justify-center overflow-hidden">
                {auction.imageUrls && auction.imageUrls.length > 0 ? (
                  <img src={auction.imageUrls[0]} alt={auction.title} className="object-cover h-full w-full" />
                ) : (
                  <span className="text-gray-500">No Image</span>
                )}
              </div>
              <h2 className="text-xl font-semibold mb-2">{auction.title}</h2>
              <p className="text-gray-600 mb-2 truncate">{auction.description}</p>
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">{auction.currentPrice.toLocaleString()} won</span>
                <span className={`px-2 py-1 rounded text-sm ${
                  auction.status === 'WAITING' ? 'bg-yellow-100 text-yellow-800' :
                  auction.status === 'PROGRESSING' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {auction.status}
                </span>
              </div>
            </div>
          </Link>
        ))}
        {auctions.length === 0 && (
          <p className="text-gray-500 col-span-3 text-center">No auctions found.</p>
        )}
      </div>
    </div>
  );
}
