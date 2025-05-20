// Function to format ticket PDF
export function formatTicketPdf(
  doc: any, 
  ticket: any, 
  messages: any[], 
  user: any, 
  companyName: string, 
  companyLogo: string,
  server: any = null,
  creditsInfo: any = null
) {
  // Debug ticket data
  console.log(`Generating PDF for ticket ID: ${ticket.id}`);
  
  // Add logo if available
  if (companyLogo) {
    try {
      // If logo is a data URL (base64)
      if (companyLogo.startsWith('data:image')) {
        const base64Data = companyLogo.split(',')[1];
        if (base64Data) {
          const logoBuffer = Buffer.from(base64Data, 'base64');
          doc.image(logoBuffer, 50, 45, { width: 150 });
        }
      } else {
        // If logo is a URL
        doc.image(companyLogo, 50, 45, { width: 150 });
      }
    } catch (err) {
      console.error('Error adding logo to PDF:', err);
      // Continue without logo if there's an error
    }
  }
  
  // Format date strings with consistent formatting
  const dateTimeFormat = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  const createdDate = ticket.createdAt 
    ? new Date(ticket.createdAt).toLocaleString('en-US', dateTimeFormat)
    : 'N/A';
  
  const updatedDate = ticket.updatedAt 
    ? new Date(ticket.updatedAt).toLocaleString('en-US', dateTimeFormat)
    : 'N/A';
  
  // Add document title
  doc.fontSize(20)
     .text(`${companyName} Support Ticket`, { align: 'center' })
     .moveDown(0.5);
  
  // Draw header with separator
  doc.moveTo(50, doc.y)
     .lineTo(doc.page.width - 50, doc.y)
     .stroke()
     .moveDown(0.5);
  
  // Add ticket information
  doc.fontSize(16)
     .text('Ticket Information', { underline: true })
     .moveDown(0.5);
  
  doc.fontSize(12)
     .text(`Ticket ID: #${ticket.id}`, { continued: false })
     .text(`Subject: ${ticket.subject}`, { continued: false })
     .text(`Status: ${ticket.status}`, { continued: false })
     .text(`Priority: ${ticket.priority || 'Normal'}`, { continued: false })
     .text(`Created: ${createdDate}`, { continued: false })
     .text(`Last Updated: ${updatedDate}`, { continued: false })
     .moveDown(0.5);
  
  // Add user information
  doc.fontSize(16)
     .text('User Information', { underline: true })
     .moveDown(0.5);
  
  doc.fontSize(12)
     .text(`User: ${user?.fullName || 'Unknown'}`, { continued: false })
     .text(`Email: ${user?.email || 'Unknown'}`, { continued: false });
     
  // Credits information is not relevant for support tickets
  // and has been removed from the PDF
  
  doc.moveDown();
  
  // Add VPS information if available
  if (server) {
    doc.fontSize(16)
       .text('VPS Server Information', { underline: true })
       .moveDown(0.5);
    
    doc.fontSize(12)
       .text(`Server ID: ${server.id || 'Unknown'}`, { continued: false })
       .text(`Server Name: ${server.name || 'Unknown'}`, { continued: false });
    
    if (server.state) {
      doc.text(`Status: ${server.state}`, { continued: false });
    }
    
    // Add network information if available
    if (server.network) {
      doc.text('Network Information:', { continued: false });
      
      // Handle network interfaces safely
      const interfaces = server.network.interfaces || [];
      
      if (interfaces.length > 0) {
        interfaces.forEach((iface: any, index: number) => {
          if (!iface) return; // Skip if interface is null or undefined
          
          doc.fontSize(10);
          doc.text(`Interface ${index+1}: ${iface.name || 'eth0'}`, { continued: false, indent: 10 });
          
          // Check for IPv4 addresses
          const ipv4Addresses = iface.ipv4 || [];
          if (ipv4Addresses.length > 0) {
            ipv4Addresses.forEach((ip: any) => {
              if (!ip) return; // Skip if IP object is null or undefined
              
              doc.text(`IP Address: ${ip.address || 'N/A'}`, { continued: false, indent: 20 });
              
              if (ip.netmask) {
                doc.text(`Netmask: ${ip.netmask}`, { continued: false, indent: 20 });
              }
              
              if (ip.gateway) {
                doc.text(`Gateway: ${ip.gateway}`, { continued: false, indent: 20 });
              }
              
              doc.text(`NAT: ${ip.nat ? 'Yes' : 'No'}`, { continued: false, indent: 20 });
            });
          } else {
            doc.text(`No IPv4 addresses configured`, { continued: false, indent: 20 });
          }
          
          // Check for IPv6 addresses
          const ipv6Addresses = iface.ipv6 || [];
          if (ipv6Addresses.length > 0) {
            ipv6Addresses.forEach((ip: any) => {
              if (!ip) return; // Skip if IP object is null or undefined
              
              // Handle IPv6 addresses in subnet/cidr format
              let ipv6Address = 'N/A';
              if (ip.address) {
                ipv6Address = ip.address;
              } else if (ip.subnet) {
                // Subnet + CIDR format for IPv6
                ipv6Address = `${ip.subnet}/${ip.cidr}`;
              }
              
              doc.text(`IPv6 Address: ${ipv6Address}`, { continued: false, indent: 20 });
              
              // Handle netmask/prefix display
              if (ip.prefix) {
                doc.text(`Prefix: ${ip.prefix}`, { continued: false, indent: 20 });
              } else if (ip.netmask) {
                doc.text(`Netmask: ${ip.netmask}`, { continued: false, indent: 20 });
              } else if (ip.cidr) {
                doc.text(`Prefix: /${ip.cidr}`, { continued: false, indent: 20 });
              }
              
              if (ip.gateway) {
                doc.text(`Gateway: ${ip.gateway}`, { continued: false, indent: 20 });
              }
            });
          }
        });
      } else {
        doc.fontSize(10);
        doc.text(`No network interfaces found.`, { continued: false, indent: 10 });
      }
      
      // Add DNS information if available
      if (server.network.dns) {
        doc.fontSize(12)
           .text('DNS Settings:', { continued: false });
        
        const nameservers = server.network.dns.nameservers || [];
        if (nameservers.length > 0) {
          doc.fontSize(10);
          nameservers.forEach((ns: string, index: number) => {
            if (ns) {
              doc.text(`Nameserver ${index+1}: ${ns}`, { continued: false, indent: 10 });
            }
          });
        } else {
          doc.fontSize(10);
          doc.text(`No DNS nameservers configured`, { continued: false, indent: 10 });
        }
      }
    } else {
      doc.fontSize(10);
      doc.text(`No network information available for this server.`, { continued: false });
    }
    
    // Add hypervisor information if available
    if (server.hypervisorId) {
      doc.fontSize(12)
         .text(`Hypervisor ID: ${server.hypervisorId}`, { continued: false });
    }
    
    doc.moveDown();
  } else {
    doc.fontSize(12)
       .text('No VPS server information available for this ticket.', { italic: true });
    doc.moveDown();
  }
  
  // Add conversation
  doc.fontSize(16)
     .text('Conversation', { underline: true })
     .moveDown(0.5);
  
  if (messages && messages.length > 0) {
    messages.forEach((message, index) => {
      const messageDate = message.createdAt 
        ? new Date(message.createdAt).toLocaleString('en-US', dateTimeFormat)
        : 'Unknown date';
      
      // For system messages, display differently
      if (message.isSystemMessage) {
        // Create a light gray background for system messages
        doc.rect(60, doc.y, doc.page.width - 120, 20).fill('#f0f0f0');
        
        doc.fillColor('gray')
           .fontSize(10)
           .text(`[${messageDate}] System: ${message.message}`, { 
             align: 'center',
             italic: true,
             width: doc.page.width - 120,
             x: 60,
             y: doc.y - 18
           })
           .fillColor('black')
           .moveDown(0.8);
      } else {
        // Check if the message is from an admin
        const isAdmin = message.userId !== ticket.userId;
        const sender = isAdmin ? 'Support Agent' : 'User';
        const messageColor = isAdmin ? '#0055aa' : '#333333';
        const backgroundColor = isAdmin ? '#f0f8ff' : '#f9f9f9';
        
        // Create a background for the message
        doc.rect(60, doc.y, doc.page.width - 120, 16).fill(backgroundColor);
        
        // Add the message header with sender and date
        doc.fillColor(messageColor)
           .fontSize(11)
           .text(`${sender} (${messageDate}):`, { 
             continued: false,
             underline: true,
             width: doc.page.width - 120,
             x: 70,
             y: doc.y - 14
           })
           .moveDown(0.7);
        
        // Add message content with proper padding
        doc.fillColor('black')
           .fontSize(10)
           .text(message.message, {
             width: doc.page.width - 140,
             x: 70
           })
           .moveDown();
      }
      
      // Add a separator between messages
      if (index < messages.length - 1) {
        doc.moveTo(70, doc.y)
           .lineTo(doc.page.width - 70, doc.y)
           .strokeColor('#cccccc')
           .stroke()
           .strokeColor('black')
           .moveDown(0.5);
      }
    });
  } else {
    doc.fontSize(12)
       .text('No messages in this ticket.', { italic: true });
  }
  
  // Add footer with page numbers
  const generatedDate = new Date().toLocaleString('en-US', dateTimeFormat);
  const footerText = `Generated on ${generatedDate} - ${companyName} Support System`;

  // Adding this event handler for all pages
  const totalPageCount = doc.bufferedPageRange().count;
  
  // Add the footer to the current page (we only have one page at this point)
  doc.fontSize(8)
     .text(
        footerText, 
        50, 
        doc.page.height - 50, 
        {
          align: 'left',
          width: doc.page.width - 200
        }
     );
  
  // Add page number on all pages
  doc.fontSize(8)
     .text(
        `Page 1 of ${totalPageCount}`, 
        50, 
        doc.page.height - 50, 
        {
          align: 'right',
          width: doc.page.width - 100
        }
     );
}