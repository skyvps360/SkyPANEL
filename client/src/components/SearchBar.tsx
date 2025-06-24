import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Users, Ticket, CreditCard, Search } from 'lucide-react';

// Define data interfaces for search
interface UserType {
  id: number;
  fullName: string;
  email: string;
  username: string;
}

interface TicketType {
  id: number;
  subject: string;
  status: string;
}

interface TransactionType {
  id: number;
  type: string;
  description: string;
  amount: number;
  status: string;
}

// Define search result type
interface SearchResult {
  id: number | string;
  type: "user" | "ticket" | "billing";
  name: string;
  description?: string;
  url: string;
  icon: React.ReactNode;
}

const SearchBar: React.FC = () => {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Sample data for demonstration
  const sampleTickets: TicketType[] = [
    { id: 101, subject: "testadsa", status: "closed" },
    { id: 102, subject: "Server issue", status: "open" },
    { id: 103, subject: "Billing question", status: "closed" },
  ];

  const sampleUsers: UserType[] = [
    { id: 1, fullName: "John Doe", email: "john@example.com", username: "johndoe" },
    { id: 2, fullName: "Jane Smith", email: "jane@example.com", username: "janesmith" },
  ];

  const sampleTransactions: TransactionType[] = [
    { id: 201, type: "credit", description: "Monthly payment", amount: 50.00, status: "completed" },
    { id: 202, type: "debit", description: "Server usage", amount: 25.50, status: "completed" },
  ];

  // Handle search when query changes
  useEffect(() => {
    const performSearch = () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const searchResults: SearchResult[] = [];
        const lowercaseQuery = query.toLowerCase().trim();

        // Search tickets
        sampleTickets.forEach(ticket => {
          if ((ticket.subject || "").toLowerCase().includes(lowercaseQuery)) {
            searchResults.push({
              id: ticket.id,
              type: "ticket",
              name: `Ticket #${ticket.id}: ${ticket.subject}`,
              description: `Status: ${ticket.status}`,
              url: `/tickets/${ticket.id}`,
              icon: <Ticket className="h-4 w-4" />,
            });
          }
        });

        // Search users
        sampleUsers.forEach(user => {
          if (
            (user.fullName || "").toLowerCase().includes(lowercaseQuery) ||
            (user.email || "").toLowerCase().includes(lowercaseQuery) ||
            (user.username || "").toLowerCase().includes(lowercaseQuery)
          ) {
            searchResults.push({
              id: user.id,
              type: "user",
              name: user.fullName,
              description: user.email,
              url: `/admin/users/${user.id}`,
              icon: <Users className="h-4 w-4" />,
            });
          }
        });

        // Search transactions
        sampleTransactions.forEach(tx => {
          if (
            (tx.description || "").toLowerCase().includes(lowercaseQuery) ||
            (tx.type || "").toLowerCase().includes(lowercaseQuery)
          ) {
            searchResults.push({
              id: tx.id,
              type: "billing",
              name: `${tx.type}: ${tx.description}`,
              description: `Amount: $${tx.amount.toFixed(2)} | Status: ${tx.status}`,
              url: `/billing`,
              icon: <CreditCard className="h-4 w-4" />,
            });
          }
        });
        
        setResults(searchResults);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const delaySearch = setTimeout(performSearch, 300);
    return () => clearTimeout(delaySearch);
  }, [query]);

  const handleResultClick = (result: SearchResult) => {
    navigate(result.url);
    setQuery('');
    setShowResults(false);
  };

  const handleInputFocus = () => {
    setShowResults(true);
  };

  const handleInputBlur = () => {
    // Delay hiding results to allow for clicking on them
    setTimeout(() => setShowResults(false), 200);
  };

  return (
    <div className="relative w-full max-w-xl">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search for tickets, users, billing..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Search Results */}
      {showResults && query.trim() !== "" && (
        <div className="absolute mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
          {isSearching ? (
            <div className="p-4 text-center text-gray-500">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No results found</div>
          ) : (
            <div className="py-2">
              {/* Group results by type */}
              {results.filter(r => r.type === "ticket").length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Tickets</div>
                  {results
                    .filter(r => r.type === "ticket")
                    .map(result => (
                      <div
                        key={`ticket-${result.id}`}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleResultClick(result)}
                      >
                        <div className="flex items-center">
                          <span className="mr-2 text-gray-500">{result.icon}</span>
                          <div>
                            <p className="text-sm font-medium">{result.name}</p>
                            {result.description && <p className="text-xs text-gray-500">{result.description}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {results.filter(r => r.type === "user").length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Users</div>
                  {results
                    .filter(r => r.type === "user")
                    .map(result => (
                      <div
                        key={`user-${result.id}`}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleResultClick(result)}
                      >
                        <div className="flex items-center">
                          <span className="mr-2 text-gray-500">{result.icon}</span>
                          <div>
                            <p className="text-sm font-medium">{result.name}</p>
                            {result.description && <p className="text-xs text-gray-500">{result.description}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {results.filter(r => r.type === "billing").length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Billing</div>
                  {results
                    .filter(r => r.type === "billing")
                    .map(result => (
                      <div
                        key={`billing-${result.id}`}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleResultClick(result)}
                      >
                        <div className="flex items-center">
                          <span className="mr-2 text-gray-500">{result.icon}</span>
                          <div>
                            <p className="text-sm font-medium">{result.name}</p>
                            {result.description && <p className="text-xs text-gray-500">{result.description}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;