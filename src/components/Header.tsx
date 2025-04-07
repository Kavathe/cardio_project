import { useState, useEffect } from 'react';
import { Menu, X, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState<'doctor' | 'patient' | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is logged in
    const user = localStorage.getItem('user');
    if (user) {
      setIsLoggedIn(true);
      // Parse the user data to get the user type
      try {
        const userData = JSON.parse(user);
        setUserType(userData.type || 'doctor'); // Default to doctor if type not specified
      } catch (e) {
        setUserType('doctor'); // Default to doctor if parsing fails
      }
    } else {
      setIsLoggedIn(false);
      setUserType(null);
    }
  }, []);

  const handleLogout = () => {
    // Remove user from localStorage
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUserType(null);
    
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out",
    });
    
    navigate('/login');
  };

  return (
    <header className="fixed w-full bg-white/90 backdrop-blur-sm z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary">HeartCare</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-4">
            {isLoggedIn ? (
              <>
                {userType === 'doctor' && (
                  <>
                    <Button
                      variant="ghost"
                      className="hover:bg-primary-light"
                      asChild
                    >
                      <Link to="/reports">Reports Dashboard</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      className="hover:bg-primary-light"
                      asChild
                    >
                      <Link to="/ecg-monitor">ECG Monitor</Link>
                    </Button>
                  </>
                )}
                {userType === 'patient' && (
                  <Button
                    variant="ghost"
                    className="hover:bg-primary-light"
                    asChild
                  >
                    <Link to="/patient-dashboard">My Reports</Link>
                  </Button>
                )}
                <Button
                  variant="default"
                  className="bg-primary hover:bg-primary-dark flex items-center gap-2"
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" className="hover:bg-primary-light" asChild>
                  <Link to="/register">Register</Link>
                </Button>
                
                <Button variant="default" className="bg-primary hover:bg-primary-dark" asChild>
                  <Link to="/login">Login</Link>
                </Button>
              </>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 animate-fade-in">
            {isLoggedIn ? (
              <>
                {userType === 'doctor' && (
                  <>
                    <Link to="/reports" className="block py-2 px-4 text-text hover:bg-primary-light">
                      Reports Dashboard
                    </Link>
                    <Link to="/ecg-monitor" className="block py-2 px-4 text-text hover:bg-primary-light">
                      ECG Monitor
                    </Link>
                  </>
                )}
                {userType === 'patient' && (
                  <Link to="/patient-dashboard" className="block py-2 px-4 text-text hover:bg-primary-light">
                    My Reports
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full text-left flex items-center py-2 px-4 text-text hover:bg-primary-light"
                >
                  <LogOut size={16} className="mr-2" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/register" className="block py-2 px-4 text-text hover:bg-primary-light">
                  Register
                </Link>
                <Link to="/login" className="block py-2 px-4 text-text hover:bg-primary-light">
                  Login
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;