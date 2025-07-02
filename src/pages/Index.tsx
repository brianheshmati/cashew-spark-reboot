import LoanApplicationForm from '@/components/LoanApplicationForm';
import LoanFeatures from '@/components/LoanFeatures';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <LoanApplicationForm />
      <LoanFeatures />
      <Footer />
    </div>
  );
};

export default Index;
