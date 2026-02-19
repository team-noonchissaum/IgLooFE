'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerAuction } from '@/lib/api';

export default function RegisterAuctionPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startPrice: '',
    categoryId: '1', // Default category ID for now
    startAt: '',
    endAt: '',
    imageUrl: '', // Simple URL input for MVP
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await registerAuction({
        title: formData.title,
        description: formData.description,
        startPrice: Number(formData.startPrice),
        categoryId: Number(formData.categoryId),
        startAt: formData.startAt ? new Date(formData.startAt).toISOString() : null,
        endAt: formData.endAt ? new Date(formData.endAt).toISOString() : null,
        imageUrls: formData.imageUrl ? [formData.imageUrl] : [],
      });
      alert('Auction registered successfully!');
      router.push('/auctions');
    } catch (error) {
      console.error(error);
      alert('Failed to register auction');
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Register New Auction</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Title</label>
          <input
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full border p-2 rounded"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full border p-2 rounded h-24"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Start Price</label>
          <input
            type="number"
            name="startPrice"
            value={formData.startPrice}
            onChange={handleChange}
            required
            className="w-full border p-2 rounded"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Image URL</label>
          <input
            name="imageUrl"
            value={formData.imageUrl}
            onChange={handleChange}
            placeholder="http://example.com/image.jpg"
            className="w-full border p-2 rounded"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 font-medium">Start Time</label>
            <input
              type="datetime-local"
              name="startAt"
              value={formData.startAt}
              onChange={handleChange}
              required
              className="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">End Time</label>
            <input
              type="datetime-local"
              name="endAt"
              value={formData.endAt}
              onChange={handleChange}
              required
              className="w-full border p-2 rounded"
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          Register Auction
        </button>
      </form>
    </div>
  );
}
