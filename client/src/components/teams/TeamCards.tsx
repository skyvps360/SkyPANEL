import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getBrandColors } from '@/lib/brand-theme';

interface TeamMember {
  id: number;
  discordUserId: string;
  discordUsername: string;
  displayName?: string;
  discordAvatarUrl?: string;
  role: string;
  aboutMe?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TeamCardsProps {
  teamMembers: TeamMember[];
  brandColors: ReturnType<typeof getBrandColors>;
}

export function TeamCards({ teamMembers, brandColors }: TeamCardsProps) {
  const sortedMembers = [...teamMembers].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
      {sortedMembers.map((member) => (
        <Card 
          key={member.id} 
          className="border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 bg-white"
        >
          {/* Card Header with Brand Color Strip */}
          <div 
            className="h-3 w-full"
            style={{ backgroundColor: brandColors.primary.full }}
          />
          
          <CardContent className="p-6">
            {/* Avatar and Basic Info */}
            <div className="flex flex-col items-center text-center mb-4">
              {member.discordAvatarUrl ? (
                <img
                  src={member.discordAvatarUrl}
                  alt={`${member.displayName || member.discordUsername}'s avatar`}
                  className="w-20 h-20 rounded-full border-4 border-gray-100 mb-4 shadow-sm"
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-4 shadow-sm"
                  style={{ backgroundColor: brandColors.primary.full }}
                >
                  {(member.displayName || member.discordUsername).charAt(0).toUpperCase()}
                </div>
              )}
              
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                {member.displayName || member.discordUsername}
              </h3>
              
              {member.displayName && (
                <p className="text-sm text-gray-500 mb-2">@{member.discordUsername}</p>
              )}
              
              <Badge
                className="text-white text-sm font-medium px-3 py-1"
                style={{ backgroundColor: brandColors.primary.full }}
              >
                {member.role}
              </Badge>
            </div>

            {/* About Section */}
            {member.aboutMe && (
              <div className="mb-4">
                <h4 
                  className="text-sm font-semibold mb-2"
                  style={{ color: brandColors.primary.dark }}
                >
                  About
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {member.aboutMe}
                </p>
              </div>
            )}

            {/* Discord ID Section */}
            <div 
              className="p-3 rounded-lg border"
              style={{ 
                backgroundColor: brandColors.primary.extraLight,
                borderColor: brandColors.primary.light 
              }}
            >
              <h4 
                className="text-xs font-semibold mb-1"
                style={{ color: brandColors.primary.dark }}
              >
                Discord ID
              </h4>
              <p 
                className="text-sm font-mono break-all"
                style={{ color: brandColors.primary.full }}
              >
                {member.discordUserId}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 