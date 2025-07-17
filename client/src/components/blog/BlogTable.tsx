import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getBrandColors } from '@/lib/brand-theme';
import { Calendar, Clock, BookOpen, ExternalLink } from 'lucide-react';

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

interface BlogTableProps {
  posts: BlogPost[];
  brandColors: ReturnType<typeof getBrandColors>;
  selectedView: 'grid' | 'list';
  formatDate: (date: string | Date) => string;
  getReadingTime: (content: string) => number;
  onPostClick: (slug: string) => void;
}

export function BlogTable({ 
  posts, 
  brandColors, 
  selectedView, 
  formatDate, 
  getReadingTime, 
  onPostClick 
}: BlogTableProps) {
  
  return (
    <div className="w-full">
      {/* Desktop Table View */}
      <div className="hidden md:block border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: brandColors.primary.extraLight }}>
              <th className="text-left py-3 px-4 font-medium" style={{ color: brandColors.primary.dark }}>
                Post
              </th>
              <th className="text-left py-3 px-4 font-medium" style={{ color: brandColors.primary.dark }}>
                Category
              </th>
              <th className="text-left py-3 px-4 font-medium" style={{ color: brandColors.primary.dark }}>
                Published
              </th>
              <th className="text-left py-3 px-4 font-medium" style={{ color: brandColors.primary.dark }}>
                Read Time
              </th>
              <th className="text-left py-3 px-4 font-medium" style={{ color: brandColors.primary.dark }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post, index) => (
              <tr 
                key={post.id}
                className={`hover:bg-gray-50 transition-colors ${index === posts.length - 1 ? '' : 'border-b border-gray-100'}`}
              >
                {/* Post (Image + Title + Snippet) */}
                <td className="py-4 px-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {post.featuredImageUrl ? (
                        <img
                          src={post.featuredImageUrl}
                          alt={post.title}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div 
                          className="w-16 h-16 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: brandColors.primary.extraLight }}
                        >
                          <BookOpen 
                            className="h-6 w-6" 
                            style={{ color: brandColors.primary.full }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {post.snippet}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Category */}
                <td className="py-4 px-4">
                  {post.categoryName ? (
                    <Badge 
                      className="text-xs"
                      style={{
                        backgroundColor: brandColors.primary.extraLight,
                        color: brandColors.primary.full,
                      }}
                    >
                      {post.categoryName}
                    </Badge>
                  ) : (
                    <span className="text-sm text-gray-400">Uncategorized</span>
                  )}
                </td>

                {/* Published Date */}
                <td className="py-4 px-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>{formatDate(post.date)}</span>
                  </div>
                </td>

                {/* Read Time */}
                <td className="py-4 px-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>{getReadingTime(post.content)} min</span>
                  </div>
                </td>

                {/* Action */}
                <td className="py-4 px-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPostClick(post.slug)}
                    className="flex items-center gap-2 hover:!text-current hover:!border-current"
                    style={{ 
                      borderColor: brandColors.primary.light,
                      color: brandColors.primary.full
                    }}
                  >
                    <span>Read</span>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile View - preserving original grid/list functionality */}
      <div className="md:hidden">
        {selectedView === 'grid' ? (
          <div className="grid grid-cols-1 gap-6">
            {posts.map(post => (
              <div 
                key={post.id}
                className="group cursor-pointer flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all h-full"
                onClick={() => onPostClick(post.slug)}
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
                  
                  <h3 className="font-bold text-lg mb-3 transition-colors line-clamp-2"
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
          <div className="space-y-6">
            {posts.map(post => (
              <div 
                key={post.id}
                className="group cursor-pointer flex bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all"
                onClick={() => onPostClick(post.slug)}
              >
                {post.featuredImageUrl ? (
                  <div className="w-1/4 h-auto overflow-hidden">
                    <img
                      src={post.featuredImageUrl}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div 
                    className="w-1/4 h-auto flex items-center justify-center bg-gradient-to-r from-primary-50 to-gray-50"
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
                
                <div className="p-6 w-3/4">
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
                  
                  <h3 className="font-bold text-lg mb-2 transition-colors line-clamp-2"
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
        )}
      </div>
    </div>
  );
}