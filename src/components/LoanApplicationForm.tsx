import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, DollarSign, FileText, User, Phone, Mail, MapPin, Briefcase, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface FormData {
  personalInfo: {
    firstName: string;
    middleName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    address: string;
    promoCode: string;
  };
  employmentInfo: {
    employmentStatus: string;
    company: string;
    position: string;
    monthlyIncome: string;
    employmentLength: string;
    phone: string;
    address: string;
  };
  loanInfo: {
    loanAmount: string;
    loanPurpose: string;
    loanTerm: string;
  };
}

const LoanApplicationForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationId, setApplicationId] = useState<string>('');
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
      promoCode: '',
    },
    employmentInfo: {
      employmentStatus: '',
      company: '',
      position: '',
      monthlyIncome: '',
      employmentLength: '',
      phone: '',
      address: '',
    },
    loanInfo: {
      loanAmount: '',
      loanPurpose: '',
      loanTerm: '',
    },
  });

  // Get promo code from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const promoCodeFromUrl = urlParams.get('promo');
    if (promoCodeFromUrl) {
      updateFormData('personalInfo', 'promoCode', promoCodeFromUrl);
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
        const { firstName, lastName, email, phone, dateOfBirth, address } = formData.personalInfo;
        // Check if date of birth is not in the future
        const dobDate = new Date(dateOfBirth);
        const today = new Date();
        today.setHours(23, 59, 59, 999); // Set to end of today to allow today's date
        const isValidDate = dobDate <= today;
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValidEmail = emailRegex.test(email);
        
        return !!(firstName && lastName && isValidEmail && phone && dateOfBirth && address && isValidDate);
      case 2:
        const { employmentStatus, company, position, monthlyIncome, phone: empPhone, address: empAddress } = formData.employmentInfo;
        
        // Validate monthly income is a positive number
        const monthlyIncomeNum = parseFloat(monthlyIncome.replace(/[^0-9.]/g, ''));
        const isValidIncome = !isNaN(monthlyIncomeNum) && monthlyIncomeNum > 0;
        
        return !!(employmentStatus && company && position && monthlyIncome && empPhone && empAddress && isValidIncome);
      case 3:
        const { loanAmount, loanPurpose, loanTerm } = formData.loanInfo;
        
        // Validate loan amount is a number and meets minimum requirement
        const loanAmountNum = parseFloat(loanAmount.replace(/[^0-9.]/g, ''));
        const isValidLoanAmount = !isNaN(loanAmountNum) && loanAmountNum >= 5000;
        
        return !!(loanAmount && loanPurpose && loanTerm && isValidLoanAmount);
      case 4:
        return true;
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
    if (!validateStep(4)) {
      toast({
        title: "Please review all information",
        description: "Please ensure all information is correct before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch('https://fklaxhpublxhgxcajuyu.supabase.co/functions/v1/loan_application_submission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrbGF4aHB1Ymx4aGd4Y2FqdXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEwNDcyODAsImV4cCI6MjA0NjYyMzI4MH0.8c7FWSRsw0PfrZmq9dzVEq5wTl668AG0ww7jf9tYIAo',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Submission failed');
      }

      // Store the application ID from the response
      if (data?.applicationId) {
        setApplicationId(data.applicationId);
      }

      toast({
        title: "Application submitted successfully!",
        description: data?.message || "We'll review your application and get back to you within 24 hours.",
      });
      setCurrentStep(5);
    } catch (error: any) {
      console.error('Submission error:', error);
      toast({
        title: "Submission failed",
        description: error?.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { number: 1, title: "Personal Information", icon: User },
    { number: 2, title: "Employment Details", icon: Briefcase },
    { number: 3, title: "Loan Information", icon: DollarSign },
    { number: 4, title: "Review & Submit", icon: FileText },
    { number: 5, title: "Confirmation", icon: CheckCircle },
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
          <div className="hidden md:flex items-center max-w-2xl mx-auto mt-2 px-4">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className="text-xs text-center w-8 md:w-12">
                  <p className={`font-medium text-center leading-tight ${currentStep >= step.number ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className="w-8 md:w-16 lg:w-24 mx-1 md:mx-2" />
                )}
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
              {currentStep === 4 && "Review your application details before submitting"}
              {currentStep === 5 && "Your application has been submitted"}
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
                  <Label htmlFor="middleName">Middle Name</Label>
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
                    max={new Date().toISOString().split('T')[0]}
                    value={formData.personalInfo.dateOfBirth}
                    onChange={(e) => updateFormData('personalInfo', 'dateOfBirth', e.target.value)}
                    className="transition-all duration-300 focus:shadow-soft"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Complete Address *</Label>
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
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="promoCode">Promo Code</Label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="promoCode"
                      placeholder="Enter promo code (optional)"
                      className="pl-10 transition-all duration-300 focus:shadow-soft"
                      value={formData.personalInfo.promoCode}
                      onChange={(e) => updateFormData('personalInfo', 'promoCode', e.target.value)}
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
                  <Label htmlFor="company">Company/Business Name *</Label>
                  <Input
                    id="company"
                    placeholder="ABC Corporation"
                    value={formData.employmentInfo.company}
                    onChange={(e) => updateFormData('employmentInfo', 'company', e.target.value)}
                    className="transition-all duration-300 focus:shadow-soft"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position/Title *</Label>
                  <Input
                    id="position"
                    placeholder="Software Engineer"
                    value={formData.employmentInfo.position}
                    onChange={(e) => updateFormData('employmentInfo', 'position', e.target.value)}
                    className="transition-all duration-300 focus:shadow-soft"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="empPhone">Employment Phone Number *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="empPhone"
                      placeholder="+63 912 345 6789"
                      className="pl-10 transition-all duration-300 focus:shadow-soft"
                      value={formData.employmentInfo.phone}
                      onChange={(e) => updateFormData('employmentInfo', 'phone', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
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
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="empAddress">Employment Address *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-muted-foreground w-4 h-4" />
                    <Textarea
                      id="empAddress"
                      placeholder="Company/Business address"
                      className="pl-10 transition-all duration-300 focus:shadow-soft"
                      value={formData.employmentInfo.address}
                      onChange={(e) => updateFormData('employmentInfo', 'address', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Loan Information */}
            {currentStep === 3 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="loanAmount">Loan Amount (PHP) * (Minimum: ₱5,000)</Label>
                  <Input
                    id="loanAmount"
                    placeholder="5,000"
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
                      <SelectItem value="1-month">1 month</SelectItem>
                      <SelectItem value="2-months">2 months</SelectItem>
                      <SelectItem value="3-months">3 months</SelectItem>
                      <SelectItem value="4-months">4 months</SelectItem>
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
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Personal Information</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Name:</span> {formData.personalInfo.firstName} {formData.personalInfo.middleName} {formData.personalInfo.lastName}</p>
                      <p><span className="font-medium">Email:</span> {formData.personalInfo.email}</p>
                      <p><span className="font-medium">Phone:</span> {formData.personalInfo.phone}</p>
                      <p><span className="font-medium">Date of Birth:</span> {formData.personalInfo.dateOfBirth}</p>
                      {formData.personalInfo.address && <p><span className="font-medium">Address:</span> {formData.personalInfo.address}</p>}
                      {formData.personalInfo.promoCode && <p><span className="font-medium">Promo Code:</span> {formData.personalInfo.promoCode}</p>}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Employment Details</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Status:</span> {formData.employmentInfo.employmentStatus}</p>
                      <p><span className="font-medium">Monthly Income:</span> ₱{formData.employmentInfo.monthlyIncome}</p>
                      {formData.employmentInfo.company && <p><span className="font-medium">Company:</span> {formData.employmentInfo.company}</p>}
                      {formData.employmentInfo.position && <p><span className="font-medium">Position:</span> {formData.employmentInfo.position}</p>}
                      {formData.employmentInfo.employmentLength && <p><span className="font-medium">Employment Length:</span> {formData.employmentInfo.employmentLength}</p>}
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Loan Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <p><span className="font-medium">Amount:</span> ₱{formData.loanInfo.loanAmount}</p>
                    <p><span className="font-medium">Term:</span> {formData.loanInfo.loanTerm}</p>
                    <p><span className="font-medium">Purpose:</span> {formData.loanInfo.loanPurpose}</p>
                  </div>
                </div>
                
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    By submitting this application, you agree to our terms and conditions and consent to a credit check.
                  </p>
                </div>
              </div>
            )}

            {/* Step 5: Confirmation */}
            {currentStep === 5 && (
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
                  <p className="font-mono text-lg font-bold">{applicationId || 'Processing...'}</p>
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
            {currentStep < 5 && (
              <div className="flex justify-between pt-6">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                  disabled={currentStep === 1}
                  className="transition-all duration-300 hover:shadow-soft"
                >
                  Previous
                </Button>
                {currentStep < 4 ? (
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