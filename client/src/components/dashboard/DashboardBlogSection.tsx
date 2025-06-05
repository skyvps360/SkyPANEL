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
  BookOpen,
  Eye,
  MessageCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
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
  company_name?: string;
  company_color?: string;
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
  const { data: branding = { company_name: "SkyVPS360" } } = useQuery<BrandingSettings>({
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
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Modern Hero Header */}
      <div className="rounded-2xl bg-card border border-border shadow-md">
        <div className="p-8 md:p-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary text-primary-foreground shadow-lg">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                    {currentPost ? currentPost.title : `${branding.company_name}'s Blog`}
                  </h1>
                  <p className="text-muted-foreground text-lg mt-1">
                    {currentPost ? "Blog Post" : "Latest updates and insights"}
                  </p>
                </div>
              </div>
            </div>
            {currentPost && (
              <div className="mt-6 lg:mt-0">
                <Button
                  variant="outline"
                  onClick={handleBackToBlogList}
                  className="hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Blog
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {currentPost ? (
        // Single post view with modern dashboard styling
        <div className="max-w-4xl mx-auto">
          <Card className="bg-card border border-border shadow-sm overflow-hidden">
            {currentPost.featuredImageUrl && (
              <div className="w-full h-[300px] overflow-hidden">
                <img
                  src={currentPost.featuredImageUrl}
                  alt={currentPost.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <CardHeader className="border-b border-border px-8 py-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-3xl font-bold text-foreground leading-tight mb-4">
                      {currentPost.title}
                    </CardTitle>
                    {/* Category badge */}
                    {currentPost.categoryName && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 mb-4">
                        {currentPost.categoryName}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Meta info */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {/* Author */}
                  {currentPost.author && (
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <span>{currentPost.author}</span>
                    </div>
                  )}

                  {/* Date */}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(currentPost.date)}</span>
                  </div>

                  {/* Reading time */}
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{getReadingTime(currentPost.content)} min read</span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="px-8 py-6">
              {/* Excerpt */}
              {currentPost.excerpt && (
                <div className="bg-muted/50 p-4 rounded-xl mb-6 text-base italic border-l-4 border-primary text-muted-foreground">
                  {currentPost.excerpt}
                </div>
              )}

              {/* Main content */}
              <div className="prose prose-lg max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-a:text-primary hover:prose-a:text-primary/80">
                <ReactMarkdown>{currentPost.content}</ReactMarkdown>
              </div>
            </CardContent>

            {/* Tags Footer */}
            {formatTags(currentPost.tags).length > 0 && (
              <CardFooter className="border-t border-border px-8 py-6">
                <div className="flex flex-wrap items-center gap-2 w-full">
                  <div className="flex items-center gap-2 mr-4">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground font-medium">Tags:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formatTags(currentPost.tags).map((tag, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="text-sm font-normal py-1 px-3 rounded-full cursor-pointer transition-colors hover:bg-primary hover:text-primary-foreground border-border"
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
              </CardFooter>
            )}
          </Card>
        </div>
      ) : (
        // Blog list view with modern dashboard styling
        <div className="space-y-8">
          {/* Search and filters card */}
          <Card className="bg-card border border-border shadow-sm">
            <CardHeader className="border-b border-border px-6 py-4">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Search & Filter</h3>
              </div>
            </CardHeader>
            <CardContent className="p-6">
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
                      className="px-3 py-2 border border-border rounded-md text-sm bg-background text-foreground"
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
                    className="hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={selectedView === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedView('list')}
                    className="hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Blog posts grid */}
          {paginatedPosts.length > 0 ? (
            <div className={`grid gap-6 ${selectedView === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
              {paginatedPosts.map(post => (
                <Card
                  key={post.id}
                  className="group cursor-pointer bg-card border border-border shadow-sm hover:shadow-xl hover:border-border/80 transition-all duration-300"
                  onClick={() => handlePostSelect(post)}
                >
                  {post.featuredImageUrl && (
                    <div className="h-48 overflow-hidden rounded-t-xl">
                      <img
                        src={post.featuredImageUrl}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="line-clamp-2 text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                          {post.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-3 mt-2 text-muted-foreground">
                          {post.snippet}
                        </CardDescription>
                      </div>
                    </div>
                    {post.categoryName && (
                      <Badge variant="secondary" className="w-fit text-xs bg-primary/10 text-primary hover:bg-primary/20 mt-3">
                        {post.categoryName}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardFooter className="flex justify-between items-center pt-0">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(post.date)}
                    </div>
                    <Button variant="ghost" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200">
                      Read More <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-card border border-border shadow-sm">
              <CardContent className="text-center py-12">
                <div className="flex flex-col items-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
                    <BookOpen className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {searchQuery || selectedCategory ? 'No blog posts found' : 'No blog posts available'}
                    </h3>
                    <p className="text-muted-foreground">
                      {searchQuery || selectedCategory
                        ? 'Try adjusting your search criteria or filters.'
                        : 'Check back later for new content.'}
                    </p>
                  </div>
                  {(searchQuery || selectedCategory) && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory(null);
                      }}
                      className="hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Enhanced Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <div className="flex items-center gap-2 bg-card rounded-xl border border-border shadow-sm p-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="disabled:opacity-50 hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-4">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="disabled:opacity-50 hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
