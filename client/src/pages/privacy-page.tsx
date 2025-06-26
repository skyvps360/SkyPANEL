import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from 'react-helmet';
import { PublicLayout } from "@/components/layout/PublicLayout";

export function PrivacyPolicyPage() {
  const [companyName, setCompanyName] = useState("SkyVPS360");
  const [domain, setDomain] = useState("skyvps360.xyz");

  // Fetch branding information
  const { data: branding } = useQuery<{ company_name: string }>({
    queryKey: ["/api/settings/branding"]
  });

  // Fetch privacy policy content from the database
  const { data: privacyContent, isLoading } = useQuery({
    queryKey: ["/api/legal/privacy"],
    retry: 1,
    // If there's an error fetching (e.g., the content doesn't exist yet), we'll just show the default content
    onError: () => {
      // Could not fetch privacy policy from database, using default content
    }
  });

  // Update branding information when data is available
  useEffect(() => {
    if (branding?.company_name) {
      setCompanyName(branding.company_name);
      document.title = `Privacy Policy - ${branding.company_name}`;
    }
  }, [branding]);

  // If we have content from the database, display that
  if (privacyContent && !isLoading) {
    return (
      <>
        <Helmet>
          <title>Privacy Policy - {companyName}</title>
          <meta name="description" content={`Privacy Policy for ${companyName} - VPS Management Platform.`} />
        </Helmet>

        <PublicLayout>
          <div className="py-12">
            <div className="container mx-auto px-6 max-w-4xl">
              <div className="bg-white rounded-lg shadow-sm p-8 content-view text-gray-700">
                <h2 className="text-4xl font-bold mb-6 text-center text-gray-900">{privacyContent.title}</h2>
                <p className="text-center text-sm text-gray-500 mb-6">
                  Version {privacyContent.version} - Last Updated: {new Date(privacyContent.effectiveDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>

                {/* Use dangerouslySetInnerHTML to render the HTML content */}
                <div dangerouslySetInnerHTML={{ __html: privacyContent.content.replace(/\{company_name\}/g, companyName) }} />
                
                <p className="mt-8 text-center text-sm text-gray-500">© {new Date().getFullYear()} {companyName}. All rights reserved.</p>
              </div>
            </div>
          </div>
        </PublicLayout>
      </>
    );
  }

  // Default content if we couldn't fetch from database or while loading
  return (
    <>
      <Helmet>
        <title>Privacy Policy - {companyName}</title>
        <meta name="description" content={`Privacy Policy for ${companyName} - VPS Management Platform.`} />
      </Helmet>

      <PublicLayout>
        <div className="py-12">
          <div className="container mx-auto px-6 max-w-4xl">
            <div className="bg-white rounded-lg shadow-sm p-8 content-view text-gray-700">
              <h2 className="text-4xl font-bold mb-6 text-center text-gray-900">Privacy Policy</h2>
              <p className="text-center text-sm text-gray-500 mb-6">Last Updated: April 18, 2025</p>

              <h3 className="text-xl font-semibold mt-6 mb-3 pb-2 border-b border-gray-300 text-gray-900">1. Introduction & Scope</h3>
              <p>{companyName} ("we," "us," "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our services, including our website, SkyPANEL management platform, VPS hosting, client portal, and related services (collectively, "Services").</p>
              <p>By accessing or using our Services, you consent to the collection, use, disclosure, and storage of your information as described in this Privacy Policy. If you do not agree with our policies and practices, please do not use our Services.</p>

              <h3 className="text-xl font-semibold mt-6 mb-3 pb-2 border-b border-gray-300 text-gray-900">2. Information We Collect</h3>
              <p>We collect several types of information from and about users of our Services:</p>
              <ul className="list-disc ml-6 mb-4">
                <li>
                  <strong>Personal Identification Information:</strong>
                  <ul className="list-circle ml-6 my-2">
                    <li>Name, email address, telephone number, and postal address</li>
                    <li>Username, password, and account preferences</li>
                    <li>Billing information and payment details (processed securely through payment processors)</li>
                    <li>Communication preferences and marketing opt-ins</li>
                    <li>Communication history (e.g., support tickets, chat logs)</li>
                  </ul>
                </li>
                <li>
                  <strong>Technical and Usage Information:</strong>
                  <ul className="list-circle ml-6 my-2">
                    <li>IP address, browser type, operating system, and device information</li>
                    <li>Usage patterns, pages visited, features used, and time spent on our Services</li>
                    <li>Server performance metrics and resource usage</li>
                    <li>Referral sources and entry/exit pages</li>
                    <li>Cookies, web beacons, and similar tracking technologies</li>
                  </ul>
                </li>
                <li>
                  <strong>User Content:</strong>
                  <ul className="list-circle ml-6 my-2">
                    <li>Information you provide in support tickets, or other interactive areas</li>
                    <li>Server configurations and customizations through SkyPANEL</li>
                    <li>Service-related preferences and settings within our platform</li>
                  </ul>
                </li>
                <li>
                  <strong>Third-Party Information:</strong>
                  <ul className="list-circle ml-6 my-2">
                    <li>Data from third-party services if you connect them to our Services</li>
                    <li>Information from business partners and vendors</li>
                  </ul>
                </li>
              </ul>
              <p>We collect this information in various ways, including:</p>
              <ul className="list-disc ml-6 mb-4">
                <li>When you provide it directly (e.g., when creating an account or purchasing services)</li>
                <li>Automatically as you navigate through our Services (e.g., through cookies and analytics)</li>
                <li>From third parties (e.g., payment processors, credit verification services)</li>
              </ul>

              <h3 className="text-xl font-semibold mt-6 mb-3 pb-2 border-b border-gray-300 text-gray-900">3. How We Use Your Information (Purpose of Use)</h3>
              <p>We use the information we collect to:</p>
              <ul className="list-disc ml-6 mb-4">
                <li>Provide, maintain, and improve our Services</li>
                <li>Process transactions, payments, and fulfill orders</li>
                <li>Communicate with you about your account, services, and support needs</li>
                <li>Send administrative information, such as updates, security alerts, and support messages</li>
                <li>Send marketing communications (with your consent, where required)</li>
                <li>Personalize your experience and deliver content relevant to your interests</li>
                <li>Monitor and analyze usage patterns and trends to improve our Services</li>
                <li>Protect our Services, users, and the public from fraudulent, illegal, or harmful activities</li>
                <li>Comply with legal obligations and enforce our terms and policies</li>
              </ul>

              <h3 className="text-xl font-semibold mt-6 mb-3 pb-2 border-b border-gray-300 text-gray-900">11. Contact Us</h3>
              <p>If you have questions, concerns, or requests regarding this Privacy Policy or our privacy practices, please contact us at:</p>
              <p className="mb-2">{companyName}</p>
              <p>Email: <a href="mailto:privacy@skyvps360.xyz" className="text-blue-600 hover:underline">privacy@skyvps360.xyz</a></p>
              <p className="mt-8 text-center text-sm text-gray-500">© {new Date().getFullYear()} {companyName}. All rights reserved.</p>
            </div>
          </div>
        </div>
      </PublicLayout>
    </>
  );
}

export default PrivacyPolicyPage;