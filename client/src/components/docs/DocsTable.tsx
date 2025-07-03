import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getBrandColors } from '@/lib/brand-theme';
import { Clock, BookOpen, ExternalLink } from 'lucide-react';

interface DocCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  displayOrder: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface Doc {
  id: number;
  title: string;
  slug: string;
  content: string;
  category?: string;
  categoryId?: number | null;
  displayOrder: number;
  published: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface DocsTableProps {
  docs: Doc[];
  categoriesData: DocCategory[];
  brandColors: ReturnType<typeof getBrandColors>;
  onDocClick: (slug: string) => void;
}

export function DocsTable({ docs, categoriesData, brandColors, onDocClick }: DocsTableProps) {
  
  return (
    <div className="w-full">
      {/* Desktop Table View */}
      <div className="hidden md:block border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: brandColors.primary.extraLight }}>
              <th className="text-left py-3 px-4 font-medium" style={{ color: brandColors.primary.dark }}>
                Document
              </th>
              <th className="text-left py-3 px-4 font-medium" style={{ color: brandColors.primary.dark }}>
                Category
              </th>
              <th className="text-left py-3 px-4 font-medium" style={{ color: brandColors.primary.dark }}>
                Last Updated
              </th>
              <th className="text-left py-3 px-4 font-medium" style={{ color: brandColors.primary.dark }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {docs.map((doc, index) => (
              <tr 
                key={doc.id}
                className={`hover:bg-gray-50 transition-colors ${index === docs.length - 1 ? '' : 'border-b border-gray-100'}`}
              >
                {/* Document (Icon + Title + Content Preview) */}
                <td className="py-4 px-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: brandColors.primary.extraLight }}
                      >
                        <BookOpen 
                          className="h-6 w-6" 
                          style={{ color: brandColors.primary.full }}
                        />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                        {doc.title}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {doc.content.replace(/[#*`]/g, '').substring(0, 100)}...
                      </p>
                    </div>
                  </div>
                </td>

                {/* Category */}
                <td className="py-4 px-4">
                  {doc.categoryId ? (
                    <Badge 
                      variant="outline"
                      className="text-xs"
                      style={{
                        borderColor: brandColors.secondary.lighter,
                        color: brandColors.secondary.full
                      }}
                    >
                      {categoriesData.find(c => c.id === doc.categoryId)?.name || 'Unknown'}
                    </Badge>
                  ) : (
                    <span className="text-sm text-gray-400">Uncategorized</span>
                  )}
                </td>

                {/* Last Updated */}
                <td className="py-4 px-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                  </div>
                </td>

                {/* Action */}
                <td className="py-4 px-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDocClick(doc.slug)}
                    className="flex items-center gap-2 hover:!text-current hover:!border-current"
                    style={{ 
                      borderColor: brandColors.primary.light,
                      color: brandColors.primary.full
                    }}
                  >
                    <span>View</span>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile View - preserving original card functionality */}
      <div className="md:hidden grid gap-6 grid-cols-1">
        {docs.map(doc => (
          <div 
            key={doc.id}
            className="h-full flex flex-col transition-all duration-300 hover:shadow-md cursor-pointer bg-white rounded-lg border border-gray-200 overflow-hidden"
            onClick={() => onDocClick(doc.slug)}
            onMouseOver={(e) => e.currentTarget.style.borderColor = brandColors.primary.light}
            onMouseOut={(e) => e.currentTarget.style.borderColor = 'rgb(229, 231, 235)'}
          >
            <div className="p-4 pb-3">
              <div className="line-clamp-2 text-lg font-semibold group flex items-start">
                <BookOpen 
                  className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" 
                  style={{ color: brandColors.primary.full }}
                />
                <span className="flex-1">{doc.title}</span>
                <ExternalLink className="h-4 w-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>
            </div>
            <div className="px-4 py-0 flex-grow">
              <div className="line-clamp-3 text-sm text-gray-600">
                {doc.content.replace(/[#*`]/g, '').substring(0, 150)}...
              </div>
            </div>
            <div className="p-4 pt-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
              <div className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                <span>
                  {new Date(doc.updatedAt).toLocaleDateString()}
                </span>
              </div>
              
              {doc.categoryId && (
                <Badge 
                  variant="outline" 
                  className="text-xs"
                  style={{
                    borderColor: brandColors.secondary.lighter,
                    color: brandColors.secondary.full
                  }}
                >
                  {categoriesData.find(c => c.id === doc.categoryId)?.name || 'Unknown'}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 