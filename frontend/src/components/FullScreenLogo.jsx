import React from 'react';

const FullScreenLogo = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="text-white hover:text-gray-300 text-lg px-2 py-1 bg-black/20 rounded"
      title="Toggle Full Screen"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3 3h18v18H3V3zm16 16V5H5v14h14zM9 7h2v2H9V7zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm4-8h2v2h-2V7zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z"
          fill="currentColor"
        />
      </svg>
    </button>
  );
};

export default FullScreenLogo;