import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import DashboardBlogSection from "@/components/dashboard/DashboardBlogSection";
import { useLocation } from "wouter";

export default function DashboardBlogPage() {
  const [, navigate] = useLocation();

  // Handle navigation back to dashboard
  const handleNavigateBack = () => {
    navigate('/dashboard');
  };

  return (
    <DashboardLayout>
      <DashboardBlogSection onNavigateBack={handleNavigateBack} />
    </DashboardLayout>
  );
}
