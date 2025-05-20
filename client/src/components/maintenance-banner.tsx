import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MaintenanceBannerProps {
  message?: string;
  estimatedCompletion?: string;
}

export function MaintenanceBanner({ 
  message = 'System is currently under maintenance.',
  estimatedCompletion
}: MaintenanceBannerProps) {
  return (
    <div className="w-full bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
      <div className="container px-4 py-3 mx-auto flex flex-wrap items-center justify-between">
        <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div>
            <span className="font-medium mr-2">
              Maintenance Alert:
            </span>
            <span>
              {message}
            </span>
            {estimatedCompletion && (
              <span className="text-sm ml-2">
                (Est. completion: {estimatedCompletion})
              </span>
            )}
          </div>
        </div>
        
        <div className="mt-2 sm:mt-0 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
            onClick={() => window.location.href = '/status'}
          >
            More Info
          </Button>
        </div>
      </div>
    </div>
  );
}