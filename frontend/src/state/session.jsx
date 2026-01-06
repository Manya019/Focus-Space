import { useState } from 'react';

export function useSessionDraft() {
  const [book, setBook] = useState('');
  const [targetPages, setTargetPages] = useState('');
  const [pages, setPages] = useState('');
  const [notes, setNotes] = useState('');

  const clear = () => {
    setBook('');
    setTargetPages('');
    setPages('');
    setNotes('');
  };

  return { book, targetPages, pages, notes, setBook, setTargetPages, setPages, setNotes, clear };
}

