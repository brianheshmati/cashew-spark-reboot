import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, DollarSign, FileText, User, Phone, Mail, MapPin, Briefcase, Tag } from 'lucide-react';

interface FormData {
  personalInfo: {
    firstName: string;
    middleName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    address: string;
    city: string;
  };
  employmentInfo: {
    employmentStatus: string;
    company: string;
    position: string;
    monthlyIncome: string;
    employmentLength: string;
  };
  loanInfo: {
    loanAmount: string;
    loanPurpose: string;
    loanTerm: string;
    promoCode: string;
    additionalInfo: string;
  };
}

const LoanApplicationForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<FormData>({
    personalInfo: {
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      address: '',
      city: '',
    },
    employmentInfo: {
      employmentStatus: '',
      company: '',
      position: '',
      monthlyIncome: '',
      employmentLength: '',
    },
    loanInfo: {
      loanAmount: '',
      loanPurpose: '',
      loanTerm: '',
      promoCode: '',
      additionalInfo: '',
    },
  });

  // Get promo code from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const promoCodeFromUrl = urlParams.get('promo_code');
    if (promoCodeFromUrl) {
      updateFormData('loanInfo', 'promoCode', promoCodeFromUrl);
    }
  }, []);

  const updateFormData = (section: keyof FormData, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        const { firstName, middleName, lastName, email, phone, dateOfBirth } = formData.personalInfo;
        return !!(firstName && middleName && lastName && email && phone && dateOfBirth);
      case 2:
        const { employmentStatus, monthlyIncome } = formData.employmentInfo;
        return !!(employmentStatus && monthlyIncome);
      case 3:
        const { loanAmount, loanPurpose, loanTerm } = formData.loanInfo;
        return !!(loanAmount && loanPurpose && loanTerm);
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    } else {
      toast({
        title: "Please fill in all required fields",
        description: "All marked fields must be completed before proceeding.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) {
      toast({
        title: "Please fill in all required fields",
        description: "All marked fields must be completed before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Application submitted successfully!",
        description: "We'll review your application and get back to you within 24 hours.",
      });
      setCurrentStep(4);
    }, 2000);
  };

  const steps = [
    { number: 1, title: "Personal Information", icon: User },
    { number: 2, title: "Employment Details", icon: Briefcase },
    { number: 3, title: "Loan Information", icon: DollarSign },
    { number: 4, title: "Confirmation", icon: CheckCircle },
  ];

  return (
    <div className="min-h-screen bg-gradient-soft py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
            Loan Application
          </h1>
          <p className="text-muted-foreground text-lg">
            Quick and easy loan application process - get your funds in 24 hours
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-between items-center max-w-2xl mx-auto px-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              
              return (
                <div key={step.number} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 md:w-12 md:h-12 rounded-full border-2 transition-all duration-300 ${
                    isCompleted 
                      ? 'bg-success border-success text-white' 
                      : isActive 
                        ? 'bg-primary border-primary text-primary-foreground' 
                        : 'bg-background border-border text-muted-foreground'
                  }`}>
                    <Icon className="w-3 h-3 md:w-5 md:h-5" />
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`h-0.5 w-8 md:w-16 lg:w-24 mx-1 md:mx-2 transition-all duration-300 ${
                      isCompleted ? 'bg-success' : 'bg-border'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="hidden md:flex justify-between items-center max-w-2xl mx-auto mt-2 px-4">
            {steps.map((step) => (
              <div key={step.number} className="text-xs text-center w-12 lg:w-16">
                <p className={`font-medium text-center leading-tight ${currentStep >= step.number ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {step.title}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {React.createElement(steps[currentStep - 1]?.icon, { className: "w-5 h-5" })}
              {steps[currentStep - 1]?.title}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && "Please provide your personal information"}
              {currentStep === 2 && "Tell us about your employment status"}
              {currentStep === 3 && "Specify your loan requirements"}
              {currentStep === 4 && "Your application has been submitted"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    placeholder="Juan"
                    value={formData.personalInfo.firstName}
                    onChange={(e) => updateFormData('personalInfo', 'firstName', e.target.value)}
                    className="transition-all duration-300 focus:shadow-soft"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="middleName">Middle Name *</Label>
                  <Input
                    id="middleName"
                    placeholder="Santos"
                    value={formData.personalInfo.middleName}
                    onChange={(e) => updateFormData('personalInfo', 'middleName', e.target.value)}
                    className="transition-all duration-300 focus:shadow-soft"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    placeholder="Dela Cruz"
                    value={formData.personalInfo.lastName}
                    onChange={(e) => updateFormData('personalInfo', 'lastName', e.target.value)}
                    className="transition-all duration-300 focus:shadow-soft"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="juan@example.com"
                      className="pl-10 transition-all duration-300 focus:shadow-soft"
                      value={formData.personalInfo.email}
                      onChange={(e) => updateFormData('personalInfo', 'email', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="phone"
                      placeholder="+63 912 345 6789"
                      className="pl-10 transition-all duration-300 focus:shadow-soft"
                      value={formData.personalInfo.phone}
                      onChange={(e) => updateFormData('personalInfo', 'phone', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.personalInfo.dateOfBirth}
                    onChange={(e) => updateFormData('personalInfo', 'dateOfBirth', e.target.value)}
                    className="transition-all duration-300 focus:shadow-soft"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="Manila"
                    value={formData.personalInfo.city}
                    onChange={(e) => updateFormData('personalInfo', 'city', e.target.value)}
                    className="transition-all duration-300 focus:shadow-soft"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Complete Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-muted-foreground w-4 h-4" />
                    <Textarea
                      id="address"
                      placeholder="123 Main Street, Barangay, Province"
                      className="pl-10 transition-all duration-300 focus:shadow-soft"
                      value={formData.personalInfo.address}
                      onChange={(e) => updateFormData('personalInfo', 'address', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Employment Information */}
            {currentStep === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employmentStatus">Employment Status *</Label>
                  <Select value={formData.employmentInfo.employmentStatus} onValueChange={(value) => updateFormData('employmentInfo', 'employmentStatus', value)}>
                    <SelectTrigger className="transition-all duration-300 focus:shadow-soft">
                      <SelectValue placeholder="Select employment status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employed">Employed</SelectItem>
                      <SelectItem value="self-employed">Self-Employed</SelectItem>
                      <SelectItem value="freelancer">Freelancer</SelectItem>
                      <SelectItem value="business-owner">Business Owner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyIncome">Monthly Income (PHP) *</Label>
                  <Input
                    id="monthlyIncome"
                    placeholder="50,000"
                    value={formData.employmentInfo.monthlyIncome}
                    onChange={(e) => updateFormData('employmentInfo', 'monthlyIncome', e.target.value)}
                    className="transition-all duration-300 focus:shadow-soft"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company/Business Name</Label>
                  <Input
                    id="company"
                    placeholder="ABC Corporation"
                    value={formData.employmentInfo.company}
                    onChange={(e) => updateFormData('employmentInfo', 'company', e.target.value)}
                    className="transition-all duration-300 focus:shadow-soft"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position/Title</Label>
                  <Input
                    id="position"
                    placeholder="Software Engineer"
                    value={formData.employmentInfo.position}
                    onChange={(e) => updateFormData('employmentInfo', 'position', e.target.value)}
                    className="transition-all duration-300 focus:shadow-soft"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="employmentLength">Length of Employment</Label>
                  <Select value={formData.employmentInfo.employmentLength} onValueChange={(value) => updateFormData('employmentInfo', 'employmentLength', value)}>
                    <SelectTrigger className="transition-all duration-300 focus:shadow-soft">
                      <SelectValue placeholder="Select employment length" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="less-than-1">Less than 1 year</SelectItem>
                      <SelectItem value="1-2">1-2 years</SelectItem>
                      <SelectItem value="3-5">3-5 years</SelectItem>
                      <SelectItem value="more-than-5">More than 5 years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 3: Loan Information */}
            {currentStep === 3 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="loanAmount">Loan Amount (PHP) *</Label>
                  <Input
                    id="loanAmount"
                    placeholder="100,000"
                    value={formData.loanInfo.loanAmount}
                    onChange={(e) => updateFormData('loanInfo', 'loanAmount', e.target.value)}
                    className="transition-all duration-300 focus:shadow-soft"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loanTerm">Loan Term *</Label>
                  <Select value={formData.loanInfo.loanTerm} onValueChange={(value) => updateFormData('loanInfo', 'loanTerm', value)}>
                    <SelectTrigger className="transition-all duration-300 focus:shadow-soft">
                      <SelectValue placeholder="Select loan term" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6-months">6 months</SelectItem>
                      <SelectItem value="12-months">12 months</SelectItem>
                      <SelectItem value="18-months">18 months</SelectItem>
                      <SelectItem value="24-months">24 months</SelectItem>
                      <SelectItem value="36-months">36 months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="loanPurpose">Purpose of Loan *</Label>
                  <Select value={formData.loanInfo.loanPurpose} onValueChange={(value) => updateFormData('loanInfo', 'loanPurpose', value)}>
                    <SelectTrigger className="transition-all duration-300 focus:shadow-soft">
                      <SelectValue placeholder="Select loan purpose" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="business">Business Capital</SelectItem>
                      <SelectItem value="personal">Personal Use</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="medical">Medical Expenses</SelectItem>
                      <SelectItem value="home-improvement">Home Improvement</SelectItem>
                      <SelectItem value="debt-consolidation">Debt Consolidation</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="promoCode">Promo Code</Label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="promoCode"
                      placeholder="Enter promo code (optional)"
                      className="pl-10 transition-all duration-300 focus:shadow-soft"
                      value={formData.loanInfo.promoCode}
                      onChange={(e) => updateFormData('loanInfo', 'promoCode', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="additionalInfo">Additional Information</Label>
                  <Textarea
                    id="additionalInfo"
                    placeholder="Any additional information you'd like to share..."
                    value={formData.loanInfo.additionalInfo}
                    onChange={(e) => updateFormData('loanInfo', 'additionalInfo', e.target.value)}
                    className="transition-all duration-300 focus:shadow-soft"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Confirmation */}
            {currentStep === 4 && (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-success rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Application Submitted Successfully!</h3>
                  <p className="text-muted-foreground">
                    Thank you for choosing Cashew Philippines. We've received your loan application and will review it within 24 hours.
                  </p>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Application Reference Number:</p>
                  <p className="font-mono text-lg font-bold">CW-{Date.now().toString().slice(-8)}</p>
                </div>
                <Button 
                  onClick={() => window.location.reload()} 
                  variant="outline"
                  className="transition-all duration-300 hover:shadow-soft"
                >
                  Submit Another Application
                </Button>
              </div>
            )}

            {/* Navigation Buttons */}
            {currentStep < 4 && (
              <div className="flex justify-between pt-6">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                  disabled={currentStep === 1}
                  className="transition-all duration-300 hover:shadow-soft"
                >
                  Previous
                </Button>
                {currentStep < 3 ? (
                  <Button 
                    onClick={handleNext}
                    className="bg-gradient-primary hover:opacity-90 transition-all duration-300 hover:shadow-soft"
                  >
                    Next
                  </Button>
                ) : (
                  <Button 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="bg-gradient-primary hover:opacity-90 transition-all duration-300 hover:shadow-soft"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Application"}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoanApplicationForm;