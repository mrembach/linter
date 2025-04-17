/** @jsx h */
import { h, createContext } from 'preact';
import { useState, useContext } from 'preact/hooks';

interface LibraryContextType {
  selectedLibraryId: string | null;
  setSelectedLibraryId: (id: string | null) => void;
}

const LibraryContext = createContext<LibraryContextType>({
  selectedLibraryId: null,
  setSelectedLibraryId: () => {}
});

export function LibraryProvider({ children }: { children: any }) {
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);
  
  return (
    <LibraryContext.Provider value={{ selectedLibraryId, setSelectedLibraryId }}>
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  return useContext(LibraryContext);
} 