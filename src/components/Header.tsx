import { Button } from '@/components/ui/button';

const Header = () => {
  return (
    <header className="bg-foreground text-background py-4 px-6 shadow-medium">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">C</span>
          </div>
          <h1 className="text-2xl font-bold text-primary">Cashew</h1>
          <span className="text-sm text-muted-foreground hidden md:block">
            Make Your Dream Come True!
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