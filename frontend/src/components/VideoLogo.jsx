import React from 'react';

const VideoLogo = ({ onClick }) => {
    return (
        <button
            onClick={onClick}
            className="text-white hover:text-gray-300 text-lg px-2 py-1 bg-black/20 rounded"
            title="Video Meeting"
        >
            <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M23 7l-7 5 7 5V7z" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
        </button>
    );
};

export default VideoLogo;
