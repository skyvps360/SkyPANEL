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
    return (
      <div className="w-full">
        {/* Hero section with colored background - matching blog page exactly */}
        <div style={{ backgroundColor: brandColors.primary.full }} className="relative overflow-hidden w-full">
          {/* Decorative bubbles in the background, exactly matching blog page */}
          <div className="absolute top-0 right-0 opacity-10">
            <svg width="350" height="350" viewBox="0 0 350 350" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="175" cy="175" r="175" fill="white" />
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
          
          <div className="max-w-screen-xl mx-auto py-12 px-4 sm:px-6 relative z-10">
            <div className="max-w-3xl">
              <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-white">
                Documentation
              </h1>
              <p className="text-white text-lg opacity-90">
                Browse our documentation to learn more about our services, get started guides and troubleshooting information.
              </p>
            </div>
          </div>
        </div>
        
        {/* Search bar section - exactly matching blog layout */}
        <div className="max-w-screen-xl mx-auto py-8 px-4 sm:px-6">
          {/* Search bar */}
          <div className="w-full max-w-md mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search documentation..." 
                value={searchQuery}
                onChange={handleSearch}
                className="pl-10 pr-10 py-6 rounded-full border-gray-200 input-brand-focus"
                style={{
                  borderColor: searchQuery ? brandColors.primary.light : undefined,
                  boxShadow: searchQuery ? `0 0 0 1px ${brandColors.primary.light}` : undefined
                }}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
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
                    <li>
                      <Button 
                        variant={!searchQuery ? "default" : "ghost"} 
                        className="w-full justify-start text-left"
                        style={!searchQuery ? 
                          { backgroundColor: brandColors.primary.full, color: 'white' } :
                          { color: brandColors.primary.full }
                        }
                        onClick={() => setSearchQuery("")}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        All Documents
                      </Button>
                    </li>
                    {categoryOptions.map(category => (
                      <li key={category.id}>
                        <Button 
                          variant={searchQuery === category.name ? "default" : "ghost"} 
                          className="w-full justify-start text-left"
                          style={searchQuery === category.name ? 
                            { backgroundColor: brandColors.primary.full, color: 'white' } :
                            { color: brandColors.primary.full }
                          }
                          onClick={() => setSearchQuery(category.name)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          {category.name}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Recent documents section */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="font-medium text-lg mb-4 flex items-center" style={{ color: brandColors.primary.full }}>
                    <Clock className="mr-2 h-5 w-5" />
                    Recently Updated
                  </h3>
                  <ul className="space-y-4">
                    {publishedDocs.slice(0, 5).map(doc => (
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
                </div>
              </div>
            </div>
            
            {/* Main content area */}
            <div className="lg:col-span-3">
              {/* Mobile filters */}
              <div className="lg:hidden mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-lg flex items-center" style={{ color: brandColors.primary.full }}>
                    <Filter className="mr-2 h-5 w-5" /> 
                    Filter by Category
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
                      Clear Filter
                    </Button>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  <Badge 
                    variant={!searchQuery ? "default" : "outline"}
                    className="px-3 py-1 text-sm rounded-full cursor-pointer"
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
                      className="px-3 py-1 text-sm rounded-full cursor-pointer"
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
              
              {isLoadingDocs ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : sortedDocs.length === 0 ? (
                <Card>
                  <CardContent className="py-12">
                    <p className="text-center text-gray-500">
                      {searchQuery 
                        ? `No documentation found matching "${searchQuery}"`
                        : "No documentation available yet."
                      }
                    </p>
                    {searchQuery && (
                      <div className="flex justify-center mt-4">
                        <Button variant="outline" onClick={() => setSearchQuery("")}>
                          Clear Search
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* When not searching, group by category */}
                  {!searchQuery ? (
                    Object.entries(docsByCategory).map(([category, docs]) => (
                      <div key={category} className="mb-12">
                        <h2 className="text-xl font-bold mb-5 flex items-center" style={{ color: brandColors.primary.full }}>
                          <BookOpen className="mr-2 h-5 w-5" /> {category}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {docs.map(doc => (
                            <Card key={doc.id} className="border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-all duration-300 hover:border-transparent group">
                              <div className="h-1 w-full" style={{ backgroundColor: brandColors.primary.full }}></div>
                              <CardHeader className="pb-2 pt-5">
                                <CardTitle className="text-lg flex justify-between items-start gap-2">
                                  <Link 
                                    href={`/docs/${doc.slug}`} 
                                    className="hover:underline transition-colors"
                                    style={{
                                      color: 'inherit'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.color = brandColors.primary.full;
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.color = 'inherit';
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
                                    {format(new Date(doc.updatedAt), 'MMM d, yyyy')}
                                  </Badge>
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-1">
                                <p className="text-gray-500 line-clamp-2 text-sm">
                                  {doc.content.substring(0, 120)}...
                                </p>
                              </CardContent>
                              <CardFooter className="pt-0">
                                <Button 
                                  variant="ghost" 
                                  asChild 
                                  size="sm"
                                  className="p-0 hover:bg-transparent underline-offset-4 font-medium"
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
                              </CardFooter>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    // When searching, show a flat list with pagination
                    <>
                      {searchQuery && (
                        <div className="bg-white rounded-xl p-6 shadow-sm mb-6 border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center">
                            <Info className="h-5 w-5 mr-3 text-gray-400" />
                            <div>
                              <p className="font-medium text-gray-900 mb-1">
                                Search Results
                              </p>
                              <p className="text-sm text-gray-500">
                                Found {sortedDocs.length} result{sortedDocs.length !== 1 ? 's' : ''} 
                                for "{searchQuery}"
                              </p>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
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
                      
                      <div className="space-y-6">
                        {paginatedDocs.map(doc => (
                          <Card key={doc.id} className="border border-gray-100 rounded-xl overflow-hidden hover:shadow-sm transition-all duration-300">
                            <div className="h-1 w-full" style={{ backgroundColor: brandColors.primary.full }}></div>
                            <CardHeader className="pb-2 pt-5">
                              <CardTitle className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-1">
                                <Link 
                                  href={`/docs/${doc.slug}`} 
                                  className="text-lg hover:underline"
                                  style={{ color: brandColors.primary.full }}
                                >
                                  {doc.title}
                                </Link>
                                <div className="flex items-center">
                                  {(doc.categoryId || doc.category) && (
                                    <Badge 
                                      className="rounded-full px-2 py-0.5 text-xs font-medium mr-2"
                                      style={{
                                        backgroundColor: brandColors.primary.extraLight,
                                        color: brandColors.primary.full
                                      }}
                                    >
                                      {doc.categoryId 
                                        ? categoriesData.find(c => c.id === doc.categoryId)?.name 
                                        : doc.category}
                                    </Badge>
                                  )}
                                  <span className="text-xs text-gray-500">
                                    {format(new Date(doc.updatedAt), 'MMM d, yyyy')}
                                  </span>
                                </div>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-1">
                              <p className="text-gray-500 line-clamp-3 text-sm mb-2">
                                {doc.content.substring(0, 200)}...
                              </p>
                              <Button 
                                variant="ghost" 
                                asChild 
                                size="sm"
                                className="p-0 hover:bg-transparent underline-offset-4 font-medium"
                                style={{ 
                                  color: brandColors.primary.full,
                                  height: 'auto' 
                                }}
                              >
                                <Link href={`/docs/${doc.slug}`} className="flex items-center">
                                  Read Full Document
                                  <ExternalLink className="ml-1 h-3 w-3" />
                                </Link>
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      
                      {/* Pagination controls */}
                      {totalPages > 1 && (
                        <div className="flex justify-center mt-8">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handlePageChange(currentPage - 1)}
                              disabled={currentPage === 1}
                              style={{ 
                                borderColor: brandColors.primary.lighter,
                                color: brandColors.primary.full
                              }}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                              <Button
                                key={page}
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                onClick={() => handlePageChange(page)}
                                style={currentPage === page ? 
                                  { backgroundColor: brandColors.primary.full, color: 'white' } :
                                  { 
                                    borderColor: brandColors.primary.lighter,
                                    color: brandColors.primary.full
                                  }
                                }
                              >
                                {page}
                              </Button>
                            ))}
                            
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handlePageChange(currentPage + 1)}
                              disabled={currentPage === totalPages}
                              style={{ 
                                borderColor: brandColors.primary.lighter,
                                color: brandColors.primary.full
                              }}
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
  
  // Wrap the content in our layout
  return (
    <PublicLayout>
      {renderContent()}
    </PublicLayout>
  );
}