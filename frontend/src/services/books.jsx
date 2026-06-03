import axios from 'axios';
import { getBooks } from './api';

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

  return [];
};
