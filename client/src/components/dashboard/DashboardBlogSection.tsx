import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Tag,
  User,
  ArrowLeft,
  Loader2,
  Search,
  Clock,
  Filter,
  Grid3X3,
  List,
  ArrowRight,
  Share2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface BrandingSettings {
  company_color?: string;
  company_name?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
}

interface DashboardBlogSectionProps {
  onNavigateBack: () => void;
}

export default function DashboardBlogSection({ onNavigateBack }: DashboardBlogSectionProps) {
  const [location, setLocation] = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'grid' | 'list'>('grid');
  const [currentPost, setCurrentPost] = useState<BlogPost | null>(null);

  // Fetch branding settings
  const { data: branding = {} as BrandingSettings } = useQuery<BrandingSettings>({
    queryKey: ["/api/settings/branding"],
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Generate brand colors
  const brandColors = getBrandColors({
    primaryColor: branding.primary_color || branding.company_color,
    secondaryColor: branding.secondary_color,
    accentColor: branding.accent_color
  });

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
    }
  };

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to page 1 when search changes
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

  // Handle post selection
  const handlePostSelect = (post: BlogPost) => {
    setCurrentPost(post);
  };

  // Handle back to blog list
  const handleBackToBlogList = () => {
    setCurrentPost(null);
  };

  if (isLoadingPosts) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 
          className="h-8 w-8 animate-spin" 
          style={{ color: brandColors.primary.full }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            onClick={onNavigateBack}
            className="mr-4 p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">
              {currentPost ? currentPost.title : "Company Blog"}
            </h1>
            <p className="text-gray-500 mt-1">
              {currentPost ? "Blog Post" : "Latest updates and insights"}
            </p>
          </div>
        </div>
        {currentPost && (
          <Button 
            variant="outline" 
            onClick={handleBackToBlogList}
            className="mt-4 md:mt-0"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Blog
          </Button>
        )}
      </div>

      {/* Content */}
      {currentPost ? (
        // Single post view
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {currentPost.featuredImageUrl && (
            <div className="w-full h-[300px] overflow-hidden">
              <img
                src={currentPost.featuredImageUrl}
                alt={currentPost.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-6">
            {/* Category badge */}
            {currentPost.categoryName && (
              <div className="mb-4">
                <Badge
                  variant="outline"
                  className="rounded-full text-xs font-medium py-1 px-3"
                  style={{
                    backgroundColor: brandColors.primary.extraLight,
                    color: brandColors.primary.dark,
                    borderColor: 'transparent'
                  }}
                >
                  {currentPost.categoryName}
                </Badge>
              </div>
            )}

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-6">
              {/* Author */}
              {currentPost.author && (
                <div className="flex items-center">
                  <div className="w-6 h-6 rounded-full bg-gray-200 mr-2 flex items-center justify-center"
                       style={{ backgroundColor: brandColors.primary.extraLight }}>
                    <User className="h-3 w-3" style={{ color: brandColors.primary.full }} />
                  </div>
                  <span>{currentPost.author}</span>
                </div>
              )}

              {/* Date */}
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2"
                          style={{ color: brandColors.secondary.medium }} />
                <span>{formatDate(currentPost.date)}</span>
              </div>

              {/* Reading time */}
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                <span>{getReadingTime(currentPost.content)} min read</span>
              </div>
            </div>

            {/* Excerpt */}
            {currentPost.excerpt && (
              <div
                className="bg-gray-50 p-4 rounded-lg mb-6 text-base italic border-l-4 text-gray-700"
                style={{ borderColor: brandColors.primary.full }}
              >
                {currentPost.excerpt}
              </div>
            )}

            {/* Main content */}
            <div className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-primary prose-a:font-medium">
              <ReactMarkdown>{currentPost.content}</ReactMarkdown>
            </div>

            {/* Tags */}
            {formatTags(currentPost.tags).length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center mr-2">
                    <Tag className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-gray-500 font-medium">Tags:</span>
                  </div>
                  {formatTags(currentPost.tags).map((tag, index) => (
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
                        handleBackToBlogList();
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
      ) : (
        // Blog list view
        <div className="space-y-6">
          {/* Search and filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search blog posts..."
                value={searchQuery}
                onChange={handleSearch}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              {/* Category filter */}
              {categoriesData.length > 0 && (
                <select
                  value={selectedCategory || ''}
                  onChange={(e) => handleCategorySelect(e.target.value || null)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">All Categories</option>
                  {categoriesData.map(category => (
                    <option key={category.id} value={category.id.toString()}>
                      {category.name}
                    </option>
                  ))}
                </select>
              )}
              <Button
                variant={selectedView === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedView('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={selectedView === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedView('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Blog posts grid */}
          {paginatedPosts.length > 0 ? (
            <div className={`grid gap-6 ${selectedView === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
              {paginatedPosts.map(post => (
                <Card
                  key={post.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handlePostSelect(post)}
                >
                  {post.featuredImageUrl && (
                    <div className="h-48 overflow-hidden rounded-t-lg">
                      <img
                        src={post.featuredImageUrl}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="line-clamp-2 text-lg">{post.title}</CardTitle>
                        <CardDescription className="line-clamp-3 mt-2">{post.snippet}</CardDescription>
                      </div>
                    </div>
                    {post.categoryName && (
                      <Badge
                        variant="outline"
                        className="w-fit text-xs"
                        style={{
                          backgroundColor: brandColors.primary.extraLight,
                          color: brandColors.primary.dark,
                          borderColor: 'transparent'
                        }}
                      >
                        {post.categoryName}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardFooter className="flex justify-between items-center">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(post.date)}
                    </div>
                    <Button variant="ghost" size="sm">
                      Read More <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                {searchQuery || selectedCategory ? 'No blog posts found matching your criteria.' : 'No blog posts available.'}
              </div>
              {(searchQuery || selectedCategory) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory(null);
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
