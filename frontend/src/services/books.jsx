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
    console.warn('Error searching app books API, trying Open Library:', error.message || error);
  }

  try {
    const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5`);
    if (!response.ok) throw new Error(`Open Library request failed: ${response.status}`);

    const data = await response.json();
    if (!data?.docs?.length) return [];

    return data.docs.map(doc => ({
      id: `ol-${doc.key || doc.title}`,
      title: doc.title,
      author: doc.author_name?.join(', ') || 'Unknown Author',
      description: doc.first_sentence?.[0] || (doc.subject ? `A book about ${doc.subject.slice(0, 3).join(', ')}.` : ''),
      cover: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : '',
      pageCount: doc.number_of_pages_median || doc.number_of_pages || 0,
    }));
  } catch (error) {
    console.warn('Error searching Open Library API:', error.message || error);
  }

  return [];
};
