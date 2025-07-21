import LoanApplicationForm from '@/components/LoanApplicationForm';
import LoanFeatures from '@/components/LoanFeatures';
import Landing from '@/components/Landing';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      {/* <Landing /> */}
      <LoanApplicationForm />
      <LoanFeatures />
      <Footer />
    </div>
  );
};

export default Index;
