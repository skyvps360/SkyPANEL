// TrustpilotWidget.tsx
// Reusable Trustpilot TrustBox widget for homepage and dashboard header area
import React from 'react';

/**
 * TrustpilotWidget displays the TrustBox review collector widget.
 * Place this near the header for visibility.
 */
export const TrustpilotWidget: React.FC = () => (
  <div className="w-full flex justify-center py-2" style={{ background: '#fff' }}>
    {/* TrustBox widget - Review Collector */}
    <div
      className="trustpilot-widget"
      data-locale="en-US"
      data-template-id="56278e9abfbbba0bdcd568bc"
      data-businessunit-id="6871cf16a48c5eab447bf8c4"
      data-style-height="52px"
      data-style-width="100%"
    >
      <a
        href="https://www.trustpilot.com/review/skyvps360.xyz"
        target="_blank"
        rel="noopener"
        style={{ color: '#00b67a', fontWeight: 600 }}
      >
        Trustpilot
      </a>
    </div>
    {/* End TrustBox widget */}
  </div>
); 