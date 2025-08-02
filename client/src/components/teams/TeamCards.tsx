import { Badge } from '@/components/ui/badge';
import { getBrandColors } from '@/lib/brand-theme';
import { MessageCircle, Calendar, Heart } from 'lucide-react';

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
    <div className="w-full max-w-3xl mx-auto divide-y divide-gray-200">
      {sortedMembers.map((member) => (
        <div
          key={member.id}
          className="flex flex-col sm:flex-row items-center gap-6 py-8 px-2 sm:px-6 bg-transparent hover:bg-gray-50 transition"
        >
          {/* Avatar */}
          <div className="flex-shrink-0">
            {member.discordAvatarUrl ? (
              <img
                src={member.discordAvatarUrl}
                alt={`${member.displayName || member.discordUsername}'s avatar`}
                className="w-20 h-20 rounded-full border-2 border-white shadow"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow"
                style={{ backgroundColor: brandColors.primary.full }}
              >
                {(member.displayName || member.discordUsername).charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-xl font-semibold text-gray-900">
                {member.displayName || member.discordUsername}
              </span>
              {member.displayName && (
                <span className="text-sm text-gray-500">@{member.discordUsername}</span>
              )}
              <Badge
                className="ml-0 sm:ml-3 text-xs font-medium px-3 py-1 rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${brandColors.primary.full} 0%, ${brandColors.primary.dark} 100%)`,
                  color: 'white',
                }}
              >
                {member.role}
              </Badge>
            </div>
            {member.aboutMe && (
              <p className="mt-2 text-gray-700 text-sm max-w-2xl">{member.aboutMe}</p>
            )}
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" style={{ color: brandColors.primary.full }} />
                <span className="font-mono">{member.discordUserId}</span>
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Member since {new Date(member.createdAt).getFullYear()}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" style={{ color: brandColors.primary.full }} />
                Active
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 