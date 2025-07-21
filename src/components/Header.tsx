import { Button } from '@/components/ui/button';
import cashewLogo from '@/assets/cashew-logo.png';

const Header = () => {
  return (
    <header className="bg-foreground text-background py-4 px-6 shadow-medium" style={{backgroundColor:"#2d2d2d"}}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <img 
            src={cashewLogo} 
            alt="Cashew Logo" 
            className="h-16 w-auto"
          />
          <span className="text-sm text-muted-foreground hidden md:block">
<<<<<<< HEAD
            <div className="site-title ">Cashew</div>
            <div className="header-description">Make Your Dream Come True!</div>
=======
            {/* <div className="site-title" >Cashew</div> */}
            <h1 className="text-4xl font-bold text-yellow-500">Cashew</h1>
            <div className="header-description text-yellow-500">Make Your Dream Come True!</div>
>>>>>>> 267573fe3be79fd4149d1bb66fa90474cd3c1580
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex items-center space-x-6">
          <a
            href="https://www.cashew.ph"
            target="_blank"
            rel="noopener noreferrer"
            className="text-background hover:text-primary transition-colors duration-300 font-medium"
          >
            Home
          </a>
          <a
            href="https://www.cashew.ph/terms.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-background hover:text-primary transition-colors duration-300 font-medium"
          >
            Privacy Policy
          </a>
        </nav>
      </div>
    </header>
  );
};

export default Header;