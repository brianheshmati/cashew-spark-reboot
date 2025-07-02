import { Card, CardContent } from '@/components/ui/card';
import { Clock, Shield, DollarSign, FileCheck, Smartphone, HeadphonesIcon } from 'lucide-react';

const LoanFeatures = () => {
  const features = [
    {
      icon: Clock,
      title: "Quick Approval",
      description: "Get approved in as little as 24 hours with our streamlined process.",
    },
    {
      icon: Shield,
      title: "Secure & Safe",
      description: "Your personal and financial information is protected with bank-level security.",
    },
    {
      icon: DollarSign,
      title: "Competitive Rates",
      description: "Enjoy competitive interest rates tailored to your financial profile.",
    },
    {
      icon: FileCheck,
      title: "Simple Requirements",
      description: "Minimal documentation required - just the essentials to process your loan.",
    },
    {
      icon: Smartphone,
      title: "Digital Process",
      description: "Complete your entire application online from the comfort of your home.",
    },
    {
      icon: HeadphonesIcon,
      title: "24/7 Support",
      description: "Our customer support team is available round the clock to assist you.",
    },
  ];

  return (
    <div className="py-16 px-4 bg-gradient-soft">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Why Choose Cashew Philippines?</h2>
          <p className="text-muted-foreground text-lg">
            Experience the fastest and most reliable loan service in the Philippines
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="shadow-soft hover:shadow-medium transition-all duration-300 border-0">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-gradient-accent rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-accent-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LoanFeatures;