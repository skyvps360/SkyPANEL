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
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { getBrandColors, getPatternBackgrounds } from "@/lib/brand-theme";

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
  
  // Fetch brand colors from settings
  const { data: brandingData } = useQuery<{
    primary_color?: string;
    company_color?: string;
  }>({
    queryKey: ["/api/settings/branding"],
  });
  
  // Set up brand colors
  const brandColors = getBrandColors(brandingData?.primary_color || brandingData?.company_color || '');
  
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
      if (!response.ok) {
        throw new Error("Failed to fetch docs");
      }
      return response.json();
    }
  });
  
  // Ensure allDocs is always an array
  const allDocs = Array.isArray(allDocsData) ? allDocsData : [];
  
  // Filter to only show published docs (should already be filtered on server side, but just in case)
  const publishedDocs = allDocs.filter(doc => doc.published);
  
  // Filter docs by search query
  const filteredDocs = searchQuery
    ? publishedDocs.filter(doc => 
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.category && doc.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (doc.categoryId && categoriesData.find(c => c.id === doc.categoryId)?.name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : publishedDocs;
  
  // Sort docs by category, then by display order, then by title
  const sortedDocs = [...filteredDocs].sort((a, b) => {
    // First sort by category
    const aCategoryName = a.categoryId 
      ? categoriesData.find(c => c.id === a.categoryId)?.name || "" 
      : a.category || "";
    const bCategoryName = b.categoryId 
      ? categoriesData.find(c => c.id === b.categoryId)?.name || "" 
      : b.category || "";
      
    if (aCategoryName !== bCategoryName) {
      return aCategoryName.localeCompare(bCategoryName);
    }
    // Then sort by display order (lower numbers come first)
    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder;
    }
    // Finally sort by title
    return a.title.localeCompare(b.title);
  });
  
  // Calculate pagination
  const totalPages = Math.ceil(sortedDocs.length / DOCS_PER_PAGE);
  const paginatedDocs = sortedDocs.slice(
    (currentPage - 1) * DOCS_PER_PAGE,
    currentPage * DOCS_PER_PAGE
  );
  
  // Group docs by category for the list view
  const docsByCategory = sortedDocs.reduce((acc, doc) => {
    // Get category name from categoryId if available, otherwise fall back to category string or "Uncategorized"
    const categoryName = doc.categoryId 
      ? categoriesData.find(c => c.id === doc.categoryId)?.name || "Uncategorized" 
      : doc.category || "Uncategorized";
      
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(doc);
    return acc;
  }, {} as Record<string, Doc[]>);
  
  // Get categories for the sidebar - from category data plus any legacy categories in docs
  const categoryOptions = [
    ...categoriesData.map(c => ({ id: c.id.toString(), name: c.name })),
    ...Array.from(new Set(publishedDocs
      .filter(doc => doc.category && !doc.categoryId)
      .map(doc => doc.category)))
      .map(legacyCategory => ({ id: `legacy-${legacyCategory}`, name: legacyCategory as string }))
  ].sort((a, b) => a.name.localeCompare(b.name));
  
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
    // Get background pattern for visual interest
    const patterns = getPatternBackgrounds(brandColors.primary.hex);
    
    return (
      <div className="w-full">
        {/* Modern Hero section with gradient background */}
        <div 
          className="relative overflow-hidden w-full" 
          style={{ 
            background: brandColors.gradient.primary, 
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)' 
          }}
        >
          {/* Decorative pattern overlay */}
          <div className="absolute inset-0 opacity-10" style={patterns.dots.style}></div>
          
          <div className="max-w-screen-xl mx-auto py-16 px-4 sm:px-6 relative z-10">
            <div className="max-w-3xl">
              <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-white">
                Knowledge Base
              </h1>
              <p className="text-white text-lg opacity-90 max-w-xl">
                Browse our documentation to find answers, guides, and help with our services.
              </p>
              
              {/* Modern search integrated directly in the hero */}
              <div className="mt-8 relative w-full max-w-2xl">
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
                <div className="mt-6 flex flex-wrap gap-2">
                  <Badge 
                    variant={!searchQuery ? "default" : "outline"}
                    className="px-3 py-1 text-sm rounded-full cursor-pointer border-white/20 bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all duration-200"
                    style={!searchQuery ? 
                      { backgroundColor: 'white', color: brandColors.primary.full } :
                      { borderColor: 'rgba(255, 255, 255, 0.2)', color: 'white' }
                    }
                    onClick={() => setSearchQuery("")}
                  >
                    All Topics
                  </Badge>
                  {categoryOptions.slice(0, 5).map(category => (
                    <Badge 
                      key={category.id}
                      variant={searchQuery === category.name ? "default" : "outline"}
                      className="px-3 py-1 text-sm rounded-full cursor-pointer border-white/20 bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all duration-200"
                      style={searchQuery === category.name ? 
                        { backgroundColor: 'white', color: brandColors.primary.full } :
                        { borderColor: 'rgba(255, 255, 255, 0.2)', color: 'white' }
                      }
                      onClick={() => setSearchQuery(category.name)}
                    >
                      {category.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Main content section */}
        <div className="max-w-screen-xl mx-auto py-12 px-4 sm:px-6">
          {/* If there's a search query active, show search results summary */}
          {searchQuery && (
            <div className="w-full mb-8 bg-white rounded-xl p-6 shadow-md border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center">
                <div className="mr-4 p-3 rounded-full" style={{ backgroundColor: brandColors.primary.extraLight }}>
                  <Search className="h-5 w-5" style={{ color: brandColors.primary.full }} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    Search Results
                  </h2>
                  <p className="text-gray-600">
                    Found {sortedDocs.length} result{sortedDocs.length !== 1 ? 's' : ''} 
                    for "{searchQuery}"
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setSearchQuery("")}
                style={{ 
                  borderColor: brandColors.primary.light,
                  color: brandColors.primary.full
                }}
                className="shrink-0"
              >
                Clear Search
              </Button>
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar for desktop - redesigned with modern card style */}
            <div className="hidden lg:block">
              <div className="sticky top-20 space-y-6">
                {/* Categories card */}
                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                  <h3 className="font-bold text-lg mb-4 flex items-center" style={{ color: brandColors.primary.full }}>
                    <Library className="mr-2 h-5 w-5" />
                    Browse by Topic
                  </h3>
                  <div className="space-y-1.5">
                    <Button 
                      variant={!searchQuery ? "default" : "ghost"} 
                      className="w-full justify-start text-left rounded-lg"
                      style={!searchQuery ? 
                        { backgroundColor: brandColors.primary.full, color: 'white' } :
                        { color: brandColors.primary.full }
                      }
                      onClick={() => setSearchQuery("")}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      All Documents
                    </Button>
                    
                    {categoryOptions.map(category => (
                      <Button 
                        key={category.id}
                        variant={searchQuery === category.name ? "default" : "ghost"} 
                        className="w-full justify-start text-left rounded-lg group transition-all duration-200"
                        style={searchQuery === category.name ? 
                          { backgroundColor: brandColors.primary.full, color: 'white' } :
                          { color: brandColors.primary.full }
                        }
                        onClick={() => setSearchQuery(category.name)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        <span className="truncate">{category.name}</span>
                      </Button>
                    ))}
                  </div>
                </div>
                
                {/* Recent documents card */}
                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                  <h3 className="font-bold text-lg mb-4 flex items-center" style={{ color: brandColors.primary.full }}>
                    <Clock className="mr-2 h-5 w-5" />
                    Recently Updated
                  </h3>
                  <div className="space-y-3">
                    {publishedDocs.slice(0, 5).map(doc => (
                      <div key={doc.id} className="group">
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start text-left px-3 py-2 rounded-lg text-gray-700 hover:text-gray-900 font-medium"
                          style={{ 
                            height: 'auto',
                            color: 'inherit'
                          }}
                          onClick={() => setLocation(`/docs/${doc.slug}`)}
                        >
                          <div className="flex items-start">
                            <BookMarked className="mr-2 h-4 w-4 mt-0.5 shrink-0 transition-colors duration-200" 
                              style={{ color: brandColors.primary.full }} 
                            />
                            <div className="space-y-1">
                              <div className="text-sm font-medium group-hover:text-gray-900 group-hover:underline transition-all duration-200 line-clamp-2">
                                {doc.title}
                              </div>
                              <div className="text-xs text-gray-500 flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {format(new Date(doc.updatedAt), 'MMM d, yyyy')}
                              </div>
                            </div>
                          </div>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Main content area - Redesigned with modern cards */}
            <div className="lg:col-span-3">
              {/* Mobile filters */}
              <div className="lg:hidden mb-8">
                <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg flex items-center" style={{ color: brandColors.primary.full }}>
                      <Filter className="mr-2 h-5 w-5" /> 
                      Categories
                    </h3>
                    {searchQuery && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSearchQuery("")}
                        style={{ 
                          borderColor: brandColors.primary.light,
                          color: brandColors.primary.full
                        }}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge 
                      variant={!searchQuery ? "default" : "outline"}
                      className="px-3 py-1.5 text-sm rounded-full cursor-pointer"
                      style={!searchQuery ? 
                        { backgroundColor: brandColors.primary.full, color: 'white' } :
                        { 
                          borderColor: brandColors.primary.lighter,
                          color: 'inherit',
                          backgroundColor: 'white' 
                        }
                      }
                      onClick={() => setSearchQuery("")}
                    >
                      All
                    </Badge>
                    {categoryOptions.map(category => (
                      <Badge 
                        key={category.id}
                        variant={searchQuery === category.name ? "default" : "outline"}
                        className="px-3 py-1.5 text-sm rounded-full cursor-pointer"
                        style={searchQuery === category.name ? 
                          { backgroundColor: brandColors.primary.full, color: 'white' } :
                          { 
                            borderColor: brandColors.primary.lighter,
                            color: 'inherit',
                            backgroundColor: 'white' 
                          }
                        }
                        onClick={() => setSearchQuery(category.name)}
                      >
                        {category.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Loading state */}
              {isLoadingDocs ? (
                <div className="flex flex-col justify-center items-center py-16 bg-white rounded-xl shadow-md">
                  <Loader2 className="h-10 w-10 animate-spin mb-4" style={{ color: brandColors.primary.full }} />
                  <p className="text-gray-500">Loading documentation...</p>
                </div>
              ) : sortedDocs.length === 0 ? (
                // Empty state
                <div className="bg-white rounded-xl shadow-md p-8 text-center border border-gray-100">
                  <div className="inline-flex items-center justify-center p-4 rounded-full mb-4" 
                    style={{ backgroundColor: brandColors.primary.extraLight }}
                  >
                    <Info className="h-8 w-8" style={{ color: brandColors.primary.full }} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">No documentation found</h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    {searchQuery 
                      ? `We couldn't find any documentation matching "${searchQuery}"`
                      : "There are no documentation articles available yet."
                    }
                  </p>
                  {searchQuery && (
                    <Button 
                      variant="outline" 
                      onClick={() => setSearchQuery("")}
                      style={{ 
                        borderColor: brandColors.primary.light,
                        color: brandColors.primary.full
                      }}
                    >
                      Clear Search
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* When not searching, group by category with new card design */}
                  {!searchQuery ? (
                    Object.entries(docsByCategory).map(([category, docs]) => (
                      <div key={category} className="mb-12">
                        <div className="flex items-center mb-5">
                          <div className="p-2 rounded-lg mr-3" 
                            style={{ backgroundColor: brandColors.primary.extraLight }}
                          >
                            <BookOpen className="h-5 w-5" style={{ color: brandColors.primary.full }} />
                          </div>
                          <h2 className="text-2xl font-bold" style={{ color: brandColors.primary.full }}>
                            {category}
                          </h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {docs.map(doc => (
                            <Card 
                              key={doc.id} 
                              className="overflow-hidden hover:shadow-lg transition-all duration-300 border-transparent group relative"
                              style={{ 
                                borderLeft: `4px solid ${brandColors.primary.full}`,
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' 
                              }}
                            >
                              <CardHeader className="pb-2 pt-5">
                                <CardTitle className="text-lg flex justify-between items-start gap-2">
                                  <Link 
                                    href={`/docs/${doc.slug}`} 
                                    className="group-hover:underline transition-colors"
                                    style={{
                                      color: brandColors.primary.full
                                    }}
                                  >
                                    {doc.title}
                                  </Link>
                                  <Badge 
                                    className="rounded-full px-2 py-1 text-xs font-medium self-start"
                                    style={{
                                      backgroundColor: brandColors.primary.extraLight,
                                      color: brandColors.primary.full,
                                    }}
                                  >
                                    <Clock className="mr-1 h-3 w-3 inline" />
                                    {format(new Date(doc.updatedAt), 'MMM d, yyyy')}
                                  </Badge>
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-1">
                                <p className="text-gray-600 line-clamp-2 text-sm leading-relaxed">
                                  {doc.content.substring(0, 120)}...
                                </p>
                              </CardContent>
                              <CardFooter className="pt-0 flex justify-between items-center">
                                <Button 
                                  variant="ghost" 
                                  asChild 
                                  size="sm"
                                  className="p-0 hover:bg-transparent group-hover:underline font-medium -ml-1"
                                  style={{ 
                                    color: brandColors.primary.full,
                                    height: 'auto' 
                                  }}
                                >
                                  <Link href={`/docs/${doc.slug}`} className="flex items-center">
                                    Read More
                                    <ExternalLink className="ml-1 h-3 w-3" />
                                  </Link>
                                </Button>
                                
                                {/* Optional: Show category badge */}
                                {(doc.categoryId || doc.category) && (
                                  <Badge 
                                    variant="outline"
                                    className="rounded-full px-2 py-0.5 text-xs"
                                    style={{
                                      borderColor: brandColors.primary.lighter,
                                      color: brandColors.primary.dark,
                                    }}
                                  >
                                    {doc.categoryId 
                                      ? categoriesData.find(c => c.id === doc.categoryId)?.name 
                                      : doc.category}
                                  </Badge>
                                )}
                              </CardFooter>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    // When searching, show a modern list with pagination
                    <>
                      <div className="space-y-6">
                        {paginatedDocs.map(doc => (
                          <Card 
                            key={doc.id} 
                            className="overflow-hidden hover:shadow-lg transition-all duration-300 group relative"
                            style={{ 
                              borderLeft: `4px solid ${brandColors.primary.full}`,
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                            }}
                          >
                            <div className="flex flex-col md:flex-row md:items-center gap-4 p-6">
                              {/* Left side content */}
                              <div className="flex-1">
                                <div className="flex items-center mb-2">
                                  <Badge 
                                    variant="outline"
                                    className="rounded-full px-2 py-0.5 text-xs mr-2"
                                    style={{
                                      backgroundColor: brandColors.primary.extraLight,
                                      borderColor: 'transparent',
                                      color: brandColors.primary.full
                                    }}
                                  >
                                    {doc.categoryId 
                                      ? categoriesData.find(c => c.id === doc.categoryId)?.name 
                                      : doc.category || "Uncategorized"}
                                  </Badge>
                                  
                                  <span className="text-xs text-gray-500 flex items-center">
                                    <Clock className="mr-1 h-3 w-3" />
                                    {format(new Date(doc.updatedAt), 'MMM d, yyyy')}
                                  </span>
                                </div>
                                
                                <Link 
                                  href={`/docs/${doc.slug}`} 
                                  className="text-xl font-bold mb-2 block group-hover:underline"
                                  style={{ color: brandColors.primary.full }}
                                >
                                  {doc.title}
                                </Link>
                                
                                <p className="text-gray-600 line-clamp-2 text-sm leading-relaxed mb-4">
                                  {doc.content.substring(0, 200)}...
                                </p>
                                
                                <Button 
                                  variant="outline" 
                                  asChild 
                                  size="sm"
                                  className="rounded-full"
                                  style={{ 
                                    borderColor: brandColors.primary.light,
                                    color: brandColors.primary.full
                                  }}
                                >
                                  <Link href={`/docs/${doc.slug}`} className="flex items-center">
                                    Read Full Document
                                    <ExternalLink className="ml-1.5 h-3 w-3" />
                                  </Link>
                                </Button>
                              </div>
                              
                              {/* Optional: Show a visual indicator for the document type */}
                              <div className="hidden md:block">
                                <div 
                                  className="p-3 rounded-full" 
                                  style={{ backgroundColor: brandColors.primary.extraLight }}
                                >
                                  <BookMarked 
                                    className="h-6 w-6"
                                    style={{ color: brandColors.primary.full }}
                                  />
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                      
                      {/* Pagination controls - redesigned */}
                      {totalPages > 1 && (
                        <div className="flex justify-center mt-10">
                          <div className="inline-flex items-center p-1 bg-white rounded-full shadow-md border border-gray-100">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePageChange(currentPage - 1)}
                              disabled={currentPage === 1}
                              className="rounded-full text-gray-500 hover:text-gray-700"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                              <Button
                                key={page}
                                variant={currentPage === page ? "default" : "ghost"}
                                className="rounded-full mx-0.5 w-9 h-9"
                                onClick={() => handlePageChange(page)}
                                style={currentPage === page ? 
                                  { backgroundColor: brandColors.primary.full, color: 'white' } :
                                  { color: 'inherit' }
                                }
                              >
                                {page}
                              </Button>
                            ))}
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePageChange(currentPage + 1)}
                              disabled={currentPage === totalPages}
                              className="rounded-full text-gray-500 hover:text-gray-700"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // If we're viewing a specific doc
  const renderSingleDoc = () => {
    if (isLoadingDocs) {
      return (
        <div className="container mx-auto py-8 flex justify-center items-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }
    
    if (!currentDoc) {
      return (
        <div className="container mx-auto py-8">
          <div className="flex items-center mb-6">
            <Button variant="outline" onClick={() => setLocation("/docs")} className="mr-2">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Documentation
            </Button>
          </div>
          <Card className="mb-8">
            <CardContent className="pt-6">
              <h1 className="text-2xl font-bold text-center mb-4">Document Not Found</h1>
              <p className="text-center">
                The documentation you're looking for does not exist or may have been removed.
              </p>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button onClick={() => setLocation("/docs")}>
                View All Documentation
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }
    
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
          <Button 
            variant="outline" 
            onClick={() => setLocation("/docs")} 
            className="flex items-center"
            style={{ 
              borderColor: brandColors.primary.light,
              color: brandColors.primary.full
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Documentation
          </Button>
          
          {/* Mobile dropdown for other docs in same category (mobile only) */}
          <div className="md:hidden w-full mt-2">
            <Card className="border border-gray-100">
              <CardContent className="p-3">
                <h3 className="text-sm font-medium mb-2 flex items-center">
                  <MenuSquare className="h-4 w-4 mr-1" />
                  More in this category
                </h3>
                <select 
                  className="w-full p-2 text-sm rounded-md border border-gray-200 bg-white"
                  value={currentDoc.slug}
                  onChange={(e) => {
                    if (e.target.value !== currentDoc.slug) {
                      setLocation(`/docs/${e.target.value}`);
                    }
                  }}
                >
                  <option value={currentDoc.slug}>{currentDoc.title}</option>
                  {publishedDocs
                    .filter(doc => 
                      doc.id !== currentDoc.id &&
                      ((doc.categoryId && currentDoc.categoryId && doc.categoryId === currentDoc.categoryId) ||
                      (doc.category && currentDoc.category && doc.category === currentDoc.category))
                    )
                    .slice(0, 5)
                    .map(doc => (
                      <option key={doc.id} value={doc.slug}>
                        {doc.title}
                      </option>
                    ))}
                </select>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar for document categories on larger screens */}
          <div className="hidden lg:block">
            <div className="sticky top-20">
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <h3 className="font-medium text-lg mb-4 flex items-center" style={{ color: brandColors.primary.full }}>
                  <Library className="mr-2 h-5 w-5" />
                  Categories
                </h3>
                <ul className="space-y-2">
                  {categoryOptions.map(category => (
                    <li key={category.id}>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-left"
                        style={{ color: brandColors.primary.full }}
                        onClick={() => {
                          setSearchQuery(category.name);
                          setLocation("/docs");
                        }}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        {category.name}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Related documents section */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-medium text-lg mb-4 flex items-center" style={{ color: brandColors.primary.full }}>
                  <MenuSquare className="mr-2 h-5 w-5" />
                  Related Documents
                </h3>
                <ul className="space-y-4">
                  {publishedDocs
                    .filter(doc => 
                      doc.id !== currentDoc.id &&
                      ((doc.categoryId && currentDoc.categoryId && doc.categoryId === currentDoc.categoryId) ||
                      (doc.category && currentDoc.category && doc.category === currentDoc.category))
                    )
                    .slice(0, 5)
                    .map(doc => (
                      <li key={doc.id} className="border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start text-left font-normal p-0 h-auto"
                          style={{ color: brandColors.primary.full }}
                          onClick={() => setLocation(`/docs/${doc.slug}`)}
                        >
                          <BookMarked className="mr-2 h-4 w-4 shrink-0" />
                          <span className="truncate">{doc.title}</span>
                        </Button>
                        <div className="text-xs text-gray-500 ml-6 mt-1">
                          {format(new Date(doc.updatedAt), 'MMM d, yyyy')}
                        </div>
                      </li>
                    ))}
                </ul>
                {/* Button to see all docs in this category */}
                {(currentDoc.categoryId || currentDoc.category) && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      style={{ 
                        borderColor: brandColors.primary.light,
                        color: brandColors.primary.full
                      }}
                      onClick={() => {
                        if (currentDoc.categoryId) {
                          const category = categoriesData.find(c => c.id === currentDoc.categoryId)?.name || "";
                          setSearchQuery(category);
                        } else if (currentDoc.category) {
                          setSearchQuery(currentDoc.category);
                        }
                        setLocation("/docs");
                      }}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      View All in Category
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        
          {/* Main content area */}
          <div className="lg:col-span-3">
            <article>
              <Card className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                <div className="h-1 w-full" style={{ backgroundColor: brandColors.primary.full }}></div>
                <CardHeader className="border-b border-gray-100">
                  {(currentDoc.categoryId || currentDoc.category) && (
                    <div className="mb-2">
                      <Badge 
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: brandColors.primary.extraLight,
                          color: brandColors.primary.full
                        }}
                      >
                        {currentDoc.categoryId 
                          ? categoriesData.find(c => c.id === currentDoc.categoryId)?.name 
                          : currentDoc.category}
                      </Badge>
                    </div>
                  )}
                  <CardTitle className="text-2xl md:text-3xl">{currentDoc.title}</CardTitle>
                  <div className="text-sm text-gray-500 flex items-center mt-2">
                    <Clock className="h-4 w-4 mr-1" />
                    Last updated: {format(new Date(currentDoc.updatedAt), 'MMM d, yyyy')}
                  </div>
                </CardHeader>
                <CardContent className="pt-8 px-6 md:px-8">
                  <div 
                    className="prose prose-gray max-w-none"
                    style={{
                      '--tw-prose-headings': brandColors.primary.full,
                      '--tw-prose-links': brandColors.primary.full,
                      '--tw-prose-links-hover': brandColors.primary.dark,
                    } as React.CSSProperties}
                  >
                    <ReactMarkdown>
                      {currentDoc.content}
                    </ReactMarkdown>
                  </div>
                </CardContent>
                <CardFooter className="border-t border-gray-100 pt-6 flex flex-wrap justify-between gap-4">
                  <div className="flex flex-wrap gap-2">
                    {/* Tag badge for the category */}
                    {(currentDoc.categoryId || currentDoc.category) && (
                      <Badge 
                        variant="outline"
                        className="rounded-full px-3 py-1"
                        style={{
                          borderColor: brandColors.primary.lighter,
                          color: brandColors.primary.dark
                        }}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        {currentDoc.categoryId 
                          ? categoriesData.find(c => c.id === currentDoc.categoryId)?.name 
                          : currentDoc.category}
                      </Badge>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setLocation("/docs")}
                    style={{ 
                      borderColor: brandColors.primary.light,
                      color: brandColors.primary.full
                    }}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Documentation
                  </Button>
                </CardFooter>
              </Card>
            </article>
          </div>
        </div>
      </div>
    );
  };

  // Create the content function
  const renderContent = () => {
    if (slug) {
      return renderSingleDoc();
    }
    return renderDocsList();
  };
  
  // Wrap the content in our layout with docs-page class to apply custom styling
  return (
    <PublicLayout>
      <div className="docs-page">
        {renderContent()}
      </div>
    </PublicLayout>
  );
}