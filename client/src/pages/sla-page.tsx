import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from 'react-helmet';
import { PublicLayout } from "@/components/layout/PublicLayout";

export function SLAPage() {
  const [companyName, setCompanyName] = useState("SkyVPS360");
  const [domain, setDomain] = useState("skyvps360.xyz");

  // Fetch branding information
  const { data: branding } = useQuery<{ company_name: string }>({
    queryKey: ["/api/settings/branding"]
  });

  // Fetch SLA content from the database
  const { data: slaContent, isLoading } = useQuery({
    queryKey: ["/api/legal/sla"],
    retry: 1,
    // If there's an error fetching (e.g., the content doesn't exist yet), we'll just show the default content
    onError: () => {
      // Could not fetch SLA from database, using default content
    }
  });

  // Update branding information when data is available
  useEffect(() => {
    if (branding?.company_name) {
      setCompanyName(branding.company_name);
      document.title = `Service Level Agreement - ${branding.company_name}`;
    }
  }, [branding]);

  // If we have content from the database, display that
  if (slaContent && !isLoading) {
    return (
      <>
        <Helmet>
          <title>Service Level Agreement - {companyName}</title>
          <meta name="description" content={`Service Level Agreement for ${companyName} - VPS Management Platform.`} />
        </Helmet>

        <PublicLayout>
          <div className="py-12">
            <div className="container mx-auto px-6 max-w-4xl">
              <div className="bg-white rounded-lg shadow-sm p-8 content-view text-gray-700">
                <h2 className="text-4xl font-bold mb-6 text-center text-gray-900">{slaContent.title}</h2>
                <p className="text-center text-sm text-gray-500 mb-6">
                  Version {slaContent.version} - Last Updated: {new Date(slaContent.effectiveDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>

                {/* Use dangerouslySetInnerHTML to render the HTML content */}
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: slaContent.content
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
        <title>Service Level Agreement - {companyName}</title>
        <meta name="description" content={`Service Level Agreement for ${companyName} - VPS Management Platform.`} />
      </Helmet>

      <PublicLayout>
        <div className="py-12">
          <div className="container mx-auto px-6 max-w-4xl">
            <div className="bg-white rounded-lg shadow-sm p-8 content-view text-gray-700">
              <h2 className="text-4xl font-bold mb-6 text-center text-gray-900">Service Level Agreement</h2>
              <p className="text-center text-sm text-gray-500 mb-6">Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

              <h3 className="text-xl font-semibold mt-6 mb-3 pb-2 border-b border-gray-300 text-gray-900">1. Service Availability</h3>
              <p><span>{companyName}</span> is committed to providing reliable VPS hosting services through our SkyPANEL management platform. We strive to maintain high service availability while acknowledging that no service can guarantee 100% uptime.</p>

              <h3 className="text-xl font-semibold mt-6 mb-3 pb-2 border-b border-gray-300 text-gray-900">2. Uptime Commitment</h3>
              <p>We target the following service levels for our VPS hosting services:</p>
              <ul className="list-disc ml-6 mb-4">
                <li><strong>Network Uptime:</strong> 99.5% monthly uptime target</li>
                <li><strong>Host Server Uptime:</strong> 99.5% monthly uptime target</li>
                <li><strong>SkyPANEL Platform:</strong> 99.0% monthly uptime target</li>
              </ul>
              <p><strong>Note:</strong> These are target service levels, not guarantees. Uptime calculations exclude scheduled maintenance windows and circumstances beyond our reasonable control.</p>

              <h3 className="text-xl font-semibold mt-6 mb-3 pb-2 border-b border-gray-300 text-gray-900">3. Scheduled Maintenance</h3>
              <p>Scheduled maintenance is excluded from uptime calculations. We will provide:</p>
              <ul className="list-disc ml-6 mb-4">
                <li>At least 24 hours advance notice for planned maintenance</li>
                <li>Maintenance windows typically scheduled during low-usage periods</li>
                <li>Updates via email notifications and service status page</li>
              </ul>

              <h3 className="text-xl font-semibold mt-6 mb-3 pb-2 border-b border-gray-300 text-gray-900">4. Service Credits</h3>
              <p>For extended unscheduled downtime exceeding 24 consecutive hours, customers may request service credits according to the following policy:</p>
              <ul className="list-disc ml-6 mb-4">
                <li><strong>Credit Amount:</strong> Prorated service credit based on the duration of the outage</li>
                <li><strong>Maximum Credit:</strong> One month of service fees for the affected service</li>
                <li><strong>Request Period:</strong> Credits must be requested within 7 days of the incident</li>
                <li><strong>Credit Form:</strong> Applied as account credit, not cash refunds</li>
              </ul>

              <h3 className="text-xl font-semibold mt-6 mb-3 pb-2 border-b border-gray-300 text-gray-900">5. Exclusions</h3>
              <p>Service level commitments do not apply to downtime caused by:</p>
              <ul className="list-disc ml-6 mb-4">
                <li>Customer-initiated actions (OS reinstalls, misconfigurations, software issues)</li>
                <li>Customer's internet connection, DNS, or third-party service issues</li>
                <li>Scheduled maintenance with proper advance notice</li>
                <li>DDoS attacks, security incidents, or abuse mitigation</li>
                <li>Upstream provider outages or network issues</li>
                <li>Force majeure events (natural disasters, power outages, etc.)</li>
                <li>Emergency maintenance required for security or stability</li>
              </ul>

              <h3 className="text-xl font-semibold mt-6 mb-3 pb-2 border-b border-gray-300 text-gray-900">6. Performance Standards</h3>
              <p>While we strive to provide optimal performance, the following are general expectations rather than guarantees:</p>
              <ul className="list-disc ml-6 mb-4">
                <li><strong>Network Latency:</strong> Low latency connectivity within our datacenter facilities</li>
                <li><strong>Storage Performance:</strong> High-performance NVMe storage (where specified)</li>
                <li><strong>Support Response:</strong> Best effort response times based on ticket priority</li>
              </ul>

              <h3 className="text-xl font-semibold mt-6 mb-3 pb-2 border-b border-gray-300 text-gray-900">7. Monitoring and Reporting</h3>
              <p><span>{companyName}</span> continuously monitors our infrastructure and services. Customers can:</p>
              <ul className="list-disc ml-6 mb-4">
                <li>Monitor their services through the SkyPANEL dashboard</li>
                <li>Check service status updates on our status page</li>
                <li>Receive notifications about planned maintenance and incidents</li>
                <li>Contact support for service-related issues</li>
              </ul>

              <h3 className="text-xl font-semibold mt-6 mb-3 pb-2 border-b border-gray-300 text-gray-900">8. Limitation of Liability</h3>
              <p>This SLA represents our commitment to service quality, but does not expand our liability beyond what is stated in our Terms of Service. Service credits are the sole remedy for SLA violations.</p>

              <h3 className="text-xl font-semibold mt-6 mb-3 pb-2 border-b border-gray-300 text-gray-900">9. SLA Updates</h3>
              <p>This SLA may be updated periodically to reflect service improvements or changes. Customers will be notified of material changes with reasonable advance notice.</p>

              <h3 className="text-xl font-semibold mt-6 mb-3 pb-2 border-b border-gray-300 text-gray-900">10. Contact Information</h3>
              <p>For SLA-related questions or to request service credits, please contact us at:</p>
              <p className="mb-2">{companyName}</p>
              <p>Email: <a href="mailto:support@skyvps360.xyz" className="text-blue-600 hover:underline">support@skyvps360.xyz</a></p>
              <p>Support Portal: Available through your SkyPANEL account</p>
              
              <p className="mt-8 text-center text-sm text-gray-500">© {new Date().getFullYear()} {companyName}. All rights reserved.</p>
            </div>
          </div>
        </div>
      </PublicLayout>
    </>
  );
}

export default SLAPage;