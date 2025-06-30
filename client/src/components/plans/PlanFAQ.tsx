import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle } from 'lucide-react';
import { getBrandColors } from '@/lib/brand-theme';

interface Faq {
  id: number;
  question: string;
  answer: string;
  category?: string;
  isActive: boolean;
  displayOrder: number;
}

interface PlanFAQProps {
  faqs: Faq[];
  isLoading: boolean;
  brandColors: ReturnType<typeof getBrandColors>;
}

const DEFAULT_FAQS = [
  {
    id: 1,
    question: "Can I upgrade my plan later?",
    answer: "Yes, you can easily upgrade your VPS plan at any time from your client dashboard. The upgrade process is seamless with minimal downtime.",
    category: "general",
    isActive: true,
    displayOrder: 1
  },
  {
    id: 2,
    question: "What operating systems are supported?",
    answer: "We support a wide range of operating systems including various Linux distributions (Ubuntu, CentOS, Debian) and Windows Server options.",
    category: "general",
    isActive: true,
    displayOrder: 2
  },
  {
    id: 3,
    question: "Do you offer managed services?",
    answer: "Yes, we offer managed services for an additional fee. This includes server setup, security hardening, and regular maintenance.",
    category: "general",
    isActive: true,
    displayOrder: 3
  },
  {
    id: 4,
    question: "What is your uptime guarantee?",
    answer: "We offer a 99.9% uptime guarantee for all VPS plans. If we fail to meet this guarantee, you'll receive credit according to our SLA terms.",
    category: "general",
    isActive: true,
    displayOrder: 4
  },
  {
    id: 5,
    question: "How quickly can my server be deployed?",
    answer: "Most VPS instances are deployed within 5-15 minutes after payment confirmation. Complex configurations may take slightly longer.",
    category: "general",
    isActive: true,
    displayOrder: 5
  },
  {
    id: 6,
    question: "Do you provide backup services?",
    answer: "Yes, we offer automated daily backups for all VPS plans. You can also create manual snapshots at any time from your control panel.",
    category: "general",
    isActive: true,
    displayOrder: 6
  }
];

export function PlanFAQ({ faqs, isLoading, brandColors }: PlanFAQProps) {
  if (isLoading) {
    return (
      <div className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <Skeleton className="h-10 w-80 mx-auto mb-12" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-full mb-3" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Use provided FAQs or fall back to default FAQs
  const displayFaqs = faqs && faqs.length > 0 ? faqs : DEFAULT_FAQS;

  // Group FAQs by category
  const faqsByCategory = displayFaqs.reduce((acc: Record<string, Faq[]>, faq: Faq) => {
    const category = faq.category ?? 'general';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(faq);
    return acc;
  }, {});

  // Sort categories to ensure 'general' comes first if it exists
  const sortedCategories = Object.keys(faqsByCategory).sort((a, b) => {
    if (a === 'general') return -1;
    if (b === 'general') return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="py-16">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <HelpCircle className="w-8 h-8 mr-3" style={{ color: brandColors.primary.full }} />
            <h2 className="text-3xl font-bold text-gray-900">
              Frequently Asked Questions
            </h2>
          </div>
          <p className="text-lg text-gray-600">
            Find answers to common questions about our VPS hosting plans
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <div 
              className="text-white text-center py-3 rounded-t-lg"
              style={{ background: brandColors.gradient.primary }}
            >
              <CardTitle className="text-lg font-semibold">
                Got Questions? We've Got Answers
              </CardTitle>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            {sortedCategories.map((category) => (
              <div key={category} className="mb-8 last:mb-0">
                {sortedCategories.length > 1 && (
                  <h3 className="text-xl font-semibold mb-6 capitalize text-gray-800 border-b border-gray-200 pb-2">
                    {category.replace('_', ' ')} Questions
                  </h3>
                )}
                
                <Accordion type="single" collapsible className="w-full">
                  {faqsByCategory[category]
                    .filter((faq: Faq) => faq.isActive)
                    .sort((a: Faq, b: Faq) => a.displayOrder - b.displayOrder)
                    .map((faq: Faq) => (
                      <AccordionItem 
                        key={`faq-${faq.id}`} 
                        value={`faq-${faq.id}`}
                        className="border-b border-gray-200"
                      >
                        <AccordionTrigger className="text-left font-medium hover:no-underline">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-600 leading-relaxed">
                          <div dangerouslySetInnerHTML={{ 
                            __html: faq.answer.replace(/\n/g, '<br />') 
                          }} />
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                </Accordion>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <p className="text-gray-600">
            Still have questions? {' '}
            <a 
              href="/tickets" 
              className="font-medium hover:underline"
              style={{ color: brandColors.primary.full }}
            >
              Contact our support team
            </a>
            {' '} for personalized assistance.
          </p>
        </div>
      </div>
    </div>
  );
} 