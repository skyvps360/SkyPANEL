import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  MenuSquare,
  BookOpen,
  Library,
  FileText,
  Clock,
  BookMarked,
  Info,
  Filter,
  ExternalLink,
  X
} from "lucide-react";
import { getBrandColors, getPatternBackgrounds } from "@/lib/brand-theme";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { DocsTable } from "@/components/docs/DocsTable";


// Define the DocCategory type
interface DocCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  displayOrder: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// Define the Doc type
interface Doc {
  id: number;
  title: string;
  slug: string;
  content: string;
  category?: string; // Legacy field
  categoryId?: number | null;
  displayOrder: number;
  published: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

const DOCS_PER_PAGE = 10;

export default function DocsPage() {
  const [location, setLocation] = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Check if the URL has a slug parameter for a specific doc
  const match = location.match(/\/docs\/(.+)/);
  const slug = match ? match[1] : null;
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
      // Fetch branding data from API - just like status page
  const { data: brandingData } = useQuery<{
    primary_color: string;
    secondary_color: string;
    accent_color: string;
  }>({
    queryKey: ["/api/settings/branding"],
  });
  
  // Get brand colors using the data from API
  const brandColors = getBrandColors({
    primaryColor: brandingData?.primary_color || '',
    secondaryColor: brandingData?.secondary_color || '',
    accentColor: brandingData?.accent_color || '',
  });
  
  // Get company name from branding data
  const companyName = brandingData?.company_name || 'Company';
  
  // Get pattern backgrounds for visual elements
  const patterns = getPatternBackgrounds({
    primaryColor: brandingData?.primary_color || ''
  });
  
  // Fetch all doc categories
  const { data: categoriesData = [], isLoading: isLoadingCategories } = useQuery<DocCategory[]>({
    queryKey: ["/api/public/doc-categories"],
  });
  
  // Fetch all docs - with category filter if selected
  const { data: allDocsData = [], isLoading: isLoadingDocs } = useQuery<Doc[]>({
    queryKey: ["/api/public/docs", selectedCategory],
    queryFn: async ({ queryKey }) => {
      const categoryId = queryKey[1] as string | null;
      const url = categoryId 
        ? `/api/public/docs?categoryId=${categoryId}` 
        : "/api/public/docs";
      const response = await fetch(url);
      return response.json();
    }
  });
  
  // Filter for published docs only
  const publishedDocs = allDocsData.filter(doc => doc.published);
  
  // Filter by search query
  const filteredDocs = publishedDocs.filter(doc => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      doc.title.toLowerCase().includes(query) ||
      doc.content.toLowerCase().includes(query)
    );
  });
  
  // Sort docs by displayOrder
  const sortedDocs = [...filteredDocs].sort(
    (a, b) => a.displayOrder - b.displayOrder
  );
  
  // Calculate pagination
  const totalDocs = sortedDocs.length;
  const totalPages = Math.ceil(totalDocs / DOCS_PER_PAGE);
  const startIndex = (currentPage - 1) * DOCS_PER_PAGE;
  const paginatedDocs = sortedDocs.slice(
    startIndex,
    startIndex + DOCS_PER_PAGE
  );
  
  // Process categories for display
  const categoryOptions = categoriesData.sort((a, b) => {
    return a.displayOrder - b.displayOrder;
  });
  
  // Get selected category name
  const selectedCategoryName = selectedCategory
    ? categoryOptions.find(cat => cat.id.toString() === selectedCategory)?.name
    : null;
  
  // Get the current doc if a slug is provided
  const currentDoc = slug ? publishedDocs.find(doc => doc.slug === slug) : null;
  
  // Handle page change
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  
  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };
  
  useEffect(() => {
    // Reset to page 1 when navigating back to the docs list
    if (!slug) {
      setCurrentPage(1);
    }
  }, [slug]);

  // The docs list view
  const renderDocsList = () => {
    return (
      <div className="w-full">
        {/* Hero section with primary brand color background - using inline style to match other pages */}
        <div 
          className="relative overflow-hidden w-full"
          style={{ 
            background: `linear-gradient(135deg, ${brandColors.primary.full} 0%, ${brandColors.primary.dark} 100%)`,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
          }}
        >
          {/* Pattern overlay */}
          <div 
            className="absolute inset-0 opacity-10"
            style={patterns.dots.style}
          ></div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 opacity-10">
            <svg width="400" height="400" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="200" cy="200" r="200" fill="white" />
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 opacity-10 translate-y-1/2 -translate-x-1/4">
            <svg width="300" height="300" viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="150" cy="150" r="150" fill="white" />
            </svg>
          </div>
          <div className="absolute top-1/4 right-1/4 opacity-10">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="40" cy="40" r="40" fill="white" />
            </svg>
          </div>
          
          <div className="max-w-screen-xl mx-auto py-20 px-4 sm:px-6 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="flex items-center justify-center mb-8">
                <div
                  className="p-4 rounded-full mr-6"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                >
                  <FileText className="h-10 w-10 text-white" />
                </div>
                <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight">
                  Knowledge Base
                </h1>
              </div>
              <p className="text-white text-xl opacity-95 max-w-3xl mx-auto leading-relaxed mb-12">
                Browse our comprehensive documentation to find answers, guides, and help with our services. 
                Everything you need to succeed with {companyName}.
              </p>
              
              {/* Key Benefits Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
                <div className="flex flex-col items-center space-y-3">
                  <div className="p-3 rounded-full bg-white/20">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-semibold text-white text-sm">Comprehensive Guides</span>
                </div>
                <div className="flex flex-col items-center space-y-3">
                  <div className="p-3 rounded-full bg-white/20">
                    <Search className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-semibold text-white text-sm">Easy to Search</span>
                </div>
                <div className="flex flex-col items-center space-y-3">
                  <div className="p-3 rounded-full bg-white/20">
                    <Info className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-semibold text-white text-sm">Step-by-Step Help</span>
                </div>
                <div className="flex flex-col items-center space-y-3">
                  <div className="p-3 rounded-full bg-white/20">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-semibold text-white text-sm">Always Updated</span>
                </div>
              </div>
              
              {/* Modern search integrated directly in the hero */}
              <div className="mt-12 relative w-full max-w-2xl mx-auto">
                <div className="relative flex items-center">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/70" />
                  <Input
                    placeholder="Search documentation..."
                    value={searchQuery}
                    onChange={handleSearch}
                    className="pl-12 pr-12 py-6 text-base rounded-full border-white/20 bg-white/10 backdrop-blur-md text-white placeholder:text-white/60 focus:bg-white/20 transition-all duration-200"
                    style={{
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                      boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Category quick filters in hero section */}
              {categoryOptions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-6 justify-center">
                  <Button 
                    variant={selectedCategory === null ? "secondary" : "outline"} 
                    size="sm"
                    className={selectedCategory === null 
                      ? "bg-white hover:bg-white/90" 
                      : "bg-white/10 text-white hover:bg-white/20 border-white/20"}
                    style={selectedCategory === null ? { color: brandColors.primary.full } : {}}
                    onClick={() => setSelectedCategory(null)}
                  >
                    <Library className="mr-1 h-4 w-4" />
                    All Docs
                  </Button>
                  
                  {categoryOptions.map(category => (
                    <Button 
                      key={category.id} 
                      variant={selectedCategory === category.id.toString() ? "secondary" : "outline"}
                      size="sm"
                      className={selectedCategory === category.id.toString() 
                        ? "bg-white hover:bg-white/90" 
                        : "bg-white/10 text-white hover:bg-white/20 border-white/20"}
                      style={selectedCategory === category.id.toString() ? { color: brandColors.primary.full } : {}}
                      onClick={() => setSelectedCategory(category.id.toString())}
                    >
                      <BookMarked className="mr-1 h-4 w-4" />
                      {category.name}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main content section */}
        <div className="max-w-screen-xl mx-auto py-12 px-4 sm:px-6">
          {/* Current category and search status */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              {selectedCategoryName && (
                <div className="flex items-center">
                  <Badge variant="outline" className="text-muted-foreground">
                    Category
                  </Badge>
                  <span className="ml-2 font-medium text-lg">
                    {selectedCategoryName}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-8 w-8 p-0 rounded-full"
                    onClick={() => setSelectedCategory(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {searchQuery && (
                <div className="flex items-center mt-2">
                  <Badge variant="outline" className="text-muted-foreground">
                    Search
                  </Badge>
                  <span className="ml-2 font-medium">
                    "{searchQuery}"
                  </span>
                  <span className="ml-2 text-muted-foreground">
                    ({filteredDocs.length} results)
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-8 w-8 p-0 rounded-full"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {totalDocs} {totalDocs === 1 ? 'document' : 'documents'}
              </span>
            </div>
          </div>

          {/* Loading state */}
          {isLoadingDocs && (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: brandColors.primary.full }} />
              <span className="ml-3 text-lg">Loading documents...</span>
            </div>
          )}
          
          {/* No results */}
          {!isLoadingDocs && filteredDocs.length === 0 && (
            <div className="text-center py-20 max-w-md mx-auto">
              <Info className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
              <h3 className="mt-4 text-xl font-semibold">No documents found</h3>
              <p className="mt-2 text-muted-foreground">
                {searchQuery 
                  ? `No results for "${searchQuery}". Try a different search term.` 
                  : selectedCategory 
                    ? "No documents in this category." 
                    : "No documents available."}
              </p>
              {(searchQuery || selectedCategory) && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory(null);
                  }}
                >
                  Reset filters
                </Button>
              )}
            </div>
          )}
          
          {/* Document list */}
          {!isLoadingDocs && filteredDocs.length > 0 && (
            <DocsTable
              docs={paginatedDocs}
              categoriesData={categoriesData}
              brandColors={brandColors}
              onDocClick={(slug) => setLocation(`/docs/${slug}`)}
            />
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-10">
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    // Show first, last, and pages around current page
                    const buffer = 1; // Number of pages to show on either side of current
                    return (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - buffer && page <= currentPage + buffer)
                    );
                  })
                  .map((page, index, array) => {
                    // Add ellipsis if there are gaps
                    const showEllipsisAfter = index < array.length - 1 && array[index + 1] - page > 1;
                    
                    return (
                      <div key={page} className="flex items-center">
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="icon"
                          onClick={() => handlePageChange(page)}
                          style={currentPage === page ? { 
                            backgroundColor: brandColors.primary.full,
                            color: 'white'
                          } : {}}
                        >
                          {page}
                        </Button>
                        
                        {showEllipsisAfter && (
                          <span className="px-2 text-muted-foreground">...</span>
                        )}
                      </div>
                    );
                  })}
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // The single doc view
  const renderSingleDoc = () => {
    if (!currentDoc) {
      return (
        <div className="max-w-screen-lg mx-auto p-8">
          <div className="text-center py-12">
            <Info className="h-12 w-12 mx-auto mb-4" style={{ color: brandColors.primary.light }} />
            <h2 className="text-2xl font-bold mb-2" style={{ color: brandColors.primary.full }}>Document Not Found</h2>
            <p className="text-muted-foreground mb-6">The document you're looking for doesn't exist or may have been moved.</p>
            <Button 
              onClick={() => setLocation("/docs")} 
              className="gap-2"
              style={{
                backgroundColor: brandColors.primary.full,
                color: 'white',
                borderColor: brandColors.primary.full
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Documentation
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-screen-lg mx-auto px-4 py-8">
        <div className="mb-6 flex items-center">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setLocation("/docs")} 
            className="gap-2"
            style={{
              borderColor: brandColors.primary.light,
              color: brandColors.primary.full
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = brandColors.primary.full;
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.borderColor = brandColors.primary.full;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '';
              e.currentTarget.style.color = brandColors.primary.full;
              e.currentTarget.style.borderColor = brandColors.primary.light;
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          {currentDoc.categoryId && (
            <Badge 
              variant="outline" 
              className="ml-4"
              style={{
                borderColor: brandColors.secondary.lighter,
                color: brandColors.secondary.full
              }}
            >
              {(categoriesData.find(c => c.id === currentDoc.categoryId)?.name || '').split('|')[1] || ''}
            </Badge>
          )}
          
          <span className="ml-auto text-sm text-muted-foreground flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            Updated: {format(new Date(currentDoc.updatedAt), 'MMMM d, yyyy')}
          </span>
        </div>
        
        <div 
          className="bg-card rounded-lg border shadow-sm p-6 md:p-10"
          style={{
            borderColor: brandColors.primary.extraLight,
            boxShadow: `0 4px 20px rgba(${parseInt(brandColors.primary.hex.slice(0,2), 16)}, ${parseInt(brandColors.primary.hex.slice(2,4), 16)}, ${parseInt(brandColors.primary.hex.slice(4,6), 16)}, 0.05)`
          }}
        >
          <h1 
            className="text-3xl md:text-4xl font-bold mb-6 text-card-foreground"
            style={{ color: brandColors.primary.full }}
          >
            {currentDoc.title}
          </h1>
          <Separator 
            className="mb-6" 
            style={{ backgroundColor: brandColors.primary.lighter }}
          />
          
          <div 
            className="prose prose-lg prose-primary max-w-none" 
            style={{
              // Apply brand colors to markdown content
              '--tw-prose-links': brandColors.primary.full,
              '--tw-prose-headings': brandColors.primary.full,
              '--tw-prose-code': brandColors.secondary.full,
              '--tw-prose-quote-borders': brandColors.primary.light,
              '--tw-prose-bullets': brandColors.secondary.full,
            }}
          >
            <ReactMarkdown 
              components={{
                code: ({node, inline, className, children, ...props}) => {
                  if (inline) {
                    return (
                      <code 
                        className={className} 
                        style={{
                          backgroundColor: brandColors.secondary.extraLight,
                          padding: '0.2rem 0.4rem',
                          borderRadius: '0.2rem',
                          color: brandColors.secondary.full
                        }} 
                        {...props}
                      >
                        {children}
                      </code>
                    )
                  }
                  return (
                    <code
                      className={className}
                      style={{
                        background: brandColors.secondary.extraLight,
                        borderLeftColor: brandColors.secondary.light,
                        borderLeftWidth: '4px',
                        borderLeftStyle: 'solid',
                        padding: '1rem',
                        borderRadius: '0.25rem'
                      }}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                blockquote: ({node, children, ...props}) => {
                  return (
                    <blockquote 
                      style={{
                        borderLeftColor: brandColors.primary.light,
                        backgroundColor: brandColors.primary.extraLight,
                        padding: '0.5rem 1rem',
                      }} 
                      {...props}
                    >
                      {children}
                    </blockquote>
                  );
                }
              }}
            >
              {currentDoc.content}
            </ReactMarkdown>
          </div>
        </div>
        
        <div className="mt-8">
          <Button 
            variant="outline" 
            onClick={() => setLocation("/docs")} 
            className="gap-2"
            style={{
              borderColor: brandColors.primary.light,
              color: brandColors.primary.full
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = brandColors.primary.full;
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.borderColor = brandColors.primary.full;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '';
              e.currentTarget.style.color = brandColors.primary.full;
              e.currentTarget.style.borderColor = brandColors.primary.light;
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Documentation
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>

      <PublicLayout>
        <div className="min-h-screen bg-muted/30">
          {slug ? renderSingleDoc() : renderDocsList()}
        </div>
      </PublicLayout>
    </>
  );
}