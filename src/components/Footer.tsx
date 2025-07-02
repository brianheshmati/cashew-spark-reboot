const Footer = () => {
  return (
    <footer className="bg-foreground text-background py-8 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          {/* Logo and Tagline */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">C</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-primary">Cashew Philippines</h2>
              <p className="text-sm text-muted-foreground">Make Your Dream Come True!</p>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center space-x-8">
            <a
              href="https://www.cashew.ph"
              target="_blank"
              rel="noopener noreferrer"
              className="text-background hover:text-primary transition-colors duration-300 font-medium"
            >
              Homepage
            </a>
            <a
              href="https://www.cashew.ph/terms.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-background hover:text-primary transition-colors duration-300 font-medium"
            >
              Privacy Policy
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-6 pt-6 border-t border-muted/20 text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 Cashew Philippines. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;