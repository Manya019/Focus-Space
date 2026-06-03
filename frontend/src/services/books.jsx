import axios from 'axios';
import { getBooks } from './api';

const fallbackBooks = [
  {
    id: 'fb1',
    title: "Harry Potter and the Sorcerer's Stone",
    author: 'J.K. Rowling',
    description: 'The first novel in the Harry Potter series.',
    cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=120',
    pageCount: 309,
  },
  {
    id: 'fb2',
    title: 'The Hobbit',
    author: 'J.R.R. Tolkien',
    description: 'A fantasy novel and children\'s book.',
    cover: 'https://images.unsplash.com/photo-1618666012174-83b441c0bc76?auto=format&fit=crop&q=80&w=120',
    pageCount: 310,
  },
  {
    id: 'fb3',
    title: 'Atomic Habits',
    author: 'James Clear',
    description: 'An easy & proven way to build good habits & break bad ones.',
    cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=120',
    pageCount: 320,
  },
  {
    id: 'fb4',
    title: 'Deep Work',
    author: 'Cal Newport',
    description: 'Rules for focused success in a distracted world.',
    cover: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=120',
    pageCount: 304,
  },
  {
    id: 'fb5',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    description: 'A novel set in the Jazz Age on Long Island.',
    cover: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=120',
    pageCount: 180,
  },
  {
    id: 'fb6',
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    description: 'A novel about racial injustice and the destruction of innocence.',
    cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=120',
    pageCount: 281,
  },
  {
    id: 'fb7',
    title: '1984',
    author: 'George Orwell',
    description: 'A dystopian social science fiction novel.',
    cover: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&q=80&w=120',
    pageCount: 328,
  },
  {
    id: 'fb8',
    title: 'The Catcher in the Rye',
    author: 'J.D. Salinger',
    description: 'A novel about teenager Holden Caulfield.',
    cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=120',
    pageCount: 277,
  },
  {
    id: 'fb9',
    title: 'Sapiens: A Brief History of Humankind',
    author: 'Yuval Noah Harari',
    description: 'A book surveying the history of humankind.',
    cover: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=120',
    pageCount: 512,
  },
  {
    id: 'fb10',
    title: 'Thinking, Fast and Slow',
    author: 'Daniel Kahneman',
    description: 'A book summarizing research on cognitive biases.',
    cover: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=120',
    pageCount: 499,
  }
];

export const searchBooks = async (query) => {
  try {
    const apiBooks = await getBooks(query);
    if (Array.isArray(apiBooks) && apiBooks.length > 0) {
      return apiBooks.map(book => ({
        id: `api-${book.id}`,
        title: book.title,
        author: book.author,
        description: book.description || '',
        cover: book.cover_url || book.coverUrl || '',
        pageCount: book.page_count || book.pageCount || 0,
      }));
    }
  } catch (error) {
    console.warn('Error searching app books API, trying Google Books:', error.message || error);
  }

  try {
    const response = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`);
    if (response.data && response.data.items && response.data.items.length > 0) {
      return response.data.items.map(item => ({
        id: item.id,
        title: item.volumeInfo.title,
        author: item.volumeInfo.authors?.join(', ') || 'Unknown Author',
        description: item.volumeInfo.description || '',
        cover: item.volumeInfo.imageLinks?.thumbnail || '',
        pageCount: item.volumeInfo.pageCount || 0,
      }));
    }
  } catch (error) {
    console.warn('Error searching Google Books API, using local fallback:', error.message || error);
  }

  // Local fallback filtering
  const lowerQuery = query.toLowerCase();
  const filtered = fallbackBooks.filter(book => 
    book.title.toLowerCase().includes(lowerQuery) || 
    book.author.toLowerCase().includes(lowerQuery)
  );
  
  if (filtered.length > 0) {
    return filtered;
  }
  
  // If nothing matches but query has content, return top 3 general suggestions
  return fallbackBooks.slice(0, 3);
};
