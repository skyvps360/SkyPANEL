import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Tag,
  User,
  Folder,
  ArrowLeft,
  Loader2,
  Search,
  MenuSquare,
  Clock,
  BookOpen,
  MessageCircle,
  Share2,
  Filter,
  Grid3X3,
  List,
  ExternalLink,
  ArrowRight,
  View,
  ThumbsUp,
  Send,
  AlertTriangle,
  PenTool,
  Info,
  Settings,
  Lock,
  PenLine,
  Check
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getBrandColors } from "@/lib/brand-theme";

// Define the BlogCategory type
interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  displayOrder: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// Define the BlogPost type
interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  snippet: string;
  excerpt?: string | null;
  featuredImageUrl?: string | null;
  author?: string | null;
  date: Date | string;
  categoryId?: number | null;
  categoryName?: string | null;
  tags?: string | null;
  displayOrder: number;
  published: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export default function BlogPage() {
  const [location, setLocation] = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'grid' | 'list'>('grid');
  
  // Define types for our settings
  interface BrandingSettings {
    company_color?: string;
    company_name?: string;
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
  }
  
  interface PublicSettings {
    company_name?: string;
  }
  
  // Fetch branding settings
  const { data: branding = {} as BrandingSettings } = useQuery<BrandingSettings>({
    queryKey: ["/api/settings/branding"],
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Fetch public settings for company name
  const { data: publicSettings = {} as PublicSettings } = useQuery<PublicSettings>({
    queryKey: ["/api/settings/public"],
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  const companyName = publicSettings.company_name || branding.company_name || "Company";
  
  // Generate brand colors - using ONLY company brand colors without fallbacks
  const brandColors = getBrandColors({
    primaryColor: branding.primary_color || branding.company_color,
    secondaryColor: branding.secondary_color,
    accentColor: branding.accent_color
  });
  
  // Check if the URL has a slug parameter for a specific post
  const match = location.match(/\/blog\/(.+)/);
  const slug = match ? match[1] : null;
  
  // Fetch all blog categories
  const { data: categoriesData = [], isLoading: isLoadingCategories } = useQuery<BlogCategory[]>({
    queryKey: ["/api/public/blog-categories"],
  });
  
  // Fetch all blog posts - with category filter if selected
  const { data: allPosts = [], isLoading: isLoadingPosts } = useQuery<BlogPost[]>({
    queryKey: ["/api/public/blog", selectedCategory],
    queryFn: async ({ queryKey }) => {
      const categoryId = queryKey[1] as string | null;
      let url = "/api/public/blog";
      
      if (categoryId) {
        url = `/api/public/blog/category/${categoryId}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch blog posts");
      }
      return response.json();
    },
  });
  
  // Ensure allPosts is always an array
  const publishedPosts = Array.isArray(allPosts) 
    ? allPosts.filter(post => post.published) 
    : [];
  
  // Filter posts by search query
  const filteredPosts = searchQuery
    ? publishedPosts.filter(post =>
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.snippet.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (post.content && post.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (post.categoryName && post.categoryName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (post.tags && post.tags.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : publishedPosts;
  
  // Pagination
  const postsPerPage = 6;
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * postsPerPage,
    currentPage * postsPerPage
  );
  
  // Get the current post if we're viewing a specific one
  const currentPost = slug
    ? publishedPosts.find(post => post.slug === slug)
    : null;
  
  // Get featured post (most recent)
  const featuredPost = publishedPosts.length > 0 ? publishedPosts[0] : null;
  
  // Get estimated reading time for a post
  const getReadingTime = (content: string): number => {
    const wordsPerMinute = 200;
    const words = content.trim().split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  };
  
  // Handle pagination
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo(0, 0);
    }
  };
  
  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to page 1 when search changes
  };
  
  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
  };
  
  // Handle category filter
  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    setCurrentPage(1); // Reset to page 1 when filter changes
  };
  
  // Format tags for display
  const formatTags = (tags: string | null | undefined) => {
    if (!tags) return [];
    return tags.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0);
  };
  
  // Reset current page when search query or category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);
  
  // Function to format date
  const formatDate = (date: string | Date) => {
    return format(new Date(date), "MMM d, yyyy");
  };
  
  // Create the content for inside the layout
  const renderContent = () => {
    // If we're viewing a specific post
    if (slug) {
      if (isLoadingPosts) {
        return (
          <div className="container mx-auto py-12 flex justify-center items-center min-h-[60vh]">
            <Loader2 
              className="h-8 w-8 animate-spin" 
              style={{ color: brandColors.primary.full }}
            />
          </div>
        );
      }
      
      if (!currentPost) {
        return (
          <div className="container mx-auto py-12">
            <div className="flex items-center mb-8">
              <Button 
                variant="outline" 
                onClick={() => setLocation("/blog")} 
                className="mr-2 hover:bg-opacity-20 transition-all"
                style={{ 
                  borderColor: brandColors.primary.light,
                  color: brandColors.primary.full
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = brandColors.primary.extraLight;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '';
                }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Blog
              </Button>
            </div>
            <Card className="mb-8 shadow-md border-none overflow-hidden">
              <div className="bg-gray-50 p-12 text-center">
                <h1 className="text-3xl font-bold mb-4">Blog Post Not Found</h1>
                <p className="text-gray-600 mb-8 max-w-lg mx-auto">
                  The blog post you're looking for does not exist or may have been removed.
                </p>
                <Button 
                  onClick={() => setLocation("/blog")} 
                  className="px-8 py-6 rounded-full font-medium"
                  style={{ backgroundColor: brandColors.primary.full, color: 'white' }}
                >
                  View All Blog Posts
                </Button>
              </div>
            </Card>
          </div>
        );
      }
      
      // Parse tags
      const tags = formatTags(currentPost.tags);
      const readingTime = getReadingTime(currentPost.content);
      
      // Find related posts (same category or with shared tags)
      const relatedPosts = publishedPosts
        .filter(post => 
          post.id !== currentPost.id && (
            post.categoryId === currentPost.categoryId ||
            (post.tags && currentPost.tags && 
              formatTags(post.tags).some(tag => 
                formatTags(currentPost.tags).includes(tag)
              )
            )
          )
        )
        .slice(0, 3);
      
      return (
        <div className="container mx-auto py-12">
          {/* Breadcrumb navigation */}
          <div className="flex items-center mb-8 text-sm text-gray-500 flex-wrap">
            <Button 
              variant="link" 
              className="p-0 h-auto text-gray-500 hover:text-gray-700 mr-2"
              onClick={() => setLocation('/blog')}
              style={{ color: 'inherit' }}
              onMouseOver={(e) => {
                e.currentTarget.style.color = brandColors.primary.full;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.color = '';
              }}
            >
              Blog
            </Button>
            <ChevronRight className="h-4 w-4 mx-1 text-gray-300" />
            
            {currentPost.categoryName && (
              <>
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-gray-500 hover:text-gray-700 mr-2"
                  onClick={() => {
                    if (currentPost.categoryId) {
                      handleCategorySelect(currentPost.categoryId.toString());
                      setLocation("/blog");
                    }
                  }}
                  style={{ color: 'inherit' }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.color = brandColors.primary.full;
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.color = '';
                  }}
                >
                  {currentPost.categoryName}
                </Button>
                <ChevronRight className="h-4 w-4 mx-1 text-gray-300" />
              </>
            )}
            
            <span className="text-gray-700 font-medium truncate">{currentPost.title}</span>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main content area */}
            <div className="lg:col-span-8">
              <article className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                {currentPost.featuredImageUrl && (
                  <div className="w-full h-[400px] overflow-hidden">
                    <img
                      src={currentPost.featuredImageUrl}
                      alt={currentPost.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div className="p-8 md:p-12">
                  {/* Category badge */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {currentPost.categoryName && (
                      <Badge 
                        variant="outline"
                        className="rounded-full text-xs font-medium py-1 px-3"
                        style={{
                          backgroundColor: brandColors.primary.extraLight,
                          color: brandColors.primary.dark,
                          borderColor: 'transparent'
                        }}
                        onClick={() => {
                          if (currentPost.categoryId) {
                            handleCategorySelect(currentPost.categoryId.toString());
                            setLocation("/blog");
                          }
                        }}
                      >
                        {currentPost.categoryName}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Title */}
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight"
                      style={{ color: brandColors.primary.dark }}>
                    {currentPost.title}
                  </h1>
                  
                  {/* Meta info */}
                  <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 mb-8">
                    {/* Author */}
                    {currentPost.author && (
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-gray-200 mr-2 flex items-center justify-center"
                             style={{ backgroundColor: brandColors.primary.extraLight }}>
                          <User className="h-4 w-4" style={{ color: brandColors.primary.full }} />
                        </div>
                        <span>{currentPost.author}</span>
                      </div>
                    )}
                    
                    {/* Date */}
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" 
                                style={{ color: brandColors.secondary.medium }} />
                      <span>
                        {formatDate(currentPost.date)}
                      </span>
                    </div>
                    
                    {/* Reading time */}
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>{readingTime} min read</span>
                    </div>
                    

                  </div>
                  
                  {/* If there's an excerpt, display it as a callout */}
                  {currentPost.excerpt && (
                    <div 
                      className="bg-gray-50 p-6 rounded-lg mb-8 text-lg italic border-l-4 text-gray-700"
                      style={{ borderColor: brandColors.primary.full }}
                    >
                      {currentPost.excerpt}
                    </div>
                  )}
                  
                  {/* Main content */}
                  <div className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-primary prose-a:font-medium">
                    <ReactMarkdown>{currentPost.content}</ReactMarkdown>
                  </div>
                  
                  {/* Tags at the bottom */}
                  {tags.length > 0 && (
                    <div className="mt-12 pt-6 border-t border-gray-100">
                      <div className="flex flex-wrap gap-2">
                        <div className="flex items-center mr-2">
                          <Tag className="h-4 w-4 text-gray-500 mr-2" />
                          <span className="text-gray-500 font-medium">Tags:</span>
                        </div>
                        {tags.map((tag, index) => (
                          <Badge 
                            key={index}
                            variant="outline"
                            className="text-sm font-normal py-1 px-3 rounded-full cursor-pointer transition-colors"
                            style={{
                              backgroundColor: brandColors.secondary.extraLight,
                              color: brandColors.secondary.dark,
                              borderColor: 'transparent'
                            }}
                            onClick={() => {
                              setSearchQuery(tag);
                              setLocation("/blog");
                            }}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Share button */}
                  <div className="flex items-center mt-8 pt-6 border-t border-gray-100 text-gray-500">
                    <ShareButton 
                      url={`${window.location.origin}/blog/${currentPost.slug}`}
                      title={currentPost.title}
                      summary={currentPost.snippet}
                      brandColors={brandColors}
                    />
                  </div>
                </div>
              </article>
              
              {/* Related posts */}
              {publishedPosts.length > 1 && (
                <div className="mt-12">
                  <h3 className="text-xl font-bold mb-6">Related Posts</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {publishedPosts
                      .filter(post => post.id !== currentPost.id)
                      .slice(0, 2)
                      .map(post => (
                        <div 
                          key={post.id}
                          className="group cursor-pointer flex flex-col bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-all"
                          onClick={() => setLocation(`/blog/${post.slug}`)}
                        >
                          {post.featuredImageUrl && (
                            <div className="h-48 overflow-hidden">
                              <img
                                src={post.featuredImageUrl}
                                alt={post.title}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              />
                            </div>
                          )}
                          <div className="p-5 flex-grow flex flex-col">
                            <h4 className="font-bold mb-2 group-hover:text-primary transition-colors">
                              {post.title}
                            </h4>
                            <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-grow">
                              {post.snippet}
                            </p>
                            <div className="flex items-center text-xs text-gray-500">
                              <Calendar className="h-3 w-3 mr-1" />
                              <span>{formatDate(post.date)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Sidebar */}
            <div className="lg:col-span-4">
              <div className="sticky top-24">
                {/* Author bio (if present) */}
                {currentPost.author && (
                  <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-100">
                    <h3 className="font-bold mb-4">About the Author</h3>
                    <div className="flex items-center">
                      <div className="w-12 h-12 rounded-full bg-gray-200 mr-4 flex items-center justify-center">
                        <User className="h-6 w-6 text-gray-500" />
                      </div>
                      <div>
                        <div className="font-bold">{currentPost.author}</div>
                        <div className="text-sm text-gray-500">Contributing Writer</div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Categories */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-100">
                  <h3 className="font-bold mb-4">Categories</h3>
                  <ul className="space-y-2">
                    {categoriesData.map(category => (
                      <li key={category.id}>
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start text-left py-2 hover:bg-transparent"
                          style={{ color: 'inherit' }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.color = brandColors.primary.full;
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.color = 'inherit';
                          }}
                          onClick={() => {
                            handleCategorySelect(category.id.toString());
                            setLocation("/blog");
                          }}
                        >
                          <Folder className="h-4 w-4 mr-2" />
                          {category.name}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Recent posts */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-100">
                  <h3 className="font-bold mb-4">Recent Posts</h3>
                  <ul className="space-y-4 divide-y divide-gray-100">
                    {publishedPosts.slice(0, 5).map(post => (
                      <li key={post.id} className={post.id === currentPost.id ? "pt-4" : "pt-4 first:pt-0"}>
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start text-left p-0 h-auto hover:bg-transparent"
                          style={{ 
                            color: post.id === currentPost.id ? brandColors.primary.full : 'inherit',
                            fontWeight: post.id === currentPost.id ? 'bold' : 'normal'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.color = brandColors.primary.full;
                          }}
                          onMouseOut={(e) => {
                            if (post.id !== currentPost.id) {
                              e.currentTarget.style.color = 'inherit';
                            }
                          }}
                          onClick={() => setLocation(`/blog/${post.slug}`)}
                        >
                          <div className="flex items-start">
                            {post.featuredImageUrl && (
                              <div className="w-12 h-12 rounded overflow-hidden mr-3 flex-shrink-0">
                                <img 
                                  src={post.featuredImageUrl} 
                                  alt={post.title} 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div>
                              <div className="line-clamp-2 text-sm leading-snug mb-1">
                                {post.title}
                              </div>
                              <div className="text-xs text-gray-500 flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formatDate(post.date)}
                              </div>
                            </div>
                          </div>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Tags cloud */}
                {publishedPosts.some(post => post.tags) && (
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h3 className="font-bold mb-4">Popular Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set(
                        publishedPosts
                          .flatMap(post => formatTags(post.tags))
                          .filter(Boolean)
                      )).map((tag, index) => (
                        <Badge 
                          key={index}
                          variant="outline"
                          className="text-sm font-normal py-1 px-3 rounded-full cursor-pointer transition-colors"
                          style={{
                            backgroundColor: brandColors.secondary.extraLight,
                            color: brandColors.secondary.dark,
                            borderColor: 'transparent'
                          }}
                          onClick={() => {
                            setSearchQuery(tag);
                            setLocation("/blog");
                          }}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // Blog list view
    return (
      <div className="w-full">
        {/* Hero section with colored background - matching docs and status pages */}
        <div style={{ backgroundColor: brandColors.primary.full }} className="relative overflow-hidden w-full">
          {/* Decorative bubbles in the background, matching docs and status pages */}
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
              <div className="flex items-center mb-6">
                <div
                  className="p-3 rounded-full mr-4"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                >
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-white">
                  Blog
                </h1>
              </div>
              <p className="text-white text-lg opacity-90">
                Latest insights, updates and news from {companyName}
              </p>
            </div>
          </div>
        </div>
        
        <div className="max-w-screen-xl mx-auto py-8 px-4 sm:px-6">
          {/* Search bar */}
          <div className="w-full max-w-md mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search blog posts..." 
                value={searchQuery}
                onChange={handleSearch}
                className="pl-10 pr-10 py-6 rounded-full border-gray-200 input-brand-focus"
                style={{
                  borderColor: searchQuery ? brandColors.primary.light : undefined,
                  boxShadow: searchQuery ? `0 0 0 1px ${brandColors.primary.light}` : undefined,
                  "--brand-primary-light": brandColors.primary.light
                }}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0 rounded-full"
                  onClick={clearSearch}
                >
                  &times;
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Featured post at the top (if available and not filtered) */}
        {!selectedCategory && !searchQuery && featuredPost && (
          <div className="max-w-screen-xl mx-auto mb-12 px-4 sm:px-6">
            <div 
              className="group cursor-pointer flex flex-col md:flex-row bg-white rounded-xl shadow-md overflow-hidden"
              onClick={() => setLocation(`/blog/${featuredPost.slug}`)}
            >
              {featuredPost.featuredImageUrl ? (
                <div className="md:w-1/2 h-[300px] md:h-auto overflow-hidden">
                  <img
                    src={featuredPost.featuredImageUrl}
                    alt={featuredPost.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
              ) : (
                <div 
                  className="md:w-1/2 h-[300px] md:h-auto flex items-center justify-center bg-gradient-to-r from-primary-50 to-gray-50"
                  style={{ 
                    backgroundImage: `linear-gradient(to right, ${brandColors.primary.extraLight}, rgba(249, 250, 251, 1))` 
                  }}
                >
                  <BookOpen 
                    className="h-16 w-16" 
                    style={{ color: brandColors.primary.light }}
                  />
                </div>
              )}
              
              <div className="md:w-1/2 p-6 md:p-10 flex flex-col">
                {featuredPost.categoryName && (
                  <Badge 
                    className="rounded-full px-3 py-1 text-xs font-medium mb-4 w-fit"
                    style={{
                      backgroundColor: brandColors.primary.extraLight,
                      color: brandColors.primary.full,
                    }}
                  >
                    {featuredPost.categoryName}
                  </Badge>
                )}
                
                <h2 className="text-2xl md:text-3xl font-bold mb-4 transition-colors" 
                    style={{ color: brandColors.primary.dark }}>
                  {featuredPost.title}
                </h2>
                
                <p className="text-gray-600 mb-6 flex-grow">
                  {featuredPost.snippet}
                </p>
                
                <div className="flex items-center text-sm text-gray-500 mb-4">
                  <Calendar className="h-4 w-4 mr-2" />
                  {formatDate(featuredPost.date)}
                  
                  <div className="mx-2">•</div>
                  
                  <Clock className="h-4 w-4 mr-2" />
                  {getReadingTime(featuredPost.content)} min read
                  
                  {featuredPost.author && (
                    <>
                      <div className="mx-2">•</div>
                      <User className="h-4 w-4 mr-2" />
                      {featuredPost.author}
                    </>
                  )}
                </div>
                
                <Button 
                  variant="outline"
                  className="mt-auto w-fit"
                  style={{ 
                    borderColor: brandColors.primary.light,
                    color: brandColors.primary.full,
                  }}
                >
                  Read Article
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Filter bar and view controls */}
        <div className="max-w-screen-xl mx-auto mb-8 px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            {/* Category filter */}
            <div className="flex flex-wrap gap-2">
              <Badge 
                variant={!selectedCategory ? "default" : "outline"}
                className="px-4 py-2 text-sm font-medium rounded-full cursor-pointer transition-colors"
                style={!selectedCategory 
                  ? { backgroundColor: brandColors.primary.full, color: 'white' }
                  : { 
                      borderColor: brandColors.primary.lighter,
                      color: 'inherit',
                      backgroundColor: 'white' 
                    }
                }
                onClick={() => handleCategorySelect(null)}
              >
                All Posts
              </Badge>
              
              {categoriesData.map(category => (
                <Badge 
                  key={category.id}
                  variant={selectedCategory === category.id.toString() ? "default" : "outline"}
                  className="px-4 py-2 text-sm font-medium rounded-full cursor-pointer transition-colors"
                  style={selectedCategory === category.id.toString() 
                    ? { backgroundColor: brandColors.primary.full, color: 'white' }
                    : { 
                        borderColor: brandColors.primary.lighter,
                        color: 'inherit',
                        backgroundColor: 'white' 
                      }
                  }
                  onClick={() => handleCategorySelect(category.id.toString())}
                >
                  {category.name}
                </Badge>
              ))}
            </div>
            
            {/* View controls */}
            <div className="flex items-center">
              <Button
                variant="outline"
                size="sm"
                className="mr-2"
                style={{ 
                  borderColor: brandColors.primary.light,
                  color: brandColors.primary.full,
                  backgroundColor: selectedView === 'grid' ? brandColors.primary.extraLight : 'transparent'
                }}
                onClick={() => setSelectedView('grid')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
              </Button>
              <Button
                variant="outline"
                size="sm"
                style={{ 
                  borderColor: brandColors.primary.light,
                  color: brandColors.primary.full,
                  backgroundColor: selectedView === 'list' ? brandColors.primary.extraLight : 'transparent'
                }}
                onClick={() => setSelectedView('list')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line>
                  <line x1="3" y1="12" x2="3.01" y2="12"></line>
                  <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Filter information banner */}
        {(selectedCategory || searchQuery) && filteredPosts.length > 0 && (
          <div className="max-w-screen-xl mx-auto mb-8 px-4 sm:px-6">
            <div className="px-6 py-4 rounded-lg" 
              style={{ 
                backgroundColor: brandColors.primary.extraLight,
                borderColor: brandColors.primary.light,
                border: `1px solid ${brandColors.primary.light}`
              }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Filter className="h-4 w-4 mr-2" style={{ color: brandColors.primary.medium }} />
                  {selectedCategory && (
                    <span className="text-sm" style={{ color: brandColors.primary.dark }}>
                      Category:{" "}
                      <span className="font-medium" style={{ color: brandColors.primary.full }}>
                        {categoriesData.find(c => c.id.toString() === selectedCategory)?.name}
                      </span>
                    </span>
                  )}
                  {searchQuery && (
                    <span className="text-sm" style={{ color: brandColors.primary.dark }}>
                      {selectedCategory && " • "}
                      Search:{" "}
                      <span className="font-medium" style={{ color: brandColors.primary.full }}>
                        "{searchQuery}"
                      </span>
                    </span>
                  )}
                  <span className="text-sm ml-2" style={{ color: brandColors.primary.dark }}>
                    ({filteredPosts.length} {filteredPosts.length === 1 ? "result" : "results"})
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs"
                  style={{ 
                    borderColor: brandColors.primary.light,
                    color: brandColors.primary.full
                  }}
                  onClick={() => {
                    setSelectedCategory(null);
                    setSearchQuery("");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Blog posts display */}
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
          {isLoadingPosts ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 
                className="h-8 w-8 animate-spin" 
                style={{ color: brandColors.primary.full }}
              />
            </div>
          ) : paginatedPosts.length > 0 ? (
            // Grid or list view based on selection
            selectedView === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {paginatedPosts.map(post => (
                  <div 
                    key={post.id}
                    className="group cursor-pointer flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all h-full"
                    onClick={() => setLocation(`/blog/${post.slug}`)}
                  >
                    {post.featuredImageUrl ? (
                      <div className="h-48 overflow-hidden">
                        <img
                          src={post.featuredImageUrl}
                          alt={post.title}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div 
                        className="h-48 flex items-center justify-center bg-gradient-to-r from-primary-50 to-gray-50"
                        style={{ 
                          backgroundImage: `linear-gradient(to right, ${brandColors.primary.extraLight}, rgba(249, 250, 251, 1))` 
                        }}
                      >
                        <BookOpen 
                          className="h-10 w-10" 
                          style={{ color: brandColors.primary.light }}
                        />
                      </div>
                    )}
                    
                    <div className="p-6 flex flex-col flex-grow">
                      {post.categoryName && (
                        <Badge 
                          className="rounded-full px-2 py-1 text-xs font-medium mb-3 w-fit"
                          style={{
                            backgroundColor: brandColors.primary.extraLight,
                            color: brandColors.primary.full,
                          }}
                        >
                          {post.categoryName}
                        </Badge>
                      )}
                      
                      <h3 className="font-bold text-lg mb-3 transition-colors"
                          style={{ color: brandColors.primary.dark }}>
                        {post.title}
                      </h3>
                      
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-grow">
                        {post.snippet}
                      </p>
                      
                      <div className="flex items-center text-xs text-gray-500 mt-auto">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span>{formatDate(post.date)}</span>
                        
                        <div className="mx-2">•</div>
                        
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{getReadingTime(post.content)} min read</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // List view
              <div className="space-y-6 mb-12">
                {paginatedPosts.map(post => (
                  <div 
                    key={post.id}
                    className="group cursor-pointer flex bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all"
                    onClick={() => setLocation(`/blog/${post.slug}`)}
                  >
                    {post.featuredImageUrl ? (
                      <div className="w-1/4 h-auto overflow-hidden hidden md:block">
                        <img
                          src={post.featuredImageUrl}
                          alt={post.title}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div 
                        className="w-1/4 h-auto flex items-center justify-center bg-gradient-to-r from-primary-50 to-gray-50 hidden md:flex"
                        style={{ 
                          backgroundImage: `linear-gradient(to right, ${brandColors.primary.extraLight}, rgba(249, 250, 251, 1))` 
                        }}
                      >
                        <BookOpen 
                          className="h-10 w-10" 
                          style={{ color: brandColors.primary.light }}
                        />
                      </div>
                    )}
                    
                    <div className="p-6 w-full md:w-3/4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          {post.categoryName && (
                            <Badge 
                              className="rounded-full px-2 py-1 text-xs font-medium mr-3 w-fit"
                              style={{
                                backgroundColor: brandColors.primary.extraLight,
                                color: brandColors.primary.full,
                              }}
                            >
                              {post.categoryName}
                            </Badge>
                          )}
                          
                          <div className="flex items-center text-xs text-gray-500">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span>{formatDate(post.date)}</span>
                            
                            <div className="mx-2">•</div>
                            
                            <Clock className="h-3 w-3 mr-1" />
                            <span>{getReadingTime(post.content)} min read</span>
                          </div>
                        </div>
                      </div>
                      
                      <h3 className="font-bold text-lg mb-2 transition-colors"
                          style={{ color: brandColors.primary.dark }}>
                        {post.title}
                      </h3>
                      
                      <p className="text-gray-600 text-sm line-clamp-2">
                        {post.snippet}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            // No posts found
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MenuSquare 
                className="h-16 w-16 mb-4" 
                style={{ color: brandColors.primary.lighter }}
              />
              <h3 className="text-xl font-semibold mb-2">No Blog Posts Found</h3>
              <p className="text-gray-500 mb-6 max-w-lg mx-auto">
                {searchQuery || selectedCategory
                  ? "No posts match your current filters. Try adjusting your search or category selection."
                  : "There are no blog posts available at the moment. Check back soon for updates!"}
              </p>
              {(searchQuery || selectedCategory) && (
                <Button 
                  onClick={() => {
                    setSelectedCategory(null);
                    setSearchQuery("");
                  }}
                  style={{ 
                    backgroundColor: brandColors.primary.full, 
                    color: 'white',
                    borderRadius: '9999px',
                    padding: '0 1.5rem'
                  }}
                  className="px-6 h-11"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={{ 
                borderColor: brandColors.primary.light,
                color: brandColors.primary.full
              }}
              className="rounded-full w-10 h-10"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            {Array.from({ length: totalPages }).map((_, index) => (
              <Button
                key={index}
                variant={currentPage === index + 1 ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(index + 1)}
                style={currentPage === index + 1 
                  ? { 
                      backgroundColor: brandColors.primary.full, 
                      color: 'white',
                      borderRadius: '9999px',
                      width: '2.5rem',
                      height: '2.5rem',
                    }
                  : { 
                      borderColor: brandColors.primary.light,
                      color: brandColors.primary.full,
                      borderRadius: '9999px',
                      width: '2.5rem',
                      height: '2.5rem',
                    }
                }
                className="rounded-full w-10 h-10"
              >
                {index + 1}
              </Button>
            ))}
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{ 
                borderColor: brandColors.primary.light,
                color: brandColors.primary.full
              }}
              className="rounded-full w-10 h-10"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <PublicLayout>
      {renderContent()}
    </PublicLayout>
  );
}

// ShareButton component
function ShareButton({ 
  url, 
  title, 
  summary, 
  brandColors 
}: { 
  url: string; 
  title: string; 
  summary: string; 
  brandColors: any;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);
  
  // Handle clicking outside of the share dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (shareRef.current && !shareRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  // Reset copied state after 3 seconds
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => {
        setCopied(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [copied]);
  
  // Function to copy URL to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
    });
  };
  
  // Social share URLs
  const shareUrls = {
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    reddit: `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
    email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${summary}\n\n${url}`)}`,
  };
  
  return (
    <div className="relative" ref={shareRef}>
      <Button 
        variant="ghost" 
        className="flex items-center hover:bg-transparent"
        style={{ color: 'inherit' }}
        onMouseOver={(e) => {
          e.currentTarget.style.color = brandColors.primary.full;
        }}
        onMouseOut={(e) => {
          if (!isOpen) {
            e.currentTarget.style.color = '';
          }
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Share2 className="h-4 w-4 mr-2" />
        Share
      </Button>
      
      {isOpen && (
        <div className="absolute left-0 bottom-full mb-2 w-72 bg-white rounded-lg shadow-lg p-4 z-10 border border-gray-100">
          <h4 className="text-sm font-semibold mb-3">Share this article</h4>
          
          <div className="grid grid-cols-5 gap-2 mb-4">
            {/* Twitter/X */}
            <a 
              href={shareUrls.twitter} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="h-5 w-5 text-black" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span className="text-xs mt-1 text-gray-600">Twitter</span>
            </a>
            
            {/* Facebook */}
            <a 
              href={shareUrls.facebook} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span className="text-xs mt-1 text-gray-600">Facebook</span>
            </a>
            
            {/* LinkedIn */}
            <a 
              href={shareUrls.linkedin} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="h-5 w-5 text-blue-700" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              <span className="text-xs mt-1 text-gray-600">LinkedIn</span>
            </a>
            
            {/* Reddit */}
            <a 
              href={shareUrls.reddit} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="h-5 w-5 text-orange-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
              </svg>
              <span className="text-xs mt-1 text-gray-600">Reddit</span>
            </a>
            
            {/* Email */}
            <a 
              href={shareUrls.email}
              className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <span className="text-xs mt-1 text-gray-600">Email</span>
            </a>
          </div>
          
          <div className="flex items-center">
            <Input 
              type="text" 
              value={url} 
              readOnly
              className="text-xs border-gray-200 rounded pr-16"
            />
            <Button 
              variant="ghost" 
              size="sm"
              className="absolute right-5 h-7 text-xs"
              style={{ color: copied ? brandColors.primary.full : 'inherit' }}
              onClick={copyToClipboard}
            >
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}



// Comment functionality completely removed