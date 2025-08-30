import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, LogIn } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { getBrandColors } from "@/lib/brand-theme";
import { gsap } from "gsap";

interface BrandingSettings {
  company_name: string;
  company_color?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  company_logo?: string;
}

interface CardNavItem {
  label: string;
  link: string;
  bgColor?: string;
  textColor?: string;
  external?: boolean;
}

interface CardNavProps {
  logo?: string;
  logoAlt?: string;
  items: CardNavItem[];
  className?: string;
  ease?: string;
  baseColor?: string;
  menuColor?: string;
  buttonBgColor?: string;
  buttonTextColor?: string;
}

export function CardNav({
  logo,
  logoAlt = "Logo",
  items = [],
  className = "",
  ease = "power3.out",
  baseColor = "#fff",
  menuColor,
  buttonBgColor = "#111",
  buttonTextColor = "white"
}: CardNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const navRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Fetch branding settings with default values
  const {
    data: branding = {
      company_name: "SkyVPS360",
      company_color: "2563eb",
      primary_color: "2563eb",
      secondary_color: "10b981",
      accent_color: "f59e0b"
    },
  } = useQuery<BrandingSettings>({
    queryKey: ["/api/settings/branding"],
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Close mobile menu when location changes
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const companyName = branding?.company_name || "SkyVPS360";

  // Use the new color system with fallbacks
  const brandColorOptions = {
    primaryColor: branding?.primary_color || branding?.company_color || "2563eb",
    secondaryColor: branding?.secondary_color || "10b981",
    accentColor: branding?.accent_color || "f59e0b"
  };

  // Get theme colors using our new utility with the enhanced color system
  const brandColors = getBrandColors(brandColorOptions);

  // Navigation items with branding integration
  const navItems: CardNavItem[] = [
    { label: "Home", link: "/", bgColor: brandColors.primary.full, textColor: "white" },
    { label: "Plans", link: "/plans", bgColor: brandColors.primary.full, textColor: "white" },
    { label: "Our Team", link: "/team", bgColor: brandColors.primary.full, textColor: "white" },
    { label: "Blog", link: "/blog", bgColor: brandColors.primary.full, textColor: "white" },
    { label: "Documentation", link: "/docs", bgColor: brandColors.primary.full, textColor: "white" },
    { label: "Status", link: "/status", bgColor: brandColors.primary.full, textColor: "white" },
  ];

  // GSAP animations
  useEffect(() => {
    if (cardRefs.current.length > 0) {
      gsap.fromTo(
        cardRefs.current,
        {
          y: 20,
          opacity: 0,
          scale: 0.9
        },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: ease,
          delay: 0.2
        }
      );
    }
  }, [ease]);

  // Mobile menu animation
  useEffect(() => {
    if (mobileMenuRef.current) {
      if (isOpen) {
        gsap.fromTo(
          mobileMenuRef.current,
          { height: 0, opacity: 0 },
          { height: "auto", opacity: 1, duration: 0.3, ease: ease }
        );
      } else {
        gsap.to(mobileMenuRef.current, {
          height: 0,
          opacity: 0,
          duration: 0.3,
          ease: ease
        });
      }
    }
  }, [isOpen, ease]);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  // Function to handle hash links by scrolling to the element
  const handleHashClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    path: string,
  ) => {
    if (path.includes("#")) {
      event.preventDefault();

      // If not on homepage, navigate to homepage first, then scroll
      if (location !== "/") {
        window.location.href = path;
        return;
      }

      // Extract the ID from the hash
      const hashId = path.split("#")[1];
      const element = document.getElementById(hashId);

      // Scroll to element if it exists
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const isActive = (path: string) => {
    // For paths with hashes, check if we're on home page
    if (path.includes("#")) {
      return location === "/";
    }
    return location === path;
  };

  // Card hover animations
  const handleCardHover = (index: number, isHovering: boolean) => {
    const card = cardRefs.current[index];
    if (card) {
      gsap.to(card, {
        scale: isHovering ? 1.05 : 1,
        y: isHovering ? -2 : 0,
        duration: 0.3,
        ease: ease
      });
    }
  };

  return (
    <nav 
      ref={navRef}
      className={`bg-white border-b shadow-sm sticky top-0 z-50 ${className}`}
      style={{ backgroundColor: baseColor }}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <div
                className="flex items-center justify-center h-8 w-10 mr-2 rounded text-white font-bold text-lg"
                style={{ 
                  backgroundColor: branding?.company_logo ? 'transparent' : brandColors.primary.full,
                  padding: branding?.company_logo ? '0' : undefined
                } as React.CSSProperties}
              >
                {branding?.company_logo ? (
                  <img
                    src={branding.company_logo}
                    alt={companyName || "Company Logo"}
                    className="h-full w-full object-contain rounded"
                  />
                ) : (
                  companyName?.charAt(0) || "S"
                )}
              </div>
              <span className="text-xl font-bold text-gray-800">
                {companyName}
              </span>
            </Link>
          </div>

          {/* Desktop Card Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-3">
            {navItems.map((item, index) => {
              const active = isActive(item.link);
              return (
                <div
                  key={item.link}
                  ref={(el) => (cardRefs.current[index] = el)}
                  className="relative"
                >
                  {item.external ? (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <div
                        className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md ${
                          active ? 'ring-2 ring-offset-2' : ''
                        }`}
                        style={{
                          backgroundColor: active ? item.bgColor : 'rgba(255, 255, 255, 0.9)',
                          color: active ? item.textColor : '#374151',
                          '--ring-color': active ? item.bgColor : 'transparent'
                        } as React.CSSProperties}
                        onMouseEnter={() => handleCardHover(index, true)}
                        onMouseLeave={() => handleCardHover(index, false)}
                      >
                        {item.label}
                      </div>
                    </a>
                  ) : item.link.includes("#") ? (
                    <a
                      href={item.link}
                      onClick={(e) => handleHashClick(e, item.link)}
                      className="block"
                    >
                      <div
                        className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md ${
                          active ? 'ring-2 ring-offset-2' : ''
                        }`}
                        style={{
                          backgroundColor: active ? item.bgColor : 'rgba(255, 255, 255, 0.9)',
                          color: active ? item.textColor : '#374151',
                          '--ring-color': active ? item.bgColor : 'transparent'
                        } as React.CSSProperties}
                        onMouseEnter={() => handleCardHover(index, true)}
                        onMouseLeave={() => handleCardHover(index, false)}
                      >
                        {item.label}
                      </div>
                    </a>
                  ) : (
                    <Link href={item.link} className="block">
                      <div
                        className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md ${
                          active ? 'ring-2 ring-offset-2' : ''
                        }`}
                        style={{
                          backgroundColor: active ? item.bgColor : 'rgba(255, 255, 255, 0.9)',
                          color: active ? item.textColor : '#374151',
                          '--ring-color': active ? item.bgColor : 'transparent'
                        } as React.CSSProperties}
                        onMouseEnter={() => handleCardHover(index, true)}
                        onMouseLeave={() => handleCardHover(index, false)}
                      >
                        {item.label}
                      </div>
                    </Link>
                  )}
                </div>
              );
            })}

            {/* Client Area Button */}
            <Link href="/auth">
              <Button
                variant="outline"
                className="ml-2 font-medium border shadow-sm hover:shadow-md transition-all duration-300"
                style={{
                  backgroundColor: buttonBgColor,
                  color: buttonTextColor,
                  borderColor: brandColors.primary.medium,
                } as React.CSSProperties}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = brandColors.primary.lighter;
                  e.currentTarget.style.borderColor = brandColors.primary.full;
                  e.currentTarget.style.color = brandColors.primary.full;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = buttonBgColor;
                  e.currentTarget.style.borderColor = brandColors.primary.medium;
                  e.currentTarget.style.color = buttonTextColor;
                }}
              >
                Client Area
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center">
            <button
              className="inline-flex items-center justify-center p-2 rounded-md transition-all duration-300"
              style={{
                color: menuColor || brandColors.primary.full,
                backgroundColor: 'transparent'
              } as React.CSSProperties}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = brandColors.primary.lighter;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onClick={toggleMenu}
              aria-expanded={isOpen}
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div 
        ref={mobileMenuRef}
        className="md:hidden overflow-hidden"
        style={{ height: isOpen ? 'auto' : 0 }}
      >
        <div className="pt-2 pb-3 space-y-2 px-4">
          {navItems.map((item) => {
            const active = isActive(item.link);
            return (
              <div key={item.link}>
                {item.external ? (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <div
                      className="px-3 py-2 rounded-md text-base font-medium transition-all duration-300"
                      style={{
                        backgroundColor: active ? item.bgColor : 'transparent',
                        color: active ? item.textColor : '#374151'
                      } as React.CSSProperties}
                    >
                      {item.label}
                    </div>
                  </a>
                ) : item.link.includes("#") ? (
                  <a
                    href={item.link}
                    onClick={(e) => handleHashClick(e, item.link)}
                    className="block"
                  >
                    <div
                      className="px-3 py-2 rounded-md text-base font-medium transition-all duration-300"
                      style={{
                        backgroundColor: active ? item.bgColor : 'transparent',
                        color: active ? item.textColor : '#374151'
                      } as React.CSSProperties}
                    >
                      {item.label}
                    </div>
                  </a>
                ) : (
                  <Link href={item.link} className="block">
                    <div
                      className="px-3 py-2 rounded-md text-base font-medium transition-all duration-300"
                      style={{
                        backgroundColor: active ? item.bgColor : 'transparent',
                        color: active ? item.textColor : '#374151'
                      } as React.CSSProperties}
                    >
                      {item.label}
                    </div>
                  </Link>
                )}
              </div>
            );
          })}

          <Link href="/auth">
            <div className="mt-4">
              <div className="px-3 py-2 rounded-md text-base font-medium transition-all duration-300 flex items-center justify-center">
                <LogIn className="mr-2 h-4 w-4" />
                Client Area
              </div>
            </div>
          </Link>
        </div>
      </div>
    </nav>
  );
}