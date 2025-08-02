import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from 'react-helmet';
import { PublicLayout } from "@/components/layout/PublicLayout";


export function TermsOfServicePage() {
  const [companyName, setCompanyName] = useState("SkyVPS360");
  const [domain, setDomain] = useState("skyvps360.xyz");

  // Fetch branding information
  const { data: branding } = useQuery<{ company_name: string }>({
    queryKey: ["/api/settings/branding"]
  });

  // Fetch terms of service content from the database
  const { data: tosContent, isLoading } = useQuery({
    queryKey: ["/api/legal/tos"],
    retry: 1,
    // If there's an error fetching (e.g., the content doesn't exist yet), we'll just show the default content
    onError: () => {
      // Could not fetch terms of service from database, using default content
    }
  });

  // Update branding information when data is available
  useEffect(() => {
    if (branding?.company_name) {
      setCompanyName(branding.company_name);
      document.title = `Terms of Service - ${branding.company_name}`;
    }
  }, [branding]);

  // If we have content from the database, display that
  if (tosContent && !isLoading) {
    return (
      <>
  
        <Helmet>
          <title>Terms of Service - {companyName}</title>
          <meta name="description" content={`Terms of Service for ${companyName} - VPS Management Platform.`} />
        </Helmet>

        <PublicLayout>
          <div className="py-12">
            <div className="container mx-auto px-6 max-w-4xl">
              <div className="bg-white rounded-lg shadow-sm p-8 content-view text-gray-700">
                <h2 className="text-4xl font-bold mb-6 text-center text-gray-900">{tosContent.title}</h2>
                <p className="text-center text-sm text-gray-500 mb-6">
                  Version {tosContent.version} - Last Updated: {new Date(tosContent.effectiveDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>

                {/* Use dangerouslySetInnerHTML to render the HTML content */}
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: tosContent.content
                      .replace(/\{company_name\}/g, companyName)
                      .replace(/\{domain\}/g, domain)
                  }} 
                />
                
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
        <title>Terms of Service - {companyName}</title>
        <meta name="description" content={`Terms of Service for ${companyName} - VPS Management Platform.`} />
      </Helmet>

      <PublicLayout>
        <div className="py-12">
          <div className="container mx-auto px-6 max-w-4xl">
            <div className="bg-white rounded-lg shadow-sm p-8 content-view text-gray-700">
              <h2 className="text-4xl font-bold mb-6 text-center text-gray-900">Terms of Service</h2>
              <p className="text-center text-sm text-gray-500 mb-6">Last Updated: April 18, 2025</p>

              <h3 className="text-xl font-semibold mt-6 mb-3 pb-2 border-b border-gray-300 text-gray-900">1. Acceptance of Terms</h3>
              <p>By accessing, ordering, or using the services provided by <span>{domain}</span> ("<span>{companyName}</span>", "we", "us", "our"), including our website, Virtual Private Servers (VPS), and related offerings (collectively, the "Services"), you ("Client", "User", "you") agree to be legally bound by these Terms of Service ("TOS"), our Privacy Policy, and our Acceptable Use Policy ("AUP"), which is incorporated herein by reference. If you do not agree to these terms, do not use the Services. Using the Services constitutes your acceptance.</p>

              <h3 className="text-xl font-semibold mt-6 mb-3 pb-2 border-b border-gray-300 text-gray-900">2. Eligibility and Account Registration</h3>
              <p>You must be at least 18 years old and capable of entering into a binding contract to use the Services. You agree to provide accurate, current, and complete information during registration and billing (managed through our client portal) and to keep this information updated. You are solely responsible for maintaining the confidentiality of your account credentials (username, password) and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.</p>

              <h3 className="text-xl font-semibold mt-6 mb-3 pb-2 border-b border-gray-300 text-gray-900">3. Service Description</h3>
              <p><span>{companyName}</span> provides VPS hosting services through our SkyPANEL management platform. Key features include:</p>
              <ul className="list-disc ml-6 mb-4">
                <li><strong>Management Platform:</strong> SkyPANEL - our comprehensive VPS management and client portal system.</li>
                <li><strong>Virtualization:</strong> KVM technology for reliable virtual private servers.</li>
                <li><strong>Server Management:</strong> Full server control including boot, reboot, reinstall, console access, and monitoring through SkyPANEL.</li>
                <li><strong>IP Addressing:</strong> Typically includes NAT IPv4 (shared public IP with specified forwarded ports) and public IPv6 subnet (e.g., /80). IP addressing specifics, including port limitations and IPv6 configuration requirements, are detailed in service descriptions.</li>
                <li><strong>Storage:</strong> High-performance NVMe storage solutions (unless otherwise specified).</li>
                <li><strong>Infrastructure:</strong> Services hosted on enterprise-grade infrastructure provided by trusted datacenter partners, primarily InterServer VIA 365 Datacenters in their TEB-2 & TEB-8 facilities (New Jersey, USA).</li>
                <li><strong>Client Portal:</strong> Integrated billing, support ticketing, and account management through our SkyPANEL platform.</li>
              </ul>

              <h3 className="text-xl font-semibold mt-6 mb-3 pb-2 border-b border-gray-300 text-gray-900">4. Service Provision and Service Level Agreement (SLA)</h3>
              <p><span>{companyName}</span> will make Services available to Client upon account approval and payment. We target but <strong>do not guarantee</strong> the following service levels:</p>
              <ul className="list-disc ml-6 mb-4">
                <li><strong>Network Uptime:</strong> 99.5% monthly uptime excluding scheduled maintenance and factors beyond our control.</li>
                <li><strong>Host Server Uptime:</strong> 99.5% monthly uptime excluding scheduled maintenance.</li>
              </ul>
              <p>For extended unscheduled downtime (exceeding 24 hours), Client may request account credit for the affected service. <span>{companyName}</span> does not offer remedies for:</p>
              <ul className="list-disc ml-6 mb-4">
                <li>Issues arising from Client-initiated actions (OS reinstalls, misconfigurations).</li>
                <li>Issues with Client's Internet connection, DNS, or third-party services.</li>
                <li>Scheduled maintenance with prior notification (typically at least 24 hours).</li>
                <li>Outages due to DDoS attacks, upstream provider issues, or force majeure events.</li>
              </ul>
              <p>Credits will be applied to Client's account as service credit (not cash refund) and must be requested within 7 days of the incident. The maximum credit is the affected service's prorated value for the outage duration.</p>

              <h3 className="text-xl font-semibold mt-6 mb-3 pb-2 border-b border-gray-300 text-gray-900">5. Acceptable Use</h3>
              <p>Client must comply with our Acceptable Use Policy (AUP), which prohibits illegal activities, abusive behaviors, and disruptive/harmful actions. <span>{companyName}</span> reserves the right to suspend or terminate services for violations of the AUP. Key prohibitions include:</p>
              <ul className="list-disc ml-6 mb-4">
                <li>Illegal content or activities (including copyright infringement, child exploitation material, fraudulent services).</li>
                <li>Unauthorized security scanning, hacking, or vulnerability testing of networks/systems not owned by Client.</li>
                <li>Sending unsolicited bulk email (spam).</li>
                <li>Operating open proxies or anonymization services without adequate abuse monitoring.</li>
                <li>Activities designed to disrupt network performance or services (e.g., DDoS).</li>
                <li>Consuming excessive system resources adversely affecting other users.</li>
              </ul>
              <p>The AUP may be updated periodically. Client is responsible for complying with the current version.</p>

              <h3 className="text-xl font-semibold mt-6 mb-3 pb-2 border-b border-gray-300 text-gray-900">17. Contact Information</h3>
              <p>If you have any questions about these Terms of Service, please contact us at:</p>
              <p className="mb-2">{companyName}</p>
              <p>Email: <a href="mailto:legal@skyvps360.xyz" className="text-blue-600 hover:underline">legal@skyvps360.xyz</a></p>
              <p className="mt-8 text-center text-sm text-gray-500">© {new Date().getFullYear()} {companyName}. All rights reserved.</p>
            </div>
          </div>
        </div>
      </PublicLayout>
    </>
  );
}

export default TermsOfServicePage;