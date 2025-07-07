import React from 'react';

export default function EventModal() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Modal Placeholder */}
      <div className="w-[400px] h-[300px] bg-gray-900 border border-gray-800 rounded-lg shadow-lg flex items-center justify-center text-gray-400 pointer-events-auto">
        Event Modal
      </div>
    </div>
  );
} 