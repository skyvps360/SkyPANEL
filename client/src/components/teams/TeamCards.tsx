import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getBrandColors } from '@/lib/brand-theme';
import { 
  User, 
  MessageCircle, 
  Calendar, 
  Star, 
  Award, 
  Shield, 
  Zap,
  Heart,
  Users,
  Crown
} from 'lucide-react';

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

  // Get role icon based on role
  const getRoleIcon = (role: string) => {
    const roleLower = role.toLowerCase();
    if (roleLower.includes('admin') || roleLower.includes('manager') || roleLower.includes('lead')) {
      return <Crown className="h-4 w-4" />;
    } else if (roleLower.includes('support') || roleLower.includes('help')) {
      return <MessageCircle className="h-4 w-4" />;
    } else if (roleLower.includes('developer') || roleLower.includes('engineer')) {
      return <Zap className="h-4 w-4" />;
    } else if (roleLower.includes('security') || roleLower.includes('safety')) {
      return <Shield className="h-4 w-4" />;
    } else if (roleLower.includes('community') || roleLower.includes('social')) {
      return <Users className="h-4 w-4" />;
    } else {
      return <Star className="h-4 w-4" />;
    }
  };

  // Get role color based on role
  const getRoleColor = (role: string) => {
    const roleLower = role.toLowerCase();
    if (roleLower.includes('admin') || roleLower.includes('manager') || roleLower.includes('lead')) {
      return 'from-purple-500 to-pink-500';
    } else if (roleLower.includes('support') || roleLower.includes('help')) {
      return 'from-blue-500 to-cyan-500';
    } else if (roleLower.includes('developer') || roleLower.includes('engineer')) {
      return 'from-orange-500 to-red-500';
    } else if (roleLower.includes('security') || roleLower.includes('safety')) {
      return 'from-green-500 to-emerald-500';
    } else if (roleLower.includes('community') || roleLower.includes('social')) {
      return 'from-indigo-500 to-purple-500';
    } else {
      return 'from-gray-500 to-slate-500';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 w-full">
      {sortedMembers.map((member) => (
        <Card 
          key={member.id} 
          className="group relative border-0 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 bg-white transform hover:-translate-y-2 hover:scale-105"
          style={{
            boxShadow: `0 10px 40px rgba(${parseInt(brandColors.primary.hex.slice(0,2), 16)}, ${parseInt(brandColors.primary.hex.slice(2,4), 16)}, ${parseInt(brandColors.primary.hex.slice(4,6), 16)}, 0.1)`
          }}
        >
          {/* Gradient Background Overlay */}
          <div 
            className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500"
            style={{
              background: `linear-gradient(135deg, ${brandColors.primary.full} 0%, ${brandColors.primary.dark} 100%)`
            }}
          />
          
          {/* Top Decorative Strip */}
          <div 
            className="h-2 w-full"
            style={{ 
              background: `linear-gradient(90deg, ${brandColors.primary.full} 0%, ${brandColors.primary.dark} 100%)`
            }}
          />
          
          <CardContent className="p-8 relative z-10">
            {/* Avatar Section */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative mb-4">
                {member.discordAvatarUrl ? (
                  <div className="relative">
                    <img
                      src={member.discordAvatarUrl}
                      alt={`${member.displayName || member.discordUsername}'s avatar`}
                      className="w-24 h-24 rounded-full border-4 border-white shadow-xl"
                    />
                    <div 
                      className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: brandColors.primary.full }}
                    >
                      <Heart className="h-4 w-4" />
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <div
                      className="w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-xl"
                      style={{ backgroundColor: brandColors.primary.full }}
                    >
                      {(member.displayName || member.discordUsername).charAt(0).toUpperCase()}
                    </div>
                    <div 
                      className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: brandColors.primary.dark }}
                    >
                      <Heart className="h-4 w-4" />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Name and Username */}
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-gray-800 transition-colors">
                  {member.displayName || member.discordUsername}
                </h3>
                
                {member.displayName && (
                  <p className="text-sm text-gray-500 mb-3">@{member.discordUsername}</p>
                )}
                
                {/* Role Badge with Icon */}
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div 
                    className="p-2 rounded-full"
                    style={{ backgroundColor: brandColors.primary.extraLight }}
                  >
                    {getRoleIcon(member.role)}
                  </div>
                  <Badge
                    className="text-white text-xs font-medium px-3 py-1 rounded-full"
                    style={{ 
                      background: `linear-gradient(90deg, ${brandColors.primary.full} 0%, ${brandColors.primary.dark} 100%)`
                    }}
                  >
                    {member.role}
                  </Badge>
                </div>
              </div>
            </div>

            {/* About Section */}
            {member.aboutMe && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <User 
                    className="h-4 w-4" 
                    style={{ color: brandColors.primary.full }}
                  />
                  <h4 
                    className="text-sm font-semibold"
                    style={{ color: brandColors.primary.dark }}
                  >
                    About
                  </h4>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {member.aboutMe}
                </p>
              </div>
            )}

            {/* Discord Info */}
            <div 
              className="p-4 rounded-xl border-2"
              style={{ 
                backgroundColor: brandColors.primary.extraLight,
                borderColor: brandColors.primary.light 
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle 
                  className="h-4 w-4" 
                  style={{ color: brandColors.primary.full }}
                />
                <h4 
                  className="text-xs font-semibold"
                  style={{ color: brandColors.primary.dark }}
                >
                  Discord
                </h4>
              </div>
              <p 
                className="text-xs font-mono break-all"
                style={{ color: brandColors.primary.full }}
              >
                {member.discordUserId}
              </p>
            </div>

            {/* Member Since */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              <span>Member since {new Date(member.createdAt).getFullYear()}</span>
            </div>

            {/* Hover Effect Overlay */}
            <div 
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${brandColors.primary.full}20 0%, ${brandColors.primary.dark}20 100%)`
              }}
            >
              <Button
                variant="outline"
                size="sm"
                className="bg-white/90 backdrop-blur-sm border-white text-gray-700 hover:bg-white"
                style={{
                  borderColor: brandColors.primary.light,
                  color: brandColors.primary.full
                }}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Contact
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 