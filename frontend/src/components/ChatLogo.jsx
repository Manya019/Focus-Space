import React from 'react';

const ChatLogo = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="text-white hover:text-gray-300 text-lg px-2 py-1 bg-black/20 rounded"
      title="Toggle Chat"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3.05 1.05 4.42L2 22l5.58-1.05C9.95 21.64 11.46 22 13 22h7c1.1 0 2-.9 2-2V12c0-5.52-4.48-10-10-10z"
          fill="currentColor"
        />
      </svg>
    </button>
  );
};

export default ChatLogo;